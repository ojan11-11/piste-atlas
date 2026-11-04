// Piste Atlas v0.5 — run a 50-site operator-page research pilot.
// Produces a review queue, not production facts. No prices, snowfall or images are copied.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {setTimeout as delay} from 'node:timers/promises';
import {lookup} from 'node:dns/promises';
import {isIP} from 'node:net';
import {safeURL,sameHost,robotsAllow,USER_AGENT,discoverLinks,extractEvidence,selectPilot} from './lib/resort-research.mjs';

const LIMIT_BYTES=1_500_000;
const TIMEOUT_MS=12000;
const MAX_PAGES_PER_RESORT=4; // homepage + stats/map/ticket candidate
const HOST_DELAY_MS=550;
const args=process.argv.slice(2);
const arg=(key,fallback)=>{const i=args.indexOf(key);return i<0?fallback:args[i+1]};
const limit=Math.max(1,Math.min(250,Number(arg('--limit','50'))||50));
const out=arg('--out','reports/enrichment-pilot.json');
const dryRun=args.includes('--dry-run');
const retryFile=arg('--retry-failed',null);
const agentURL='https://ojan11-11.github.io/piste-atlas/';

function readCatalog(){
 const ctx={window:{}};
 vm.runInNewContext(fs.readFileSync('data/resorts.js','utf8'),ctx);
 vm.runInNewContext(fs.readFileSync('data/resorts.openskidata.js','utf8'),ctx);
 if(fs.existsSync('data/resorts.enriched.js'))vm.runInNewContext(fs.readFileSync('data/resorts.enriched.js','utf8'),ctx);
 return ctx.window.RESORTS;
}
function isPublicIp(address){
 if(isIP(address)===4){
  const p=address.split('.').map(Number);
  return !(p[0]===0||p[0]===10||p[0]===127||p[0]>=224||(p[0]===169&&p[1]===254)||(p[0]===172&&p[1]>=16&&p[1]<=31)||(p[0]===192&&p[1]===168)||(p[0]===100&&p[1]>=64&&p[1]<=127)||(p[0]===192&&p[1]===0)||(p[0]===198&&p[1]===18));
 }
 if(isIP(address)===6){
  const v=address.toLowerCase();
  return !(v==='::1'||v==='::'||v.startsWith('fc')||v.startsWith('fd')||v.startsWith('fe8')||v.startsWith('fe9')||v.startsWith('fea')||v.startsWith('feb')||v.startsWith('::ffff:127.'));
 }
 return false;
}
const dnsCache=new Map();
async function publicHostname(host){
 if(dnsCache.has(host))return dnsCache.get(host);
 let result=false;
 try{const values=await lookup(host,{all:true});result=values.length>0&&values.every(x=>isPublicIp(x.address));}catch{}
 dnsCache.set(host,result);return result;
}
async function readStreamLimited(response,maxBytes=LIMIT_BYTES){
 const reader=response.body?.getReader();
 if(!reader)return '';
 let size=0;const chunks=[];
 try{while(true){
  const {done,value}=await reader.read();if(done)break;
  size+=value.byteLength;
  if(size>maxBytes)throw Error('response-too-large');
  chunks.push(Buffer.from(value));
 }}finally{try{await reader.cancel()}catch{}}
 return Buffer.concat(chunks).toString('utf8');
}
const robotsCache=new Map();
async function getRobots(url){
 const u=safeURL(url);if(!u)return {ok:false,why:'invalid-url'};
 const origin=u.origin;if(robotsCache.has(origin))return robotsCache.get(origin);
 let result={ok:false,why:'robots-unavailable'};
 try{
  if(!(await publicHostname(u.hostname)))result={ok:false,why:'nonpublic-host'};
  else{
   let robotsURL=origin+'/robots.txt';
   for(let i=0;i<3;i++){
    const response=await fetch(robotsURL,{headers:{'user-agent':USER_AGENT},redirect:'manual',signal:AbortSignal.timeout(TIMEOUT_MS)});
    if(response.status>=300&&response.status<400){
     const location=response.headers.get('location');
     if(!location){result={ok:false,why:'robots-redirect-no-location'};break}
     const next=new URL(location,robotsURL);
     if(!sameHost(next.href,origin)||!safeURL(next.href)||next.pathname!=='/robots.txt'||!(await publicHostname(next.hostname))){
      result={ok:false,why:'robots-untrusted-redirect'};break;
     }
     robotsURL=next.href;continue;
    }
    if(response.status===404||response.status===410)result={ok:true,content:''};
    else if(response.ok&&response.status===200)result={ok:true,content:await readStreamLimited(response,200000)};
    else result={ok:false,why:'robots-http-'+response.status};
    break;
   }
  }
 }catch(e){result={ok:false,why:'robots-'+String(e?.message||'network-error').slice(0,90)}}
 robotsCache.set(origin,result);return result;
}
async function fetchHTML(input){
 const src=safeURL(input);if(!src)return {error:'invalid-or-untrusted-url'};
 let url=src.href;
 for(let redirect=0;redirect<3;redirect++){
  const target=safeURL(url);if(!target)return {error:'bad-redirect'};
  if(!(await publicHostname(target.hostname)))return {error:'untrusted-host-address'};
  const robots=await getRobots(target.href);
  if(!robots.ok)return {error:robots.why};
  if(!robotsAllow(robots.content,target.pathname+target.search))return {error:'robots-disallow'};
  let response;
  try{response=await fetch(target.href,{headers:{'user-agent':USER_AGENT,accept:'text/html,application/xhtml+xml;q=0.9'},redirect:'manual',signal:AbortSignal.timeout(TIMEOUT_MS)})}
  catch(e){return {error:'request-'+String(e?.message||'network-error').slice(0,75)}}
  if(response.status>=300&&response.status<400){
   const location=response.headers.get('location');if(!location)return {error:'redirect-no-location'};
   const next=new URL(location,target).href;
   if(!safeURL(next)||!sameHost(next,target.href))return {error:'cross-site-redirect-not-followed',redirectTo:next};
   url=next;continue;
  }
  if(response.status===429)return {error:'rate-limited-429'};
  if(!response.ok)return {error:'http-'+response.status};
  const contentType=response.headers.get('content-type')||'';
  if(!/text\/html|application\/xhtml/i.test(contentType))return {error:'not-html',contentType};
  const claimedLength=Number(response.headers.get('content-length')||0);
  if(claimedLength>LIMIT_BYTES)return {error:'html-too-large'};
  try{
   const html=await readStreamLimited(response);
   return {url:target.href,html,contentType,status:response.status};
  }catch(e){return {error:String(e?.message||'response-too-large')}}
 }
 return {error:'too-many-redirects'};
}
function mergedLinks(pages){
 const store={stats:new Map(),map:new Map(),tickets:new Map()};
 for(const page of pages){
  if(!page.html)continue;
  const discovered=discoverLinks(page.html,page.url);
  for(const kind of Object.keys(store))for(const item of discovered[kind]){
   const old=store[kind].get(item.url);
   if(!old||item.score>old.score)store[kind].set(item.url,item);
  }
 }
 return Object.fromEntries(Object.entries(store).map(([key,val])=>[key,[...val.values()].sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url)).slice(0,6)]));
}
function canonicalCandidate(r){
 const u=safeURL(r.website);
 return {id:r.id,name:r.name,region:r.region,regionCode:r.regionCode,country:r.country,
  sourceWebsite:r.website,websiteProvenance:'OpenSkiData candidate; not independently confirmed as official',
  mappedLiftCount:r.mappedLiftCount||null,siteHost:u?.hostname||null};
}
async function researchOne(r) {
 const result={...canonicalCandidate(r),status:'pending',pages:[],links:{stats:[],map:[],tickets:[]},
  statisticCandidates:[],errors:[],notes:[],readyForPublish:false};
 const first=await fetchHTML(r.website);
 if(first.error){result.status='unavailable';result.errors.push({url:r.website,reason:first.error});return result}
 result.pages.push({url:first.url,type:'homepage',status:'fetched'});
 const documents=[{url:first.url,html:first.html}];
 const homepageLinks=mergedLinks(documents);
 const otherPages=[];
 for(const type of ['stats','map','tickets']){
  const top=homepageLinks[type].find(x=>x.format==='html'&&x.url!==first.url&&!otherPages.some(y=>y.url===x.url));
  if(top)otherPages.push({type,url:top.url});
 }
 for(const item of otherPages.slice(0,MAX_PAGES_PER_RESORT-1)){
  await delay(HOST_DELAY_MS);
  const response=await fetchHTML(item.url);
  if(response.error){result.errors.push({url:item.url,reason:response.error});continue}
  documents.push({url:response.url,html:response.html});
  result.pages.push({url:response.url,type:item.type,status:'fetched'});
 }
 result.links=mergedLinks(documents);
 for(const page of documents){
  const found=extractEvidence(page.html,page.url);
  result.statisticCandidates.push(...found);
 }
 // no auto-promotion of links, pricing, or mountain facts from outside text
 result.statisticCandidates=result.statisticCandidates.slice(0,40);
 result.status='researched';
 if(!result.statisticCandidates.length)result.notes.push('No safe numeric pattern found; pages may use JavaScript or PDFs.');
 if(result.links.map.length===0)result.notes.push('Winter trail map not discovered from links.');
 if(result.links.tickets.length===0)result.notes.push('Lift ticket page not discovered from links.');
 return result;
}
async function concurrent(items,threads,run){
 let cursor=0;const result=new Array(items.length);
 await Promise.all(Array.from({length:threads},async()=>{
  while(cursor<items.length){
   const i=cursor++;
   try{result[i]=await run(items[i]);}catch(e){result[i]={...canonicalCandidate(items[i]),status:'error',error:String(e?.message||e),readyForPublish:false}}
   process.stdout.write('['+(i+1)+'/'+items.length+'] '+items[i].name+' — '+result[i].status+'\n');
  }
 }));
 return result;
}
async function main(){
 if(!out.startsWith('reports/')||out.includes('..'))throw Error('--out must be beneath reports/');
 const resorts=readCatalog();
 let previous=null,pilot;
 if(retryFile){
  if(!/^reports\/[a-z0-9-]+\.json$/i.test(retryFile)||!fs.existsSync(retryFile))throw Error('--retry-failed requires a current reports/*.json file');
  previous=JSON.parse(fs.readFileSync(retryFile,'utf8'));
  if(!Array.isArray(previous.resorts))throw Error('Invalid previous pilot report');
  const ids=new Set(previous.resorts.filter(r=>r.status==='unavailable'||r.status==='error').map(r=>r.id));
  pilot=previous.resorts.map(r=>resorts.find(v=>v.id===r.id)).filter(r=>r&&ids.has(r.id));
  if(!pilot.length){console.log('No failed sites to retry.');return}
 }else pilot=selectPilot(resorts,limit);
 if(!previous&&pilot.length<limit)throw Error('Expected '+limit+' candidates, got '+pilot.length);
 const fresh=dryRun?pilot.map(r=>({...canonicalCandidate(r),status:'planned',readyForPublish:false})):
   await concurrent(pilot,4,researchOne);
 const updates=new Map(fresh.map(r=>[r.id,r]));
 const result=previous?previous.resorts.map(r=>updates.get(r.id)||r):fresh;
 const summary={
  requested:result.length,retried:retryFile?pilot.length:0,researched:result.filter(x=>x.status==='researched').length,
  unavailable:result.filter(x=>x.status==='unavailable').length,
  statisticCandidates:result.reduce((sum,x)=>sum+(x.statisticCandidates?.length||0),0),
  mapPageCandidates:result.reduce((n,x)=>n+(x.links?.map?.length||0),0),
  ticketPageCandidates:result.reduce((n,x)=>n+(x.links?.tickets?.length||0),0),
  automaticallyPublishedFacts:0, snowfallProcessed:false
 };
 const report={version:1,type:'review-only',generatedAt:new Date().toISOString(),bot:USER_AGENT,method:'respect robots.txt; homepage + up to three same-host links; exact excerpts; review required',
  source:'OpenSkiData resort website candidates',sourceWebsiteVerified:false,summary,resorts:result};
 fs.mkdirSync(path.dirname(out),{recursive:true});
 fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');
 const markdown=['# Piste Atlas official-source discovery pilot','','**Research only — no mountain facts, ticket prices or copyrighted map artwork were automatically published.**',
  '', 'Run: '+report.generatedAt,'','- Candidate resort sites: '+summary.requested,
  '- Successfully visited: '+summary.researched,'- Unavailable or blocked: '+summary.unavailable,
  '- Numeric evidence candidates: '+summary.statisticCandidates,
  '- Discovered trail-map link candidates: '+summary.mapPageCandidates,
  '- Discovered ticket link candidates: '+summary.ticketPageCandidates,
  '- Snowfall: intentionally deferred',
  '','Review '+out+' for source URL, evidence snippets, errors and status. Validate resort identity, terms and every factual value before updating data/resorts.enriched.js.',
  '','## Candidate sites','','| Resort | Region | Status | Numeric evidence | Maps | Tickets |','|---|---|---|---:|---:|---:|'];
 for(const r of result)markdown.push('| '+r.name.replace(/\|/g,'/')+' | '+r.regionCode+
  ' | '+r.status+' | '+(r.statisticCandidates?.length||0)+' | '+(r.links?.map?.length||0)+' | '+(r.links?.tickets?.length||0)+' |');
 fs.writeFileSync('reports/ENRICHMENT_PILOT.md',markdown.join('\n')+'\n');
 console.log('SUMMARY '+JSON.stringify(summary));
}
main().catch(err=>{console.error(err);process.exitCode=1});

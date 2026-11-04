// Piste Atlas v0.5 source research. Produces review candidates; NEVER auto-publishes claims.
// This phase intentionally does not retrieve or estimate annual snowfall.
import {isIP} from 'node:net';
export const USER_AGENT='PisteAtlasResearchBot/0.5 (+https://ojan11-11.github.io/piste-atlas/)';
const banned=/(?:^|\.)(?:localhost|local|internal|test|invalid|facebook\.com|instagram\.com|tiktok\.com|youtube\.com|twitter\.com|onthesnow\.com)$/i;
export function safeURL(value){
 try {
  if(typeof value!=='string')return null;
  const u=new URL(value);
  if(u.protocol!=='https:'||u.username||u.password||(u.port&&u.port!=='443'))return null;
  if(!u.hostname.includes('.')||isIP(u.hostname)||banned.test(u.hostname)||/\.(?:local|internal)$/.test(u.hostname))return null;
  u.hash='';return u;
 }catch{return null}
}
const host=u=>safeURL(u)?.hostname.replace(/^www\./,'')||null;
export const sameHost=(a,b)=>!!host(a)&&host(a)===host(b);
const decode=x=>String(x).replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&apos;|&#39;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n)));
export function visibleText(html){
 return decode(String(html||'').replace(/<(script|style|svg|noscript|footer|nav)\b[^>]*>[\s\S]*?<\/\1>/gi,' ')
  .replace(/<\/(?:p|div|li|td|tr|h[1-6]|section)>/gi,' | ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()).slice(0,150000);
}
const avoid=/(?:privacy|cookie|terms|login|account|cart|jobs|contact|summer|bike|unsubscribe)/i;
function linkScore(text,url,type){
 const value=(text+' '+url).replace(/[-/_]+/g,' ').toLowerCase();if(avoid.test(value))return 0;
 const checks={
  stats:[/mountain stats|mountain statistics|mountain info|mountain facts|facts and figures|about the mountain|terrain statistics/i,/mountain|terrain|facts|statistics/i],
  map:[/winter trail map|ski trail map|alpine trail map|ski map/i,/trail map|mountain map|interactive map|maps and stats|maps and trails/i],
  tickets:[/lift tickets|day tickets|winter tickets|ski tickets/i,/tickets and passes|tickets passes|lift access|ticket prices|ticket rates/i]
 }[type];
 return checks[0].test(value)?12:checks[1].test(value)?8:0;
}
export function discoverLinks(html,pageUrl){
 const result={stats:[],map:[],tickets:[]},base=safeURL(pageUrl);if(!base)return result;
 const seen=new Set();
 for(const m of String(html||'').matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a\s*>/gi)){
  const hrefMatch=m[1].match(/\bhref\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
  const raw=hrefMatch?.[1]||hrefMatch?.[2]||hrefMatch?.[3];if(!raw||raw.startsWith('#')||raw.startsWith('javascript:'))continue;
  let url;try{url=new URL(decode(raw),base).href}catch{continue}
  if(!safeURL(url)||!sameHost(url,base.href)||/\.(?:jpg|jpeg|png|webp|svg|gif|zip|mp4)(?:[?#]|$)/i.test(url))continue;
  const label=visibleText(m[2]).slice(0,120);
  for(const type of Object.keys(result)){
   const score=linkScore(label,url,type),key=type+'|'+url;
   if(score<8||seen.has(key))continue;seen.add(key);
   result[type].push({url,label,score,format:/\.pdf(?:[?#]|$)/i.test(url)?'pdf':'html',discoveredOn:pageUrl});
  }
 }
 for(const type of Object.keys(result))result[type].sort((a,b)=>b.score-a.score||a.url.localeCompare(b.url));
 return result;
}
const n='([1-9][0-9]{0,2}(?:,[0-9]{3})+|[1-9][0-9]{0,4})';
const specs=[
 {metric:'acres',re:new RegExp('\\b(?:skiable\\s+acres|skiable\\s+area|skiable\\s+terrain)\\s*(?::|-)?\\s*'+n+'\\s*(?:\\+)?\\s*(?:acres?)?\\b','gi'),unit:'acres',max:50000},
 {metric:'acres',re:new RegExp('\\b'+n+'\\s*\\+?\\s*(?:skiable\\s+)?acres\\b','gi'),unit:'acres',max:50000},
 {metric:'vertical',re:new RegExp('\\bvertical\\s*(?:drop|rise)\\s*(?::|-)?\\s*'+n+'\\s*(feet|ft|meters?|m)\\b','gi'),max:20000},
 {metric:'summit',re:new RegExp('\\b(?:summit|peak)\\s*elevation\\s*(?::|-)?\\s*'+n+'\\s*(feet|ft|meters?|m)\\b','gi'),max:25000},
 {metric:'base',re:new RegExp('\\bbase\\s*elevation\\s*(?::|-)?\\s*'+n+'\\s*(feet|ft|meters?|m)\\b','gi'),max:25000},
 {metric:'lifts',re:new RegExp('\\b(?:total\\s+)?(?:ski\\s+)?lifts\\s*(?::|-)?\\s*'+n+'\\b','gi'),unit:'count',max:250},
 {metric:'trails',re:new RegExp('\\b(?:total\\s+)?(?:named\\s+)?(?:ski\\s+)?(?:trails|runs)\\s*(?::|-)?\\s*'+n+'\\b','gi'),unit:'count',max:2000}
];
export function extractEvidence(html,url){
 const text=visibleText(html),out=[];
 for(const spec of specs){
  spec.re.lastIndex=0;let match,found=0;
  while((match=spec.re.exec(text))&&found<5){
   found++;const value=Number(match[1].replace(/,/g,''));if(value<=0||value>spec.max)continue;
   const suffix=match[2]||'',unit=spec.unit||(/^m(?:eter)?/i.test(suffix)?'meters':'feet');
   out.push({metric:spec.metric,value,unit,sourceUrl:url,
     evidence:text.slice(Math.max(0,match.index-55),Math.min(text.length,match.index+match[0].length+55)),
     status:'needs-human-verification',method:'html-pattern'});
  }
 }
 return out;
}
function regexForRule(rule){
 const escaped=rule.split('*').map(x=>x.replace(/[|\\{}()[\]^$+?.]/g,'\\$&')).join('.*');
 try{return new RegExp('^'+escaped)}catch{return null}
}
export function robotsAllow(content,path,agent='PisteAtlasResearchBot'){
 if(!content)return true;
 const groups=[];let agents=[],rules=[],hasRules=false;
 const save=()=>{if(agents.length)groups.push({agents:[...agents],rules:[...rules]});agents=[];rules=[];hasRules=false};
 for(const line of content.split(/\r?\n/)){
  const m=line.split('#')[0].trim().match(/^([a-z-]+)\s*:\s*(.*?)\s*$/i);if(!m)continue;
  const [_,kind,value]=m,type=kind.toLowerCase();
  if(type==='user-agent'){if(hasRules)save();agents.push(value.toLowerCase());continue}
  if((type==='allow'||type==='disallow')&&agents.length){hasRules=true;rules.push({type,value})}
 }save();
 let applicable=groups.filter(x=>x.agents.some(u=>u!=='*'&&agent.toLowerCase().includes(u)));
 if(!applicable.length)applicable=groups.filter(x=>x.agents.includes('*'));
 let chosen=null;
 for(const group of applicable)for(const rule of group.rules){
  if(!rule.value||!regexForRule(rule.value)?.test(path))continue;
  const len=rule.value.replace(/[*$]/g,'').length;
  if(!chosen||len>chosen.len||(len===chosen.len&&rule.type==='allow'))chosen={len,type:rule.type};
 }
 return !chosen||chosen.type==='allow';
}
export function selectPilot(resorts,limit=50){
 const target=Math.max(1,Math.min(750,Math.trunc(limit)||50)),group={US:new Map(),CA:new Map()};
 for(const r of resorts){
  if(r.dataQuality!=='open-data'||!safeURL(r.website))continue;
  const cc=r.country==='United States'?'US':r.country==='Canada'?'CA':null;if(!cc)continue;
  const state=r.regionCode||'Unknown',table=group[cc];
  if(!table.has(state))table.set(state,[]);
  table.get(state).push(r);
 }
 for(const map of Object.values(group))for(const list of map.values())
  list.sort((a,b)=>(b.mappedLiftCount||0)-(a.mappedLiftCount||0)||a.name.localeCompare(b.name));
 const output=[];
 const take=(cc,max)=>{
  const map=group[cc],keys=[...map.keys()].sort();let n=0,changed=true;
  while(n<max&&changed){changed=false;for(const key of keys){
   if(n>=max)break;const r=map.get(key).shift();if(!r)continue;
   output.push(r);n++;changed=true;
  }}
 };
 take('US',Math.round(target*.70));take('CA',target-output.length);
 if(output.length<target){take('US',target-output.length);take('CA',target-output.length)}
 return output.slice(0,target);
}

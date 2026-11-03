// Piste Atlas · OpenSkiData -> static directory snapshot. ODbL; official data is separate.
import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';
const SOURCE='https://tiles.openskimap.org/geojson/ski_areas.geojson';
const META='https://tiles.openskimap.org/metadata.json';
const slug=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const round=n=>Math.round(n*1e5)/1e5;
const sum=o=>o&&typeof o==='object'?Object.values(o).reduce((n,v)=>n+(Number.isFinite(v?.count)?v.count:0),0):0;
function url(s){try{const u=new URL(s);return u.protocol==='https:'&&!u.username&&!u.password?u.href:null}catch{return null}}
function center(f){
 const c=f.properties?.viewportHint?.center;
 if(Array.isArray(c)&&c.length>1&&c.slice(0,2).every(Number.isFinite))return {lat:round(c[1]),lng:round(c[0])};
 if(f.geometry?.type==='Point'){const [lng,lat]=f.geometry.coordinates||[];if(Number.isFinite(lat)&&Number.isFinite(lng))return {lat:round(lat),lng:round(lng)}}
 const b=f.bbox;if(Array.isArray(b)&&b.length===4&&b.every(Number.isFinite))return {lat:round((b[1]+b[3])/2),lng:round((b[0]+b[2])/2)};
 return null;
}
function place(p){
 const v=Array.isArray(p.places)?p.places.find(v=>['US','CA'].includes(v?.iso3166_1Alpha2)):null;
 if(!v)return null;
 const cc=v.iso3166_1Alpha2,rc=(v.iso3166_2||'').split('-').at(-1)||'Unspecified';
 return {country:cc==='US'?'United States':'Canada',region:v.localized?.en?.region||rc,regionCode:rc,city:v.localized?.en?.locality||null,countryCode:cc};
}
function km(a,b){const t=Math.PI/180,dy=(a.lat-b.lat)*t,dx=(a.lng-b.lng)*t,h=Math.sin(dy/2)**2+Math.cos(a.lat*t)*Math.cos(b.lat*t)*Math.sin(dx/2)**2;return 12742*Math.asin(Math.min(1,Math.sqrt(h)))}
const aliases={'whistler-blackcomb':['whistler-blackcomb'],'park-city':['park-city','park-city-mountain'],'big-sky':['big-sky','big-sky-resort'],'vail':['vail','vail-mountain'],'lake-louise':['lake-louise','lake-louise-ski-resort'],'jackson-hole':['jackson-hole','jackson-hole-mountain-resort'],'killington':['killington','killington-resort'],'tremblant':['tremblant','mont-tremblant']};
function curatedMatch(r,curated){return curated.some(c=>c.country===r.country&&c.regionCode===r.regionCode&&km(c,r)<35&&(slug(c.name)===slug(r.name)||(aliases[c.id]||[]).includes(slug(r.name))))}
function feature(f){
 const p=f?.properties;
 if(!p||typeof p.name!=='string'||!p.name.trim()||!p.activities?.includes('downhill'))return null;
 if(p.status&&p.status!=='operating')return null;
 const x=place(p),c=center(f),liftCount=sum(p.statistics?.lifts?.byType);
 if(!x||!c||liftCount<1||c.lat<24||c.lat>73||c.lng< -170||c.lng> -52)return null;
 const src=(Array.isArray(p.sources)?p.sources:[]).filter(v=>v?.type&&v?.id).map(v=>({type:String(v.type),id:String(v.id)}));
 const id='osd-'+((p.wikidataID?'wikidata-'+slug(p.wikidataID):null)||src.map(s=>slug(s.type)+'-'+slug(s.id))[0]||x.countryCode+'-'+x.regionCode+'-'+slug(p.name));
 const min=p.statistics?.minElevation,max=p.statistics?.maxElevation;
 return {id,name:p.name,city:x.city,region:x.region,regionCode:x.regionCode,country:x.country,lat:c.lat,lng:c.lng,area:x.region,
 tagline:'Mapped ski area; mountain statistics awaiting operator verification',pass:'Unverified',acres:null,vertical:null,snowfall:null,lifts:null,trails:null,trailsQualifier:'',summit:null,base:null,terrain:null,terrainNote:'Official terrain mix not verified',highlights:[],
 website:(Array.isArray(p.websites)?p.websites:[]).map(url).find(Boolean)||null,mapUrl:null,ticketUrl:null,
 sourceUrl:'https://www.openskidata.org/',notes:'OpenSkiData mapped ski area. Current operating status and official metrics require resort confirmation. Mapped lifts and run segments are not official counts.',
 visual:'stone',dataQuality:'open-data',mappedLiftCount:liftCount,mappedRunSegments:sum(p.statistics?.runs?.byActivity?.downhill?.byDifficulty)||null,
 mappedVertical:Number.isFinite(min)&&Number.isFinite(max)&&max>=min?Math.round((max-min)*3.28084):null,sourceIds:src,wikidataID:p.wikidataID||null,sourceStatus:p.status||'unknown'};
}
export function transform(data,curated=[]){
 if(data?.type!=='FeatureCollection'||!Array.isArray(data.features))throw Error('Expected GeoJSON FeatureCollection');
 const rows=new Map(),ids=new Set();let eligible=0,curatedMatches=0,duplicatesRemoved=0;
 for(const f of data.features){
  const r=feature(f);if(!r)continue;eligible++;
  if(curatedMatch(r,curated)){curatedMatches++;continue}
  const key=r.country+'|'+r.regionCode+'|'+slug(r.name),prior=rows.get(key);
  if(prior&&km(prior,r)<20){duplicatesRemoved++;if(r.mappedLiftCount>prior.mappedLiftCount){r.id=prior.id;rows.set(key,r)}continue}
  const uniqueKey=prior?key+'|'+r.lat+'|'+r.lng:key;let candidate=r.id,n=2;
  while(ids.has(candidate))candidate=r.id+'-'+(n++);
  r.id=candidate;ids.add(candidate);rows.set(uniqueKey,r);
 }
 const list=[...rows.values()].sort((a,b)=>a.name.localeCompare(b.name));
 return {list,stats:{inputFeatures:data.features.length,eligible,curatedMatches,duplicatesRemoved,imported:list.length,us:list.filter(r=>r.country==='United States').length,canada:list.filter(r=>r.country==='Canada').length}};
}
async function readURL(href){const r=await fetch(href,{signal:AbortSignal.timeout(180000)});if(!r.ok)throw Error('HTTP '+r.status+': '+href);return Buffer.from(await r.arrayBuffer())}
async function main(){
 const k=process.argv.indexOf('--input'),local=k<0?null:process.argv[k+1];if(k>=0&&!local)throw Error('Missing --input filename');
 const upstream=local?null:JSON.parse((await readURL(META)).toString());
 const old=fs.existsSync('data/openskidata-meta.json')?JSON.parse(fs.readFileSync('data/openskidata-meta.json','utf8')):null;
 if(!local&&old?.upstreamRunFinishedAt&&old.upstreamRunFinishedAt===upstream?.run?.finishedAt){console.log('Dataset already synced.');return}
 let content=local?fs.readFileSync(local):await readURL(SOURCE);
 if(content[0]===0x1f&&content[1]===0x8b)content=gunzipSync(content);
 const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('data/resorts.js','utf8'),sandbox);
 const {list,stats}=transform(JSON.parse(content.toString('utf8')),sandbox.window.RESORTS);
 if(!local&&(list.length<200||list.length>4000))throw Error('Safety gate rejected '+list.length+' listings; existing snapshot preserved');
 if(!list.length)throw Error('No qualified ski areas; existing snapshot preserved');
 const attribution='Data from OpenSkiData / OpenSkiMap.org, © OpenStreetMap contributors (ODbL), Skimap.org, Who’s On First, © Mapterhorn';
 const metadata={source:SOURCE,upstreamRunFinishedAt:upstream?.run?.finishedAt||null,formatVersion:upstream?.formatVersion||null,snapshotBuiltAt:new Date().toISOString(),license:'ODbL',attribution,...stats};
 fs.writeFileSync('data/resorts.openskidata.js','// ODbL OpenSkiData snapshot, separate from curated official source data.\n// '+attribution+'\nwindow.RESORTS = [...(window.RESORTS || []), ...'+JSON.stringify(list)+'];\n');
 fs.writeFileSync('data/openskidata-meta.json',JSON.stringify(metadata,null,2)+'\n');
 console.log(JSON.stringify(metadata,null,2));
}
if(process.argv[1]?.endsWith('sync-openskidata.mjs'))main().catch(e=>{console.error(e);process.exitCode=1});

// Piste Atlas: additive OpenSkiData mapped-detail supplement.
// Uses the upstream ski-area GeoJSON but never changes official resort facts or stable directory IDs.
import fs from 'node:fs';
import vm from 'node:vm';
import {gunzipSync} from 'node:zlib';

export const DATA_URL='https://tiles.openskimap.org/geojson/ski_areas.geojson';
const META_URL='https://tiles.openskimap.org/metadata.json';
const norm=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const n3=n=>Math.round(n*1000)/1000;
function entries(value){
 return value&&typeof value==='object'&& !Array.isArray(value)?Object.entries(value):[];
}
function count(x){return Number.isFinite(x?.count)&&x.count>=0?x.count:0}
function km(x){return Number.isFinite(x?.lengthInKm)&&x.lengthInKm>=0?x.lengthInKm:0}
export function mappedDetails(props){
 const lifts=props?.statistics?.lifts?.byType||{};
 const runs=props?.statistics?.runs?.byActivity?.downhill?.byDifficulty||{};
 const liftTypes=Object.fromEntries(entries(lifts).filter(([_,v])=>count(v)>0).map(([k,v])=>[k,count(v)]));
 const byDifficulty=Object.fromEntries(entries(runs).filter(([_,v])=>count(v)>0||km(v)>0)
   .map(([k,v])=>[k,{segments:count(v),km:n3(km(v)),snowmakingKm:n3(Number.isFinite(v?.snowmakingLengthInKm)?v.snowmakingLengthInKm:0)}]));
 const liftKm=n3(entries(lifts).reduce((a,[_,v])=>a+km(v),0));
 const downhillKm=n3(entries(runs).reduce((a,[_,v])=>a+km(v),0));
 const snowmakingKm=n3(entries(runs).reduce((a,[_,v])=>a+(Number.isFinite(v?.snowmakingLengthInKm)?v.snowmakingLengthInKm:0),0));
 const min=props?.statistics?.runs?.minElevation??props?.statistics?.minElevation;
 const max=props?.statistics?.runs?.maxElevation??props?.statistics?.maxElevation;
 const details={
  mappedLiftTypes:liftTypes,mappedRunDifficulties:byDifficulty,
  mappedLiftNetworkKm:liftKm>0?liftKm:null,
  mappedDownhillKm:downhillKm>0?downhillKm:null,
  mappedSnowmakingKm:snowmakingKm>0?snowmakingKm:null,
  mappedRunSegments:entries(runs).reduce((a,[_,v])=>a+count(v),0)||null,
  mappedLiftCount:entries(lifts).reduce((a,[_,v])=>a+count(v),0)||null,
  mappedMinElevationFt:Number.isFinite(min)?Math.round(min*3.28084):null,
  mappedMaxElevationFt:Number.isFinite(max)?Math.round(max*3.28084):null
 };
 return details;
}
function stableKeys(p){
 const keys=[];
 if(p?.wikidataID)keys.push('wd:'+String(p.wikidataID).toLowerCase());
 for(const v of Array.isArray(p?.sources)?p.sources:[]){
  if(v?.type&&v?.id)keys.push('s:'+norm(v.type)+'-'+norm(v.id));
 }
 return keys;
}
export function enrichFromFeatures(rows,features){
 const lookup=new Map();
 for(const f of features||[]){
  const p=f?.properties;
  if(!p||!p.activities?.includes('downhill'))continue;
  for(const key of stableKeys(p)) if(!lookup.has(key))lookup.set(key,p);
 }
 const enriched={};let matched=0,withRunKm=0,withLiftKm=0,withDifficulty=0;
 for(const row of rows){
  const keys=[row.wikidataID?'wd:'+String(row.wikidataID).toLowerCase():null,
   ...(row.sourceIds||[]).map(v=>'s:'+norm(v.type)+'-'+norm(v.id))].filter(Boolean);
  const p=keys.map(k=>lookup.get(k)).find(Boolean);
  if(!p)continue;
  const d=mappedDetails(p);
  // A feature may be newly split/merged upstream. Preserve known summary counts when absent.
  if(d.mappedLiftCount===null)delete d.mappedLiftCount;
  if(d.mappedRunSegments===null)delete d.mappedRunSegments;
  enriched[row.id]=d;matched++;
  if(d.mappedDownhillKm!==null)withRunKm++;
  if(d.mappedLiftNetworkKm!==null)withLiftKm++;
  if(Object.keys(d.mappedRunDifficulties).length>0)withDifficulty++;
 }
 return {enriched,stats:{existingOpenSkiDataListings:rows.length,matched,withRunKm,withLiftKm,withDifficulty,unmatched:rows.length-matched}};
}
async function get(url){
 const r=await fetch(url,{signal:AbortSignal.timeout(180000)});
 if(!r.ok)throw new Error('OpenSkiData download HTTP '+r.status);
 let b=Buffer.from(await r.arrayBuffer());
 if(b[0]===31&&b[1]===139)b=gunzipSync(b);
 return b.toString('utf8');
}
async function main(){
 const file=process.argv.indexOf('--input');
 const input=file>=0?process.argv[file+1]:null;
 if(file>=0&&!input)throw Error('Use --input path');
 const ctx={window:{RESORTS:[]}};
 vm.runInNewContext(fs.readFileSync('data/resorts.openskidata.js','utf8'),ctx);
 const rows=ctx.window.RESORTS;
 const geo=JSON.parse(input?fs.readFileSync(input,'utf8'):await get(DATA_URL));
 if(geo?.type!=='FeatureCollection'||!Array.isArray(geo.features))throw Error('Invalid OpenSkiData source');
 const {enriched,stats}=enrichFromFeatures(rows,geo.features);
 if(rows.length>100&&stats.matched<Math.floor(rows.length*.6))throw Error('Matched fewer than 60% of existing mapped resort IDs; refusing to overwrite existing supplement');
 const metadata=input?null:JSON.parse(await get(META_URL));
 const provenance={dataSource:DATA_URL,upstreamRunFinishedAt:metadata?.run?.finishedAt||null,generatedAt:new Date().toISOString(),...stats};
 const attribution="OpenSkiData / OpenSkiMap.org; © OpenStreetMap contributors (ODbL), Skimap.org, Who's On First, © Mapterhorn";
 const output='// ODbL map-derived measurements; not resort-reported named trail counts or official vertical drop.\n'
  +'// '+attribution+'\n'
  +'window.PISTE_ATLAS_MAPPED_DETAILS='+JSON.stringify(provenance)+';\n'
  +'window.RESORTS=(window.RESORTS||[]).map(r=>{const d='+JSON.stringify(enriched)+'[r.id];return d?{...r,...d}:r});\n';
 fs.writeFileSync('data/resorts.mapped-detail.js',output);
 fs.writeFileSync('data/resorts.mapped-meta.json',JSON.stringify({...provenance,license:'ODbL',attribution},null,2)+'\n');
 console.log(JSON.stringify(provenance,null,2));
}
if(process.argv[1]?.endsWith('build-mapped-detail.mjs'))main().catch(e=>{console.error(e);process.exitCode=1});

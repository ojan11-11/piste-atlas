import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {mappedDetails,enrichFromFeatures} from './build-mapped-detail.mjs';
const feature=(name,props)=>({type:'Feature',properties:{name,activities:['downhill'],sources:[{type:'openstreetmap',id:'way/123'}],...props}});
const f=feature('Test Hill',{statistics:{
  minElevation:400,maxElevation:1050,
  lifts:{byType:{chair_lift:{count:3,lengthInKm:2.5},magic_carpet:{count:1,lengthInKm:0.15}}},
  runs:{byActivity:{downhill:{byDifficulty:{
    easy:{count:8,lengthInKm:5.34,snowmakingLengthInKm:2},
    intermediate:{count:6,lengthInKm:3.125},
    advanced:{count:4,lengthInKm:1.1}
  }}}}
}});
const d=mappedDetails(f.properties);
assert.equal(d.mappedLiftCount,4);
assert.equal(d.mappedRunSegments,18);
assert.equal(d.mappedDownhillKm,9.565);
assert.equal(d.mappedLiftNetworkKm,2.65);
assert.equal(d.mappedSnowmakingKm,2);
assert.equal(d.mappedMinElevationFt,1312);
assert.equal(d.mappedMaxElevationFt,3445);
assert.equal(d.mappedRunDifficulties.easy.segments,8);
assert.equal(d.mappedLiftTypes.chair_lift,3);
assert.equal(d.mappedLiftTypes.magic_carpet,1);
assert.equal(d.officialTrails,undefined);
assert.equal(d.acres,undefined);
assert.equal(d.snowfall,undefined);
assert.equal(d.ticketPrice,undefined);
const {enriched,stats}=enrichFromFeatures([
  {id:'osd-test',name:'Test Hill',sourceIds:[{type:'openstreetmap',id:'way/123'}]},
  {id:'osd-missing',sourceIds:[{type:'openstreetmap',id:'way/900'}]}
], [f]);
assert.equal(stats.matched,1);
assert.equal(enriched['osd-test'].mappedDownhillKm,9.565);
assert.equal(enriched['osd-missing'],undefined);
// Files must load in order and preserve the official review layer.
const ctx={window:{RESORTS:[]}};
for(const path of ['data/resorts.js','data/resorts.openskidata.js','data/resorts.mapped-detail.js','data/resorts.enriched.js']){
  vm.runInNewContext(fs.readFileSync(path,'utf8'),ctx);
}
const all=ctx.window.RESORTS;
assert.equal(new Set(all.map(r=>r.id)).size,all.length);
assert.equal(all.length,748);
assert.equal(all.filter(r=>r.dataQuality!=='open-data').length,41);
assert.ok(all.every(r=>r.snowfall===null||r.dataQuality!=='open-data'));
if(ctx.window.PISTE_ATLAS_MAPPED_DETAILS.matched>100){
  assert.ok(ctx.window.PISTE_ATLAS_MAPPED_DETAILS.matched>=500);
  assert.ok(all.some(r=>r.mappedDownhillKm>0));
  assert.ok(all.some(r=>r.mappedLiftNetworkKm>0));
  assert.ok(all.some(r=>r.mappedRunDifficulties&&Object.keys(r.mappedRunDifficulties).length>0));
}
console.log('PASS: mapped lengths, categories, preservation of 748 IDs and operator facts');

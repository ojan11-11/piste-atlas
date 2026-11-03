import assert from 'node:assert/strict';
import {transform} from './sync-openskidata.mjs';
const place=(cc,rc)=>[{iso3166_1Alpha2:cc,iso3166_2:cc+'-'+rc,localized:{en:{region:rc,locality:'Test town'}}}];
const example=(name,o={})=>({type:'Feature',geometry:{type:'Point',coordinates:o.coords||[-72,44]},properties:{
 name,activities:o.activities||['downhill'],status:o.status||'operating',
 places:place(o.cc||'US',o.rc||'VT'),sources:[{type:'openstreetmap',id:o.source||'way/42'}],
 statistics:{minElevation:100,maxElevation:300,lifts:{byType:{chair:{count:2}}},runs:{byActivity:{downhill:{byDifficulty:{easy:{count:4}}}}}}
}});
const {list,stats}=transform({type:'FeatureCollection',features:[
 example('Sample Mountain'),example('Sample Mountain'),example('Nordic',{activities:['nordic']}),
 example('Abandoned',{status:'abandoned'}),example('Canadian Hill',{cc:'CA',rc:'BC',coords:[-120,50],source:'way/77'})
]},[]);
assert.equal(list.length,2);assert.equal(stats.duplicatesRemoved,1);assert.equal(stats.us,1);assert.equal(stats.canada,1);
const r=list.find(x=>x.name==='Sample Mountain');
assert.equal(r.id,'osd-openstreetmap-way-42');
assert.equal(r.mappedLiftCount,2);assert.equal(r.mappedRunSegments,4);assert.equal(r.mappedVertical,656);
assert.equal(r.vertical,null);assert.equal(r.acres,null);assert.equal(r.snowfall,null);assert.equal(r.trails,null);assert.equal(r.ticketUrl,null);assert.equal(r.mapUrl,null);
console.log('PASS OpenSkiData eligibility/dedupe/stable IDs/official-vs-mapped fields');

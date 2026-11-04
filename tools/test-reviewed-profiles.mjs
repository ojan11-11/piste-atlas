import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={window:{}};
vm.createContext(ctx);
for(const path of ['data/resorts.js','data/resorts.openskidata.js','data/resorts.enriched.js']){
  vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
}
const rows=ctx.window.RESORTS,reviews=ctx.window.PISTE_ATLAS_REVIEWS;
assert.equal(reviews.length,33,'Expected 33 reviewed OpenSkiData profiles after two batches');
assert.equal(rows.length,748,'Source snapshot should still contain 748 unique entries');
assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'No duplicate IDs');
assert.equal(rows.filter(r=>r.dataQuality==='operator-reviewed').length,33,'All 33 reviewed overlays matched');
assert.equal(rows.filter(r=>r.dataQuality==='open-data').length,707,'Unreviewed map-only listings preserved');
for(const review of reviews){
 const current=rows.find(r=>r.id===review.id);
 assert.ok(current,'Review ID must exist in source snapshot: '+review.id);
 assert.equal(current.dataQuality,'operator-reviewed');
 assert.equal(current.verifiedAt,'2026-11-03');
 assert.ok(current.sourcePages.length>0);
 assert.ok(current.sourcePages.every(u=>u.startsWith('https://')));
 assert.ok(current.sourceUrl.startsWith('https://'));
 for(const k of ['acres','vertical','snowfall','lifts','trails','summit','base']){
   assert.ok(current[k]===null||(Number.isFinite(current[k])&&current[k]>=0),k+' must be sourced numeric/null: '+current.id);
 }
 if(current.terrain)assert.equal(current.terrain.beginner+current.terrain.intermediate+current.terrain.advanced,100);
 if(current.ticketPriceExample){
   const p=current.ticketPriceExample;
   assert.ok(p.amount>0&&['USD','CAD'].includes(p.currency)&&p.season&&p.label&&p.conditions&&current.ticketUrl);
 }
}
const jay=rows.find(r=>r.name==='Jay Peak Resort');
const sundown=rows.find(r=>r.name==='Ski Sundown');
const deer=rows.find(r=>r.name==='Deer Valley Resort');
const banff=rows.find(r=>r.name==='Banff Sunshine Village');
assert.equal(jay.ticketPriceExample.amount,105);
assert.equal(sundown.ticketPriceExample.amount,70);
assert.equal(deer.trails,209);
assert.equal(banff.acres,null,'Conflict in official acreage figures must stay unverified');
assert.equal(rows.filter(r=>r.dataQuality!=='open-data').length,41,'Original eight curated profiles + 33 reviewed overlays');
const taos=rows.find(r=>r.id==='osd-openstreetmap-relation-13573224');
assert.equal(taos.acres,1294);
assert.equal(taos.trails,110,'Trail mix percentage must never become a trail count');
assert.equal(taos.terrain.advanced,51);
const ridge=rows.find(r=>r.id==='osd-wikidata-q7235991');
assert.equal(ridge.acres,80,'Property acreage must not replace skiable acres');
assert.equal(ridge.trails,null,'Conflicting trail counts must stay unknown');
const palisades=rows.find(r=>r.id==='osd-wikidata-q2182804');
const alpine=rows.find(r=>r.id==='osd-openstreetmap-relation-6704136');
assert.equal(palisades.acres,3600);assert.equal(alpine.acres,2400);
assert.ok(palisades.mapUrl&&alpine.mapUrl&&palisades.ticketUrl&&alpine.ticketUrl);
const beech=rows.find(r=>r.id==='osd-openstreetmap-relation-5886546');
assert.equal(beech.ticketPriceExample.amount,50);
assert.equal(beech.ticketPriceExample.season,'2026–27');
assert.ok(reviews.filter(r=>r.verifiedAt==='2026-11-03').length===33);
for(const r of reviews.slice(15)){assert.equal(r.snowfall,null,'Snowfall intentionally deferred for new reviews')}
console.log('PASS 33 official-source reviews, 41 total curated sites, trail maps and guarded stats');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const ctx={window:{}};
vm.createContext(ctx);
for(const path of ['data/resorts.js','data/resorts.openskidata.js','data/resorts.enriched.js']){
  vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
}
const rows=ctx.window.RESORTS,reviews=ctx.window.PISTE_ATLAS_REVIEWS;
assert.equal(reviews.length,15,'Expected first review batch of 15');
assert.equal(rows.length,748,'Source snapshot should still contain 748 unique entries');
assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'No duplicate IDs');
assert.equal(rows.filter(r=>r.dataQuality==='operator-reviewed').length,15,'All 15 overlays matched');
assert.equal(rows.filter(r=>r.dataQuality==='open-data').length,725,'Unreviewed map-only listings preserved');
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
console.log('PASS 15 official-source reviews, IDs, stats, attribution, price conditions and 748 unique resort entries');

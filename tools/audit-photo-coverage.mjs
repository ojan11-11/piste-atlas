// Offline photo-source coverage audit. This counts candidates, not validated images.
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const window={RESORTS:[]};
const ctx={window,document:{querySelectorAll:()=>[],querySelector:()=>null}};
vm.createContext(ctx);
for(const filename of ['data/resorts.js','data/resorts.openskidata.js','data/resorts.mapped-detail.js',
  'data/resorts.enriched.js','atlas-photos.js']){
  vm.runInContext(fs.readFileSync(filename,'utf8'),ctx,{filename});
}
const photos=window.PisteAtlasPhotos;
const all=window.RESORTS;
const counts={total:all.length,curated:0,wikidata:0,categoryCandidate:0,searchFallback:0};
for(const r of all){
  if(photos.featured[r.id])counts.curated++;
  else if(/^Q\d+$/.test(r.wikidataID||''))counts.wikidata++;
  else if(photos._test.categoryFor(r,null))counts.categoryCandidate++;
  else counts.searchFallback++;
}
assert.equal(Object.values(counts).slice(1).reduce((a,b)=>a+b,0),counts.total);
console.log('Piste Atlas photo discovery source opportunities (not guaranteed usable photos):');
for(const [key,value] of Object.entries(counts))console.log('  '+key+': '+value);
console.log('Resorts without safe image matches continue to show the original illustration.');

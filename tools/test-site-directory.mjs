import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const callbacks={},app={innerHTML:''},doc={
 title:'',querySelector:q=>q==='#app'?app:null,
 addEventListener:(event,fn)=>{callbacks[event]=fn},
 getElementById:()=>({value:'big sky'})
};
const win={location:{hash:''},scrollTo:()=>{},addEventListener:(k,fn)=>{callbacks['window-'+k]=fn}};
const ctx={window:win,document:doc,Intl,Set,JSON,Number,String,console,alert:msg=>{throw Error(msg)}};
vm.createContext(ctx);
vm.runInContext(fs.readFileSync('data/resorts.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('data/resorts.openskidata.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('data/resorts.mapped-detail.js','utf8'),ctx);
vm.runInContext(fs.readFileSync('data/resorts.enriched.js','utf8'),ctx);
const all=win.RESORTS;
assert.equal(win.PISTE_ATLAS_REVIEWS.length,33);
assert.equal(all.filter(r=>r.dataQuality!=='open-data').length,41);
assert.ok(all.filter(r=>r.mappedDownhillKm>0).length>=500,'Most map-only resorts now have measured run lengths');
assert.ok(all.some(r=>r.mappedLiftNetworkKm>0),'Lift network lengths available');
assert.equal(new Set(all.map(x=>x.id)).size,all.length,'IDs remain unique after merging official and mapped data');
assert.ok(all.length>=8);
vm.runInContext(fs.readFileSync('app.js','utf8'),ctx);
assert.match(app.innerHTML,/Every mountain/);
assert.equal((app.innerHTML.match(/class="resort-card"/g)||[]).length,Math.min(all.length,24),'cards paginated');
assert.ok(!app.innerHTML.includes('href="null"'));
if(all.length>24){
 callbacks.click({target:{closest:q=>q==='[data-map-resort]'?null:{dataset:{action:'load-more'}}}});
 assert.equal((app.innerHTML.match(/class="resort-card"/g)||[]).length,48);
 const mapped=all.find(x=>x.dataQuality==='open-data');
 assert.ok(mapped&&mapped.mappedLiftCount>0);
 win.location.hash='#resort/'+mapped.id;callbacks['window-hashchange']();
 assert.match(app.innerHTML,/Mapped lifts:/);
 assert.match(app.innerHTML,/No direct winter map link yet/);
 assert.match(app.innerHTML,/Mapped trail and lift network/);
 assert.match(app.innerHTML,/Mapped segments by difficulty/);
 assert.match(app.innerHTML,/\d[\d,.]* mi\b/,'Mapped distance should be expressed in miles');
 assert.doesNotMatch(app.innerHTML,/\d[\d,.]*\s*km\b/,'No metric distances in rendered profile');
 assert.match(app.innerHTML,/No direct ticket link/);
 assert.ok(!app.innerHTML.includes('href="null"'));
}
win.location.hash='#resort/big-sky';callbacks['window-hashchange']();
assert.match(app.innerHTML,/5,850/);
win.location.hash='#map';callbacks['window-hashchange']();
assert.match(app.innerHTML,/North American overview/);
assert.match(app.innerHTML,/data-map-resort="big-sky"/);
assert.equal((app.innerHTML.match(/data-map-resort="/g)||[]).length,748,'all mapped resorts are plotted');
win.location.hash='#resort/osd-wikidata-q14711914';callbacks['window-hashchange']();
assert.match(app.innerHTML,/Official references checked/);
assert.match(app.innerHTML,/2026–27/);
assert.match(app.innerHTML,/USD \$105/);
assert.match(app.innerHTML,/347/);
const candidate=all.find(r=>r.dataQuality==='open-data'&&r.mappedDownhillKm>0);
assert.ok(candidate,'expected mapped candidate');
win.location.hash='#resort/'+candidate.id;callbacks['window-hashchange']();
const expectedMiles=new Intl.NumberFormat('en-US').format(Math.round(candidate.mappedDownhillKm*0.621371192237334*100)/100)+' mi';
assert.ok(app.innerHTML.includes(expectedMiles),'Mapped profile distance must be converted from source kilometers to miles');
assert.doesNotMatch(app.innerHTML,/\d[\d,.]*\s*km\b/,'Profile must contain no kilometer measurements');
callbacks.click({target:{closest:q=>q==='[data-map-resort]'?null:{dataset:{action:'toggle-compare',id:candidate.id}}}});
win.location.hash='#compare';callbacks['window-hashchange']();
assert.match(app.innerHTML,/Mapped downhill distance/);
assert.match(app.innerHTML,/Mapped lift network distance/);
assert.match(app.innerHTML,/\d[\d,.]* mi\b/,'Comparison should display miles');
assert.doesNotMatch(app.innerHTML,/\d[\d,.]*\s*km\b/,'No kilometer values in comparisons');
console.log('PASS site integration for '+all.length+' curated and mapped listings, profile mapped distances, difficulty, full coordinate map');

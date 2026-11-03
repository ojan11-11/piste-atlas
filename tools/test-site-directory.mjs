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
const all=win.RESORTS;
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
 assert.match(app.innerHTML,/Official trail map not yet verified/);
 assert.match(app.innerHTML,/Official ticket booking link not yet verified/);
 assert.ok(!app.innerHTML.includes('href="null"'));
}
win.location.hash='#resort/big-sky';callbacks['window-hashchange']();
assert.match(app.innerHTML,/5,850/);
win.location.hash='#map';callbacks['window-hashchange']();
assert.match(app.innerHTML,/North American overview/);
assert.match(app.innerHTML,/data-map-resort="big-sky"/);
assert.equal((app.innerHTML.match(/class="map-marker"/g)||[]).length,8,'schematic map only plots verified locations');
console.log('PASS site integration for '+all.length+' curated and mapped listings');

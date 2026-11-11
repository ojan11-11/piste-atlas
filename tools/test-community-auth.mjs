// End-to-end browser-interface simulation with a small in-memory Supabase mock.
// This is NOT a substitute for testing real Supabase RLS with two separate accounts.
import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const store={piste_visits:[],piste_reviews:[],piste_profiles:[],piste_review_reports:[]};
const user={id:'11111111-1111-4111-8111-111111111111',email:'test-skier@example.net'};
const calls=[];
class FakeQuery {
 constructor(table,op='select',payload=null){this.table=table;this.op=op;this.payload=payload;this.filters=[];this.lim=null;}
 select(){return this;}
 eq(k,v){this.filters.push(row=>row[k]===v);return this;}
 in(k,values){this.filters.push(row=>values.includes(row[k]));return this;}
 order(){return this;}
 limit(n){this.lim=n;return this;}
 maybeSingle(){return Promise.resolve(this.perform()).then(r=>({data:r.data[0]||null,error:r.error}));}
 update(payload){this.op='update';this.payload=payload;return this;}
 insert(payload){this.op='insert';this.payload=payload;return this;}
 delete(){this.op='delete';return this;}
 then(resolve,reject){return Promise.resolve(this.perform()).then(resolve,reject);}
 perform(){
  calls.push({table:this.table,op:this.op});
  if(this.table==='piste_resort_rating_summaries'){
    const recent=store.piste_reviews.filter(r=>r.status==='published');
    const grouped=Object.values(Object.groupBy(recent,r=>r.resort_id)).map(rows=>({
      resort_id:rows[0].resort_id,average_rating:rows.reduce((a,r)=>a+r.rating,0)/rows.length,review_count:rows.length
    }));
    return {data:grouped.filter(r=>this.filters.every(f=>f(r))),error:null};
  }
  let list=store[this.table];
  if(!list)return {data:null,error:new Error('Unknown table')};
  if(this.op==='insert'){
    const record={...this.payload};
    if(this.table==='piste_reviews'){
      record.id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';record.status='published';record.created_at='2026-11-11T12:00:00Z';
    }
    list.push(record);return {data:null,error:null};
  }
  const rows=list.filter(r=>this.filters.every(f=>f(r)));
  if(this.op==='update'){for(const row of rows)Object.assign(row,this.payload);return {data:null,error:null};}
  if(this.op==='delete'){store[this.table]=list.filter(r=>!rows.includes(r));return {data:null,error:null};}
  return {data:this.lim?rows.slice(0,this.lim):rows,error:null};
 }
}
const auth={
 getUser(){return Promise.resolve({data:{user},error:null})},
 onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}}},
 signInWithOtp(){return Promise.resolve({data:{},error:null})},
 signOut(){return Promise.resolve({error:null})}
};
const fakeSupabase={createClient:()=>({auth,from:(table)=>new FakeQuery(table)})};

const callbacks={},wcallbacks={},dataStorage=new Map();
const app={innerHTML:''},account={innerHTML:''};
const resortElement={innerHTML:'',getAttribute:()=>resortId};
let resortId='';
const doc={
 title:'',
 querySelector(selector){
  if(selector==='#app')return app;
  if(selector==='#pa-account-content')return app.innerHTML.includes('id="pa-account-content"')?account:null;
  if(selector==='[data-pa-resort]'){
   const m=app.innerHTML.match(/data-pa-resort="([^"]+)"/);if(!m)return null;
   resortId=m[1];return resortElement;
  }
  return null;
 },
 addEventListener(name,fn){(callbacks[name]||=[]).push(fn)},
 getElementById:()=>({value:'big sky'})
};
const win={
 location:{hash:'',origin:'https://ojan11-11.github.io',pathname:'/piste-atlas/'},
 supabase:fakeSupabase,scrollTo:()=>{},
 addEventListener:(name,fn)=>{(wcallbacks[name]||=[]).push(fn)},
 PISTE_COMMUNITY_CONFIG:{url:'https://demo-project.supabase.co',publishableKey:'sb_publishable_mock_for_testing_only_123456789'}
};
class FakeFormData{constructor(form){this.form=form;}get(key){return this.form.fields[key]??null;}}
const ctx={window:win,document:doc,localStorage:{
 getItem:key=>dataStorage.get(key)||null,setItem:(key,value)=>dataStorage.set(key,value)
},Intl,Set,Map,JSON,Number,String,Object,Date,FormData:FakeFormData,console,alert:()=>{},setTimeout};
vm.createContext(ctx);
for(const path of ['data/resorts.js','data/resorts.openskidata.js','data/resorts.mapped-detail.js',
 'data/resorts.enriched.js','community.js','app.js']){
  vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
}
await new Promise(resolve=>setTimeout(resolve,40));
assert.ok(win.PisteCommunity.isSignedIn);
assert.equal(win.PisteCommunity.visitCount,0);
function navigate(hash){win.location.hash=hash;for(const fn of wcallbacks.hashchange||[])fn();}
async function submit(kind,id,fields){
 const form={dataset:{paForm:kind,resortId:id},fields};
 await callbacks.submit[0]({target:form,preventDefault(){}});
}
navigate('#resort/big-sky');
assert.match(resortElement.innerHTML,/Write a review/);
assert.match(resortElement.innerHTML,/Mark as visited/);
await submit('visit','big-sky',{visited_on:'2026-01-25',note:'Great trip'});
assert.equal(win.PisteCommunity.visitCount,1);
assert.equal(store.piste_visits[0].resort_id,'big-sky');
await submit('review','big-sky',{rating:'5',title:'Fantastic terrain',body:'The skiing and lift layout were excellent for our weeklong trip.'});
assert.equal(store.piste_reviews.length,1);
assert.equal(store.piste_reviews[0].rating,5);
navigate('#account');
assert.match(account.innerHTML,/test-skier@example.net/);
assert.match(account.innerHTML,/Big Sky Resort/);
assert.match(account.innerHTML,/Fantastic terrain/);
navigate('#resort/big-sky');
assert.match(resortElement.innerHTML,/5\.0 \/ 5/);
assert.match(resortElement.innerHTML,/Fantastic terrain/);
assert.match(resortElement.innerHTML,/Edit your review/);
await submit('review','big-sky',{rating:'4',title:'Very good terrain',body:'This mountain has plenty of variety for skiers in our group.'});
assert.equal(store.piste_reviews.length,1,'Each user can only have one review per resort');
assert.equal(store.piste_reviews[0].rating,4,'Reviews are updated, not duplicated');
assert.ok(calls.some(c=>c.table==='piste_review_reports')===false,'No reports submitted during review test');
console.log('PASS authenticated UI: private visits, public review creation/editing, rating summaries, account profile');

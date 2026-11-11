import vm from 'node:vm';
import fs from 'node:fs';
import assert from 'node:assert/strict';

const callbacks={},windowCallbacks={},store=new Map();
const app={innerHTML:''},account={innerHTML:''};
let panelId='';
const panel={innerHTML:'',getAttribute:()=>panelId};
const doc={
 title:'',
 querySelector(selector){
   if(selector==='#app')return app;
   if(selector==='#pa-account-content')return app.innerHTML.includes('id="pa-account-content"')?account:null;
   if(selector==='[data-pa-resort]'){
     const m=app.innerHTML.match(/data-pa-resort="([^"]+)"/);
     if(!m)return null;
     panelId=m[1];return panel;
   }
   return null;
 },
 addEventListener(name,fn){(callbacks[name]||=[]).push(fn)},
 getElementById:()=>({value:'big sky'}),
};
const storage={
 getItem:k=>store.has(k)?store.get(k):null,
 setItem:(k,v)=>store.set(k,v)
};
const win={
 location:{hash:'',origin:'https://ojan11-11.github.io',pathname:'/piste-atlas/'},
 scrollTo:()=>{},
 addEventListener:(type,fn)=>{(windowCallbacks[type]||=[]).push(fn)}
};
class FakeFormData{constructor(form){this.form=form}get(name){return this.form.fields[name]??null}}
const ctx={window:win,document:doc,localStorage:storage,Intl,Set,Map,JSON,Number,String,Object,Date,FormData:FakeFormData,console,alert:()=>{},setTimeout};
vm.createContext(ctx);
for(const path of ['data/resorts.js','data/resorts.openskidata.js','data/resorts.mapped-detail.js',
 'data/resorts.enriched.js','community-config.js','community.js','app.js']){
  vm.runInContext(fs.readFileSync(path,'utf8'),ctx,{filename:path});
  // Exercise guest-only mode independently of the live Supabase config.
  if(path==='community-config.js')win.PISTE_COMMUNITY_CONFIG={url:'',publishableKey:''};
}
assert.equal(win.PisteCommunity.isConfigured,false,'Guest-mode simulation disables external auth');
assert.equal(win.PisteCommunity.visitCount,0);
assert.match(app.innerHTML,/Account/);
function navigate(hash){
 win.location.hash=hash;
 for(const fn of windowCallbacks.hashchange||[])fn();
}
navigate('#account');
assert.match(app.innerHTML,/My mountains/);
assert.match(account.innerHTML,/Local mountain logbook/);
assert.match(account.innerHTML,/0<\/strong><span>Mountains visited/);
navigate('#resort/big-sky');
assert.match(app.innerHTML,/Visits, ratings & reviews/);
assert.match(panel.innerHTML,/Mark as visited/);
assert.match(panel.innerHTML,/Ratings and public reviews will open/);
const visitHandler=callbacks.submit.find(fn=>typeof fn==='function');
const form={dataset:{paForm:'visit',resortId:'big-sky'},fields:{visited_on:'2026-01-25',note:'Loved the views <script>alert(1)</script>'}};
await visitHandler({target:form,preventDefault(){}});
assert.equal(win.PisteCommunity.visitCount,1);
assert.ok(store.has('piste-atlas-guest-visits'));
navigate('#account');
assert.match(account.innerHTML,/Big Sky Resort/);
assert.match(account.innerHTML,/Jan 25, 2026/);
assert.ok(!account.innerHTML.includes('<script>alert(1)</script>'),'User notes must be escaped');
assert.match(account.innerHTML,/&lt;script&gt;/);
navigate('#discover');
assert.match(app.innerHTML,/✓ Visited/,'Visited resort gets a badge');
assert.match(app.innerHTML,/My mountains/);

const community=fs.readFileSync('community.js','utf8');
const sql=fs.readFileSync('supabase/001_community.sql','utf8');
assert.match(sql,/alter table public\.piste_visits enable row level security/);
assert.match(sql,/alter table public\.piste_reviews enable row level security/);
assert.match(sql,/for select to authenticated using \(user_id = \(select auth\.uid\(\)\)\)/);
assert.match(sql,/status='published'/);
assert.match(sql,/constraint piste_review_one_per_user_per_resort unique/);
assert.ok(!/service_role|sb_secret_/.test(fs.readFileSync('community-config.js','utf8').replace(/\/\/[^\n]*/g,'')));
assert.match(community,/signInWithOtp/);
assert.match(community,/piste_review_reports/);
assert.match(community,/data-pa-form="review"/);
assert.ok(win.PisteCommunity._test.safeId('big-sky'));
assert.ok(!win.PisteCommunity._test.safeId('nonexistent-mountain'));
assert.equal(win.PisteCommunity._test.stars(4),'★★★★☆');
console.log('PASS community integration: guest visit journal, account route, review forms, XSS escaping, SQL RLS contract');

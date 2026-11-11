/* Piste Atlas community layer. Works on GitHub Pages with Supabase Auth + RLS.
 * When Supabase is not configured, visited mountains are saved only in this browser.
 * Never trust client validation alone: server-side constraints are in supabase/001_community.sql.
 */
(() => {
  'use strict';
  const catalog = new Map((window.RESORTS || []).map(r => [r.id, r]));
  const config = window.PISTE_COMMUNITY_CONFIG || {};
  const configured = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(config.url || '') &&
    typeof config.publishableKey === 'string' && config.publishableKey.length > 20;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g,
    c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const stars = n => '★'.repeat(Math.max(0,Math.min(5,Number(n)||0))) +
    '☆'.repeat(5-Math.max(0,Math.min(5,Number(n)||0)));
  const fmtDate = v => {
    if (!v) return 'Date not specified';
    const date = new Date(String(v).slice(0,10)+'T12:00:00');
    return Number.isNaN(date.getTime()) ? 'Date not specified' : date.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  };
  const safeId = id => catalog.has(id) && /^[a-zA-Z0-9._-]{3,160}$/.test(id);
  const defaultName = 'Skier';
  const state = {ready:!configured, user:null, profile:null, visits:new Map(), myReviews:new Map(),
    guest:new Map(), publicReviews:new Map(), loading:new Set(), pendingLoads:new Map(), note:'', noteType:'info', busy:false,
    backendError:'', client:null};

  function loadGuest() {
    try {
      const parsed = JSON.parse(localStorage.getItem('piste-atlas-guest-visits') || '{}');
      for (const [id,val] of Object.entries(parsed)) {
        if (safeId(id) && val && typeof val === 'object') {
          state.guest.set(id,{resort_id:id,visited_on:/^\d{4}-\d\d-\d\d$/.test(val.visited_on||'')?val.visited_on:null,
            note:String(val.note||'').slice(0,300)});
        }
      }
    } catch {}
  }
  function storeGuest() {
    try {localStorage.setItem('piste-atlas-guest-visits',JSON.stringify(Object.fromEntries(state.guest)));} catch {}
  }
  loadGuest();

  function hasAccount(){return !!state.user && !!state.client;}
  function currentVisits(){return hasAccount()?state.visits:state.guest;}
  function navLabel(){return hasAccount()?'My mountains':'Account';}
  function cardBadge(id){return currentVisits().has(id)?'<span class="pa-visited-pill">✓ Visited</span>':'';}
  function panel(id){
    if(!safeId(id))return '';
    return '<section class="panel-section pa-section" aria-label="Mountain community">'
      +'<span class="mini-eyebrow">PISTE ATLAS COMMUNITY</span><h2>Visits, ratings & reviews</h2>'
      +'<div class="pa-profile-content" data-pa-resort="'+esc(id)+'"></div></section>';
  }
  function accountPanel(){return '<div id="pa-account-content" class="pa-account-content"></div>';}

  function setNote(message,type='info'){state.note=String(message||'').slice(0,250);state.noteType=type;refreshPanels();}
  function noteHTML(){
    return state.note?'<p class="pa-notice pa-notice-'+esc(state.noteType)+'" role="status">'+esc(state.note)+'</p>':'';
  }
  function refreshApp(){
    if(typeof window.PisteAtlasRender==='function')window.PisteAtlasRender({preserveScroll:true});
    else refreshPanels();
  }
  function refreshPanels(){
    const account=document.querySelector('#pa-account-content');
    if(account)account.innerHTML=accountHTML();
    const panel=document.querySelector('[data-pa-resort]');
    if(panel){const id=panel.getAttribute('data-pa-resort');panel.innerHTML=resortHTML(id);if(state.client&&!state.loading.has(id)&&!state.publicReviews.has(id))fetchResort(id);}
  }
  function resortHTML(id){
    const record=currentVisits().get(id);
    const signed=hasAccount();
    const my=state.myReviews.get(id);
    const cached=state.publicReviews.get(id);
    const data=cached?.reviews||[];
    const rating=cached?.summary;
    const reviews=data.length?data.map(r=>{
      const display=cached.names?.[r.user_id]||defaultName;
      return '<article class="pa-review"><div class="pa-review-top"><strong>'+esc(display)+'</strong>'
        +'<span class="pa-stars" aria-label="'+esc(r.rating)+' out of 5 stars">'+stars(r.rating)+'</span>'
        +'<small>'+esc(fmtDate(r.created_at))+'</small></div>'
        +'<h4>'+esc(r.title)+'</h4><p>'+esc(r.body)+'</p>'
        +(signed&&r.user_id!==state.user.id?'<div class="pa-report"><label>Report review <select data-pa-report-reason="'+esc(r.id)+'"><option value="spam">Spam</option><option value="harassment">Harassment</option><option value="misinformation">Incorrect information</option><option value="other">Other</option></select></label> <button class="pa-link-button" type="button" data-pa-action="report" data-review-id="'+esc(r.id)+'">Report</button></div>':'')
        +'</article>';
    }).join(''):'<p class="pa-empty">No public reviews yet. Be the first to share your experience.</p>';
    const summary=rating?'<strong>'+esc(Number(rating.average_rating).toFixed(1))+' / 5</strong> <span class="pa-stars">'+stars(Math.round(rating.average_rating))+'</span> <small>('+esc(rating.review_count)+' reviews)</small>'
      :'<strong>No ratings yet</strong>';
    const visitForm='<form data-pa-form="visit" data-resort-id="'+esc(id)+'">'
      +'<div class="pa-form-grid"><label>Visit date (optional)<input name="visited_on" type="date" value="'+esc(record?.visited_on||'')+'"></label>'
      +'<label>Visit notes (optional)<textarea name="note" maxlength="300" rows="2" placeholder="Favorite run, trip memories...">'+esc(record?.note||'')+'</textarea></label></div>'
      +'<div class="pa-actions"><button class="btn dark" type="submit">'+(record?'Update visit':'Mark as visited')+'</button>'
      +(record?'<button class="btn outline" type="button" data-pa-action="remove-visit" data-resort-id="'+esc(id)+'">Remove visit</button>':'')+'</div></form>';
    const ownEditor=signed?'<form data-pa-form="review" data-resort-id="'+esc(id)+'">'
      +'<h3>'+(my?'Edit your review':'Write a review')+'</h3>'
      +'<div class="pa-form-grid"><label>Overall rating<select name="rating" required>'
      +[1,2,3,4,5].map(n=>'<option value="'+n+'" '+((my?.rating||5)===n?'selected':'')+'>'+n+' '+(n===1?'star':'stars')+'</option>').join('')
      +'</select></label><label>Review title<input name="title" type="text" minlength="3" maxlength="100" required value="'+esc(my?.title||'')+'" placeholder="A memorable mountain"></label></div>'
      +'<label>Your experience<textarea name="body" minlength="20" maxlength="2000" rows="4" required placeholder="What stood out about the terrain, lifts, experience, and value?">'+esc(my?.body||'')+'</textarea></label>'
      +'<div class="pa-actions"><button class="btn dark" type="submit">'+(my?'Update review':'Post review')+'</button>'
      +(my?'<button class="btn outline" type="button" data-pa-action="delete-review" data-resort-id="'+esc(id)+'">Delete review</button>':'')+'</div>'
      +'<small>One review per mountain. Reviews are public; keep personal contact details out of them.</small></form>'
      :configured?'<div class="pa-signin-prompt"><p>Sign in to rate this mountain and share a written review.</p>'
      +'<a class="btn outline" href="#account">Sign in or create an account</a></div>'
      :'<div class="pa-signin-prompt"><p>Ratings and public reviews will open when community accounts are activated.</p></div>';
    return '<div class="pa-summary"><div>'+summary+'</div><span>'+ (record?'✓ On your visited list':'Add this mountain to your logbook') +'</span></div>'
      +(signed?'': '<p class="pa-guest-label">'+(configured?'Guest visits stay in this browser until you sign in and import them.':'Guest logbook is saved only in this browser. Online accounts need database setup.')+'</p>')
      +visitForm+'<div class="pa-review-area"><div class="pa-review-list"><h3>Mountain reviews</h3>'
      +(state.client?(cached?reviews:'<p class="pa-empty">Loading reviews…</p>'):'<p class="pa-empty">Public reviews will appear when community accounts are activated.</p>')
      +'</div><div class="pa-review-editor">'+ownEditor+'</div></div>'+noteHTML();
  }
  function accountHTML(){
    const intro='<div class="pa-account-header"><span class="mini-eyebrow">YOUR MOUNTAIN JOURNAL</span>'
      +'<h2>Mountains you have explored</h2><p>Track visited ski areas, remember your trips, and review places you have skied.</p></div>';
    const list=[...currentVisits().values()].sort((a,b)=>(b.visited_on||'').localeCompare(a.visited_on||'')||(catalog.get(a.resort_id)?.name||'').localeCompare(catalog.get(b.resort_id)?.name||''));
    const journal=list.length?'<div class="pa-visit-list">'+list.map(v=>{
      const r=catalog.get(v.resort_id);
      return '<article class="pa-visit-item"><div><strong><a href="#resort/'+esc(v.resort_id)+'">'+esc(r?.name||v.resort_id)+'</a></strong>'
        +'<small>'+esc(r?.region||'')+' · '+esc(fmtDate(v.visited_on))+'</small>'
        +(v.note?'<p>'+esc(v.note)+'</p>':'')+'</div><a class="pa-link-button" href="#resort/'+esc(v.resort_id)+'">Edit visit</a></article>';
    }).join('')+'</div>':'<p class="pa-empty">No mountains logged yet. Open any resort profile and select “Mark as visited.”</p>';
    const reviews=[...state.myReviews.values()].sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
    const ownReviews=reviews.length?'<div class="pa-visit-list">'+reviews.map(r=>{
      const mountain=catalog.get(r.resort_id);
      return '<article class="pa-visit-item"><div><strong><a href="#resort/'+esc(r.resort_id)+'">'+esc(mountain?.name||r.resort_id)+'</a></strong>'
        +'<small class="pa-stars">'+stars(r.rating)+'</small><p>'+esc(r.title)+'</p></div>'
        +'<a class="pa-link-button" href="#resort/'+esc(r.resort_id)+'">Edit</a></article>';
    }).join('')+'</div>':'<p class="pa-empty">Your reviews will appear here once you publish them.</p>';
    const auth=signedInHTML();
    return intro+auth+'<div class="pa-account-stats"><div><strong>'+list.length+'</strong><span>Mountains visited</span></div>'
      +'<div><strong>'+reviews.length+'</strong><span>Reviews written</span></div></div>'
      +'<section class="pa-account-section"><h3>Visited mountains</h3>'+journal+'</section>'
      +(hasAccount()?'<section class="pa-account-section"><h3>My reviews</h3>'+ownReviews+'</section>':'')
      +noteHTML();
  }
  function signedInHTML(){
    if(!configured) return '<div class="pa-auth-card"><h3>Local mountain logbook</h3><p>Mark mountains as visited now; your list is saved only in this browser. To enable cross-device accounts and public reviews, the site owner must connect Supabase.</p></div>';
    if(state.backendError) return '<div class="pa-auth-card"><h3>Accounts temporarily unavailable</h3><p>'+esc(state.backendError)+'</p></div>';
    if(!state.ready) return '<div class="pa-auth-card"><p>Checking your account…</p></div>';
    if(!hasAccount())return '<div class="pa-auth-card"><h3>Sign in or create your account</h3>'
      +'<p>Enter your email and we’ll send a secure sign-in link. No password required.</p>'
      +'<form data-pa-form="signin"><label>Email address<input type="email" name="email" autocomplete="email" required maxlength="254" placeholder="you@example.com"></label>'
      +'<button class="btn dark" type="submit">Email me a sign-in link</button></form>'
      +'<small>A confirmation link may take a minute to arrive. You can also continue tracking mountains locally.</small></div>';
    return '<div class="pa-auth-card"><h3>Signed in</h3><p>'+esc(state.user.email||'Your account')+'</p>'
      +'<form data-pa-form="profile"><label>Public display name<input name="display_name" type="text" minlength="2" maxlength="32" required value="'+esc(state.profile?.display_name||defaultName)+'"></label>'
      +'<div class="pa-actions"><button class="btn dark" type="submit">Save display name</button>'
      +'<button type="button" class="btn outline" data-pa-action="signout">Sign out</button></div></form>'
      +(state.guest.size?'<p>Guest logbook: '+state.guest.size+' mountain(s) stored on this browser. <button type="button" class="pa-link-button" data-pa-action="import-guest">Import to my account</button></p>':'')
      +'<small>Your visits are private. Your display name, ratings, and published reviews are visible to everyone.</small></div>';
  }

  function mount(){refreshPanels();}
  function loadResort(id){
    if(!state.client||!safeId(id))return Promise.resolve();
    if(state.pendingLoads.has(id))return state.pendingLoads.get(id);
    state.loading.add(id);
    const work=(async()=>{
      try{
        const [reviewsRes,summaryRes]=await Promise.all([
          state.client.from('piste_reviews').select('id,user_id,rating,title,body,created_at')
            .eq('resort_id',id).eq('status','published').order('created_at',{ascending:false}).limit(20),
          state.client.from('piste_resort_rating_summaries')
            .select('review_count,average_rating').eq('resort_id',id).maybeSingle()
        ]);
        if(reviewsRes.error)throw reviewsRes.error;
        if(summaryRes.error)throw summaryRes.error;
        const reviews=reviewsRes.data||[],ids=[...new Set(reviews.map(r=>r.user_id))];
        let names={};
        if(ids.length){
          const lookup=await state.client.from('piste_profiles').select('user_id,display_name').in('user_id',ids);
          if(!lookup.error)names=Object.fromEntries((lookup.data||[]).map(p=>[p.user_id,p.display_name]));
        }
        state.publicReviews.set(id,{reviews,names,summary:summaryRes.data||null});
      }catch(error){
        state.publicReviews.set(id,{reviews:[],names:{},summary:null,error:true});
        state.backendError=String(error?.message||'Cannot load reviews').slice(0,150);
      }finally{
        state.loading.delete(id);
        state.pendingLoads.delete(id);
        refreshPanels();
      }
    })();
    state.pendingLoads.set(id,work);
    return work;
  }
  function fetchResort(id){return loadResort(id);}
  async function loadMine(){
    if(!hasAccount())return;
    const uid=state.user.id;
    const [vis,rev,prof]=await Promise.all([
      state.client.from('piste_visits').select('resort_id,visited_on,note').eq('user_id',uid),
      state.client.from('piste_reviews').select('id,resort_id,rating,title,body,status,created_at').eq('user_id',uid),
      state.client.from('piste_profiles').select('display_name').eq('user_id',uid).maybeSingle()
    ]);
    if(vis.error||rev.error||prof.error){state.backendError='Could not load account data. Check that the database tables and RLS policies are installed.';}
    state.visits=new Map((vis.data||[]).filter(v=>safeId(v.resort_id)).map(v=>[v.resort_id,v]));
    state.myReviews=new Map((rev.data||[]).filter(r=>safeId(r.resort_id)).map(r=>[r.resort_id,r]));
    state.profile=prof.data||null;
    refreshApp();
  }
  async function setUser(nextUser){
    if((state.user?.id||null)===(nextUser?.id||null) && state.ready)return;
    state.user=nextUser||null;state.ready=true;state.profile=null;state.visits=new Map();state.myReviews=new Map();
    if(nextUser)await loadMine(); else refreshApp();
  }
  function startup(){
    if(!configured){state.ready=true;return;}
    if(!window.supabase?.createClient){
      const script=document.createElement('script');
      script.src='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.async=true;
      script.onload=()=>startup();
      script.onerror=()=>{state.backendError='Authentication library did not load. Please try again later.';state.ready=true;refreshPanels();};
      document.head.appendChild(script);
      return;
    }
    try{
      state.client=window.supabase.createClient(config.url,config.publishableKey,{auth:{
        persistSession:true,autoRefreshToken:true,detectSessionInUrl:true
      }});
      state.client.auth.onAuthStateChange((_event,session)=>{
        // No async Supabase calls inside the auth callback.
        setTimeout(()=>{setUser(session?.user||null);},0);
      });
      state.client.auth.getUser().then(({data,error})=>{
        if(error && !data?.user)state.backendError='';
        return setUser(data?.user||null);
      }).catch(()=>setUser(null));
    }catch(error){state.backendError='Unable to initialize account service.';state.ready=true;}
  }
  async function updateVisit(id,date,note){
    if(!safeId(id))return;
    if(!hasAccount()){
      state.guest.set(id,{resort_id:id,visited_on:date||null,note:note||null});storeGuest();
      state.note='Mountain saved to this browser. Sign in later to sync across devices.';state.noteType='success';refreshApp();return;
    }
    const old=state.visits.has(id);
    const payload={visited_on:date||null,note:note||null};
    const q=old?state.client.from('piste_visits').update(payload).eq('user_id',state.user.id).eq('resort_id',id)
      :state.client.from('piste_visits').insert({...payload,user_id:state.user.id,resort_id:id});
    const {error}=await q;
    if(error)throw error;
    state.visits.set(id,{...payload,resort_id:id});
    state.note='Mountain saved to your account.';state.noteType='success';refreshApp();
  }
  async function removeVisit(id){
    if(!safeId(id))return;
    if(!hasAccount()){state.guest.delete(id);storeGuest();refreshApp();return;}
    const {error}=await state.client.from('piste_visits').delete().eq('user_id',state.user.id).eq('resort_id',id);
    if(error)throw error;
    state.visits.delete(id);refreshApp();
  }
  async function saveReview(id,rating,title,body){
    if(!safeId(id)||!hasAccount())throw Error('Sign in to post a review.');
    if(!Number.isInteger(rating)||rating<1||rating>5||title.length<3||title.length>100||body.length<20||body.length>2000)
      throw Error('Enter 1–5 stars, a title (3–100 characters) and a review (20–2,000 characters).');
    const existing=state.myReviews.get(id);
    const res=existing?
      await state.client.from('piste_reviews').update({rating,title,body}).eq('id',existing.id).eq('user_id',state.user.id):
      await state.client.from('piste_reviews').insert({user_id:state.user.id,resort_id:id,rating,title,body});
    if(res.error)throw res.error;
    state.publicReviews.delete(id);await loadMine();await loadResort(id);
    setNote('Review published. You can edit it from your account.','success');
  }
  async function deleteReview(id){
    const my=state.myReviews.get(id);
    if(!my||!hasAccount())return;
    const {error}=await state.client.from('piste_reviews').delete().eq('id',my.id).eq('user_id',state.user.id);
    if(error)throw error;
    state.myReviews.delete(id);state.publicReviews.delete(id);
    await loadResort(id);refreshApp();setNote('Review removed.','success');
  }
  async function reportReview(reviewId,reason){
    if(!hasAccount())throw Error('Sign in to report a review.');
    if(!['spam','harassment','misinformation','other'].includes(reason))throw Error('Invalid report reason.');
    const {error}=await state.client.from('piste_review_reports').insert({reporter_id:state.user.id,review_id:reviewId,reason});
    if(error)throw error;
    setNote('Report submitted for moderation. Thank you.','success');
  }
  async function importGuest(){
    if(!hasAccount())throw Error('Sign in first.');
    const imported=[];
    for(const [id,v] of state.guest){
      if(state.visits.has(id))continue;
      const {error}=await state.client.from('piste_visits').insert({
        user_id:state.user.id,resort_id:id,visited_on:v.visited_on||null,note:v.note||null
      });
      if(!error)imported.push(id);
    }
    for(const id of imported)state.guest.delete(id);
    storeGuest();await loadMine();setNote('Imported '+imported.length+' mountain(s) to your account.','success');
  }

  document.addEventListener('submit',async event=>{
    const form=event.target,kind=form?.dataset?.paForm;
    if(!kind)return;
    event.preventDefault();
    if(state.busy)return;
    state.busy=true;state.note='';refreshPanels();
    try{
      const data=new FormData(form);
      if(kind==='signin'){
        if(!state.client)throw Error('Account service is not configured.');
        const email=String(data.get('email')||'').trim();
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Enter a valid email address.');
        const redirectTo=window.location.origin+window.location.pathname;
        const {error}=await state.client.auth.signInWithOtp({email,options:{emailRedirectTo:redirectTo}});
        if(error)throw error;
        setNote('Check your email for a secure sign-in link.','success');
      }else if(kind==='visit'){
        const id=form.dataset.resortId,date=String(data.get('visited_on')||''),note=String(data.get('note')||'').trim();
        if(date&&!/^\d{4}-\d\d-\d\d$/.test(date))throw Error('Invalid visit date.');
        if(note.length>300)throw Error('Visit notes must be under 300 characters.');
        await updateVisit(id,date,note);
      }else if(kind==='review'){
        await saveReview(form.dataset.resortId,Number(data.get('rating')),String(data.get('title')||'').trim(),
          String(data.get('body')||'').trim());
      }else if(kind==='profile'){
        if(!hasAccount())throw Error('Sign in first.');
        const display_name=String(data.get('display_name')||'').trim();
        if(display_name.length<2||display_name.length>32)throw Error('Display name must be 2–32 characters.');
        const {error}=state.profile?
          await state.client.from('piste_profiles').update({display_name}).eq('user_id',state.user.id):
          await state.client.from('piste_profiles').insert({user_id:state.user.id,display_name});
        if(error)throw error;
        state.profile={display_name};setNote('Public display name saved.','success');
      }
    }catch(error){setNote(error?.message||'Unable to complete request.','error');}
    finally{state.busy=false;}
  });

  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-pa-action]');
    if(!button||state.busy)return;
    const action=button.dataset.paAction,id=button.dataset.resortId;
    state.busy=true;
    try{
      if(action==='remove-visit')await removeVisit(id);
      else if(action==='delete-review'){
        if(window.confirm('Delete your review permanently?'))await deleteReview(id);
      }else if(action==='report'){
        const selector=document.querySelector('[data-pa-report-reason="'+button.dataset.reviewId+'"]');
        await reportReview(button.dataset.reviewId,selector?.value||'other');
      }else if(action==='import-guest')await importGuest();
      else if(action==='signout'){
        const {error}=await state.client.auth.signOut();
        if(error)throw error;
        await setUser(null);setNote('Signed out.','success');
      }
    }catch(error){setNote(error?.message||'Unable to complete request.','error');}
    finally{state.busy=false;}
  });

  window.PisteCommunity={panel,accountPanel,navLabel,cardBadge,mount,
    get isConfigured(){return configured;},
    get isSignedIn(){return hasAccount();},
    get visitCount(){return currentVisits().size;},
    _test:{esc,stars,safeId,fmtDate}
  };
  startup();
})();

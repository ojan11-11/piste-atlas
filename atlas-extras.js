/* Piste Atlas discovery tools. External APIs are optional enhancements and degrade gracefully.
   No weather or OSM overlay is a resort-authorized operating status. */
(() => {
  'use strict';
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const resorts=()=>window.RESORTS||[];
  const catalog=()=>new Map(resorts().map(r=>[r.id,r]));
  const validId=id=>/^[A-Za-z0-9._-]{3,160}$/.test(id||'') && catalog().has(id);
  const categories={
    food:'Food on the mountain',lifts:'Lifts',expert_terrain:'Expert terrain',beginner_terrain:'Beginner terrain',
    intermediate_terrain:'Intermediate terrain',terrain_parks:'Terrain parks',rentals:'Equipment rentals',
    housing:'Housing',hotels:'Hotels',town:'Surrounding town',restaurants:'Restaurants',
    grooming:'Grooming',apres_ski:'Après-ski',value:'Value'
  };
  const weatherCache={time:0,rows:[],error:''};
  const rankCache={time:0,rows:[],error:''};
  const photoCache=new Map();
  const mapInstances=new WeakMap();
  let leafletPromise=null;

  function passportHTML(visits){
    const ids=[...new Set((visits||[]).map(v=>v.resort_id))];
    const mountains=ids.map(id=>catalog().get(id)).filter(Boolean);
    const regions=new Set(mountains.map(r=>r.country+' / '+(r.regionCode||r.region)).filter(Boolean));
    const countries=new Set(mountains.map(r=>r.country));
    const verifiedVertical=mountains.filter(r=>Number.isFinite(r.vertical)).reduce((a,r)=>a+r.vertical,0);
    const milestones=[
      [1,'First mountain'],[5,'Mountain explorer'],[10,'Double digits'],[25,'25 mountain club'],
      [50,'Peak collector'],[100,'Century skier']
    ];
    const achieved=milestones.filter(([count])=>ids.length>=count);
    const upcoming=milestones.find(([count])=>ids.length<count);
    return '<section class="pa-passport" aria-label="Your skiing passport">'
      +'<div class="pa-passport-title"><div><span class="mini-eyebrow">YOUR SKI PASSPORT</span><h3>Mountain milestones</h3></div>'
      +'<span class="pa-passport-seal">PISTE ATLAS</span></div>'
      +'<div class="pa-passport-stats"><div><strong>'+ids.length+'</strong><small>Resorts visited</small></div>'
      +'<div><strong>'+regions.size+'</strong><small>States / provinces</small></div>'
      +'<div><strong>'+countries.size+'</strong><small>Countries</small></div></div>'
      +'<p class="pa-muted">'+(verifiedVertical?'Combined listed resort vertical: '+Math.round(verifiedVertical).toLocaleString('en-US')+' ft across '+mountains.filter(r=>Number.isFinite(r.vertical)).length+' mountain(s). This is not a personal vertical-skied total.':'Visit a mountain to start collecting milestones.')+'</p>'
      +'<div class="pa-milestone-grid">'+milestones.map(([count,label])=>
        '<div class="pa-milestone '+(ids.length>=count?'is-earned':'')+'"><span>'+(ids.length>=count?'★':'○')+'</span><strong>'+esc(label)+'</strong><small>'+count+' resorts</small></div>').join('')+'</div>'
      +(upcoming?'<p class="pa-next-milestone">Next milestone: '+upcoming[1]+' · '+(upcoming[0]-ids.length)+' more resort(s) to visit.</p>'
        :'<p class="pa-next-milestone">You have unlocked every current resort-count milestone!</p>')
      +'</section>';
  }

  function rankingsPage(){
    return '<section class="shell pa-feature-page"><span class="mini-eyebrow">SKIER-RATED HIGHLIGHTS</span>'
      +'<h2>Top-rated mountain experiences</h2>'
      +'<p>Rankings use submitted 1–5 star category ratings, never estimated mountain statistics. '
      +'At least three individual ratings are required before a resort appears in a category.</p>'
      +'<label class="pa-ranking-control">Explore category <select data-pa-ranking-category>'
      +Object.entries(categories).map(([id,label])=>'<option value="'+id+'">'+esc(label)+'</option>').join('')
      +'</select></label><div data-pa-rank-results><p>Loading community rankings…</p></div></section>';
  }
  async function loadRankings(){
    if(Date.now()-rankCache.time<15*60*1000)return rankCache;
    const client=window.PisteCommunity?.client;
    if(!client){rankCache.error='Community ratings require the connected Supabase service.';return rankCache;}
    try{
      const {data,error}=await client.from('piste_category_rankings')
        .select('resort_id,category,average_rating,rating_count').gte('rating_count',3)
        .order('average_rating',{ascending:false}).limit(600);
      if(error)throw error;
      rankCache.rows=data||[];rankCache.error='';rankCache.time=Date.now();
    }catch(error){rankCache.error='Category rankings are temporarily unavailable.';}
    return rankCache;
  }
  function showRankings(){
    const el=document.querySelector('[data-pa-rank-results]');
    if(!el)return;
    const category=document.querySelector('[data-pa-ranking-category]')?.value||'food';
    if(rankCache.error){el.innerHTML='<p class="pa-muted">'+esc(rankCache.error)+'</p>';return;}
    const rows=rankCache.rows.filter(r=>r.category===category && catalog().has(r.resort_id))
      .sort((a,b)=>Number(b.average_rating)-Number(a.average_rating)||b.rating_count-a.rating_count).slice(0,30);
    el.innerHTML=rows.length?'<div class="pa-ranking-list">'+rows.map((r,i)=>{
      const mountain=catalog().get(r.resort_id);
      return '<a class="pa-ranking-item" href="#resort/'+esc(r.resort_id)+'"><b>#'+(i+1)+'</b>'
        +'<div><strong>'+esc(mountain.name)+'</strong><small>'+esc(mountain.region)+'</small></div>'
        +'<span>★ '+Number(r.average_rating).toFixed(2)+'</span><small>'+r.rating_count+' ratings</small></a>';
    }).join('')+'</div>':'<p class="pa-muted">Not enough category ratings yet. Ratings will appear as more skiers review mountains.</p>';
  }

  function powderPage(){
    return '<section class="shell pa-feature-page"><span class="mini-eyebrow">WEATHER-BASED DISCOVERY</span>'
      +'<h2>Powder Finder</h2><p>Compare modeled snowfall for up to 24 well-documented ski resorts across the U.S. and Canada. '
      +'These are point forecasts near the resort, not ski-area snow reports or guarantees of open terrain.</p>'
      +'<div class="pa-forecast-controls"><label>Forecast window <select data-pa-powder-days><option value="3">Today + 2 days</option>'
      +'<option value="7">Today + 6 days</option></select></label><button type="button" class="btn outline" data-pa-reload-forecast>Refresh forecast</button></div>'
      +'<div data-pa-powder-results><p>Loading forecast data…</p></div>'
      +'<p class="pa-muted">Forecast: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a> (CC BY 4.0). '
      +'Snowfall is a model estimate, not measured accumulation. Free API use is noncommercial only; '
      +'a commercial API arrangement is required before monetization.</p></section>';
  }
  function forecastCandidates(){
    return resorts().filter(r=>Number.isFinite(r.lat)&&Number.isFinite(r.lng) && r.dataQuality!=='open-data')
      .sort((a,b)=>(b.lifts||0)-(a.lifts||0)).slice(0,24);
  }
  async function loadForecast(force){
    if(!force&&Date.now()-weatherCache.time<30*60*1000)return weatherCache;
    const mountains=forecastCandidates();
    if(!mountains.length){weatherCache.error='No resort coordinates available.';return weatherCache;}
    const url='https://api.open-meteo.com/v1/forecast?latitude='
      +mountains.map(r=>r.lat).join(',')+'&longitude='+mountains.map(r=>r.lng).join(',')
      +'&daily=snowfall_sum,temperature_2m_max&temperature_unit=fahrenheit'
      +'&timezone=auto&forecast_days=7';
    try {
      const response=await fetch(url);
      if(!response.ok)throw Error('Weather provider unavailable');
      const raw=await response.json();
      const forecasts=Array.isArray(raw)?raw:[raw];
      if(forecasts.length!==mountains.length)throw Error('Unexpected weather response');
      weatherCache.rows=mountains.map((r,i)=>{
        const daily=forecasts[i]?.daily||{};
        return {id:r.id,name:r.name,region:r.region,dates:daily.time||[],
          snow:(daily.snowfall_sum||[]).map(v=>Number.isFinite(v)?v/2.54:null),
          highs:daily.temperature_2m_max||[]};
      });
      weatherCache.error='';weatherCache.time=Date.now();
    }catch(error){weatherCache.error='Weather data is currently unavailable. Try again later.';}
    return weatherCache;
  }
  function showPowder(){
    const el=document.querySelector('[data-pa-powder-results]');if(!el)return;
    if(weatherCache.error){el.innerHTML='<p role="status" class="pa-muted">'+esc(weatherCache.error)+'</p>';return;}
    const days=Number(document.querySelector('[data-pa-powder-days]')?.value)||3;
    const ranked=weatherCache.rows.filter(r=>r.snow.length>=days&&r.snow.slice(0,days).every(v=>Number.isFinite(v)))
      .map(r=>({...r,total:r.snow.slice(0,days).reduce((n,v)=>n+v,0)}))
      .sort((a,b)=>b.total-a.total);
    el.innerHTML=ranked.length?'<div class="pa-powder-list">'+ranked.map((r,i)=>
      '<a href="#resort/'+esc(r.id)+'" class="pa-powder-row"><b>'+(i+1)+'</b>'
      +'<div><strong>'+esc(r.name)+'</strong><small>'+esc(r.region)+'</small></div>'
      +'<span class="pa-snow-value">'+r.total.toFixed(1)+' in</span><small>Modeled snow</small></a>').join('')+'</div>'
      +'<p class="pa-muted">Forecast fetched '+new Date(weatherCache.time).toLocaleString()+'; resort-center coordinate forecast, not measured summit snow. '
      +'No snowfall does not mean trails are closed.</p>':'<p class="pa-muted">No forecasts are available.</p>';
  }
  function forecastPanel(r){
    if(!Number.isFinite(r.lat)||!Number.isFinite(r.lng))return '';
    return '<section class="panel-section"><span class="mini-eyebrow">WEATHER OUTLOOK</span><h2>Snowfall forecast</h2>'
      +'<p>Modeled resort-area forecast, not a live mountain report.</p><div data-pa-resort-forecast="'+esc(r.id)+'">'
      +'<button class="btn outline" data-pa-resort-weather="'+esc(r.id)+'" type="button">Get 7-day forecast</button></div>'
      +'<p class="pa-muted"><a href="#powder">Compare mountains in Powder Finder</a></p></section>';
  }
  async function showResortWeather(id,el){
    const r=catalog().get(id);if(!r)return;
    el.textContent='Loading forecast…';
    try{
      const url='https://api.open-meteo.com/v1/forecast?latitude='+r.lat+'&longitude='+r.lng
        +'&daily=snowfall_sum,temperature_2m_max&temperature_unit=fahrenheit&timezone=auto&forecast_days=7';
      const response=await fetch(url);
      if(!response.ok)throw Error('Forecast not available');
      const data=await response.json(),daily=data.daily||{};
      el.innerHTML='<div class="pa-daily-forecast">'+(daily.time||[]).map((day,i)=>
        '<div><strong>'+esc(day.slice(5))+'</strong><span>'+((daily.snowfall_sum?.[i]||0)/2.54).toFixed(1)+' in</span>'
        +'<small>'+(Number.isFinite(daily.temperature_2m_max?.[i])?Math.round(daily.temperature_2m_max[i])+'°F':'Temp unavailable')+'</small></div>').join('')+'</div>'
        +'<small>Open-Meteo model forecast · CC BY 4.0 · Not measured snowfall.</small>';
    }catch{el.textContent='Forecast temporarily unavailable.';}
  }

  function terrainPanel(r){
    if(!Number.isFinite(r.lat)||!Number.isFinite(r.lng))return '';
    return '<section class="panel-section"><span class="mini-eyebrow">GEOGRAPHIC TRAIL VIEWER</span>'
      +'<h2>Interactive mountain terrain map</h2>'
      +'<p>Explore the mapped ski area. Optionally load downhill pistes and lift lines from OpenStreetMap. '
      +'Coverage may be incomplete, and mapped difficulty tags are not safety advice.</p>'
      +'<div class="pa-terrain-shell" data-pa-map-shell="'+esc(r.id)+'">'
      +'<button class="btn dark" type="button" data-pa-open-map="'+esc(r.id)+'">Open interactive map</button></div>'
      +'<p class="pa-muted">Geographic tiles © OpenStreetMap contributors (ODbL). Trail and lift data via Overpass API; '
      +'do not use this viewer for on-mountain navigation. <a href="'+esc(r.mapUrl||'https://www.openstreetmap.org/#map=13/'+r.lat+'/'+r.lng)+'" target="_blank" rel="noopener noreferrer">Official / source map</a></p>'
      +'</section>';
  }
  function loadLeaflet(){
    if(window.L)return Promise.resolve(window.L);
    if(leafletPromise)return leafletPromise;
    leafletPromise=new Promise((resolve,reject)=>{
      if(!document.querySelector('[data-pa-leaflet-css]')){
        const link=document.createElement('link');link.rel='stylesheet';link.href='https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        link.dataset.paLeafletCss='true';document.head.appendChild(link);
      }
      const script=document.createElement('script');script.src='https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload=()=>window.L?resolve(window.L):reject(Error('Map library unavailable'));
      script.onerror=()=>reject(Error('Map library unavailable'));document.head.appendChild(script);
    });
    return leafletPromise;
  }
  async function openTerrain(id){
    const r=catalog().get(id),shell=document.querySelector('[data-pa-map-shell="'+id+'"]');
    if(!r||!shell)return;
    shell.innerHTML='<div class="pa-terrain-map" data-pa-leaflet></div><div class="pa-map-toolbar">'
      +'<button class="btn outline" type="button" data-pa-trails="'+esc(id)+'">Load mapped trails and lifts</button>'
      +'<span data-pa-map-status>Map center is approximate</span></div>';
    try{
      const L=await loadLeaflet();
      const node=shell.querySelector('[data-pa-leaflet]');if(!node)return;
      const map=L.map(node,{scrollWheelZoom:false}).setView([r.lat,r.lng],12);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:17,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      }).addTo(map);
      L.marker([r.lat,r.lng]).addTo(map).bindPopup(esc(r.name)+' · approximate center');
      mapInstances.set(shell,map);
    }catch{shell.innerHTML='<p class="pa-muted">Interactive map could not load. Please use the map link above.</p>';}
  }
  async function loadTrails(id){
    const r=catalog().get(id),shell=document.querySelector('[data-pa-map-shell="'+id+'"]'),map=shell&&mapInstances.get(shell);
    if(!r||!map)return;
    const button=shell.querySelector('[data-pa-trails]'),status=shell.querySelector('[data-pa-map-status]');
    button.disabled=true;status.textContent='Loading OpenStreetMap pistes…';
    const query='[out:json][timeout:20];(way(around:4500,'+r.lat+','+r.lng+')["piste:type"="downhill"];'
      +'way(around:4500,'+r.lat+','+r.lng+')["aerialway"];);out geom;';
    try{
      const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),25000);
      let response;
      try{response=await fetch('https://overpass-api.de/api/interpreter',{method:'POST',body:'data='+encodeURIComponent(query),
        headers:{'Content-Type':'application/x-www-form-urlencoded'},signal:controller.signal});}finally{clearTimeout(timer);}
      if(!response.ok)throw Error('Map data unavailable');
      const payload=await response.json();let count=0;
      for(const feature of (payload.elements||[]).slice(0,900)){
        if(!Array.isArray(feature.geometry)||feature.geometry.length<2)continue;
        const points=feature.geometry.filter(p=>Number.isFinite(p.lat)&&Number.isFinite(p.lon)).map(p=>[p.lat,p.lon]);
        if(points.length<2)continue;
        const lift=!!feature.tags?.aerialway;
        const difficulty=feature.tags?.['piste:difficulty']||'';
        const color=lift?'#ab6d40':difficulty==='novice'||difficulty==='easy'?'#2f956a':
          difficulty==='intermediate'?'#267dbb':difficulty==='advanced'?'#343744':'#8d3865';
        window.L.polyline(points,{color,weight:lift?2.5:3.5,opacity:.82,dashArray:lift?'5 4':undefined})
          .addTo(map).bindPopup(esc(feature.tags?.name|| (lift?'Mapped lift':'Mapped piste'))
            +' · '+esc(difficulty||'difficulty not tagged'));
        count++;
      }
      status.textContent=count+' mapped lines loaded · OSM data may be incomplete';button.remove();
    }catch{status.textContent='Trail overlay unavailable or rate limited. Base map remains usable.';button.disabled=false;}
  }

  function communityClient(){return window.PisteCommunity?.client;}
  function communitySignedIn(){return !!window.PisteCommunity?.isSignedIn;}
  function contributionHTML(id){
    return '<div class="pa-contribution"><h3>Share your mountain photos</h3>'
      +(communitySignedIn()?'<form data-pa-photo-form="'+esc(id)+'"><label>Photo (JPEG, PNG, or WebP; max 5 MB)'
        +'<input type="file" accept="image/jpeg,image/png,image/webp" name="photo" required></label>'
        +'<label>Caption (optional)<input name="caption" maxlength="160" placeholder="Trail, lift, view, or season"></label>'
        +'<label class="pa-rights"><input type="checkbox" name="rights" value="yes" required> I own this photo or have permission to share it, and authorize Piste Atlas to display it if approved.</label>'
        +'<button class="btn dark" type="submit">Submit for review</button></form>'
        :'<p>Sign in to submit a mountain photo. New photos are reviewed before they appear publicly. '
          +'<a href="#account">Sign in</a></p>')
      +'<p class="pa-muted">Only submit photographs you own or have permission to share. '
      +'You grant Piste Atlas permission to publicly display approved photos with your attribution; '
      +'do not upload photos containing people without their permission.</p>'
      +'<div data-pa-community-list="'+esc(id)+'"></div></div>';
  }
  async function loadCommunityPhotos(id,force){
    const node=document.querySelector('[data-pa-community="'+id+'"]');if(!node)return;
    node.innerHTML=contributionHTML(id);
    const result=node.querySelector('[data-pa-community-list]');
    const client=communityClient();
    if(!client){result.innerHTML='<p class="pa-muted">Community photos unavailable without account service.</p>';return;}
    if(!force&&photoCache.has(id)&&Date.now()-photoCache.get(id).time<5*60*1000){
      result.innerHTML=photoCache.get(id).html;return;
    }
    try{
      const {data,error}=await client.from('piste_photos')
        .select('id,user_id,caption,storage_path,status,created_at').eq('resort_id',id)
        .order('created_at',{ascending:false}).limit(24);
      if(error)throw error;
      const entries=(data||[]).filter(p=>p.status==='approved'||(communitySignedIn()&&p.status==='pending'));
      const memberIds=[...new Set(entries.map(p=>p.user_id))];
      let memberNames={};
      if(memberIds.length){
        const names=await client.from('piste_profiles').select('user_id,display_name').in('user_id',memberIds);
        if(!names.error)memberNames=Object.fromEntries((names.data||[]).map(p=>[p.user_id,p.display_name]));
      }
      const urls=await Promise.all(entries.map(async p=>{
        const response=await client.storage.from('piste-community-photos').createSignedUrl(p.storage_path,3600);
        return response.error?null:{...p,url:response.data?.signedUrl};
      }));
      const html=urls.filter(p=>p?.url).length?'<div class="pa-upload-grid">'
        +urls.filter(p=>p?.url).map(p=>'<figure><img loading="lazy" decoding="async" src="'+esc(p.url)+'" alt="'+esc(p.caption||'Community resort photo')+'">'
          +'<figcaption>'+esc(p.caption||'Community contribution')+' · Photo by '+esc(memberNames[p.user_id]||'Piste Atlas member')+(p.status==='pending'?' · Pending approval':'')+'</figcaption></figure>').join('')
        +'</div>':'<p class="pa-muted">No approved community photos yet. Share the first one.</p>';
      result.innerHTML=html;
      photoCache.set(id,{time:Date.now(),html});
    }catch{result.innerHTML='<p class="pa-muted">Photo contributions are temporarily unavailable.</p>';}
  }
  async function submitPhoto(form){
    const id=form.dataset.paPhotoForm,client=communityClient(),user=window.PisteCommunity?.currentUser;
    if(!validId(id)||!client||!user)throw Error('Please sign in before submitting.');
    const data=new FormData(form),file=data.get('photo'),caption=String(data.get('caption')||'').trim();
    if(data.get('rights')!=='yes')throw Error('Please confirm you have permission to share this photo.');
    if(!(file instanceof File)||!file.size)throw Error('Choose a photo.');
    const allowed={'image/jpeg':'jpg','image/png':'png','image/webp':'webp'};
    if(!allowed[file.type])throw Error('Only JPEG, PNG, and WebP photos are accepted.');
    if(file.size>5*1024*1024)throw Error('Photos must be 5 MB or smaller.');
    if(caption.length>160)throw Error('Caption is too long.');
    const path=user.id+'/'+crypto.randomUUID()+'.'+allowed[file.type];
    const uploaded=await client.storage.from('piste-community-photos').upload(path,file,{
      contentType:file.type,cacheControl:'3600',upsert:false
    });
    if(uploaded.error)throw uploaded.error;
    const {error}=await client.from('piste_photos').insert({
      user_id:user.id,resort_id:id,storage_path:path,caption:caption||null
    });
    if(error){await client.storage.from('piste-community-photos').remove([path]);throw error;}
    photoCache.delete(id);await loadCommunityPhotos(id,true);
    const status=document.querySelector('[data-pa-community="'+id+'"]');
    status?.insertAdjacentHTML('afterbegin','<p role="status" class="pa-notice">Photo uploaded for moderation. It will appear publicly only if approved.</p>');
  }

  async function mount(){
    window.PisteAtlasPhotos?.mount();
    if(document.querySelector('[data-pa-rank-results]')){await loadRankings();showRankings();}
    if(document.querySelector('[data-pa-powder-results]')){await loadForecast(false);showPowder();}
    const gallery=document.querySelector('[data-pa-community]');
    if(gallery)loadCommunityPhotos(gallery.dataset.paCommunity,false);
  }
  document.addEventListener('change',e=>{
    if(e.target.matches('[data-pa-ranking-category]'))showRankings();
    if(e.target.matches('[data-pa-powder-days]'))showPowder();
  });
  document.addEventListener('click',async e=>{
    const open=e.target.closest('[data-pa-open-map]');
    if(open){openTerrain(open.dataset.paOpenMap);return;}
    const trails=e.target.closest('[data-pa-trails]');
    if(trails){loadTrails(trails.dataset.paTrails);return;}
    const weather=e.target.closest('[data-pa-resort-weather]');
    if(weather){showResortWeather(weather.dataset.paResortWeather,weather.parentElement);return;}
    const refresh=e.target.closest('[data-pa-reload-forecast]');
    if(refresh){const el=document.querySelector('[data-pa-powder-results]');if(el)el.textContent='Refreshing forecast…';
      await loadForecast(true);showPowder();}
  });
  document.addEventListener('submit',async e=>{
    const form=e.target.closest('[data-pa-photo-form]');if(!form)return;
    e.preventDefault();const button=form.querySelector('button[type="submit"]');
    if(button.disabled)return;button.disabled=true;
    try{await submitPhoto(form);}catch(error){
      form.insertAdjacentHTML('afterbegin','<p role="alert" class="pa-notice">'+esc(error.message||'Upload failed')+'</p>');
    }finally{button.disabled=false;}
  });
  window.PisteAtlasExtras={passportHTML,rankingsPage,powderPage,forecastPanel,terrainPanel,loadLeaflet,mount,
    _test:{forecastCandidates,categories,passportHTML}};
})();
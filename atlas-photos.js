/* Piste Atlas image library: Commons media is only rendered after API licence validation.
   Each file is a named, resort-specific editorial candidate, not a random search hit.
   Thumbnail URLs / author / license are fetched from Wikimedia Commons at display time. */
(() => {
  'use strict';
  const manifest = {
    'whistler-blackcomb': ['Whistler Mountain.jpg','Whistler, BC, mountains.jpg','Whistler and the Coastal Mountains.jpg'],
    'park-city': ['Park City Mountain Resort, Park City, Utah.jpg','Park City Ski Resort (6856251934).jpg'],
    'big-sky': ['Big Sky resort.jpg','Lone Peak seen from Big Sky Resort, 2018.jpg','Lone Peak Tram, January 2018.jpg'],
    'vail': ['Mountains of Vail Colorado.jpg','Vail.jpg','Back Bowl (4268045420).jpg'],
    'lake-louise': ['Skier at Lake Louise Ski Resort.jpg','Lake Louise 2017-03 ski 03.jpg'],
    'jackson-hole': ['Plane Descends past Jackson Hole Mountain Resort.jpg','Peak View 1.jpg'],
    'killington': ['Killington Ski Lift.jpg','Killington Resort 2018-03-18.jpg'],
    'tremblant': ['Mont-Tremblant, Quebec.jpg','Mont-Tremblant-1.jpg']
  };
  const cache = new Map();
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const pageURL = filename => 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(filename.replace(/ /g,'_'));
  function stripHTML(value) {
    const element=document.createElement('div');
    element.textContent='';
    // Commons Artist metadata is HTML. Never inject it into the document.
    const html=String(value||'');
    return html.replace(/<[^>]*>/g,' ').replace(/&(?:nbsp|amp|quot|lt|gt);/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
  }
  function licensed(info){
    const m=info && info.extmetadata || {};
    const name=String(m.LicenseShortName?.value||'');
    const url=String(m.LicenseUrl?.value||'');
    return (/^CC (?:BY(?:-SA)?(?:[ -][0-9.]+)?|0)/i.test(name) || /public domain/i.test(name)) &&
      (!url || /^https:\/\/creativecommons\.org\//i.test(url));
  }
  async function lookup(filename) {
    if(cache.has(filename))return cache.get(filename);
    const task=(async()=>{
      try {
        const api='https://commons.wikimedia.org/w/api.php?action=query&format=json&origin=*'
          +'&prop=imageinfo&iiprop=url%7Cextmetadata&iiurlwidth=1200&titles='
          +encodeURIComponent('File:'+filename);
        const response=await fetch(api,{mode:'cors'});
        if(!response.ok)throw Error('Commons unavailable');
        const data=await response.json();
        const page=Object.values(data.query?.pages||{})[0];
        const info=page?.imageinfo?.[0];
        if(!licensed(info))return null;
        const src=info.thumburl||info.url;
        if(!/^https:\/\/upload\.wikimedia\.org\//.test(src))return null;
        const meta=info.extmetadata||{};
        return {src,source:pageURL(filename),file:filename,
          author:stripHTML(meta.Artist?.value)||'Wikimedia Commons contributor',
          license:String(meta.LicenseShortName?.value||'Creative Commons').slice(0,35),
          licenseUrl:/^https:\/\/creativecommons\.org\//.test(meta.LicenseUrl?.value||'')?meta.LicenseUrl.value:null};
      }catch{return null;}
    })();
    cache.set(filename,task);
    return task;
  }
  function media(r, fallback,kind) {
    if(!manifest[r.id])return fallback;
    return '<div class="pa-media pa-media-'+esc(kind)+'" data-pa-photo="'+esc(r.id)+'">'
      +fallback+'<span class="pa-media-loading" aria-hidden="true"></span></div>';
  }
  function heroPhoto(r){return manifest[r.id]?'<div class="pa-hero-photo" data-pa-photo="'+esc(r.id)+'"></div>':'';}
  function gallery(r) {
    return '<section class="panel-section pa-gallery-section"><span class="mini-eyebrow">MOUNTAIN PHOTOGRAPHY</span>'
      +'<h2>Mountain photo gallery</h2><p>Licensed resort imagery and approved community contributions. '
      +'Creator and license links accompany Commons photographs.</p>'
      +'<div class="pa-gallery-grid" data-pa-gallery="'+esc(r.id)+'"><p class="pa-muted">Loading available photographs…</p></div>'
      +'<div class="pa-community-photos" data-pa-community="'+esc(r.id)+'"></div></section>';
  }
  function credit(photo){
    return '<span class="pa-photo-credit"><a href="'+esc(photo.source)+'" target="_blank" rel="noopener noreferrer">'
      +esc(photo.author)+'</a> · '+(photo.licenseUrl?'<a target="_blank" rel="noopener noreferrer" href="'+esc(photo.licenseUrl)+'">'+esc(photo.license)+'</a>':esc(photo.license))+'</span>';
  }
  function tile(photo,alt,loading){
    return '<figure class="pa-gallery-photo"><a href="'+esc(photo.source)+'" target="_blank" rel="noopener noreferrer" aria-label="See photo and licensing on Wikimedia Commons">'
      +'<img src="'+esc(photo.src)+'" alt="'+esc(alt)+'" loading="'+loading+'" decoding="async" referrerpolicy="no-referrer" /></a>'
      +'<figcaption>'+credit(photo)+'</figcaption></figure>';
  }
  async function paintPhotos(id){
    const names=manifest[id]||[];
    const current=document.querySelectorAll('[data-pa-photo="'+id+'"],[data-pa-gallery="'+id+'"]');
    if(!current.length)return;
    const photos=(await Promise.all(names.map(lookup))).filter(Boolean);
    document.querySelectorAll('[data-pa-photo="'+id+'"]').forEach(el=>{
      if(!photos.length)return;
      const isHero=el.classList.contains('pa-hero-photo');
      const img=document.createElement('img');
      img.src=photos[0].src;
      img.alt='';
      img.loading=isHero?'eager':'lazy';
      img.decoding='async';
      if(isHero)img.fetchPriority='high';
      img.sizes=isHero?'100vw':'(max-width: 640px) 100vw, (max-width: 960px) 50vw, 33vw';
      img.className='pa-resort-image';
      img.addEventListener('load',()=>el.classList.add('pa-has-photo'),{once:true});
      img.addEventListener('error',()=>img.remove(),{once:true});
      el.append(img);
      if(isHero)el.insertAdjacentHTML('beforeend','<div class="pa-hero-credit">'+credit(photos[0])+'</div>');
    });
    const gallery=document.querySelector('[data-pa-gallery="'+id+'"]');
    if(gallery)gallery.innerHTML=photos.length?photos.map((p,i)=>tile(p,'Photo of '+(window.RESORTS||[]).find(r=>r.id===id)?.name,(i?'lazy':'eager'))).join('')
      :'<p class="pa-muted">No licensed editorial images are available yet. The mountain illustration remains in place.</p>';
  }
  function mount(){
    const ids=new Set();
    document.querySelectorAll('[data-pa-photo],[data-pa-gallery]').forEach(el=>ids.add(el.dataset.paPhoto||el.dataset.paGallery));
    ids.forEach(id=>paintPhotos(id));
  }
  window.PisteAtlasPhotos={media,heroPhoto,gallery,mount,manifest,_test:{licensed,stripHTML}};
})();
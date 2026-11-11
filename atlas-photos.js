/* Piste Atlas resort photography v2
 * Only render images attributable to a named resort through a curated Commons
 * category, a Wikidata Commons category, or the Wikidata image for that resort.
 * No unrestricted image search, stock photos, or ambiguous regional substitutes.
 *
 * Photos are validated through Wikimedia Commons imageinfo (per-file license,
 * original source, creator, and dimensions) before being displayed.
 */
(() => {
  'use strict';

  // These Commons categories were checked against ski-area-specific Commons pages.
  // A hand-picked cover photo wins over automated selection when its Commons
  // file exists and has an acceptable license.
  const featured = {
    'whistler-blackcomb': {
      category:'Whistler Blackcomb',
      files:['Skiing above the clouds (16261273396).jpg','Roundhouse above the clouds (2066133192).jpg',
        'Magnificent view from Head Wall (24394991559).jpg','Sweet Whistler Powder Tracks (2312296869).jpg']
    },
    'park-city':{
      category:'Park City Mountain Resort',
      files:['Park City Mountain Resort King Con Express And Quicksilver Gondola.jpg',
        'Park City Mountain Resort Combustion Run.jpg','Park City Mountain Resort King Con Express 3.jpg']
    },
    'big-sky':{
      category:'Big Sky Resort',
      files:['Lone Peak seen from Big Sky Resort, 2018.jpg','Lone Peak, Big Sky, Montana.jpg',
        'Swift Current 6 Lift at Big Sky Resort.jpg','Big Sky resort.jpg']
    },
    'vail':{
      category:'Vail Ski Resort',
      files:['Powder Day Vail Colorado USA.jpg','Morning Corn (6849146266).jpg',
        'Heaven on Earth (4269883991).jpg','Winter\'s Warmth (6978141163).jpg']
    },
    'lake-louise':{
      category:'Lake Louise ski resort',
      files:['Lake Louise 2017-03 ski 03.jpg','Lake Louise 2017-03 ski 02.jpg',
        'Lake Louise 2018-03 ski.jpg','Skier at Lake Louise Ski Resort.jpg']
    },
    'jackson-hole':{
      category:'Jackson Hole Mountain Resort',
      files:['Peak View 1.jpg','Peak View 2.jpg','Rv-summit.jpg',
        'Plane Descends past Jackson Hole Mountain Resort.jpg']
    },
    'killington':{
      category:'Killington Ski Resort',
      files:['Killington Resort 2018-03-18.jpg','Bear Mountain Killington.jpg',
        'View from Killington Peak.jpg','Outer Limits and Devils Fiddle.jpg']
    },
    'tremblant':{
      category:'Mont Tremblant Resort',
      files:['Slopes and Village at Mont Tremblant (3242000931).jpg',
        'Ski Mont Tremblant.jpg','Mont Tremblant Resort Ski - panoramio.jpg']
    },
    'osd-openstreetmap-way-1023308077':{
      category:'Alta Ski Area',
      files:['Panoramic Alta.jpg','Altaskiarea.jpg','Alta Baldy Chutes.JPG']
    },
    'osd-wikidata-q12053500':{
      category:'Breckenridge Ski Resort',
      files:['Peaks 7 and 8.JPG','Breckenridge ski resort.jpg','Peak 8 from Peak 9.JPG']
    },
    'osd-wikidata-q2362338':{
      category:'Copper Mountain (ski resort)',
      files:['Copper Mountain in Summit County, CO.jpg','Copper Mountain Pow Day! (6752392159).jpg',
        'Copper Mountain, Spaulding Bowl and trails.jpg']
    },
    'osd-wikidata-q3021172':{
      category:'Deer Valley',
      files:['Deer-valley-Utah Snow.jpg','Skiing at Deer Valley Utah photo Ramey Logan.jpg',
        'Deervalleyutah 0209.jpg']
    },
    'osd-wikidata-q1547750':{
      category:'Sugarloaf (ski resort)',
      files:['Sugarloaf ski resort Maine.JPG','Sugarloaf Whiffletree.jpg',
        'Sugarloaf Mountain seen from Maine State Route 27.JPG']
    },
    'osd-openstreetmap-way-682231907':{
      category:'Mammoth Mountain Ski Area',
      files:['Mammoth Mountain (December 2009) 01.JPG','Mammoth Mountain (December 2009) 02.JPG',
        'Mammoth Lakes (January 2008) 15.JPG']
    },
    'osd-openstreetmap-way-460246666':{
      category:'Winter Park Resort',
      files:['Winter Park Resort View.jpg','Winter Park Ski Resort - Colorado (13843211033).jpg',
        'Winter Park Trail.jpg']
    }
  };

  const knownCategories={
    'Alta Ski Area':'Alta Ski Area',
    'Breckenridge Ski Resort':'Breckenridge Ski Resort',
    'Stowe Mountain Resort':'Stowe Mountain Resort',
    'Snowbird':'Snowbird, Utah',
    'Snowbird Ski and Summer Resort':'Snowbird, Utah',
    'Deer Valley Resort':'Deer Valley',
    'Copper Mountain':'Copper Mountain (ski resort)',
    'Sugarloaf':'Sugarloaf (ski resort)',
    'Mammoth Mountain':'Mammoth Mountain Ski Area',
    'Winter Park Resort':'Winter Park Resort'
  };
  const byId=new Map((window.RESORTS||[]).map(r=>[r.id,r]));
  const photoCache=new Map();
  const galleryCache=new Map();
  const wikidataCache=new Map();
  const commonsCache=new Map();
  const categoryCache=new Map();
  const activeObservers=new Set();
  let inFlight=0;
  const pending=[];
  const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const strip=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&(?:amp|nbsp|quot|lt|gt|#39);/gi,' ').replace(/\s+/g,' ').trim().slice(0,140);
  const photosOnly=s=>/\.(?:jpe?g|webp)$/i.test(s||'');
  const fileURL=filename=>'https://commons.wikimedia.org/wiki/File:'+encodeURIComponent(filename.replace(/ /g,'_'));
  const categoryURL=name=>'https://commons.wikimedia.org/wiki/Category:'+encodeURIComponent(name.replace(/ /g,'_'));

  function enqueue(task){
    return new Promise((resolve,reject)=>{
      pending.push({task,resolve,reject});
      function pump(){
        while(inFlight<4&&pending.length){
          const job=pending.shift();inFlight++;
          Promise.resolve().then(job.task).then(job.resolve,job.reject).finally(()=>{inFlight--;pump();});
        }
      }
      pump();
    });
  }
  async function api(host,params){
    const qs=new URLSearchParams({action:'query',format:'json',formatversion:'2',origin:'*',...params});
    return enqueue(async()=>{
      const controller=new AbortController();
      const timeout=setTimeout(()=>controller.abort(),13000);
      try{
        const response=await fetch('https://'+host+'/w/api.php?'+qs,{mode:'cors',signal:controller.signal});
        if(!response.ok)throw Error('Image source unavailable: '+response.status);
        const data=await response.json();
        if(data.error)throw Error('Media lookup unavailable');
        return data;
      }finally{clearTimeout(timeout);}
    });
  }
  function license(info){
    const m=info?.extmetadata||{};
    const short=String(m.LicenseShortName?.value||'').trim();
    const url=String(m.LicenseUrl?.value||'').trim();
    const free=/^(?:CC ?0(?: ?[0-9.]+)?|CC BY(?:-SA)?[ -]?[0-9.]*|Public domain|PD[- ])$/i.test(short)
      ||/^public domain/i.test(short);
    if(!free)return null;
    if(url&&!/^https?:\/\/creativecommons\.org\//i.test(url))return null;
    return {name:short,link:url?url.replace(/^http:/,'https:'):null};
  }
  function normalizePhoto(page){
    const info=page?.imageinfo?.[0];
    const filename=String(page?.title||'').replace(/^File:/,'');
    if(!info||!photosOnly(filename)||!info.thumburl && !info.url)return null;
    const rights=license(info);
    if(!rights)return null;
    const url=info.thumburl||info.url;
    if(!/^https:\/\/upload\.wikimedia\.org\//.test(url))return null;
    const width=Number(info.width)||0,height=Number(info.height)||0;
    if(width<920||height<550)return null; // don't stretch tiny photo assets
    const author=strip(info.extmetadata?.Artist?.value)||'Wikimedia Commons contributor';
    return {file:filename,src:url,source:fileURL(filename),author,license:rights.name,
      licenseUrl:rights.link,width,height,kind:'commons',featured:false};
  }
  function winterScore(photo,preferred=false){
    const name=photo.file.toLowerCase();
    if(/\b(?:logo|icon|map|graphic|brochure|signage|advert|poster|bus|transport|hotel|portrait|flag|inside|indoor|contact sheet|certificate|website|screenshot)\b/.test(name))return -500;
    let score=preferred?110:0;
    if(/(?:ski|snow|winter|powder|slop|tram|chair|gondola|piste|trail|lift|bowl|glade|peak|summit|alpine|mountain|panoram|view)/.test(name))score+=28;
    if(/(?:powder|winter|skiing|snowy|snow|mountain|summit|slopes|peak|panoram)/.test(name))score+=20;
    if(/(?:summer|spring|autumn|fall|july|august|september|october|may |june |beach|biking|bike|flower)/.test(name))score-=130;
    if(/\b(?:201[0-9]|202[0-9])-(?:0[5-9]|10)\b/.test(name))score-=95;
    const ratio=photo.width/photo.height;
    if(ratio>=1.2&&ratio<=2.4)score+=22;
    else if(ratio<1.05)score-=23;
    if(photo.width>=2400&&photo.height>=1200)score+=14;
    if(photo.width>=4000)score+=7;
    if(/\b(?:202[1-9]|201[8-9])\b/.test(name))score+=3;
    return score;
  }
  function ranked(photos,limit=8){
    const dedup=new Map();
    for(const photo of photos){
      if(!photo?.file)continue;
      const prior=dedup.get(photo.file);
      if(!prior||winterScore(photo,!!photo.featured)>winterScore(prior,!!prior.featured))dedup.set(photo.file,photo);
    }
    return [...dedup.values()].filter(p=>winterScore(p,p.featured)>-80)
      .sort((a,b)=>winterScore(b,!!b.featured)-winterScore(a,!!a.featured)
        ||a.file.localeCompare(b.file)).slice(0,limit);
  }
  function getPages(data){
    return Array.isArray(data?.query?.pages)?data.query.pages:[];
  }
  async function fetchFiles(files){
    const selected=[...new Set((files||[]).filter(photosOnly))].slice(0,14);
    if(!selected.length)return [];
    const key=selected.join('|');
    if(!commonsCache.has(key)){
      commonsCache.set(key,api('commons.wikimedia.org',{
        titles:selected.map(n=>'File:'+n).join('|'),
        prop:'imageinfo',iiprop:'url|size|extmetadata',iiurlwidth:'1440'
      }).then(data=>getPages(data).map(normalizePhoto).filter(Boolean)).catch(()=>[]));
    }
    return commonsCache.get(key);
  }
  async function getCategoryFiles(name){
    if(!name || /[|<>{}]/.test(name))return [];
    const key=name.trim();
    if(categoryCache.has(key))return categoryCache.get(key);
    const task=api('commons.wikimedia.org',{
      generator:'categorymembers',gcmtitle:'Category:'+key,gcmtype:'file',gcmlimit:'100',
      prop:'imageinfo',iiprop:'url|size|extmetadata',iiurlwidth:'1440'
    }).then(data=>getPages(data).map(normalizePhoto).filter(Boolean)).catch(()=>[]);
    categoryCache.set(key,task);
    return task;
  }
  async function getWikidata(id){
    const r=byId.get(id);
    if(!/^Q\d+$/.test(r?.wikidataID||''))return null;
    if(wikidataCache.has(r.wikidataID))return wikidataCache.get(r.wikidataID);
    const task=api('www.wikidata.org',{
      action:'wbgetentities',ids:r.wikidataID,props:'claims|sitelinks'
    }).then(data=>{
      const entity=data.entities?.[r.wikidataID];
      if(!entity)return null;
      const value=key=>entity.claims?.[key]?.map(c=>c.mainsnak?.datavalue?.value)
        .find(x=>typeof x==='string');
      const category=value('P373');
      const sitelink=entity.sitelinks?.commonswiki?.title||'';
      return {photo:value('P18'),category:category||(sitelink.startsWith('Category:')
        ?sitelink.slice(9):null)};
    }).catch(()=>null);
    wikidataCache.set(r.wikidataID,task);
    return task;
  }
  function categoryFor(r,wd){
    if(featured[r.id]?.category)return featured[r.id].category;
    if(knownCategories[r.name])return knownCategories[r.name];
    if(wd?.category)return wd.category;
    // Exact self-descriptive Commons category only. Generic "Black Mountain"
    // or "Bear Creek" is too ambiguous to infer a ski resort from its name.
    if(/(?:ski resort|ski area|mountain resort|ski hill|ski center|ski centre)$/i.test(r.name)
      &&r.name.trim().split(/\s+/).length>=3)return r.name;
    return null;
  }
  async function discover(id,withGallery=false){
    const r=byId.get(id);if(!r)return [];
    const curated=featured[id]?.files||[];
    const collected=[];
    if(curated.length){
      const selected=await fetchFiles(curated);
      for(const photo of selected){photo.featured=true;collected.push(photo);}
      // Speed on cards; galleries can include broader resort-category photos.
      if(!withGallery&&collected.length)return ranked(collected,1);
    }
    const wd=await getWikidata(id);
    const category=categoryFor(r,wd);
    if(category)collected.push(...await getCategoryFiles(category));
    if(wd?.photo&&photosOnly(wd.photo)){
      const extras=await fetchFiles([wd.photo]);
      for(const photo of extras)collected.push(photo);
    }
    return ranked(collected,withGallery?9:1);
  }
  function getPhotos(id,full=false){
    const cache=full?galleryCache:photoCache;
    if(!cache.has(id))cache.set(id,discover(id,full));
    return cache.get(id);
  }
  // The imageinfo URL is a 1440-pixel Commons thumbnail. Smaller WebP/JPEG
  // derivatives use Wikimedia's documented thumb path rather than scaling a
  // full-width image into a mobile card.
  function srcset(photo){
    const matched=photo.src.match(/^(https:\/\/upload\.wikimedia\.org\/.+\/thumb\/.+\/)\d+px-([^/]+)$/);
    if(!matched)return '';
    const sizes=[480,800,1200,1440].filter(w=>w<=Math.min(photo.width,1440));
    const entries=sizes.map(w=>matched[1]+w+'px-'+matched[2]+' '+w+'w');
    return entries.join(', ');
  }
  function credit(photo){
    return '<span class="pa-photo-credit"><a href="'+esc(photo.source)+'" target="_blank" rel="noopener noreferrer">'
      +esc(photo.author)+'</a> · '+(photo.licenseUrl
        ?'<a href="'+esc(photo.licenseUrl)+'" target="_blank" rel="noopener noreferrer">'+esc(photo.license)+'</a>'
        :esc(photo.license))+' · cropped to fit</span>';
  }
  function media(r,fallback,kind){
    // Create a slot for every mountain so newly curated images appear without
    // changing the resort data source or rebuilding cards.
    return '<div class="pa-media pa-media-'+esc(kind)+'" data-pa-photo="'+esc(r.id)+'">'
      +fallback+'</div>';
  }
  function heroPhoto(r){
    return '<div class="pa-hero-photo" data-pa-photo="'+esc(r.id)+'"></div>';
  }
  function gallery(r){
    return '<section class="panel-section pa-gallery-section"><span class="mini-eyebrow">MOUNTAIN PHOTOGRAPHY</span>'
      +'<h2>Photos of '+esc(r.name)+'</h2><p>Photographs are linked to the resort through a curated Wikimedia Commons category '
      +'or Wikidata. Creator and license links are provided for every editorial image.</p>'
      +'<div class="pa-gallery-grid" data-pa-gallery="'+esc(r.id)+'"><p class="pa-muted">Checking available licensed photos…</p></div>'
      +'<div class="pa-community-photos" data-pa-community="'+esc(r.id)+'"></div></section>';
  }
  function tile(photo,r,index){
    return '<figure class="pa-gallery-photo"><a href="'+esc(photo.source)+'" target="_blank" rel="noopener noreferrer">'
      +'<img loading="'+(index?'lazy':'eager')+'" decoding="async" referrerpolicy="no-referrer" '
      +(srcset(photo)?'srcset="'+esc(srcset(photo))+'" sizes="(max-width:640px) 48vw, 30vw" ':'')
      +'src="'+esc(photo.src)+'" alt="'+esc(r.name+' — '+photo.file.replace(/\.(jpe?g|webp)$/i,''))+'"></a>'
      +'<figcaption>'+credit(photo)+'</figcaption></figure>';
  }
  function paintImage(el,id,photo){
    if(!photo||!el||el.querySelector('.pa-resort-image'))return;
    const hero=el.classList.contains('pa-hero-photo');
    const r=byId.get(id);
    const img=document.createElement('img');
    img.className='pa-resort-image';
    img.alt=hero?'':r?.name+' — '+photo.file.replace(/\.(jpe?g|webp)$/i,'');
    img.src=photo.src;
    const responsive=srcset(photo);
    if(responsive)img.srcset=responsive;
    img.sizes=hero?'100vw':'(max-width:640px) 100vw, (max-width:960px) 50vw, 33vw';
    img.loading=hero?'eager':'lazy';
    img.decoding='async';
    if(hero)img.fetchPriority='high';
    img.addEventListener('load',()=>{
      el.classList.add('pa-has-photo');
      if(!hero){
        const caption=el.closest('.resort-card')?.querySelector('[data-pa-card-credit="'+id+'"]');
        if(caption){caption.innerHTML=credit(photo);caption.hidden=false;}
      }
    },{once:true});
    img.addEventListener('error',()=>{img.remove();el.classList.remove('pa-has-photo');},{once:true});
    el.append(img);
    if(hero)el.insertAdjacentHTML('beforeend','<div class="pa-hero-credit">'+credit(photo)+'</div>');
  }
  async function paintHero(id){
    const photos=await getPhotos(id,false);
    if(!photos.length)return;
    document.querySelectorAll('[data-pa-photo="'+id+'"]').forEach(el=>paintImage(el,id,photos[0]));
  }
  async function paintGallery(id){
    const target=document.querySelector('[data-pa-gallery="'+id+'"]');
    if(!target)return;
    const pics=await getPhotos(id,true);
    if(!target.isConnected)return;
    const r=byId.get(id);
    target.innerHTML=pics.length?pics.map((p,i)=>tile(p,r,i)).join('')
      :'<p class="pa-muted">No accurately matched, reusable photographs are available for this resort yet. '
      +'The mountain illustration remains until a licensed image or approved community contribution is available.</p>';
  }
  function mount(){
    // Disconnect old scroll observers when filters or route redraw the DOM.
    activeObservers.forEach(observer=>observer.disconnect());
    activeObservers.clear();
    const immediate=new Set();
    document.querySelectorAll('[data-pa-gallery],.pa-hero-photo').forEach(el=>{
      immediate.add(el.dataset.paGallery||el.dataset.paPhoto);
    });
    immediate.forEach(id=>{
      paintHero(id);
      if(document.querySelector('[data-pa-gallery="'+id+'"]'))paintGallery(id);
    });
    const cards=document.querySelectorAll('.pa-media-card[data-pa-photo]');
    if('IntersectionObserver' in window){
      const observer=new window.IntersectionObserver(entries=>{
        entries.forEach(entry=>{
          if(!entry.isIntersecting)return;
          observer.unobserve(entry.target);
          paintHero(entry.target.dataset.paPhoto);
        });
      },{rootMargin:'180px'});
      activeObservers.add(observer);
      cards.forEach(el=>observer.observe(el));
    }else cards.forEach(el=>paintHero(el.dataset.paPhoto));
  }
  window.PisteAtlasPhotos={
    media,heroPhoto,gallery,mount,featured,
    _test:{license,normalizePhoto,winterScore,ranked,categoryFor,srcset}
  };
})();
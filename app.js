/* Piste Atlas — zero-dependency, static MVP. Designed for GitHub Pages. */
(() => {
  'use strict';
  const resorts = window.RESORTS || [];
  const app = document.querySelector('#app');
  const nf = new Intl.NumberFormat('en-US');
  const state = {
    query:'', country:'All', quality:'All', pass:'All', terrain:'All', minSnow:0, minAcres:0, minLifts:0,
    sort:'mapped', showFavorites:false, view:'grid', visibleCount:24, selected:new Set(),
    favorites:readFavorites()
  };

  function readFavorites(){ try { return new Set(JSON.parse(localStorage.getItem('piste-atlas-favorites') || '[]')); } catch { return new Set(); } }
  function persistFavorites(){ try { localStorage.setItem('piste-atlas-favorites', JSON.stringify([...state.favorites])); } catch {} }
  const escapeHTML = (s='') => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const textNum = (n,unit='') => Number.isFinite(n) ? `${nf.format(n)}${unit}` : '—';
  const kmNum = n => Number.isFinite(n) ? `${nf.format(Math.round(n*10)/10)} km` : '—';
  const mappedMix = r => {const values=r.mappedRunDifficulties||{};const km=k=>Number(values[k]?.km)||0;const e=km('novice')+km('easy'),m=km('intermediate'),a=km('advanced')+km('expert')+km('extreme')+km('freeride');const sum=e+m+a;return sum>0?{beginner:Math.round(e/sum*100),intermediate:Math.round(m/sum*100),advanced:100-Math.round(e/sum*100)-Math.round(m/sum*100)}:null};
  const terrainStats = r => r.terrain||mappedMix(r);
  const mostLifts = r => r.lifts ?? r.mappedLiftCount ?? -1;
  const mostRuns = r => r.trails ?? r.mappedRunSegments ?? -1;
  const external = (url, label, cls='') => url && /^https:\/\//i.test(url) ? `<a class="${cls}" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${label}${icon('external',14)}</a>` : '<span class="unverified-link">Not yet verified</span>';
  const I={
    mountain:'<path d="M3 19 10.5 5l4.5 8 2.5-4L22 19H3Z"/><path d="m8 10 2.5 2 2-1"/>',
    search:'<circle cx="10.8" cy="10.8" r="6.7"/><path d="m16 16 5 5"/>',
    arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
    external:'<path d="M13 4h7v7m0-7-9 9"/><path d="M20 14v6H4V4h6"/>',
    pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    snow:'<path d="M12 2v20M4 6l16 12M20 6 4 18M9 5l3 3 3-3M9 19l3-3 3 3"/>',
    lift:'<path d="M2 5h20M12 5v10m-6 1h12m-10-4v6m8-6v6M4 21h16"/>',
    scale:'<path d="M12 3v18M3 7h18M5 7l-3 7h6l-3-7Zm14 0-3 7h6l-3-7ZM7 21h10"/>',
    heart:'<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    close:'<path d="M6 6 18 18M18 6 6 18"/>',
    filter:'<path d="M4 6h16M7 12h10M10 18h4"/>',
    bars:'<path d="M4 19v-6m5 6V5m5 14v-9m5 9V3"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    map:'<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Zm6-3v15m6-12v15"/>',
    ticket:'<path d="M3 8V5h18v3a4 4 0 0 0 0 8v3H3v-3a4 4 0 0 0 0-8Zm9-3v14"/>',
    check:'<path d="m4 12 5 5L20 6"/>',
    info:'<circle cx="12" cy="12" r="9"/><path d="M12 10v6m0-9v.4"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4 4l1.5 1.5m13 13L20 20M2 12h2m16 0h2M4 20l1.5-1.5m13-13L20 4"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    trash:'<path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7"/>',
    link:'<path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-2 2M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l2-2"/>'
  };
  function icon(name,size=18){return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name]||I.mountain}</svg>`;}

  function art(type='glacier',compact=false){
    return `<div class="mountain-art art-${type} ${compact?'art-compact':''}" aria-hidden="true">
     <div class="art-glow"></div><div class="art-sun"></div>
     <svg viewBox="0 0 620 260" preserveAspectRatio="xMidYMax slice" class="art-svg">
       <path class="peak-back" d="M0 213 70 149 132 183 228 69 296 144 390 92 480 179 547 105 620 165 620 260 0 260Z"/>
       <path class="peak-mid" d="M0 242 96 190 159 211 266 97 357 202 452 119 529 218 620 170 620 260 0 260Z"/>
       <path class="snow-cap" d="m217 148 49-51 42 68-22-14-18-24-15 19-17-6Z M428 148l24-29 33 44-20-9-11-16-12 14Z"/>
       <path class="peak-front" d="M0 239 92 220 198 249 308 186 410 240 492 212 620 246v50H0Z"/>
       <path class="art-trace" d="M13 251q105-29 214-3t190-12 183 9"/>
     </svg><div class="art-grain"></div></div>`;
  }
  function logo(){return `<a class="brand" href="#discover" aria-label="Piste Atlas home"><span class="brand-symbol">${icon('mountain',22)}</span><span>PISTE<span class="brand-dot">.</span><small>ATLAS</small></span></a>`;}
  function header(active='discover'){
    return `<header class="site-header"><div class="shell header-inner">${logo()}
      <nav class="main-nav" id="mainNav" aria-label="Main navigation">
        <a class="${active==='discover'?'active':''}" href="#discover">Discover</a>
        <a class="${active==='map'?'active':''}" href="#map">Resort map</a>
        <a class="${active==='compare'?'active':''}" href="#compare">Compare <span class="nav-counter">${state.selected.size||''}</span></a>
        <a class="${active==='about'?'active':''}" href="#about">About</a>
      </nav><div class="header-actions"><button class="ghost-btn favorites-quick ${state.showFavorites?'is-on':''}" data-action="favorites" title="Show saved resorts">${icon('heart',17)} <span>Saved</span></button><button class="menu-btn" data-action="menu" aria-label="Toggle navigation" aria-expanded="false">${icon('menu',22)}</button></div>
    </div></header>`;
  }
  function footer(){return `<footer class="site-footer"><div class="shell footer-grid"><div>${logo()}<p>An independent, evolving guide to North America's mountains. Built for better ski trips.</p></div><div><strong>Explore</strong><a href="#discover">All resorts</a><a href="#map">Resort map</a><a href="#compare">Compare mountains</a></div><div><strong>Trust & data</strong><a href="#about">Sources & methodology</a><a href="https://www.openskidata.org/" target="_blank" rel="noopener noreferrer">OpenSkiData</a><span>Prototype · November 2026</span></div></div><div class="shell fine-print">Independent project. Not affiliated with the resorts, Ikon Pass, or Epic Pass. Alpine illustrations are decorative, not trail maps. Open geographic data: OpenSkiData / OpenSkiMap.org · © OpenStreetMap contributors (ODbL), Skimap.org, Who’s On First, © Mapterhorn. © Piste Atlas.</div></footer>`;}
  function terrainBar(r){
    const t=terrainStats(r);
    if(!t)return `<div class="terrain-missing">Trail difficulty not mapped</div>`;
    const context=r.terrain?'Operator-reported terrain mix':'OpenSkiData mapped run length mix (not official trail percentages)';
    return `<div class="terrain-bar" title="${escapeHTML(context)} — easy ${t.beginner}%, intermediate ${t.intermediate}%, advanced ${t.advanced}%"><span style="width:${t.beginner}%" class="tb-beg"></span><span style="width:${t.intermediate}%" class="tb-int"></span><span style="width:${t.advanced}%" class="tb-adv"></span></div>`;
  }
  function badges(r){const passLabel=r.pass==='Unverified'?'Pass unverified':r.pass==='Independent'?'Independent':r.pass+' pass';return `<span class="pass-pill pass-${escapeHTML(r.pass.toLowerCase())}">${r.dataQuality==='open-data'?'Open map data':escapeHTML(passLabel)}</span>${r.dataQuality==='operator-reviewed'?'<span class="verified-pill">Official stats reviewed</span>':''}<span class="location-pill">${escapeHTML(r.regionCode)}, ${r.country==='Canada'?'CA':'US'}</span>`;}
  function resortCard(r){
    const isSelected=state.selected.has(r.id); const saved=state.favorites.has(r.id);
    return `<article class="resort-card" data-id="${r.id}">
      <a href="#resort/${r.id}" class="card-art-link" aria-label="View ${escapeHTML(r.name)}">${art(r.visual,true)}<div class="card-top-badges">${badges(r)}</div></a>
      <button class="heart-btn ${saved?'saved':''}" data-action="save" data-id="${r.id}" aria-label="${saved?'Remove':'Save'} ${escapeHTML(r.name)} ${saved?'from':'to'} favorites">${icon('heart',18)}</button>
      <div class="card-body"><div class="card-location">${icon('pin',13)} ${escapeHTML(r.city||r.region||'Location unverified')} · ${escapeHTML(r.region)}</div><h3><a href="#resort/${r.id}">${escapeHTML(r.name)}</a></h3><p class="card-tagline">${escapeHTML(r.tagline)}</p>
      <div class="metric-row"><div><strong>${r.acres!==null?textNum(r.acres):r.mappedDownhillKm?kmNum(r.mappedDownhillKm):textNum(r.mappedRunSegments)}</strong><span>${r.acres!==null?'Skiable acres':r.mappedDownhillKm?'Mapped run length':'Mapped segments'}</span></div><div><strong>${textNum(r.vertical??r.mappedVertical)}<small> ft</small></strong><span>${r.vertical!==null?'Vertical drop':'Mapped elev. span'}</span></div><div><strong>${textNum(r.lifts??r.mappedLiftCount)}</strong><span>${r.lifts!==null?'Official lifts':'Mapped lifts'}</span></div></div>
      <div class="card-terrain"><span>${r.terrain?"Official terrain mix":"Mapped trail difficulty (distance)"}</span>${terrainBar(r)}</div>
      <div class="card-bottom"><a href="#resort/${r.id}" class="text-link">Explore mountain ${icon('arrow',16)}</a><button data-action="toggle-compare" data-id="${r.id}" class="compare-small ${isSelected?'on':''}" aria-pressed="${isSelected}">${isSelected?icon('check',15):icon('scale',15)} ${isSelected?'Added':'Compare'}</button></div>
      </div></article>`;
  }
  function filtered(){
    const q=state.query.trim().toLowerCase();
    let items=resorts.filter(r=>(!q || [r.name,r.city,r.region,r.regionCode,r.area,r.country,r.pass].some(x=>String(x).toLowerCase().includes(q))) &&
      (state.country==='All'||r.country===state.country) && (state.quality==='All'||(state.quality==='Reviewed'?r.dataQuality!=='open-data':r.dataQuality==='open-data')) && (state.pass==='All'||r.pass===state.pass) &&
      (!state.showFavorites||state.favorites.has(r.id)) && (r.acres===null?state.minAcres===0:r.acres>=state.minAcres) && mostLifts(r)>=state.minLifts &&
      (!state.minSnow || r.snowfall!==null && r.snowfall>=state.minSnow) &&
      (state.terrain==='All' || (r.terrain && (
        (state.terrain==='Beginner' && r.terrain.beginner>=20) ||
        (state.terrain==='Intermediate' && r.terrain.intermediate>=40) ||
        (state.terrain==='Advanced' && r.terrain.advanced>=45)
      ))));
    const by=(a,b)=>state.sort==='name'?a.name.localeCompare(b.name):state.sort==='lifts'?mostLifts(b)-mostLifts(a):state.sort==='trails'?mostRuns(b)-mostRuns(a):state.sort==='mappedLength'?(b.mappedDownhillKm??-1)-(a.mappedDownhillKm??-1):state.sort==='vertical'?(b.vertical??b.mappedVertical??-1)-(a.vertical??a.mappedVertical??-1):state.sort==='acres'?(b.acres??-1)-(a.acres??-1):(b.mappedRunSegments??b.trails??-1)-(a.mappedRunSegments??a.trails??-1);
    items.sort((a,b)=>by(a,b)||a.name.localeCompare(b.name));
    return items;
  }
  function selectOption(value,current){return value===current?'selected':'';}
  function filterPanel(){return `<aside class="filters"><div class="filter-heading"><strong>${icon('filter',18)} Refine your search</strong><button class="reset-btn" data-action="reset">Reset</button></div>
    <div class="filter-block"><label for="filter-country">Country</label><select id="filter-country" data-filter="country"><option ${selectOption('All',state.country)}>All</option><option ${selectOption('United States',state.country)}>United States</option><option ${selectOption('Canada',state.country)}>Canada</option></select></div>
    <div class="filter-block"><label for="filter-quality">Data verification</label><select id="filter-quality" data-filter="quality"><option value="All" ${selectOption('All',state.quality)}>All listings</option><option value="Reviewed" ${selectOption('Reviewed',state.quality)}>Operator-reviewed</option><option value="Unreviewed" ${selectOption('Unreviewed',state.quality)}>Mapped only</option></select><small class="filter-help">Reviewed means operator-sourced statistics; some fields can still be missing or seasonal.</small></div>
    <div class="filter-block"><label for="filter-pass">Pass access</label><select id="filter-pass" data-filter="pass"><option ${selectOption('All',state.pass)}>All</option><option ${selectOption('Epic',state.pass)}>Epic</option><option ${selectOption('Ikon',state.pass)}>Ikon</option></select></div>
    <div class="filter-block"><label for="filter-terrain">Terrain preference</label><select id="filter-terrain" data-filter="terrain"><option ${selectOption('All',state.terrain)}>All</option><option ${selectOption('Beginner',state.terrain)}>Beginner</option><option ${selectOption('Intermediate',state.terrain)}>Intermediate</option><option ${selectOption('Advanced',state.terrain)}>Advanced</option></select><small class="filter-help">Terrain mix uses operator percentages or mapped run distances where available; these are different measurements.</small></div>
    <div class="filter-block"><label for="min-acres">Minimum skiable area <b id="acresValue">${nf.format(state.minAcres)} acres</b></label><input id="min-acres" data-filter="minAcres" type="range" min="0" max="6000" step="500" value="${state.minAcres}"/><div class="range-ends"><span>Any size</span><span>6,000+ ac</span></div></div>
    <div class="filter-block"><label for="filter-mapped-lifts">Minimum available lifts</label><select id="filter-mapped-lifts" data-filter="minLifts"><option value="0" ${selectOption(0,state.minLifts)}>Any</option><option value="2" ${selectOption(2,state.minLifts)}>2+</option><option value="5" ${selectOption(5,state.minLifts)}>5+</option><option value="10" ${selectOption(10,state.minLifts)}>10+</option><option value="20" ${selectOption(20,state.minLifts)}>20+</option></select><small class="filter-help">Official counts where available, otherwise mapped lift data.</small></div>
    <div class="filter-footnote">${icon('info',16)} <span>Official resort figures and mapped OpenSkiData measurements are labeled separately. Mapped runs are segments, not named trails.</span></div></aside>`;}
  function hero(){return `<section class="hero"><div class="hero-ambient"></div><div class="shell hero-grid"><div class="hero-content">
    <div class="eyebrow"><span class="eyebrow-line"></span> THE NORTH AMERICAN MOUNTAIN GUIDE</div>
    <h1>Every mountain.<br><em>Your next adventure.</em></h1>
    <p>Explore the stats. Study the terrain. Compare the mountains. Find the place you'll talk about long after the snow melts.</p>
    <form class="hero-search" id="heroSearch"><span>${icon('search',20)}</span><input id="hero-search" name="query" type="search" placeholder="Search a mountain, town, or state..." value="${escapeHTML(state.query)}" aria-label="Search ski resorts"/><button type="submit">Discover ${icon('arrow',18)}</button></form>
    <div class="hero-trust">${icon('check',15)} Official stats where verified <span>•</span> U.S. & Canada <span>•</span> Free to explore</div>
    </div><div class="hero-visual">${art('hero')}<div class="hero-floating"><span class="float-icon">${icon('mountain',22)}</span><div><small>THE PEAKS ARE CALLING</small><strong>Find your kind of mountain.</strong></div></div></div></div></section>`;}
  function filtersBanner(list){return `<div class="results-head"><div><span class="mini-eyebrow">MOUNTAIN DIRECTORY</span><h2>${state.showFavorites?'Saved mountains':'Discover the mountains'}</h2><p>${list.length} of ${resorts.length} listings ${state.query?'matching your search':''} · ${resorts.filter(r=>r.dataQuality!=='open-data').length} source-checked · ${resorts.filter(r=>r.dataQuality==='open-data').length} mapped</p></div><div class="results-tools"><label class="sr-only" for="sort-resorts">Sort resorts</label><select id="sort-resorts" data-filter="sort"><option value="mapped" ${selectOption('mapped',state.sort)}>Most mapped segments</option><option value="lifts" ${selectOption('lifts',state.sort)}>Most lifts</option><option value="trails" ${selectOption('trails',state.sort)}>Most runs</option><option value="mappedLength" ${selectOption('mappedLength',state.sort)}>Longest mapped trail network</option><option value="vertical" ${selectOption('vertical',state.sort)}>Greatest elevation range</option><option value="acres" ${selectOption('acres',state.sort)}>Largest reported area</option><option value="name" ${selectOption('name',state.sort)}>A to Z</option></select><div class="view-switch" aria-label="View mode"><button data-action="set-view" data-view="grid" aria-pressed="${state.view==='grid'}" class="${state.view==='grid'?'active':''}" title="Grid view">${icon('grid',17)}</button><button data-action="set-view" data-view="map" aria-pressed="${state.view==='map'}" class="${state.view==='map'?'active':''}" title="Map view">${icon('map',17)}</button></div></div></div>`;}
  function emptyState(){return `<div class="empty-state">${icon('mountain',42)}<h3>No mountains match those filters.</h3><p>Try broadening your search or removing a lift, acreage or terrain filter.</p><button class="btn dark" data-action="reset">Reset filters</button></div>`;}
  // Schematic overview for the static prototype. Points use geographic lat/long; base silhouette is illustrative.
  function mapView(list){
    const x=lng=>Math.round((lng+135)/76*1000);
    const y=lat=>Math.round((61-lat)/36*580);
    return `<div class="map-wrap"><div class="map-header"><div><strong>${icon('pin',17)} North American overview</strong><span>Currently showing source-checked resort markers; a complete geographic map is planned</span></div><span class="prototype-label">Schematic map · Not for navigation</span></div>
    <div class="map-stage"><svg viewBox="0 0 1000 600" role="img" aria-label="Schematic North America map showing geographic resort locations" preserveAspectRatio="xMidYMid meet">
     <defs><pattern id="mapgrid" width="65" height="65" patternUnits="userSpaceOnUse"><path d="M65 0H0V65" fill="none" stroke="#c4d9d8" stroke-width=".8" opacity=".4"/></pattern><linearGradient id="land" x1="0" x2="1"><stop stop-color="#d9e7da"/><stop offset="1" stop-color="#e8eee9"/></linearGradient></defs>
     <rect width="1000" height="600" fill="#d5e8e9"/><rect width="1000" height="600" fill="url(#mapgrid)"/>
     <path d="M55 4 550 4 615 30 670 33 719 90 822 92 865 161 934 195 905 245 833 252 790 304 825 350 801 385 824 439 770 473 734 417 700 389 666 399 621 429 608 478 551 483 500 469 459 475 421 452 365 452 322 414 254 414 225 389 170 400 135 357 119 306 85 285 60 201 65 145Z" fill="url(#land)" stroke="#94b3aa" stroke-width="2"/>
     <path d="M134 357 218 365 251 398 325 413 366 451 426 452 459 472 499 467 556 481 608 477 624 426 670 398 705 388 732 421 770 474" fill="none" stroke="#c0ccc4" stroke-width="3" stroke-dasharray="5 7"/>
     <path d="M701 336q52-27 80-3t10 41q-37 15-56 5t-34-43Z" fill="#d5e8e9" opacity=".8"/>
     <text x="480" y="216" class="map-country">CANADA</text><text x="476" y="410" class="map-country">UNITED STATES</text><text x="58" y="495" class="map-water">PACIFIC OCEAN</text><text x="836" y="524" class="map-water">ATLANTIC OCEAN</text>
     ${list.map(r=>`<g class="map-marker" data-map-resort="${r.id}" tabindex="0" role="link" aria-label="Open ${escapeHTML(r.name)} profile" transform="translate(${x(r.lng)},${y(r.lat)})"><circle r="19" class="pin-halo"/><circle r="10" class="pin-core"/><circle r="3.5" class="pin-center"/><title>${escapeHTML(r.name)} — ${escapeHTML(r.region)}</title></g>`).join('')}
    </svg></div><div class="map-list">${list.map(r=>`<a href="#resort/${r.id}" class="map-list-item"><span class="map-dot"></span><strong>${escapeHTML(r.name)}</strong><small>${escapeHTML(r.regionCode)} · ${nf.format(r.acres)} ac</small>${icon('arrow',15)}</a>`).join('')}</div></div>`;
  }
  function compareTray(){
    if(state.selected.size===0) return '';
    const names=[...state.selected].map(id=>resorts.find(r=>r.id===id)?.name).filter(Boolean);
    return `<div class="compare-tray" role="status"><div class="tray-label">${icon('scale',19)}<div><strong>${state.selected.size} mountain${state.selected.size===1?'':'s'} selected</strong><small>${escapeHTML(names.join(' · '))}</small></div></div><div class="tray-actions"><button class="tray-clear" data-action="clear-compare">Clear</button><a class="btn light" href="#compare">Compare now ${icon('arrow',16)}</a></div></div>`;
  }
  function discoverPage(showHero=true){
    const list=filtered();
    return `${header(state.view==='map'?'map':'discover')}<main id="main">${showHero?hero():`<div class="small-page-banner"><div class="shell"><span class="mini-eyebrow">PISTE ATLAS</span><h1>${state.view==='map'?'Explore the map':'Explore resorts'}</h1></div></div>`}
      <section class="shell discover-layout"><div class="mobile-search"><label for="mobile-filter-search">Search resorts</label><input id="mobile-filter-search" data-filter="query" type="search" placeholder="Search resort or region" value="${escapeHTML(state.query)}" /></div>
      ${filterPanel()}<div class="discovery-content">${filtersBanner(list)}${list.length===0?emptyState():state.view==='grid'?`<div class="resort-grid">${list.slice(0,state.visibleCount).map(resortCard).join('')}</div>${list.length>state.visibleCount?`<div class="load-more-wrap"><button class="btn dark" data-action="load-more">Show more mountains (${Math.min(24,list.length-state.visibleCount)} next)</button><p>Showing ${Math.min(state.visibleCount,list.length)} of ${list.length} matching entries</p></div>`:''}`:mapView(list.filter(r=>r.dataQuality!=='open-data'))}<div class="source-prompt">${icon('info',17)} <span>Resort-reported stats are shown where available. Other numbers are OpenSkiData map-derived measurements—not verified operating status or official named-trail counts.</span></div></div></section>
      <section class="shell editorial"><div class="editorial-copy"><span class="mini-eyebrow">A BETTER WAY TO PICK YOUR NEXT TRIP</span><h2>More mountain.<br><em>Less guesswork.</em></h2><p>It shouldn't take a dozen browser tabs to figure out which resort fits your trip. Piste Atlas brings the essentials into one experience.</p><a href="#compare" class="btn dark">Try resort comparison ${icon('arrow',17)}</a></div><div class="editorial-art">${art('coast')}<div class="art-badge">The right mountain is out there. <span>Find it here.</span></div></div></section>
    </main>${footer()}${compareTray()}`;
  }
  function profileStat(label,val,unit='',ico='mountain'){return `<div class="profile-stat">${icon(ico,20)}<span>${label}</span><strong>${textNum(val, val===null?'':unit)}</strong></div>`;}
  function profilePage(r){
    if(!r) return notFoundPage();
    const terrain=r.terrain?`<div class="terrain-detail">${terrainBar(r)}<div class="terrain-legend"><div><span class="legend-point green"></span><strong>${r.terrain.beginner}%</strong><small>Beginner</small></div><div><span class="legend-point blue"></span><strong>${r.terrain.intermediate}%</strong><small>Intermediate</small></div><div><span class="legend-point black"></span><strong>${r.terrain.advanced}%</strong><small>Advanced / expert</small></div></div><p class="subtle-note">${escapeHTML(r.terrainNote)}</p></div>`:`<div class="terrain-unverified">${icon('info',22)} Exact terrain percentages have not yet been verified for this mountain.</div>`;
    return `${header('discover')}<main id="main"><div class="profile-hero art-bg-${r.visual}">${art(r.visual)}<div class="shell profile-hero-content"><a href="#discover" class="crumb">← All resorts</a><div class="profile-kicker">${escapeHTML(r.area)} · ${escapeHTML(r.country)}</div><h1>${escapeHTML(r.name)}</h1><p>${escapeHTML(r.tagline)}</p><div class="profile-hero-meta">${badges(r)}</div></div></div>
    <div class="shell profile-body"><div class="profile-layout"><div class="profile-main"><section class="profile-intro"><span class="mini-eyebrow">THE MOUNTAIN, BY THE NUMBERS</span><h2>A closer look at ${escapeHTML(r.name)}</h2><p>${r.dataQuality==='open-data'?'OpenSkiData maps this ski area, but current operation, official acreage, snowfall, pass affiliations and ticket information still need operator verification.':'Review official figures, see the terrain mix, and plan time on snow. This is independently curated information—not live conditions.'}</p></section>
    <section class="stat-grid">${profileStat('Skiable acres',r.acres,'','mountain')}${profileStat('Vertical drop',r.vertical,' ft','bars')}${profileStat('Annual snowfall',r.snowfall,'″','snow')}${profileStat('Lifts',r.lifts,'','lift')}${profileStat('Trails',r.trails,r.trailsQualifier,'map')}${profileStat('Summit elevation',r.summit,' ft','mountain')}</section>
    <section class="panel-section"><div class="section-line"><div><span class="mini-eyebrow">FIND YOUR LINE</span><h2>Terrain breakdown</h2></div></div>${terrain}</section>
    <section class="panel-section"><div class="section-line"><div><span class="mini-eyebrow">EXPLORE THE MOUNTAIN</span><h2>Official trail maps</h2></div></div><div class="trail-map-card"><div class="map-illustration"><div class="contours"></div>${icon('map',48)}<span>TRAIL MAP</span></div><div><strong>The mountain, in detail</strong><p>Open ${escapeHTML(r.name)}'s official interactive or printable trail map in a new tab. Resort artwork is not reproduced here without permission.</p>${r.mapUrl?external(r.mapUrl,'View official trail map','btn dark'):'<p class="subtle-note">Official trail map not yet verified for this listing.</p>'}</div></div></section>
    ${r.highlights?.length?`<section class="panel-section"><span class="mini-eyebrow">EXPLORE THE EXPERIENCE</span><h2>Mountain highlights</h2><div class="highlight-list">${r.highlights.map((h,i)=>`<div><span>0${i+1}</span><strong>${escapeHTML(h)}</strong></div>`).join('')}</div></section>`:''}
    <section class="panel-section provenance"><span class="mini-eyebrow">TRANSPARENCY MATTERS</span><h2>Data source & notes</h2><p>${escapeHTML(r.notes)}</p><p>${r.dataQuality==='open-data'?'This location is derived from OpenSkiData / OpenStreetMap / Skimap.org (ODbL). Mapped lifts and run segments are not official resort counts. The site has not independently confirmed current operating status.':'Mountain statistics are source-checked against operator information. Resorts may define acres, vertical, lifts, and trail difficulty differently.'}</p>${r.dataQuality==='open-data'?`<p>Mapped lifts: ${textNum(r.mappedLiftCount)} · Mapped run segments: ${textNum(r.mappedRunSegments)} · Mapped elevation span: ${textNum(r.mappedVertical,' ft')}. These are map-derived measurements.</p>`:''}${external(r.sourceUrl,r.dataQuality==='open-data'?'View OpenSkiData source':'View official mountain statistics','text-link')}${r.sourcePages?.length?`<div class="verified-sources"><strong>Official references checked</strong><div>${r.sourcePages.map((url,i)=>external(url,'Official source '+(i+1),'text-link')).join('')}</div></div>`:''}<small>${r.verifiedAt?'Official sources reviewed '+escapeHTML(r.verifiedAt)+'. Metrics may reflect announced seasonal terrain rather than what is currently open.':'Original operator-sourced profiles reviewed November 3, 2026. OpenSkiData snapshots are separate; dates do not guarantee current operation.'}</small></section></div>
    <aside class="profile-sidebar"><div class="booking-card"><div class="booking-icon">${icon('ticket',23)}</div><span class="mini-eyebrow">LIFT ACCESS</span><h3>Plan a day on the mountain</h3><p>Ticket prices change by date, purchase timing, and age. For an accurate quote, choose your visit date on the official resort website.</p><div class="price-unavailable"><span>${r.ticketPriceExample?escapeHTML(r.ticketPriceExample.label):'Day ticket pricing'}</span><strong>${r.ticketPriceExample?escapeHTML(r.ticketPriceExample.currency)+' $'+textNum(r.ticketPriceExample.amount):'Check rates by date'}</strong></div>${r.ticketPriceExample?`<p class="price-conditions">${escapeHTML(r.ticketPriceExample.season)} · ${escapeHTML(r.ticketPriceExample.conditions)}. Example, not a live quote.</p>`:''}${r.ticketUrl?external(r.ticketUrl,'Check official ticket prices','btn mint full'):'<p class="subtle-note">Official ticket booking link not yet verified.</p>'}<small>Tickets are purchased on the resort website. Rates and availability may change.</small></div>
    <div class="sidebar-facts"><h4>At a glance</h4><div><span>Town</span><b>${escapeHTML(r.city||r.region||'Location unverified')}</b></div><div><span>Region</span><b>${escapeHTML(r.region)}</b></div><div><span>Pass</span><b>${escapeHTML(r.pass)}</b></div><div><span>Base elevation</span><b>${textNum(r.base,r.base===null?'':' ft')}</b></div>${external(r.website,r.dataQuality==='open-data'?'Website listed in map data (verify)':'Official resort website','text-link')}</div>
    <button class="btn outline full ${state.selected.has(r.id)?'is-selected':''}" data-action="toggle-compare" data-id="${r.id}">${icon('scale',17)} ${state.selected.has(r.id)?'Remove from comparison':'Add to comparison'}</button>
    <button class="btn outline full ${state.favorites.has(r.id)?'is-selected':''}" data-action="save" data-id="${r.id}">${icon('heart',17)} ${state.favorites.has(r.id)?'Saved mountain':'Save this mountain'}</button></aside></div></div></main>${footer()}${compareTray()}`;
  }
  function comparisonPage(){
    const selected=[...state.selected].map(id=>resorts.find(r=>r.id===id)).filter(Boolean);
    const columns=selected.map(r=>`<th><div class="compare-heading"><span>${escapeHTML(r.regionCode)}</span><strong><a href="#resort/${r.id}">${escapeHTML(r.name)}</a></strong><button data-action="toggle-compare" data-id="${r.id}" aria-label="Remove ${escapeHTML(r.name)}">${icon('close',15)}</button></div></th>`).join('');
    const rows=[
      ['Skiable area',r=>textNum(r.acres,' acres')],['Vertical drop',r=>textNum(r.vertical,' ft')],['Average annual snowfall',r=>textNum(r.snowfall, r.snowfall===null?'':' in')],
      ['Lifts',r=>textNum(r.lifts)],['Named trails',r=>textNum(r.trails,r.trailsQualifier)],['Summit elevation',r=>textNum(r.summit,' ft')],
      ['Mapped lifts (OpenSkiData)',r=>r.dataQuality==='open-data'?textNum(r.mappedLiftCount):'Not applicable'],
      ['Mapped downhill segments (OpenSkiData)',r=>r.dataQuality==='open-data'?textNum(r.mappedRunSegments):'Not applicable'],
      ['Mapped elevation span (OpenSkiData)',r=>r.dataQuality==='open-data'?textNum(r.mappedVertical,' ft'):'Not applicable'],
      ['Beginner terrain',r=>r.terrain?r.terrain.beginner+'%':'Not verified'],['Intermediate terrain',r=>r.terrain?r.terrain.intermediate+'%':'Not verified'],['Advanced / expert',r=>r.terrain?r.terrain.advanced+'%':'Not verified'],
      ['Pass access',r=>r.pass],['Adult lift-ticket price',r=>'Check live rates']
    ];
    return `${header('compare')}<main id="main"><div class="small-page-banner"><div class="shell"><span class="mini-eyebrow">SIDE BY SIDE</span><h1>Compare mountains.</h1><p>Know the numbers before you book the trip.</p></div></div>
    <section class="shell compare-page"><div class="compare-intro"><div><h2>Mountain comparison</h2><p>Select up to four mountains. Missing figures stay clearly labeled rather than guessed.</p></div><button class="btn outline" data-action="clear-compare">${icon('trash',16)} Clear comparison</button></div>
    ${selected.length===0?`<div class="compare-empty">${icon('scale',46)}<h3>Start with your first mountain.</h3><p>Explore the directory and tap Compare on up to four resort cards.</p><a class="btn dark" href="#discover">Browse mountains ${icon('arrow',16)}</a></div>`:
      `<div class="comparison-table-scroller"><table class="comparison-table"><thead><tr><th>Mountain stat</th>${columns}</tr></thead><tbody>${rows.map(([label,fn])=>`<tr><th>${escapeHTML(label)}</th>${selected.map(r=>`<td>${escapeHTML(fn(r))}</td>`).join('')}</tr>`).join('')}<tr><th>Official trail map</th>${selected.map(r=>`<td>${external(r.mapUrl,'View map','table-link')}</td>`).join('')}</tr><tr><th>Lift tickets</th>${selected.map(r=>`<td>${external(r.ticketUrl,'Check price','table-link')}</td>`).join('')}</tr></tbody></table></div><p class="subtle-note compare-note">Figures may not be directly comparable when resorts use different conventions or measurement methods. Lift-ticket pricing is intentionally not invented.</p>`}
    <h2 class="compare-other-title">Add more mountains</h2><div class="suggestion-grid">${resorts.filter(r=>!state.selected.has(r.id)).slice(0,4).map(r=>`<button class="suggestion" data-action="toggle-compare" data-id="${r.id}" ${state.selected.size>=4?'disabled':''}><span class="suggestion-icon">${icon('mountain',21)}</span><span><strong>${escapeHTML(r.name)}</strong><small>${escapeHTML(r.region)} · ${nf.format(r.acres)} acres</small></span><b>+</b></button>`).join('')}</div></section></main>${footer()}`;
  }
  function aboutPage(){return `${header('about')}<main id="main"><div class="small-page-banner"><div class="shell"><span class="mini-eyebrow">OUR MISSION</span><h1>Every mountain deserves a place on the map.</h1><p>An independent directory built around clarity, accuracy, and discovery.</p></div></div><section class="shell about-content"><div class="about-lead"><span class="mini-eyebrow">THE IDEA</span><h2>A ski atlas, not another booking funnel.</h2><p>Our goal is to catalog public, operating, lift-served downhill ski areas in the United States and Canada. Destination mountains, community hills, and independent ski areas all belong here. Nordic-only ski centers and closed/historical mountains may become separate categories later.</p></div><div class="about-cards"><div><span>01</span><h3>Start with open data</h3><p>Use OpenSkiData's OSM-derived geography and basic resort data as a discovery layer, honoring applicable ODbL licensing and attribution requirements.</p>${external('https://www.openskidata.org/','OpenSkiData','text-link')}</div><div><span>02</span><h3>Verify resort claims</h3><p>Check statistics against official mountain pages. Preserve units, reporting conventions, source URLs, and verification dates. Never turn an unknown metric into zero.</p></div><div><span>03</span><h3>Respect map rights</h3><p>Link to official resort trail maps now. Host or embed resort map artwork only with appropriate permission; build future interactive geographical layers from properly licensed sources.</p></div><div><span>04</span><h3>Keep pricing honest</h3><p>Record ticket prices by date, visitor category, currency and purchase conditions. Until a reliable pipeline exists, use current links to official booking pages.</p></div></div><div class="methodology"><h2>What this prototype includes</h2><p>The site currently contains <strong>${resorts.length} listings</strong>: <strong>${resorts.filter(r=>r.dataQuality!=='open-data').length} operator-reviewed resort profiles</strong> and <strong>${resorts.filter(r=>r.dataQuality==='open-data').length} unreviewed OpenSkiData listings</strong>. Map-derived locations and calculated lift/run metrics must not be confused with officially verified mountain facts. This remains a directory in progress, not a real-time operating-status or ticket-price service.</p><p>We plan a production database with source-level provenance, scheduled verification, pricing history, dynamic maps, individual lifts and trail records, and an editorial admin interface.</p><a href="#discover" class="btn dark">Explore the prototype ${icon('arrow',16)}</a></div></section></main>${footer()}`;}
  function notFoundPage(){return `${header()}<main id="main"><section class="shell not-found"><h1>Lost your line?</h1><p>That mountain page doesn't exist in this preview.</p><a class="btn dark" href="#discover">Back to the directory ${icon('arrow',16)}</a></section></main>${footer()}`;}
  function route(){
    const hash=decodeURIComponent(window.location.hash.replace(/^#\/?/,''));
    if(hash.startsWith('resort/')) return ['profile',hash.split('/')[1]];
    if(hash==='compare') return ['compare'];
    if(hash==='map') return ['map'];
    if(hash==='about') return ['about'];
    return ['discover'];
  }
  function render({preserveScroll=false,focusSearch=false}={}){
    const [page,id]=route();
    if(page==='map') state.view='map';
    if(page==='discover' && !window.location.hash) state.view='grid';
    app.innerHTML=page==='profile'?profilePage(resorts.find(r=>r.id===id)):page==='compare'?comparisonPage():page==='about'?aboutPage():discoverPage(page!=='map');
    document.title= page==='profile'?`${resorts.find(r=>r.id===id)?.name||'Resort'} | Piste Atlas`:page==='compare'?'Compare mountains | Piste Atlas':page==='map'?'Resort map | Piste Atlas':page==='about'?'About | Piste Atlas':'Piste Atlas | Find your mountain';
    if(focusSearch){const el=document.querySelector('#hero-search');el?.focus();el?.setSelectionRange(el.value.length,el.value.length);}
    if(!preserveScroll) window.scrollTo({top:0,behavior:'instant'});
  }
  function resetFilters(){state.query='';state.country='All';state.quality='All';state.pass='All';state.terrain='All';state.minSnow=0;state.minAcres=0;state.sort='mapped';state.minLifts=0;state.showFavorites=false;state.visibleCount=24;render({preserveScroll:true});}
  function updateFilter(el){let value=el.value;const name=el.dataset.filter;if(name==='minSnow'||name==='minAcres'||name==='minLifts')value=Number(value);state[name]=value;state.visibleCount=24;render({preserveScroll:true});}
  function tryCompare(id){if(state.selected.has(id))state.selected.delete(id);else if(state.selected.size<4)state.selected.add(id);else {alert('Compare up to four mountains at a time. Remove one before adding another.');return;}render({preserveScroll:true});}
  document.addEventListener('click',e=>{
    const mapPin=e.target.closest('[data-map-resort]');if(mapPin){window.location.hash=`#resort/${mapPin.dataset.mapResort}`;return;}
    const btn=e.target.closest('[data-action]');if(!btn)return;
    const action=btn.dataset.action,id=btn.dataset.id;
    if(action==='reset'){resetFilters();return;}
    if(action==='load-more'){state.visibleCount+=24;render({preserveScroll:true});return;}
    if(action==='toggle-compare'){tryCompare(id);return;}
    if(action==='clear-compare'){state.selected.clear();render({preserveScroll:true});return;}
    if(action==='save'){state.favorites.has(id)?state.favorites.delete(id):state.favorites.add(id);persistFavorites();render({preserveScroll:true});return;}
    if(action==='favorites'){state.showFavorites=!state.showFavorites;state.view='grid';if(route()[0]!=='discover')window.location.hash='#discover';else render({preserveScroll:true});return;}
    if(action==='set-view'){state.view=btn.dataset.view;if(state.view==='map'&&route()[0]==='discover')window.location.hash='#map';else if(state.view==='grid'&&route()[0]==='map')window.location.hash='#discover';else render({preserveScroll:true});return;}
    if(action==='menu'){const nav=document.querySelector('#mainNav');nav?.classList.toggle('open');btn.setAttribute('aria-expanded',String(nav?.classList.contains('open')));}
  });
  document.addEventListener('keydown',e=>{const pin=e.target.closest('[data-map-resort]');if(pin&&(e.key==='Enter'||e.key===' ')){e.preventDefault();window.location.hash=`#resort/${pin.dataset.mapResort}`;}});
  document.addEventListener('change',e=>{if(e.target.matches('[data-filter]'))updateFilter(e.target);});
  document.addEventListener('input',e=>{
    if(e.target.matches('[data-filter="query"]')){state.query=e.target.value;const cursor=e.target.selectionStart;const active=e.target.id;render({preserveScroll:true});const input=document.getElementById(active);if(input){input.focus();input.setSelectionRange(cursor,cursor);}return;}
    if(e.target.matches('[data-filter="minAcres"]'))document.querySelector('#acresValue').textContent=nf.format(e.target.value)+' acres';
    if(e.target.matches('[data-filter="minSnow"]'))document.querySelector('#snowValue').textContent=Number(e.target.value)===0?'Any':e.target.value+'″+';
  });
  document.addEventListener('submit',e=>{if(e.target.id!=='heroSearch')return;e.preventDefault();state.query=document.getElementById('hero-search').value;document.querySelector('.discover-layout')?.scrollIntoView({behavior:'smooth'});render({preserveScroll:true});document.querySelector('.discover-layout')?.scrollIntoView({behavior:'smooth'});});
  window.addEventListener('hashchange',()=>{if(route()[0]==='discover')state.view='grid';render();});
  render();
})();

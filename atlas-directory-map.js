/* Geographic resort directory map.
 * Pins are placed at the recorded resort coordinates in Leaflet's geographic projection.
 * Grid clustering is visual only; individual pins always use their original coordinates.
 * No OpenSkiMap tile hotlinking, geocoding or background tile prefetching.
 */
(() => {
  'use strict';
  const esc=value=>String(value==null?'':value).replace(/[&<>"']/g,
    c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const validCoordinate=r=>Number.isFinite(r?.lat)&&Number.isFinite(r?.lng)
    &&r.lat>=17&&r.lat<=85&&r.lng>=-180&&r.lng<=-45
    &&/^[a-zA-Z0-9._-]{3,160}$/.test(r.id||'');
  let current=[];
  let active=null;

  function markup(resorts){
    current=(resorts||[]).filter(validCoordinate);
    const skipped=(resorts||[]).length-current.length;
    const note=skipped?' · '+skipped+' without usable North American coordinates':'';
    return '<div class="map-wrap pa-geo-wrap">'
      +'<div class="map-header pa-geo-header"><div>'
      +'<strong>Geographic resort map</strong>'
      +'<span>'+current.length+' ski areas plotted at their mapped latitude/longitude'+note+'</span></div>'
      +'<button class="btn outline pa-map-fit-button" data-pa-fit-directory-map type="button">Fit all results</button></div>'
      +'<div class="pa-geo-map-shell"><div class="pa-geo-map" data-pa-directory-map '
      +'role="region" aria-label="Interactive geographic map of the filtered ski resorts"></div>'
      +'<div class="pa-map-loading" data-pa-map-message role="status">Loading geographic basemap…</div>'
      +'<div class="pa-map-legend" aria-label="Map marker legend"><span><i class="pa-legend-pin pa-legend-reviewed"></i> Operator-reviewed</span>'
      +'<span><i class="pa-legend-pin pa-legend-mapped"></i> Open map data</span>'
      +'<small>Numbered markers group nearby resorts. Zoom in to separate them.</small></div></div>'
      +'<p class="map-summary">Pins use their recorded geographic coordinates, not a schematic projection. '
      +'Clusters represent nearby ski areas; zoom in or select a group to see individual mountains. '
      +'Some OpenSkiData coordinates identify a ski-area center, not an entrance or base lodge. '
      +'Distance scale is in miles/feet; this map is not for on-mountain navigation.</p>'
      +'<div class="map-list" aria-label="Resort list for map">'
      +current.slice(0,90).map(r=>'<a href="#resort/'+encodeURIComponent(r.id)
        +'" class="map-list-item" data-map-resort="'+esc(r.id)+'">'
        +'<span class="map-dot"></span><strong>'+esc(r.name)+'</strong><small>'
        +esc(r.regionCode||r.region)+' · '+esc(r.country)+'</small>↗</a>').join('')
      +'</div>'+(current.length>90?'<p class="pa-geo-list-note">Showing the first 90 entries below. '
        +'All '+current.length+' locations are included on the interactive map.</p>':'')+'</div>';
  }

  function clustered(points,project,cellSize=46){
    const groups=new Map();
    for(const r of points){
      const p=project(r), key=Math.floor(p.x/cellSize)+','+Math.floor(p.y/cellSize);
      if(!groups.has(key))groups.set(key,[]);
      groups.get(key).push(r);
    }
    return [...groups.values()];
  }

  function destroy(){
    if(!active)return;
    try{active.map.remove();}catch{}
    active=null;
  }

  function details(r){
    return '<div class="pa-geo-popup"><strong>'+esc(r.name)+'</strong><span>'
      +esc(r.city||r.region||'')+' · '+esc(r.regionCode||r.region)+' · '+esc(r.country)+'</span>'
      +'<small>'+(r.dataQuality==='open-data'?'OpenSkiData map-derived location':'Operator-reviewed profile · mapped location')+'</small>'
      +'<a href="#resort/'+encodeURIComponent(r.id)+'">Explore mountain →</a></div>';
  }
  function clusterPopup(group){
    return '<div class="pa-geo-popup"><strong>'+group.length+' nearby ski areas</strong>'
      +'<div class="pa-geo-popup-list">'+group.slice(0,35)
        .map(r=>'<a href="#resort/'+encodeURIComponent(r.id)+'">'+esc(r.name)+'</a>').join('')
      +(group.length>35?'<small>Zoom closer to reveal the rest.</small>':'')+'</div></div>';
  }
  async function mount(){
    const root=document.querySelector('[data-pa-directory-map]');
    if(!root){destroy();return;}
    if(active?.root===root)return;
    destroy();
    const rows=[...current];
    const loading=root.parentElement?.querySelector('[data-pa-map-message]');
    if(!rows.length){
      if(loading)loading.textContent='No locations match the current filters.';
      return;
    }
    try{
      const L=await window.PisteAtlasExtras?.loadLeaflet?.();
      if(!L)throw Error('Map renderer not available');
      // Old async mounts must never draw into a replacement page or filter result.
      if(document.querySelector('[data-pa-directory-map]')!==root || !root.isConnected)return;
      const map=L.map(root,{zoomControl:false,scrollWheelZoom:false,
        preferCanvas:true,minZoom:2,maxZoom:17,worldCopyJump:false});
      active={root,map,rows};
      L.control.zoom({position:'topright'}).addTo(map);
      L.control.scale({position:'bottomleft',metric:false,imperial:true,maxWidth:140}).addTo(map);
      const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{
        maxZoom:17,keepBuffer:1,updateWhenIdle:true,
        attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
      }).addTo(map);
      let tileErrorShown=false;
      tiles.on('tileerror',()=>{
        if(!tileErrorShown && loading){
          tileErrorShown=true;
          loading.textContent='Some basemap tiles could not load. Resort coordinates and list remain available.';
          loading.classList.add('pa-map-warning');
        }
      });
      const bounds=L.latLngBounds(rows.map(r=>[r.lat,r.lng]));
      function fitAll(){
        if(!bounds.isValid())return;
        if(rows.length===1)map.setView(bounds.getCenter(),11,{animate:false});
        else map.fitBounds(bounds.pad(.06),{padding:[22,22],maxZoom:11,animate:false});
      }
      const layer=L.layerGroup().addTo(map);
      const renderer=L.canvas({padding:.15});
      function redraw(){
        layer.clearLayers();
        const groups=clustered(rows,r=>map.project([r.lat,r.lng],map.getZoom()));
        for(const group of groups){
          if(group.length===1){
            const r=group[0],reviewed=r.dataQuality!=='open-data';
            const circle=L.circleMarker([r.lat,r.lng],{
              renderer,radius:reviewed?6.5:4.6,weight:reviewed?2:1.4,
              color:'#fff',fillColor:reviewed?'#dd7036':'#277f82',fillOpacity:.93,
              interactive:true,bubblingMouseEvents:false
            }).bindPopup(details(r));
            circle.bindTooltip(esc(r.name),{direction:'top',offset:[0,-6]});
            circle.addTo(layer);
          }else{
            const lat=group.reduce((sum,r)=>sum+r.lat,0)/group.length;
            const lng=group.reduce((sum,r)=>sum+r.lng,0)/group.length;
            const icon=L.divIcon({className:'pa-geo-cluster-icon',
              html:'<span>'+group.length+'</span>',iconSize:[36,36],iconAnchor:[18,18]});
            const pin=L.marker([lat,lng],{icon,keyboard:true,title:group.length+' nearby ski areas'});
            const groupBounds=L.latLngBounds(group.map(r=>[r.lat,r.lng]));
            pin.on('click',()=>{
              if(map.getZoom()>=13 || (groupBounds.getNorthEast().distanceTo(groupBounds.getSouthWest())<100)){
                pin.bindPopup(clusterPopup(group),{maxHeight:260}).openPopup();
              }else{
                map.fitBounds(groupBounds.pad(.35),{
                  padding:[45,45],maxZoom:Math.min(map.getZoom()+3,15),animate:true
                });
              }
            });
            pin.addTo(layer);
          }
        }
      }
      map.on('zoomend',redraw);
      active.fitAll=fitAll;
      fitAll();
      redraw();
      if(loading){loading.textContent='';loading.hidden=true;}
      // After async library load, the container may still be settling on mobile.
      setTimeout(()=>{if(active?.root===root)map.invalidateSize();},0);
    }catch(error){
      if(document.querySelector('[data-pa-directory-map]')!==root)return;
      if(loading){loading.hidden=false;loading.textContent='The geographic map is temporarily unavailable. Use the resort list below.';}
    }
  }

  document.addEventListener('click',event=>{
    if(event.target.closest('[data-pa-fit-directory-map]'))active?.fitAll?.();
  });
  window.PisteAtlasMap={markup,mount,get currentCount(){return current.length;},_test:{validCoordinate,clustered}};
})();

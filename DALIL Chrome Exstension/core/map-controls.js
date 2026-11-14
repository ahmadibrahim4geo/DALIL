/* Display-only Leaflet layers and a viewport lock, independent of search sources. */
(function(root){
  'use strict';
  function createViewportLock(map,onChange=()=>{}){
    let locked=false,view=null,restoring=false;
    const handlers=['dragging','scrollWheelZoom','doubleClickZoom','boxZoom','keyboard','touchZoom','tapHold'];
    function restore(){
      if(!locked||restoring||!view)return;
      const center=map.getCenter();
      if(Math.abs(center.lat-view.lat)<1e-9&&Math.abs(center.lng-view.lng)<1e-9&&map.getZoom()===view.zoom)return;
      restoring=true;map.setView([view.lat,view.lng],view.zoom,{animate:false});restoring=false;
    }
    function set(value){
      locked=!!value;
      if(locked){map.stop?.();map.invalidateSize?.({pan:false});const center=map.getCenter();view={lat:center.lat,lng:center.lng,zoom:map.getZoom()};}
      handlers.forEach(key=>{if(map[key])map[key][locked?'disable':'enable']();});
      const controls=map.zoomControl?.getContainer?.();
      if(controls){controls.style.pointerEvents=locked?'none':'';controls.querySelectorAll('a,button').forEach(button=>button.setAttribute('aria-disabled',String(locked)));}
      onChange(locked,view);return locked;
    }
    map.on('moveend zoomend resize',restore);
    if(typeof ResizeObserver!=='undefined')new ResizeObserver(()=>{if(locked){map.invalidateSize({pan:false});restore();}}).observe(map.getContainer());
    return {set,toggle(){return set(!locked);},isLocked(){return locked;},getView(){return view&&{...view};},snapshot(){const c=map.getCenter();return{lat:c.lat,lng:c.lng,zoom:map.getZoom()};}};
  }
  function createBasemaps(L,language='ar'){
    const lang=language==='en'?'en':'ar';
    const googleAttribution='<a href="https://maps.google.com" target="_blank" rel="noopener noreferrer">Google Maps</a>';
    const google=type=>L.tileLayer(`https://mt{s}.google.com/vt?lyrs=${type}&hl=${lang}&x={x}&y={y}&z={z}`,{maxZoom:20,subdomains:['0','1','2','3'],attribution:googleAttribution});
    const imagery=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,attribution:'© Esri · Maxar · Earthstar Geographics'});
    const labels=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',{maxZoom:20,maxNativeZoom:19,pane:'overlayPane',attribution:'© Esri · contributors',opacity:1});
    return {googleRoads:google('m'),googleSatellite:google('s'),esriHybrid:L.layerGroup([imagery,labels]),
      osm:L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:20,maxNativeZoom:19,attribution:'<a href="https://www.openstreetmap.org/copyright">© OpenStreetMap contributors</a>'})};
  }
  const api={createViewportLock,createBasemaps};root.DalilMapControls=api;
  if(typeof module==='object'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:this);

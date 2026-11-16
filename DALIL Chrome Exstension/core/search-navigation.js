/* Observable Google Maps URL camera and query evidence; no private map APIs. */
(function(root){
 'use strict';
 function view(url){try{const m=new URL(url).pathname.match(/@(-?[\d.]+),(-?[\d.]+),([\d.]+)([zm])/);if(!m)return null;const lat=Number(m[1]),lng=Number(m[2]);return Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?{lat,lng,scale:Number(m[3]),unit:m[4]}:null;}catch(_){return null;}}
 function normalizeQuery(value){return String(value||'').normalize('NFC').replace(/[\u061c\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g,'').trim().toLocaleLowerCase();}
 function query(url){try{const u=new URL(url);return normalizeQuery(decodeURIComponent(u.pathname.split('/maps/search/')[1]?.split('/')[0]||u.searchParams.get('query')||''));}catch(_){return '';}}
 function searchValue(document){for(const selector of ['#searchboxinput','input[name="q"]','[role="search"] input','input[role="combobox"]']){const value=document.querySelector(selector)?.value;if(value)return normalizeQuery(value);}return '';}
 function distance(a,b){const r=Math.PI/180,dlat=(a.lat-b.lat)*r,dlng=(a.lng-b.lng)*r,h=Math.sin(dlat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dlng/2)**2;return 12742017.6*Math.asin(Math.min(1,Math.sqrt(h)));}
 function verify(actual,target,searchValue='',toleranceMeters=25){
  let a,b;try{a=new URL(actual);b=new URL(target);}catch(_){return {verified:false,reason:'invalid_url'};}
  if(a.origin!==b.origin||!a.pathname.startsWith('/maps/'))return {verified:false,reason:'invalid_origin_or_path'};
  const requested=view(target),observed=view(actual),expectedQuery=query(target),actualQuery=query(actual),box=normalizeQuery(searchValue);
  const queryVerified=Boolean(!expectedQuery||actualQuery===expectedQuery||box===expectedQuery||(actualQuery&&expectedQuery&&actualQuery.includes(expectedQuery))||(box&&expectedQuery&&box.includes(expectedQuery)));
  const centerErrorMeters=requested&&observed?distance(requested,observed):null;
  const centerVerified=centerErrorMeters!==null&&centerErrorMeters<=toleranceMeters;
  return {verified:Boolean(queryVerified&&centerVerified),queryVerified,centerVerified,centerErrorMeters,requested,observed,
   reason:!queryVerified?'query_mismatch':!centerVerified?'camera_mismatch':'verified_url_camera',evidenceKind:'url_camera; not a hard geographic result filter'};
 }
 /* Coverage geometry: what the map actually shows at a given camera and zoom.
  * Google scopes its result list to the visible map viewport, so a view whose
  * viewport is smaller than the cell cannot have read the whole cell. */
 const WORLD_METERS_PER_PIXEL_AT_ZOOM_0=156543.03392;
 const DEFAULT_PIXELS=Object.freeze({width:1280,height:800});
 function pixelsOf(pixels){return {width:Math.max(320,Number(pixels?.width)||DEFAULT_PIXELS.width),
  height:Math.max(240,Number(pixels?.height)||DEFAULT_PIXELS.height)};}
 function metersPerPixel(lat,zoom){const z=Number(zoom),safe=Number.isFinite(z)?z:16;
  const value=WORLD_METERS_PER_PIXEL_AT_ZOOM_0*Math.cos((Number(lat)||0)*Math.PI/180)/Math.pow(2,safe);
  return Number.isFinite(value)&&value>0?value:null;}
 function spanMeters(bounds){
  if(!bounds||bounds.minLat===undefined)return null;
  const midLat=(Number(bounds.minLat)+Number(bounds.maxLat))/2;
  const height=Math.abs(Number(bounds.maxLat)-Number(bounds.minLat))*110574;
  const width=Math.abs(Number(bounds.maxLng)-Number(bounds.minLng))*111320*Math.cos(midLat*Math.PI/180);
  return Number.isFinite(width)&&Number.isFinite(height)?{width,height,midLat}:null;
 }
 /** أعلى تكبير لا يزال عرضه يحتوي نطاق الخلية كاملًا. أي تكبير أعلى يعني تغطية جزئية. */
 function zoomForBounds(bounds,pixels,margin=1.06){
  const span=spanMeters(bounds);if(!span)return 16;
  const px=pixelsOf(pixels);
  const needed=Math.max(span.width*margin/px.width,span.height*margin/px.height);
  const mpp=metersPerPixel(span.midLat,0);
  if(!(needed>0)||!mpp)return 16;
  const raw=Math.log2(mpp/needed);
  return Math.max(10,Math.min(20,Math.floor(raw)));
 }
 function viewportBox(centerLat,centerLng,pixels,zoom){
  const px=pixelsOf(pixels),mpp=metersPerPixel(centerLat,zoom);
  if(!mpp||!Number.isFinite(Number(centerLat))||!Number.isFinite(Number(centerLng)))return null;
  const halfLat=(px.height*mpp/2)/110574;
  const halfLng=(px.width*mpp/2)/(111320*Math.cos(Number(centerLat)*Math.PI/180));
  return {minLat:Number(centerLat)-halfLat,maxLat:Number(centerLat)+halfLat,
   minLng:Number(centerLng)-halfLng,maxLng:Number(centerLng)+halfLng,
   widthMeters:px.width*mpp,heightMeters:px.height*mpp};
 }
 function covers(box,bounds,epsilonMeters=20){
  if(!box||!bounds||bounds.minLat===undefined)return false;
  const midLat=(Number(bounds.minLat)+Number(bounds.maxLat))/2;
  const latSpan=Math.abs(Number(bounds.maxLat)-Number(bounds.minLat));
  const lngSpan=Math.abs(Number(bounds.maxLng)-Number(bounds.minLng));
  const tolerance=Math.max(0,Number(epsilonMeters)||0);
  // سماحية صغيرة لا تتجاوز 5% من الخلية، حتى لا تُعتبر خلية صغيرة «مغطاة» بفراغ كبير.
  const epsLat=Math.min(tolerance/110574,latSpan*0.05);
  const epsLng=Math.min(tolerance/(111320*Math.max(0.2,Math.cos(midLat*Math.PI/180))),lngSpan*0.05);
  return box.minLat<=Number(bounds.minLat)+epsLat && box.maxLat>=Number(bounds.maxLat)-epsLat &&
   box.minLng<=Number(bounds.minLng)+epsLng && box.maxLng>=Number(bounds.maxLng)-epsLng;
 }
 const api={view,query,normalizeQuery,searchValue,distance,verify,metersPerPixel,spanMeters,zoomForBounds,viewportBox,covers,pixelsOf,DEFAULT_PIXELS};
 root.DalilSearchNavigation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:self);

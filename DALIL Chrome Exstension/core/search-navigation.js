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
  const requested=view(target),observed=view(actual),expectedQuery=query(target),actualQuery=query(actual),box=normalizeQuery(searchValue);
  const queryVerified=!!expectedQuery&&(actualQuery===expectedQuery||box===expectedQuery),centerErrorMeters=requested&&observed?distance(requested,observed):null;
  const centerVerified=centerErrorMeters!==null&&centerErrorMeters<=toleranceMeters;
  return {verified:a.origin===b.origin&&a.pathname.startsWith('/maps/')&&queryVerified&&centerVerified,queryVerified,centerVerified,centerErrorMeters,requested,observed,
   reason:!queryVerified?'query_mismatch':!centerVerified?'camera_mismatch':'verified_url_camera',evidenceKind:'url_camera; not a hard geographic result filter'};
 }
 const api={view,query,normalizeQuery,searchValue,distance,verify};root.DalilSearchNavigation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:self);

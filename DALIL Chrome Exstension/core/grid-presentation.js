/* One presentation contract for the grid, legend and discovery visibility. */
(function(root){
 'use strict';
 const definitions=Object.freeze([
  {id:'pending',label:'lgPending',color:'#2563eb',opacity:0.07},
  {id:'processing',label:'lgActive',color:'#f59e0b',opacity:0.20},
  {id:'complete',label:'lgDone',color:'#16a34a',opacity:0.10},
  {id:'confirmed_empty',label:'lgEmpty',color:'#64748b',opacity:0.04,dash:'4 4'},
  {id:'partial',label:'lgPartial',color:'#d97706',opacity:0.12,dash:'6 3'},
  {id:'unknown',label:'lgUnknown',color:'#8b5cf6',opacity:0.10,dash:'2 4'},
  {id:'error',label:'lgError',color:'#dc2626',opacity:0.10,dash:'6 3'}
 ]);
 const aliases={done:'complete',verified_empty:'confirmed_empty',running:'processing',active:'processing',capped:'partial',blocked:'error',cancelled:'pending'};
 const normalize=s=>aliases[s]||s||'pending';
 function state(cell,context={}){
  const byQuery=cell.statusByQuery||{},values=Object.values(byQuery).map(v=>normalize(v.status));
  if(['running','paused'].includes(context.status))return normalize(byQuery['Q'+((context.queryIndex||0)+1)]?.status||'pending');
  if(!values.length)return normalize(cell.status);
  for(const priority of ['error','unknown','partial','processing'])if(values.includes(priority))return context.status==='stopped'&&priority==='processing'?'pending':priority;
  if(values.includes('complete'))return 'complete';
  return values.every(v=>v==='confirmed_empty')?'confirmed_empty':'pending';
 }
 function style(status){const s=definitions.find(d=>d.id===normalize(status))||definitions[0];return {color:s.color,weight:s.id==='processing'?2.3:1.7,fillColor:s.color,fillOpacity:s.opacity,dashArray:s.dash||null};}
 function visited(cell){return Object.values(cell?.statusByQuery||{}).some(v=>!['pending','cancelled'].includes(v.status)) || ['done','complete','confirmed_empty','verified_empty','partial','capped'].includes(cell?.status);}
 function ownerVisited(place,cells){if(!cells.length)return true;const owner=cells.find(c=>c.id===(place.ownerCellId||place.cellId));return !!owner&&visited(owner);}
 const api={definitions,state,style,visited,ownerVisited,normalize};root.DalilGridPresentation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:self);

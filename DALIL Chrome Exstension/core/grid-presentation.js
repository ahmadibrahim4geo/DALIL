/* One presentation contract for the grid, legend and discovery visibility.
 * خمس حالات مرئية فقط كما يطلب التشغيل الميداني: قيد الانتظار، جاري المسح،
 * مكتملة، خالية، خطأ/تعذر البحث. الحالات الفرعية (جزئية، حد النتائج، غير محسومة)
 * لا تُضاف كمفاتيح جديدة في المفتاح: تُعرض داخل بطاقة الخلية بنصّها الدقيق. */
(function(root){
 'use strict';
 const definitions=Object.freeze([
  {id:'pending',label:'lgPending',color:'#2563eb',opacity:0.07},
  {id:'processing',label:'lgActive',color:'#f59e0b',opacity:0.20},
  {id:'complete',label:'lgDone',color:'#16a34a',opacity:0.10},
  {id:'confirmed_empty',label:'lgEmpty',color:'#64748b',opacity:0.04,dash:'4 4'},
  {id:'error',label:'lgError',color:'#dc2626',opacity:0.10,dash:'6 3'}
 ]);
 const aliases={done:'complete',verified_empty:'confirmed_empty',running:'processing',active:'processing',blocked:'error',cancelled:'pending'};
 // حالات فرعية تُعرض ضمن الحالة الرئيسية بدل إضافة مفتاح سادس/سابع للمستخدم.
 const buckets={partial:'complete',capped:'complete',unknown:'error',coverage_incomplete:'error'};
 const normalize=s=>aliases[s]||s||'pending';
 /** التغطية الناقصة: عرض الخريطة كان أضيق من الخلية، فلا يصح عرضها «مكتملة». */
 function coverageIncomplete(cell){
  return Object.values(cell?.statusByQuery||{}).some(entry=>Array.isArray(entry?.scans)&&entry.scans.some(scan=>scan&&scan.coverageIncomplete));
 }
 function state(cell,context={}){
  const byQuery=cell.statusByQuery||{},values=Object.values(byQuery).map(v=>normalize(v.status));
  let res;
  if(['running','paused'].includes(context.status)) res = normalize(byQuery['Q'+((context.queryIndex||0)+1)]?.status||'pending');
  else if(!values.length) res = normalize(cell.status);
  else {
    for(const priority of ['error','unknown','processing']){
      if(values.includes(priority)){
        res = context.status==='stopped'&&priority==='processing'?'pending':priority;
        break;
      }
    }
    if(!res){
      if(values.includes('partial')) res = 'partial';
      else if(values.includes('capped')) res = 'capped';
      else if(values.includes('complete')) res = 'complete';
      else res = values.every(v=>v==='confirmed_empty')?'confirmed_empty':'pending';
    }
  }
  if(!res) res = normalize(cell.status);
  // خلية قُرئ جزء منها فقط بسبب عرض أضيق من الخلية لا تُعرض مكتملة ولا خالية.
  if(coverageIncomplete(cell) && ['complete','partial','capped','confirmed_empty','pending'].includes(res)) return 'coverage_incomplete';
  if(cell && cell.itemsFound === 0 && ['complete','done','confirmed_empty','verified_empty'].includes(res)){
    return 'confirmed_empty';
  }
  return res;
 }
 function style(status){const raw=normalize(status),id=buckets[raw]||raw;const s=definitions.find(d=>d.id===id)||definitions[0];return {color:s.color,weight:s.id==='processing'?2.3:1.7,fillColor:s.color,fillOpacity:s.opacity,dashArray:s.dash||null};}
 function bucket(status){const raw=normalize(status);return buckets[raw]||raw;}
 function visited(cell){return Object.values(cell?.statusByQuery||{}).some(v=>!['pending','cancelled'].includes(v.status)) || ['done','complete','confirmed_empty','verified_empty','partial','capped','coverage_incomplete'].includes(cell?.status);}
 function ownerVisited(place,cells){if(!cells.length)return true;const owner=cells.find(c=>c.id===(place.ownerCellId||place.cellId));return !!owner&&visited(owner);}
 const api={definitions,state,style,bucket,visited,ownerVisited,normalize,coverageIncomplete};root.DalilGridPresentation=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof globalThis!=='undefined'?globalThis:self);

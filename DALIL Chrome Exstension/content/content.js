/**
 * Google Maps Grid Scraper - Content Script (Spatially Strict GIS Edition)
 * Google Maps browser-search adapter. Its queue is independent of display basemaps.
 * Search is serialized and pauses on provider challenges; reuse rights stay source-specific.
 * A viewport is a discovery hint; geometric ownership is verified separately.
 */

(function () {
  // إعادة تحميل الإضافة لا يجب أن تترك الصفحة معطّلة: نُوقف النسخة السابقة إن كانت
  // حيّة، ثم نُكمل التهيئة دائمًا بدل الخروج المبكر.
  if (typeof window !== "undefined") {
    try { window.__DALIL_DISPOSE__?.(); } catch (_) {}
    window.__GMAPS_GRID_SCRAPER_INJECTED__ = true;
    window.__DALIL_CONTENT_ALIVE__ = true;
    window.__DALIL_HEARTBEAT__ = Date.now();
  }
  const disposers = [];
  if (typeof window !== "undefined") {
    window.__DALIL_DISPOSE__ = () => {
      while (disposers.length) { try { disposers.pop()(); } catch (_) {} }
      window.__DALIL_CONTENT_ALIVE__ = false;
    };
  }
  if (typeof window !== "undefined" && typeof setInterval === "function") {
    const heartbeat = setInterval(() => { try { window.__DALIL_HEARTBEAT__ = Date.now(); } catch (_) {} }, 5000);
    if (heartbeat && typeof heartbeat.unref === "function") heartbeat.unref();
    disposers.push(() => clearInterval(heartbeat));
  }

  let activeTask = null;
  let preparedTask = null;
  // آخر مهمة جُهّزت في هذا المستند. تبقى بعد انتهاء القراءة لأن أوامر مثل
  // «البحث في هذه المنطقة» تُنفّذ في نفس الصفحة بعد القراءة، وتحتاج هوية المهمة.
  let lastPreparedTask = null;
  let preparedNavigation = null;
  let currentScrapePlacesMap = new Map();
  let uiLanguage = 'ar';
  let overlayContext=null;
  let overlayPosition=null;
  let areaSearchClicked=false;
  // بصمة هذا المستند فقط. تُتيح للعامل الخلفي إثبات أن الصفحة أُعيد تحميلها فعلًا
  // بدل قراءة نفس صفحة الخلية السابقة (سبب ظهور نتائج لا تنتمي للخلية).
  const DOCUMENT_ID = 'doc_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  const copyTask = task => task ? {jobId:task.jobId,cellId:task.cellId,queryId:task.queryId,areaVersion:task.areaVersion} : null;
  const validTask = task => task && ['jobId','cellId','queryId'].every(k=>typeof task[k]==='string' && task[k]);
  function sameTask(a,b){return !!a && !!b && ['jobId','cellId','queryId','areaVersion'].every(k=>a[k]===b[k]);}
  function assertActive(token=activeTask){
    if(token?.cancelled)throw Object.assign(new Error('Task cancelled.'),{code:'CANCELLED'});
    const blocked=detectSourceBlock();
    if(blocked)throw Object.assign(new Error('The source requires attention; collection stopped.'),{code:blocked});
  }
  // هامش التحقق من مركز الكاميرا = عرض نطاق الخريطة عند مستوى التكبير الحالي.
  // الهامش السابق (50 كم) كان يُبطل التحقق عمليًا ويسمح بنسب نتائج حيٍّ آخر إلى الخلية.
  function cameraToleranceMeters(url){
    try{
      const view=DalilSearchNavigation.view(url);
      if(!view||!Number.isFinite(view.scale)||view.scale<=0)return 150;
      if(view.unit==='m')return Math.max(100,Math.min(1500,view.scale));
      const metersPerPixel=156543.03392*Math.cos(view.lat*Math.PI/180)/Math.pow(2,view.scale);
      return Math.max(100,Math.min(1500,metersPerPixel*1024));
    }catch(_){return 150;}
  }
  /**
   * لقطة من حالة الصفحة نفسها عند لحظة القراءة. «صفر سجل» له سببان مختلفان
   * تمامًا: منطقة بلا نتائج، أو صفحة لم ترسم أي بطاقة أصلًا (تبويب في الخلفية،
   * تحميل ناقص، أو تغيّر في الصفحة). بلا هذه اللقطة لا يمكن التمييز بينهما.
   */
  function domEvidence(){
    try{
      const feed=document.querySelector('div[role="feed"]');
      return {feed:!!feed,
        cards:feed?feed.querySelectorAll('a[href*="/maps/place/"], a.hfpxzc').length:0,
        anyCards:document.querySelectorAll('a[href*="/maps/place/"]').length,
        visibility:document.visibilityState||'unknown',
        readyState:document.readyState,
        feedHeight:feed?feed.scrollHeight:0};
    }catch(_){return null;}
  }

  /**
   * مقاس ما تراه الخريطة فعلًا. Google يقصر قائمة النتائج على هذا النطاق،
   * فبدونه لا يمكن إثبات أن الخلية قُرئت كاملة.
   */
  function viewportEvidence(observed, requestedZoom){
    try{
      const view=observed||DalilSearchNavigation.view(window.location.href);
      if(!view)return null;
      const pixels=DalilSearchNavigation.pixelsOf({width:window.innerWidth,height:window.innerHeight});
      const zoom=view.unit==='z'?Number(view.scale):Number(requestedZoom);
      if(!Number.isFinite(zoom))return null;
      const mpp=DalilSearchNavigation.metersPerPixel(view.lat,zoom);
      if(!mpp)return null;
      return {zoom,pixels,widthMeters:Math.round(pixels.width*mpp),heightMeters:Math.round(pixels.height*mpp)};
    }catch(_){return null;}
  }
  function verifyPreparedCamera(){
    if(!preparedNavigation)return null;
    try {
      const view=DalilSearchNavigation.verify(window.location.href,preparedNavigation.targetUrl,DalilSearchNavigation.searchValue(document),cameraToleranceMeters(preparedNavigation.targetUrl));
      return view;
    } catch(e) {
      // تعذّر إثبات المطابقة ليس إثباتًا لها.
      return { verified: false, centerVerified: false, queryVerified: false, reason:'verification_failed', warning: e.message };
    }
  }
  // عنصر الحظر يجب أن يكون مرئيًا فعلًا: reCAPTCHA مخفي داخل صفحة عادية ليس حظرًا.
  function visibleBlockElement(){
    if(typeof document==='undefined'||typeof document.querySelectorAll!=='function')return false;
    let nodes=[];
    try{nodes=Array.from(document.querySelectorAll('iframe[src*="recaptcha"], form[action*="/sorry/"], #captcha-form'));}catch(_){return false;}
    return nodes.some(node=>{
      try{
        if(typeof node.getBoundingClientRect!=='function')return false;
        const rect=node.getBoundingClientRect();
        return !!rect && rect.width>=40 && rect.height>=40;
      }catch(_){return false;}
    });
  }
  function detectSourceBlock(){
    if(typeof document==='undefined')return null;
    const text=(document.body?.innerText||'').slice(0,80000);
    if(visibleBlockElement() || /unusual traffic|أنظمة.*زيارات غير عادية|حركة مرور غير عادية/i.test(text))return 'SOURCE_BLOCKED';
    if(/trafic inhabituel|tráfico inusual|tráfego incomum|ungewöhnlicher datenverkehr|通常と異なるトラフィック|异常流量|異常流量|असामान्य ट्रैफ़िक/i.test(text))return 'SOURCE_BLOCKED';
    if(/too many requests|rate limit exceeded|trop de requêtes|demasiadas solicitudes|zu viele anfragen|muitas solicitações|请求过多|請求過多|リクエストが多すぎ/i.test(text))return 'RATE_LIMITED';
    return null;
  }
  // Messages bind all work to one prepared navigation identity.
  const onRuntimeMessage = (request, sender, sendResponse) => {
    if(sender?.id && chrome.runtime.id && sender.id!==chrome.runtime.id){sendResponse({success:false,errorCode:'UNTRUSTED_SENDER'});return false;}
    if(request.action==='JOB_STATUS'){
      const state=request.state;
      if(state && overlayContext?.jobId===state.jobId){
        const c=state.currentCell;
        const info={...(overlayContext.cellInfo||{}),...(c||{}),index:state.currentIndex,total:state.stats?.totalCells,
          currentQueryIndex:state.currentQueryIndex,totalQueries:state.totalQueries,completedTasks:state.stats?.currentStep};
        showOverlayStatus(info,state.activeQueryText||overlayContext.query,state.jobId);
        const phase=state.status==='running'?'collecting':state.status;
        updateOverlayStatus(uiLanguage==='en'?(phase==='paused'?'Paused — progress is saved':phase==='stopped'?'Stopped':phase==='completed'?'Scheduled search finished':'Loading cell results…'):
          (phase==='paused'?'متوقف مؤقتًا — التقدم محفوظ':phase==='stopped'?'توقفت المهمة':phase==='completed'?'انتهت مهام البحث المجدولة':'جار تحميل نتائج الخلية…'),phase==='completed',phase);
      }
      sendResponse({success:true});return false;
    }
    if(request.action==='CANCEL_SCRAPE'){
      if(activeTask)activeTask.cancelled=true;
      preparedTask=null;preparedNavigation=null;
      const isStopped = request.status === 'stopped';
      const statusLabel = uiLanguage==='en' ? (isStopped ? 'Stopped' : 'Paused — progress is saved') : (isStopped ? 'توقفت المهمة' : 'متوقف مؤقتًا — التقدم محفوظ');
      updateOverlayStatus(statusLabel, false, request.status || 'stopped');
      sendResponse({success:true});return false;
    }
    if(request.action==='PREPARE_TASK'){
      try{
        const current=new URL(window.location.href),target=new URL(request.targetUrl);
        const nonce=JSON.parse(decodeURIComponent(target.hash.replace(/^#dalil=/,'')));
        if(!validTask(request.task) || !sameTask(nonce,request.task) || !/^\/maps(\/|$)/.test(current.pathname))throw new Error('Navigation identity mismatch.');
        if(document.readyState!=='complete')throw new Error('Page is not ready.');
        const requestedQuery=DalilSearchNavigation.query(target.href);
        const currentQuery=DalilSearchNavigation.query(current.href);
        const searchValue=DalilSearchNavigation.searchValue(document);
        if(requestedQuery!==currentQuery && requestedQuery!==searchValue)throw new Error('Search query mismatch.');
        const requestedTolerance=Number(request.cameraToleranceMeters)>0?Number(request.cameraToleranceMeters):cameraToleranceMeters(target.href);
        // الحد الصارم يمنع نسب مدينة أخرى للخلية، لكنه لا يوقف الجمع بسبب إعادة تمركز بسيطة.
        const hardLimit=Number(request.hardCameraLimitMeters)>0?Number(request.hardCameraLimitMeters):Math.max(requestedTolerance,600);
        const view=DalilSearchNavigation.verify(current.href,target.href,searchValue,requestedTolerance);
        // نص البحث شرط صارم: بدونه قد تُنسب نتائج استعلام آخر إلى الخلية.
        if(!view.queryVerified)throw Object.assign(new Error('The requested search query was not confirmed.'),{code:'NAVIGATION_VIEW_MISMATCH',view});
        // الصفحة يجب أن تكون صفحة هذه الخلية: الكاميرا فوقها، لا فوق حيٍّ آخر.
        if(view.centerErrorMeters!=null && view.centerErrorMeters>hardLimit){
          throw Object.assign(new Error('The requested cell camera was not confirmed.'),{code:'CAMERA_NOT_AT_CELL',view});
        }
        assertActive(null);
        if(activeTask)activeTask.cancelled=true;
        preparedTask=copyTask(request.task);
        lastPreparedTask=copyTask(request.task);
        areaSearchClicked=false;
        preparedNavigation={targetUrl:target.href,view};
        sendResponse({success:true,task:preparedTask,url:current.href,readyState:document.readyState,view,documentId:DOCUMENT_ID,
          viewport:viewportEvidence(view.observed,request.zoom)});
      }catch(error){sendResponse({success:false,errorCode:error.code||'STALE_PAGE',error:error.message});}
      return false;
    }
    if (request.action === "SEARCH_THIS_AREA") {
      if(!validTask(request.task) || !sameTask(request.task,lastPreparedTask)){sendResponse({success:false,errorCode:'TASK_NOT_PREPARED',clicked:false});return false;}
      const feed=document.querySelector('div[role="feed"]');
      const firstBefore=document.querySelector('a[href*="/maps/place/"], a.hfpxzc')?.href||'';
      const clicked=clickSearchThisAreaIfPresent();
      if(!clicked){sendResponse({success:true,clicked:false,changed:false,count:document.querySelectorAll('a[href*="/maps/place/"]').length});return false;}
      // لا يكفي وجود بطاقات قديمة: ننتظر أن تستبدلها Google بنتائج هذا النطاق.
      (async () => {
        let changed=false;
        const started=Date.now();
        while(Date.now()-started<9000){
          await sleep(600);
          const firstNow=document.querySelector('a[href*="/maps/place/"], a.hfpxzc')?.href||'';
          if(firstNow&&firstNow!==firstBefore){changed=true;break;}
        }
        if(feed)await waitForFirstCards(feed,3000);
        sendResponse({success:true,clicked:true,changed,count:document.querySelectorAll('a[href*="/maps/place/"]').length});
      })().catch(()=>sendResponse({success:true,clicked:true,changed:false}));
      return true;
    }
    if (request.action === "SCRAPE_PAGE") {
      if(!validTask(request.task) || !sameTask(request.task,preparedTask)){sendResponse({success:false,errorCode:'TASK_NOT_PREPARED',items:[]});return false;}
      if(activeTask && !activeTask.cancelled){sendResponse({success:false,errorCode:'TASK_BUSY',items:[]});return false;}
      const token={task:copyTask(request.task),cancelled:false};
      activeTask=token;
      uiLanguage=request.uiLanguage==='en'?'en':'ar';
      const maxItems = request.maxItems || 120;
      const scrollDelay = request.scrollDelay || 1100;
      const cellInfo = request.cellInfo || null;
      const currentQuery = request.query || "";

      showOverlayStatus(cellInfo, currentQuery,request.task.jobId);
      currentScrapePlacesMap.clear();

      scrapeGoogleMaps(Math.min(5000,Math.max(1,maxItems)), Math.max(500,scrollDelay), cellInfo)
        .then((res) => {
          assertActive(token);
          const view=verifyPreparedCamera();
          const items = Array.isArray(res) ? res : (res && res.items ? res.items : []);
          const limitedView=hasLimitedView();
          let completenessStatus = (res && res.completenessStatus) || (items.length > 0 ? "partial" : "unknown");
          if(limitedView&&!['capped','unknown'].includes(completenessStatus))completenessStatus='partial';
          if (items.length > 0) {
            updateOverlayStatus((uiLanguage==='en'?`${items.length} records observed.`:`تم رصد ${items.length} سجلًا.`)+(limitedView?(uiLanguage==='en'?' Google is showing a limited view; results are partial.':' يعرض Google نسخة محدودة؛ النتائج جزئية.') : ''), !limitedView,completenessStatus);
          } else {
            updateOverlayStatus(uiLanguage==='en'?(completenessStatus==='confirmed_empty'?'The source returned no results.':'No results could be verified.'):(completenessStatus==='confirmed_empty'?'لم يُرجع المصدر نتائج.':'لم يمكن التحقق من النتائج.'), completenessStatus==='confirmed_empty',completenessStatus);
          }
          activeTask=null;
          preparedTask=null;
          sendResponse({success:true,items,count:items.length,completenessStatus,task:token.task,
            evidence:{url:window.location.href,view,limitedView,emptyVerified:completenessStatus==='confirmed_empty' && hasExplicitNoResults(),dom:domEvidence(),observedAt:new Date().toISOString()}});
        })
        .catch((error) => {
          console.error("[Grid Scraper Content Error]:", error);
          if(activeTask!==token)return sendResponse({success:false,errorCode:'CANCELLED',task:token.task,items:[]});
          activeTask=null;
          if(!token.cancelled)updateOverlayStatus(uiLanguage==='en'?'Collection stopped.':'توقف جمع البيانات.', false,'stopped');
          const harvestedItems = Array.from(currentScrapePlacesMap.values());
          sendResponse({
            success: harvestedItems.length > 0,
            items: harvestedItems,
            count: harvestedItems.length,
            error: error.message,
            errorCode: error.code || 'SCRAPE_FAILED',
            task: token.task
          });
        });

      return true; // إبقاء قناة الاتصال مفتوحة للرد غير المتزامن
    }

    if (request.action === "PING") {
      sendResponse({ status: "ready" });
      return false;
    }
  };
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener(onRuntimeMessage);
    disposers.push(() => { try { chrome.runtime?.onMessage?.removeListener?.(onRuntimeMessage); } catch (_) {} });
  }

  /**
   * شريط الإشعارات العلوي الحي على خريطة جوجل
   */
  function showOverlayStatus(cellInfo,query,jobId=overlayContext?.jobId){
    const ar=uiLanguage!=='en';
    overlayContext={cellInfo,query,jobId};
    let panel=document.getElementById('__gmaps_scraper_overlay');
    if(!panel){panel=document.createElement('aside');panel.id='__gmaps_scraper_overlay';document.body.appendChild(panel);
      try{overlayPosition=JSON.parse(sessionStorage.getItem('dalilOverlayPosition'));}catch(_){}
      let drag=null;
      panel.addEventListener('pointerdown',event=>{
        if(!event.target.closest('[data-dalil-drag]')||event.button>0)return;
        const rect=panel.getBoundingClientRect();drag={x:event.clientX-rect.left,y:event.clientY-rect.top};
        panel.setPointerCapture(event.pointerId);event.preventDefault();
      });
      panel.addEventListener('pointermove',event=>{if(!drag)return;overlayPosition={left:event.clientX-drag.x,top:event.clientY-drag.y};positionOverlay(panel);});
      const finish=()=>{if(!drag)return;drag=null;try{sessionStorage.setItem('dalilOverlayPosition',JSON.stringify(overlayPosition));}catch(_){}};
      panel.addEventListener('pointerup',finish);panel.addEventListener('pointercancel',finish);
      window.addEventListener('resize',()=>positionOverlay(panel));
    }
    panel.setAttribute('aria-live','polite');panel.setAttribute('role','status');
    panel.style.cssText='position:fixed;top:16px;left:16px;z-index:2147483646;width:330px;max-width:calc(100vw - 32px);box-sizing:border-box;background:#102235;color:#eef7ff;border:1px solid #35c5de;border-radius:14px;padding:16px;box-shadow:0 10px 30px #0005;font:13px/1.6 Segoe UI,Tahoma,sans-serif;pointer-events:auto;direction:'+(ar?'rtl':'ltr');
    const cells=cellInfo?.total||1,index=Math.min(cellInfo?.index||0,cells-1),queries=cellInfo?.totalQueries||1,q=Math.min(cellInfo?.currentQueryIndex||0,queries-1);
    const progress=Math.min(100,Math.round((cellInfo?.completedTasks??(q*cells+index))/(queries*cells)*100));
    const cellLabel=(ar?'الخلية ':'Cell ')+(index+1)+' / '+cells;
    const position=(Number.isInteger(cellInfo?.row)?(ar?'الصف ':'Row ')+(cellInfo.row+1)+' · '+(ar?'العمود ':'Column ')+(cellInfo.col+1):'')+
      (cellInfo?.scanTotal>1?' · '+(ar?'فحص تفصيلي ':'Detail scan ')+(cellInfo.scanIndex+1)+' / '+cellInfo.scanTotal:'');
    panel.innerHTML='<div data-dalil-drag title="'+(ar?'اسحب لتحريك اللوحة':'Drag to move')+'" style="display:flex;justify-content:space-between;gap:12px;color:#67e8f9;font-weight:700;cursor:move;touch-action:none"><span>⠿ DALIL</span><span id="__dalil_overlay_phase">'+escapeHtml(ar?'جار البحث':'Searching')+'</span></div>'+
      '<div style="font-size:17px;font-weight:700;overflow-wrap:anywhere;margin:7px 0">'+escapeHtml(query)+'</div>'+
      '<div style="color:#b8cadb">'+escapeHtml(ar?'عبارة البحث ':'Search term ')+'<bdi dir="ltr">'+(q+1)+' / '+queries+'</bdi> · '+escapeHtml(ar?'الخلية ':'Cell ')+'<bdi dir="ltr">'+(index+1)+' / '+cells+'</bdi>'+'</div>'+
      '<div style="font-size:12px;color:#b8cadb">'+escapeHtml(position)+'</div>'+
      '<div id="__dalil_overlay_camera" style="font-size:11px;color:#67e8f9">'+escapeHtml(ar?'تم التحقق من مركز الخلية من رابط الخريطة':'Cell camera confirmed from the map URL')+'</div>'+
      '<div style="height:6px;background:#31485d;border-radius:8px;margin:12px 0 5px;overflow:hidden"><div id="__dalil_overlay_bar" style="height:100%;background:#36c7e5;width:'+progress+'%"></div></div>'+
      '<div style="display:flex;justify-content:space-between;font-size:11px;color:#b8cadb"><span>'+escapeHtml(ar?'تقدم المهام المجدولة':'Scheduled task progress')+'</span><span id="__dalil_overlay_percent">'+progress+'%</span></div>'+
      '<div id="__dalil_overlay_detail" style="border-top:1px solid #31485d;padding-top:8px;margin-top:8px">'+escapeHtml(ar?'جار تحميل نتائج الخلية…':'Loading cell results…')+'</div>';
    positionOverlay(panel);
  }
  function positionOverlay(panel){
    const p=overlayPosition||{left:16,top:16};
    const rect=panel.getBoundingClientRect();
    panel.style.left=Math.max(8,Math.min(Number(p.left)||16,window.innerWidth-rect.width-8))+'px';
    panel.style.top=Math.max(8,Math.min(Number(p.top)||16,window.innerHeight-rect.height-8))+'px';
  }
  function updateOverlayStatus(text,success=true,phase="collecting"){
    const panel=document.getElementById('__gmaps_scraper_overlay');if(!panel)return;
    panel.style.borderColor=success?'#36c7e5':'#f7ae54';
    const detail=document.getElementById('__dalil_overlay_detail');if(detail)detail.textContent=String(text);
    const ar=uiLanguage!=='en';
    const labels={collecting:ar?'جار البحث':'Searching',complete:ar?'انتهت قراءة الخلية':'Cell completed',confirmed_empty:ar?'انتهى الفحص · لا نتائج':'Checked · no results',partial:ar?'نتائج جزئية':'Partial results',capped:ar?'بلغ حد النتائج':'Result limit reached',unknown:ar?'نتائج غير محسومة':'Unverified result',paused:ar?'متوقف مؤقتًا':'Paused',stopped:ar?'توقفت المهمة':'Stopped',completed:ar?'انتهى البحث المجدول':'Scheduled search finished'};
    const heading=document.getElementById('__dalil_overlay_phase');if(heading)heading.textContent=labels[phase]||labels.collecting;
    // Progress is committed by the worker, never inferred from a DOM scrape finishing.

  }

  /**
   * التحقق المكاني الصارم والدقيق:
   * 1. التحقق من الوقوع داخل منطقة الدراسة المعتمدة (BBox أو Polygon أو MultiPolygon مع الثقوب).
   * 2. المعالم مجهولة الإحداثيات تُقبل بدون هندسة مكانية لحفظها في سجل المراجعة، وتُرفض النقاط الشاذة خارج النطاق.
   */
  function isPlaceInStudyOrCell(x, y, cellInfo) {
    if (!cellInfo) return true;
    if (x == null || y == null) {
      return true; // المعالم بدون إحداثيات موثوقة لا تُسقط مبكراً بل تُحفظ كمعالم قيد التدقيق (Pending Geocode)
    }
    if(typeof x!=='number' || typeof y!=='number' || !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x)>180 || Math.abs(y)>90)return false;

    // 1. الفحص الصارم لمنطقة الدراسة المعتمدة (Study Area Bounding Gate)
    if (cellInfo.studyArea) {
      if (typeof SpatialUtils !== "undefined" && typeof SpatialUtils.isPointInStudyArea === "function") {
        return SpatialUtils.isPointInStudyArea(x, y, cellInfo.studyArea);
      }
    }
    if (cellInfo.studyAreaBounds) {
      return isWithinCellBounds(x, y, cellInfo.studyAreaBounds, 0);
    }

    // 2. إذا توفرت حدود الخلية الفردية فقط
    if (cellInfo.bounds) {
      return isWithinCellBounds(x, y, cellInfo.bounds, 0);
    }

    return true;
  }

  /**
   * الدالة الرئيسية للفحص والاستخراج المكاني الصارم والتجميع التدريجي (Progressive Harvesting)
   */
  async function scrapeGoogleMaps(maxItems, scrollDelay, cellInfo) {
    assertActive();
    // 1. مهلة استقرار أولية بعد تحميل الصفحة
    await sleep(2200);
    verifyPreparedCamera();

    // 2. التحقق مما إذا تحول الرابط تلقائياً إلى صفحة مكان واحد محدد (/maps/place/)
    const singlePlace = checkSinglePlace(cellInfo);
    if (singlePlace) {
      return {
        success: true,
        items: [singlePlace],
        completenessStatus: "complete",
        totalHarvested: 1
      };
    }

    // 3. انتظار حاوية النتائج div[role="feed"] أو بطاقات المعالم بمهلة ذكية وتكيفية
    const feed = await waitForFeed(12000);

    if (!feed) {
      // فحص أخير للتأكد من وجود مكان فردي أو بطاقات عامة
      const singleFallback = checkSinglePlace(cellInfo);
      if (singleFallback) {
        return {
          success: true,
          items: [singleFallback],
          completenessStatus: "complete",
          totalHarvested: 1
        };
      }

      const fallbackCards = extractCardsFromDocument(cellInfo);
      if (fallbackCards.length > 0) {
        return {
          success: true,
          items: fallbackCards,
          completenessStatus: "partial",
          totalHarvested: fallbackCards.length
        };
      }

      return {
        success: true,
        items: [],
        completenessStatus: hasExplicitNoResults() ? 'confirmed_empty' : 'unknown',
        totalHarvested: 0
      };
    }

    // 5. قد تُعاد الحاوية قبل رسم البطاقات؛ الانتظار يمنع نتيجة صفرية كاذبة.
    //    خرائط Google تُكمل تحميل القائمة بعد اكتمال المستند، وأحيانًا بعد عشرات الثواني.
    await waitForFirstCards(feed, 12000);
    // البطاقات غائبة ولم يعلن Google الخلو: نطلب تحديث النتائج لهذه المنطقة مرة واحدة.
    if(!feed.querySelector('a[href*="/maps/place/"], a.hfpxzc') && !hasExplicitNoResults() && clickSearchThisAreaIfPresent()){
      await waitForFirstCards(feed, 10000);
    }

    // 5b. التجميع التدريجي المستمر (Progressive Harvesting) عبر خريطة هويات لمنع فقدان العناصر المعادة تدويرها في الـ DOM
    const harvestedPlacesMap = currentScrapePlacesMap;
    harvestedPlacesMap.clear();

    const harvestBatch = () => {
      const batch = extractPlacesFromFeed(feed, cellInfo);
      batch.forEach(p => {
        const key = p.place_id || p.cid || p.id || p.url || (p.name + "_" + (p.x ?? 'missing') + "_" + (p.y ?? 'missing'));
        if (!harvestedPlacesMap.has(key)) {
          harvestedPlacesMap.set(key, p);
        }
      });
      updateOverlayStatus(uiLanguage==='en'?`Loading results · ${harvestedPlacesMap.size} records observed`:`جار تحميل النتائج · رُصد ${harvestedPlacesMap.size} سجلًا`);
      // القائمة التي يعيدها Google ليست عن الخلية وحدها: يمزج فيها أماكن بعيدة.
      // لذا ميزانية القراءة تُحسب بما وقع داخل الخلية، لا بكل ما رُصد. وإلا
      // توقّف التمرير عند 120 بطاقة بعيدة قبل الوصول إلى معالم الخلية نفسها.
      return countInCell();
    };

    const countInCell = () => {
      const bounds = cellInfo && (cellInfo.bounds || cellInfo.studyAreaBounds);
      if (!bounds) return harvestedPlacesMap.size;
      let count = 0;
      harvestedPlacesMap.forEach(p => {
        if (p.x != null && p.y != null && isWithinCellBounds(p.x, p.y, bounds, 0)) count++;
      });
      return count;
    };

    // 6. التمرير الذكي الاهتزازي لقائمة النتائج مع التجميع عند كل دورة
    // Capture DOM batches that appear and disappear between scroll ticks.
    // كل طفرة DOM تستدعي harvestBatch كاملة كانت تُجمّد الصفحة؛ نجمع الطفرات في دفعة واحدة.
    let harvestScheduled=false;
    const scheduleHarvest=()=>{if(harvestScheduled)return;harvestScheduled=true;setTimeout(()=>{harvestScheduled=false;harvestBatch();},250);};
    const observer=typeof MutationObserver==='function'?new MutationObserver(scheduleHarvest):null;
    observer?.observe(feed,{childList:true,subtree:true});
    let completeness;
    try{completeness=await smartAutoScrollFeed(feed, maxItems, scrollDelay, cellInfo, harvestBatch);}
    finally{observer?.disconnect();}
    harvestBatch();

    const items = inCellFirst(Array.from(harvestedPlacesMap.values()), cellInfo).slice(0,maxItems);
    return {
      success: true,
      items,
      completenessStatus: items.length === 0 ? (hasExplicitNoResults()?'confirmed_empty':'unknown') : completeness,
      totalHarvested: items.length
    };
  }

  /**
   * النقر التلقائي على زر "البحث في هذه المنطقة"
   */
  // Source-language parsing is independent of DALIL's Arabic/English HUD.
  // Wording changes or unknown messages remain unverified; these are conservative
  // linguistic variants, not a guarantee of Google DOM behavior in every locale.
  const SOURCE_SIGNALS = {
    search: ["البحث في هذه المنطقة", "search this area", "rechercher dans cette zone", "buscar en esta zona", "in diesem bereich suchen", "pesquisar nesta área", "buscar nesta área", "cerca in questa zona", "検索エリアを再設定", "このエリアを検索", "搜索此区域", "搜尋這個區域", "搜尋此區域", "इस क्षेत्र में खोजें", "이 지역 검색", "искать в этой области", "bu alanda ara", "telusuri area ini", "cari di area ini", "tìm trong khu vực này", "zoeken in dit gebied", "szukaj w tym obszarze", "ค้นหาบริเวณนี้"],
    empty: ["لم يعثر Google Maps على أي نتائج", "لم يتم العثور على أي نتائج", "لا تتوفر نتائج في هذه المنطقة", "لا توجد نتائج في هذا النطاق", "لا توجد نتائج", "no results found", "google maps can't find", "aucun résultat trouvé", "aucun résultat", "google maps ne trouve aucun résultat", "no se encontraron resultados", "no hay resultados", "keine ergebnisse gefunden", "keine ergebnisse", "nenhum resultado encontrado", "não foram encontrados resultados", "nenhum resultado", "nessun risultato trovato", "nessun risultato", "検索結果が見つかりません", "検索結果が見つかりませんでした", "該当する検索結果はありません", "結果が見つかりませんでした", "未找到任何结果", "未找到结果", "找不到结果", "沒有搜尋結果", "找不到任何結果", "कोई नतीजा नहीं मिला", "कोई परिणाम नहीं मिला", "검색결과가 없습니다", "검색 결과가 없습니다", "ничего не найдено", "результаты не найдены", "sonuç bulunamadı", "tidak ada hasil", "tidak ditemukan hasil", "không tìm thấy kết quả", "geen resultaten gevonden", "nie znaleziono wyników", "ไม่พบผลลัพธ์", "نتیجه‌ای یافت نشد", "کوئی نتیجہ نہیں ملا"],
    end: ["نهاية القائمة", "وصلت إلى نهاية القائمة", "لقد وصلت إلى نهاية القائمة", "you've reached the end of the list", "you have reached the end of the list", "vous êtes arrivé à la fin de la liste", "vous avez atteint la fin de la liste", "has llegado al final de la lista", "llegaste al final de la lista", "sie haben das ende der liste erreicht", "você chegou ao final da lista", "chegou ao fim da lista", "hai raggiunto la fine dell'elenco", "リストの最後に到達しました", "リストの最後です", "您已看完所有结果", "已显示所有结果", "已顯示所有結果", "你已查看完所有结果", "आप सूची के अंत तक पहुंच गए हैं", "आप सूची के अंत तक पहुँच गए हैं", "목록의 끝에 도달했습니다", "вы достигли конца списка", "вы просмотрели весь список", "listenin sonuna ulaştınız", "anda telah mencapai akhir daftar", "bạn đã đến cuối danh sách", "u heeft het einde van de lijst bereikt", "je hebt het einde van de lijst bereikt"],
    website: ["website", "web site", "موقع إلكتروني", "الموقع الإلكتروني", "site web", "sitio web", "página web", "webseite", "sito web", "ウェブサイト", "网站", "網站", "वेबसाइट", "웹사이트", "сайт", "web sitesi", "situs web", "trang web", "เว็บไซต์"],
    phone: ["phone", "telephone", "هاتف", "الهاتف", "téléphone", "teléfono", "telefon", "telefone", "telefono", "電話", "电话", "फ़ोन", "फोन", "전화", "телефон", "telepon", "điện thoại", "เบอร์โทร"],
    hours: ["hours", "opening hours", "ساعات العمل", "horaires", "heures d'ouverture", "horario", "horários", "öffnungszeiten", "orari", "営業時間", "营业时间", "營業時間", "खुलने का समय", "영업시간", "часы работы", "çalışma saatleri", "jam buka", "giờ mở cửa", "openingstijden"],
    reviews: ["reviews", "review", "تقييم", "تقييمات", "مراجعة", "مراجعات", "avis", "reseñas", "opiniones", "bewertungen", "rezensionen", "avaliações", "avaliação", "recensioni", "recensione", "件のクチコミ", "クチコミ", "口コミ", "レビュー", "条评价", "条评论", "則評論", "則評價", "评价", "评论", "評價", "評論", "समीक्षाएं", "समीक्षाएँ", "समीक्षा", "रिव्यू", "리뷰", "отзывов", "отзыва", "отзыв", "yorum", "ulasan", "đánh giá", "recensies", "opinii"],
    rating: ["stars", "star", "نجوم", "نجمة", "étoiles", "étoile", "estrellas", "estrella", "sterne", "stern", "estrelas", "estrela", "stelle", "stella", "つ星", "星", "सितारे", "सितारा", "별", "звезд", "звёзд", "yıldız", "bintang", "sao", "sterren"],
    status: ["مفتوح", "مغلق", "يفتح", "يغلق", "open", "closed", "opens", "closes", "ouvert", "fermé", "ferme", "ouvre", "abierto", "cerrado", "abre", "cierra", "geöffnet", "geschlossen", "öffnet", "schließt", "aberto", "fechado", "fecha", "aperto", "chiuso", "営業時間外", "営業中", "営業終了", "营业中", "營業中", "已打烊", "已關閉", "已关闭", "खुला है", "बंद है", "खुलता है", "영업 중", "영업 종료", "открыто", "закрыто", "açık", "kapalı", "buka", "tutup", "đang mở cửa", "đã đóng cửa"],
    amenities: ["توصيل", "سفري", "صالة طعام", "تناول في المكان", "داخل المتجر", "استلام من المتجر", "dine-in", "takeout", "takeaway", "delivery", "in-store pickup", "sur place", "à emporter", "livraison", "para llevar", "a domicilio", "entrega", "retiro en tienda", "zum mitnehmen", "lieferdienst", "lieferung", "vor ort", "refeições no local", "para viagem", "retirada na loja", "asporto", "consegna a domicilio", "店内飲食", "テイクアウト", "宅配", "堂食", "外带", "外帶", "外卖", "外送", "डिलीवरी", "टेकअवे", "배달", "포장"]
  };
  const patternEscape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const signalText = value => String(value || '').normalize('NFKC').replace(/[\u200e\u200f\u061c]/g, '').replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim().toLocaleLowerCase();
  const normalizedSignals = Object.fromEntries(Object.entries(SOURCE_SIGNALS).map(([kind,values]) => [kind, values.map(signalText)]));
  const reviewTermPattern = new RegExp('(?:' + [...normalizedSignals.reviews].sort((a,b)=>b.length-a.length).map(patternEscape).join('|') + ')', 'iu');
  const ratingTermPattern = new RegExp('(?:' + [...normalizedSignals.rating].sort((a,b)=>b.length-a.length).map(patternEscape).join('|') + ')', 'iu');
  function pageLocale() {
    const declared = typeof document !== 'undefined' && (document.documentElement?.lang || document.documentElement?.getAttribute?.('lang'));
    const urlLocale = typeof window !== 'undefined' && window.location?.href ? new URL(window.location.href).searchParams.get('hl') : '';
    const locale = String(declared || urlLocale || 'en').replace(/_/g, '-');
    try { return Intl.getCanonicalLocales(locale)[0] || 'en'; } catch (_) { return 'en'; }
  }
  function matchesSourceSignal(value,kind) {
    const text = signalText(value), phrases = normalizedSignals[kind] || [];
    if (!text) return false;
    if (kind === 'search') return phrases.includes(text);
    const lines = String(value || '').split(/[\r\n]+/).map(signalText).filter(Boolean);
    return lines.some(line => phrases.some(phrase => {
      if (line === phrase || line.replace(/[.!。！]+$/, '') === phrase) return true;
      // Only explicit no-result phrases can precede a quoted query or a known
      // "for query" delimiter. A fragment in an arbitrary description is not evidence.
      if (kind !== 'empty' || !line.startsWith(phrase)) return false;
      const suffix = line.slice(phrase.length);
      return /^(?:\s+(?:for|pour|für|para|per|по запросу)\b|\s*[:："“«「『])/.test(suffix) || phrase === "google maps can't find" && /^\s/.test(suffix);
    }));
  }
  function fieldLabelMatches(value,kind) {
    const text = signalText(value);
    if (!text) return false;
    return (normalizedSignals[kind] || []).some(term => {
      const index = text.indexOf(term);
      if (index < 0) return false;
      // Avoid e.g. "telephone" matching part of a business name in an aria label.
      const before = text.slice(0,index), after = text.slice(index+term.length);
      return (!before || /[\s:：·(]$/.test(before)) && (!after || /^[\s:：·)\d]/.test(after));
    });
  }
  function findLabeledElement(scope,kind,selector='button, a, div[aria-label]') {
    if (!scope?.querySelectorAll) return null;
    return Array.from(scope.querySelectorAll(selector)).find(element => ['aria-label','data-tooltip','data-value','title'].some(attribute => fieldLabelMatches(element.getAttribute(attribute),kind))) || null;
  }
  function hasHoursText(value) {
    const text=signalText(value);
    if (!text) return false;
    if (/^(?:24\s*(?:hours?|heures|horas?|stunden|h\b|ساعة)|24時間|24小时|24小時)/i.test(text)) return true;
    if (normalizedSignals.hours.some(term => text===term || text.startsWith(term+':') || text.startsWith(term+'：'))) return true;
    return normalizedSignals.status.some(term => {
      if (text===term) return true;
      if (!text.startsWith(term)) return false;
      const suffix=text.slice(term.length);
      return /^[·⋅•:：،,–—-]/.test(suffix.trim()) || /^\s+(?:\d|now\b|until\b|at\b|jusqu|à\b|bis\b|um\b|hasta\b|las\b|até\b|às\b|alle\b|إلى|حتى|الآن)/u.test(suffix);
    });
  }
  function hasAmenityText(value) {
    const text=signalText(value);
    return normalizedSignals.amenities.some(term => text===term || text.includes(term));
  }

  // Fold decimal digits only in a search/number parsing copy, never in place labels.
  const decimalZeroCodePoints = [0x0660,0x06f0,0x0966,0x09e6,0x0a66,0x0ae6,0x0b66,0x0be6,0x0c66,0x0ce6,0x0d66,0x0de6,0x0e50,0x0ed0,0x0f20,0x1040,0x1090,0x17e0,0x1810,0x1946,0x19d0,0x1a80,0x1a90,0x1b50,0x1bb0,0x1c40,0x1c50,0xa620,0xa8d0,0xa900,0xa9d0,0xa9f0,0xaa50,0xabf0,0xff10];
  const localeNumberCache = new Map();
  function normalizedDigits(value) {
    return Array.from(String(value ?? '').normalize('NFKC'),character => {
      const code=character.codePointAt(0),zero=decimalZeroCodePoints.find(start=>code>=start&&code<start+10);
      return zero==null?character:String(code-zero);
    }).join('').replace(/[\u200e\u200f\u061c]/g,'').replace(/\u066b/g,'.').replace(/\u066c/g,',');
  }
  function parseSourceNumber(value,kind='count',locale=pageLocale()) {
    let text=normalizedDigits(value).trim().replace(/^[（(]\s*|\s*[)）]$/g,'');
    if (!text || !/^[\d.,'’\s]+$/.test(text) || !/^\d/.test(text) || !/\d$/.test(text)) return null;
    if (kind==='rating') {
      // Star ratings are bounded; a grouping mark or an unknown suffix is never
      // interpreted as a rating, and we retain the original formatted evidence.
      if (!/^\d(?:[.,]\d{1,2})?$/.test(text)) return null;
      const number=Number(text.replace(',','.'));
      return Number.isFinite(number)&&number>=0&&number<=5?number:null;
    }
    let metadata=localeNumberCache.get(locale);
    if(!metadata){
      metadata={group:',',groupSizes:[3]};
      try {
        const parts=new Intl.NumberFormat(locale,{useGrouping:true}).formatToParts(123456789);
        metadata.group=normalizedDigits(parts.find(part=>part.type==='group')?.value || ',');
        const lengths=parts.filter(part=>part.type==='integer').map(part=>normalizedDigits(part.value).length);
        metadata.groupSizes=[lengths[lengths.length-1],lengths.length>2?lengths[lengths.length-2]:lengths[lengths.length-1]];
      } catch (_) { /* Invalid locale uses a conservative en-style grouping check. */ }
      if(localeNumberCache.size>=64)localeNumberCache.clear();
      localeNumberCache.set(locale,metadata);
    }
    const {group,groupSizes}=metadata;
    if (/^\d+$/.test(text)) { const number=Number(text);return Number.isSafeInteger(number)?number:null; }
    // Spaces/apostrophes are accepted only as correctly sized grouping separators.
    const allowed = new Set([group, ...(group.trim()===''?[' ']:[]), "'", '’']);
    const separators=Array.from(text).filter(character=>!/[0-9]/.test(character));
    if (separators.some(separator=>!allowed.has(separator) && !(separator===' '&&group.trim()===''))) return null;
    const chunks=text.split(/[.,'’\s]+/);
    if(chunks.some(chunk=>!/^\d+$/.test(chunk)))return null;
    const [rightSize,middleSize=rightSize]=groupSizes;
    if(chunks[chunks.length-1].length!==rightSize || chunks[0].length<1 || chunks[0].length>middleSize || chunks.slice(1,-1).some(chunk=>chunk.length!==middleSize))return null;
    const number=Number(chunks.join(''));
    return Number.isSafeInteger(number)?number:null;
  }
  function parseRatingText(value,locale=pageLocale(),numericContext=false) {
    const text=normalizedDigits(value).trim();
    if(numericContext){const direct=parseSourceNumber(text,'rating',locale);if(direct!=null)return direct;}
    if(!ratingTermPattern.test(signalText(text)))return null;
    // Japanese labels can read "5つ星のうち4.7"; the denominator is not the score.
    const japanese=text.match(/5\s*つ星のうち\s*([0-9](?:[.,][0-9]{1,2})?)/);
    if(japanese)return parseSourceNumber(japanese[1],'rating',locale);
    const tokens=text.match(/\d+(?:[.,]\d+)?/g)||[];
    return tokens.length?parseSourceNumber(tokens[0],'rating',locale):null;
  }
  function parseReviewText(value,locale=pageLocale(),numericContext=false) {
    const text=normalizedDigits(value).trim();
    if(numericContext){const direct=parseSourceNumber(text,'count',locale);if(direct!=null)return direct;}
    const parentheses=text.match(/[（(]\s*([\d.,'’\s]+)\s*[)）]/);
    if(parentheses){const result=parseSourceNumber(parentheses[1],'count',locale);if(result!=null)return result;}
    const terms=reviewTermPattern.source;
    const before=text.match(new RegExp("([0-9][0-9.,'’\\s]*)\\s*"+terms,'iu'));
    if(before){const result=parseSourceNumber(before[1],'count',locale);if(result!=null)return result;}
    const after=text.match(new RegExp(terms+"\\s*[:：]?\\s*([0-9][0-9.,'’\\s]*)",'iu'));
    return after?parseSourceNumber(after[1],'count',locale):null;
  }
  function extractRatingMetrics(scope,single=false) {
    const locale=pageLocale();
    const result={rating:'',reviewsCount:'',ratingRaw:'',reviewsCountRaw:'',sourceLocale:locale,reviewsCountApproximate:false};
    if (!scope?.querySelector) return result;
    const ariaElement=scope.querySelector('span[role="img"]');
    const aria=ariaElement?.getAttribute('aria-label')||'';
    let rating=parseRatingText(aria,locale),reviews=parseReviewText(aria,locale);
    if(rating!=null||ratingTermPattern.test(signalText(aria)))result.ratingRaw=aria;
    if(reviews!=null||reviewTermPattern.test(signalText(aria)))result.reviewsCountRaw=aria;
    const explicitRating=scope.querySelector(single?'div.F7nice span[aria-hidden="true"]':'span.MW4etd');
    if(rating==null&&explicitRating){const raw=explicitRating.textContent||'';rating=parseRatingText(raw,locale,true);result.ratingRaw=raw;}
    const explicitReviews=scope.querySelector('span.UY7F9')||findLabeledElement(scope,'reviews','span[aria-label], button[aria-label]');
    if(reviews==null&&explicitReviews){const raw=explicitReviews.getAttribute('aria-label')||explicitReviews.textContent||'';reviews=parseReviewText(raw,locale,true);result.reviewsCountRaw=raw;result.reviewsCountApproximate=reviews==null&&/[0-9][.,0-9\s]*(?:k\b|m\b|mil\b|mio\b|万|萬|亿|億|тыс|हज़ार|हजार|ألف)/iu.test(normalizedDigits(raw));}
    if(reviews==null&&result.reviewsCountRaw)result.reviewsCountApproximate=/[0-9][.,0-9\s]*(?:k\b|m\b|mil\b|mio\b|万|萬|亿|億|тыс|हज़ार|हजार|ألف)/iu.test(normalizedDigits(result.reviewsCountRaw));
    if(rating!=null)result.rating=String(rating);
    if(reviews!=null)result.reviewsCount=String(reviews);
    return result;
  }

  function clickSearchThisAreaIfPresent() {
    if(areaSearchClicked)return false;
    try {
      const buttons = document.querySelectorAll('button, div[role="button"]');
      for (const button of buttons) {
        if(button.disabled||button.getAttribute('aria-hidden')==='true'||(button.getClientRects&&button.getClientRects().length===0))continue;
        if (button.getAttribute("jsaction")?.includes("search_this_area") || [button.textContent, button.getAttribute("aria-label")].some(value => matchesSourceSignal(value,'search'))) {
          areaSearchClicked=true;
          button.click();
          return true;
        }
      }
    } catch (_) {}
    return false;
  }

  function hasLimitedView(){
    const text=document.body?.innerText||'';
    return /طريقة عرض محدودة من|(?:you['’]re|you are) (?:seeing|using) a limited view of google maps/i.test(text);
  }

  /**
   * فحص صارم ومؤكد: هل الصفحة خالية قطعياً من أي نتائج في هذا المربع؟
   * لا تعلن الخلو إلا بوجود نص رسمي دال من جوجل داخل حاوية الرسائل بعد انتهاء مهلة كافية
   */
  function hasExplicitNoResults() {
    if (document.querySelectorAll('a[href*="/maps/place/"], a.hfpxzc, div.Nv2PK').length) return false;
    const box = document.querySelector('div[class*="section-no-result"], div[class*="no-results"]');
    const sourceText = box ? (box.innerText || box.textContent || '') : document.body?.innerText || '';
    return matchesSourceSignal(sourceText,'empty');
  }

  /**
   * تحويل الأرقام العربية المشرقية (٠١٢٣٤٥٦٧٨٩) والفواصل إلى صيغ قياسية
   */
  function normalizeArabicNumerals(str) {
    return normalizedDigits(str);
  }

  /**
   * استخراج وتطهير رقم الهاتف الدولي والمحلي بدقة عالية
   */
  function extractCleanPhone(text) {
    if (!text) return "";
    const normalized = normalizeArabicNumerals(text);
    const match = normalized.slice(0,400).match(/(?:\+|00)?[0-9][0-9().\-\s]{4,80}[0-9]/);
    if (match) {
      const candidate = match[0].trim();
      const digitsOnly = candidate.replace(/\D/g, "");
      if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
        if (digitsOnly.length === 4) return ""; // تجاهل السنوات كـ 2024
        return candidate.replace(/\s+/g, " ");
      }
    }
    return "";
  }

  function phoneFromElement(element) {
    if (!element) return {value:'',raw:''};
    const candidates=[element.textContent,element.getAttribute('aria-label'),element.getAttribute('data-tooltip')];
    const href=element.getAttribute('href')||element.href||'';
    if (/^tel:/i.test(href)) { try { candidates.unshift(decodeURIComponent(href.slice(4))); } catch (_) {} }
    for (const raw of candidates) { const value=extractCleanPhone(raw); if(value)return {value,raw:String(raw)}; }
    return {value:'',raw:''};
  }

  /**
   * تنظيف وفك روابط المواقع الخارجية من وسائط إعادة توجيه جوجل
   */
  function cleanWebsiteUrl(rawUrl) {
    if (!rawUrl) return "";
    try {
      if (rawUrl.includes("google.com/url?") || rawUrl.includes("/url?q=")) {
        const u = new URL(rawUrl, window.location.href);
        const target = u.searchParams.get("q") || u.searchParams.get("url");
        if (target && !target.includes("google.com/maps")) {const parsed=new URL(target);return /^https?:$/.test(parsed.protocol)?parsed.href:'';}
      }
    } catch (e) {}
    if (rawUrl.includes("google.com/maps") || rawUrl.includes("google.com/search")) return "";
    try {const parsed=new URL(rawUrl);return /^https?:$/.test(parsed.protocol)?parsed.href:'';}catch(_){return '';}
  }

  /**
   * استخراج رمز الموقع المفتوح (Plus Code)
   */
  function extractPlusCode(text) {
    if (!text) return "";
    const match = text.match(/\b([23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,4}(?:,\s*[\w\u0600-\u06FF\s]+)?)\b/i);
    return match ? match[1].trim() : "";
  }

  /**
   * استخراج معرف جوجل الدائم (Place ID و CID الرقمي الحقيقي) من الرابط
   */
  function extractPlaceIdAndCid(url) {
    let placeId = "";
    let cid = "";
    if (!url) return { placeId, cid };

    const hexMatch = url.match(/1s(0x[0-9a-fA-F]+):(0x[0-9a-fA-F]+)/);
    if (hexMatch) {
      placeId = `${hexMatch[1]}:${hexMatch[2]}`;
      try {
        cid = BigInt(hexMatch[2]).toString(10);
      } catch (e) {}
    }

    const chMatch = url.match(/!1s(ChIJ[A-Za-z0-9_-]+)/);
    if (chMatch) {
      placeId = placeId ? `${placeId} | ${chMatch[1]}` : chMatch[1];
    }

    return { placeId, cid };
  }

  /**
   * استخراج مستوى الأسعار ($$, $$$, £, أو نص التكلفة)
   */
  function extractPriceLevel(text) {
    if (!text) return "";
    const m = text.match(/(\${1,4}|£{1,4}|€{1,4}|[ججرر]\.[مس]\.?\s*\d+[–-]\d+|رخيص|متوسط التكلفة|فاخر|أسعار معقولة|غير مكلف)/);
    return m ? m[0] : "";
  }

  /**
   * التحقق مما إذا كان الرابط قد فتح صفحة منشأة فردية (/maps/place/)
   * مع التأكد من أن المنشأة تقع فعلياً داخل حدود الخلية واستخراج كافة التفاصيل المتاحة
   */
  function checkSinglePlace(cellInfo) {
    const currentUrl = window.location.href;

    // روابط البحث /maps/search/ ليست مكاناً فردياً إطلاقاً!
    if (!currentUrl.includes("/maps/place/") || currentUrl.includes("/maps/search/")) {
      return null;
    }

    const titleEl = document.querySelector('h1.DUwDvf, h1[class*="fontHeadlineLarge"]');
    if (!titleEl || !titleEl.textContent.trim()) {
      return null;
    }

    const name = titleEl.textContent.trim();
    let coords = extractCoordinatesFromUrl(currentUrl);

    // إذا تعذر استخراج إحداثيات دقيقة، نحفظ السجل بدون تلفيق إحداثيات اصطناعية (P0-04)
    let isApproxCoords = false;
    if (!coords || !coords.hasExactCoords) {
      coords = {
        x: null,
        y: null,
        hasExactCoords: false,
        coordinateSource: (coords && coords.coordinateSource) || "missing",
        coordinateConfidence: (coords && coords.coordinateConfidence) || "none",
        isApproximate: true
      };
      isApproxCoords = true;
    }

    // الملكية النهائية تُقرَّر في background عبر findOwnerCell؛ لا نُسقط السجل هنا
    // حتى يظهر عدّاد outsideCount الحقيقي بدل خسارة صامتة.

    let category = "";
    const catEl = document.querySelector('button[jsaction*="category"], button.DkEaL, span[class*="fontBodyMedium"]');
    if (catEl) category = catEl.textContent.trim();

    let address = "";
    const addrBtn = document.querySelector('button[data-item-id*="address"]');
    if (addrBtn) address = addrBtn.textContent.trim();

    let phone = "", phoneRaw = "";
    const phoneBtn = document.querySelector('button[data-item-id*="phone"], a[href^="tel:"]') || findLabeledElement(document,'phone','button, a[href]');
    if (phoneBtn) {
      const extracted=phoneFromElement(phoneBtn); phone=extracted.value; phoneRaw=extracted.raw;
    }

    let website = "";
    const webBtn = document.querySelector('a[data-item-id*="authority"], a[aria-label*="موقع"], a[aria-label*="website"]') || findLabeledElement(document,"website","a[href]");
    if (webBtn && webBtn.href) {
      website = cleanWebsiteUrl(webBtn.href);
    }

    let status = "";
    let openingHours = "";
    const statusEl = document.querySelector('span[class*="ZDu9vd"], span.fontBodyMedium[style*="color: rgb(24, 128, 56)"], span.fontBodyMedium[style*="color: rgb(217, 48, 37)"]');
    if (statusEl) {
      status = statusEl.textContent.trim();
      openingHours = status;
    }
    const hoursBtn = document.querySelector('div[aria-label*="ساعات العمل"], div[aria-label*="Hours"], div.t39EBd, span[class*="o0Svhf"]') || findLabeledElement(document,'hours');
    if (hoursBtn) {
      const hText = hoursBtn.textContent.trim();
      if (hText) openingHours = hText;
    }

    let name_en = "";
    const englishMatch = name.match(/[\(\[]([A-Za-z0-9\s.,'&-]+)[\)\]]/);
    if (englishMatch) {
      name_en = englishMatch[1].trim();
    }

    const { rating, reviewsCount, ratingRaw, reviewsCountRaw, sourceLocale, reviewsCountApproximate } = extractRatingMetrics(document, true);

    // الرمز المفتوح Plus Code
    const plusCodeBtn = document.querySelector('button[data-item-id="oloc"]');
    let plusCode = plusCodeBtn ? extractPlusCode(plusCodeBtn.textContent) : extractPlusCode(document.body.innerText);

    // مستوى الأسعار
    const priceLevel = extractPriceLevel(document.body.innerText);

    // معرفات جوجل
    const { placeId, cid } = extractPlaceIdAndCid(currentUrl);

    // صورة المعلم
    const imgEl = document.querySelector('button[jsaction*="heroHeaderImage"] img, img[src*="googleusercontent.com"], img[src*="ggpht.com"]');
    const thumbnailUrl = imgEl ? imgEl.src : "";

    // الخدمات والمزايا
    const amenityElements = document.querySelectorAll('div[aria-label*="خدمات"], div.E0dtEd, div[jsaction*="amenity"]');
    const attributes = Array.from(amenityElements)
      .map((el) => el.textContent.trim())
      .filter(Boolean)
      .slice(0, 4)
      .join(" · ");

    return {
      id: generatePlaceId(name, coords.x, coords.y, cid, placeId),
      name,
      name_en,
      category,
      x: coords.x,
      y: coords.y,
      hasExactCoords: coords.hasExactCoords,
      coordinateSource: coords.coordinateSource || (coords.hasExactCoords ? "exact_place_geometry" : "missing"),
      coordinateConfidence: coords.coordinateConfidence || (coords.hasExactCoords ? "high" : "none"),
      isApproximate: isApproxCoords,
      record_status: coords.hasExactCoords ? "verified" : "pending_geocode",
      address,
      phone,
      phoneRaw,
      website,
      status,
      opening_hours: openingHours,
      rating,
      reviewsCount,
      ratingRaw, reviewsCountRaw, sourceLocale, reviewsCountApproximate,
      plus_code: plusCode,
      price_level: priceLevel,
      place_id: placeId,
      cid,
      thumbnail_url: thumbnailUrl,
      attributes,
      url: currentUrl,
      source: "Google Maps",
      searchKeyword: cellInfo ? (cellInfo.query || cellInfo.searchKeyword || "") : "",
      cellId: cellInfo ? cellInfo.id : null,
      cellName: cellInfo ? cellInfo.name : null,
      discoveryCellId: cellInfo ? cellInfo.id : null,
      discoveryCellName: cellInfo ? cellInfo.name : null,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * انتظار ظهور حاوية النتائج div[role="feed"] بمهلة تكيفية متوازنة وسريعة
   */
  function waitForFeed(timeoutMs = 5000) {
    const token=activeTask;
    return new Promise((resolve,reject) => {
      const startTime = Date.now();
      const check = () => {
        try{assertActive(token);}catch(error){reject(error);return;}
        // محاولة دورية للنقر على زر "البحث في هذه المنطقة" في حال ظهر متأخراً
        if(clickSearchThisAreaIfPresent()){setTimeout(check,500);return;}

        const feed = document.querySelector('div[role="feed"]');
        if (feed) {
          resolve(feed);
          return;
        }

        const elapsed = Date.now() - startTime;
        // إنهاء سريع وذكي للخلايا الخالية فور تأكيد جوجل (سرعة استجابة متوازنة دون تعليق)
        if (elapsed > 1800 && hasExplicitNoResults()) {
          resolve(null);
          return;
        }

        if (elapsed > timeoutMs) {
          resolve(null);
          return;
        }
        setTimeout(check, 250);
      };
      check();
    });
  }

  /**
   * Google قد يعيد حاوية النتائج قبل رسم البطاقات فعلًا (SPA). الانتظار القصير
   * يمنع «0 سجل» الكاذب بدل إعلان خلية فارغة قبل أن تُرسم.
   */
  function waitForFirstCards(feed, timeoutMs = 7000) {
    const token = activeTask;
    return new Promise((resolve) => {
      const start = Date.now();
      const check = () => {
        try { assertActive(token); } catch (_) { resolve(false); return; }
        if (feed.querySelector('a[href*="/maps/place/"], a.hfpxzc, div.Nv2PK')) { resolve(true); return; }
        if (hasExplicitNoResults() || Date.now() - start >= timeoutMs) { resolve(false); return; }
        setTimeout(check, 300);
      };
      check();
    });
  }

  /**
   * التمرير التلقائي الذكي مع حركة اهتزازية وتقنية scrollIntoView والتجميع التدريجي لمنع فقدان البيانات الافتراضية
   */
  async function smartAutoScrollFeed(feed, maxItems, delay, cellInfo = null, onHarvestBatch = null) {
    let lastItemsCount = -1;
    let lastHeight = -1;
    const observedLinks=new Set();
    let unchangedAttempts = 0;
    let scrolls = 0;
    // التمرير يتوقف عند استقرار القائمة؛ هذا الحد احتياطي فقط (كان 120 محاولة × 1.1 ث).
    const maxScrollAttempts = Math.min(120, Math.max(24, Math.ceil(maxItems / 2) + 12));
    let completenessStatus = "partial";

    // تجميع أولي فوري قبل بدء التمرير
    if (onHarvestBatch) onHarvestBatch();

    while (scrolls < maxScrollAttempts) {
      assertActive();
      scrolls++;

      feed.scrollTop = Math.min(feed.scrollHeight,feed.scrollTop+Math.max(200,(feed.clientHeight||600)*0.8));
      feed.dispatchEvent(new Event("scroll", { bubbles: true }));

      // استدعاء scrollIntoView للطرف الأخير لتحفيز الـ IntersectionObserver في خرائط جوجل
      if (feed.lastElementChild && feed.scrollTop+(feed.clientHeight||600)>=feed.scrollHeight-10) {
        try {
          feed.lastElementChild.scrollIntoView({ behavior: "instant", block: "end" });
        } catch (e) {}
      }

      await sleep(delay);

      // استخراج تدريجي مستمر لحفظ المعالم قبل أن يقوم محرك خرائط جوجل بإزالتها من الـ DOM (Virtualization Safety)
      if (onHarvestBatch) {
        const harvestedCount = onHarvestBatch();
        if (harvestedCount >= maxItems) {
          completenessStatus = "capped";
          break;
        }
      }

      const currentLinks = feed.querySelectorAll('a[href*="/maps/place/"], a.hfpxzc');
      currentLinks.forEach(link=>observedLinks.add(link.href));
      const count = Math.max(observedLinks.size,onHarvestBatch?onHarvestBatch():0);

      const endMarkers = feed.querySelectorAll('span.HlvSq, div.HlvSq, div[class*="fontBodyMedium"]:last-child');
      if (Array.from(endMarkers).some(marker=>!marker.closest?.('div.Nv2PK, div[role="article"], a[href*="/maps/place/"]') && matchesSourceSignal(marker.textContent, "end"))) {
        completenessStatus = "complete";
        break;
      }

      if (count === lastItemsCount && feed.scrollHeight===lastHeight) {
        unchangedAttempts++;

        feed.scrollTop = Math.max(0, feed.scrollHeight - 70);
        feed.dispatchEvent(new Event("scroll", { bubbles: true }));
        await sleep(200);

        feed.scrollTop = feed.scrollHeight;
        feed.dispatchEvent(new Event("scroll", { bubbles: true }));
        await sleep(delay);

        if (onHarvestBatch) onHarvestBatch();

        if (unchangedAttempts >= 4) {
          break;
        }
      } else {
        unchangedAttempts = 0;
        lastItemsCount = count;
        lastHeight = feed.scrollHeight;
      }
    }

    return completenessStatus;
  }

  /**
   * تنظيف وتجريد تصنيف المعلم من أسماء الأماكن والتقييمات وأرقام المراجعات الملتصقة به
   */
  function cleanExtractedCategory(candidate, placeName) {
    if (!candidate || typeof candidate !== "string") return "";
    let clean = candidate.trim();
    if (placeName && clean.includes(placeName)) {
      clean = clean.replace(placeName, "").trim();
    }
    clean = clean.replace(/\d+(\.\d+)?\s*\(\d+[\d,]*\)/g, "")
                 .replace(/★\s*\d+(\.\d+)?/g, "")
                 .replace(/^[\s·•\-\,\/:]+|[\s·•\-\,\/:]+$/g, "")
                 .trim();
    if (hasHoursText(clean) || parseReviewText(clean)!=null || parseRatingText(clean)!=null || /^\p{Nd}+$/u.test(clean)) return "";
    if (clean.length > 50) return "";
    return clean;
  }

  /**
   * استخراج عناصر الفروع من القائمة مع التدقيق المكاني الصارم (Spatial Bounding Gate)
   * واستخراج أعلى وأدق تفاصيل متاحة للمعلم الجغرافي
   */
  function extractPlacesFromFeed(feed, cellInfo) {
    const places = [];
    const links = feed.querySelectorAll('a[href*="/maps/place/"], a.hfpxzc');

    links.forEach((link) => {
      try {
        const href = link.href;
        if (!href) return;

        let name = link.getAttribute("aria-label") || "";
        const card = link.closest('div.Nv2PK, div[role="article"]') || link.parentElement?.closest('div.Nv2PK') || link.parentElement;

        if (!name && card) {
          const headline = card.querySelector('div.fontHeadlineSmall, div[class*="fontHeadlineSmall"], div.qBF1Pd');
          if (headline) name = headline.textContent.trim();
        }
        if (!name) return;

        // 1. استخراج الإحداثيات الفعلية للفرع من الرابط (!3d[lat] و !4d[lng])
        let coords = extractCoordinatesFromUrl(href);
        if ((!coords || !coords.hasExactCoords) && card) {
          const subLinks = card.querySelectorAll('a[href*="!3d"]');
          for (const sLink of subLinks) {
            coords = extractCoordinatesFromUrl(sLink.href);
            if (coords?.hasExactCoords) break;
          }
        }

        // 1b. محاولة إضافية: استخراج من data-url أو أي رابط آخر على البطاقة
        if ((!coords || !coords.hasExactCoords) && card) {
          const dataUrl = card.getAttribute('data-url') || card.querySelector('[data-url]')?.getAttribute('data-url');
          if (dataUrl) coords = extractCoordinatesFromUrl(dataUrl);
        }
        if ((!coords || !coords.hasExactCoords) && card) {
          const allAnchors = card.querySelectorAll('a[href*="maps"]');
          for (const a of allAnchors) {
            coords = extractCoordinatesFromUrl(a.href);
            if (coords && coords.hasExactCoords) break;
            coords = null;
          }
        }

        // 1c. معالجة الإحداثيات دون تلفيق مركز الخلية (P0-04)
        let coordsApproximate = false;
        if (!coords || !coords.hasExactCoords) {
          coords = {
            x: null,
            y: null,
            hasExactCoords: false,
            coordinateSource: (coords && coords.coordinateSource) || "missing",
            coordinateConfidence: (coords && coords.coordinateConfidence) || "none",
            isApproximate: true
          };
          coordsApproximate = true;
        }

        // 2. الملكية تُقرَّر في background (findOwnerCell) ويُسجَّل outsideCount هناك.

        // 3. استخراج التقييم والمراجعات مع معالجة الأرقام المشرقية
        const { rating, reviewsCount, ratingRaw, reviewsCountRaw, sourceLocale, reviewsCountApproximate } = extractRatingMetrics(card);

        // 4. التصنيف والعنوان ورقم الهاتف والموقع والحالة
        let name_en = "";
        let category = "";
        let address = "";
        let phone = "", phoneRaw = "";
        let website = "";
        let status = "";
        let openingHours = "";
        let plusCode = "";
        let priceLevel = "";
        let attributes = "";
        let thumbnailUrl = "";

        // فحص الاسم الإنجليزي من الاسم الأساسي (مثل: "مطعم كذا (Kaza Restaurant)")
        const englishMatch = name.match(/[\(\[]([A-Za-z0-9\s.,'&-]+)[\)\]]/);
        if (englishMatch) {
          name_en = englishMatch[1].trim();
        }

        if (card) {
          // زر أو رابط الموقع الإلكتروني
          const webEl = card.querySelector('a[data-value="Website"], a[data-tooltip*="موقع" i], a[data-tooltip*="website" i], a[aria-label*="موقع" i], a[aria-label*="website" i], a[data-item-id*="authority"]') || findLabeledElement(card,"website","a[href]");
          if (webEl && webEl.href) {
            website = cleanWebsiteUrl(webEl.href);
          }

          // صورة المعلم المصغرة
          const imgEl = card.querySelector('img[src*="googleusercontent.com"], img[src*="ggpht.com"]');
          if (imgEl && imgEl.src) {
            thumbnailUrl = imgEl.src;
          }

          // زر الهاتف السريع إن وُجد
          const quickPhoneBtn = card.querySelector('button[data-tooltip*="هاتف"], button[data-tooltip*="phone" i], button[data-item-id*="phone"], button[aria-label*="هاتف"], button[aria-label*="Phone" i]') || card.querySelector('a[href^="tel:"]') || findLabeledElement(card,"phone","button, a[href]");
          if (quickPhoneBtn) {
            const extracted=phoneFromElement(quickPhoneBtn); phone=extracted.value; phoneRaw=extracted.raw;
          }

          // حالة العمل
          const statusEl = card.querySelector('span[class*="ZDu9vd"], span[style*="color: rgb(24, 128, 56)"], span[style*="color: rgb(217, 48, 37)"]');
          if (statusEl) {
            status = statusEl.textContent.trim();
          }

          const textBlocks = Array.from(card.querySelectorAll('div.W4Efsd, span.W4Efsd, div.fontBodyMedium'))
            .map((el) => el.textContent.trim())
            .filter((t) => t.length > 0);

          if (!name_en) {
            const cardEnglishMatch = name.match(/[\(\[]([A-Za-z0-9\s.,'&-]+)[\)\]]/);
            if (cardEnglishMatch) {
              name_en = cardEnglishMatch[1].trim();
            }
          }

          const attrList = [];

          for (const block of textBlocks) {
            // استخراج الهاتف إذا لم يُستخرج من الزر السريع
            if (!phone && !reviewTermPattern.test(signalText(block)) && !ratingTermPattern.test(signalText(block))) {
              const detectedPhone = extractCleanPhone(block);
              if (detectedPhone) { phone = detectedPhone; phoneRaw=block; }
            }

            // فحص رمز الموقع المفتوح Plus Code
            if (!plusCode) {
              const detectedPlus = extractPlusCode(block);
              if (detectedPlus) plusCode = detectedPlus;
            }

            // فحص مستوى الأسعار
            if (!priceLevel) {
              const detectedPrice = extractPriceLevel(block);
              if (detectedPrice) priceLevel = detectedPrice;
            }

            // فحص المزايا والخدمات (مثل: توصيل، سفري، تناول في المكان)
            if (hasAmenityText(block)) {
              attrList.push(block);
            }

            // استخراج مواعيد وحالة العمل
            if (hasHoursText(block)) {
              if (!status) status = block;
              if (!openingHours) openingHours = block;
            }

            if (block.includes("·") || block.includes("•")) {
              const parts = block.split(/[·•]/).map((p) => p.trim());
              if (!category && parts[0]) {
                const cleanedPart = cleanExtractedCategory(parts[0], name);
                if (cleanedPart) category = cleanedPart;
              }
              if (parts.length > 1 && !address) {
                const candidate = parts.slice(1).join(" - ").trim();
                if (!hasHoursText(candidate) && candidate !== phone) {
                  address = candidate;
                }
              }
            } else if (!category) {
              const cleanedBlock = cleanExtractedCategory(block, name);
              if (cleanedBlock) category = cleanedBlock;
            }

            // فحص وجود اسم إنجليزي في الكروت متعددة اللغات
            // An arbitrary Latin block is not an English alternate place name.
          }

          if (attrList.length > 0) {
            attributes = attrList.slice(0, 3).join(" · ");
          }
        }

        // استخراج Place ID و CID الرقمي
        const { placeId, cid } = extractPlaceIdAndCid(href);
        const id = generatePlaceId(name, coords.x, coords.y, cid, placeId);

        places.push({
          id,
          name,
          name_en,
          category,
          x: coords.x, // خط الطول X (Longitude)
          y: coords.y, // دائرة العرض Y (Latitude)
          hasExactCoords: coords.hasExactCoords,
          coordinateSource: coords.coordinateSource || (coords.hasExactCoords ? "exact_place_geometry" : "missing"),
          coordinateConfidence: coords.coordinateConfidence || (coords.hasExactCoords ? "high" : "none"),
          isApproximate: coords.isApproximate,
          record_status: coords.hasExactCoords ? "verified" : "pending_geocode",
          address,
          phone,
          phoneRaw,
          website,
          status,
          opening_hours: openingHours,
          rating,
          reviewsCount,
          ratingRaw, reviewsCountRaw, sourceLocale, reviewsCountApproximate,
          plus_code: plusCode,
          price_level: priceLevel,
          place_id: placeId,
          cid,
          thumbnail_url: thumbnailUrl,
          attributes,
          url: href,
          source: "Google Maps",
          searchKeyword: cellInfo ? (cellInfo.query || cellInfo.searchKeyword || "") : "",
          cellId: cellInfo ? cellInfo.id : null,
          cellName: cellInfo ? cellInfo.name : null,
          discoveryCellId: cellInfo ? cellInfo.id : null,
          discoveryCellName: cellInfo ? cellInfo.name : null,
          timestamp: new Date().toISOString()
        });
      } catch (err) {
        console.warn("[Scrape item error]:", err);
      }
    });

    return places;
  }

  function extractCardsFromDocument(cellInfo) {
    const allLinks = document.querySelectorAll('a[href*="/maps/place/"]');
    const seen = new Set();
    const results = [];

    allLinks.forEach((link) => {
      const name = link.getAttribute("aria-label") || link.textContent.trim();
      if (!name) return;

      let coords = extractCoordinatesFromUrl(link.href);
      if (!coords || !coords.hasExactCoords) {
        coords = {
          x: null,
          y: null,
          hasExactCoords: false,
          coordinateSource: (coords && coords.coordinateSource) || "missing",
          coordinateConfidence: (coords && coords.coordinateConfidence) || "none",
          isApproximate: true
        };
      }

      // الملكية تُقرَّر في background؛ لا إسقاط صامت هنا.

      const { placeId, cid } = extractPlaceIdAndCid(link.href);
      const localIdentity=generatePlaceId(name,coords.x,coords.y,cid,placeId) + (!cid && !placeId && !coords.hasExactCoords ? '|' + link.href : '');
      if(seen.has(localIdentity))return;
      seen.add(localIdentity);

      let name_en = "";
      const englishMatch = name.match(/[\(\[]([A-Za-z0-9\s.,'&-]+)[\)\]]/);
      if (englishMatch) {
        name_en = englishMatch[1].trim();
      }

      let category = "";
      let address = "";
      let phone = "", phoneRaw = "";
      let website = "";
      let status = "";
      let openingHours = "";
      let plusCode = "";
      let priceLevel = "";
      let attributes = "";
      let thumbnailUrl = "";

      const card = link.closest('div.Nv2PK, div[role="article"]') || link.parentElement?.closest('div.Nv2PK') || link.parentElement;
      const { rating, reviewsCount, ratingRaw, reviewsCountRaw, sourceLocale, reviewsCountApproximate } = extractRatingMetrics(card);
      if (card) {
        const webEl = card.querySelector('a[data-value="Website"], a[data-tooltip*="موقع" i], a[data-tooltip*="website" i], a[aria-label*="موقع" i], a[aria-label*="website" i], a[data-item-id*="authority"]') || findLabeledElement(card,"website","a[href]");
        if (webEl && webEl.href) {
          website = cleanWebsiteUrl(webEl.href);
        }

        const imgEl = card.querySelector('img[src*="googleusercontent.com"], img[src*="ggpht.com"]');
        if (imgEl && imgEl.src) {
          thumbnailUrl = imgEl.src;
        }

        const quickPhoneBtn = card.querySelector('button[data-tooltip*="هاتف"], button[data-tooltip*="phone" i], button[data-item-id*="phone"], button[aria-label*="هاتف"], button[aria-label*="Phone" i]') || card.querySelector('a[href^="tel:"]') || findLabeledElement(card,"phone","button, a[href]");
        if (quickPhoneBtn) {
          const extracted=phoneFromElement(quickPhoneBtn); phone=extracted.value; phoneRaw=extracted.raw;
        }

        const statusEl = card.querySelector('span[class*="ZDu9vd"], span[style*="color: rgb(24, 128, 56)"], span[style*="color: rgb(217, 48, 37)"]');
        if (statusEl) {
          status = statusEl.textContent.trim();
        }

        const textBlocks = Array.from(card.querySelectorAll('div.W4Efsd, span.W4Efsd, div.fontBodyMedium'))
          .map((el) => el.textContent.trim())
          .filter((t) => t.length > 0);

        for (const block of textBlocks) {
          if (!phone && !reviewTermPattern.test(signalText(block)) && !ratingTermPattern.test(signalText(block))) {
            const detectedPhone = extractCleanPhone(block);
            if (detectedPhone) { phone = detectedPhone; phoneRaw=block; }
          }
          if (!plusCode) {
            const detectedPlus = extractPlusCode(block);
            if (detectedPlus) plusCode = detectedPlus;
          }
          if (!priceLevel) {
            const detectedPrice = extractPriceLevel(block);
            if (detectedPrice) priceLevel = detectedPrice;
          }
          if (hasHoursText(block)) {
            if (!status) status = block;
            if (!openingHours) openingHours = block;
          }
          if (block.includes("·") || block.includes("•")) {
            const parts = block.split(/[·•]/).map((p) => p.trim());
            if (!category && parts[0]) {
              const cleanedPart = cleanExtractedCategory(parts[0], name);
              if (cleanedPart) category = cleanedPart;
            }
            if (parts.length > 1 && !address) {
              const candidate = parts.slice(1).join(" - ").trim();
              if (!hasHoursText(candidate) && candidate !== phone) {
                address = candidate;
              }
            }
          } else if (!category) {
            const cleanedBlock = cleanExtractedCategory(block, name);
            if (cleanedBlock) category = cleanedBlock;
          }
          // An arbitrary Latin block is not an English alternate place name.
        }
      }

      results.push({
        id: generatePlaceId(name, coords.x, coords.y, cid, placeId),
        name,
        name_en,
        category,
        x: coords.x,
        y: coords.y,
        hasExactCoords: coords.hasExactCoords,
        coordinateSource: coords.coordinateSource || (coords.hasExactCoords ? "exact_place_geometry" : "missing"),
        coordinateConfidence: coords.coordinateConfidence || (coords.hasExactCoords ? "high" : "none"),
        isApproximate: coords.isApproximate,
        record_status: coords.hasExactCoords ? "verified" : "pending_geocode",
        address,
        phone,
        phoneRaw,
        website,
        status,
        opening_hours: openingHours,
        rating,
        reviewsCount,
        ratingRaw, reviewsCountRaw, sourceLocale, reviewsCountApproximate,
        plus_code: plusCode,
        price_level: priceLevel,
        place_id: placeId,
        cid,
        thumbnail_url: thumbnailUrl,
        attributes,
        url: link.href,
        source: "Google Maps",
        searchKeyword: cellInfo ? (cellInfo.query || cellInfo.searchKeyword || "") : "",
        cellId: cellInfo ? cellInfo.id : null,
        cellName: cellInfo ? cellInfo.name : null,
        discoveryCellId: cellInfo ? cellInfo.id : null,
        discoveryCellName: cellInfo ? cellInfo.name : null,
        timestamp: new Date().toISOString()
      });
    });

    return results;
  }

  /**
   * استخراج الإحداثيات الحقيقية حصراً لموقع المعلم الجغرافي
   * الاعتماد الأساسي: وسوم إحداثيات النقطة الجغرافية الفعلية (!3d[lat] و !4d[lng]).
   * تمييز حاسم: فصل إحداثيات مركز الكاميرا /@lat,lng في البحث العام عن إحداثيات المكان الدقيقة (P0-04)
   */
  function extractCoordinatesFromUrl(url) {
    if (!url) return null;

    // 1. الصيغة البرمجية المباشرة لموقع المكان الفعلي في جوجل ماب: !3d[lat] و !4d[lng] (High Confidence)
    const pair = url.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
    const latMatch = pair ? [pair[0],pair[1]] : null;
    const lngMatch = pair ? [pair[0],pair[2]] : null;

    if (latMatch && lngMatch) {
      const lat = parseFloat(latMatch[1]);
      const lng = parseFloat(lngMatch[1]);

      if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return {
          x: Number(lng.toFixed(6)), // X = خط الطول (Longitude)
          y: Number(lat.toFixed(6)), // Y = دائرة العرض (Latitude)
          hasExactCoords: true,
          coordinateSource: "exact_place_geometry",
          source: "exact_place_geometry",
          coordinateConfidence: "high",
          isApproximate: false
        };
      }
    }

    // Camera centres and URL search/viewport parameters never verify a place point.
    const atMatch = url.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
    if (atMatch) {
      const lat=Number(atMatch[1]),lng=Number(atMatch[2]);
      if(Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat)<=90 && Math.abs(lng)<=180) {
        return {x:Number(lng.toFixed(6)),y:Number(lat.toFixed(6)),hasExactCoords:false,
          coordinateSource:'unverified_view_center',source:'unverified_view_center',coordinateConfidence:'low',isApproximate:true};
      }
    }

    return {
      x: null,
      y: null,
      hasExactCoords: false,
      coordinateSource: "missing",
      source: "missing",
      coordinateConfidence: "none",
      isApproximate: true
    };
  }

  /**
   * التحقق المكاني الصارم: هل تقع الإحداثيات داخل حدود النطاق الجغرافي المحدد؟
   * بهامش تفاوت كارتوجرافي دقيق فقط (~140 متراً) لحساب عرض الشوارع ومداخل المعالم
   */
  function isWithinCellBounds(x, y, bounds, defaultMargin = 0.0015) {
    if (!bounds) return true;

    const marginLat = defaultMargin;
    const marginLng = defaultMargin;

    const minLat = bounds.minLat - marginLat;
    const maxLat = bounds.maxLat + marginLat;
    const minLng = bounds.minLng - marginLng;
    const maxLng = bounds.maxLng + marginLng;

    return y >= minLat && y <= maxLat && x >= minLng && x <= maxLng;
  }

  /**
   * يقدّم الملاحظات الواقعة داخل الخلية على غيرها قبل اقتطاعها بعدد ثابت.
   * Google يمزج أماكن بعيدة في القائمة نفسها؛ الاقتطاع بترتيب الظهور كان يحذف
   * معالم الخلية إذا جاءت بعد البعيدة، فتُحفظ «صفرًا» ويظن المستخدم أن الخلية خالية.
   */
  function inCellFirst(values, cellInfo) {
    const bounds = cellInfo && (cellInfo.bounds || cellInfo.studyAreaBounds);
    if (!bounds || !Array.isArray(values)) return Array.isArray(values) ? values.slice() : [];
    const inside = [], outside = [];
    for (const item of values) {
      const known = item && item.x != null && item.y != null && Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y));
      (known && isWithinCellBounds(Number(item.x), Number(item.y), bounds, 0) ? inside : outside).push(item);
    }
    return inside.concat(outside);
  }

  /**
   * إنشاء معرف فريد قياسي يمنع التكرار (يعتمد على CID أو Place ID الحقيقي إن وُجد)
   */
  function generatePlaceId(name, x, y, cid = "", placeId = "") {
    if (cid) return `cid_${cid}`;
    if (placeId && !placeId.startsWith("0x0:0x0")) {
      return `pid_${placeId.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
    }
    const cleanName = (name || "")
      .normalize("NFKC")
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "_");
    const roundX = x != null && Number.isFinite(Number(x)) ? Number(x).toFixed(6) : "missing";
    const roundY = y != null && Number.isFinite(Number(y)) ? Number(y).toFixed(6) : "missing";
    return `${cleanName}_${roundX}_${roundY}`;
  }

  function sleep(ms, token=activeTask) {
    return new Promise((resolve,reject) => setTimeout(() => {try{assertActive(token);resolve();}catch(error){reject(error);}}, ms));
  }

  function escapeHtml(text) {
    if (!text) return "";
    return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  if (typeof module !== "undefined" && module.exports) {
    module.exports = {
      extractCoordinatesFromUrl,
      isPlaceInStudyOrCell,
      generatePlaceId,
      cleanWebsiteUrl, detectSourceBlock, hasExplicitNoResults, scrapeGoogleMaps, isWithinCellBounds, inCellFirst,
      normalizeArabicNumerals, pageLocale, parseSourceNumber, parseRatingText, parseReviewText,
      matchesSourceSignal, fieldLabelMatches, findLabeledElement, hasHoursText, extractRatingMetrics,
      checkSinglePlace, extractPlacesFromFeed, extractCardsFromDocument, clickSearchThisAreaIfPresent, hasLimitedView, smartAutoScrollFeed
    };
  }
})();

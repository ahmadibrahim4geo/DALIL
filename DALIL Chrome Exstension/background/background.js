/**
 * Google Maps Grid Scraper - Background Service Worker (Enhanced Edition)
 * يدير التقسيم الشبكي فائق الدقة (180+ مربع)، والبحث ثنائي اللغة (عربي + إنجليزي)،
 * والتحكم في دورة حياة التبويب المستكشف وحفظ واسترجاع البيانات دون فقدان.
 */

// استيراد محرك التصنيفات والقاموس والشبكات الجغرافية ودوال الفحص والتحليل المكاني
try {
  importScripts("../core/arabic-normalize.js", "../core/category-registry.js", "../core/search-languages.js", "../lib/taxonomy-engine.js", "../lib/smart-brands.js", "../core/symbology.js", "../lib/export-utils.js", "../lib/spatial-utils.js", "../core/workspace-state.js", "../core/records.js", "../core/source-adapters.js", "../core/search-navigation.js", "../core/result-store.js", "../core/scan-diagnostics.js", "grid-presets.js");
} catch (e) {
  console.warn("importScripts fallback:", e);
}

let isProcessingQueue = false;
let operationEpoch = 0;
let activeAbortController = null;
let recordIndex = null;
let nextStepTimer = null;
let storageWrite = Promise.resolve();
let workspaceState = null;
let workspaceMutation = Promise.resolve();
const QUEUE_ALARM = 'dalil-queue-checkpoint';

async function closeWorkerTab() {
  const tabId = scraperState.workerTabId;
  scraperState.workerTabId = null;
  scraperState.workerTabCellId = null;
  if (tabId) {
    try {
      await chrome.tabs.remove(tabId);
    } catch (e) {}
  }
}

// حالة النظام الحالية في الذاكرة
let scraperState = {
  status: "idle", // "idle" | "running" | "paused" | "stopped" | "completed"
  config: null,
  cells: [],
  currentIndex: 0,
  currentQueryIndex: 0,
  activeQueryText: "",
  results: [],
  resultsRevision:0,
  seenIds: new Set(),
  stats: {
    totalCells: 0,
    completedCells: 0,
    itemsFound: 0,
    duplicatesSkipped: 0,
    startTime: null,
    endTime: null
  },
  workerTabId: null
};

// بصمة مستند الصفحة الذي قرأناه آخر مرة في تبويب البحث. نفس البصمة = الصفحة لم تُحمَّل.
let activeTabDocumentId = null;

// استعادة الحالة المحفوظة عند بدء التشغيل
const stateReady = (async () => {
  const data = await new Promise(resolve => {
    chrome.storage.local.get(["scraperState", "workspaceState", "savedStudyArea", "savedCells"], result => {
      if (chrome.runtime.lastError) {
        scraperState.lastError = { code: 'STORAGE_READ_FAILED', message: chrome.runtime.lastError.message };
        resolve({});
        return;
      }
      resolve(result || {});
    });
  });
  if (typeof WorkspaceState !== 'undefined') workspaceState = WorkspaceState.fromStorage(data);
  if (data.scraperState) {
    scraperState = {
      ...scraperState,
      ...data.scraperState,
      seenIds: new Set(data.scraperState.seenIds || [])
    };
    if (scraperState.status === "running") {
      scraperState.status = "paused";
      scraperState.pauseReason = 'worker_restarted';
      scraperState.cells.forEach(cell => { if (cell.status === 'processing') cell.status = 'pending'; });
      saveState();
    }
  }

  // النتائج الكبيرة تُقرأ من IndexedDB بدل chrome.storage.local.
  if (scraperState.resultsStoredExternally) {
    let stored = null;
    if (typeof ResultStore !== 'undefined' && ResultStore.available()) stored = await ResultStore.load();
    if (Array.isArray(stored)) scraperState.results = stored;
    else scraperState.lastError = { code: 'RESULT_STORE_READ_FAILED', message: 'Stored survey records could not be restored; the saved index is unchanged.' };
  }
  delete scraperState.resultsStoredExternally;

  // لا نقوم بفرض أي شبكة افتراضية على المستخدم - الخريطة تفتح نظيفة بانتظار رفع ملف منطقة الدراسة أو رسمها
  if (scraperState.status === "idle" && !scraperState.cells) {
    scraperState.cells = [];
    scraperState.stats.totalCells = 0;
    scraperState.stats.completedCells = 0;
    saveState();
  }
  if (typeof PlaceRecords !== 'undefined') recordIndex = new PlaceRecords.RecordIndex(scraperState.results);
})();

// عند إعادة تشغيل المتصفح: تُستأنف الجلسة السابقة بدل حذفها.
// تُصفَّر الحالات العابرة فقط (التبويب العامل، الاستعلام النشط، المؤقتات)،
// بينما تبقى النتائج والفهارس ومواضع الخلايا محفوظة لضمان عدم فقدان أي معلم.
if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(async () => {
    await stateReady;
    const preservedResults = Array.isArray(scraperState.results) ? scraperState.results : [];
    scraperState.status = "idle";
    scraperState.workerTabId = null;
    scraperState.activeQueryText = "";
    scraperState.nextRunAt = null;
    scraperState.notBefore = null;
    scraperState.pauseReason = null;
    scraperState.lastError = null;
    if (!(scraperState.seenIds instanceof Set)) scraperState.seenIds = new Set(scraperState.seenIds || []);
    scraperState.stats = {
      ...(scraperState.stats || {}),
      totalCells: scraperState.cells?.length || 0,
      completedCells: (scraperState.cells || []).filter(cell => ['complete', 'done', 'partial', 'confirmed_empty', 'verified_empty'].includes(cell.status)).length,
      itemsFound: preservedResults.length,
      startTime: null,
      endTime: null
    };
    if (typeof PlaceRecords !== "undefined") recordIndex = new PlaceRecords.RecordIndex(preservedResults);
    await saveState(true);
    broadcastUpdate();
  });
}

let saveStateTimer = null;
let persistedResultsRevision = -1;
// تحت هذا الحد تبقى السجلات داخل chrome.storage.local؛ فوقه تُحفظ في IndexedDB
// حتى لا يستهلك كل حفظ نسخة كاملة من آلاف السجلات ويُبطئ الواجهة.
const RESULT_STORE_THRESHOLD = 500;
function useExternalResultStore() {
  return typeof ResultStore !== 'undefined' && ResultStore.available() && scraperState.results.length > RESULT_STORE_THRESHOLD;
}

// خطة الاستعلامات الكاملة تحتوي خريطة تغطية 940 صفًا وآلاف المصطلحات. لا شيء منها
// يُستخدم بعد بدء المهمة سوى ترتيب الاستعلامات ولغتها ومعرّفاتها، فتُضغط قبل الحفظ.
// الضغط مخزّن مؤقتًا لأن مرجع الخطة ثابت طوال المهمة.
let compactPlanCache = { source: null, value: null };
function persistedQueryPlan(plan) {
  if (!plan || typeof plan !== 'object') return null;
  if (compactPlanCache.source === plan) return compactPlanCache.value;
  const queries = Array.isArray(plan.queries) ? plan.queries : [];
  const value = {
    planId: plan.planId || null, planMode: plan.planMode || plan.mode || null, mode: plan.mode || plan.planMode || null,
    searchLanguage: plan.searchLanguage || null, actualSearchLanguages: plan.actualSearchLanguages || [],
    effectivePrimaryLanguage: plan.effectivePrimaryLanguage || null, languageFallback: plan.languageFallback || null,
    executable: plan.executable !== false, summaryText: plan.summaryText || '',
    totalQueries: plan.totalQueries || queries.length, totalLeavesInScope: plan.totalLeavesInScope || 0,
    leavesCovered: plan.leavesCovered || 0, representedLeaves: plan.representedLeaves || 0,
    missingTranslationsCount: (plan.missingTranslations || []).length,
    unresolvedTranslationsCount: (plan.unresolvedTranslations || []).length,
    fallbacksTotal: (plan.fallbacks || []).length,
    // العدّاد يكفي للواجهة؛ القائمة الكاملة تُعاد بناؤها في لوحة التحكم عند الطلب.
    fallbacks: (plan.fallbacks || []).slice(0, 100),
    queries: queries.map(query => ({ queryId: query.queryId, text: query.text, lang: query.lang,
      canonicalIds: query.canonicalIds || [], sectorId: query.sectorId || null, branchId: query.branchId || null }))
  };
  compactPlanCache = { source: plan, value };
  return value;
}

// seenIds قد يحوي عشرات الآلاف من المعرّفات؛ إعادة بنائها مع كل حفظ تُبطئ العامل.
let seenIdsCache = { key: '', value: [] };
function persistedSeenIds() {
  const key = scraperState.seenIds.size + '|' + (scraperState.resultsRevision || 0) + '|' + scraperState.results.length;
  if (seenIdsCache.key !== key) seenIdsCache = { key, value: Array.from(scraperState.seenIds) };
  return seenIdsCache.value;
}
function saveState(immediate = false) {
  if (immediate) {
    if (saveStateTimer) {
      clearTimeout(saveStateTimer);
      saveStateTimer = null;
    }
    return doSaveState();
  }
  if (saveStateTimer) return;
  saveStateTimer = setTimeout(() => {
    saveStateTimer = null;
    doSaveState();
  }, 400);
}

function doSaveState() {
  const external = useExternalResultStore();
  // نسخة سطحية + كائنات مضغوطة فقط. النسخة العميقة القديمة كانت تُضاعف كل السجلات
  // والخلايا في كل حفظ، وهو ما كان يجمّد العامل والواجهة أثناء المسوحات الكبيرة.
  const config = scraperState.config
    ? (() => { const { customCells, studyArea, ...rest } = scraperState.config; return rest; })()
    : scraperState.config;
  const serialized = {
    ...scraperState,
    config,
    queryPlan: persistedQueryPlan(scraperState.queryPlan),
    seenIds: persistedSeenIds(),
    resultsStoredExternally: external
  };
  if (external) delete serialized.results;
  else persistedResultsRevision = -1;
  const write = storageWrite.catch(() => {}).then(async () => {
    await chrome.storage.local.set({ scraperState: serialized });
    if (!external || persistedResultsRevision === scraperState.resultsRevision) return;
    persistedResultsRevision = scraperState.resultsRevision;
    const stored = await ResultStore.save(scraperState.results);
    if (stored) return;
    // تراجع آمن: إذا فشل IndexedDB نكتب السجلات كاملة بدل فقدانها.
    persistedResultsRevision = -1;
    const fallback = { ...serialized, results: scraperState.results, resultsStoredExternally: false };
    await chrome.storage.local.set({ scraperState: fallback });
  });
  storageWrite = write;
  write.catch(error => {
    scraperState.status = 'paused';
    scraperState.lastError = {code:'STORAGE_WRITE_FAILED',message:error.message};
    cancelActiveWork();
    broadcastUpdate();
  });
  return write;
}

function cancelActiveWork() {
  operationEpoch++;
  activeAbortController?.abort();
  activeAbortController = null;
  if (nextStepTimer) clearTimeout(nextStepTimer);
  nextStepTimer = null;
  chrome.alarms?.clear(QUEUE_ALARM);
  if (scraperState.workerTabId) chrome.tabs.sendMessage(scraperState.workerTabId, {action:'CANCEL_SCRAPE',status:scraperState.status}).catch(() => {});
}

function scheduleQueue(delayMs = 0) {
  if (scraperState.status !== 'running') return;
  const when = Date.now() + Math.max(0, delayMs);
  scraperState.nextRunAt = when;
  // Alarm is a durable wake-up; the timer only keeps short transitions responsive.
  chrome.alarms?.create(QUEUE_ALARM, {when: Math.max(Date.now()+500, when)});
  if (nextStepTimer) clearTimeout(nextStepTimer);
  nextStepTimer = setTimeout(() => { nextStepTimer=null; processQueue(); }, Math.max(0,delayMs));
}

if (chrome.alarms?.onAlarm) chrome.alarms.onAlarm.addListener(async alarm => {
  if (alarm.name !== QUEUE_ALARM) return;
  await stateReady;
  if (scraperState.status === 'running') scheduleQueue(Math.max(0,(scraperState.nextRunAt||0)-Date.now()));
});

chrome.tabs.onRemoved?.addListener(async tabId=>{
  await stateReady;
  if(tabId!==scraperState.workerTabId)return;
  scraperState.workerTabId=null;
  if(scraperState.status==='running'){
    scraperState.status='paused';scraperState.pauseReason='WORKER_TAB_CLOSED';
    cancelActiveWork();await saveState(true);broadcastUpdate();
  }
});

function getStatusSnapshot(includeResults = false) {
  return {success:true, status:scraperState.status, jobId:scraperState.jobId, config:scraperState.config,
    currentIndex:scraperState.currentIndex, currentQueryIndex:scraperState.currentQueryIndex||0,
    totalQueries:scraperState.config?.queriesToRun?.length || 0, completedQueries:scraperState.completedQueries||[],
    queryStats:scraperState.queryStats||{},activeQueryText:scraperState.activeQueryText,stats:scraperState.stats,
    resultsCount:scraperState.results.length,resultsRevision:scraperState.resultsRevision||0, ...(includeResults ? {results:scraperState.results} : {}),
    recentResults:scraperState.results.slice(-15).reverse(),currentCell:scraperState.cells[scraperState.currentIndex]||null,
    lastError:scraperState.lastError||null,pauseReason:scraperState.pauseReason||null,notBefore:scraperState.notBefore||null,navigationEvidence:scraperState.navigationEvidence||null,
    lastScanDiagnosis:scraperState.lastScanDiagnosis||null};
}

async function applyWorkspaceAction(request) {
  if (['running','paused'].includes(scraperState.status)) throw Object.assign(new Error('Stop the job before changing the study area or grid.'), {code:'WORKSPACE_LOCKED'});
  if (typeof WorkspaceState === 'undefined') throw new Error('Workspace module unavailable.');
  const next=WorkspaceState.applyOperation(workspaceState, request.operation, request.workspace);
  const area=WorkspaceState.getActiveArea(next);
  const reset=request.operation==='RESET_WORKSPACE';
  const candidate={...scraperState,cells:next.cells,studyArea:area,
    studyAreaBounds:area?.bounds || area?.bbox || calculateOverallBounds(next.cells),areaVersion:next.revision,
    currentIndex:0,currentQueryIndex:0,config:null,status:'idle',activeQueryText:'',queryStats:{},completedQueries:[],
    checkpoint:null,lastError:null,pauseReason:null,notBefore:null,
    results:reset?[]:scraperState.results,seenIds:reset?new Set():scraperState.seenIds,
    resultsRevision:(scraperState.resultsRevision||0)+(reset?1:0),
    stats:{...scraperState.stats,totalCells:next.cells.length,completedCells:0,
      ...(reset?{itemsFound:0,duplicatesSkipped:0,startTime:null,endTime:null}:{})}};
  // One storage.set commits both canonical and legacy keys, including explicit empty values.
  storageWrite=storageWrite.catch(()=>{}).then(async()=>{
    await chrome.storage.local.set({workspaceState:next, savedStudyArea:area, savedCells:next.cells,
      scraperState:{...candidate,seenIds:Array.from(candidate.seenIds)},
      ...(reset?{savedPhenomena:[],savedConfig:null}:{})});
    if(reset&&typeof ResultStore!=='undefined'&&ResultStore.available()){persistedResultsRevision=-1;await ResultStore.clear();}
  });
  try{await storageWrite;}catch(error){throw Object.assign(new Error('Workspace could not be saved; the previous workspace is retained.'),{code:'STORAGE_WRITE_FAILED'});}
  cancelActiveWork();
  scraperState=candidate;
  workspaceState=next;
  recordIndex=new PlaceRecords.RecordIndex(scraperState.results);
  if(reset)await closeWorkerTab();
  broadcastUpdate();
  return {success:true,workspace:next,studyArea:area,cells:next.cells};
}

// فتح لوحة التحكم المكانية الشاملة مباشرة بنقرة واحدة على أيقونة الإضافة في شريط الأدوات
if (chrome.action && chrome.action.onClicked) {
  chrome.action.onClicked.addListener(async () => {
    const dashboardUrl = chrome.runtime.getURL("dashboard/dashboard.html");
    const tabs = await chrome.tabs.query({ url: dashboardUrl });
    if (tabs.length > 0) {
      chrome.tabs.update(tabs[0].id, { active: true });
      chrome.windows.update(tabs[0].windowId, { focused: true });
    } else {
      chrome.tabs.create({ url: dashboardUrl });
    }
  });
}

// إدارة قنوات الاتصال النشطة (Port-based Keepalive) لضمان استمرار عمل الـ Service Worker
const activePorts = new Set();
stateReady.then(()=>broadcastUpdate());

if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onConnect) {
  chrome.runtime.onConnect.addListener((port) => {
    activePorts.add(port);

    port.onMessage.addListener((msg) => {
      if (msg && (msg.action === "PING" || msg.action === "PING_PORT" || msg === "ping" || msg.type === "keepalive")) {
        try {
          port.postMessage({
            action: "PONG",
            timestamp: Date.now(),
            status: scraperState.status,
            itemsFound: scraperState.stats.itemsFound
          });
        } catch (e) {}
      }
    });

    port.onDisconnect.addListener(() => {
      activePorts.delete(port);
    });
  });
}

// الاستماع للرسائل من الواجهة
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  (async () => {
  await stateReady;
  if (!request || typeof request.action !== 'string') throw new Error('Invalid message');
  if (sender?.id && chrome.runtime.id && sender.id !== chrome.runtime.id) throw new Error('Untrusted sender');
  const origin=chrome.runtime.getURL('');
  if (sender?.url && !sender.url.startsWith(origin)) throw new Error('Commands require an extension page.');
  switch (request.action) {
    case "GET_STATE":
    case "GET_STATUS":
      sendResponse(getStatusSnapshot(request.action === 'GET_STATE' || request.includeResults === true));
      break;

    case 'GET_WORKSPACE':
      sendResponse({success:true,workspace:workspaceState});
      break;
    case 'WORKSPACE_ACTION':
      workspaceMutation=workspaceMutation.catch(()=>{}).then(()=>applyWorkspaceAction(request));
      sendResponse(await workspaceMutation);
      break;
    case 'GET_SOURCE_CAPABILITIES':
      sendResponse({success:true,sources:SourceAdapters.descriptors});
      break;
    case 'GET_GRID':
      sendResponse({success:true,cells:scraperState.cells,areaVersion:scraperState.areaVersion||0});
      break;
    case 'GET_RESULTS_PAGE': {
      const offset=Math.max(0,Math.floor(Number(request.offset)||0));
      const limit=Math.min(1000,Math.max(1,Math.floor(Number(request.limit)||250)));
      if(request.resultsRevision!=null && request.resultsRevision!==(scraperState.resultsRevision||0)) {
        sendResponse({success:false,errorCode:'RESULTS_CHANGED',resultsRevision:scraperState.resultsRevision||0,total:scraperState.results.length});break;
      }
      sendResponse({success:true,results:scraperState.results.slice(offset,offset+limit),offset,total:scraperState.results.length,resultsRevision:scraperState.resultsRevision||0});
      break;
    }
    /* Compatibility endpoints retain complete result reads on explicit request. */
    case 'GET_LEGACY_STATUS':
      sendResponse({
        success: true,
        status: scraperState.status,
        config: scraperState.config,
        currentIndex: scraperState.currentIndex,
        currentQueryIndex: scraperState.currentQueryIndex || 0,
        totalQueries: (scraperState.config && scraperState.config.queriesToRun) ? scraperState.config.queriesToRun.length : 1,
        completedQueries: scraperState.completedQueries || [],
        queryStats: scraperState.queryStats || {},
        activeQueryText: scraperState.activeQueryText,
        stats: scraperState.stats,
        results: scraperState.results,
        resultsCount: scraperState.results.length,
        recentResults: scraperState.results.slice(-15).reverse(),
        currentCell: scraperState.cells[scraperState.currentIndex] || null
      });
      break;

    case "GET_ALL_RESULTS":
    case "GET_RESULTS":
      sendResponse({
        success: true,
        status: scraperState.status,
        results: scraperState.results,
        cells: scraperState.cells,
        stats: scraperState.stats,
        count: scraperState.results.length
      });
      break;

    case "START_SCRAPING":
      await workspaceMutation;
      await startScraping(request.config);
      sendResponse({ success:true });
      break;

    case "PAUSE_SCRAPING":
      if(!['running','paused'].includes(scraperState.status)){sendResponse({success:false,errorCode:'JOB_NOT_RUNNING',error:'No running job.'});break;}
      scraperState.status = "paused";
      cancelActiveWork();
      await saveState(true);
      broadcastUpdate();
      sendResponse({ success: true, status: "paused" });
      break;

    case "RESUME_SCRAPING":
      if (scraperState.status === "paused") {
        if (scraperState.notBefore > Date.now()) {
          sendResponse({success:false,errorCode:'SOURCE_COOLDOWN',error:'The source cooldown has not elapsed.',notBefore:scraperState.notBefore});
          break;
        }
        const queriesToRun = (scraperState.config && scraperState.config.queriesToRun) ? scraperState.config.queriesToRun : [];
        const isAllDone = (scraperState.currentQueryIndex >= queriesToRun.length) && (scraperState.currentIndex >= scraperState.cells.length);
        if (isAllDone) {
          scraperState.status = "completed";
          saveState(true);
          broadcastUpdate();
          sendResponse({ success: true, status: "completed" });
          break;
        }
        scraperState.status = "running";
        scraperState.lastError=null;
        scraperState.pauseReason=null;
        await saveState(true);
        broadcastUpdate();
        processQueue();
        sendResponse({ success: true, status: "running" });
      } else {
        sendResponse({ success: false, error: "Not paused" });
      }
      break;

    case "STOP_SCRAPING":
      scraperState.status = "stopped";
      cancelActiveWork();
      await closeWorkerTab();
      await saveState(true);
      broadcastUpdate();
      sendResponse({ success: true, status: "stopped" });
      break;

    case "CLEAR_DATA":
    case "CLEAR_RESULTS":
      await resetScraper(true);
      sendResponse({ success: true });
      break;

    case "DELETE_ITEM":
      if (request.id) {
        scraperState.results = scraperState.results.filter((item) => item.id !== request.id);
        // إعادة ترقيم السجلات
        scraperState.results.forEach((item, idx) => {
          item.index = idx + 1;
        });
        scraperState.seenIds.delete(request.id);
        scraperState.resultsRevision=(scraperState.resultsRevision||0)+1;
        recordIndex?.rebuild(scraperState.results);
        scraperState.stats.itemsFound = scraperState.results.length;
        saveState(true);
        broadcastUpdate();
        sendResponse({ success: true, count: scraperState.results.length });
      } else {
        sendResponse({ success: false, error: "No item ID provided" });
      }
      break;

    case "DEDUPLICATE_DATA":
    case "DEDUPLICATE_NOW":
      if (typeof ExportUtils !== "undefined" && typeof ExportUtils.smartDeduplicateByCoords === "function") {
        const originalCount = scraperState.results.length;
        scraperState.results = PlaceRecords.deduplicate(scraperState.results);
        const removedCount = originalCount - scraperState.results.length;
        scraperState.stats.duplicatesSkipped += removedCount;
        scraperState.stats.itemsFound = scraperState.results.length;
        scraperState.seenIds = new Set(scraperState.results.map((i) => i.id));
        scraperState.resultsRevision=(scraperState.resultsRevision||0)+1;
        recordIndex?.rebuild(scraperState.results);
        saveState(true);
        broadcastUpdate();
        sendResponse({
          success: true,
          beforeCount: originalCount,
          afterCount: scraperState.results.length,
          removedCount: removedCount,
          count: scraperState.results.length
        });
      } else {
        sendResponse({ success: false, error: "ExportUtils not available" });
      }
      break;

    case "OPEN_DASHBOARD":
      chrome.tabs.create({ url: chrome.runtime.getURL("dashboard/dashboard.html") });
      sendResponse({ success: true });
      break;

    case "SET_ACTIVE_GRID":
      if (scraperState.status === "running" || scraperState.status === "paused") {
        sendResponse({ success: false, errorCode:'WORKSPACE_LOCKED',error: 'Stop the job before changing the grid.' });
        break;
      }
      if (request.customCells && Array.isArray(request.customCells)) {
        if (request.workspaceSnapshot) {
          workspaceMutation=workspaceMutation.catch(()=>{}).then(()=>applyWorkspaceAction({operation:'SAVE_WORKSPACE',workspace:{...request.workspaceSnapshot,cells:request.customCells}}));
          sendResponse(await workspaceMutation);break;
        }
        scraperState.cells = request.customCells;
        scraperState.currentIndex = 0;
        scraperState.stats.totalCells = scraperState.cells.length;
        scraperState.stats.completedCells = 0;
        scraperState.studyArea=request.studyArea || scraperState.studyArea || null;
        scraperState.areaVersion=request.areaVersion || scraperState.areaVersion || 0;
        await saveState(true);
        broadcastUpdate();
        sendResponse({ success: true, count: scraperState.cells.length, cells: scraperState.cells });
      } else if (request.region && typeof getCellsForPreset === "function") {
        scraperState.cells = getCellsForPreset(request.region, request.config || {});
        scraperState.currentIndex = 0;
        scraperState.stats.totalCells = scraperState.cells.length;
        scraperState.stats.completedCells = 0;
        saveState(true);
        broadcastUpdate();
        sendResponse({ success: true, count: scraperState.cells.length, cells: scraperState.cells });
      } else {
        sendResponse({ success: false, error: "Invalid preset" });
      }
      break;

    default:
      sendResponse({ success: false, error: "Unknown action" });
  }
  })().catch(error => sendResponse({success:false,error:error.message,errorCode:error.code||'COMMAND_FAILED'}));
  return true;
});

/**
 * تجهيز شبكة المربعات وبدء عملية الاستخراج
 */
async function startScraping(config) {
  if (scraperState.status === 'running' || scraperState.status === 'paused' || isProcessingQueue) {
    throw Object.assign(new Error('Stop the current job before starting another.'),{code:'JOB_ACTIVE'});
  }
  if (!config || typeof config !== 'object') throw new Error('Invalid job configuration.');
  if(config.areaVersion!=null && workspaceState && config.areaVersion!==workspaceState.revision) throw Object.assign(new Error('The study area changed in another dashboard. Reload its current state.'),{code:'WORKSPACE_STALE'});
  const provider=SourceAdapters.get(config.provider || 'google_maps_dom');
  if (!provider.canCollect) throw Object.assign(new Error('This source does not grant bulk collection or GIS export. Open Google Maps for viewing, or select OpenStreetMap.'),{code:'SOURCE_RESTRICTED'});

  // 1. استخدام شبكة المربعات المخصصة التي حددها المستخدم لمنطقة دراسته
  let cells = [];
  if (Array.isArray(config.customCells) && config.customCells.length > 0) {
    cells = config.customCells;
  } else if (scraperState.cells && scraperState.cells.length > 0) {
    cells = scraperState.cells;
  }

  if (!cells || cells.length === 0) {
    throw Object.assign(new Error('Import or draw a study area and generate its grid first.'),{code:'GRID_REQUIRED'});
  }
  if (cells.length>10000) throw new Error('Grid exceeds the supported cell limit.');
  for (const cell of cells) SourceAdapters.validateBounds(cell.bounds);
  if (new Set(cells.map(c=>c.id)).size!==cells.length || cells.some(c=>!c.id)) throw new Error('Grid cell IDs must be unique.');

  // 2. إعداد قائمة الكلمات المطلوب فحصها (البحث ثنائي اللغة عربي + إنجليزي)
  const previousPlan=scraperState.queryPlan;
  let queries,queryPlan;
  try{queries=prepareQueriesList(config);queryPlan=scraperState.queryPlan;}finally{scraperState.queryPlan=previousPlan;}
  if(queryPlan?.executable===false)throw Object.assign(new Error('Selected categories need search terms in the requested language.'),{code:'MISSING_QUERY_TRANSLATION'});
  if (!queries.length) throw new Error('No search queries selected.');
  if (provider.maxPublicJobTasks && cells.length*queries.length>provider.maxPublicJobTasks) {
    throw Object.assign(new Error('This public source supports small jobs of at most 100 cell/query tasks. Reduce the scope or use licensed offline extracts.'),{code:'PUBLIC_SOURCE_JOB_LIMIT'});
  }
  cancelActiveWork();
  const epoch=operationEpoch;

  // 3. تحديث الحالة مع تفريغ أو استكمال البيانات السابقة حسب الرغبة
  const shouldClear = config.clearPreviousData !== false;
  const initialResults = shouldClear ? [] : scraperState.results;
  const initialSeenIds = shouldClear ? new Set() : scraperState.seenIds;
  const initialFound = shouldClear ? 0 : initialResults.length;
  const resultsRevision=(scraperState.resultsRevision||0)+(shouldClear?1:0);

  // Every new job has its own survey state, even when retaining previous records.
  cells=cells.map(c=>({...c,status:'pending',itemsFound:0,statusByQuery:{}}));
  if (!shouldClear) {
    for(const item of initialResults){
      if(!PlaceRecords.hasGeometry(item))continue;
      const owner=SpatialUtils.findOwnerCell(item.x,item.y,cells);
      if(owner)owner.itemsFound++;
    }
  }

  const studyAreaBounds = calculateOverallBounds(cells, config.customBounds);

  scraperState = {
    jobId: `job_${Date.now()}_${operationEpoch}`,
    status: "running",
    config: {
      ...config,
      provider:provider.id,
      searchLocale:SearchLanguages.normalizeLocale(config.searchLocale || 'ar'),
      queriesToRun: queries
    },
    queryPlan,
    areaVersion: workspaceState?.revision || config.areaVersion || 0,
    studyArea: config.studyArea || (typeof WorkspaceState !== 'undefined' ? WorkspaceState.getActiveArea(workspaceState) : null),
    studyAreaBounds: studyAreaBounds,
    cells,
    currentIndex: 0,
    currentQueryIndex: 0,
    completedQueries: [],
    queryStats: {},
    activeQueryText: queries[0] || config.query,
    results: initialResults,
    resultsRevision,
    seenIds: initialSeenIds,
    stats: {
      totalCells: cells.length,
      totalQueries: queries.length,
      completedCells: 0,
      completedQueriesCount: 0,
      totalPassSteps: queries.length * cells.length,
      currentStep: 0,
      itemsFound: initialFound,
      duplicatesSkipped: shouldClear ? 0 : (scraperState.stats.duplicatesSkipped || 0),
      startTime: Date.now(),
      endTime: null
    },
    workerTabId: null,
    workerTabCellId: null
  };
  activeTabDocumentId = null;
  recordIndex=new PlaceRecords.RecordIndex(initialResults);
  await saveState(true);
  if (epoch!==operationEpoch || scraperState.status!=='running') return;
  broadcastUpdate();
  // Source adapters create a browser tab only when the source requires one.
  processQueue();
}

/**
 * حساب النطاق الجغرافي الشامل لكامل منطقة الدراسة أو كافة المربعات
 */
function calculateOverallBounds(cells, customBounds) {
  if (customBounds && customBounds.minLat !== undefined) return customBounds;
  if (!cells || cells.length === 0) return null;
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const c of cells) {
    const b = c.bounds || c;
    if (b.minLat !== undefined) {
      if (b.minLat < minLat) minLat = b.minLat;
      if (b.maxLat > maxLat) maxLat = b.maxLat;
      if (b.minLng < minLng) minLng = b.minLng;
      if (b.maxLng > maxLng) maxLng = b.maxLng;
    }
  }
  return minLat !== Infinity ? { minLat, maxLat, minLng, maxLng } : null;
}

/**
 * حساب دقيق وتكيفي لمستوى التقريب (Zoom Level) المناسب لأبعاد الخلية
 * يدعم كافة مستويات التقريب من 12 وحتى المستوى التفصيلي الدقيق 19z و 20z
 */
/**
 * حد «الحي الخطأ» لمركز كاميرا Google. الملكية تُقرَّر هندسيًا في findOwnerCell،
 * لكن قراءة نتائج حيٍّ آخر تُنتج سجلات لا تنتمي للخلية. لذلك نطلب أن تكون الكاميرا
 * فوق الخلية فعليًا: نصف أقصر ضلع، بحد أدنى 300 م وأقصى 2000 م.
 * الحد السابق (3 كم) كان يسمح بقراءة الخلية المجاورة كلها.
 */
function cameraHardLimitMeters(cell) {
  const b = cell && (cell.bounds || cell);
  if (!b || b.minLat === undefined) return 600;
  const midLat = (b.minLat + b.maxLat) / 2;
  const height = Math.abs(b.maxLat - b.minLat) * 111320;
  const width = Math.abs(b.maxLng - b.minLng) * 111320 * Math.cos(midLat * Math.PI / 180);
  const shortest = Math.min(height, width);
  return Math.round(Math.max(300, Math.min(2000, shortest * 0.5)));
}

/* آخر مقاس نافذة رُصد من صفحة بحث حقيقية. يُستخدم لحساب التكبير بدقة
 * بدل تخمينه، لأن Google يقصر قائمة النتائج على ما تراه الخريطة. */
let observedViewportPixels = null;

/**
 * التكبير يُحسب من مقاس النافذة الفعلي بحيث يحتوي عرض الخريطة الخلية كاملة.
 * كان التكبير سابقًا يُختار من «أطول ضلع» فقط، فيكون العرض أضيق من الخلية،
 * وتنتهي قائمة Google بـ«نهاية القائمة» قبل أن تُقرأ معالم ما زالت داخل الخلية.
 * تكبير المستخدم يُحترم فقط إن بقي العرض محيطًا؛ وإلا يُخفَّض إلى حد التغطية.
 */
function resolveCellZoom(cell, configZoom, pixels = observedViewportPixels) {
  const px = DalilSearchNavigation.pixelsOf(pixels || DalilSearchNavigation.DEFAULT_PIXELS);
  const fit = cell && cell.bounds ? DalilSearchNavigation.zoomForBounds(cell.bounds, px, 1.06) : 16;
  const requested = configZoom && configZoom !== "auto" && !isNaN(parseInt(configZoom)) ? parseInt(configZoom) : null;
  return Math.max(10, Math.min(20, requested == null ? fit : Math.min(requested, fit)));
}

/**
 * إثبات التغطية: هل عرض الخريطة الفعلي يحتوي نطاق الخلية كاملًا؟
 * بلا هذا الإثبات لا يجوز وسم الخلية «مكتملة» ولو أعلن Google نهاية القائمة.
 */
function cellCoverage(cellLike, viewport, cameraLat, cameraLng) {
  const bounds = cellLike && (cellLike.bounds || cellLike);
  if (!bounds || bounds.minLat === undefined) return { covers: true, reason: 'no_bounds' };
  const pixels = DalilSearchNavigation.pixelsOf(viewport?.pixels || observedViewportPixels || DalilSearchNavigation.DEFAULT_PIXELS);
  const zoom = Number(viewport?.zoom);
  const lat = Number.isFinite(Number(cameraLat)) ? Number(cameraLat) : Number(cellLike.centerLat);
  const lng = Number.isFinite(Number(cameraLng)) ? Number(cameraLng) : Number(cellLike.centerLng);
  const box = Number.isFinite(zoom) ? DalilSearchNavigation.viewportBox(lat, lng, pixels, zoom) : null;
  if (!box) return { covers: false, reason: 'viewport_unknown', pixels, zoom: Number.isFinite(zoom) ? zoom : null };
  const span = DalilSearchNavigation.spanMeters(bounds);
  return {
    covers: DalilSearchNavigation.covers(box, bounds, 25),
    reason: 'measured',
    zoom,
    pixels,
    viewportWidthMeters: Math.round(box.widthMeters),
    viewportHeightMeters: Math.round(box.heightMeters),
    cellWidthMeters: span ? Math.round(span.width) : null,
    cellHeightMeters: span ? Math.round(span.height) : null
  };
}

/**
 * تحضير قائمة الظاهرات والكلمات المفتاحية (دعم البحث متعدد الظاهرات والبحث المزدوج)
 * مع احترام خطة الاستعلامات الشاملة 100% دون حذف صامت (P0-02)
 */
function prepareQueriesList(config) {
  const planMode = config.queryPlanMode || config.mode || "comprehensive";

  if (typeof TaxonomyEngine !== "undefined" && typeof TaxonomyEngine.buildQueryPlan === "function") {
    const rawList = Array.isArray(config.queriesToRun) && config.queriesToRun.length > 0
      ? config.queriesToRun
      : (config.query ? [config.query] : ["معالم جغرافية"]);

    const plan = TaxonomyEngine.buildQueryPlan({
      mode: planMode,
      selectedLeaves: rawList,
      bilingualEnabled: !!config.bilingualEnabled,
      language:config.searchLocale || 'ar',
      locale:config.searchLocale || 'ar',
      searchLanguage:config.searchLocale || 'ar',
      queryLanguage:config.searchLocale || 'ar',
      provider:config.provider||'google_maps_dom',queryTerms:config.queryTerms||{},fallbackLanguage:config.fallbackLanguage||null,additionalSearchLanguages:config.additionalSearchLanguages||[],sourceLabelFallback:config.sourceLabelFallback===true,
      maxQueries: config.maxQueries || 0
    });

    scraperState.queryPlan = plan;
    return plan.queriesToRun;
  }

  const list = [];
  if (Array.isArray(config.queriesToRun) && config.queriesToRun.length > 0) {
    config.queriesToRun.forEach((q) => {
      const trimmed = (q || "").trim();
      if (trimmed && !list.includes(trimmed)) list.push(trimmed);
    });
  } else if (config.query) {
    const primary = (config.query || "").trim();
    if (primary) list.push(primary);
  }

  if (list.length === 0) list.push("معالم جغرافية");

  if (config.bilingualEnabled && typeof TaxonomyEngine !== "undefined" && typeof TaxonomyEngine.resolveBilingualSearch === "function") {
    const additions = [];
    list.forEach(q => {
      const res = TaxonomyEngine.resolveBilingualSearch(q);
      if (res && res.secondary) {
        res.secondary.split(/[,،]+/).map(s => s.trim()).filter(Boolean).forEach(p => {
          if (!list.includes(p) && !additions.includes(p)) additions.push(p);
        });
      }
    });
    additions.forEach(p => list.push(p));
  }

  return list;
}

/**
 * بناء رابط البحث على خرائط جوجل لمركز المربع
 */
function buildMapsSearchUrl(query, cell, zoom, locale = 'ar', identity = null) {
  const encodedQuery = encodeURIComponent(query);
  const lang=SearchLanguages.normalizeLocale(locale);
  const url=new URL(`https://www.google.com/maps/search/${encodedQuery}/@${cell.centerLat},${cell.centerLng},${zoom}z`);
  url.searchParams.set('hl',lang);
  if(identity){url.hash=`dalil=${encodeURIComponent(JSON.stringify(identity))}`;url.searchParams.set('dalil_task',[identity.jobId,identity.queryId,identity.cellId].join(':'));}
  return url.href;
}

/**
 * إنهاء المهمة بأمان وبطريقة ذرية تمنع التعليق والتنفيذ المزدوج (P0-03)
 */
async function finishJob() {
  if (scraperState.status !== 'running') return;

  // تشغيل الفحص الذكي النهائي للمكررات بناءً على X و Y والاحتفاظ بالأوفر بيانات
  if (scraperState.config && scraperState.config.autoDedup !== false && typeof ExportUtils !== "undefined" && typeof ExportUtils.smartDeduplicateByCoords === "function") {
    const beforeCount = scraperState.results.length;
    scraperState.results = PlaceRecords.deduplicate(scraperState.results);
    const cleaned = beforeCount - scraperState.results.length;
    scraperState.stats.duplicatesSkipped += cleaned;
    scraperState.stats.itemsFound = scraperState.results.length;
    scraperState.seenIds = new Set(scraperState.results.map((i) => i.id));
    if(cleaned)scraperState.resultsRevision=(scraperState.resultsRevision||0)+1;
    recordIndex?.rebuild(scraperState.results);
  }

  scraperState.status = "completed";
  scraperState.stats.endTime = Date.now();
  scraperState.stats.completedCells = scraperState.cells.length;
  scraperState.currentIndex = scraperState.cells.length;
  const allQueries = (scraperState.config && scraperState.config.queriesToRun) ? scraperState.config.queriesToRun : [];
  scraperState.currentQueryIndex = allQueries.length;
  scraperState.completedQueries = [...allQueries];
  scraperState.stats.completedQueriesCount = allQueries.length;
  scraperState.stats.currentStep=allQueries.length*scraperState.cells.length;
  scraperState.completionSummary={};
  for(const cell of scraperState.cells) for(const step of Object.values(cell.statusByQuery||{})) {
    scraperState.completionSummary[step.status]=(scraperState.completionSummary[step.status]||0)+1;
  }
  scraperState.coverageClaim='scheduled_tasks_processed; not exhaustive_place_coverage';
  chrome.alarms?.clear(QUEUE_ALARM);

  await closeWorkerTab();
  await saveState(true);
  broadcastUpdate();
}

/**
 * حلقة المعالجة التتابعية المنظمة: ظاهرة تلو الأخرى عبر كامل خلايا الشبكة (Query-First Pass Architecture)
 * تضمن الانتقال المرئي السلس بين المربعات، وتلوين الظاهرة المكتملة بالأخضر فور إنهاء كافة المربعات لها.
 */
async function processQueue() {
  await stateReady;
  if (scraperState.status !== 'running' || isProcessingQueue) return;
  isProcessingQueue = true;
  try { await processQueueStep(); }
  catch(error){scraperState.status='paused';scraperState.lastError={code:'QUEUE_FAILED',message:error.message};cancelActiveWork();await saveState(true).catch(()=>{});broadcastUpdate();}
  finally {
    isProcessingQueue=false;
    if(scraperState.status==='running' && !nextStepTimer) scheduleQueue(Math.max(0,(scraperState.nextRunAt||0)-Date.now()));
  }
}

// Refine discovery views without changing the user's grid or geometric ownership.
// مبدأ «مشهد واحد لكل خلية»: لا نُقسّم إلا بدليل على وجود نتائج إضافية.
// «capped» دليل صريح (المصدر أعاد السقف)، فيسمح بتحسين مزدوج (حتى 21 مشهدًا).
// «partial»/«unknown» شكوك لا دليل، فلا تُقسَّم افتراضيًا؛ تُقسَّم فقط عند تشغيل
// «التحسين العميق» صريحًا من المستخدم (عمق واحد = 5 مشاهدات).
// A bounded tree (at most 21 views per cell/query) survives worker suspension.
function refineSearchView(scan,outcome,config,maxDepthLimit){
  if(outcome==='confirmed_empty')return [];
  const b=scan.bounds,lat=(b.minLat+b.maxLat)/2,lng=(b.minLng+b.maxLng)/2;
  const span=Math.max(b.maxLat-b.minLat,(b.maxLng-b.minLng)*Math.cos(lat*Math.PI/180));
  // تحت هذا الحجم لا يغيّر التقسيم ما يعرضه Google فعليًا، فيُهدر الوقت بلا فائدة.
  if(span<0.002)return [];
  const deepRefine=!!config?.deepRefine;
  const provenMore=outcome==='capped';
  const suspectedMore=outcome==='partial'||outcome==='unknown';
  // دليل أن القائمة ليست عن هذه الخلية: بطاقات أُرجعت ولا واحدة داخل الخلية.
  // التقسيم برفع التكبير يغيّر ما يعرضه Google فعلًا (دليل ميداني: 2 ← 5 داخل الخلية).
  const notAboutCell=Number(scan.itemCount)>0 && Number(scan.inCellCount)===0;
  if(!provenMore && !notAboutCell && !(deepRefine && suspectedMore))return [];
  const maxDepth=Math.min(provenMore?2:1,Number.isFinite(maxDepthLimit)?maxDepthLimit:Infinity);
  if(scan.depth>=maxDepth)return [];
  return [
    {minLat:b.minLat,maxLat:lat,minLng:b.minLng,maxLng:lng},
    {minLat:b.minLat,maxLat:lat,minLng:lng,maxLng:b.maxLng},
    {minLat:lat,maxLat:b.maxLat,minLng:b.minLng,maxLng:lng},
    {minLat:lat,maxLat:b.maxLat,minLng:lng,maxLng:b.maxLng}
  ].map((bounds,i)=>({path:scan.path+'.'+i,depth:scan.depth+1,bounds,
    centerLat:(bounds.minLat+bounds.maxLat)/2,centerLng:(bounds.minLng+bounds.maxLng)/2,status:'pending'}));
}

function searchViewOutcome(scans){
  const leaves=scans.filter(scan=>!scan.refined).map(scan=>scan.status);
  for(const status of ['error','unknown','capped','partial'])if(leaves.includes(status))return status;
  if(leaves.every(status=>status==='confirmed_empty'))return scans.some(scan=>scan.newCount||scan.dupCount)?'partial':'confirmed_empty';
  return 'complete';
}

async function processQueueStep() {
  const epoch = operationEpoch;
  const state = scraperState;
  const live = () => epoch === operationEpoch && state === scraperState && state.status === 'running';
  let scheduleAfter = null;
  let cell = null;
  let queryId = null;
  try {
    const {cells,config}=state;
    const queriesToRun=config.queriesToRun || [config.query];
    let qIdx=state.currentQueryIndex || 0;
    let cIdx=state.currentIndex || 0;
    if(qIdx>=queriesToRun.length){await finishJob();return;}
    if(cIdx>=cells.length){state.currentQueryIndex=qIdx+1;state.currentIndex=0;scheduleAfter=0;return;}
    cell=cells[cIdx];
    const qText=queriesToRun[qIdx];
    const plannedQuery=state.queryPlan?.queries?.[qIdx],taskLocale=plannedQuery?.lang||config.searchLocale||'ar',canonicalIds=plannedQuery?.canonicalIds||[];
    queryId=`Q${qIdx+1}`;
    const provider=SourceAdapters.get(config.provider || 'google_maps_dom');
    cell.status='processing';
    cell.statusByQuery=cell.statusByQuery || {};
    const previous=cell.statusByQuery[queryId]||{};
    const scans=previous.scans||[{path:'0',depth:0,bounds:cell.bounds,centerLat:cell.centerLat,centerLng:cell.centerLng,status:'pending'}];
    const scanIndex=Math.max(0,scans.findIndex(scan=>scan.status==='pending'));
    const scan=scans[scanIndex];
    const identity={jobId:state.jobId,cellId:cell.id,queryId:scanIndex?queryId+'.S'+scanIndex:queryId,areaVersion:state.areaVersion||0};
    const attempt=(cell.statusByQuery[queryId]?.attempt || 0)+1;
    cell.statusByQuery[queryId]={...previous,status:'running',attempt,startedAt:Date.now(),identity,scans};
    state.activeQueryText=qText;
    state.navigationEvidence=null;
    state.checkpoint={...identity,queryIndex:qIdx,cellIndex:cIdx,phase:'before_request',attempt};
    state.stats.currentStep=qIdx*cells.length+cIdx;
    state.stats.totalPassSteps=queriesToRun.length*cells.length;
    state.stats.totalQueries=queriesToRun.length;
    state.stats.currentQueryIndex=qIdx;
    await saveState(true);
    if(!live())return;
    broadcastUpdate();
    activeAbortController=new AbortController();
    let response;
    if(provider.id==='osm_overpass'){
      // Shared public services receive a small persisted daily budget, no endpoint rotation.
      const day=new Date().toISOString().slice(0,10);
      const usageStore=await chrome.storage.local.get('sourceUsage');
      if(!live())return;
      const usage=usageStore.sourceUsage?.day===day?usageStore.sourceUsage:{day,requests:0};
      const waitMs=(usage.lastRequestedAt||0)+(provider.minDelayMs||0)-Date.now();
      if(waitMs>0){
        cell.status='pending';
        cell.statusByQuery[queryId]={...cell.statusByQuery[queryId],status:'pending',attempt:Math.max(0,attempt-1),waitUntil:Date.now()+waitMs};
        scheduleAfter=waitMs;return;
      }
      if(usage.requests>=provider.maxDailyRequests)throw new SourceAdapters.SourceError('PUBLIC_DAILY_LIMIT','Public daily request budget reached.',{blocked:true});
      usage.requests++;
      usage.lastRequestedAt=Date.now();
      await chrome.storage.local.set({sourceUsage:usage});
      if(!live())return;
      response=await SourceAdapters.collectOverpass({identity,query:qText,cell,locale:taskLocale,canonicalIds},
        {signal:activeAbortController.signal,limit:Math.min(10000,Math.max(1000,Number(config.maxPerCell)||120))});
    }else{
      // Browser search is independent of the display basemap. Respect the request interval after resume too.
      if(!provider.canCollect)throw new SourceAdapters.SourceError('SOURCE_RESTRICTED','Collection is unavailable for this source.',{blocked:true});
      const timing=await chrome.storage.local.get('googleLastRequestedAt');
      if(!live())return;
      const waitMs=(timing.googleLastRequestedAt||0)+(provider.minDelayMs||2500)-Date.now();
      if(waitMs>0){cell.status='pending';cell.statusByQuery[queryId]={...cell.statusByQuery[queryId],status:'pending',attempt:Math.max(0,attempt-1),waitUntil:Date.now()+waitMs};scheduleAfter=waitMs;return;}
      await chrome.storage.local.set({googleLastRequestedAt:Date.now()});
      if(!live())return;
      const searchCell={...cell,...scan};
      const hardLimit=cameraHardLimitMeters(cell);
      // لا نبدأ الجمع إلا بعد أن تكون الصفحة صفحة هذه الخلية وكاميرتها فوقها.
      const preparePage=async(zoom)=>{
        const targetUrl=buildMapsSearchUrl(qText,searchCell,zoom,taskLocale,identity);
        const navigated=await navigateTabAndWait(state.workerTabId,targetUrl,45000,hardLimit);
        if(!live())return null;
        if(!navigated)return {success:false,errorCode:'NAVIGATION_FAILED'};
        const answer=await sendTabMessageWithRetry(state.workerTabId,{action:'PREPARE_TASK',task:identity,targetUrl,query:qText,
          hardCameraLimitMeters:hardLimit,zoom});
        if(!live())return null;
        // نفس بصمة المستند = الصفحة السابقة لم تُستبدل، فلا نقرأ نتائجها.
        if(answer?.success && answer.documentId && answer.documentId===activeTabDocumentId)return {success:false,errorCode:'STALE_DOCUMENT'};
        if(answer?.success && answer.documentId)activeTabDocumentId=answer.documentId;
        if(answer?.viewport?.pixels)observedViewportPixels=answer.viewport.pixels;
        if(answer?.success){
          // الملكية هندسية، لكن «الاكتمال» يحتاج إثبات أن العرض يحتوي الخلية كلها.
          answer.coverage=cellCoverage(searchCell,answer.viewport||{zoom},answer.view?.observed?.lat,answer.view?.observed?.lng);
        }
        return answer;
      };
      let zoom=resolveCellZoom(searchCell,scan.depth?'auto':config.zoom);
      await ensureWorkerTab(cell.id);
      if(!live())return;
      let ready=await preparePage(zoom);
      if(!live())return;
      // صفحة مستقلة لكل خلية: عند أي شك نفتح صفحة نظيفة بدل قراءة صفحة سابقة.
      if(!ready?.success && ['STALE_DOCUMENT','NAVIGATION_VIEW_MISMATCH','CAMERA_NOT_AT_CELL','STALE_PAGE','NAVIGATION_FAILED'].includes(ready?.errorCode)){
        await closeWorkerTab();
        if(!live())return;
        await ensureWorkerTab(cell.id);
        if(!live())return;
        ready=await preparePage(zoom);
        if(!live())return;
      }
      // العرض أضيق من الخلية: نعيد التوجيه مرة واحدة بتكبير يغطيها بدل قراءة جزء منها.
      if(ready?.success && ready.coverage && ready.coverage.covers===false){
        const corrected=resolveCellZoom(searchCell,'auto',ready.viewport?.pixels);
        if(corrected<zoom){
          zoom=corrected;
          ready=await preparePage(zoom);
          if(!live())return;
        }
      }
      if(!ready?.success || JSON.stringify(ready.task)!==JSON.stringify(identity))throw new SourceAdapters.SourceError(ready?.errorCode||'STALE_PAGE');
      // التحقق الصارم من نص البحث يبقى شرطًا: بدونه قد تُنسب نتائج استعلام آخر للخلية.
      if(!ready.view?.queryVerified)throw new SourceAdapters.SourceError('NAVIGATION_VIEW_MISMATCH');
      state.navigationEvidence={task:identity,zoom,...ready.view,coverage:ready.coverage||null,checkedAt:new Date().toISOString()};
      if(ready.coverage&&!scan.coverage)scan.coverage=ready.coverage;
      const scrapeRequest={action:'SCRAPE_PAGE',task:identity,query:qText,
        queryInfo:{index:qIdx,total:queriesToRun.length,cellIndex:cIdx,totalCells:cells.length},maxItems:config.maxPerCell||120,scrollDelay:config.scrollDelay||1100,uiLanguage:config.uiLanguage||'ar',searchLocale:taskLocale,
        cellInfo:{...cell,index:cIdx,total:cells.length,currentQueryIndex:qIdx,totalQueries:queriesToRun.length,queryText:qText,
          scanIndex,scanTotal:scans.length,completedTasks:state.stats.currentStep,
          studyArea:state.studyArea,studyAreaBounds:state.studyAreaBounds}};
      response=await sendTabMessageWithRetry(state.workerTabId,scrapeRequest);
      // صفحة لم ترسم أي بطاقة إطلاقًا: ليست منطقة خالية، بل صفحة لم تُقرأ.
      // أشهر سبب أن التبويب في الخلفية فلا يرسم Google قائمته. نعيد تحميل
      // صفحة الخلية مرة واحدة بدل حفظ «صفر» يوهم بأن الخلية فُحصت.
      const domSnapshot=response?.evidence?.dom;
      if(response?.success && response.evidence?.emptyVerified!==true && domSnapshot && domSnapshot.anyCards===0 && attempt<=1){
        scan.recoveredFromBlankPage=true;
        await closeWorkerTab();
        if(!live())return;
        await ensureWorkerTab(cell.id);
        if(!live())return;
        const again=await preparePage(zoom);
        if(!live())return;
        if(again?.success && again.view?.queryVerified){
          scan.coverage=again.coverage||scan.coverage;
          response=await sendTabMessageWithRetry(state.workerTabId,scrapeRequest);
        }
      }
      scan.domEvidence=response?.evidence?.dom||domSnapshot||null;
      // قائمة Google قد تكون عن منطقة أوسع: بطاقات كثيرة وكلها خارج الخلية تعني
      // أن الترتيب لم يُقيَّد بهذا العرض. نقرة «البحث في هذه المنطقة» تجعل المصدر
      // يعيد الترتيب على نافذة الخلية نفسها، ثم نقرأ مرة أخرى بدل حفظ صفر.
      if(response?.success && Array.isArray(response.items) && response.items.length && attempt<=1 && !scan.searchedAreaAgain){
        let inCellObserved=0;
        for(const raw of response.items){
          const x=Number(raw?.x),y=Number(raw?.y);
          if(!Number.isFinite(x)||!Number.isFinite(y))continue;
          const owner=SpatialUtils.findOwnerCell(x,y,cells);
          if(owner&&owner.id===cell.id){inCellObserved++;break;}
        }
        if(inCellObserved===0){
          const area=await sendTabMessageWithRetry(state.workerTabId,{action:'SEARCH_THIS_AREA',task:identity,query:qText});
          if(!live())return;
          if(area?.clicked){
            scan.searchedAreaAgain=true;
            response=await sendTabMessageWithRetry(state.workerTabId,scrapeRequest);
            scan.domEvidence=response?.evidence?.dom||scan.domEvidence||null;
          }
        }
      }
    }
    if(!live())return;
    if(!response?.success || !Array.isArray(response.items))throw new SourceAdapters.SourceError(response?.errorCode||'INVALID_RESPONSE',response?.error,{blocked:['SOURCE_BLOCKED','RATE_LIMITED'].includes(response?.errorCode),retryAfterMs:60000});
    if(!response.task || Object.keys(identity).some(key=>response.task[key]!==identity[key]))throw new SourceAdapters.SourceError('STALE_TASK_RESPONSE');
    let newCount=0,dupCount=0,outsideCount=0,unlocatedCount=0,discoveredElsewhere=0,inCellCount=0;
    if(!recordIndex)recordIndex=new PlaceRecords.RecordIndex(state.results);
    for(let i=0;i<response.items.length;i++){
      if(!live())return;
      const item=PlaceRecords.normalize(response.items[i],{provider:provider.id,exportAllowed:provider.exportAllowed,
        license:provider.license,resultLanguage:response.items[i].sourceLocale||'und',jobId:state.jobId,cellId:cell.id,queryId,
        sequence:state.results.length+i+1});
      item.queryLocale=taskLocale;
      let ownerCell=null;
      if(PlaceRecords.hasGeometry(item)){
        const inStudy=SpatialUtils.isPointInStudyArea(item.x,item.y,state.studyArea||state.studyAreaBounds);
        if(!inStudy){outsideCount++;continue;}
        ownerCell=SpatialUtils.findOwnerCell(item.x,item.y,cells);
        if(!ownerCell){outsideCount++;continue;}
        item.ownerCellId=ownerCell.id;
        item.ownerCellName=ownerCell.name;
        item.cellId=ownerCell.id;
        item.cellName=ownerCell.name;
        if(ownerCell.id!==cell.id){discoveredElsewhere++;item.qualityFlags.push('discovered_outside_current_cell');}
        else inCellCount++;
      }else{
        unlocatedCount++;
        item.ownerCellId=null;item.cellId=null;item.cellName=null;
      }
      item.discoveries=[{...identity,query:qText,queryLocale:taskLocale,observedAt:item.lastUpdated,insideCurrentCell:ownerCell?.id===cell.id}];
      if(typeof TaxonomyEngine!=='undefined' && typeof TaxonomyEngine.classifyPlaceCategory==='function'){
        const match=TaxonomyEngine.classifyPlaceCategory(item,qText);
        item.sourceCategory=item.category || '';
        item.normalizedCategory=match.normalizedCategory;
        item.categoryConfidence=match.categoryConfidence;
        item.sectorId=match.sectorId;
        const sourceConcept=TaxonomyEngine.resolveResultConcept(item);
        if(sourceConcept){
          item.canonicalId=sourceConcept.canonicalId;item.categoryIds=[sourceConcept.canonicalId];
          item.symbolId=sourceConcept.symbolId;
        }
        const concept=canonicalIds.length===1?TaxonomyEngine.getCategory(canonicalIds[0]):typeof TaxonomyEngine.resolveConcept==='function' ? TaxonomyEngine.resolveConcept(qText) : null;
        const tagged=concept?.osmTags?.length && item.osmTags && concept.osmTags.every(tag=>item.osmTags[tag.key]===tag.value);
        item.queryCategoryId=concept?.canonicalId || null;
        if(tagged){
          item.canonicalId=concept.canonicalId;item.categoryIds=[concept.canonicalId];
          item.googlePlaceType=concept.googlePlaceType||null;item.googleGcid=concept.googleGcid||null;
          item.symbolId=concept.symbolId;item.categoryConfidence='provider_tags';
          item.categoryMapping={provider:'osm_overpass',relation:concept.osmMapping?.relation||'related',source:concept.osmMapping?.source||null};
        }
      }
      const existingIdx=recordIndex.find(item);
      if(existingIdx===-1){
        item.index=state.results.length+1;item.searchKeyword=qText;
        state.results.push(item);state.seenIds.add(item.id);recordIndex.add(item,state.results.length-1);
        newCount++;
        if(ownerCell)ownerCell.itemsFound=(ownerCell.itemsFound||0)+1;
      }else{
        const previous=state.results[existingIdx];
        const merged=PlaceRecords.merge(previous,item);
        if(!PlaceRecords.hasGeometry(previous) && PlaceRecords.hasGeometry(merged) && ownerCell)ownerCell.itemsFound=(ownerCell.itemsFound||0)+1;
        merged.discoveries=[...(previous.discoveries||[]),...item.discoveries];
        state.results[existingIdx]=merged;recordIndex.add(merged,existingIdx);dupCount++;
      }
      if(i>0 && i%250===0){await sleep(0);if(!live())return;}
    }
    state.stats.itemsFound=state.results.length;
    if(newCount || dupCount)state.resultsRevision=(state.resultsRevision||0)+1;
    state.stats.duplicatesSkipped+=dupCount;
    let outcome=response.completenessStatus || 'unknown';
    if(!['complete','partial','capped','confirmed_empty','unknown'].includes(outcome))outcome='unknown';
    if(outcome==='confirmed_empty' && !response.evidence?.emptyVerified)outcome='unknown';
    // Zero retained places after spatial filtering does not establish an empty source response.
    if(!response.items.length && outcome==='complete')outcome=response.evidence?.emptyVerified?'confirmed_empty':'unknown';
    // «نهاية القائمة» لا تعني اكتمال الخلية إن كان عرض الخريطة أضيق من الخلية.
    // كانت هذه الحالة تُوسم مكتملة فتبدو الخلية منجزة وفيها معالم لم تُقرأ.
    const coverageIncomplete=Boolean(scan.coverage && scan.coverage.covers===false);
    if(coverageIncomplete && (outcome==='complete'||outcome==='confirmed_empty'))outcome='partial';
    // بطاقات أُرجعت ولا واحدة منها داخل الخلية: المصدر رتّب قائمة عن منطقة أخرى.
    // لا يصح وسم الخلية مكتملة، ولا تركها بلا قراءة أعمق.
    const listNotAboutCell=response.items.length>0 && inCellCount===0;
    if(listNotAboutCell && outcome==='complete')outcome='partial';
    Object.assign(scan,{status:outcome,evidence:response.evidence||null,newCount,dupCount,outsideCount,unlocatedCount,discoveredElsewhere,inCellCount,itemCount:response.items.length,coverageIncomplete,dom:scan.domEvidence||null,finishedAt:Date.now()});
    // سبب مفهوم لصفر سجلات: بلا هذا السطر يرى المستخدم «0» فقط بلا أي تفسير.
    if(typeof ScanDiagnostics!=='undefined'){
      scan.diagnosis=ScanDiagnostics.describeScan({items:response.items.length,newCount,dupCount,outsideCount,unlocatedCount,
        discoveredElsewhere,inCellCount,outcome,coverage:scan.coverage?.covers,dom:scan.domEvidence||null});
      state.lastScanDiagnosis={...scan.diagnosis,cellId:cell.id,cellName:cell.name||cell.id,queryId,query:qText,at:Date.now()};
    }
    // OSM: a capped Overpass response is proof of more results in the same cell. Split once
    // (depth 1 = 5 views) so the 1000-element cap no longer truncates dense neighbourhoods.
    const children=provider.id==='google_maps_dom'
      ? refineSearchView(scan,outcome,state.config)
      : (provider.id==='osm_overpass' && outcome==='capped' ? refineSearchView(scan,'capped',{...state.config,deepRefine:false},1) : []);
    if(children.length){scan.refined=true;scans.push(...children);}
    const hasPending=scans.some(view=>view.status==='pending');
    const aggregate=hasPending?'processing':searchViewOutcome(scans);
    cell.status=aggregate==='complete'?'done':aggregate;
    cell.statusByQuery[queryId]={status:hasPending?'running':aggregate,attempt:0,identity,finishedAt:hasPending?null:Date.now(),
      scans,newCount:scans.reduce((n,s)=>n+(s.newCount||0),0),dupCount:scans.reduce((n,s)=>n+(s.dupCount||0),0),
      inCellCount:scans.reduce((n,s)=>n+(s.inCellCount||0),0),
      outsideCount,unlocatedCount,discoveredElsewhere,evidence:response.evidence||null};
    state.queryStats=state.queryStats||{};
    const stats=state.queryStats[qText] || {itemsFound:0,completedCells:0,outcomes:{}};
    stats.itemsFound+=newCount;
    if(!hasPending){stats.completedCells=cIdx+1;stats.outcomes[aggregate]=(stats.outcomes[aggregate]||0)+1;}
    state.queryStats[qText]=stats;
    if(hasPending){
      state.checkpoint={...identity,queryIndex:qIdx,cellIndex:cIdx,phase:'detail_scan_committed',scanIndex};
      scheduleAfter=Math.max(provider.minDelayMs||2500,Number(config.delayMs)||1600);
      await saveState(true);broadcastUpdate();return;
    }
  }catch(error){
    if(!live())return;
    state.lastError={code:error.code||'SOURCE_ERROR',message:error.message,cellId:cell?.id,queryId,time:Date.now()};
    if(['NAVIGATION_VIEW_MISMATCH','NAVIGATION_FAILED','CAMERA_NOT_AT_CELL','STALE_DOCUMENT'].includes(error.code)){
      cell.status='error';cell.statusByQuery[queryId]={...cell.statusByQuery[queryId],status:'error',error:state.lastError};
      state.status='paused';state.pauseReason=error.code;cancelActiveWork();await saveState(true);broadcastUpdate();return;
    }
    if(error.blocked || error.code==='RATE_LIMITED'){
      cell.status='blocked';
      cell.statusByQuery[queryId]={...cell.statusByQuery[queryId],status:'blocked',error:state.lastError};
      state.status='paused';state.pauseReason=error.code;
      state.notBefore=Date.now()+(error.retryAfterMs||60000);
      cancelActiveWork();
      await saveState(true);broadcastUpdate();return;
    }
    if(cell){state.queryStats=state.queryStats||{};const errorStats=state.queryStats[state.activeQueryText]||{itemsFound:0,completedCells:0,outcomes:{}};errorStats.outcomes.error=(errorStats.outcomes.error||0)+1;state.queryStats[state.activeQueryText]=errorStats;cell.status='error';cell.statusByQuery[queryId]={...cell.statusByQuery[queryId],status:'error',error:state.lastError};}
    // Transient transport failures retry the same checkpoint a bounded number of times.
    if(cell && (cell.statusByQuery[queryId]?.attempt||0)<3 && ['TIMEOUT','HTTP_ERROR','NETWORK_UNAVAILABLE','SOURCE_ERROR'].includes(error.code||'SOURCE_ERROR')){
      await saveState(true);broadcastUpdate();scheduleAfter=5000*2**((cell.statusByQuery[queryId]?.attempt||1)-1);return;
    }
  }finally{
    activeAbortController=null;
    if(scheduleAfter!==null && live()){
      scheduleQueue(scheduleAfter);
      await saveState(true);
    }else if(!live() && scraperState.status==='running'){
      // Resume may arrive while an old response is unwinding. Queue exactly one fresh step.
      scheduleQueue(0);
    }
  }
  if(!live())return;
  const {cells,config}=state;
  state.currentIndex++;
  state.stats.completedCells=state.currentIndex;
  state.stats.currentStep=(state.currentQueryIndex||0)*cells.length+state.currentIndex;
  if(state.currentIndex>=cells.length){
    state.completedQueries=state.completedQueries||[];
    const text=config.queriesToRun[state.currentQueryIndex||0];
    if(!state.completedQueries.includes(text))state.completedQueries.push(text);
    state.stats.completedQueriesCount=state.completedQueries.length;
    state.currentQueryIndex=(state.currentQueryIndex||0)+1;state.currentIndex=0;
  }
  state.checkpoint={jobId:state.jobId,areaVersion:state.areaVersion||0,queryIndex:state.currentQueryIndex,
    cellIndex:state.currentIndex,phase:'committed'};
  await saveState(true);
  if(!live())return;
  broadcastUpdate();
  if(state.currentQueryIndex>=config.queriesToRun.length)await finishJob();
  else{
    scheduleQueue(Math.max(SourceAdapters.get(config.provider||'google_maps_dom').minDelayMs||1600,Number(config.delayMs)||1600));
    await saveState(true);
  }
}

/**
 * صفحة بحث مستقلة لكل خلية: يُغلق تبويب الخلية السابقة ويُفتح تبويب جديد،
 * حتى لا تُقرأ قائمة نتائج قديمة أو كاميرا لم تتحرك. التبويب غير مرئي.
 */
async function ensureWorkerTab(cellId) {
  const wanted = String(cellId || '');
  if (scraperState.workerTabId && scraperState.workerTabCellId === wanted) {
    try {
      const tab = await chrome.tabs.get(scraperState.workerTabId);
      if (tab) return tab;
    } catch (e) {}
  }
  if (scraperState.workerTabId) await closeWorkerTab();
  const newTab = await chrome.tabs.create({ url: 'about:blank', active: false });
  scraperState.workerTabId = newTab.id;
  scraperState.workerTabCellId = wanted;
  await saveState(true);
  return newTab;
}

/**
 * توجيه التبويب وانتظار اكتمال التحميل
 */
function taskToken(url){
  try{return new URL(url).searchParams.get('dalil_task')||'';}catch(_){return '';}
}
function matchesMapsNavigation(actual,target,toleranceMeters){
  try{
    const a=new URL(actual),b=new URL(target);
    if(a.origin!==b.origin||!a.pathname.startsWith('/maps/'))return false;
    if(a.pathname.startsWith('/maps/place/'))return true; // PREPARE_TASK also verifies the search box query.
    // كانت المقارنة تكتفي بقرب الكاميرا (حتى 50 كم)، فكانت الصفحة السابقة تُعتبر جاهزة
    // وتُقرأ نتائج الخلية السابقة. الآن نطلب بصمة المهمة نفسها: صفحة هذه الخلية تحديدًا.
    const token=taskToken(target);
    if(token && taskToken(actual)===token)return true;
    // قد يحذف Google معاملاتنا عند توحيد الرابط؛ حينها نثبت الهوية بالكاميرا نفسها.
    if(taskToken(actual))return false;
    return DalilSearchNavigation.verify(a.href,b.href,'',Math.max(150,Number(toleranceMeters)||150)).centerVerified;
  }catch(_){return false;}
}

function navigateTabAndWait(tabId, url, timeoutMs = 45000, toleranceMeters = 150) {
  const epoch=operationEpoch;
  return new Promise((resolve) => {
    let resolved = false;
    let pollTimer=null;

    function cleanup() {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        if(pollTimer)clearTimeout(pollTimer);
        chrome.tabs.onUpdated.removeListener(listener);
      }
    }

    const checkLoaded=async()=>{
      if(resolved)return;
      try{
        const loaded=await chrome.tabs.get(tabId);
        if(resolved)return;
        if(epoch!==operationEpoch){cleanup();resolve(false);return;}
        if(loaded?.status==='complete'&&matchesMapsNavigation(loaded.url,url,toleranceMeters)){cleanup();resolve(true);}
      }catch(_){cleanup();resolve(false);}
    };
    const listener = (updatedTabId, changeInfo) => {
      // Google may canonicalize the camera/query after its document complete event.
      if(updatedTabId===tabId&&(changeInfo.status==='complete'||changeInfo.url))checkLoaded();
    };
    const poll=async()=>{
      await checkLoaded();
      if(!resolved)pollTimer=setTimeout(poll,500);
    };

    const timer = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);

    chrome.tabs.onUpdated.addListener(listener);

    (async () => { try {
      const tab = await chrome.tabs.get(tabId);
      if (tab && tab.url === url && epoch===operationEpoch) {
        if (tab.status === "complete") { cleanup(); resolve(true); return; }
        // التبويب بالفعل في طريقه إلى هذا الرابط نفسه؛ لا داعي لإعادة توجيهه.
        poll();
        return;
      }
      await chrome.tabs.update(tabId, { url });
      if(!resolved)poll();
    } catch (e) {
      cleanup();
      resolve(false);
    } })();
  });
}

/**
 * إرسال رسالة إلى التبويب مع إعادة المحاولة والتحقق من بقاء التبويب مفتوحاً
 * مع حقن احتياطي تلقائي للسكريبت (Fallback Injection) في حال انقطاع القناة
 */
async function sendTabMessageWithRetry(tabId, message, maxAttempts = 5) {
  let currentTabId = tabId;
  const epoch=operationEpoch;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const tab = await chrome.tabs.get(currentTabId).catch(() => null);
      if (!tab) {
        throw Object.assign(new Error('Worker tab closed.'),{code:'WORKER_TAB_CLOSED'});
      }
      if(epoch!==operationEpoch)throw Object.assign(new Error('Task cancelled.'),{code:'CANCELLED'});
      const res = await chrome.tabs.sendMessage(currentTabId, message);
      return res;
    } catch (err) {
      if(epoch!==operationEpoch || err.code==='WORKER_TAB_CLOSED')throw err;
      // إذا انقطعت قناة الرسائل أثناء تنقلات SPA، نقوم بالحقن الاحتياطي التلقائي
      if (chrome.scripting && (err.message || "").includes("Receiving end does not exist")) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: currentTabId },
            files: ["lib/spatial-utils.js", "core/search-navigation.js", "content/content.js"]
          });
          await sleep(600);
        } catch (injectErr) {
          // تجاهل الخطأ في حال لم تكن الصفحة مهيأة بعد
        }
      }
      if (attempt === maxAttempts) throw err;
      await sleep(1000);
    }
  }
}

function broadcastUpdate() {
  const updateMsg = {
    action: "STATUS_UPDATE",
    state: {
      ...getStatusSnapshot(false),
      status: scraperState.status,
      currentIndex: scraperState.currentIndex,
      currentQueryIndex: scraperState.currentQueryIndex || 0,
      totalQueries: (scraperState.config && scraperState.config.queriesToRun) ? scraperState.config.queriesToRun.length : 1,
      completedQueries: scraperState.completedQueries || [],
      queryStats: scraperState.queryStats || {},
      activeQueryText: scraperState.activeQueryText,
      stats: scraperState.stats,
      resultsCount: scraperState.results.length,
      recentResults: scraperState.results.slice(-10).reverse(),
      currentCell: scraperState.cells[scraperState.currentIndex] || null
    }
  };

  chrome.runtime.sendMessage(updateMsg).catch(() => {});
  if(scraperState.workerTabId)chrome.tabs.sendMessage(scraperState.workerTabId,{action:'JOB_STATUS',state:updateMsg.state}).catch(()=>{});

  // بث التحديث عبر قنوات الاتصال النشطة (Active Ports)
  for (const port of activePorts) {
    try {
      port.postMessage(updateMsg);
    } catch (e) {
      activePorts.delete(port);
    }
  }
}

async function resetScraper(preserveWorkspace = true) {
  cancelActiveWork();
  await closeWorkerTab();
  if (typeof PlaceRecords !== "undefined") recordIndex = new PlaceRecords.RecordIndex([]);
  const cells=preserveWorkspace ? scraperState.cells.map(cell=>({...cell,status:'pending',itemsFound:0,statusByQuery:{}})) : [];
  const area=preserveWorkspace ? scraperState.studyArea : null;
  const resultsRevision=(scraperState.resultsRevision||0)+1;
  scraperState = {
    status: "idle",
    config: null,
    cells,
    studyArea:area,
    studyAreaBounds:preserveWorkspace?scraperState.studyAreaBounds:null,
    currentIndex: 0,
    currentQueryIndex: 0,
    activeQueryText: "",
    results: [],
    resultsRevision,
    seenIds: new Set(),
    stats: {
      totalCells: cells.length,
      completedCells: 0,
      itemsFound: 0,
      duplicatesSkipped: 0,
      startTime: null,
      endTime: null
    },
    workerTabId: null,
    workerTabCellId: null
  };
  activeTabDocumentId = null;
  recordIndex=new PlaceRecords.RecordIndex(scraperState.results);
  await saveState(true);
  broadcastUpdate();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

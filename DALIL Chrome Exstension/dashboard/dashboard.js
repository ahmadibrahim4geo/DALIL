/**
 * Coll Data (كول داتا) - Universal GIS Dashboard Controller
 * منصة المسح والتحليل الجغرافي لاستخراج المعالم المكانية والظاهرات المتعددة
 * (مساجد، محطات وقود، كشري، مواقف، مصالح حكومية، تعليم، صحة...)
 * بدون فرض أي مسميات، مع بدء نظيف للخريطة، ودعم الجداول المنفصلة وتصدير KML و Excel المستقل.
 */

document.addEventListener("DOMContentLoaded", () => {
  // متغيرات الخريطة والطبقات
  let map = null;
  let viewportLock=null;
  let rectanglePointerStart=null;
  let ignoreDrawingClickUntil=0;
  let cellsLayerGroup = null;
  let markersLayerGroup = null;
  let studyAreaLayerGroup = null;
  let drawLayerGroup = null;
  let activeCellHighlightLayer = null;
  let layerControl = null;
  let lastStatusArgs = null;

  // حالة منطقة الدراسة والشبكة - فصل تام بين ملف منطقة الدراسة المستورد والمستطيل المرسوم
  let importedStudyArea = null; // { type, polygon, bounds, name } لملفات KML/KMZ/Shapefile/GeoJSON
  let drawnRectangle = null;    // { type: "BBox", polygon, bounds, name } للمستطيل المرسوم يدوياً
  let currentStudyArea = null;  // النطاق الجغرافي النشط حالياً لتوليد الشبكة
  let workspaceRevision = 0;
  let workspaceBusy = false;
  const workspaceUndo = [];
  let isDrawingPolygon = false;
  let polygonVertices = [];
  let editLayerGroup = null;
  let allCells = [];
  let cellLayersMap = new Map(); // خريطة طبقات المربعات لتحديث ألوانها الحية فوراً
  let allResults = [];
  let lastProcessedCount = -1;
  let lastCellsCount = -1;
  let renderedOwnerScopeKey = "";
  let fetchThrottleTimer = null;
  let fetchingResults = false;
  let refreshQueued = false;
  let lastResultsRevision = -1;
  let resultsDirty = true;
  let currentStats = { duplicatesSkipped: 0 };
  const targetPlanCache=new Map();
  let targetPhenomena = []; // قائمة الظاهرات الجغرافية النشطة للبحث
  let queryTermOverrides = {};
  let activePhenomFilter = "all"; // الفلتر النشط في جدول البيانات
  let currentStatus = "idle"; // حالة المسح النشطة (idle | running | paused | stopped | completed)
  let activeCompletedQueries = []; // قائمة الظاهرات التي اكتمل مسح كافة خلاياها
  let activeCurrentQuery = ""; // الظاهرة النشطة حالياً
  let activeQueryStats = {}; // إحصائيات المعالم لكل ظاهرة

  // لغة الواجهة ومحرك الفئات والمظهر
  let currentLang = localStorage.getItem("dalil_lang") || "ar";
  let currentTheme = localStorage.getItem("dalil_theme") || "light";
  let taxFilterText = "";

  const I18N_DICT = {
    ar: {
      appTitle: "دَلِيل | اكتشاف وجمع معلومات المواقع وسجلات الأماكن",
      brandTitle: "دَلِيل",
      brandTag: "اكتشاف وجمع معلومات المواقع وسجلات الأماكن",
      brandAcronym: "اكتشاف وجمع معلومات المواقع وسجلات الأماكن",
      brandDesc: "محرك المسح الشبكي واستخراج المعالم المكانية",

      railHeadNav: "القائمة الرئيسية",
      railHeadWorkspace: "مساحة العمل",
      railHeadData: "البيانات",
      navWorkspace: "مساحة العمل",
      navPhenomena: "الظاهرات والمكتبة",
      navSetup: "النطاق والشبكة",
      navArea: "منطقة الدراسة",
      navMesh: "هندسة الشبكة",
      navOptions: "خيارات المتابعة",
      navTaxonomy: "مكتبة الظواهر",
      navRecords: "سجل البيانات",
      navAbout: "عن الأداة والمطور",

      pageTitle: "مساحة العمل المكانية",
      pageIntro: "حدّد الظاهرات ومنطقة الدراسة وشبكة المربعات، ثم ابدأ الاستخراج وراقب التقدم لحظياً.",
      fitMap: "توسيط الخريطة",
      exportAll: "تصدير النتائج",

      kpiCells: "خلايا المسح",
      kpiCellsShort: "الخلايا:",
      kpiCellsSub: "شبكة قابلة للتعديل (1 – 40)",
      kpiPlaces: "المعالم المرصودة",
      kpiPlacesShort: "المعالم:",
      kpiPlacesSub: "مواقع مستخرجة من الخلايا",
      kpiDuplicates: "المستبعدات (تكرار)",
      kpiDupShort: "المستبعدات:",
      kpiDuplicatesSub: "تكرارات أُزيلت تلقائياً",
      kpiProgress: "تقدم المسح",
      kpiProgressShort: "التقدم:",
      kpiReady: "جاهز للإعداد",

      phenomUnifiedTitle: "تحديد الظاهرات ومكتبة التصنيفات المكانية",
      phenomUnifiedSubtitle: "اكتب أي ظاهرة يدوياً أو تصفح المكتبة الجغرافية الشاملة (31 قطاعاً / 940 ظاهرة) لتنزل في قائمة الاستهداف فوراً.",
      lblActiveCount: "ظاهرة نشطة",

      setupAreaTitle: "1. تحديد نطاق ومنطقة الدراسة",
      setupAreaSubtitle: "استورد حدود المنطقة من ملف KML / KMZ أو ارسم المستطيل على الخريطة",
      lblGridSubtitle: "تحكم دقيق بالصفوف والأعمدة بالسحب أو الكتابة المباشرة للأرقام",
      setupOptionsTitle: "3. خيارات المتابعة ومحرك الاستخراج",
      setupOptionsSubtitle: "ضبط مستوى التقريب Zoom والمهلة ومستويات الأمان والحفظ التراكمي",

      recordsFullTitle: "مركز البيانات والتصدير المكاني",
      recordsFullSubtitle: "استعراض تفصيلي لكافة المعالم المستخرجة مع إمكانية التصدير المباشر لجميع صيغ الـ GIS وإكسيل.",

      mapTitle: "خريطة منطقة الدراسة",
      mapSubtitle: "خلايا البحث والنتائج ذات الإحداثيات الموثقة من المصدر المختار",
      mapPan: "تحريك",
      mapRect: "مستطيل",
      mapSatellite: "خرائط الأساس (طبقات)",
      lgPending: "قيد الانتظار",
      lgActive: "جاري المسح",
      lgDone: "مكتملة",
      lgEmpty: "خالية",
      lgMarker: "معلم",
      mapProvider: "خرائط Google",

      panelTitle: "إعداد مهمة الاستخراج",
      panelSubtitle: "أربع خطوات واضحة داخل لوحة مستقلة",
      tabPhenomenaShort: "الظاهرات",
      tabAreaShort: "المنطقة",
      tabMeshShort: "الشبكة",
      tabOptionsShort: "الخيارات",

      btnStart: "بدء الاستخراج",
      btnPause: "إيقاف مؤقت",
      btnResume: "استئناف",
      btnStop: "إيقاف الاستخراج",
      runCaption: "التقدم والوقت المتبقي",

      statusReady: "جاهز",
      statusRunning: "جاري المسح",
      statusPaused: "تم الإيقاف",
      statusStopped: "متوقف",
      statusCompleted: "اكتملت المهام المجدولة",

      hudCells: "الخلايا:",
      hudPlaces: "المعالم المرصودة:",
      hudDup: "مكررات مستبعدة:",
      btnDedup: "تنظيف التكرار",
      btnClear: "تفريغ",
      btnRefresh: "تحديث",

      tabPhenomena: "1. الظاهرات المستهدفة",
      tabArea: "2. منطقة الدراسة",
      tabMesh: "3. هندسة الشبكة",
      tabOptions: "4. خيارات المتابعة",

      cardHeadingPhenom: "تحديد الظاهرات الجغرافية المراد استخراجها",
      phenomDesc: "اكتب اسم أي ظاهرة جغرافية أو نشاط مكاني بحرية تامة دون قيود، أو اختر من الدليل الجغرافي الشامل (31 قطاعاً عالمياً).",
      inputPlaceholder: "اكتب اسم أي ظاهرة (مثال: مساجد، كشري، بنوك، McDonald's...)",
      lblAddPhenomenon: "ظاهرة أو كلمة بحث مخصصة",
      btnAdd: "إضافة",
      lblTaxonomyBrowse: "مكتبة الظواهر المكانية (31 قطاعاً / 940 ظاهرة)",
      btnBrowseTaxonomy: "تصفح واختيار الفئات والقطاعات…",
      taxSearchPlaceholder: "ابحث في الفئات والأنشطة (عربي أو إنجليزي)…",
      selectAllVisible: "تحديد كل المعروض",
      deselectAll: "إلغاء التحديد",
      doneClose: "تم",
      lblSelectedPhenomena: "الظواهر المستهدفة",
      activePhenomTitle: "قائمة الظاهرات المستهدفة للبحث:",
      clearAll: "مسح الكل",
      emptyPhenomNotice: "لم تتم إضافة أي ظاهرة بعد. اكتب اسم الظاهرة واضغط «إضافة» أو اختر من المكتبة أعلاه.",
      bilingualToggleTitle: "دعم التسميات المزدوجة (عربي + إنجليزي)",
      bilingualToggleDesc: "يبحث بالاسم العربي ومرادفه الإنجليزي لضمان استخراج المعالم المسجلة بأسماء لاتينية.",
      lblQueryPlanMode: "نمط خطة الاستعلامات (Query Plan Mode):",
      optQueryPlanComp: "شامل (Comprehensive) — فحص 100% من الأنشطة الفرعية دون دمج",
      optQueryPlanBal: "متوازن (Balanced) — استخراج متوازن وتجميع ذكي",
      optQueryPlanFast: "سريع (Fast) — كلمات دلالية مجمعة لتغطية سريعة",
      taxResizeTip: "اسحب الحافة لتكبير القائمة",

      lblUploadArea: "(1) استيراد النطاق من ملف KML أو KMZ",
      dropText: "انقر لاختيار ملف أو اسحبه هنا",
      btnBrowseFiles: "استعراض الملف",
      btnRemoveFile: "إزالة",
      lblDrawRect: "(2) رسم مستطيل منطقة الدراسة",
      btnDrawRect: "رسم مستطيل",
      btnClearRect: "مسح المستطيل",

      lblGridTitle: "شبكة المربعات (Mesh Grid)",
      lblRows: "عدد الصفوف (Rows)",
      lblCols: "عدد الأعمدة (Columns)",
      lblOverlap: "نسبة تداخل المربعات (Overlap)",
      lblClipMesh: "اقتصار الشبكة على المربعات المتقاطعة مع منطقة الدراسة",
      btnGenerateGrid: "توليد وتحديث شبكة المربعات",

      optAccumulate: "حفظ النتائج تراكمياً",
      optAccumulateDesc: "إضافة نتائج جديدة فوق السابقة مع تجنّب التكرار بدل مسح السجل.",
      optAutoDedup: "حذف التكرار المكاني التلقائي",
      optAutoDedupDesc: "مقارنة الإحداثيات واسم المنشأة وحذف التكرارات الناتجة عن تداخل الخلايا.",
      optAutoPan: "ملاحقة الكاميرا للمربع الجاري فحصه",
      optAutoPanDesc: "توسيط الخريطة تلقائياً فوق المربع النشط أثناء المسح.",
      optZoomActive: "تكبير الخريطة على المربع النشط",
      optZoomActiveDesc: "الانتقال إلى مستوى تقريب مناسب للمربع قيد المسح.",
      lblZoom: "مستوى التقريب (Zoom)",
      lblDelay: "المهلة بين الخلايا (ms)",
      optNotice: "زيادة عدد الخلايا أو الظاهرات ترفع زمن المسح بشكل خطي. راجع التقدير قبل البدء.",

      btnExport: "تصدير",
      tableTitle: "سجل المعالم والظواهر المستخرجة",
      tableSubtitle: "فلترة مستقلة لكل فئة وظاهرة لمنع التداخل",
      tableFoot: "البيانات محفوظة محلياً داخل المتصفح فقط",
      tabAll: "كافة المعالم",
      filterPlaceholder: "تصفية بالاسم، الحي، العنوان، الهاتف…",
      prevPage: "السابق",
      nextPage: "التالي",
      thNo: "م",
      thName: "اسم المعلم",
      thNameEn: "الاسم الإنجليزي",
      thMainCat: "الفئة الرئيسية",
      thSubCat: "التصنيف الفرعي",
      thPhenom: "الظاهرة",
      thX: "X / Longitude",
      thY: "Y / Latitude",
      thAddress: "العنوان والحي",
      thPhone: "الهاتف",
      thWebsite: "الموقع",
      thHours: "حالة العمل",
      thRating: "التقييم",
      thSource: "المصدر",
      thCell: "المربع",
      thMap: "الخريطة",
      thDelete: "حذف"
    },
    en: {
      appTitle: "DALIL | Discovery and Acquisition of Location Information & Listings",
      brandTitle: "DALIL",
      brandTag: "Discovery and Acquisition of Location Information & Listings",
      brandAcronym: "Discovery and Acquisition of Location Information & Listings",
      brandDesc: "Spatial Features & POI Mesh Survey Engine",

      railHeadNav: "Main Navigation",
      railHeadWorkspace: "Workspace",
      railHeadData: "Data",
      navWorkspace: "Workspace",
      navPhenomena: "Features & Library",
      navSetup: "Area & Grid",
      navArea: "Study Area",
      navMesh: "Grid Design",
      navOptions: "Survey Options",
      navTaxonomy: "Taxonomy Library",
      navRecords: "Records",
      navAbout: "About DALIL",

      pageTitle: "Geo Workspace",
      pageIntro: "Pick features, define the study area and mesh grid, then start extraction and watch progress live.",
      fitMap: "Fit Map",
      exportAll: "Export Results",

      kpiCells: "Survey Cells",
      kpiCellsShort: "Cells:",
      kpiCellsSub: "Adjustable grid (1 – 40)",
      kpiPlaces: "POIs Found",
      kpiPlacesShort: "POIs:",
      kpiPlacesSub: "Places extracted from cells",
      kpiDuplicates: "Removed (duplicates)",
      kpiDupShort: "Duplicates:",
      kpiDuplicatesSub: "Duplicates filtered out",
      kpiProgress: "Survey Progress",
      kpiProgressShort: "Progress:",
      kpiReady: "Ready to configure",

      phenomUnifiedTitle: "Target Features & Spatial Taxonomy Library",
      phenomUnifiedSubtitle: "Enter custom features or pick from 31 global sectors / 940 features to target immediately.",
      lblActiveCount: "active features",

      setupAreaTitle: "1. Define Study Area & Boundaries",
      setupAreaSubtitle: "Import boundaries from KML / KMZ or draw a rectangle directly on the map",
      lblGridSubtitle: "Precise rows and columns control via slider or manual typing",
      setupOptionsTitle: "3. Engine & Survey Options",
      setupOptionsSubtitle: "Configure Zoom level, delay speed & safety ratings, and cumulative storage",

      recordsFullTitle: "Spatial Data & Export Hub",
      recordsFullSubtitle: "Detailed review of all extracted places with one-click export to GIS & Excel formats.",

      mapTitle: "Study Area Map",
      mapSubtitle: "Search cells and verified points from the selected data source",
      mapPan: "Pan",
      mapRect: "Rectangle",
      mapSatellite: "Basemap Layers",
      lgPending: "Pending",
      lgActive: "Scanning",
      lgDone: "Completed",
      lgEmpty: "Empty",
      lgMarker: "POI",
      mapProvider: "OpenStreetMap",

      panelTitle: "Extraction Task Setup",
      panelSubtitle: "Four clear steps in one dedicated panel",
      tabPhenomenaShort: "Features",
      tabAreaShort: "Area",
      tabMeshShort: "Grid",
      tabOptionsShort: "Options",

      btnStart: "Start Extraction",
      btnPause: "Pause",
      btnResume: "Resume",
      btnStop: "Stop Extraction",
      runCaption: "Progress & remaining time",

      statusReady: "Ready",
      statusRunning: "Scanning",
      statusPaused: "Paused",
      statusStopped: "Stopped",
      statusCompleted: "Scheduled tasks complete",

      hudCells: "Cells:",
      hudPlaces: "POIs Found:",
      hudDup: "Duplicates Removed:",
      btnDedup: "Smart Dedup",
      btnClear: "Clear Data",
      btnRefresh: "Refresh",

      tabPhenomena: "1. Target Features",
      tabArea: "2. Study Area",
      tabMesh: "3. Grid Mesh",
      tabOptions: "4. Survey Options",

      cardHeadingPhenom: "Target Spatial Features & POI Categories",
      phenomDesc: "Type any spatial feature, place, or brand freely, or explore the Global Taxonomy (31 Sectors).",
      inputPlaceholder: "Type any POI or brand (e.g. Mosque, Bank, Pharmacy, McDonald's...)",
      lblAddPhenomenon: "Custom feature or search term",
      btnAdd: "Add",
      lblTaxonomyBrowse: "Spatial Taxonomy Library (31 sectors / 940 features)",
      btnBrowseTaxonomy: "Browse & select categories & sectors…",
      taxSearchPlaceholder: "Search categories & POIs (Arabic or English)…",
      selectAllVisible: "Select All Visible",
      deselectAll: "Deselect All",
      doneClose: "Done",
      lblSelectedPhenomena: "Target features",
      activePhenomTitle: "Target Features Queue:",
      clearAll: "Clear All",
      emptyPhenomNotice: "No features added yet. Type a term above and click 'Add' or select from the library.",
      bilingualToggleTitle: "Bilingual labels (Arabic + English)",
      bilingualToggleDesc: "Searches both Arabic terms and their English counterparts so Latin-named places are not missed.",
      lblQueryPlanMode: "Query Plan Mode:",
      optQueryPlanComp: "Comprehensive (100% Leaves — Zero silent dropping)",
      optQueryPlanBal: "Balanced (Smart deduplicated groups)",
      optQueryPlanFast: "Fast (High-level sector queries only)",
      taxResizeTip: "Drag the edge to resize this list",

      lblUploadArea: "(1) Import the extent from a KML or KMZ file",
      dropText: "Click to choose a file or drop it here",
      btnBrowseFiles: "Browse File",
      btnRemoveFile: "Remove",
      lblDrawRect: "(2) Draw the study area rectangle",
      btnDrawRect: "Draw Rectangle",
      btnClearRect: "Clear Rectangle",

      lblGridTitle: "Mesh Grid",
      lblRows: "Rows",
      lblCols: "Columns",
      lblOverlap: "Cell overlap",
      lblClipMesh: "Limit the grid to cells intersecting the study area",
      btnGenerateGrid: "Generate & refresh mesh grid",

      optAccumulate: "Accumulate results",
      optAccumulateDesc: "Append new results on top of existing ones while avoiding duplicates.",
      optAutoDedup: "Automatic spatial deduplication",
      optAutoDedupDesc: "Compares coordinates and place names to drop duplicates caused by overlapping cells.",
      optAutoPan: "Follow the active cell with the camera",
      optAutoPanDesc: "Automatically centers the map over the cell being scanned.",
      optZoomActive: "Zoom the map to the active cell",
      optZoomActiveDesc: "Flies to a suitable zoom level for the cell under scan.",
      lblZoom: "Zoom level",
      lblDelay: "Delay between cells (ms)",
      optNotice: "More cells or features increase survey time linearly. Review the estimate before starting.",

      btnExport: "Export",
      tableTitle: "Extracted Places & Features",
      tableSubtitle: "Independent filtering per category and feature",
      tableFoot: "Data is stored locally inside this browser only",
      tabAll: "All places",
      filterPlaceholder: "Filter by name, district, address, phone…",
      prevPage: "Previous",
      nextPage: "Next",
      thNo: "#",
      thName: "Place name",
      thNameEn: "English name",
      thMainCat: "Main category",
      thSubCat: "Sub-category",
      thPhenom: "Feature",
      thX: "X / Longitude",
      thY: "Y / Latitude",
      thAddress: "Address & district",
      thPhone: "Phone",
      thWebsite: "Website",
      thHours: "Working hours",
      thRating: "Rating",
      thSource: "Source",
      thCell: "Cell",
      thMap: "Map",
      thDelete: "Delete"
    }
  };

  if (typeof DalilI18n !== "undefined") {
    Object.assign(I18N_DICT.ar, DalilI18n.messages.ar);
    Object.assign(I18N_DICT.en, DalilI18n.messages.en);
  }
  function t(key) { return (I18N_DICT[currentLang] || I18N_DICT.ar)[key] || key; }
  function localizeCategory(value, branchId) { if(value?.kind==="free_text")return value.text;return typeof TaxonomyEngine !== "undefined" && TaxonomyEngine.getLocalizedLeaf ? TaxonomyEngine.getLocalizedLeaf(value, currentLang, branchId) : value; }
  function targetKey(value){return TaxonomyEngine.selectionKey?TaxonomyEngine.selectionKey(value):String(value);}
  function symbolInput(value){return value?.kind==="free_text"?{category:value.text,searchKeyword:value.text}:typeof value==="string"?{categoryId:value,category:value}:value;}
  function getSearchLocale(){const input=document.getElementById("searchLocale");return SearchLanguages.normalizeLocale(input?.value==="__custom__"?document.getElementById("customSearchLocale")?.value:input?.value||"ar");}
  function buildUiQueryPlan(targets=targetPhenomena){const locale=getSearchLocale();return TaxonomyEngine.buildQueryPlan({selectedLeaves:targets,searchLanguage:locale,uiLanguage:currentLang,provider:document.getElementById("dataSource")?.value||"google_maps_dom",mode:selectQueryPlanMode?.value||"comprehensive",bilingualEnabled:['ar','en'].includes(SearchLanguages.localeInfo(locale).language)&&!!sideBilingualToggle?.checked,queryTerms:queryTermOverrides,fallbackLanguage:document.getElementById("allowEnglishSearchFallback")?.checked?'en':null});}
  function renderSearchLanguageChoices(locale=null){
    if(typeof SearchLanguages==="undefined")return;
    const select=document.getElementById("searchLocale");if(!select)return;
    const previous=locale||(select.value==="__custom__"?document.getElementById("customSearchLocale")?.value:select.value)||'ar';
    const rows=SearchLanguages.listProviderLanguages('google_maps_platform',currentLang),seen=new Set();select.innerHTML='';
    for(const row of rows){if(seen.has(row.locale))continue;seen.add(row.locale);const option=document.createElement('option');option.value=row.locale;option.textContent=row.label+' ('+row.locale+')';select.appendChild(option);}
    const custom=document.createElement('option');custom.value='__custom__';custom.textContent=t('customSearchLocale');select.appendChild(custom);
    select.value=seen.has(previous)?previous:'__custom__';const field=document.getElementById('customSearchLocaleField');field?.classList.toggle('hidden',select.value!=='__custom__');
    if(select.value==='__custom__')document.getElementById('customSearchLocale').value=previous;
  }
  function saveSearchLanguageSettings(){try{chrome.storage.local.set({searchLanguageSettings:{locale:getSearchLocale(),fallback:!!document.getElementById('allowEnglishSearchFallback')?.checked,queryTerms:queryTermOverrides}});}catch(_){}}
  function setupSearchLanguageControls(){
    if(typeof SearchLanguages==="undefined")return;
    renderSearchLanguageChoices();
    for(const id of ['searchLocale','customSearchLocale','allowEnglishSearchFallback','dataSource'])document.getElementById(id)?.addEventListener('change',()=>{
      document.getElementById('customSearchLocaleField')?.classList.toggle('hidden',document.getElementById('searchLocale')?.value!=='__custom__');targetPlanCache.clear();saveSearchLanguageSettings();renderPhenomenaChips();updateQueryReview();
    });
    document.getElementById('btnSaveQueryTerms')?.addEventListener('click',()=>{
      for(const input of document.querySelectorAll('.query-term-override')){if(input.value.trim()){queryTermOverrides[input.dataset.selectionId]??={};queryTermOverrides[input.dataset.selectionId][input.dataset.locale]=input.value;}}
      targetPlanCache.clear();saveSearchLanguageSettings();renderPhenomenaChips();updateQueryReview();
    });
    updateQueryReview();
  }
  function updateQueryReview(){
    if(typeof SearchLanguages==="undefined")return;
    const panel=document.getElementById('translationReviewPanel'),list=document.getElementById('missingTranslationList'),notice=document.getElementById('searchLanguageNotice');if(!panel||!list)return;
    try{
      const locale=getSearchLocale(),plan=buildUiQueryPlan(),unique=new Map();
      for(const missing of plan.unresolvedTranslations||[])unique.set((missing.selectionId||missing.canonicalId)+'|'+missing.locale,missing);
      panel.classList.toggle('hidden',!unique.size);list.innerHTML='';
      for(const missing of [...unique.values()].slice(0,40)){
        const id=missing.selectionId||missing.canonicalId,label=document.createElement('label');label.className='query-term-row';
        const text=document.createElement('span');text.textContent=localizeCategory(missing.canonicalId||id)+' · '+missing.locale;
        const input=document.createElement('input');input.type='text';input.className='input query-term-override';input.dir='auto';input.maxLength=1000;input.dataset.selectionId=id;input.dataset.locale=missing.locale;input.setAttribute('aria-label',text.textContent);label.appendChild(text);label.appendChild(input);list.appendChild(label);
      }
      if(unique.size>40){const text=document.createElement('p');text.textContent=t('translationBatchHint');list.appendChild(text);}
      if(notice)notice.textContent=(unique.size?String(unique.size)+' '+t('missingQueryTerms'):String(plan.queries.length)+' '+t('plannedLocaleQueries'))+' · '+locale+(plan.fallbacks?.length?' · '+t('explicitEnglishFallback'):'')+' · '+t('providerLocaleNotice');
      if(sideBilingualToggle)sideBilingualToggle.disabled=!['ar','en'].includes(SearchLanguages.localeInfo(locale).language)||['running','paused'].includes(currentStatus);
    }catch(error){if(notice)notice.textContent=t('INVALID_LOCALE');panel.classList.add('hidden');}
  }
  function cellCountLabel(count) { return count + " " + (currentLang === "ar" ? "خلية" : "cells"); }
  function areaCanChange() {
    if (workspaceBusy || currentStatus === "running" || currentStatus === "paused") { alert(t("workspaceLocked")); return false; }
    return true;
  }
  function setWorkspaceBusy(value){
    workspaceBusy=value;
    for(const id of ['btnStartDrawRect','btnDrawPolygon','btnEditArea','btnUndoArea','btnClearStudyArea','btnGenerateGridNow','btnTopStart','btnBrowseFiles','studyAreaFileInput','inputSearchBufferMeters']){
      const element=document.getElementById(id);if(element)element.disabled=value;
    }
  }
  function workspaceSnapshot() { return { schemaVersion: 1, revision: workspaceRevision, importedStudyArea, drawnStudyArea: drawnRectangle, activeAreaId: currentStudyArea && currentStudyArea.id, cells: allCells,gridSettings:{rows:Number(document.getElementById("inputGridRowsNum")?.value||5),cols:Number(document.getElementById("inputGridColsNum")?.value||5),overlap:Number(inputOverlapPercent.value),clip:checkClipToStudyArea.checked} }; }
  function rememberWorkspace() { workspaceUndo.push(JSON.parse(JSON.stringify(workspaceSnapshot()))); if (workspaceUndo.length > 20) workspaceUndo.shift(); }
  function applyWorkspaceSnapshot(snapshot) {
    const state = WorkspaceState.normalize(snapshot);
    workspaceRevision = state.revision;
    const active=WorkspaceState.getActiveArea(state);
    importedStudyArea = state.importedStudyArea?.id===active?.id?state.importedStudyArea:null;
    drawnRectangle = state.drawnStudyArea?.id===active?.id?state.drawnStudyArea:null;
    currentStudyArea = WorkspaceState.getActiveArea(state);
    allCells = state.cells;
    const settings=state.gridSettings;
    if(settings){
      for(const [ids,value] of [[["inputGridRowsNum","inputGridRows","labelGridRows"],settings.rows],[["inputGridColsNum","inputGridCols","labelGridCols"],settings.cols]]){
        if(Number.isInteger(value)&&value>=1&&value<=40)for(const id of ids){const el=document.getElementById(id);if(el){if(el.tagName==="INPUT")el.value=value;else el.textContent=value;}}
      }
      if(Number.isFinite(settings.overlap))inputOverlapPercent.value=String(settings.overlap);
      if(typeof settings.clip==="boolean")checkClipToStudyArea.checked=settings.clip;
    }
    if (studyAreaLayerGroup) studyAreaLayerGroup.clearLayers();
    if (drawLayerGroup) drawLayerGroup.clearLayers();
    if (importedStudyArea) renderStudyAreaBoundary(importedStudyArea.polygon, importedStudyArea.bounds, importedStudyArea);
    if (drawnRectangle) renderDrawnRectangle(drawnRectangle.bounds);
    if (fileUploadInfo) fileUploadInfo.classList.toggle("hidden", !importedStudyArea);
    if (fileNameLabel) fileNameLabel.textContent = importedStudyArea ? importedStudyArea.name : "";
    renderMapGrid(allCells);
    if (hudCellsCount) hudCellsCount.textContent = allCells.length;
    if (cellsTotalPreviewBadge) cellsTotalPreviewBadge.textContent = cellCountLabel(allCells.length);
    if (activeCellHighlightLayer) activeCellHighlightLayer.clearLayers();
    updateStudyAreaBanner();
    fitMapToStudyArea();
  }
  function runWorkspaceOperation(operation, snapshot) {
    return new Promise(resolve => {
      setWorkspaceBusy(true);
      chrome.runtime.sendMessage({ action: "WORKSPACE_ACTION", operation, workspace: snapshot }, response => {
        setWorkspaceBusy(false);
        if (chrome.runtime.lastError || !response || !response.success) { alert(t("workspaceSaveFailed") + errorText(response)); resolve(false); return; }
        const next = response.workspace || response.workspaceState || WorkspaceState.applyOperation(workspaceSnapshot(), operation, snapshot);
        resetDrawingModes();
        applyWorkspaceSnapshot(next);
        resolve(true);
      });
    });
  }

  function applyLanguage(lang) {
    lang = I18N_DICT[lang] ? lang : "ar";
    if (currentLang !== lang) activePhenomFilter = "all";
    currentLang = lang;
    localStorage.setItem("dalil_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = (lang === "ar") ? "rtl" : "ltr";

    const btnLangToggle = document.getElementById("btnLangToggle");
    if (btnLangToggle) {
      const label = btnLangToggle.querySelector("span");
      if (label) {
        label.textContent = (lang === "ar") ? "الإنجليزية" : "Arabic";
      } else {
        btnLangToggle.textContent = (lang === "ar") ? "الإنجليزية" : "Arabic";
      }
    }

    const btnThemeToggle = document.getElementById("btnThemeToggle");
    if (btnThemeToggle) {
      if (currentTheme === "dark") {
        btnThemeToggle.textContent = "☀️";
        btnThemeToggle.title = (lang === "ar") ? "التبديل إلى المظهر الفاتح" : "Switch to Light Theme";
      } else {
        btnThemeToggle.textContent = "🌙";
        btnThemeToggle.title = (lang === "ar") ? "التبديل إلى المظهر الداكن" : "Switch to Dark Theme";
      }
    }

    const dict = I18N_DICT[lang] || I18N_DICT.ar;
    document.title = dict.appTitle || "DALIL";
    if (typeof ExportUtils !== "undefined" && ExportUtils.setLanguage) ExportUtils.setLanguage(lang);
    if (typeof DalilI18n !== "undefined") DalilI18n.apply(document, lang);

    document.querySelectorAll("[data-i18n]").forEach(el => {
      const key = el.getAttribute("data-i18n");
      if (dict[key]) el.textContent = dict[key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(el => {
      const key = el.getAttribute("data-i18n-placeholder");
      if (dict[key]) el.setAttribute("placeholder", dict[key]);
    });

    if (inputNewPhenomenon && dict.inputPlaceholder) {
      inputNewPhenomenon.setAttribute("placeholder", dict.inputPlaceholder);
    }
    if (emptyPhenomenaNotice && dict.emptyPhenomNotice) {
      emptyPhenomenaNotice.textContent = dict.emptyPhenomNotice;
    }
    if(drawInstructionHint)drawInstructionHint.textContent=t("drawHint");

    const brandTitleText = document.getElementById("brandTitleText");
    const brandSubtitleText = document.getElementById("brandSubtitleText");
    if (brandTitleText) {
      brandTitleText.textContent = (lang === "ar") ? "دَلِيل" : "DALIL";
    }
    if (brandSubtitleText) {
      brandSubtitleText.textContent = (lang === "ar")
        ? "اكتشاف وجمع معلومات المواقع وسجلات الأماكن"
        : "Discovery and Acquisition of Location Information & Listings";
    }

    updateStudyAreaBanner();
    refreshLayerControl();
    updateLockButton();
    if (cellsTotalPreviewBadge) cellsTotalPreviewBadge.textContent = cellCountLabel(allCells.length);
    if (lastStatusArgs) updateStatusControls(...lastStatusArgs);
    renderMapGrid(allCells);
    renderTaxonomyTree();
    renderPhenomenaChips();
    renderSearchLanguageChoices();updateQueryReview();
    document.querySelectorAll(".suggest-chip").forEach(button=>{
      const old=button.querySelector(".tax-symbol");if(old)old.remove();
      button.insertAdjacentHTML("afterbegin",categorySymbolHtml(button.getAttribute("data-phenom")));
    });
    if (allResults) {
      renderPhenomenaTabs();
      renderTable(allResults);
      renderMapMarkers(allResults);
    }
  }

  function applyTheme(theme) {
    currentTheme = theme;
    localStorage.setItem("dalil_theme", theme);
    document.documentElement.setAttribute("data-theme", theme);

    const brandLogoImg = document.getElementById("brandLogoImg");
    if (brandLogoImg) {
      // في الواجهة الداكنة نستخدم اللوجو الفاتح (03_App_Icon_Light_1024)
      // وفي الواجهة الفاتحة نستخدم اللوجو الداكن (03_App_Icon_Dark_1024)
      brandLogoImg.src = (theme === "dark") ? "../assets/dalil_logo_light.png" : "../assets/dalil_logo_dark.png";
    }

    const btnThemeToggle = document.getElementById("btnThemeToggle");
    if (btnThemeToggle) {
      if (theme === "dark") {
        btnThemeToggle.textContent = "☀️";
        btnThemeToggle.title = (currentLang === "ar") ? "التبديل إلى المظهر الفاتح" : "Switch to Light Theme";
      } else {
        btnThemeToggle.textContent = "🌙";
        btnThemeToggle.title = (currentLang === "ar") ? "التبديل إلى المظهر الداكن" : "Switch to Dark Theme";
      }
    }
  }

  // حالات رسم المستطيل على الخريطة
  let isDrawingRect = false;
  let rectStartCorner = null;
  let tempDrawLayer = null;

  // عناصر الشريط العلوي
  const dashboardStatusText = document.getElementById("dashboardStatusText");
  const btnTopStart = document.getElementById("btnTopStart");
  const btnTopPause = document.getElementById("btnTopPause");
  const btnTopResume = document.getElementById("btnTopResume");
  const btnTopStop = document.getElementById("btnTopStop");
  const hudCellsCount = document.getElementById("hudCellsCount");
  const hudPlacesCount = document.getElementById("hudPlacesCount");
  const hudDupCount = document.getElementById("hudDupCount");
  const btnDashDedup = document.getElementById("btnDashDedup");
  const btnDashClear = document.getElementById("btnDashClear");
  const btnRefresh = document.getElementById("btnRefresh");

  // التبويبات الجانبية
  const sideTabBtns = document.querySelectorAll(".side-tab-btn");
  const sideTabPanes = document.querySelectorAll(".side-tab-pane");

  // عناصر التبويب 1: إدارة الظاهرات الجغرافية المستهدفة ومكتبة التصنيفات
  const inputNewPhenomenon = document.getElementById("inputNewPhenomenon");
  const btnAddPhenomenon = document.getElementById("btnAddPhenomenon");
  const taxSearchInput = document.getElementById("taxSearchInput");
  const btnTaxSearchClear = document.getElementById("btnTaxSearchClear");
  const btnTaxSelectAllVisible = document.getElementById("btnTaxSelectAllVisible");
  const btnTaxDeselectAll = document.getElementById("btnTaxDeselectAll");
  const taxonomyTreeList = document.getElementById("taxonomyTreeList");
  const taxSelectedCountBadge = document.getElementById("taxSelectedCountBadge");
  const activePhenomenaContainer = document.getElementById("activePhenomenaContainer");
  const activePhenomenaCount = document.getElementById("activePhenomenaCount");
  const btnClearAllPhenomena = document.getElementById("btnClearAllPhenomena");
  const emptyPhenomenaNotice = document.getElementById("emptyPhenomenaNotice");
  const sideBilingualToggle = document.getElementById("sideBilingualToggle");
  const selectQueryPlanMode = document.getElementById("selectQueryPlanMode");
  const btnLangToggle = document.getElementById("btnLangToggle");

  // عناصر التبويب 2: منطقة الدراسة والرفع والرسم
  const studyAreaFileInput = document.getElementById("studyAreaFileInput");
  const kmlDropzone = document.getElementById("kmlDropzone");
  const btnBrowseFiles = document.getElementById("btnBrowseFiles");
  const fileUploadInfo = document.getElementById("fileUploadInfo");
  const fileNameLabel = document.getElementById("fileNameLabel");


  const btnStartDrawRect = document.getElementById("btnStartDrawRect");

  const drawInstructionHint = document.getElementById("drawInstructionHint");
  const studyAreaStatusBanner = document.getElementById("studyAreaStatusBanner");

  // عناصر التبويب 3: ضبط الشبكة
  const inputGridRows = document.getElementById("inputGridRows");
  const inputGridCols = document.getElementById("inputGridCols");
  const labelGridRows = document.getElementById("labelGridRows");
  const labelGridCols = document.getElementById("labelGridCols");
  const inputOverlapPercent = document.getElementById("inputOverlapPercent");
  const checkClipToStudyArea = document.getElementById("checkClipToStudyArea");
  const btnGenerateGridNow = document.getElementById("btnGenerateGridNow");
  const cellsTotalPreviewBadge = document.getElementById("cellsTotalPreviewBadge");

  // عناصر التبويب 4: خيارات الحفظ والمتابعة
  const checkAccumulateData = document.getElementById("checkAccumulateData");
  const checkAutoDedup = document.getElementById("checkAutoDedup");
  const checkAutoPanCamera = document.getElementById("checkAutoPanCamera");
  const checkZoomActiveCell = document.getElementById("checkZoomActiveCell");
  const settingZoomLevel = document.getElementById("settingZoomLevel");
  const settingDelayMs = document.getElementById("settingDelayMs");

  // أشرطة الخريطة العائمة
  const btnMapToolPan = document.getElementById("btnMapToolPan");
  const btnFitMapExtent = document.getElementById("btnTitleFit");

  // قسم الجدول السفلي والتبويبات المستقلة والتصدير
  const tableSectionDrawer = document.getElementById("tableSectionDrawer");
  const btnToggleDrawer = document.getElementById("btnToggleDrawer");
  const drawerChevron = document.getElementById("drawerChevron");
  const phenomenaTabsContainer = document.getElementById("phenomenaTabsContainer");
  const tableRecordCount = document.getElementById("tableRecordCount");
  const tabCountAll = document.getElementById("tabCountAll");
  const tableFilterInput = document.getElementById("tableFilterInput");
  const colldataTableBody = document.getElementById("colldataTableBody");

  // عناصر شريط التنقل بالصفحات (Pagination)
  const paginationInfo = document.getElementById("paginationInfo");
  const pageIndicator = document.getElementById("pageIndicator");
  const btnPrevPage = document.getElementById("btnPrevPage");
  const btnNextPage = document.getElementById("btnNextPage");
  let currentPage = 1;
  const pageSize = 100;
  let canvasRenderer = null;

  const btnExportKml = document.getElementById("btnExportKml");
  const btnExportKmz = document.getElementById("btnExportKmz");
  const btnExportExcel = document.getElementById("btnExportExcel");
  const btnExportGeoJson = document.getElementById("btnExportGeoJson");
  const btnExportJson = document.getElementById("btnExportJson");
  const btnExportCsv = document.getElementById("btnExportCsv");
  const btnExportSeparateKml = document.getElementById("btnExportSeparateKml");

  // عناصر الواجهة: شريط الحالة، المؤشرات، شريط التنقل
  const statusNotice = document.getElementById("statusNotice");
  const metricProgressVal = document.getElementById("metricProgressVal");
  const railStateTitle = document.getElementById("railStateTitle");
  const railStateSub = document.getElementById("railStateSub");
  const railOnlineDot = document.getElementById("railOnlineDot");
  const noticeEtaLabel = document.getElementById("noticeEtaLabel");
  const navRecordCount = document.getElementById("navRecordCount");
  const navPhenomCount = document.getElementById("navPhenomCount");
  const mapCellsFoot = document.getElementById("mapCellsFoot");
  const exportMenu = document.getElementById("exportMenu");
  const btnExportMenuTrigger = document.getElementById("btnExportMenuTrigger");
  const btnLockView = document.getElementById("btnLockView");
  const btnTitleFit = document.getElementById("btnTitleFit");

  // 1. تهيئة الخريطة التفاعلية
  initMap();

  // 2. تهيئة نظام إدارة الظاهرات الجغرافية
  setupPhenomenaManager();
  setupSearchLanguageControls();

  // 3. بدء نظيف للخريطة (بدون شبكة مسبقة)
  initCleanStudyArea();

  // 3.1 استعادة جلسة النطاق والشبكة والظاهرات المحفوظة إن وجدت
  restoreSessionState();

  // 4. جلب البيانات وحالة الـ Background
  fetchData();

  // 5. الاستماع لرسائل التحديث الحية ومزامنة الحالة فوراً دون أي تأخير
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "STATUS_UPDATE") {
      if (request.state) {
        const s = request.state;
        updateStatusControls(
          s.status,
          s.currentCell,
          s.currentIndex,
          s.activeQueryText,
          s.stats,
          s.currentQueryIndex,
          s.totalQueries,
          s.completedQueries,
          s.queryStats
        );
      }
      scheduleFetchData();
    }
  });

  // قناة اتصال نشطة (Port Keepalive) لضمان استمرار عمل الـ Service Worker أثناء فتح اللوحة
  let keepalivePort = null;
  function connectKeepalivePort() {
    try {
      if (chrome.runtime && chrome.runtime.connect) {
        keepalivePort = chrome.runtime.connect({ name: "dalil-keepalive" });
        keepalivePort.onMessage.addListener((msg) => {
          if (msg && msg.action === "STATUS_UPDATE" && msg.state) {
            const s = msg.state;
            updateStatusControls(
              s.status,
              s.currentCell,
              s.currentIndex,
              s.activeQueryText,
              s.stats,
              s.currentQueryIndex,
              s.totalQueries,
              s.completedQueries,
              s.queryStats
            );
            scheduleFetchData();
          }
        });
        keepalivePort.onDisconnect.addListener(() => {
          keepalivePort = null;
          setTimeout(connectKeepalivePort, 2000);
        });
      }
    } catch (e) {}
  }
  connectKeepalivePort();

  setInterval(() => {
    try {
      if (keepalivePort) {
        keepalivePort.postMessage({ action: "PING_PORT" });
      } else {
        connectKeepalivePort();
      }
    } catch (e) {}
  }, 25000);

  // 6. ربط أحداث عناصر التحكم
  setupTabNavigation();
  setupFileUploadDropzone();
  setupMapDrawingTools();
  setupGridSliders();
  setupActionButtons();
  setupExportButtons();
  setupBottomDrawer();
  setupLayoutResizers();
  setupRailNav();
  setupExportMenu();
  setupMapLayerToggle();
  setupResponsiveReflow();
  setupRecordsExportButtons();
  updateRecordsViewKPIs();

  /**
   * ربط شريط التنقل الجانبي بالشاشات الأربع الأساسية
   */
  function switchView(route) {
    if (!route) return;
    document.body.dataset=document.body.dataset||{};document.body.dataset.view=route;

    // تفعيل الزر في القائمة الجانبية
    const navItems = document.querySelectorAll("#railNav .nav-item");
    navItems.forEach((n) => n.classList.remove("active"));
    const activeNav = document.querySelector(`#railNav .nav-item[data-route="${route}"]`);
    if (activeNav) activeNav.classList.add("active");

    // إخفاء كافة الشاشات وإظهار الشاشة المستهدفة
    document.querySelectorAll(".dalil-view").forEach((v) => v.classList.add("hidden"));
    const target = document.getElementById(`view-${route}`);
    if (target) target.classList.remove("hidden");

    // تحديث شريط المسار (Breadcrumbs)
    const bcCurrent = document.getElementById("breadcrumbCurrentView");
    const dict = I18N_DICT[currentLang] || I18N_DICT.ar;
    if (bcCurrent && dict) {
      if (route === "workspace") bcCurrent.textContent = dict.navWorkspace;
      else if (route === "phenomena") bcCurrent.textContent = dict.navPhenomena;
      else if (route === "setup") bcCurrent.textContent = dict.navSetup;
      else if (route === "records") bcCurrent.textContent = dict.navRecords;
      else if (route === "about") bcCurrent.textContent = dict.navAbout || "عن الأداة والمطور";
    }

    // نقل كرت الخريطة التفاعلية بين مساحة العمل وتبويب النطاق والشبكة
    const mapCard = document.getElementById("mapWrapperCard");
    const wsMapHost = document.getElementById("workspaceMapContainer");
    const setupMapHost = document.getElementById("setupMapContainer");

    if (mapCard) {
      if (route === "setup" && setupMapHost && mapCard.parentElement !== setupMapHost) {
        setupMapHost.appendChild(mapCard);
      } else if (route === "workspace" && wsMapHost && mapCard.parentElement !== wsMapHost) {
        wsMapHost.appendChild(mapCard);
      }
    }

    // إبقاء قسم الجدول دائماً داخل تبويب سجل البيانات الكامل لتوفير كامل مساحة العمل للخريطة
    const tableSection = document.getElementById("tableSectionDrawer");
    const recordsTableHost = document.getElementById("recordsTableContainer");

    if (tableSection && recordsTableHost && tableSection.parentElement !== recordsTableHost) {
      recordsTableHost.appendChild(tableSection);
      tableSection.classList.add("full-page-table");
    }

    // تحديث إحصائيات سجل البيانات عند الانتقال إليها
    if (route === "records") {
      updateRecordsViewKPIs();
    }

    // إذا كانت الشاشة هي مساحة العمل أو النطاق والشبكة، نقوم بتحديث أبعاد الخريطة
    if ((route === "workspace" || route === "setup") && map) {
      setTimeout(() => {
        map.invalidateSize();
      }, 60);
      setTimeout(() => {
        map.invalidateSize();
      }, 220);
    }
  }

  function updateRecordsViewKPIs() {
    const recKpiPlaces = document.getElementById("recKpiPlaces");
    const recKpiCoords = document.getElementById("recKpiCoords");
    const recKpiCategories = document.getElementById("recKpiCategories");
    const recKpiDup = document.getElementById("recKpiDup");

    if (recKpiPlaces) recKpiPlaces.textContent = allResults.length;
    if (recKpiCoords) {
      const withCoords = allResults.filter(hasGeometry).length;
      recKpiCoords.textContent = withCoords;
    }
    if (recKpiCategories) {
      const cats = new Set(
        allResults
          .map((p) =>
            ExportUtils && typeof ExportUtils.resolveMainCategory === "function"
              ? ExportUtils.resolveMainCategory(p)
              : (p.categoryMain || p.category || p.searchKeyword)
          )
          .filter(Boolean)
      );
      recKpiCategories.textContent = cats.size;
    }
    if (recKpiDup) {
      recKpiDup.textContent = (currentStats && currentStats.duplicatesSkipped) ? currentStats.duplicatesSkipped : 0;
    }
  }

  function setupRecordsExportButtons() {
    const btnExportExcelSpec = document.getElementById("btnExportExcelSpec");
    const btnExportKmlSpec = document.getElementById("btnExportKmlSpec");
    const btnExportKmzSpec = document.getElementById("btnExportKmzSpec");
    const btnExportGeoJsonSpec = document.getElementById("btnExportGeoJsonSpec");
    const btnExportCsvSpec = document.getElementById("btnExportCsvSpec");
    const btnExportJsonSpec = document.getElementById("btnExportJsonSpec");

    if (btnExportExcelSpec) {
      btnExportExcelSpec.addEventListener("click", () => {
        ExportUtils.exportToExcel(allResults, "dalil_places_survey");
      });
    }
    if (btnExportKmlSpec) {
      btnExportKmlSpec.addEventListener("click", () => {
        ExportUtils.exportToKml(allResults, "dalil_places_survey");
      });
    }
    if (btnExportKmzSpec) {
      btnExportKmzSpec.addEventListener("click", () => {
        ExportUtils.exportToKmz(allResults, "dalil_places_survey");
      });
    }
    if (btnExportGeoJsonSpec) {
      btnExportGeoJsonSpec.addEventListener("click", () => {
        ExportUtils.exportToGeoJson(allResults, "dalil_places_survey");
      });
    }
    if (btnExportCsvSpec) {
      btnExportCsvSpec.addEventListener("click", () => {
        ExportUtils.exportToCsv(allResults, "dalil_places_survey");
      });
    }
    if (btnExportJsonSpec) {
      btnExportJsonSpec.addEventListener("click", () => {
        ExportUtils.exportToJson(allResults, "dalil_places_survey");
      });
    }

    // ربط النقر على المقترحات السريعة
    const suggestedPhenomChips = document.getElementById("suggestedPhenomChips");
    if (suggestedPhenomChips) {
      suggestedPhenomChips.addEventListener("click", (e) => {
        const chip = e.target.closest(".suggest-chip");
        if (!chip) return;
        const phenom = chip.getAttribute("data-phenom");
        if (phenom) {
          addPhenomenon(phenom);
        }
      });
    }
  }

  function setupRailNav() {
    const railNav = document.getElementById("railNav");
    if (!railNav) return;

    railNav.addEventListener("click", (e) => {
      const item = e.target.closest(".nav-item");
      if (!item) return;
      const route = item.getAttribute("data-route");
      if (!route) return;

      switchView(route);
    });

    // ربط النقر على كروت المؤشرات السريعة في شريط العنوان
    const kpiBtnCells = document.getElementById("kpiBtnCells");
    const kpiBtnPlaces = document.getElementById("kpiBtnPlaces");
    const kpiBtnDup = document.getElementById("kpiBtnDup");
    const kpiBtnProgress = document.getElementById("kpiBtnProgress");

    if (kpiBtnCells) {
      kpiBtnCells.addEventListener("click", () => switchView("setup"));
    }
    if (kpiBtnPlaces) {
      kpiBtnPlaces.addEventListener("click", () => {
        switchView("workspace");
        if (tableSectionDrawer) tableSectionDrawer.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
    if (kpiBtnDup) {
      kpiBtnDup.addEventListener("click", () => {
        if (btnDashDedup) btnDashDedup.click();
      });
    }
    if (kpiBtnProgress) {
      kpiBtnProgress.addEventListener("click", () => switchView("workspace"));
    }
  }

  /**
   * إعداد قائمة التصدير المنسدلة (زر واحد يجمع كل الصيغ)
   */
  function setupExportMenu() {
    if (!exportMenu || !btnExportMenuTrigger) return;

    const setOpen = (open) => {
      exportMenu.classList.toggle("open", open);
      btnExportMenuTrigger.setAttribute("aria-expanded", open ? "true" : "false");
    };

    btnExportMenuTrigger.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!exportMenu.classList.contains("open"));
    });

    exportMenu.addEventListener("click", (e) => {
      if (e.target.closest(".export-item")) setOpen(false);
    });

    document.addEventListener("click", (e) => {
      if (!exportMenu.contains(e.target)) setOpen(false);
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") setOpen(false);
    });
  }

  /**
   * تبديل طبقات خرائط الأساس (شوارع / قمر صناعي / تضاريس)
   */
  function updateLockButton(){
    if(!btnLockView)return;
    const locked=!!viewportLock?.isLocked();
    btnLockView.classList.toggle("active",locked);btnLockView.setAttribute("aria-pressed",String(locked));
    btnLockView.title=t(locked?"unlockView":"lockView");
    const label=btnLockView.querySelector("span");if(label)label.textContent=t(locked?"unlockView":"lockView");
  }
  function setupMapLayerToggle(){
    if(btnLockView)btnLockView.addEventListener("click",()=>{resetDrawingModes();viewportLock?.toggle();updateLockButton();});
  }
  function restoreAreaLayers(){
    if(drawLayerGroup)drawLayerGroup.clearLayers();
    if(importedStudyArea)renderStudyAreaBoundary(importedStudyArea.polygon,importedStudyArea.bounds,importedStudyArea);
    if(drawnRectangle)renderDrawnRectangle(drawnRectangle.bounds);
    renderMapGrid(allCells);
  }

  function setupResponsiveReflow() {
    let raf = null;
    window.addEventListener("resize", () => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (map) map.invalidateSize();
      });
    });
  }

  /**
   * 1. تهيئة خريطة Leaflet والطبقات الجغرافية
   */
  function initMap() {
    if (typeof L === "undefined") return;
    map = L.map("map", { zoomControl: true }).setView([20, 0], 2);
    const base=typeof DalilMapControls!=="undefined"?DalilMapControls.createBasemaps(L,currentLang):{osm:L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{attribution:"© OpenStreetMap"})};
    (base.googleRoads||base.osm).addTo(map);
    window.__dalilBaseLayers={...base,streets:base.googleRoads||base.osm,satellite:base.esriHybrid||base.osm};
    if(typeof DalilMapControls!=="undefined"){
      viewportLock=DalilMapControls.createViewportLock(map,()=>updateLockButton());
      window.__dalilViewportLock=viewportLock;
    }
    canvasRenderer = L.canvas({ padding: 0.5 });
    studyAreaLayerGroup = L.layerGroup().addTo(map);
    cellsLayerGroup = L.layerGroup().addTo(map);
    activeCellHighlightLayer = L.layerGroup().addTo(map);
    markersLayerGroup = L.layerGroup().addTo(map);
    drawLayerGroup = L.layerGroup().addTo(map);

    refreshLayerControl();
    map.on("click", handleMapClickForDrawing);
    map.on("mousemove", handleMapMouseMoveForDrawing);
    map.on('baselayerchange',event=>{const label=document.querySelector('[data-i18n="mapProvider"]');if(label)label.textContent=event.name;});
    setupRectangleDrag();
    setTimeout(() => { if (map) map.invalidateSize(); }, 250);
  }

  function refreshLayerControl() {
    if (!map || !window.__dalilBaseLayers) return;
    if (layerControl && layerControl.remove) layerControl.remove();
    const ar = currentLang === "ar", layers = window.__dalilBaseLayers;
    const baseLayers={};
    if(layers.googleRoads)baseLayers[ar?"Google · خريطة الشوارع":"Google · Streets"]=layers.googleRoads;
    if(layers.googleSatellite)baseLayers[ar?"Google · صور فضائية":"Google · Satellite"]=layers.googleSatellite;
    if(layers.esriHybrid)baseLayers[ar?"Esri · صور فضائية ومسميات":"Esri · Satellite with labels"]=layers.esriHybrid;
    if(layers.osm)baseLayers[ar?"OpenStreetMap · الشوارع":"OpenStreetMap · Streets"]=layers.osm;
    const overlays = { [ar ? "شبكة البحث" : "Search grid"]: cellsLayerGroup, [ar ? "منطقة الدراسة المستوردة" : "Imported study area"]: studyAreaLayerGroup, [ar ? "المنطقة المرسومة" : "Drawn study area"]: drawLayerGroup, [ar ? "الأماكن" : "Places"]: markersLayerGroup };
    layerControl = L.control.layers(baseLayers, overlays, {position: "topleft"}).addTo(map);
    if(typeof map.hasLayer==='function'){const selected=Object.entries(baseLayers).find(([,layer])=>map.hasLayer(layer));const label=document.querySelector('[data-i18n="mapProvider"]');if(selected&&label)label.textContent=selected[0];}
  }

  /**
   * 2. نظام إدارة الظاهرات الجغرافية وشجرة الفئات العالمية (Target Phenomena & Taxonomy Manager)
   */
  function setupPhenomenaManager() {
    renderPhenomenaChips();
    renderTaxonomyTree();

    if (btnLangToggle) {
      btnLangToggle.addEventListener("click", () => {
        const nextLang = (currentLang === "ar") ? "en" : "ar";
        applyLanguage(nextLang);
      });
      // تهيئة اللغة المحفوظة
      applyLanguage(currentLang);
    }

    const btnThemeToggle = document.getElementById("btnThemeToggle");
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener("click", () => {
        const nextTheme = (currentTheme === "dark") ? "light" : "dark";
        applyTheme(nextTheme);
      });
      // تهيئة المظهر المحفوظ
      applyTheme(currentTheme);
    }

    // إضافة ظاهرة مكتوبة يدوياً (حرّة تماماً)
    btnAddPhenomenon.addEventListener("click", () => {
      addPhenomenonFromInput();
    });

    inputNewPhenomenon.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        addPhenomenonFromInput();
      }
    });

    // إضافة سريعة من شريط مساحة العمل
    const inputQuickPhenom = document.getElementById("inputQuickPhenom");
    const btnQuickAddPhenom = document.getElementById("btnQuickAddPhenom");
    if (btnQuickAddPhenom && inputQuickPhenom) {
      const addQuick = () => {
        const val = inputQuickPhenom.value.trim();
        if (val) {
          addPhenomenon(val);
          inputQuickPhenom.value = "";
        }
      };
      btnQuickAddPhenom.addEventListener("click", addQuick);
      inputQuickPhenom.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          addQuick();
        }
      });
    }

    // زر الانتقال المباشر لسجل البيانات الكامل
    const btnQuickGoRecords = document.getElementById("btnQuickGoRecords");
    if (btnQuickGoRecords) {
      btnQuickGoRecords.addEventListener("click", () => {
        const recordsNavBtn = document.querySelector('.nav-item[data-route="records"]');
        if (recordsNavBtn) recordsNavBtn.click();
      });
    }

    // البحث والتصفية اللحظية داخل شجرة الفئات
    if (taxSearchInput) {
      taxSearchInput.addEventListener("input", () => {
        taxFilterText = taxSearchInput.value.trim();
        if (btnTaxSearchClear) {
          if (taxFilterText) btnTaxSearchClear.classList.remove("hidden");
          else btnTaxSearchClear.classList.add("hidden");
        }
        renderTaxonomyTree();
      });
    }

    if (btnTaxSearchClear) {
      btnTaxSearchClear.addEventListener("click", (e) => {
        e.stopPropagation();
        taxSearchInput.value = "";
        taxFilterText = "";
        btnTaxSearchClear.classList.add("hidden");
        renderTaxonomyTree();
      });
    }

    // تحديد كل المعروض
    if (btnTaxSelectAllVisible) {
      btnTaxSelectAllVisible.addEventListener("click", (e) => {
        e.stopPropagation();
        if (typeof TaxonomyEngine !== "undefined") {
          const matchedSectors = TaxonomyEngine.searchTaxonomy(taxFilterText, currentLang);
          matchedSectors.forEach(sec => {
            sec.branches.forEach(br => {
              TaxonomyEngine.getDisplayCategories(br.id,taxFilterText?br.leaves:null).forEach(c => {
                if (!targetPhenomena.includes(c.canonicalId)) targetPhenomena.push(c.canonicalId);
              });
            });
          });
          renderPhenomenaChips();
          renderTaxonomyTree();
        }
      });
    }

    // إلغاء تحديد الكل
    if (btnTaxDeselectAll) {
      btnTaxDeselectAll.addEventListener("click", (e) => {
        e.stopPropagation();
        targetPhenomena = [];
        savePhenomenaState();
        renderPhenomenaChips();
        renderTaxonomyTree();
      });
    }

    // مسح كافة الظاهرات من لوحة التحكم
    btnClearAllPhenomena.addEventListener("click", () => {
      targetPhenomena = [];
      savePhenomenaState();
      renderPhenomenaChips();
      renderTaxonomyTree();
    });
  }

  function categorySymbolHtml(value,className="tax-symbol"){
    if(typeof DalilSymbology==="undefined")return "";
    const symbol=DalilSymbology.resolve(symbolInput(value));
    return '<img class="'+className+'" data-symbol-id="'+escapeAttr(symbol.symbolId)+'" src="'+safeAssetUrl(symbol.pngPath)+'" alt="" width="22" height="22" loading="lazy" decoding="async">';
  }

  function renderTaxonomyTree() {
    if (!taxonomyTreeList) return;
    if (typeof TaxonomyEngine === "undefined") {
      taxonomyTreeList.innerHTML = `<div class="tax-empty tax-empty-error">${currentLang === "ar" ? "يتم تحميل مكتبة الفئات…" : "Loading category library…"}</div>`;
      return;
    }

    const sectors = TaxonomyEngine.searchTaxonomy(taxFilterText, currentLang);
    taxonomyTreeList.innerHTML = "";

    if (sectors.length === 0) {
      taxonomyTreeList.innerHTML = `
        <div class="tax-empty">
          ${currentLang === "ar" ? "لم يتم العثور على أي فئة مطابقة للبحث." : "No categories found matching your query."}
        </div>
      `;
      return;
    }

    sectors.forEach((sec) => {
      const allLeafLabels = TaxonomyEngine.getDisplayCategories(sec.id).map(c=>c.canonicalId);
      const isSectorFullySelected = allLeafLabels.length > 0 && allLeafLabels.every((l) => targetPhenomena.includes(l));

      const card = document.createElement("div");
      card.className = "tax-sector-card" + (taxFilterText ? " expanded" : "");
      card.id = `taxSector_${sec.id}`;

      const secName = currentLang === "ar" ? sec.name_ar : sec.name_en;
      const secSub = "";

      card.innerHTML = `
        <div class="tax-sector-header" data-sec-id="${sec.id}" title="${currentLang === "ar" ? "انقر لتوسيع/طي الفروع" : "Click to expand/collapse"}">
          <div class="tax-sector-left">
            <input type="checkbox" class="tax-check sec-check" data-sec-id="${sec.id}" title="${currentLang === "ar" ? "اختيار الفئة والقطاع كاملاً" : "Select Entire Category"}" ${isSectorFullySelected ? "checked" : ""}>
            <div class="tax-sector-title">
              ${categorySymbolHtml(sec.id,"tax-symbol")}
              <span class="tax-sector-name">${escapeHtml(secName)}</span>
              
            </div>
          </div>
          <div class="tax-sector-right">
            <span class="tax-count-badge">${sec.branches.length} ${currentLang === "ar" ? "فروع" : "branches"}</span>
            <span class="tax-arrow-btn">▶</span>
          </div>
        </div>
        <div class="tax-branches-list">
          ${sec.branches
            .map((br) => {
              const brLeaves = TaxonomyEngine.getDisplayCategories(br.id,taxFilterText?br.leaves:null);
              const isBrSelected = brLeaves.length > 0 && brLeaves.every((c) => targetPhenomena.includes(c.canonicalId));
              const brName = currentLang === "ar" ? br.name_ar : br.name_en;
              const brSub = "";

              return `
                <div class="tax-branch-item" data-br-id="${br.id}">
                  <div class="tax-branch-header">
                    <input type="checkbox" class="tax-check br-check" data-br-id="${br.id}" title="${currentLang === "ar" ? "اختيار الفرع بالكامل" : "Select Entire Branch"}" ${isBrSelected ? "checked" : ""}>
                    ${categorySymbolHtml(br.id,"tax-symbol")}<span class="tax-branch-name">${escapeHtml(brName)}</span>
                    
                  </div>
                  <div class="tax-leaves-grid">
                    ${brLeaves
                      .map((category) => {
                        const leaf=category.canonicalId,isSelected=targetPhenomena.includes(leaf);
                        const variants=category.searchTerms||[],aliases=variants.filter(v=>v.kind==="local_alias").map(v=>v.labels[currentLang]),descriptors=variants.filter(v=>v.kind==="descriptive_variant").map(v=>v.labels[currentLang]);
                        const title=[aliases.length?t("categoryAliases")+": "+aliases.join(", "):"",descriptors.length?t("categoryDescriptors")+": "+descriptors.join(", "):""].filter(Boolean).join(" · ");
                        return '<button type="button" class="tax-leaf-btn '+(isSelected?'selected':'')+'" data-leaf="'+escapeAttr(leaf)+'" title="'+escapeAttr(title)+'">'+categorySymbolHtml(leaf,"tax-symbol")+'<span class="tax-leaf-text"><span>'+escapeHtml(category.labels[currentLang]||localizeCategory(leaf))+'</span><small class="tax-concept-meta">'+escapeHtml(t(category.googlePlaceType?"googleTypeLabel":"dalilConceptLabel"))+'</small></span><span>'+(isSelected?"✓":"+")+'</span></button>';
                      })
                      .join("")}
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      `;

      // توسيع وطي بطاقة القطاع
      const header = card.querySelector(".tax-sector-header");
      header.addEventListener("click", (e) => {
        if (e.target.classList.contains("sec-check")) return;
        card.classList.toggle("expanded");
      });

      // اختيار القطاع كاملاً (Master Sector Checkbox)
      const secCheck = card.querySelector(".sec-check");
      secCheck.addEventListener("click", (e) => {
        e.stopPropagation();
        if (secCheck.checked) {
          allLeafLabels.forEach((l) => {
            if (!targetPhenomena.includes(l)) targetPhenomena.push(l);
          });
        } else {
          targetPhenomena = targetPhenomena.filter((p) => !allLeafLabels.includes(p));
        }
        renderPhenomenaChips();
        renderTaxonomyTree();
      });

      // اختيار الفرع كاملاً (Branch Checkbox)
      card.querySelectorAll(".br-check").forEach((brCheck) => {
        brCheck.addEventListener("click", (e) => {
          e.stopPropagation();
          const brId = brCheck.getAttribute("data-br-id");
          const leaves = TaxonomyEngine.getDisplayCategories(brId).map(c=>c.canonicalId);
          if (brCheck.checked) {
            leaves.forEach((l) => {
              if (!targetPhenomena.includes(l)) targetPhenomena.push(l);
            });
          } else {
            targetPhenomena = targetPhenomena.filter((p) => !leaves.includes(p));
          }
          renderPhenomenaChips();
          renderTaxonomyTree();
        });
      });

      // اختيار ظاهرة فردية (Leaf Click)
      card.querySelectorAll(".tax-leaf-btn").forEach((leafBtn) => {
        leafBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const leaf = leafBtn.getAttribute("data-leaf");
          if (targetPhenomena.includes(leaf)) {
            targetPhenomena = targetPhenomena.filter((p) => p !== leaf);
          } else {
            targetPhenomena.push(leaf);
          }
          renderPhenomenaChips();
          renderTaxonomyTree();
        });
      });

      taxonomyTreeList.appendChild(card);
    });
  }

  function addPhenomenonFromInput() {
    const val = inputNewPhenomenon.value;
    if (!val.trim()) return;
    try{addPhenomenon(SearchLanguages.createFreeText(val,getSearchLocale()));}catch(error){alert(t('INVALID_LOCALE'));return;}
    inputNewPhenomenon.value = "";
    inputNewPhenomenon.focus();
  }

  function addPhenomenon(name) {
    name=TaxonomyEngine.selectionId(name);
    if (targetPhenomena.some((p) => targetKey(p) === targetKey(name))) {
      return;
    }
    targetPhenomena.push(name);
    renderPhenomenaChips();
    renderTaxonomyTree();
  }

  function removePhenomenon(index) {
    if (index >= 0 && index < targetPhenomena.length) {
      targetPhenomena.splice(index, 1);
      savePhenomenaState();
      renderPhenomenaChips();
      renderTaxonomyTree();
    }
  }

  /**
   * تحديث الحالة اللونية لشرائح الظاهرات المستهدفة (مكتمل أخضر / جاري المسح أزرق نابض / قيد الانتظار)
   */
  function queriesForTarget(target){
    let locale;try{locale=typeof SearchLanguages!=="undefined"?getSearchLocale():'ar';}catch(_){return [];}
    const bilingual=!!sideBilingualToggle?.checked;
    const key=targetKey(target)+'|'+locale+'|'+bilingual+'|'+JSON.stringify(queryTermOverrides)+'|'+!!document.getElementById('allowEnglishSearchFallback')?.checked;
    if(targetPlanCache.has(key))return targetPlanCache.get(key);
    let queries=[target];
    try{queries=buildUiQueryPlan([target]).queriesToRun||queries;}catch(_){}
    if(targetPlanCache.size>256)targetPlanCache.clear();targetPlanCache.set(key,queries);return queries;
  }

  function updatePhenomenaChipsStatus(completedQueries = [], activeQuery = "", queryStats = {}) {
    activeCompletedQueries = completedQueries || [];
    activeCurrentQuery = activeQuery || "";
    activeQueryStats = queryStats || {};

    const allChipElements = document.querySelectorAll(".phenom-chip, .quick-phenom-pill");
    allChipElements.forEach(el => {
      const pText = el.getAttribute("data-phenom-text");
      if (!pText) return;

      el.classList.remove("is-completed", "is-active", "is-pending");

      const badge = el.querySelector(".phenom-badge-status");
      const targetQueries=queriesForTarget(targetPhenomena.find(value=>targetKey(value)===pText)||pText);
      const isCompleted=targetQueries.length>0&&targetQueries.every(q=>activeCompletedQueries.includes(q));
      const isActive=targetQueries.includes(activeCurrentQuery)&&(currentStatus==="running"||currentStatus==="paused");

      if (isCompleted) {
        el.classList.add("is-completed");
        const found = (activeQueryStats[pText] && activeQueryStats[pText].itemsFound) ? activeQueryStats[pText].itemsFound : "";
        const countTxt = found ? ` (${found})` : "";
        const outcomes={};for(const q of targetQueries)for(const [key,value]of Object.entries(activeQueryStats[q]?.outcomes||{}))outcomes[key]=(outcomes[key]||0)+value;
        const partial=['error','unknown','partial','capped','blocked'].some(key=>outcomes[key]>0);
        if(badge)badge.textContent=partial?(currentLang==='ar'?'⚠ انتهى مع نتائج غير مكتملة':'⚠ Finished with gaps'):`✅ ${currentLang === "ar" ? "مكتمل" : "Done"}${countTxt}`;
      } else if (isActive) {
        el.classList.add("is-active");
        if (badge) badge.textContent = currentStatus==="paused"?(currentLang==="ar"?"⏸ متوقف مؤقتًا":"⏸ Paused"):`🔍 ${currentLang === "ar" ? "جاري المسح" : "Scanning"}`;
      } else if (currentStatus === "running" || currentStatus === "paused") {
        el.classList.add("is-pending");
        if (badge) badge.textContent = `⏳ ${currentLang === "ar" ? "بالانتظار" : "Pending"}`;
      } else {
        if (badge) badge.textContent = "";
      }
    });
  }

  function renderPhenomenaChips() {
    activePhenomenaContainer.innerHTML = "";
    activePhenomenaCount.textContent = targetPhenomena.length;
    if (navPhenomCount) navPhenomCount.textContent = targetPhenomena.length;
    if (taxSelectedCountBadge) {
      taxSelectedCountBadge.textContent = `${targetPhenomena.length} ${currentLang === "ar" ? "محدد" : "selected"}`;
    }

    // تحديث شريط مساحة العمل السريع
    const quickChips = document.getElementById("quickPhenomChipsContainer");
    if (quickChips) quickChips.innerHTML = "";

    if (targetPhenomena.length === 0) {
      emptyPhenomenaNotice.classList.remove("hidden");
      activePhenomenaContainer.appendChild(emptyPhenomenaNotice);
      if (quickChips) {
        quickChips.innerHTML = `<span class="caption" style="color:var(--muted);">${currentLang === "ar" ? "لم تحدد ظواهر بعد" : "No features yet"}</span>`;
      }
      renderSymbolLegend();updateQueryReview();
      return;
    }

    emptyPhenomenaNotice.classList.add("hidden");

    targetPhenomena.forEach((p, idx) => {
      const chip = document.createElement("div");
      chip.className = "phenom-chip";
      chip.setAttribute("data-phenom-text", targetKey(p));
      chip.innerHTML = `
        ${categorySymbolHtml(p)}<span>${escapeHtml(localizeCategory(p))}</span>
        <span class="phenom-badge-status"></span>
        <button type="button" class="btn-remove-phenom" title="${currentLang === "ar" ? "حذف هذه الظاهرة" : "Remove"}" data-idx="${idx}">✕</button>
      `;

      const removeBtn = chip.querySelector(".btn-remove-phenom");
      if (removeBtn) {
        removeBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          removePhenomenon(idx);
        });
      }

      activePhenomenaContainer.appendChild(chip);

      // إضافة شريحة سريعة في شريط مساحة العمل
      if (quickChips) {
        const quickPill = document.createElement("div");
        quickPill.className = "quick-phenom-pill";
        quickPill.setAttribute("data-phenom-text", targetKey(p));
        quickPill.innerHTML = `
          ${categorySymbolHtml(p)}<span>${escapeHtml(localizeCategory(p))}</span>
          <span class="phenom-badge-status"></span>
          <button type="button" class="btn-quick-del" title="${currentLang === "ar" ? "إزالة" : "Remove"}" data-idx="${idx}">✕</button>
        `;
        quickPill.querySelector(".btn-quick-del").addEventListener("click", (e) => {
          e.stopPropagation();
          removePhenomenon(idx);
        });
        quickChips.appendChild(quickPill);
      }
    });

    updatePhenomenaChipsStatus(activeCompletedQueries, activeCurrentQuery, activeQueryStats);
    savePhenomenaState();
    renderSymbolLegend();
    updateQueryReview();
  }

  function savePhenomenaState() {
    try {
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ savedPhenomena: targetPhenomena });
      }
    } catch (e) {}
  }

  function restoreSessionState() {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;
    chrome.storage.local.get(["workspaceState", "savedStudyArea", "savedCells", "savedPhenomena","searchLanguageSettings"], items => {
      if (!items) return;
      if(items.searchLanguageSettings){const settings=items.searchLanguageSettings;queryTermOverrides=settings.queryTerms||{};renderSearchLanguageChoices(settings.locale||'ar');document.getElementById('allowEnglishSearchFallback').checked=!!settings.fallback;}
      if (Array.isArray(items.savedPhenomena)) targetPhenomena = [...new Map(items.savedPhenomena.map(value=>{const normalized=TaxonomyEngine.selectionId(value);return[targetKey(normalized),normalized];})).values()];
      if (typeof WorkspaceState !== "undefined") applyWorkspaceSnapshot(WorkspaceState.fromStorage(items));
      renderPhenomenaChips();
      renderTaxonomyTree();
    });
  }

  /**
   * 3. بدء نظيف لمنطقة الدراسة (Clean Slate)
   */
  function initCleanStudyArea() {
    importedStudyArea = null;
    drawnRectangle = null;
    currentStudyArea = null;
    allCells = [];
    if (cellsLayerGroup) cellsLayerGroup.clearLayers();
    if (studyAreaLayerGroup) studyAreaLayerGroup.clearLayers();
    if (activeCellHighlightLayer) activeCellHighlightLayer.clearLayers();
    if (drawLayerGroup) drawLayerGroup.clearLayers();

    if (fileUploadInfo) fileUploadInfo.classList.add("hidden");
    if (studyAreaFileInput) studyAreaFileInput.value = "";
    studyAreaStatusBanner.innerHTML = studyAreaBannerHtml(
      escapeHtml(t("emptyStudyArea"))
    );
    cellsTotalPreviewBadge.textContent = cellCountLabel(0);
    hudCellsCount.textContent = "0";
  }

  function updateStudyAreaBanner() {
    if(fileNameLabel && importedStudyArea)fileNameLabel.textContent=importedStudyArea.name;
    const proximity=SpatialUtils.hasProximityGeometry(currentStudyArea?.geometry);
    document.getElementById("proximitySettings")?.classList.toggle("hidden",!proximity);
    const bufferInput=document.getElementById("inputSearchBufferMeters");
    if(bufferInput)bufferInput.value=currentStudyArea?.bufferMeters||500;
    if(checkClipToStudyArea){checkClipToStudyArea.disabled=!!proximity;checkClipToStudyArea.parentElement?.classList.toggle("hidden",!!proximity);}
    if (!studyAreaStatusBanner) return;
    if (!currentStudyArea || !currentStudyArea.bounds) { studyAreaStatusBanner.innerHTML = studyAreaBannerHtml(escapeHtml(t("emptyStudyArea"))); return; }
    const { minLat, maxLat, minLng, maxLng } = currentStudyArea.bounds;
    const typeLabel = currentStudyArea === drawnRectangle ? t("drawnArea") : currentStudyArea.name;
    studyAreaStatusBanner.innerHTML = studyAreaBannerHtml('<b>' + escapeHtml(t("studyArea")) + ':</b> ' + escapeHtml(typeLabel) + (proximity ? '<small>'+escapeHtml(t("proximitySummary"))+' <bdi>'+currentStudyArea.bufferMeters+'</bdi> '+escapeHtml(t("metres"))+'</small>' : '') + '<small dir="ltr">Y [' + minLat + ', ' + maxLat + '] · X [' + minLng + ', ' + maxLng + ']</small>', true);
  }

  function studyAreaBannerHtml(contentHtml, ok = false) {
    const iconId = ok ? "ic-check" : "ic-pin";
    return `<svg class="icon sm"><use href="#${iconId}"/></svg><span>${contentHtml}</span>`;
  }

  /**
   * 4. التنقل بين التبويبات الجانبية
   */
  function setupTabNavigation() {
    sideTabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        sideTabBtns.forEach((b) => b.classList.remove("active"));
        sideTabPanes.forEach((p) => p.classList.remove("active"));
        btn.classList.add("active");
        const targetId = btn.getAttribute("data-tab");
        const pane = document.getElementById(targetId);
        if (pane) pane.classList.add("active");
        syncPanelStep(targetId);
      });
    });
  }

  /**
   * مزامنة شارة الخطوة الحالية + عناصر التنقل في الشريط الجانبي
   */
  function syncPanelStep(targetId) {
    document.querySelectorAll(".rail-nav .nav-item").forEach((item) => {
      item.classList.toggle("active", item.getAttribute("data-route") === targetId);
    });
  }

  /**
   * 5. استيراد ملفات منطقة الدراسة (Shapefile / KML / KMZ / GeoJSON)
   */
  function setupFileUploadDropzone() {
    document.getElementById("inputSearchBufferMeters")?.addEventListener("change",event=>{
      if(!areaCanChange() || !SpatialUtils.hasProximityGeometry(currentStudyArea?.geometry)){updateStudyAreaBanner();return;}
      try{
        const radius=Number(event.target.value);
        const parsed=SpatialUtils.parsedAreaFromGeometry(currentStudyArea.geometry,currentStudyArea.name,currentStudyArea.source?.format,radius);
        if(parsed.crossesDateline)throw new Error("Search bounds cross the date line or reach a pole.");
        rememberWorkspace();
        currentStudyArea={...currentStudyArea,...parsed,source:currentStudyArea.source,version:(currentStudyArea.version||1)+1};
        importedStudyArea=currentStudyArea;
        renderStudyAreaBoundary(null,currentStudyArea.bounds,currentStudyArea);
        updateStudyAreaBanner();generateGridForCurrentStudyArea();fitMapToStudyArea();
      }catch(error){alert(t("importFailed")+spatialErrorMessage(error));updateStudyAreaBanner();}
    });
    if (kmlDropzone) {
      kmlDropzone.addEventListener("dragover", (e) => {
        e.preventDefault();
        kmlDropzone.classList.add("dragover");
      });

      kmlDropzone.addEventListener("dragleave", () => {
        kmlDropzone.classList.remove("dragover");
      });

      kmlDropzone.addEventListener("drop", (e) => {
        e.preventDefault();
        kmlDropzone.classList.remove("dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleStudyAreaFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (kmlDropzone) {
      kmlDropzone.addEventListener("click", (e) => {
        if (e.target !== studyAreaFileInput && e.target !== btnBrowseFiles) {
          studyAreaFileInput.click();
        }
      });
    }

    if (btnBrowseFiles) {
      btnBrowseFiles.addEventListener("click", (e) => {
        e.stopPropagation();
        studyAreaFileInput.click();
      });
    }

    if (studyAreaFileInput) {
      studyAreaFileInput.addEventListener("change", () => {
        if (studyAreaFileInput.files && studyAreaFileInput.files[0]) {
          handleStudyAreaFile(studyAreaFileInput.files[0]);
        }
      });
    }


  }

  /**
   * إزالة ملف منطقة الدراسة المستورد بشكل منفصل ومستقل تماماً
   */
  async function clearUploadedArea() {
    if (!areaCanChange()) return;
    rememberWorkspace();
    if (await runWorkspaceOperation("REMOVE_IMPORTED")) {
      if (studyAreaFileInput) studyAreaFileInput.value = "";
      if (currentStudyArea) generateGridForCurrentStudyArea();
    }
  }

  async function handleStudyAreaFile(file) {
    if (!file) return;
    if(!areaCanChange())return;
    const importRevision=workspaceRevision;
    const lowerName = (file.name || "").toLowerCase();
    const validExtensions = [".kml", ".kmz", ".geojson", ".json", ".zip", ".shp"];
    const hasValidExt = validExtensions.some((ext) => lowerName.endsWith(ext));
    if (!hasValidExt) {
      alert(t("polygonRequired"));
      if (studyAreaFileInput) studyAreaFileInput.value = "";
      return;
    }
    try {
      const parsed = await SpatialUtils.parseSpatialFile(file);
      if(importRevision!==workspaceRevision || !areaCanChange())return;
      if (parsed && parsed.success) {
        if (!parsed.geometry) throw new Error(t("polygonRequired"));
        if(parsed.crossesDateline)throw new Error("Study bounds cross the date line or reach a pole.");
        rememberWorkspace();
        drawnRectangle=null;if(drawLayerGroup)drawLayerGroup.clearLayers();
        importedStudyArea = { ...parsed, id: "import-" + Date.now(), version: 1, source: { ...parsed.source, kind: "import", fileName: file.name } };
        currentStudyArea = importedStudyArea;

        // عرض بطاقة تأكيد تحميل الملف
        fileNameLabel.textContent = `${parsed.name} (${parsed.geometry.type})`;
        fileUploadInfo.classList.remove("hidden");

        // رسم حدود منطقة الدراسة على الخريطة باللون الأحمر الصريح
        renderStudyAreaBoundary(parsed.coordinates, parsed.bounds, importedStudyArea);
        updateStudyAreaBanner();

        // توليد الشبكة فوراً فوق حدود المنطقة وتوسيط الخريطة
        generateGridForCurrentStudyArea();
        fitMapToStudyArea();
      } else {
        alert(t("importFailed") + spatialErrorMessage(parsed && parsed.error));
      }
    } catch (err) {
      alert(t("importFailed") + spatialErrorMessage(err));
    }
  }

  /**
   * 6. أدوات رسم المستطيل على الخريطة ومسح المستطيل بشكل منفصل
   */
  function setupMapDrawingTools() {
    btnStartDrawRect.addEventListener("click", () => startDrawingRectMode());


    // الأزرار العائمة على الخريطة
    btnMapToolPan.addEventListener("click", () => {resetDrawingModes();fitMapToStudyArea();});
    btnFitMapExtent.addEventListener("click", () => fitMapToStudyArea());
    const bind = (id, event, handler) => { const el = document.getElementById(id); if (el) el.addEventListener(event, handler); };
    bind("btnDrawPolygon", "click", () => {
      if (!areaCanChange()) return;
      resetDrawingModes();
      if(viewportLock?.isLocked()){alert(t("unlockToDraw"));return;}
      if(drawLayerGroup)drawLayerGroup.clearLayers();
      document.getElementById("drawSessionActions")?.classList.remove("hidden");
      isDrawingPolygon = true;
      map.getContainer?.()?.classList?.add("dalil-drawing");
      polygonVertices = [];
      if (map.doubleClickZoom) map.doubleClickZoom.disable();
      drawInstructionHint.textContent = t("drawPolygonHint");
      map.getContainer().style.cursor = "crosshair";
    });
    bind("btnEditArea", "click", editStudyAreaVertices);
    bind("btnUndoArea", "click", async () => {
      if (!areaCanChange() || !workspaceUndo.length) return;
      await runWorkspaceOperation("SAVE_WORKSPACE", workspaceUndo.pop());
    });
    bind("btnClearStudyArea","click",async()=>{
      if(!areaCanChange())return;
      resetDrawingModes();rememberWorkspace();await runWorkspaceOperation("CLEAR_AREA");
    });
    bind("btnFinishDrawing","click",()=>{
      if(isDrawingPolygon){finishPolygonDrawing();return;}
      if(editLayerGroup){resetDrawingModes();renderMapGrid(allCells);}
      else drawInstructionHint.textContent=t("rectangleHelp");
    });
    bind("btnCancelDrawing","click",()=>{resetDrawingModes();restoreAreaLayers();});
    bind("btnOpenMapsPreview", "click", () => {
      const query = targetPhenomena[0] || "";
      const center = currentStudyArea && currentStudyArea.bounds;
      const suffix = center ? "/@" + ((center.minLat + center.maxLat) / 2) + "," + ((center.minLng + center.maxLng) / 2) + ",13z" : "";
      chrome.tabs.create({ url: "https://www.google.com/maps/search/" + encodeURIComponent(query) + suffix });
    });
    if (map && typeof map.on === "function") map.on("dblclick", finishPolygonDrawing);
    document.addEventListener("keydown", event => { if (event.key === "Escape") {resetDrawingModes();restoreAreaLayers();} });
  }

  function renderPolygonDraft() {
    if (!drawLayerGroup || polygonVertices.length < 2) return;
    drawLayerGroup.clearLayers();
    const draft = polygonVertices.length >= 3 ? L.polygon(polygonVertices, { color: "#38bdf8", fillOpacity: 0.08 }) : L.polyline(polygonVertices, { color: "#38bdf8" });
    drawLayerGroup.addLayer(draft);
  }

  function finishPolygonDrawing() {
    if (!isDrawingPolygon) return;
    if(polygonVertices.length<3){drawInstructionHint.textContent=t("polygonMinimum");return;}
    const vertices = polygonVertices.filter((point, index, points) => index === 0 || point[0] !== points[index - 1][0] || point[1] !== points[index - 1][1]);
    if (vertices.length < 3) return;
    try {
      const parsed = SpatialUtils.parsedAreaFromGeometry({ type: "Polygon", coordinates: [vertices.map(([lat, lng]) => [lng, lat])] }, "Drawn polygon", "drawing");
      rememberWorkspace();
      importedStudyArea=null;if(studyAreaLayerGroup)studyAreaLayerGroup.clearLayers();
      drawnRectangle = { ...parsed, id: "drawing-" + Date.now(), version: 1, source: { kind: "drawing", method: "polygon" } };
      currentStudyArea = drawnRectangle;
      resetDrawingModes();
      renderDrawnRectangle(drawnRectangle.bounds);
      updateStudyAreaBanner();
      generateGridForCurrentStudyArea();
    } catch (error) { alert(t("importFailed") + spatialErrorMessage(error)); }
  }

  function editStudyAreaVertices() {
    if (!areaCanChange() || !currentStudyArea || !currentStudyArea.geometry) return;
    if(viewportLock?.isLocked()){alert(t("unlockToDraw"));return;}
    resetDrawingModes();
    if (!editLayerGroup) editLayerGroup = L.layerGroup().addTo(map);
    document.getElementById("drawSessionActions")?.classList.remove("hidden");
    const area = currentStudyArea;
    const geometry = JSON.parse(JSON.stringify(area.geometry));
    const handles=[];
    const collect=g=>{
      const path=(points,closed=false)=>points.slice(0,closed?-1:undefined).forEach((point,index)=>handles.push({point,set:next=>{points[index]=next;if(closed&&index===0)points[points.length-1]=[...next];}}));
      switch(g.type){
        case "Point": handles.push({point:g.coordinates,set:next=>{g.coordinates=next;}});break;
        case "MultiPoint": case "LineString": path(g.coordinates);break;
        case "MultiLineString": g.coordinates.forEach(line=>path(line));break;
        case "Polygon": g.coordinates.forEach(ring=>path(ring,true));break;
        case "MultiPolygon": g.coordinates.forEach(poly=>poly.forEach(ring=>path(ring,true)));break;
        case "GeometryCollection": g.geometries.forEach(collect);break;
      }
    };collect(geometry);
    handles.forEach(({point,set}) => {
      const marker = L.marker([point[1], point[0]], { draggable: true, icon: L.divIcon({ className: "dalil-vertex", iconSize: [14, 14] }) });
      marker.on("dragend", () => {
        if (!areaCanChange()) return;
        const position = marker.getLatLng();
        rememberWorkspace();
        set([Number(position.lng.toFixed(6)), Number(position.lat.toFixed(6))]);
        try {
          const parsed = SpatialUtils.parsedAreaFromGeometry(geometry, area.name, area.source && area.source.format || "edit",currentStudyArea.bufferMeters||500);
          if(parsed.crossesDateline)throw new Error("Study bounds cross the date line or reach a pole.");
          const edited = { ...area, ...parsed, id: area.id, version: (currentStudyArea.version || 1) + 1, source: { ...area.source, edited: true } };
          if (area.id === (importedStudyArea && importedStudyArea.id)) importedStudyArea = edited;
          else drawnRectangle = edited;
          currentStudyArea = edited;
          if (importedStudyArea) renderStudyAreaBoundary(importedStudyArea.polygon, importedStudyArea.bounds, importedStudyArea);
          if (drawnRectangle) renderDrawnRectangle(drawnRectangle.bounds);
          updateStudyAreaBanner();
          generateGridForCurrentStudyArea();
        } catch (error) { alert(t("importFailed") + spatialErrorMessage(error)); }
      });
      editLayerGroup.addLayer(marker);
    });
    drawInstructionHint.textContent = t("editHint");
  }

  function startDrawingRectMode() {
    if (!areaCanChange()) return;
    if(viewportLock?.isLocked()){alert(t("unlockToDraw"));return;}
    resetDrawingModes();
    isDrawingRect = true;
    map.getContainer?.()?.classList?.add("dalil-drawing");

    // هام جداً: لا نمسح studyAreaLayerGroup إطلاقاً!
    // لكي يظل ملف منطقة الدراسة المستورد ظاهراً بحدوده الحمراء أمام المستخدم أثناء رسم المستطيل
    if (cellsLayerGroup) cellsLayerGroup.clearLayers();
    if (drawLayerGroup) drawLayerGroup.clearLayers();

    map.dragging?.disable();
    map.doubleClickZoom?.disable();
    document.getElementById("drawSessionActions")?.classList.remove("hidden");
    btnStartDrawRect.classList.add("active");
    btnMapToolPan.classList.remove("active");
    drawInstructionHint.textContent = t("drawFirstCorner");
    map.getContainer().style.cursor = "crosshair";
  }

  function setupRectangleDrag(){
    if(typeof map.getContainer!=='function')return;
    const canvas=map.getContainer();
    canvas.addEventListener('pointerdown',event=>{
      if(!isDrawingRect||event.button>0)return;
      const point=map.mouseEventToLatLng(event);
      rectanglePointerStart={x:event.clientX,y:event.clientY,id:event.pointerId,newCorner:!rectStartCorner};
      if(!rectStartCorner)rectStartCorner=[point.lat,point.lng];
      canvas.setPointerCapture?.(event.pointerId);
    });
    canvas.addEventListener('pointermove',event=>{
      if(isDrawingRect&&rectanglePointerStart)handleMapMouseMoveForDrawing({latlng:map.mouseEventToLatLng(event)});
    });
    canvas.addEventListener('pointerup',event=>{
      if(!isDrawingRect||!rectanglePointerStart)return;
      const start=rectanglePointerStart;rectanglePointerStart=null;
      const moved=Math.hypot(event.clientX-start.x,event.clientY-start.y)>=5;
      if(moved){handleMapClickForDrawing({latlng:map.mouseEventToLatLng(event)});ignoreDrawingClickUntil=Date.now()+500;}
      else if(start.newCorner)rectStartCorner=null;
      if(canvas.hasPointerCapture?.(event.pointerId))canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener('pointercancel',()=>{rectanglePointerStart=null;resetDrawingModes();restoreAreaLayers();});
  }

  function resetDrawingModes() {
    map?.getContainer?.()?.classList?.remove("dalil-drawing");
    rectanglePointerStart=null;
    ignoreDrawingClickUntil=0;
    isDrawingRect = false;
    isDrawingPolygon = false;
    polygonVertices = [];
    if (editLayerGroup) editLayerGroup.clearLayers();
    if (map && map.doubleClickZoom && !viewportLock?.isLocked()) map.doubleClickZoom.enable();
    if(map?.dragging && !viewportLock?.isLocked())map.dragging.enable();
    document.getElementById("drawSessionActions")?.classList.add("hidden");
    rectStartCorner = null;

    btnStartDrawRect.classList.remove("active");
    btnMapToolPan.classList.add("active");

    drawInstructionHint.textContent = t("drawHint");
    if (map) map.getContainer().style.cursor = "";
    if (tempDrawLayer) {
      drawLayerGroup.removeLayer(tempDrawLayer);
      tempDrawLayer = null;
    }
  }

  function handleMapClickForDrawing(e) {
    if(Date.now()<ignoreDrawingClickUntil)return;
    if (isDrawingPolygon) { polygonVertices.push([Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))]); renderPolygonDraft(); return; }
    if (!isDrawingRect) return;

    const lat = Number(e.latlng.lat.toFixed(6));
    const lng = Number(e.latlng.lng.toFixed(6));

    if (!rectStartCorner) {
      rectStartCorner = [lat, lng];
      drawInstructionHint.textContent = t("drawSecondCorner");
    } else {
      const corner2 = [lat, lng];
      const minLat = Math.min(rectStartCorner[0], corner2[0]);
      const maxLat = Math.max(rectStartCorner[0], corner2[0]);
      const minLng = Math.min(rectStartCorner[1], corner2[1]);
      const maxLng = Math.max(rectStartCorner[1], corner2[1]);

      if (minLat === maxLat || minLng === maxLng) { drawInstructionHint.textContent = t("drawSecondCorner"); return; }
      const rectBounds = { minLat, maxLat, minLng, maxLng };
      rememberWorkspace();
      importedStudyArea=null;if(studyAreaLayerGroup)studyAreaLayerGroup.clearLayers();
      drawnRectangle = {
        id: "drawing-" + Date.now(), version: 1, source: { kind: "drawing" },
        type: "BBox",
        polygon: [
          [minLat, minLng],
          [minLat, maxLng],
          [maxLat, maxLng],
          [maxLat, minLng]
        ],
        bounds: rectBounds,
        name: "Drawn rectangle"
      };
      drawnRectangle.geometry = SpatialUtils.normalizePolygonGeometry({ type: "Polygon", coordinates: [drawnRectangle.polygon.map(([lat,lng]) => [lng,lat])] });
      currentStudyArea = drawnRectangle;

      drawLayerGroup.clearLayers();
      renderDrawnRectangle(rectBounds);
      resetDrawingModes();
      updateStudyAreaBanner();
      drawInstructionHint.textContent = t("drawSaved");
      generateGridForCurrentStudyArea();
      fitMapToStudyArea();
    }
  }

  function handleMapMouseMoveForDrawing(e) {
    if (isDrawingRect && rectStartCorner) {
      const currentCorner = [e.latlng.lat, e.latlng.lng];
      const bounds = [rectStartCorner, currentCorner];
      if (!tempDrawLayer) {
        tempDrawLayer = L.rectangle(bounds, { color: "#38bdf8", weight: 2.5, dashArray: "5, 5", fillOpacity: 0.12 }).addTo(drawLayerGroup);
      } else {
        tempDrawLayer.setBounds(bounds);
      }
    }
  }

  function renderDrawnRectangle(bounds) {
    if (!drawLayerGroup || !bounds) return;
    drawLayerGroup.clearLayers();
    const rect = drawnRectangle && drawnRectangle.geometry && drawnRectangle.type !== "BBox" ? L.polygon(SpatialUtils.geometryToLeafletPolygons(drawnRectangle.geometry), { color: "#38bdf8", weight: 2.5, fillOpacity: 0.05 }) : L.rectangle([
      [bounds.minLat, bounds.minLng],
      [bounds.maxLat, bounds.maxLng]
    ], {
      color: "#38bdf8",
      weight: 2.5,
      dashArray: "5, 5",
      fillColor: "#38bdf8",
      fillOpacity: 0.05
    });
    rect.bindPopup("<strong>" + escapeHtml(t("drawRectangleLabel")) + "</strong>");
    drawLayerGroup.addLayer(rect);
  }

  /**
   * مسح المستطيل المرسوم يدوياً فقط مع الحفاظ على ملف منطقة الدراسة المستورد وظهوره باللون الأحمر
   */
  async function clearDrawnRectangle() {
    if (!areaCanChange()) return;
    rememberWorkspace();
    if (await runWorkspaceOperation("REMOVE_DRAWING")) {
      drawInstructionHint.textContent = t("drawHint");
      if (currentStudyArea) generateGridForCurrentStudyArea();
    }
  }

  /**
   * 7. رسم حدود منطقة الدراسة على الخريطة
   * يتم تمييز حدود منطقة الدراسة باللون الأحمر البارز (Red Outline) لفصلها بوضوح عن شبكة المربعات الزرقاء
   */
  function renderStudyAreaBoundary(coords, bounds = null, area = null) {
    studyAreaLayerGroup.clearLayers();
    if(SpatialUtils.hasProximityGeometry(area?.geometry)){
      L.geoJSON(area.geometry,{style:{color:"#dc2626",weight:4,fillOpacity:0.08},pointToLayer:(_feature,ll)=>L.circleMarker(ll,{radius:7,color:"#dc2626",fillOpacity:0.7})}).addTo(studyAreaLayerGroup);
      const drawRadius=g=>{
        if(g.type==="Point")L.circle([g.coordinates[1],g.coordinates[0]],{radius:area.bufferMeters,color:"#dc2626",weight:1,fillOpacity:0.04}).addTo(studyAreaLayerGroup);
        else if(g.type==="MultiPoint")g.coordinates.forEach(p=>drawRadius({type:"Point",coordinates:p}));
        else if(g.type==="GeometryCollection")g.geometries.forEach(drawRadius);
      };drawRadius(area.geometry);
      if(bounds)L.rectangle([[bounds.minLat,bounds.minLng],[bounds.maxLat,bounds.maxLng]],{color:"#dc2626",weight:1.5,dashArray:"8, 5",fill:false}).bindPopup(escapeHtml(t("proximityGridLabel"))).addTo(studyAreaLayerGroup);
      return;
    }
    if (coords && coords.length >= 3) {
      const poly = L.polygon(area && area.geometry ? SpatialUtils.geometryToLeafletPolygons(area.geometry) : coords, {
        color: "#dc2626", // أحمر ناصع ومميز للمحيط الخارجي
        weight: 3.5,
        dashArray: "8, 5",
        fillColor: "#ef4444",
        fillOpacity: 0.08
      });

      poly.bindPopup(`<strong>${escapeHtml(t("boundaryLabel"))}</strong><br/>${coords.length}`);
      studyAreaLayerGroup.addLayer(poly);
    } else if (bounds) {
      const rect = L.rectangle([
        [bounds.minLat, bounds.minLng],
        [bounds.maxLat, bounds.maxLng]
      ], {
        color: "#dc2626", // أحمر ناصع ومميز للمحيط الخارجي
        weight: 3.5,
        dashArray: "8, 5",
        fillColor: "#ef4444",
        fillOpacity: 0.08
      });

      rect.bindPopup("<strong>" + escapeHtml(t("boundingBoxLabel")) + "</strong>");
      studyAreaLayerGroup.addLayer(rect);
    }
  }

  /**
   * 8. إعدادات تقسيم الشبكة (Sliders & Numeric Inputs & Generation)
   */
  function setupGridSliders() {
    const inputGridRowsNum = document.getElementById("inputGridRowsNum");
    const inputGridColsNum = document.getElementById("inputGridColsNum");

    const updateFromSlider = () => {
      const rows = parseInt(inputGridRows.value) || 1;
      const cols = parseInt(inputGridCols.value) || 1;
      if (inputGridRowsNum) inputGridRowsNum.value = rows;
      if (inputGridColsNum) inputGridColsNum.value = cols;
      if (labelGridRows) labelGridRows.textContent = rows;
      if (labelGridCols) labelGridCols.textContent = cols;
      cellsTotalPreviewBadge.textContent = cellCountLabel(rows * cols);
    };

    const updateFromNumberInput = () => {
      let rows = parseInt(inputGridRowsNum ? inputGridRowsNum.value : inputGridRows.value) || 1;
      let cols = parseInt(inputGridColsNum ? inputGridColsNum.value : inputGridCols.value) || 1;
      if (rows < 1) rows = 1;
      if (cols < 1) cols = 1;
      if (rows > 40) rows = 40;
      if (cols > 40) cols = 40;
      if (inputGridRowsNum) inputGridRowsNum.value = rows;
      if (inputGridColsNum) inputGridColsNum.value = cols;
      if (inputGridRows) inputGridRows.value = rows;
      if (inputGridCols) inputGridCols.value = cols;
      if (labelGridRows) labelGridRows.textContent = rows;
      if (labelGridCols) labelGridCols.textContent = cols;
      cellsTotalPreviewBadge.textContent = cellCountLabel(rows * cols);
    };

    if (inputGridRows) inputGridRows.addEventListener("input", updateFromSlider);
    if (inputGridCols) inputGridCols.addEventListener("input", updateFromSlider);

    if (inputGridRowsNum) {
      inputGridRowsNum.addEventListener("input", updateFromNumberInput);
      inputGridRowsNum.addEventListener("change", updateFromNumberInput);
    }
    if (inputGridColsNum) {
      inputGridColsNum.addEventListener("input", updateFromNumberInput);
      inputGridColsNum.addEventListener("change", updateFromNumberInput);
    }

    // تهيئة القيم المبدئية
    updateFromSlider();

    btnGenerateGridNow.addEventListener("click", () => {
      generateGridForCurrentStudyArea();
    });
  }

  /**
   * توليد شبكة المربعات الحالية فوق منطقة الدراسة
   */
  function generateGridForCurrentStudyArea() {
    if (!areaCanChange()) return;
    if(isDrawingRect||isDrawingPolygon){drawInstructionHint.textContent=t("finishFirst");return;}
    if (!currentStudyArea || !currentStudyArea.bounds) {
      if (!map || typeof map.getBounds !== "function") { alert(t("missingArea")); return; }
      const view = map.getBounds();
      const bounds = { minLat: Number(view.getSouth().toFixed(6)), maxLat: Number(view.getNorth().toFixed(6)), minLng: Number(view.getWest().toFixed(6)), maxLng: Number(view.getEast().toFixed(6)) };
      const {minLat,maxLat,minLng,maxLng} = bounds;
      const parsed = SpatialUtils.parsedAreaFromGeometry({ type:"Polygon", coordinates:[[[minLng,minLat],[maxLng,minLat],[maxLng,maxLat],[minLng,maxLat],[minLng,minLat]]] }, "Map viewport", "viewport");
      drawnRectangle = {...parsed,id:"viewport-"+Date.now(),version:1,source:{kind:"drawing",method:"explicit-viewport"}};
      currentStudyArea = drawnRectangle;
    }
    if (currentStudyArea.crossesDateline) { alert(t("dateLineUnsupported")); return; }
    const rowsInput = document.getElementById("inputGridRowsNum"), colsInput = document.getElementById("inputGridColsNum");
    const rows = Math.max(1,Math.min(40,parseInt(rowsInput && rowsInput.value || inputGridRows.value,10)||5));
    const cols = Math.max(1,Math.min(40,parseInt(colsInput && colsInput.value || inputGridCols.value,10)||5));
    const overlapValue = Number.parseFloat(inputOverlapPercent.value);
    const overlap = Number.isFinite(overlapValue) ? overlapValue : 0.05;
    const filterPoly = !SpatialUtils.hasProximityGeometry(currentStudyArea.geometry) && checkClipToStudyArea && checkClipToStudyArea.checked ? currentStudyArea : null;
    try {
      const cells = SpatialUtils.generateMeshForBounds(currentStudyArea.bounds,rows,cols,overlap,filterPoly);
      const previousCells = allCells;
      allCells = cells;
      setWorkspaceBusy(true);
      chrome.runtime.sendMessage({action:"SET_ACTIVE_GRID",customCells:cells,customBounds:currentStudyArea.bounds,studyArea:currentStudyArea,areaVersion:currentStudyArea.version||1,workspaceSnapshot:workspaceSnapshot()},response=>{
        setWorkspaceBusy(false);
        if (!response || !response.success) { allCells=previousCells; renderMapGrid(allCells); chrome.runtime.sendMessage({action:'GET_WORKSPACE'},saved=>{if(saved?.workspace)applyWorkspaceSnapshot(saved.workspace);}); if(response && response.error)alert(t("workspaceSaveFailed")+errorText(response)); return; }
        workspaceRevision=response.workspace && response.workspace.revision || workspaceRevision+1;
        renderMapGrid(cells);
        updateStudyAreaBanner();
      });
      cellsTotalPreviewBadge.textContent=cellCountLabel(cells.length);
      hudCellsCount.textContent=cells.length;
      const badge=document.getElementById("quickGridBadge");if(badge)badge.textContent=cellCountLabel(cells.length);
      renderMapGrid(cells);
    } catch(error){
      alert(t("gridFailed")+spatialErrorMessage(error));
      setWorkspaceBusy(true);
      chrome.runtime.sendMessage({action:"GET_WORKSPACE"},saved=>{setWorkspaceBusy(false);if(saved?.workspace)applyWorkspaceSnapshot(saved.workspace);});
    }
  }

  function fitMapToStudyArea(){
    if(!map||viewportLock?.isLocked())return;
    const target=currentStudyArea||drawnRectangle||importedStudyArea;
    if(!target||!target.bounds)return;
    const b=target.bounds;
    map.fitBounds([[b.minLat,b.minLng],[b.maxLat,b.maxLng]],{padding:[30,30]});
  }

  function spatialErrorMessage(error) {
    const text = String(error && error.message || error || "");
    if (/date line/i.test(text)) return t("dateLineUnsupported");
    if (/WGS84|EPSG|4326|إسقاط/.test(text)) return t("invalidCrs");
    if (/ZIP|archive|decompress|checksum|ضغ/i.test(text)) return t("invalidArchive");
    if (/DTD|entities|ENTITY/i.test(text)) return t("invalidXml");
    if (/Search distance/i.test(text)) return t("invalidSearchBuffer");
    if (/Grid resolution/i.test(text)) return t("gridPrecisionLimit");
    if (/Import file size/i.test(text)) return t("importSizeLimit");
    return t("invalidGeometry");
  }

  function errorText(response){
    const code=response && (response.code||response.errorCode||response.error);
    return code && (I18N_DICT[currentLang]||{})[code] || t("startFailed") + (typeof code === "string" && /^[A-Z_]+$/.test(code) ? " ("+code+")" : "");
  }

  function setupActionButtons(){
    document.getElementById("showUnscannedDiscoveries")?.addEventListener("change",()=>renderMapMarkers(allResults));
    btnTopStart.addEventListener("click",()=>{
      if(workspaceBusy){alert(t('workspaceLocked'));return;}
      if(!currentStudyArea||!allCells.length){alert(t("missingArea"));switchView("setup");return;}
      if(!targetPhenomena.length){alert(t("missingFeatures"));switchView("phenomena");return;}
      let selectedLocale,uiPlan;
      try{selectedLocale=getSearchLocale();uiPlan=buildUiQueryPlan();}catch(error){alert(t("INVALID_LOCALE"));switchView("setup");return;}
      if(!uiPlan.executable){updateQueryReview();switchView("phenomena");document.getElementById("translationReviewPanel")?.scrollIntoView({block:"center"});alert(t("MISSING_QUERY_TRANSLATION"));return;}
      const config={provider:(document.getElementById("dataSource")||{}).value||"google_maps_dom",searchLocale:selectedLocale,queryTerms:queryTermOverrides,fallbackLanguage:document.getElementById("allowEnglishSearchFallback")?.checked?"en":null,uiLanguage:currentLang,areaVersion:workspaceRevision,query:targetPhenomena[0],queriesToRun:[...targetPhenomena],queryPlanMode:selectQueryPlanMode&&selectQueryPlanMode.value||"comprehensive",studyArea:currentStudyArea,bilingualEnabled:!sideBilingualToggle.disabled&&sideBilingualToggle.checked,clearPreviousData:!checkAccumulateData.checked,customCells:allCells,customBounds:currentStudyArea.bounds,zoom:settingZoomLevel.value==="auto"?"auto":parseInt(settingZoomLevel.value,10)||15,delayMs:parseInt(settingDelayMs.value,10)||1600,autoPan:checkAutoPanCamera.checked,zoomActive:checkZoomActiveCell.checked,autoDedup:checkAutoDedup.checked};
      btnTopStart.disabled=true;
      chrome.runtime.sendMessage({action:"START_SCRAPING",config},response=>{
        btnTopStart.disabled=false;
        if(response&&response.success){fetchData();}
        else alert(errorText(response));
      });
    });
    const command=(button,action,status)=>button.addEventListener("click",()=>{
      button.disabled=true;
      chrome.runtime.sendMessage({action},response=>{button.disabled=false;if(response&&response.success){updateStatusControls(response.status||status);fetchData();}else if(response)alert(errorText(response));});
    });
    command(btnTopPause,"PAUSE_SCRAPING","paused");command(btnTopResume,"RESUME_SCRAPING","running");command(btnTopStop,"STOP_SCRAPING","stopped");
    btnDashDedup.addEventListener("click",()=>{
      if(!allResults.length){alert(t("noResultsDedup"));return;}
      chrome.runtime.sendMessage({action:"DEDUPLICATE_NOW"},response=>{if(response&&response.success)fetchData();else if(response)alert(errorText(response));});
    });
    btnDashClear.addEventListener("click",()=>{if(confirm(t("clearResultsConfirm")))chrome.runtime.sendMessage({action:"CLEAR_RESULTS"},response=>{if(response&&response.success){allResults=[];lastProcessedCount=-1;fetchData();}});});
    btnRefresh.addEventListener("click",fetchData);
    tableFilterInput.addEventListener("input",()=>{currentPage=1;renderTable(allResults);});
    if(btnPrevPage)btnPrevPage.addEventListener("click",()=>{if(currentPage>1){currentPage--;renderTable(allResults);}});
    if(btnNextPage)btnNextPage.addEventListener("click",()=>{if(currentPage<Math.ceil(getFilteredResults().length/pageSize)){currentPage++;renderTable(allResults);}});
    if(colldataTableBody)colldataTableBody.addEventListener("click",event=>{
      const del=event.target.closest("[data-action='delete']");
      if(del){event.stopPropagation();deleteSinglePlace(del.dataset.id);return;}
      if(event.target.closest("a")||event.target.closest("button"))return;
      const row=event.target.closest("tr[data-index]");if(!row)return;
      const place=getFilteredResults()[Number(row.dataset.index)];
      if(place&&hasGeometry(place))focusFeatureOnMap(Number(place.y),Number(place.x),place.name,place);
    });
  }

  function setupExportButtons(){
    const controls=[
      ["btnExportKml","exportToKml"],["btnExportKmz","exportToKmz"],["btnExportExcel","exportToExcel"],["btnExportGeoJson","exportToGeoJson"],["btnExportJson","exportToJson"],["btnExportCsv","exportToCsv"],["btnExportShp","exportToShapefile"],
      ["btnExportExcelDirect","exportToExcel",true],["btnExportKmlDirect","exportToKml",true],["btnExportGeoJsonDirect","exportToGeoJson",true]
    ];
    controls.forEach(([id,method,all])=>{const button=document.getElementById(id);if(button)button.addEventListener("click",async()=>{
      try{if(ExportUtils.setLanguage)ExportUtils.setLanguage(currentLang);await (ExportUtils.exportInWorker ? ExportUtils.exportInWorker(({exportToKml:"kml",exportToKmz:"kmz",exportToExcel:"xlsx",exportToGeoJson:"geojson",exportToJson:"json",exportToCsv:"csv",exportToShapefile:"shp"})[method],all?allResults:getFilteredResults(),"dalil_places_survey",null,{language:currentLang}) : ExportUtils[method](all?allResults:getFilteredResults(),"dalil_places_survey",null,{language:currentLang}));}
      catch(error){alert(error.message);}
    });});
    if(btnExportSeparateKml)btnExportSeparateKml.addEventListener("click",()=>ExportUtils.exportSeparateFilesPerCategory(allResults,"kml","dalil_places_survey"));
  }

  function setupBottomDrawer(){
    const sync=()=>{const minimized=tableSectionDrawer.classList.contains("minimized");if(btnToggleDrawer)btnToggleDrawer.setAttribute("aria-expanded",String(!minimized));if(drawerChevron)drawerChevron.textContent=minimized?"▾":"▴";};
    btnToggleDrawer.addEventListener("click",()=>{tableSectionDrawer.classList.toggle("minimized");tableSectionDrawer.style.height=tableSectionDrawer.classList.contains("minimized")?"44px":localStorage.getItem("dalil_table_height")||"290px";sync();setTimeout(()=>{if(map)map.invalidateSize();},100);});sync();
  }

  function setupLayoutResizers(){
    const resizer=document.getElementById("tableResizer");if(!resizer||!tableSectionDrawer)return;
    const saved=parseInt(localStorage.getItem("dalil_table_height"),10);if(saved>=60&&saved<window.innerHeight-100)tableSectionDrawer.style.height=saved+"px";
    let active=false,startY=0,startHeight=0;
    const position=event=>event.touches?event.touches[0].clientY:event.clientY;
    const move=event=>{if(!active)return;if(event.cancelable)event.preventDefault();const height=Math.max(44,Math.min(window.innerHeight-100,startHeight+startY-position(event)));tableSectionDrawer.style.height=height+"px";tableSectionDrawer.classList.toggle("minimized",height<=50);if(map)map.invalidateSize();};
    const finish=()=>{if(!active)return;active=false;document.body.style.cursor="";document.body.style.userSelect="";tableSectionDrawer.classList.remove("resizing");localStorage.setItem("dalil_table_height",tableSectionDrawer.style.height);window.removeEventListener("mousemove",move);window.removeEventListener("mouseup",finish);window.removeEventListener("touchmove",move);window.removeEventListener("touchend",finish);};
    const start=event=>{active=true;startY=position(event);startHeight=tableSectionDrawer.getBoundingClientRect().height;tableSectionDrawer.classList.add("resizing");document.body.style.cursor="row-resize";document.body.style.userSelect="none";window.addEventListener("mousemove",move);window.addEventListener("mouseup",finish);window.addEventListener("touchmove",move,{passive:false});window.addEventListener("touchend",finish);};
    resizer.addEventListener("mousedown",start);resizer.addEventListener("touchstart",start,{passive:true});resizer.addEventListener("dblclick",()=>{const h=tableSectionDrawer.getBoundingClientRect().height;tableSectionDrawer.style.height=(h<window.innerHeight*0.65?Math.floor(window.innerHeight*0.7):290)+"px";tableSectionDrawer.classList.remove("minimized");localStorage.setItem("dalil_table_height",tableSectionDrawer.style.height);if(map)map.invalidateSize();});
  }

  function scheduleFetchData(){
    if(fetchThrottleTimer)return;
    fetchThrottleTimer=setTimeout(()=>{fetchThrottleTimer=null;fetchData();},400);
  }
  function sendCommand(request) { return new Promise(resolve=>chrome.runtime.sendMessage(request,resolve)); }
  async function fetchData(){
    if(fetchingResults){refreshQueued=true;return;}
    fetchingResults=true;
    try {
      const state=await sendCommand({action:"GET_STATUS"});
      if(!state||!state.success)return;
      currentStats=state.stats||{};
      updateStatusControls(state.status,state.currentCell,state.currentIndex,state.activeQueryText,state.stats,state.currentQueryIndex,state.totalQueries,state.completedQueries,state.queryStats);
      const grid=await sendCommand({action:"GET_GRID"});
      if(grid&&grid.success&&Array.isArray(grid.cells)){allCells=grid.cells;updateMapGridStyles(allCells);}
      if(lastResultsRevision!==state.resultsRevision||resultsDirty){
        const records=[];let total=state.resultsCount||0;const revision=state.resultsRevision||0;
        for(let offset=0;offset<total;offset+=1000){
          const page=await sendCommand({action:"GET_RESULTS_PAGE",offset,limit:1000,resultsRevision:revision});
          if(!page||!page.success||page.resultsRevision!==revision){resultsDirty=true;return;}
          total=page.total;records.push(...page.results);
        }
        allResults=records;lastResultsRevision=revision;
        renderPhenomenaTabs();renderTable(allResults);renderMapMarkers(allResults);
        lastProcessedCount=allResults.length;resultsDirty=false;
      }
      hudPlacesCount.textContent=allResults.length;hudDupCount.textContent=currentStats.duplicatesSkipped||0;hudCellsCount.textContent=allCells.length;
      cellsTotalPreviewBadge.textContent=cellCountLabel(allCells.length);tableRecordCount.textContent=allResults.length;
      const quick=document.getElementById("quickRecordsBadge");if(quick)quick.textContent=allResults.length;
      if(tabCountAll)tabCountAll.textContent=allResults.length;
      if(state.lastError||state.pauseReason){const detail=document.getElementById("liveProgressDetails");if(detail)detail.textContent=errorText({code:state.pauseReason||state.lastError?.code,error:state.lastError?.message});}
    } catch(error){console.warn("Dashboard refresh failed",error);}
    finally{fetchingResults=false;if(refreshQueued){refreshQueued=false;setTimeout(fetchData,0);}}
  }

  function updateStatusControls(status,currentCell=null,cellIdx=0,queryText="",stats={},queryIdx=0,totalQueries=1,completedQueries=[],queryStats={}){
    lastStatusArgs=[status,currentCell,cellIdx,queryText,stats,queryIdx,totalQueries,completedQueries,queryStats];
    currentStatus=status||"idle";
    const active=currentStatus==="running",paused=currentStatus==="paused";
    const bufferInput=document.getElementById("inputSearchBufferMeters");if(bufferInput)bufferInput.disabled=active||paused||workspaceBusy;
    for(const id of ["searchLocale","customSearchLocale","allowEnglishSearchFallback","btnSaveQueryTerms","dataSource"]){const el=document.getElementById(id);if(el)el.disabled=active||paused||workspaceBusy;}
    const dictionary=I18N_DICT[currentLang]||I18N_DICT.ar;
    const statusKeys={idle:"statusReady",running:"statusRunning",paused:"statusPaused",stopped:"statusStopped",completed:"surveyScheduledDone"};
    const label=dictionary[statusKeys[currentStatus]]||currentStatus;
    if(dashboardStatusText)dashboardStatusText.textContent=label;
    if(statusNotice)statusNotice.setAttribute("data-status",currentStatus);
    const liveDot=document.getElementById("statusPillDot");if(liveDot)liveDot.className="live-dot status-"+currentStatus;
    btnTopStart.classList.toggle("hidden",active||paused);btnTopPause.classList.toggle("hidden",!active);btnTopResume.classList.toggle("hidden",!paused);btnTopStop.classList.toggle("hidden",!active&&!paused);
    const count=stats.totalCells||allCells.length;
    const units=Math.max(1,count*Math.max(1,totalQueries));
    const completed=currentStatus==="completed"?units:Math.min(units,(queryIdx||0)*count+(cellIdx||0));
    const pct=Math.min(100,Math.round(completed/units*100));
    const metric=document.getElementById("metricProgressVal");if(metric)metric.textContent=pct;
    const livePercent=document.getElementById("liveProgressPercent");if(livePercent)livePercent.textContent=pct+"%";
    const liveBar=document.getElementById("liveProgressBarFill");if(liveBar)liveBar.style.width=pct+"%";
    const railTitle=document.getElementById("railStateTitle"),railSub=document.getElementById("railStateSub");
    if(railTitle)railTitle.textContent=label;
    if(railSub)railSub.textContent=completed+" / "+units;
    const title=document.getElementById("liveProgressTitle");if(title)title.textContent=currentCell?label+" · "+displayCellName(currentCell):label;
    const details=document.getElementById("liveProgressDetails");if(details)details.textContent=localizeCategory(queryText||"")+" · "+(currentCell?displayCellName(currentCell)+" · ":"")+(currentLang==="ar"?"الظاهرة ":"Feature ")+Math.min((queryIdx||0)+1,totalQueries)+" / "+totalQueries+" · "+completed+" / "+units;
    const eta=document.getElementById("noticeEtaLabel");if(eta){const duration=stats.startTime?Date.now()-stats.startTime:0;const seconds=completed>0?Math.round((duration/completed)*(units-completed)/1000):0;eta.textContent=seconds?Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0"):"—";}
    const overlay=document.getElementById("liveExtractionProgressCard");if(overlay)overlay.classList.toggle("hidden",!active&&!paused);
    if(currentCell){const position=allCells.findIndex(cell=>cell.id===currentCell.id);if(position>=0)allCells[position]={...allCells[position],...currentCell};}
    updateMapGridStyles(allCells);
    if(active && currentCell && gridCellState(currentCell)==="processing")highlightActiveCell(currentCell);else activeCellHighlightLayer?.clearLayers();
    if(active&&currentCell&&map&&!viewportLock?.isLocked()&&checkAutoPanCamera.checked){const center=[currentCell.centerLat,currentCell.centerLng];if(checkZoomActiveCell.checked&&currentCell.bounds){const b=currentCell.bounds;map.fitBounds([[b.minLat,b.minLng],[b.maxLat,b.maxLng]],{padding:[20,20],animate:false});}else map.panTo(center);}
    updatePhenomenaChipsStatus(completedQueries,queryText,queryStats);
  }

  function displayCellName(cell){return (currentLang==="ar"?"خلية ":"Cell ")+(Number.isInteger(cell.row)?"("+(cell.row+1)+", "+(cell.col+1)+")":cell.index!=null?cell.index+1:cell.id);}
  function gridCellState(cell){return DalilGridPresentation.state(cell,{status:currentStatus,queryIndex:lastStatusArgs?.[5]||0});}
  function getCellStyle(status){return DalilGridPresentation.style(status);}
  function renderGridLegend(){
    const legend=document.getElementById("gridStatusLegend");if(!legend)return;
    legend.innerHTML=DalilGridPresentation.definitions.map(d=>'<span data-grid-status="'+d.id+'"><i style="background:'+d.color+'22;border:1.7px '+(d.dash?'dashed':'solid')+' '+d.color+'"></i><span>'+escapeHtml(t(d.label))+'</span></span>').join("");
  }
  function cellPopup(cell){
    const states={pending:currentLang==="ar"?"بانتظار الفحص":"Pending",processing:t("statusRunning"),running:t("statusRunning"),done:currentLang==="ar"?"تم الفحص":"Surveyed",complete:currentLang==="ar"?"تم الفحص":"Surveyed",verified_empty:currentLang==="ar"?"لا نتائج وفق دليل المصدر":"No results: provider evidence",confirmed_empty:currentLang==="ar"?"لا نتائج وفق دليل المصدر":"No results: provider evidence",partial:currentLang==="ar"?"نتائج جزئية":"Partial",capped:currentLang==="ar"?"حد النتائج":"Capped",unknown:currentLang==="ar"?"غير محسوم":"Unknown",error:currentLang==="ar"?"خطأ":"Error",blocked:currentLang==="ar"?"حظر المصدر":"Provider blocked"};
    const status=gridCellState(cell);
    return '<strong>'+escapeHtml(displayCellName(cell))+'</strong><br>'+escapeHtml(states[status]||status)+'<br>'+escapeHtml(t("hudPlaces"))+' '+Number(cell.itemsFound||0);
  }
  function renderMapGrid(cells){
    if(!cellsLayerGroup)return;
    cellsLayerGroup.clearLayers();cellLayersMap.clear();lastCellsCount=cells.length;
    renderGridLegend();
    if(mapCellsFoot)mapCellsFoot.textContent=cellCountLabel(cells.length);
    cells.forEach(cell=>{const b=cell.bounds||cell;if(!b||![b.minLat,b.maxLat,b.minLng,b.maxLng].every(Number.isFinite))return;const layer=L.rectangle([[b.minLat,b.minLng],[b.maxLat,b.maxLng]],getCellStyle(gridCellState(cell)));layer.bindPopup(cellPopup(cell));layer.on("click",()=>{tableFilterInput.value=cell.id;currentPage=1;renderTable(allResults);});cellsLayerGroup.addLayer(layer);cellLayersMap.set(cell.id,layer);const el=layer.getElement?.();if(el){el.dataset.cellId=cell.id;el.dataset.gridStatus=gridCellState(cell);}});
    refreshMarkerScope(cells);
  }
  function updateMapGridStyles(cells){
    if(cells.length!==lastCellsCount){renderMapGrid(cells);return;}
    cells.forEach(cell=>{const layer=cellLayersMap.get(cell.id);if(layer){if(layer.setStyle)layer.setStyle(getCellStyle(gridCellState(cell)));if(layer.setPopupContent)layer.setPopupContent(cellPopup(cell));const el=layer.getElement?.();if(el)el.dataset.gridStatus=gridCellState(cell);}});
    refreshMarkerScope(cells);
  }
  function refreshMarkerScope(cells){const key=workspaceRevision+'|'+cells.length+'|'+cells.filter(DalilGridPresentation.visited).map(c=>c.id).join('|');if(key!==renderedOwnerScopeKey){renderedOwnerScopeKey=key;renderMapMarkers(allResults);}}
  function highlightActiveCell(cell){
    if(!activeCellHighlightLayer||!cell||!cell.bounds)return;
    activeCellHighlightLayer.clearLayers();const b=cell.bounds;activeCellHighlightLayer.addLayer(L.rectangle([[b.minLat,b.minLng],[b.maxLat,b.maxLng]],{color:"#f59e0b",weight:3,fillOpacity:0.04}));
  }
  function hasGeometry(place){return place&&place.hasExactCoords!==false&&place.x!=null&&place.y!=null&&Number.isFinite(Number(place.x))&&Number.isFinite(Number(place.y))&&Math.abs(Number(place.x))<=180&&Math.abs(Number(place.y))<=90;}
  function resultCategory(place,kind="main"){
    const resolver=kind==="main"?ExportUtils.resolveMainCategory:ExportUtils.resolveSubCategory;
    return ExportUtils.categoryLabel ? ExportUtils.categoryLabel(place,kind,{language:currentLang}) : resolver?localizeCategory(resolver.call(ExportUtils,place)):localizeCategory(place.category||place.searchKeyword||"");
  }
  function placePopup(place){
    const symbol=typeof DalilSymbology!=="undefined"?DalilSymbology.resolve(place):null;
    const symbolNote=symbol?.resolutionOrigin==="query_hint"?'<p class="caption">'+escapeHtml(t("queryHintSymbol"))+'</p>':"";
    const fields=[["thMainCat",resultCategory(place)],["thSubCat",resultCategory(place,"sub")],["thAddress",place.address],["thPhone",place.phone],["thRating",place.rating],["thHours",place.opening_hours||place.status],["price",place.price_level],["amenities",typeof place.attributes==="string"?place.attributes:null]];
    return '<div class="map-popup" dir="'+(currentLang==="ar"?'rtl':'ltr')+'"><h4 class="map-popup-title">'+escapeHtml(place.name||"")+'</h4>'+symbolNote+'<div class="map-popup-body">'+fields.filter(([,value])=>value!=null&&value!=="").map(([key,value])=>'<b>'+escapeHtml(t(key))+':</b> '+escapeHtml(value)+'<br>').join("")+(hasGeometry(place)?'<code dir="ltr">X: '+Number(place.x).toFixed(6)+', Y: '+Number(place.y).toFixed(6)+'</code>':escapeHtml(t("unlocated")))+'</div>'+(safeUrl(place.url)?'<a class="map-popup-link" href="'+safeUrl(place.url)+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(t("openMap"))+'</a>':'')+'</div>';
  }
  function renderMapMarkers(places){
    if(!markersLayerGroup)return;markersLayerGroup.clearLayers();
    if(!canvasRenderer&&L.canvas)canvasRenderer=L.canvas();
    // Bound map rendering independently of the full table/export dataset.
    const points=places.filter(hasGeometry),visited=new Set(allCells.filter(DalilGridPresentation.visited).map(c=>c.id));
    const showEarly=document.getElementById("showUnscannedDiscoveries")?.checked;
    const inVisited=place=>!allCells.length||visited.has(place.ownerCellId||place.cellId);
    const visible=showEarly?points:points.filter(inVisited),early=points.filter(p=>!inVisited(p)).length,rendered=visible.slice(0,5000);
    rendered.forEach(place=>{
      const style=typeof DalilSymbology!=="undefined"?DalilSymbology.resolve(place):TaxonomyEngine.resolveCategoryStyle(place.category||place.searchKeyword||"");
      const icon=L.divIcon&&style&&style.pngPath?L.divIcon({className:"dalil-gis-symbol"+(!inVisited(place)?" is-early-discovery":""),html:'<img data-symbol-id="'+escapeAttr(style.symbolId)+'" src="'+safeAssetUrl(style.pngPath)+'" alt="'+escapeAttr(resultCategory(place,"sub"))+'" width="30" height="30">',iconSize:[30,30],iconAnchor:[15,15]}):null;
      const marker=icon&&L.marker?L.marker([Number(place.y),Number(place.x)],{icon}):L.circleMarker([Number(place.y),Number(place.x)],{renderer:canvasRenderer,radius:5,color:"#fff",weight:1.2,fillColor:style.color||"#0284c7",fillOpacity:0.9});
      marker.bindPopup((!inVisited(place)?'<p>'+escapeHtml(t("earlyDiscoveryDetail"))+'</p>':'')+placePopup(place));markersLayerGroup.addLayer(marker);
    });
    const note=document.getElementById("mapRenderNotice");if(note)note.textContent=visible.length>rendered.length?(currentLang==="ar"?"تُعرض أول 5000 نقطة لتحسين الأداء؛ تتوفر جميع النتائج بالجدول والتصدير.":"The map shows the first 5,000 points for performance; all records remain in the table and exports."):"";
    const discoveryNotice=document.getElementById("mapDiscoveryNotice");if(discoveryNotice)discoveryNotice.textContent=early?String(early)+' '+t(showEarly?"earlyDiscoveriesShown":"earlyDiscoveriesHidden"):"";
    renderSymbolLegend(rendered);
  }
  function renderSymbolLegend(places=[]){
    const legend=document.getElementById("mapSymbolLegend");if(!legend||typeof DalilSymbology==="undefined")return;
    const entries=new Map();
    for(const item of (places.length?places:targetPhenomena)){const symbol=DalilSymbology.resolve(symbolInput(item));if(!entries.has(symbol.symbolId))entries.set(symbol.symbolId,{symbol,label:typeof item==="string"||item?.kind==="free_text"?localizeCategory(item):resultCategory(item,"sub")});}
    legend.innerHTML=[...entries.values()].slice(0,5).map(({symbol,label})=>'<span role="listitem"><img src="'+safeAssetUrl(symbol.pngPath)+'" width="22" height="22" alt=""><span>'+escapeHtml(label)+'</span></span>').join("");
  }
  function safeAssetUrl(path){const value=String(path||"");return /^[.\w/-]+\.(svg|png)$/i.test(value)?escapeAttr(value.startsWith("../")?value:"../"+value):"";}
  function renderPhenomenaTabs(){
    if(!phenomenaTabsContainer)return;phenomenaTabsContainer.innerHTML="";
    const add=(value,label,count)=>{const button=document.createElement("button");button.type="button";button.className="p-tab"+(activePhenomFilter===value?" active":"");button.textContent=label+" ("+count+")";button.addEventListener("click",()=>{activePhenomFilter=value;currentPage=1;renderPhenomenaTabs();renderTable(allResults);});phenomenaTabsContainer.appendChild(button);};
    add("all",t("tabAll"),allResults.length);
    const counts=new Map();allResults.forEach(place=>{const category=resultCategory(place);counts.set(category,(counts.get(category)||0)+1);});counts.forEach((count,category)=>add(category,category,count));
  }
  function getFilteredResults(){
    const query=String(tableFilterInput&&tableFilterInput.value||"").trim().toLocaleLowerCase(currentLang);
    return allResults.filter(place=>{
      const main=resultCategory(place),sub=resultCategory(place,"sub");
      if(activePhenomFilter!=="all"&&main!==activePhenomFilter&&place.searchKeyword!==activePhenomFilter)return false;
      return !query||[place.name,place.name_en,main,sub,place.searchKeyword,place.address,place.phone,place.website,place.ownerCellId,place.cellId,place.cellName,...(place.discoveryCellIds||[])].some(value=>value!=null&&String(value).toLocaleLowerCase(currentLang).includes(query));
    });
  }
  function renderTable(){
    updateRecordsViewKPIs();const filtered=getFilteredResults();tableRecordCount.textContent=filtered.length;
    const totalPages=Math.max(1,Math.ceil(filtered.length/pageSize));currentPage=Math.max(1,Math.min(currentPage,totalPages));
    const start=(currentPage-1)*pageSize,end=Math.min(start+pageSize,filtered.length);
    if(paginationInfo)paginationInfo.textContent=currentLang==="ar"?'عرض '+(filtered.length?start+1:0)+' – '+end+' من '+filtered.length:'Showing '+(filtered.length?start+1:0)+' – '+end+' of '+filtered.length;
    if(pageIndicator)pageIndicator.textContent=currentPage+' / '+totalPages;
    if(btnPrevPage)btnPrevPage.disabled=currentPage<=1;if(btnNextPage)btnNextPage.disabled=currentPage>=totalPages;
    if(navRecordCount)navRecordCount.textContent=filtered.length;
    if(!filtered.length){colldataTableBody.innerHTML='<tr><td colspan="17" class="table-empty-msg">'+escapeHtml(currentLang==="ar"?"لا توجد نتائج مطابقة. حدّد منطقة الدراسة والفئات ثم ابدأ المهمة.":"No matching records. Define a study area and categories, then start a job.")+'</td></tr>';return;}
    colldataTableBody.innerHTML=filtered.slice(start,end).map((place,index)=>{
      const website=safeUrl(place.website),url=safeUrl(place.url),geometry=hasGeometry(place);
      const cells=[start+index+1,'<b>'+escapeHtml(place.name||"-")+'</b>',escapeHtml(place.name_en||"-"),escapeHtml(resultCategory(place)),escapeHtml(resultCategory(place,"sub")),escapeHtml(localizeCategory(place.searchKeyword||"-")),geometry?'<span class="coord-cell">'+Number(place.x).toFixed(6)+'</span>':"-",geometry?'<span class="coord-cell">'+Number(place.y).toFixed(6)+'</span>':"-",escapeHtml(place.address||"-")+(place.plus_code?' <bdi>'+escapeHtml(place.plus_code)+'</bdi>':''),'<bdi>'+escapeHtml(place.phone||"-")+'</bdi>',website?'<a href="'+website+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(t("websiteLink"))+'</a>':"-",escapeHtml(place.opening_hours||place.status||"-"),place.rating!=null?'★ '+escapeHtml(place.rating)+' ('+Number(place.reviewsCount||0)+')':"-",escapeHtml(typeof place.source==="string"?place.source:place.provider||"-"),escapeHtml(place.ownerCellId||place.cellId||"-"),url?'<a href="'+url+'" target="_blank" rel="noopener noreferrer">'+escapeHtml(t("openMap"))+'</a>':"-",'<button type="button" class="btn-del-place" data-action="delete" data-id="'+escapeAttr(place.id)+'" title="'+escapeAttr(t("deleteRecord"))+'" aria-label="'+escapeAttr(t("deleteRecord"))+'"><svg class="icon sm"><use href="#ic-trash"/></svg></button>'];
      return '<tr class="data-table-row" data-index="'+(start+index)+'">'+cells.map(content=>'<td>'+content+'</td>').join("")+'</tr>';
    }).join("");
  }
  function focusFeatureOnMap(lat,lng,name,place){if(!map||viewportLock?.isLocked()||!Number.isFinite(lat)||!Number.isFinite(lng)||place&&!hasGeometry(place))return;if(map.flyTo)map.flyTo([lat,lng],16,{duration:0.5});if(L.popup)L.popup().setLatLng([lat,lng]).setContent(place?placePopup(place):escapeHtml(name)).openOn(map);}
  function deleteSinglePlace(id){if(!id)return;chrome.runtime.sendMessage({action:"DELETE_ITEM",id},response=>{if(response&&response.success){resultsDirty=true;fetchData();}});}
  function escapeHtml(value){return String(value==null?"":value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));}
  function escapeAttr(value){return escapeHtml(value);}
  function safeUrl(value){try{const url=new URL(String(value||""));return ["https:","http:"].includes(url.protocol)?escapeAttr(url.href):"";}catch(_){return "";}}
});

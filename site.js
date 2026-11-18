const I18N = {
      ar: {
        navTitle: "دَلِيل",
        navSub: "اكتشاف وجمع معلومات المواقع وسجلات الأماكن",
        btnThemeDark: "🌙 داكن",
        btnThemeLight: "☀️ فاتح",
        btnLang: "🌐 English",
        btnLaunch: "🚀 طريقة التشغيل",
        heroBadge: "⚡ إضافة Google Chrome مفتوحة المصدر | الإصدار 2.2.0",
        heroTitle: "دَلِيل — اكتشاف الأماكن وتجهيز البيانات وتصديرها",
        heroSubtitle: "إضافة Chrome مفتوحة المصدر للبحث المكاني عبر شبكة خلايا تفاعلية، ومراجعة بيانات الأماكن وتصنيفاتها وإحداثياتها بدقة، مع إزالة التكرار والتصدير المباشر لـ ArcGIS وQGIS وExcel.",
        btnHeroLaunch: "🚀 تشغيل الإضافة",
        btnHeroWorkflow: "🔄 استعراض مراحل العمل (Workflow)",
        statSectors: "قطاعاً جغرافياً استراتيجياً",
        statBranches: "فرعاً تخصصياً معتمداً",
        statLeaves: "فئة ونشاطاً مكانياً معتمداً",
        statCoords: "أولوية مطلقة لإحداثيات X و Y الرقمية",
        wfTitle: "🔄 دورة حياة استخراج البيانات الجغرافية (DALIL 4-Stage Architecture)",
        wfDesc: "تحديد النطاق، البحث في مصدر مناسب، التحقق من جودة البيانات، ثم التصدير مع توثيق المصدر.",
        step1Title: "المنصات الخرائطية (Map Platforms)",
        step1Desc: "استيراد حدود مضلعة بصيغ KML وKMZ وShapefile وGeoJSON، أو رسم نطاق الدراسة على خريطة أساس موثقة.",
        step2Title: "البحث والاستكشاف (Search & Discovery)",
        step2Desc: "31 قطاعًا و940 فئة معتمدة تغطي كافة أنواع Google Places، مع دعم البحث الحر بأي لغة وحفظ النصوص حرفيًا.",
        step3Title: "هيكلة البيانات والـ X & Y (Data Structuring)",
        step3Desc: "حفظ مصدر الحقول والإحداثيات، وتحديد خلية الملكية هندسيًا عبر خوارزميات O(N)، وأولوية لمعالم الخلية (In-cell First).",
        step4Title: "التصدير الاحترافي (GIS & BI Export)",
        step4Desc: "تصدير XLSX وCSV وGeoJSON وJSON وKML وKMZ وShapefile للبيانات المسموح بإعادة استخدامها، مع ترميز UTF-8 BOM والرموز المحلية.",
        featTitle: "🌟 قدرات هندسية متطورة مصممة لخبراء الـ GIS",
        featDesc: "كل ميزة في دليل بُنيت لخدمة الباحثين والمحللين الجغرافيين ورواد الأعمال.",
        f1Title: "التوليد الشبكي والقص الذكي",
        f1Desc: "شبكة قابلة للضبط مع استبعاد الخلايا غير المتقاطعة مع منطقة الدراسة والتحقق من النقاط داخل المضلع وثقوبه.",
        f2Title: "البحث الذكي متعدد اللغات",
        f2Desc: "لغة البحث مستقلة تمامًا عن لغة الواجهة، مع دعم كتابة أي نص حر بأي لغة وربطه برمز محلي ملون.",
        f3Title: "خوارزمية الفهرسة المكانية O(N)",
        f3Desc: "فحص مكاني سريع يستبعد التكرارات المتطابقة ويدمج السجلات مع الاحتفاظ بالأوفر تفاصيل، مع التمييز الذكي بين المتاجر المختلفة في نفس العقار.",
        f4Title: "مصادر خرائط وبيانات واضحة",
        f4Desc: "خريطة أساس واضحة مع إثبات التغطية الهندسية ومطابقة العرض، وتشخيص فوري صريح لأي توقف في البحث.",
        f5Title: "تصدير GIS مباشر ومبوب",
        f5Desc: "إكسيل مخصص بأوراق عمل مستقلة لكل ظاهرة، وإحداثيات X و Y في صدارة الأعمدة كأرقام عشرية نقية تقبل الإسقاط والتحليل الفوري.",
        f6Title: "واجهة ثنائية المظهر واللغة",
        f6Desc: "دعم كامل للمظهر الداكن والفاتح مع تبديل تلقائي للشعار المناسب، وواجهة عربية وإنجليزية كاملة بنقرة زر واحدة.",
        instTitle: "🚀 كيفية تثبيت وتشغيل الأداة على متصفح Google Chrome",
        instSubtitle: "ثبّت الإضافة من المجلد الذي يحتوي على ملف تعريفها manifest.json.",
        in1Title: "فتح إدارة الإضافات",
        in1Desc: "افتح متصفح كروم واذهب إلى chrome://extensions ثم فعّل وضع مطور البرامج (Developer mode) في الزاوية العلوية.",
        in2Title: "تحميل المجلد المفكوك",
        in2Desc: "اضغط على زر تحميل حزمة مفكوكة (Load unpacked) واختر مجلد DALIL Chrome Exstension الداخلي.",
        in3Title: "بدء الاستخدام فوراً",
        in3Desc: "ثبّت أيقونة دليل في شريط الأدوات، ثم انقر عليها لفتح لوحة التحكم.",
        linkDash: "لوحة التحكم",
        linkWf: "دورة العمل"
      },
      en: {
        navTitle: "DALIL",
        navSub: "Discovery and Acquisition of Location Information & Listings",
        btnThemeDark: "🌙 Dark",
        btnThemeLight: "☀️ Light",
        btnLang: "🌐 العربية",
        btnLaunch: "🚀 Launch instructions",
        heroBadge: "⚡ Open-Source Chrome Extension | Version 2.2.0",
        heroTitle: "DALIL — Spatial Place Discovery, Verification & GIS Export",
        heroSubtitle: "Open-source Chrome extension for grid-based place discovery, coordinate verification, smart deduplication, and permitted export to ArcGIS, QGIS and Excel.",
        btnHeroLaunch: "🚀 Run the extension",
        btnHeroWorkflow: "🔄 Explore 4-Stage Architecture",
        statSectors: "Strategic Sectors",
        statBranches: "Specialized Branches",
        statLeaves: "Approved Spatial Categories",
        statCoords: "Absolute Priority for Numeric X & Y",
        wfTitle: "🔄 DALIL 4-Stage Architecture & Data Lifecycle",
        wfDesc: "Define study area, harvest with camera/viewport verification, ensure spatial deduplication, then export with provenance.",
        step1Title: "1. Map Platforms",
        step1Desc: "Import polygon boundaries from KML, KMZ, Shapefile or GeoJSON, or draw the study area on an attributed basemap.",
        step2Title: "2. Search & Discovery",
        step2Desc: "31 sectors and 940 categories covering published Google Places types, alongside verbatim multi-lingual free-text queries.",
        step3Title: "3. Data Structuring & X/Y",
        step3Desc: "Preserve field and coordinate provenance, assign geometric owner cells via O(N) spatial hashing, and prioritize in-cell venues.",
        step4Title: "4. GIS & BI Export",
        step4Desc: "Export XLSX, CSV, GeoJSON, JSON, KML, KMZ and Shapefile for reusable records, with UTF-8 BOM and local symbols.",
        featTitle: "🌟 Advanced Spatial Engineering for GIS Professionals",
        featDesc: "Every capability in DALIL is built for geospatial analysts, cartographers, and business intelligence teams.",
        f1Title: "Mesh Engine & Boundary Clipping",
        f1Desc: "Configurable grids exclude nonintersecting cells and verify points against the study polygon and its holes.",
        f2Title: "Multilingual Query Engine",
        f2Desc: "Search language operates independently from the UI language, supporting free-text queries in any language with local colored symbols.",
        f3Title: "Spatial Hash O(N) Deduplication",
        f3Desc: "High-speed spatial hashing merges identical venues while protecting adjacent distinct brands from false deduplication.",
        f4Title: "Explicit Viewport & Diagnostics",
        f4Desc: "Adaptive viewport zoom calculation guarantees full cell coverage, with explicit diagnostics explaining zero-result states.",
        f5Title: "Direct Multi-Tab GIS Export",
        f5Desc: "Clean Excel spreadsheets with dedicated tabs per category, placing pure numeric X and Y coordinates front and center.",
        f6Title: "Bilingual & Dual-Theme UI",
        f6Desc: "Complete dark and light mode themes with adaptive logo switching, plus instant Arabic/English localization.",
        instTitle: "🚀 How to Install & Launch on Google Chrome",
        instSubtitle: "Load the extension directory containing its manifest.json file.",
        in1Title: "Open Extensions Manager",
        in1Desc: "Navigate to chrome://extensions in Chrome and toggle Developer mode on in the top-right corner.",
        in2Title: "Load Unpacked Extension",
        in2Desc: "Click 'Load unpacked' and select the inner DALIL Chrome Extension directory.",
        in3Title: "Launch & Explore",
        in3Desc: "Pin DALIL to the toolbar and click its icon to open the dashboard.",
        linkDash: "Dashboard",
        linkWf: "Workflow"
      }
    };

    let curLang = "ar";
    let curTheme = "dark";

    function updateLanguage(lang) {
      curLang = lang;
      document.title = lang === "en" ? "DALIL | Spatial discovery" : "دليل | اكتشاف البيانات المكانية";
      document.documentElement.lang = lang;
      document.documentElement.dir = (lang === "ar") ? "rtl" : "ltr";

      const t = I18N[lang];
      document.getElementById("navBrandTitle").textContent = t.navTitle;
      document.getElementById("navBrandSub").textContent = t.navSub;
      document.getElementById("btnSiteLang").textContent = t.btnLang;
      document.getElementById("btnNavLaunch").textContent = t.btnLaunch;
      document.getElementById("heroBadge").textContent = t.heroBadge;
      document.getElementById("heroTitle").textContent = t.heroTitle;
      document.getElementById("heroSubtitle").textContent = t.heroSubtitle;
      document.getElementById("btnHeroLaunch").textContent = t.btnHeroLaunch;
      document.getElementById("btnHeroWorkflow").textContent = t.btnHeroWorkflow;
      document.getElementById("statSectorsLbl").textContent = t.statSectors;
      document.getElementById("statBranchesLbl").textContent = t.statBranches;
      document.getElementById("statLeavesLbl").textContent = t.statLeaves;
      document.getElementById("statCoordsLbl").textContent = t.statCoords;
      document.getElementById("wfTitle").textContent = t.wfTitle;
      document.getElementById("wfDesc").textContent = t.wfDesc;
      document.getElementById("step1Title").textContent = t.step1Title;
      document.getElementById("step1Desc").textContent = t.step1Desc;
      document.getElementById("step2Title").textContent = t.step2Title;
      document.getElementById("step2Desc").textContent = t.step2Desc;
      document.getElementById("step3Title").textContent = t.step3Title;
      document.getElementById("step3Desc").textContent = t.step3Desc;
      document.getElementById("step4Title").textContent = t.step4Title;
      document.getElementById("step4Desc").textContent = t.step4Desc;
      document.getElementById("featTitle").textContent = t.featTitle;
      document.getElementById("featDesc").textContent = t.featDesc;
      document.getElementById("f1Title").textContent = t.f1Title;
      document.getElementById("f1Desc").textContent = t.f1Desc;
      document.getElementById("f2Title").textContent = t.f2Title;
      document.getElementById("f2Desc").textContent = t.f2Desc;
      document.getElementById("f3Title").textContent = t.f3Title;
      document.getElementById("f3Desc").textContent = t.f3Desc;
      document.getElementById("f4Title").textContent = t.f4Title;
      document.getElementById("f4Desc").textContent = t.f4Desc;
      document.getElementById("f5Title").textContent = t.f5Title;
      document.getElementById("f5Desc").textContent = t.f5Desc;
      document.getElementById("f6Title").textContent = t.f6Title;
      document.getElementById("f6Desc").textContent = t.f6Desc;
      document.getElementById("instTitle").textContent = t.instTitle;
      document.getElementById("instSubtitle").textContent = t.instSubtitle;
      document.getElementById("in1Title").textContent = t.in1Title;
      document.getElementById("in1Desc").textContent = t.in1Desc;
      document.getElementById("in2Title").textContent = t.in2Title;
      document.getElementById("in2Desc").textContent = t.in2Desc;
      document.getElementById("in3Title").textContent = t.in3Title;
      document.getElementById("in3Desc").textContent = t.in3Desc;
      document.getElementById("footTitle").textContent = (lang === "ar") ? "دَلِيل" : "DALIL";
      document.getElementById("footSubtitle").textContent = t.navSub;
      document.getElementById("linkDash").textContent = t.linkDash;
      document.getElementById("linkWf").textContent = t.linkWf;

      const btnTheme = document.getElementById("btnSiteTheme");
      btnTheme.textContent = (curTheme === "dark") ? t.btnThemeLight : t.btnThemeDark;
    }

    function updateTheme(theme) {
      curTheme = theme;
      document.documentElement.setAttribute("data-theme", theme);
      
      const siteLogo = document.getElementById("siteLogo");
      const footerLogo = document.getElementById("footerLogo");
      // في الواجهة الداكنة اللوجو الفاتح وفي الفاتحة اللوجو الداكن
      const logoSrc = (theme === "dark") ? "DALIL Chrome Exstension/assets/dalil_logo_light.png" : "DALIL Chrome Exstension/assets/dalil_logo_dark.png";
      if (siteLogo) siteLogo.src = logoSrc;
      if (footerLogo) footerLogo.src = logoSrc;

      const t = I18N[curLang];
      const btnTheme = document.getElementById("btnSiteTheme");
      btnTheme.textContent = (theme === "dark") ? t.btnThemeLight : t.btnThemeDark;
    }

    document.getElementById("btnSiteLang").addEventListener("click", () => {
      updateLanguage(curLang === "ar" ? "en" : "ar");
    });

    document.getElementById("btnSiteTheme").addEventListener("click", () => {
      updateTheme(curTheme === "dark" ? "light" : "dark");
    });
updateLanguage("ar");

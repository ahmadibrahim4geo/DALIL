# DALIL — تدقيق النسخة الحالية وملامح إعادة الهيكلة والتطوير

**تاريخ التدقيق:** 13 نوفمبر 2026  
**الإصدار الموجود داخل الحزمة:** `2.0.0` (Manifest V3)  
**المصدر المفحوص:** الملف المرفوع في المحادثة `DALIL Chrome Exstension(2).zip`  
**بصمة SHA-256 للحزمة:** `666c6681053e801019ab9fd1739736108ff2ae04c57d2610740b8865f8ad1cb3`  
**المجلد الجذري داخل ZIP:** `DALIL Chrome Exstension/`  
**المسار المحلي أثناء التدقيق:** `/mnt/data/dalil_audit_source/DALIL Chrome Exstension/` (مسار جلسة فحص مؤقت، لا يُفترض وجوده في جلسة/جهاز لاحق).  
**المستودع المُشار إليه في `package.json`:** `https://github.com/ahmadibrahim4geo/DALIL`؛ النسخة المرفوعة هي مرجع الفحص الفعلي، ولا يجوز افتراض تطابقها مع أي نسخة حالية أو لاحقة على GitHub.  
**حالة الوثيقة:** مراجعة فنية أولية مستندة إلى **قراءة الكود واختبارات Node المحلية**؛ ليست شهادة بسلامة الاستخراج الحي من خرائط Google أو اكتمال التغطية العالمية، ولم تُجر تعديلات على أصل الإضافة.

---

## 1. هدف DALIL ومن نخدمهم

DALIL (دليل) إضافة متصفح مفتوحة المصدر، عربية **افتراضيًا** مع واجهة إنجليزية منفصلة تمامًا، تهدف إلى مساعدة دارسي GIS والباحثين والمخططين وأصحاب الأعمال على **اكتشاف أنواع الأماكن وتصنيفها واستعراض بياناتها المكانية والجدولية المسموح باستخدامها**. تستخدم حدود دراسة مستوردة أو مرسومة، تنشئ شبكة خلايا قابلة للضبط، وتجمع وتحلل ما يتاح من بيانات من مصادر متوافقة مع شروط الاستخدام ثم تصدرها في صيغ GIS وExcel.

- **جوجل مرجع تصنيفي ومصدر بحث أساسي** وفق ما تسمح به خدماتها وتراخيصها؛ مع موصلات لمصادر أخرى، ولا نفترض أن جميع بيانات Google Maps قابلة للتنزيل الجماعي أو إعادة النشر أو التصدير.
- الهدف **جميع الدول والمناطق واللغات ذات الصلة**، مع معالجة اختلاف التغطية والخدمات والقيود حسب البلد ومصدر البيانات؛ لا وعود كاذبة بتغطية 100% لكل ظاهرة.
- **الواجهة العربية** لا تخلط نصوص UI الإنجليزية؛ **الواجهة الإنجليزية** لا تُظهر نصوص UI العربية. يُستثنى اسم علم أصلي أو قيمة من مصدر غير مترجمة، مع بيان أنها قيمة بيانات وليست نص واجهة.
- التصنيفات الرسمية والمعرّفات والصفات والمرادفات **مفاهيم منفصلة**؛ لا يُعامل المفرد والجمع والاسم المحلي كفئات متباينة دون دليل.
- الحفاظ على **خصوصية المستخدم**، وجودة الإحداثيات، والتوثيق المصدرّي، وإخراج مخرجات تصلح للتحليل في ArcGIS/QGIS.

## 2. جرد فعلي للمشروع

| المكوّن | المسار الحالي | ما وجدناه |
|---|---|---|
| تعريف الإضافة | `manifest.json` | MV3، صلاحيات storage/tabs/scripting، content script على صفحات Google Maps/Search، وworker. |
| حالة المهام والجدولة | `background/background.js` | دورة query-first عبر الخلايا، حالات المهمة ونتائجها، التبويب العامل، حفظ في `chrome.storage.local`. |
| إعداد الشبكات الجاهزة | `background/grid-presets.js` | شبكات وpresets ومنها مصر. |
| استخراج Google DOM | `content/content.js` | قراءة بطاقات النتائج وبعض صفحة المكان المنفردة، تمرير feed، تحليل روابط الإحداثيات والتقييمات والهاتف والموقع الإلكتروني. |
| واجهة التحكم | `dashboard/dashboard.html`, `.css`, `.js` | Leaflet، شجرة الفئات، الخريطة، الرسم المستطيلي، الاستيراد، الشبكة، النتائج، أزرار التصدير والتعريب. |
| المحرك المكاني | `lib/spatial-utils.js` | KML/KMZ/GeoJSON/Shapefile import، شبكة وتداخل وحدود، فحص نقطة داخل مضلع، ملكية خلية، إزالة تكرارات. |
| محرك الفئات | `lib/taxonomy-engine.js` | **31 قطاعًا، 114 فرعًا، 940 إدخال فئة**، وعلاقات عربية/إنجليزية جزئية، وتعيين أنماط. |
| العلامات التجارية | `lib/smart-brands.js` | قاموس محدود لأسماء علامات تجارية. |
| التصدير | `lib/export-utils.js` | KML/KMZ/XLSX/GeoJSON/JSON/CSV موجودة؛ لا يوجد تصدير Shapefile أو GPKG فعلي. |
| المكتبات المحلية | `lib/leaflet.js`, `lib/xlsx.full.min.js` | موجودة داخل الحزمة؛ يلزم توثيق نسخها وتراخيصها ومصدرها. |
| About | قسم `view-about` في `dashboard/dashboard.html` | يحتوي نصوصًا ثابتة بالعربية وبعض ادعاءات تسويقية غير متحقَّق منها، وبيانات تطوير تحتاج مطابقة للبروفايل. |
| الاختبارات | `test/*.js` | اختبارات ثابتة ومحاكاة للعناصر والمنطق وحالة المهام؛ لا توجد أدلة ضمن الحزمة على E2E حي متعدد المتصفحات والبلدان. |

### ما تم تشغيله

- `npm test`: **نجح — exit 0**: 11 اختبارات أساسية، 5 للشبكة، 6 للتصدير، فحص 126 معرف DOM، وفحص تهيئة لوحة التحكم، و**30/30** سيناريو تدقيق مبرمج.
- `node test/test_extraction_fix.js`: **نجح — exit 0**.
- `node test/test_scraper_backend.js`: **نجح — exit 0**.
- هذه اختبارات **محلية** وليست إثباتًا أن Google Maps أعادت نتائج صحيحة في تجربة حية أو أن جميع الحقول واللغات متوفرة عالميًا.

## 3. نتائج التدقيق — فجوات موثقة في الكود

التصنيف: **P0 = يمنع موثوقية المنتج/سلامة النتائج، P1 = جودة أساسية، P2 = توسعة وتحسين**.

| الأولوية | النتيجة المدعومة بالكود | الملف/الدالة | أثرها وخطوة الإصلاح |
|---|---|---|---|
| **P0** | رابط البحث يبني `/maps/search/{query}/@{centerLat},{centerLng},{zoom}z?hl=ar`؛ **مركز وزوم** وليس قيدًا صلبًا لحدود الخلية، ويثبت لغة جوجل بالعربية. | `background/background.js` → `buildMapsSearchUrl` | لا يجوز اعتبار نتائج الخلية محصورة بمجرد انتقال الكاميرا. أعِد تصميم adapter البحث، وتحقق من حدود النتائج الفعلية، ولا تخلط لغة الواجهة بلغة الاستعلام. |
| **P0** | الـcontent script يختبر **منطقة الدراسة العامة أولًا**، وليس حدود **الخلية الحالية** طالما `studyAreaBounds` موجودة؛ وعند غياب `SpatialUtils` في content context يلجأ إلى BBox. | `content/content.js` → `isPlaceInStudyOrCell`؛ `manifest.json` | تخصيص خلية مالكة لاحقًا لا يثبت أن كل خلية بُحثت بدقة. افصل *اكتشاف المكان* عن *مكان وقوعه* و*خلية إسناده*، وسجّل الحالات غير المحسومة. |
| **P0** | يواصل استخراج الصفحة حتى لو انتهت `navigateTabAndWait` إلى `false`؛ لا يتم التحقق من نجاح الانتقال قبل إرسال `SCRAPE_PAGE`. | `background/background.js` → `processQueue`, `navigateTabAndWait` | احتمال نتائج قديمة من الخلية السابقة أو تصنيف نتائج خطأ. اعتماد handshake يتضمن `jobId`, `cellId`, `queryId`, URL/نطاق محقق، وحالة load، وإلغاء المعالجة عند إخفاقه. |
| **P0** | `CLEAR_RESULTS` يصفر حالة الخلفية، لكن `clearUploadedArea` و`clearDrawnRectangle` لا يحذفان دائمًا `savedStudyArea` و`savedCells`، ولا يزامنان كل حالات الخلفية؛ يمكن لـ`restore` إرجاع العمل. | `dashboard/dashboard.js` → `clearUploadedArea`, `clearDrawnRectangle`, `restore...`, `generateGridForCurrentStudyArea`؛ `background/background.js` → `resetScraper` | اعتماد controller واحد وعمليات ذرية `REMOVE_IMPORTED`, `REMOVE_DRAWING`, `CLEAR_GRID`, `CLEAR_RESULTS`, `RESET_WORKSPACE`؛ اختبار إعادة الفتح بعد كل حذف. |
| **P0** | محلّل GeoJSON يحتفظ بـ`multiPolygon` و`holes`، لكن `handleStudyAreaFile` يحفظ `polygon: parsed.coordinates` فقط؛ KML importer يختار أول مضلع في `coordinates` ولا يحفظ علاقات الحلقات الداخلية بثقة. | `lib/spatial-utils.js` → `parseGeoJSON`, `parseKML`؛ `dashboard/dashboard.js` → `handleStudyAreaFile` | حفظ Geometry كاملة (MultiPolygon + holes + CRS وmetadata) دون تسطيح، واختبار المناطق المتقطعة والبحيرات/الثقوب. |
| **P0** | `content/content.js` يسمح بمرور سجلات من دون إحداثيات ضمن سجل التدقيق؛ إن كانت القائمة بلا نتائج/لم يظهر feed قد تُسجل خلية `confirmed_empty` مع أن السبب مهلة أو تغيّر DOM. | `content/content.js` → `scrapeGoogleMaps`, `isPlaceInStudyOrCell`, `hasExplicitNoResults`; background status | فرّق بين `verified_empty`, `unknown`, `partial`, `capped`, `error`؛ لا تعلن فراغًا مؤكدًا إلا بإشارة موثوقة. لا تُعامل سجلًا بلا X/Y كنقطة GIS. |
| **P0** | `STOP` و`PAUSE` يغيّران حالة المهمة دون آلية إلغاء كاملة للتنفيذ الجاري؛ بعد انتظار Promise قد تتراكم استجابات قديمة. | `background/background.js` → handlers و`processQueue` | Cancellation/epoch token واختبار انقطاع المهمة عند كل مرحلة؛ منع أي نتائج من مهمة ملغاة من الدخول في الحالة الحالية. |
| **P0** | رغم وجود dedup متقدم في `ExportUtils`، بحث الخلفية عن المطابقة داخل `results` يتم بـ`findIndex` خطي **لكل سجل**؛ يمكن أن يتدهور مع عشرات الآلاف. | `background/background.js` → `processQueue` dedup loop | فهارس بالهوية وspatial buckets، مع الحفاظ على الفروع المختلفة وسجل مصادر الاكتشاف، وقياس الأداء الفعلي. |
| **P0** | شجرة الفئات **منشأة داخليًا**؛ ليست نسخًا موثقة من GCID/Google Places Types. من 940 إدخالًا وجدت **918 تسمية عربية فريدة** و**22 تسمية مكررة حرفيًا بين الفروع**. بها أسماء مرادفة وأوصاف مثل `جامع` و`مسجد كبير` و`مسجد تاريخي`. | `lib/taxonomy-engine.js` → `DALIL_SECTORS`, `leafObjects` | نقل البيانات إلى Registry بمعرّفات ثابتة رسمية/داخلية، فصل alias/type/attribute، وإلغاء ازدواج المضمون مع الاحتفاظ بالتغطية. لا تُعرض كل ورقة بوصفها فئة رسمية لجوجل. |
| **P0** | تبديل الواجهة للإنجليزية لا يعزل اللغة: أوراق الشجرة `br.leaves` عربية دائمًا، وتُعرض تسمية القطاع والفرع باللغة **المعاكسة** بجوار الاسم؛ محتوى About وأوصاف KML ورسائل كثيرة ثابتة بالعربية. | `dashboard/dashboard.js` → `renderTaxonomyTree`, `applyLanguage`; `dashboard/dashboard.html`; `content/content.js`; `lib/export-utils.js` | تحويل كل الرسائل وعناوين الحقول والنصوص إلى قواميس منفصلة، وإظهار leaves بلغتها المختارة؛ عربي افتراضي/إنجليزي نظيف، مع احترام أسماء الأماكن الأصلية. |
| **P1** | KMZ الحالي يضغط **`doc.kml` فقط**؛ الـKML يستعمل `https://maps.google.com/mapfiles/kml/shapes/*.png` الخارجية؛ لا يضم رموزًا محلية. | `lib/export-utils.js` → `generateKmlString`, `exportToKmz` | Icons مُرخّصة محلية وتعبئتها داخل `icons/` بملف KMZ، مع `href` نسبي ونسخة KML + icons عند الطلب. اختبر Google Earth دون شبكة. |
| **P1** | الرموز تعيّن غالبًا لقطاعات وأسلوب regex، والخريطة تستخدم Emoji في `L.divIcon`، لا symbol ID مستقل مُراجَع لكل تصنيف. | `lib/taxonomy-engine.js` → `resolveCategoryStyle`; `dashboard/dashboard.js` → `renderMapMarkers` | `symbol_id` ثابت لكل فئة، تدقيق تعارض بصري، SVG موحد مع fallback واضح، ورموز KML/PNG مصدّرة مستقلة. |
| **P1** | بالفعل يوجد XLSX/JSON/GeoJSON/KML/KMZ/CSV، لكن **لا يوجد** كود تصدير Shapefile أو GeoPackage. وExcel وتفاصيل KML بأسماء حقول عربية ثابتة. | `lib/export-utils.js`, `dashboard/dashboard.js` → export buttons | `SHP` مع SHP/SHX/DBF/PRJ/CPG مضغوطة، و`GPKG` قدر الإمكان، وXLSX محترم ثنائي اللغة، وmetadata وprovenance وحالات جودة البيانات. |
| **P1** | استخراج البيانات من قائمة نتائج Google DOM يسجل بعض الاسم والعنوان والهاتف والموقع والتقييم/المراجعات/الساعات والصفات نصيًا؛ **لا يوجد schema عام للحقول حسب الفئة، ولا استخراج بريد إلكتروني مباشر موثوق**. | `content/content.js` → `checkSinglePlace`, `extractPlacesFromFeed`; `lib/export-utils.js` | `PlaceRecord` أساسي + `attributes` مرنة مترابطة بالمصدر، قيمة/نوع/وحدة/ثقة/لغة/وقت؛ الإيميل فقط من مصادر تسمح به، ولا يختلق القيم الناقصة. |
| **P1** | **المصدر التشغيلي للاستخراج هو Google Maps DOM**، وOSM/Esri يظهران في الواجهة أساسًا كطبقات خرائط؛ لا يوجد Adapter حقيقي لـOSM Overpass أو مصادر POI أخرى في ملفات التشغيل المفحوصة. | `manifest.json`, `background/background.js`, `content/content.js`, `dashboard/dashboard.js` | بناء `SourceAdapter` منفصل لكل مزود من البداية، مع الحقوق والتغطية وسلوك البحث والاستعلام. لا تصف OSM بأنه مصدر بيانات مستخرج حاليًا. |
| **P1** | توثيق README يذكر رسم مضلع حر، بينما واجهة الرسم المفحوصة تدعم المستطيل؛ توجد ادعاءات `100%` و`Pro Edition` في About وREADME لا يدعمها تدقيق حي. | `README.md`, `dashboard/dashboard.html`, `dashboard/dashboard.js` | مزامنة الوصف مع القدرات المنفذة فعلاً؛ وتوفير رسم Polygon وEdit/Delete/Undo إن كان مطلوبًا. |
| **P1** | الحزمة تصرح MIT في `package.json` وREADME لكن **لم أجد ملف LICENSE مستقلًا** في ZIP. | `package.json`, `README.md`, جرد ZIP | تضمين نص الترخيص عند الاعتماد، وفهرس تراخيص المكونات التابعة؛ لا تغيّر حقوق المطور دون موافقة. |
| **P2** | تكرار ملفات بصرية كبيرة تحت `assets/` و`icons/`، مع كتلة JS/CSS ولوحة كبيرة أحادية نسبيًا. | `assets/`, `icons/`, `dashboard/dashboard.js`, `.css` | إزالة نسخ متطابقة **بعد** التحقق من مسارات الربط، وتقسيم منطق الواجهة إلى وحدات قابلة للاختبار، وتحسين زمن التحميل. |

**ملاحظة مهمة في التقييم:** بعض اختبارات المشروع تتحقق من حالات متوقعة بمُحاكاة محدودة، لكنها لا تثبت خصائص المصدر الحقيقي ولا اكتمال كل النطاق المكاني. يُمنع استخدام «100% Coverage» أو «كل الأماكن» إلا بوصفه **نسبة تنفيذ الخلايا المُجدولة** وليس اكتمال قاعدة بيانات الأماكن.

## 4. البنية المقترحة بعد إعادة الهيكلة — مع الحفاظ على الموجود

```text
DALIL Extension (MV3)
├── app/i18n/                  ar.json, en.json, optional locales
├── app/ui/                    panels, workspace, taxonomy picker, map, about
├── core/category-registry/    concepts, aliases, translations, google mappings, locales
├── core/search-planner/       selected types -> per-provider plan
├── core/study-area/           geometry, import, edit, CRS, version, undo
├── core/grid/                 cells, ownership, coverage, status & adaptive split
├── core/jobs/                 MV3-resilient queue, checkpoints, cancellation
├── core/records/              normalized PlaceRecord + extra attributes + dedup
├── core/sources/              adapters + provider capabilities + licensing
├── core/ai/                   local terminology ranking, ambiguity, entity matching
├── core/symbology/            icon registry, SVG, PNG, KMZ packager
├── core/export/               xlsx, csv, geojson, json, kml, kmz, shp, gpkg
├── assets/                     approved third-party resources with attribution
├── test/                       unit, integration, fixtures, E2E, performance
└── docs/                       provenance, architecture, licenses, support, changelog
```

هذه **خريطة إعادة تنظيم منطقية**؛ لا يُطلب نسخ المجلدات أعلاه حرفيًا قبل أن يراجع الإيجنت الارتباطات الحالية ويضع خطة ترحيل دون كسر المستعمل. إبدأ بإضافة طبقات abstraction حول `background`, `content`, `dashboard`, `spatial-utils`, `taxonomy-engine`, `export-utils` ثم انقل الوظائف تدريجيًا.

### واجهات بيانات داخلية مستهدفة

- `StudyArea`: `id`, `geometry` (Polygon/MultiPolygon مع holes), `bbox`, `crs`, `source`, `active`, `version`.
- `GridCell`: `cellId`, `geometry`, `searchExtent`, `ownerExtent`, `row`, `col`, `statusByQuery`, `coverageEvidence`.
- `SearchTask`: `jobId`, `queryId`, `categoryId`, `provider`, `cellId`, `locale`, `attempt`, `checkpoint`, `status`, `error`.
- `Category`: `canonicalId`, `groupId`, `parentId`, `googleGcid`, `googlePlaceType`, `labels[locale]`, `aliases[locale][country]`, `osmTags`, `attributeSchema`, `symbolId`, `supportedProviders`.
- `PlaceRecord`: `internalId`, `providerIds`, `names`, `categoryIds`, `geometry`, `coordinateConfidence`, `contact`, `ratings`, `attributes[]`, `provenance[]`, `discoveries[]`, `qualityFlags[]`, `lastUpdated`.
- `ExportProfile`: `format`, `language`, `coordinateSystem`, `attributes`, `folders`, `symbols`, `licensePolicy`, `metadata`.

## 5. الخطوات الأساسية الوظيفية بعد إعادة الهيكلة

### A. التسلسل المكاني

1. اختيار منطقة الدراسة من ملف **KML/KMZ/GeoJSON/Shapefile** أو رسم مستطيل/Polygon يدوي؛ إظهار حدودها كاملة بما في ذلك الأجزاء المنفصلة والثقوب.
2. معاينة/تحرير حدود المنطقة، واختيار النطاق النشط بوضوح إذا اجتمع المستورد والمرسوم؛ دعم `Undo` و`Clear imported`, `Clear drawing`, `Clear grid`, `Clear results`, `Reset everything`.
3. توليد شبكة صفوف×أعمدة يدوية أو عدد خلايا مستهدف أو حجم خلية بالمتر/الكيلومتر؛ دعم خلية قص/تقاطع مكاني حقيقي لا مجرد BBox مخادع؛ تتبع الشبكة الموقَّعة `version`.
4. قبل كل استعلام: تأكيد `jobId+queryId+cellId+source+areaVersion` وأن مصدر البحث انتقل فعليًا إلى نطاق الخلية الحالية. إعادة المحاولة المنضبطة أو تصنيف error بدل تسجيل بيانات قديمة.
5. مع كل نتيجة ذات geometry موثوقة: اختبر **داخل منطقة الدراسة**، ثم حدِّد خلية ملكية وحيدة deterministic (مع التداخل)، وسجّل خلية الاكتشاف الأصلية؛ ميّز ما خرج من الخلية لكنه داخل الدراسة، ولا تضفه خطأ لعدد نتائج تلك الخلية.
6. بدون إحداثيات مؤكدة: سجل مراجعة غير مكاني (pending) منفصل، لا يتحول إلى نقطة اصطناعية أو مخرجات GIS.
7. كل خلية×استعلام لها حالة `pending/running/complete/partial/unknown/error/blocked/cancelled`، وعدد نتائج فريد، وأدلة نجاح وإخفاق؛ لا تعتبر النتيجة الصفرية دليلًا على عدم وجود أماكن.
8. بث تحديثات مرئية للخلية الحالية والخريطة والجدول والحالة، وربط zoom/pan تلقائي اختياري، دون جعل تحريك الخريطة واجهةً شرطيةً لإنجاح البحث.
9. في حالات كثافة عالية لدى مصادر تسمح بالتقسيم: **تقسيم تكيفي للخلايا**، مع تسجيل لماذا انقسمت وما حدود التغطية؛ لا تستخدمه لتجاوز قيود أو حظر المصدر.

### B. دورة حياة المهام والأداء

- إدارة صف مهام durable/checkpointed يناسب **Manifest V3**؛ لا تعتمد فقط على `setTimeout` وPort keepalive للحفاظ على worker إلى ما لا نهاية. استرجاع آمن مع التمييز بين توقف المتصفح/المهمة/المصدر.
- فهرس للمكررات: by provider+placeId، by normalized name+location، spatial index + conservative thresholds؛ يحتفظ بالفروع المختلفة وبالصفوف متعددة المصادر.
- إلغاء صحيح يوقف إدخال أي نتائج قديمة، مع token لكل مهمة ولكل مرحلة وانتقالات atomically؛ التأكد من توقف تبويب العمل أو فصل محتواه.
- تدرج التحميل: لا تُرسل `results` كاملة كل ثانية في تحديثات status؛ استخدم صفحات ورسائل delta أو تخزين IndexedDB، مع batch writes ومعالجة 10k/50k/100k كاختبارات أداء مستهدفة لا كادعاء مسبق.
- عند رفض الخدمة/معدل الطلبات: توثيق السبب، احترام `Retry-After` إن وجد، backoff محدود، توقف شفاف، ودعم مزود بديل مرخص. **لا تعتمد تبديل IP أو تدوير proxies لتجاوز حظر Google أو CAPTCHA.**

### C. المستودع العالمي للفئات — Google-first لكن غير تابع لواجهة لغة واحدة

- المصدر الرسمي الأهم **Google Places API Place Types (New)** مع تمييز أنواع Table A القابلة للفلترة وTable B الإضافية: https://developers.google.com/maps/documentation/places/web-service/place-types
- تصنيفات **Google Business Profile Categories** تختلف باختلاف البلد واللغة، ولا تتطابق واحدًا لواحد مع Place Types أو شجرة فروع Google Maps؛ استخدام مرجع GCID بعد التحقق من مصدره وحداثته: https://developers.google.com/my-business/reference/businessinformation/rest/v1/categories/list
- الاستفادة من القائمة المجتمعية `lobstrio/google-business-categories` كمرجع **استرشادي** لا بديل رسمي أو مصدرًا يحوّل كل اسم إلى Google Places type: https://github.com/lobstrio/google-business-categories
- مرجع دلالي إضافي من OSM Tagging Schema: https://github.com/openstreetmap/id-tagging-schema ؛ ولكل category ربط tags حيث تسمح دلالاتها.
- النظام يحفظ **النوع canonical** و**الاسم المعروض** و**المرادفات المحلية** و**نوع العلاقة** و**الصفات/الخصائص** منفصلة؛ لا يصبح «مساجد» فئة ثانية غير «مسجد»، ولا «مسجد قديم» فئة Google إلا إن ثبت ذلك.
- البحث يدعم عالمية الأسماء واللغات (Arabic, English, French, Hindi, Chinese, Japanese, Spanish, Portuguese وغيرها)، مع اسم المكان الأصلي محفوظًا كما هو، والترجمة حسب توفر مصدر معتمد أو ترجمة موسومة بالثقة.
- لا يفرض تصنيفًا لبلد لا تدعمه فئات المزود؛ يعرض Availability/Mappings وfallback وreason، ويحتفظ بالبحث الحر.
- أداة فحص آلية: أسماء مكررة، IDs متضاربة، alias مكرر بين معانٍ مختلفة، غياب ترجمة، فئة بلا مصدر قابل للبحث، فئة بلا رمز، فئة بلا اختبار.
- القسم الرئيسي/الفرعي تنظيمي داخلي لـDALIL عندما لا يوفره المصدر بهذه الصيغة؛ لا يُقدّم كشجرة Google رسمية.

### D. الذكاء الاصطناعي المحلي الخفيف

- المرحلة 1 **قواعد حتمية**: exact ID/label، Unicode normalization، plurals، transliteration، aliases محلية ومرادفات حسب البلد.
- المرحلة 2 **مطابقة احتمالية**: RapidFuzz أو ما يعادله لتصحيح أخطاء الكتابة، مع candidate ranking ومؤشرات ثقة.
- المرحلة 3 **نموذج دلالي متعدد اللغات صغير اختياري** محلي في المتصفح (مثلاً Transformers.js بعد تقييم الحجم وسياسات MV3)، فقط إذا تعذرت المرحلتان السابقتان؛ لا يُحمّل نموذج كبير إلزاميًا.
- المرحلة 4 **مراجعة بشرية للحالات الغامضة**: مثال «زاوية» له معنى مكاني/ديني يختلف حسب البلد؛ يعرض احتمالين بدلاً من اختيار خاطئ واثق.
- الذكاء الاصطناعي **لا** يقرر من تلقاء نفسه هل النقطة داخل Polygon؛ هذا GIS deterministic. ولا يختلق بريدًا أو هاتفًا أو تقييمًا، ولا يصنع سجلات جديدة.
- مراقبة زمن الاستجابة وذاكرة الاستخدام ودقة التصنيف على عينات عالمية متوازنة؛ benchmark مع/بدون AI، ولا يرسل أسماء العملاء أو نتائجهم لخادم دون موافقة صريحة.

### E. GIS Symbol Library

- `symbolId` خاص لكل category، وتصنيف بصري عائلي واضح ورموز ذات تمييز مفيد حتى على مقاييس صغيرة، مع SVG vector وPNG fallback وأسماء ملفات ASCII مستقرة.
- المرشحون الأوليون: https://github.com/mapbox/maki وhttps://github.com/rapideditor/temaki، ومكتبات GIS المفتوحة مع التحقق من جودة تغطية الظواهر وتراخيص الأصول.
- مراجعة مستودع المطور الشخصي https://github.com/ahmadibrahim4geo/GIS-Style-Collection للاستفادة من أساليب الترميز؛ لا تفترض قابلية استخدام كل ملف أو امتداد مباشرة داخل extension.
- إجراء اختبار تعارض بصري على كل تصنيف (التشابه المقبول داخل عائلة مقابل التشابه المضلل بين فئات بعيدة)، واختبار Light/Dark وGoogle Earth/QGIS/ArcGIS.
- عند التصدير: `styleUrl`, `IconStyle`, `LabelStyle`, اسم المكان داخل Placemark، `Folder` باسم الفئة في لغة التصدير، `ExtendedData` للحقول، **KMZ مع doc.kml وicons المحلية** وبمسارات نسبية، KML مع مجلد رموز مرافق حين يُحتاج.

### F. المصادر والبيانات والحقول

- واجهة `SourceAdapter` تسجّل: مصدر، التوثيق، ترخيص التخزين/التصدير، coverage by country، حدود/معدلات البحث، نوع المعرفات، لغة النتائج، الحقول المسموحة؛ **لا يُخلط Google Base Map أو OSM tile layer مع قاعدة POIs قابلة للاستخراج**.
- حقول عامة للمنشأة: الاسم بلغته الأصلية، الأسماء البديلة إن وجدت، التصنيف والـIDs، الإحداثيات وثقتها ونظامها، العنوان، الهاتف، الموقع، البريد العام إن سمح مصدر آخر بتوفيره، التقييم والعدد إن سمح المصدر، الحالة والمواعيد، التاريخ، بيانات التواصل وattributes وفق نوع المكان.
- Schema خصائص ديناميكي لأن بيانات مدرسة/مصنع/شركة/مستشفى مختلفة. يحافظ على الاسم الأصلي للمفتاح، display label باللغة المختارة، type/unit/provenance/lastSeen/confidence.
- Google Places ليس به **حقل email رسمي مباشر**؛ لا يعد الإيجنت باستخراجه من جوجل، ولا يستنتجه. البحث عن بريد علني من مصادر أخرى يخضع لشروطها وقواعد الخصوصية.
- ضبط المفاهيم `not provided` و`not applicable` و`unknown` و`withheld` بدل قيم فارغة ملتبسة.

### G. التصدير

- **XLSX** الأولوية: `Places` موحدة + أوراق فئات عند الطلب + `Metadata` + `Fields` + `Source Coverage` + `Errors/Unlocated`؛ فلاتر وتجميد رأس الجدول واتجاه RTL/LTR حسب اللغة وأرقام X,Y رقمية، دون خلط لغات العناوين.
- **KML**: عنصر باسم المكان، هيكل مجلدات قطاع/فئة، رموز محلية أو موثقة، اسم label غير منقطع، `ExtendedData`, UTF-8, إحداثيات longitude,latitude، وتجنب إدخال سجل بلا نقطة.
- **KMZ**: حزمة مضغوطة تتضمن `doc.kml` و`icons/**` (روابط نسبية) ويُختبر فتحها offline على Google Earth Pro.
- **GeoJSON/JSON**: معرّفات مصنفة وproperties وsource metadata، valid WGS84 وسلامة Unicode.
- **Shapefile**: ZIP تحوي `.shp`, `.shx`, `.dbf`, `.prj`, `.cpg` + جدول mapping لأسماء الحقول المقصوصة 10 أحرف والترميز؛ فضّل GeoPackage لحفظ أسماء حقول طويلة.
- **GeoPackage**: دعم مقترح بعد اختبار مكتبة JS/WASM مناسبة ومسموح استخدامها داخل MV3؛ لا تعلن الدعم قبل تطبيقه.
- دعم ملف لكل category أو ملف واحد بفولدرات، ودعم إخراج نتائج موثقة/غير مكتملة بشكل منفصل، ولا تصدّر بيانات غير مصرح بها من المصدر.

### H. التوافق والواجهة

- Manifest V3 وUI مستقل قابل للاختبار، Chrome/Edge/Brave/Opera/Vivaldi/Chromium حيث يدعم الإصدار تثبيت الإضافات يدويًا؛ Firefox مسار توافق مستقل (ليس وعدًا بنفس السلوك).
- العربية الافتراضية (`lang=ar`, `dir=rtl`)، والتبديل إلى English يبدل **كل** عناصر UI والرسائل والتحذيرات والتصنيفات وعناوين التصدير إلى الإنجليزية، مع عدم ترجمة أسماء الأماكن الأصلية دون طلب.
- `i18n` keys شاملة مع build-time lint يمنع غياب مفتاح/نص عربي hardcoded في واجهة إنجليزية؛ اختبارات snapshots عربية/إنجليزية وRTL/LTR.
- لوحات واضحة: تحديد نطاق، الفئات، إعداد الشبكة، المسح والحالة، النتائج/طبقات الخريطة، التصدير، About؛ تصميم غير مزدحم، sidebar ثابت، خريطة قابلة للتكبير وجدول قابل للتحجيم.
- إدارة طبقات: On/Off، Zoom To، Delete، Edit، Undo، `Reset workspace` واضح ومؤكد؛ حفظ مشروع اختياري بإجراء من المستخدم، وعدم إعادة عنصر حُذف عمدًا عند فتح الأداة.
- يمكن إضافة لغات واجهة أخرى مستقبلًا (FR/ES/PT/HI/JA/ZH...) دون ربطها بلغة البحث/أسماء POIs. لا تُعد بأن الواجهة مترجمة حاليًا لأي منها.

### I. About، الثقة، الدعم، والانفتاح

- أقسام: **عن DALIL، كيف تعمل، مصادر البيانات وإمكانية/حدود الاستخدام، المزايا الحقيقية، المطور، تراخيص المكونات، المساهمة والدعم/الأخطاء**.
- النصوص والمسمّيات تُقرأ فقط من البروفايل الرسمي أو مستودعات المطور المعتمدة، ولا تُنشأ شهادات/ألقاب/شركاء/جهات جديدة من تلقاء نفسها.
- بيانات مثبتة في `https://github.com/ahmadibrahim4geo/ahmadibrahim4geo` و`README.ar.md` وقت التدقيق: **أحمد إبراهيم / Ahmad Ibrahim**، أخصائي نظم معلومات جغرافية وشبكات تصريف الأمطار؛ البريد **ahmadibrahim.geo@gmail.com**؛ GitHub **ahmadibrahim4geo**؛ البورتفوليو **https://ahmadibrahim4geo.github.io/ahmadibrahim4geo/**.
- دعم مفتوح المصدر: GitHub Issues للمشاكل والاقتراحات، رابط بريد المطور لبحث التعاون والدعم، ورابط المساهمة وفق ملفات CONTRIBUTING/SECURITY بعد إعدادها.
- يُحذف الوصف التسويقي غير المدعوم من About (مثل ضمان 100%، والخصوصية المطلقة دون فحص، و«أقوى محرك»)، ويُستبدل بآلية تشغيل دقيقة وقيود واضحة.

## 6. نظام الإيجنت الخاص بالتطوير — اتفاق العمل

قبل بدء تعديل أي كود:

1. افتح **الملف المرفوع فعلاً** وتحقق من SHA-256 والإصدار؛ اطبع manifest/package وstructure، واحفظ baseline commit أو نسخة غير قابلة للتعديل. **لا تستبدل المصدر بكود افتراضي أو GitHub فارغ**.
2. أعد تشغيل جميع الاختبارات، واحفظ النتائج، وحدد API/web/DOM behaviors التي **لم** تختبر.
3. ابحث في **المستودعات الرسمية والمجتمعية** لكل وظيفة، وقارن 2–3 بدائل عند وجودها: الترخيص والتحديث والأمان والحجم والدعم متعدد اللغات وMV3 وطريقة التثبيت دون CDNs طرف ثالث.
4. أنشئ **Dependency & Asset Register** يحوي `name, repo URL, version/commit SHA, license, size, why chosen, supported browser, attribution, files vendored, tests`؛ **نزّل وضمّن** المكتبات/الأيقونات/النماذج التي تم قبولها بعد اختبار ترخيصها وملاءمتها، وليس مجرد روابط نظريّة.
5. امنع الحزم غير الآمنة أو المكتبات غير المرخصة أو تحميل JS بعيد عند التشغيل. وثّق build/reproducibility ومصدر كل مورد. لا تُنزّل كل شيء بالجملة؛ انتقِ الأصول ذات القيمة الحقيقية.
6. قارن DALIL **ببيانات قياس** مع أدوات مثل `QuickOSM`, `Overpass Turbo`، ومشروعات جمع POI مفتوحة المصدر حيث تدعم المقارنة؛ اعرض ما هو موجود/مفقود في الأداة، الأداء، دعم KML/grid/exports/aliases، حدود كل مصدر، وسهولة الاستخدام للمبتدئ والمتخصص.
7. نفّذ على مراحل صغيرة ومراجعات مستقلة، مع المحافظة على الميزات السليمة: import/export الحالية، Excel، Map UI، Smart dedup، tests، branding.
8. لا تُعدّل بيانات المطور أو شعاره أو وسائل التواصل أو اسم DALIL أو التوسيع الإنجليزي المعتمد بلا مرجع أو موافقة.
9. إن واجهت قيود مزوّد البيانات، وثّقها وأوقف/أجّل الاستعلام أو انتقل إلى مصادر تسمح بالتصدير؛ **لا تصمّم تدوير IP لتجاوز المنع أو CAPTCHA**.
10. عقب كل مرحلة: اختبارات + metrics + لقطات RTL/LTR + مصفوفة المتصفحات + مقارنة baseline + changelog. التقرير يوضح بصراحة ما لم يتم اختباره.

### مرشحات مكتبات/مستودعات أولية (للتقييم لا للاعتماد الأعمى)

| المجال | مصادر مرشحة | ماذا نحتاج اختباره |
|---|---|---|
| Google categories | Google Places Types، Google Business Profile Categories، `lobstrio/google-business-categories` | حداثة المصدر، GCID، البلد/اللغة، تعارض الأنواع، شروط الخدمة. |
| OSM taxonomy / POIs | `openstreetmap/id-tagging-schema`, `osmlab/name-suggestion-index`, Overpass API | وسوم الخصائص، البحث المرخص، الترجمات، متطلبات ODbL وخدمة الاستعلام. |
| GIS symbols | `mapbox/maki`, `rapideditor/temaki`, `ahmadibrahim4geo/GIS-Style-Collection` | رخصة SVG، التميّز البصري، غياب الرموز، PNG export، حجم الحزمة. |
| GIS geometry | Turf.js، أدوات GeoJSON وproj4 اختيارية | Polygon/MultiPolygon/holes/dateline/poles، الأداء، ترخيص/حجم الحزمة. |
| Excel / Archive / Shapefile | الموجود `xlsx.full.min.js` مع تدقيق ترخيصه، مكتبات ZIP/SHP مناسبة | حفظ الأسماء العربية، `.cpg`, `.prj`, الذاكرة، طبقات KMZ وGPKG. |
| البحث اللغوي | `RapidFuzz` أو بديل JavaScript مناسب | normalization متعدد اللغات، دقة السياق، حجم الإضافة. |
| AI محلي اختياري | `huggingface/transformers.js` ونموذج متعدد اللغات صغير مرخص | جودة العربية/الفرنسية/الهندية/اليابانية/الصينية، زمن التحميل، WASM/WebGPU، offline. |
| E2E & Browser | Playwright / Chromium test profiles | تثبيت unpacked، إعادة تشغيل worker، التنقل، مسح/استعادة، localization. |

## 7. مراحل التنفيذ وترتيب الأولوية

| المرحلة | الإنجاز الفعلي المطلوب | شرط النجاح قبل الانتقال |
|---|---|---|
| **0 — Baseline & Evidence** | تأكيد نسخة ZIP/المستودع، حفظ نسخة أصل، جرد APIs واللغات وDOM selectors والاختبارات، مصفوفة تراخيص. | نتيجة اختبارات قابلة للإعادة، قائمة أدلة المشاكل، لا كسر للموجود. |
| **1 — GIS State & Grid** | مصدر حقيقة واحد لمنطقة الدراسة، import geometry كامل، حذف واستعادة متسق، cell task handshake، spatial ownership وتغطية. | منطقة متعددة + holes، انتقال كل خلية فعلي، لا تسرب نتائج أو رسومات راجعة بعد الحذف. |
| **2 — MV3 Job Engine** | cancellation، durable checkpoints، indexed dedup، معالجة أخطاء ومدى الاكتمال، حفظ بكفاءة. | اختبارات انقطاع/إغلاق/فتح/وقف/استئناف دون تكرار أو فساد. |
| **3 — Taxonomy & i18n** | category registry Google-first، mappings رسمية، aliases محلية، ترجمة leaves وتصفية الفئات حسب الدولة، عزل العربية/الإنجليزية. | 0 تصنيفات وهمية مدعاة رسمية، عدم تكرار المفرد والجمع كفئتين، 0 نصوص UI من لغة أخرى بالاختبارات. |
| **4 — Data Sources & Attributes** | adapters، حقل ديناميكي، metadata وترخيص المصدر، جودة الإحداثيات، بدائل معتمدة. | لكل حقل مصدر ووحدة وثقة؛ تقارير تغطية؛ لا تصدير محظور. |
| **5 — Symbology & Exports** | symbol IDs، مكتبات SVG، KMZ محلي icons، XLSX احترافي، SHP/GeoPackage الممكن، GeoJSON/KML. | اختبارات round-trip Google Earth Pro/QGIS/ArcGIS، ملفات قابلة للنقل دون اختفاء الرموز. |
| **6 — Optional AI, UX & Benchmark** | محرك semantic fallback وتقييمه، مقارنة المنافسين، تحديث About، تحسين الخريطة والواجهتين. | metrics قابلة للمقارنة، demo عالمي، وثائق المطور صحيحة، بلا ادعاءات غير مثبتة. |

## 8. مصفوفة اختبار القبول الواقعية

- **Area/Grid**: القاهرة مستطيل، حدود محافظة غير محدبة، جزر منفصلة، Polygon بثقب، مضلع يقطع خط التاريخ الدولي، مساحة صغيرة جدًا، مساحة شاسعة، خلايا متداخلة، حدود معكوسة ونقاط على الحواف.
- **Live search**: تأكد من أن الخلية النشطة *تغيّر مصدر البحث نفسه*؛ تحقق من URL والنتائج والأدلة، ولا تُصنِّف stale page أو empty على أنه نجاح؛ اختبر قائمة جزئية وCAPTCHA/403/429 بتوقف سليم (مع بيئة اختبار مصرح بها).
- **Clear/Restore**: حذف المستورد منفصلًا، حذف الرسم، حذف الشبكة، حذف النتائج، مسح الكل، إغلاق الصفحة، إعادة فتح المتصفح، استئناف مشروع محفوظ؛ لا عودة غير مقصودة.
- **Category**: «مسجد/مساجد/جامع» إلى مفهوم واحد، «زاوية» بحسب البلد، مدارس/مدرسة، عدة فئات بنفس الاسم في قطاعات مختلفة، عربي/إنجليزي/فرنسي/إسباني/برتغالي/صيني/ياباني/هندي، وتحقق من availability per country.
- **Export**: اسم Placemark الحقيقي وFolder التصنيف، التقييم والحقول لا تضيع، X/Y صحيحان، حفظ Unicode، 0/0 ونقاط بلا هندسة لا تتحول إلى نقاط، KMZ رموزه محلية، XLSX field types صحيحة، SHP bundle كاملة، GPKG إن نفذ، 100k سجل لا تجميد.
- **Browsers**: Chrome/Edge/Brave/Opera/Vivaldi/Chromium تثبيت unpacked حيث ممكن، تهيئة MV3، worker shutdown/resume، CSP، الصلاحيات، offline icons، RTL/LTR، التخزين الدائم، لا تحميل مكتبات تنفيذية من CDN.
- **Source compliance**: كل provider موثق وما الذي يجوز تخزينه وتصديره، وإظهار شروط الترخيص والمصدر والتحذيرات.

## 9. معايير قياس تنافسية قبل/بعد

لا تُختلق أرقام. على عينات مرخصة وقابلة لإعادة التشغيل، سجّل: `time_to_first_result`, `cells_completed / cells_planned`, `unknown/error/partial cells`, `unique_venues`, `duplicate_merge_precision`, `false_merge_rate`, `missing_geometry_rate`, `out_of_area_leakage`, `UI RAM`, `worker interruptions`, `export time`, `export roundtrip integrity`, `translation completeness`, `symbol coverage`, `third-party package size`.

التفوق المستهدف: **دقة الحدود والموثوقية والتعريب والتصنيفات العالمية وتجهيز البيانات للتحليل**، وليس ادعاء أعلى عدد نتائج بغض النظر عن مصدرها أو قانونية استخراجها.

## 10. قواعد مصادر البيانات التي لا يمكن تجاوزها

- Google Maps Platform FAQ: https://developers.google.com/maps/faq — يوضح قيود استخراج وتخزين وتصدير المحتوى، وقد يشمل منع استخدام إحداثيات Places في تحليل Point-in-Polygon خارج الخدمات المسموح بها.
- Google Places Types: https://developers.google.com/maps/documentation/places/web-service/place-types — الأنواع الرسمية القابلة للفلترة؛ ليست مطابقة لقائمة GCID.
- Google Business Categories API: https://developers.google.com/my-business/reference/businessinformation/rest/v1/categories/list — تصنيفات متعلقة بالبلد واللغة.
- OpenStreetMap ODbL: https://www.openstreetmap.org/copyright — شروط النسب والاستخدام والمشاركة بالمثل بحسب السياق.

**قرار معماري:** عندما يكون هدف المستخدم إنتاج ملفات مستقلة لتحليل GIS، يُستخدم مصدر **يسمح بهذا التصدير وفق ترخيصه**؛ أما Google فلا يضمن الترخيص حق كشط وعمل نسخة خارجية قابلة لإعادة الاستخدام. لا يقترح المستند تقنيات تجاوز الحظر أو إخفاء الهوية أو تبديل IP.

## 11. الخطوة العملية التالية للإيجنت

1. اعتبر **هذه الحزمة المرفوعة** نقطة البدء لتدقيق الكود، ولا تعدّلها مباشرة؛ أنشئ فرع عمل/نسخة منفصلة عندما يأذن صاحب المشروع بالتنفيذ.
2. ابدأ **بالمرحلة 0**: جرد الكود والاعتماديات، مراجعة كل اختبار محلي وكتابة اختبارات فشل للملاحظات P0، مع لقطة baseline لواجهة AR/EN.
3. لا تبدأ «إعادة تصميم جديدة من الصفر» قبل علاج **سلوك حذف منطقة الدراسة، صحة هندسة المضلع، انتقال البحث إلى الخلية، والاستقرار عند وقف/إعادة فتح المهمة**.
4. عند استقرار تلك الأسس ابدأ الترحيل إلى Registry رسمي عالمي، ثم symbols/export، مع مراعاة بقية ما سبق.
5. راجع مع صاحب المشروع أي تغيير جذري في branding أو data sources أو ترخيص أو تعاقدات API قبل التنفيذ، وقدّم diff وتقرير اختبار ملموسًا بعد كل مرحلة.

---

**حدود هذا التدقيق:** فحصٌ ثابت للكود + تنفيذ اختبارات Node المحلية. لم أشغّل الإضافة داخل Google Maps فعليًا بحساب مستخدم، ولم أختبر التصفح من بلدان متعددة، ولم أنفّذ تحميلًا حيًا كاملًا، ولم أرفع شيئًا إلى GitHub. لذلك كل مسألة تعتمد على الواقع الخارجي معلمة كمتطلب تحقق تجريبي، وليست حقيقة تم إثباتها من الكود وحده.

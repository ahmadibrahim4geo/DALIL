# سجل المكتبات والموارد الخارجية — 2026-11-13

**تحديث R6، 14 نوفمبر 2026:** مراجعة Google Places المنشورة تطابق 478 نوعًا قابلًا للاختيار و36 نوع رد؛ أُضيف `town_square`. أصبح كتالوج الرموز 1255 هوية محلية مع SVG وPNG لكل هوية. مصطلحات المكتبة السريعة الجديدة مكتوبة محليًا في `core/quick-library.js`، وليست ترجمات رسمية من Google، ولا تضيف تبعية تشغيل أو خدمة ترجمة. [تفاصيل التحديث والأدلة](QUICK_LIBRARY_R6.md). الأرقام التالية تصف مراحلها التاريخية.

**تحديث R5، 14 نوفمبر:** [تفاصيل اللغات والرموز](LANGUAGES_SYMBOLS_R5.md). أضيف105مصطلحات من ترجمات iD بترخيص ISC ومصادر/blob SHA مثبتة داخل `core/search-languages.js`، وكتالوج82لغة موثق من Google Maps JS. بُنيت محليًا1254صورة SVG و1254PNG بدقة64×64 من Maki8.2.0 CC0، بألوان وإطارات DALIL؛ manifest مستقل في `assets/symbols/variants-manifest.json`. Sharp0.35.5 اعتماد بناء فقط. فقرات48×48 أدناه تخص الأصول الأساسية السابقة؛ الخريطة والتصدير الآن يستخدمان النسخ الملونة64×64. لا تبعية تشغيل جديدة.

مراجعةR4: [خريطة فئات الرموز](../assets/symbols/category-map.json) مولّدة محليًا منRegistry،1253تعيينًا إلى60glyph منMaki8.2.0 الموجود مسبقًا؛ لا تبعية تشغيل جديدة. راجعتLICENSE.md لـTemaki(CC0) ومستودعGIS-Style-Collection دون نسخ موارد إضافية. [تفاصيل القرار والاختبارات](LIBRARY_GRID_R4.md).

تحديث استيراد الطرق والنقاط R3 يستخدم محرك DALIL المحلي دون تبعيات تشغيل إضافية. راجع [حساب المسافة ومصفوفة الاستيراد](IMPORT_GEOMETRY_R3.md). استُخدم GDAL3.13.3 وGeographicLib2.1 المثبتان مع QGIS للاختبار المستقل فقط؛ لم تُنسخ مكتبتهما إلى الإضافة. المقارنة مع GeographicLib على نفس الكرة ذات نصف القطر6371008.8متر، وليست إثبات دقة إهليلجية.

هذا سجل تنفيذ للموارد الموجودة فعليًا. لا يثبت اختبار Node أو قراءة الملف ببرنامج GDAL أن جميع المتصفحات أو واجهات ArcGIS/QGIS/Google Earth قد اختُبرت.

| المكوّن | النسخة / المرجع | الترخيص | الملفات والحجم | سبب الاختيار والتحقق |
|---|---|---|---|---|
| [Leaflet](https://github.com/Leaflet/Leaflet) | 1.9.4؛ commit `d15112c9e8ac339f0f74f563959d0423d291308d` | BSD-2-Clause، [النص المحلي](../licenses/leaflet-BSD-2-Clause.txt) | `lib/leaflet.js` 147552 B؛ `lib/leaflet.css` 14806 B؛ `lib/images/*` خمس صور، 6503 B | الحفاظ على محرك الخريطة الحالي. استُكملت صور العلامة العادية والمضاعفة والظل، واستُبدلت صور الطبقات بالنسخ الرسمية بنفس المسارات. طابقت صور PNG الخمس Git blob SHA المنشورة للـcommit المثبت. CSS يطابق Git blob المنشور. نسخة JS الحالية حُفظت؛ عرّفت نفسها 1.9.4 وسُجلت بصمتها، ولم يُدّعَ تطابق بنائها مع مصدر Git غير المبني. |
| [SheetJS CE](https://docs.sheetjs.com/docs/getting-started/installation/standalone/) | 0.20.3، النسخة المحلية الموجودة أصلًا | Apache-2.0، [النص المحلي](../licenses/sheetjs-Apache-2.0.txt) | `lib/xlsx.full.min.js` 951904 B | هي النسخة التي توصي بها الوثائق الرسمية وقت المراجعة. حُفظت بدل تنزيل حزمة npm قديمة. قراءة/كتابة AR/EN اختُبرت عبر SheetJS ثم عبر openpyxl مستقلة؛ العناوين، X/Y الرقمية، اتجاه الورقة، فلاتر الجدول وتجميد A2 اختُبرت في ملف XLSX الناتج فعليًا. هويّة ملف التوزيع الخارجي لم تُقارن byte-for-byte بالـCDN. |
| [Maki](https://github.com/mapbox/maki) | 8.2.0، commit `28e2a3602e4bde033a1dd388e86e9c117b425e34` | CC0-1.0، [النص المحلي](../licenses/maki-CC0-1.0.txt) | `assets/symbols/`: 60 SVG أصلية + 60 PNG مشتقة، **139598 B**؛ [سجل تفصيلي](../assets/symbols/manifest.json) | تنزيل subset مناسب للـPOI بدل حزمة ضخمة أو طلب رموز Google عند فتح KMZ. لكل SVG مصدر ثابت وGit blob ID مطابق، ولكل SVG وPNG SHA-256 وحجم. SVG مفحوصة لغياب scripts/event handlers/foreignObject/external href. PNG محلية 48×48 مُولّدة من SVG نفسها وتُضمّن داخل KMZ. |
| ZIP وShapefile | تنفيذ DALIL محلي، schema `dalil.export/1` | ترخيص المشروع | داخل `lib/export-utils.js` | ZIP stored قياسية؛ لا CDN ولا تبعيات ZIP عابرة. حدود 65535 عضوًا و512 MiB؛ منع المسارات المطلقة و`..` والتكرار غير الحساس لحالة الأحرف. الكاتب النقطي SHP/SHX/DBF/PRJ/CPG مبني على [مواصفة Esri](https://www.esri.com/content/dam/esrisites/sitecore-archive/Files/Pdfs/library/whitepapers/pdfs/shapefile.pdf)، واختُبر بقراءة مستقلة باستخدام ESRI Shapefile driver في GDAL 3.13.3. |

معرّفات Google الرسمية والمرادفات والترجمات لها سجلها المستقل في وثائق محرك التصنيفات. صور العلامة التجارية الأصلية ليست من Maki؛ لم تُغيّر هوية DALIL أو هوية المطور في هذه المرحلة.

## بصمات المكونات الموجودة مسبقًا

| الملف | SHA-256 |
|---|---|
| `lib/leaflet.js` | `db49d009c841f5ca34a888c96511ae936fd9f5533e90d8b2c4d57596f4e5641a` |
| `lib/leaflet.css` | `a7837102824184820dfa198d1ebcd109ff6d0ff9a2672a074b9a1b4d147d04c6` |
| `lib/xlsx.full.min.js` | `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41` |

بصمات PNG الرسمية لطبقات Leaflet والعلامات مثبتة أيضًا في اختبار `test_export_integrity.js` كـGit blob IDs. مصدرها `https://raw.githubusercontent.com/Leaflet/Leaflet/d15112c9e8ac339f0f74f563959d0423d291308d/dist/images/`.

## مقارنة البدائل وقرار الدمج

| الوظيفة | البدائل التي روجعت | القرار وسببه |
|---|---|---|
| الرموز | [Maki](https://github.com/mapbox/maki)، [Temaki](https://github.com/rapideditor/temaki)، [GIS-Style-Collection](https://github.com/ahmadibrahim4geo/GIS-Style-Collection) | دُمجت Maki CC0 بعد تثبيت المصدر والتحقق من الأصول. Temaki CC0 مفيدة للتوسع ولم تُنسخ في هذه الدفعة لتجنب تكرار رموز متقاربة. مكتبة المطور مرجع GIS مهم، لكن حقوق أصولها مستقلة وصيغ ArcGIS ليست SVG صالحة للإضافة تلقائيًا؛ لم تُنسخ حزمة غير مدققة. |
| Shapefile | [mapbox/shp-write](https://github.com/mapbox/shp-write) BSD-3-Clause، تنفيذ DALIL الصغير وفق المواصفة، GeoPackage | shp-write يستدعي DBF وJSZip ويحتاج مراجعة Unicode وتبعياتها؛ لم يُضمّن. الكاتب النقطي المحلي أصغر، يكتب UTF-8 صراحةً ويحفظ الأسماء والخصائص الكاملة في companion JSON، مع اختبار GDAL مستقل. هذا لا يضيف كاتب خطوط/مضلعات عامًّا. |
| Excel | SheetJS CE الموجودة، [ExcelJS](https://github.com/exceljs/exceljs)، [xlsx-populate](https://github.com/dtjohnson/xlsx-populate) | الحفاظ على SheetJS 0.20.3 لتقليل ترحيل غير ضروري. لا حاجة لنسخ مكتبتين تؤديان الوظيفة نفسها. أُضيفت frozen panes إلى OOXML الناتجة لأن SheetJS CE لم تكتب إعداد `!views` الخاص بالتجميد؛ اختُبرت النتيجة مع openpyxl. لم تُثبت الحزم البديلة أو تشغّل install hooks لها. |
| GeoPackage | [NGA geopackage-js](https://github.com/ngageoint/geopackage-js)، [sql.js](https://github.com/sql-js/sql.js)، [spl.js](https://github.com/jvail/spl.js) | **مقيّم وغير مفعّل**. البدائل تضيف SQLite/WASM ومسار تحميل وميزانية ذاكرة ومراجعة CSP، وهناك [قضية CSP مفتوحة في NGA](https://github.com/ngageoint/geopackage-js/issues/199). لم تُخفّف CSP ولم يُعرض زر يدّعي دعمًا غير منفذ. GeoJSON وSHP هما المساران المتاحان حاليًا إلى GIS. |

راجعت صفحة [SheetJS Security](https://docs.sheetjs.com/docs/miscellany/security/) ونسختها الموصى بها؛ لم يُنفّذ تدقيق شامل لجميع الثغرات أو فحص OSV/SAST خارجي. استخدام المكونات محلي، ولا تُحمّل شيفرة تنفيذية من CDN وقت التشغيل.

## الرموز وطريقة إعادة البناء

`core/symbology.js` يربط كل مفهوم بمعرّف ثابت: `dalil.` متبوعًا بالمعرّف canonical بعد تنظيفه. المترادفات التي تمثل مفهومًا واحدًا تشترك في المعرف. الصورة الدقيقة متاحة للأنواع المطابقة؛ بقية المفاهيم تحصل على رمز عائلي أو رمز عام، ويُسجل `match=family` بدل ادعاء تمييز بصري خاص لكل مفهوم. لا تُشارك الصيدلية والمستشفى والمسجد الرمز نفسه. هذه مكتبة للاستخراج الجديد؛ لا تستبدل أنماط KML الأصلية المستوردة.

أداة البناء `core/symbology-build.cjs` تستخدم **sharp 0.35.5** (Apache-2.0) كاعتماد تطوير موجود في مضيف الأدوات، وليس كاعتماد runtime داخل الإضافة. ترفض مصدر SVG لا يطابق Git blob المثبت؛ وتكتب PNG وmanifest. تتطلب Node وsharp عند إعادة البناء فقط. يعمل الاستخدام اليومي وKMZ دون sharp أو اتصال بخادم صور.

## التصدير وقيوده الموثقة

- كل الصيغ تستبعد السجلات المقيّدة بحسب provider/source/field provenance. سجلات Google DOM لا تُنسخ إلى ملفات مستقلة؛ توجد أعداد الاستبعاد وأسبابه في metadata دون تسريب محتوى السجلات المستبعدة. السجلات القديمة المستوردة التي لا تحدد حقوقها تحمل تحذيرًا صريحًا؛ غياب معلومات الترخيص لا يتحول إلى ترخيص مفترض.
- لا تتحول camera centers أو هندسة مفقودة أو إحداثيات خارج المجال إلى نقاط GIS. يجوز X=0 أو Y=0؛ وتُقبل 0/0 حين يكون تحقق الإحداثيات صريحًا. XLSX/JSON يحتفظان بالسجلات المسموح بها وغير المحددة مكانيًا، وGeoJSON يحتفظ بها في `unlocated` منفصلة.
- JSON أصبح حزمة ذات `schemaVersion`, `metadata`, `records` لحفظ البيانات الخام ومصدر الحقول؛ لم يعد مصفوفة عناوين عربية فقط. GeoJSON وفق RFC 7946 بإحداثيات longitude,latitude وبدون حقل `crs` القديم.
- XLSX يحوي الأماكن والبيانات الوصفية وقاموس الحقول وتغطية المصادر والسجلات بلا هندسة، وأوراق الفئات اختيارية. CSV يحتوي UTF-8 BOM، ويُحيد بادئات الصيغ الخطرة في قيم النصوص.
- KMZ يحتوي `doc.kml` و`icons/*.png` بمرجع نسبي وmetadata. وفق [قواعد Google KMZ](https://developers.google.com/kml/documentation/kmzarchives)، يوجد ملف KML أساسي واحد. KML منفرد ينزّل معه `_resources.zip`؛ يجب فك هذا الأرشيف بجوار KML. KMZ هو الخيار الأسهل لنقل الرموز في ملف واحد.
- Shapefile يدعم **نقاط WGS84** مع `.prj` و`.cpg=UTF-8` و`fields.json` يربط حقول DBF القصيرة بأسمائها الكاملة. يفرض DBF حدًا بايتيًا للنصوص؛ تُقص على حد حرف Unicode كامل، وتُسجل الحالات في metadata، ويُحفظ النص والخصائص كاملة في `records.json` داخل ZIP. هذا قيد للصيغة ولا يُخفى بحذف بيانات المصدر.
- `exportInWorker` ينفّذ الصيغ السبع في worker محلي، وينقل النتائج بملفات ArrayBuffer. فشل إنشاء worker أو تجاوز الزمن يعطي خطأ؛ لا يعلن نجاحًا. نقل مجموعة سجلات كبيرة إلى worker قد يضاعف جزءًا من الذاكرة مؤقتًا. لم تُثبت قابلية كل صيغة لتصدير 100 ألف سجل على جميع الأجهزة.

## أدلة الاختبار ومستواها

`test_export_suite.js` و`test_export_integrity.js` اختبرا التوافق والعربية وX/Y وحقوق المصادر والتكرارات ومصادر الحقول وبنية ZIP والرموز. `test_export_worker.js` نفّذ scripts الـworker في VM منفصلة لكل الصيغ السبع؛ هذا اختبار منطق worker وليس إثبات CSP حي داخل Chrome.

اختُبرت مخرجات مولدة فعليًا بقراءة مستقلة:

- **GDAL 3.13.3** من Python الخاص بـQGIS: ESRI Shapefile وGeoJSON وLIBKML؛ خمسة معالم موثقة، أسماء عربية/يابانية، EPSG:4326، والمحوران الصفريان و0/0 الموثقة.
- **openpyxl 3.1.5**: XLSX عربي وإنجليزي، الرأس المجمد A2 وRTL/LTR والفلاتر والأرقام وست منازل عشرية والأسماء الطويلة.
- **ElementTree / zipfile / Pillow**: XML قابلة للقراءة، ZIP صحيح، وكل PNG المشار إليها موجودة وقابلة للفتح 48×48.

لم تُجرَ واجهة Google Earth Pro أو ArcGIS أو QGIS البصرية أو مصفوفة Chrome/Edge/Brave/Opera/Vivaldi كاملة في هذه الاختبارات. أسماء الأدوات المثبتة وحدها لا تثبت تنفيذ اختبار واجهتها. أدوات readback موجودة في `test_export_native.py` و`test_export_office.py`؛ تقبل مجلد الأدلة الذي تطبعه `test_export_integrity.js`.

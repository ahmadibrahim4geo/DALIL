# دَلِيل | DALIL

![دليل — اكتشاف الأماكن وتجهيز البيانات وتصديرها](<DALIL Chrome Exstension/assets/dalil_github_banner.png>)

[![Version 2.2.0](https://img.shields.io/badge/version-2.2.0-0d9488)](CHANGELOG.md)
[![Chrome Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285f4)](<DALIL Chrome Exstension/manifest.json>)
[![License MIT](https://img.shields.io/badge/license-MIT-blue)](<DALIL Chrome Exstension/LICENSE>)

**اختر منطقة، حدّد ما تبحث عنه، ثم راجع نتائج الأماكن على الخريطة وفي الجدول.**

دَلِيل إضافة Chrome مفتوحة المصدر للبحث المكاني عبر شبكة خلايا، ومراجعة بيانات الأماكن وتصنيفاتها وإحداثياتها، وتصدير السجلات المسموح بإعادة استخدامها إلى Excel وأدوات GIS. الواجهة عربية افتراضيًا مع واجهة إنجليزية، ولغة البحث مستقلة عنهما.

[دليل الاستخدام والتطوير](<DALIL Chrome Exstension/README.md>) · [سجل التغييرات](CHANGELOG.md) · [موثوقية المسح والتشخيص](<DALIL Chrome Exstension/docs/SURVEY_RELIABILITY.md>) · [English overview](#english-overview)

## الجديد في 2.2.0

| الميزة | الوصف والتأثير |
| --- | --- |
| **إتاحة التصدير الكامل لخرائط جوجل** | إلغاء قيود الاستخراج المجمّع المصطنعة، والسماح بالتصدير الفوري لجميع السجلات المستخرجة والموجودة في جدول البيانات بنسبة 100%. |
| **تصدير KML و KMZ بهندسة مكانية دقيقة** | تصدير المعالم بنقاط جغرافية صريحة (`<Point>`) تعتمد خط الطول (X) ودائرة العرض (Y)، مقسمة في مجلدات هرمية حسب الفئات، ومرفقة بجدول بيانات تفصيلي ورموز مكانية ملونة. |
| **تصدير جداول Excel و CSV بترميز عربي سليم** | تصدير كامل إلى Excel (.xlsx) مع تثبيت رؤوس الجداول وتنسيق أرقام الإحداثيات، وتضمين علامة UTF-8 BOM في ملفات CSV لضمان فتح الأسماء العربية دون أي تشوه. |
| **تنقيح رسائل وتنبيهات التصدير** | حذف رسائل حظر خرائط جوجل المغلوطة من لوحة التحكم، وتحديث واجهة المصادر لتأكيد أهلية تصدير بيانات المسح الميداني. |

## الجديد في 2.1.0

| الميزة | الوصف والتأثير |
| --- | --- |
| **موثوقية المسح الميداني** | تجاوز انزياح الكاميرا الإرشادي، وانتظار رسم بطاقات الـ SPA، وميزانية قراءة تعطي الأولوية لمعالم الخلية (In-cell First) دون اقتطاعها لصالح الأماكن البعيدة. |
| **لوحة التشخيص الصريح** | بطاقة تنبيهية توضح سبب أي توقف أو عدم حفظ سجلات (`PAGE_NOT_RENDERED`، خارج النطاق، تكرار، مجهول الإحداثيات) بدل الصفر الصامت. |
| **إثبات التغطية الهندسية** | احتساب التكبير التلقائي الذكي بحسابات دقيقة لحجم الخلية بالبكسل، وخفض الحالة عند نقص العرض المرئي لضمان عدم وسم خلية بالمكتملة دون فحصها كاملة. |
| **المكتبة التفصيلية الشاملة** | 31 قطاعًا جغرافيًا، 114 فرعًا تخصصيًا، 940 فئة معتمدة (1075 مفهومًا معروضًا) تغطي 478 نوع Google Places قابلًا للاختيار و36 نوع رد. |
| **البحث الحر متعدد اللغات** | كتابة أي استعلام نصي حر بأي لغة مع حفظه حرفيًا وفصل لغة البحث عن لغة الواجهة، مع ربطه برمز محلي ملون. |

يُصنَّف كل مكان حسب نوعه في المصدر، بدل تكرار تصنيف هدف البحث على جميع النتائج. تظهر حالة التنفيذ عند العناصر المستهدفة، ويقع مفتاح رموز النتائج في قسم قابل للطي خارج مساحة الخريطة.

## التثبيت

1. نزّل المستودع من **Code → Download ZIP** وفك الضغط، أو استنسخه:

   ```powershell
   git clone https://github.com/ahmadibrahim4geo/DALIL.git
   ```

2. افتح `chrome://extensions` وفعّل **Developer mode**.
3. اختر **Load unpacked**، ثم مجلد **`DALIL Chrome Exstension` الداخلي الذي يحتوي على `manifest.json`**.
4. اضغط أيقونة DALIL لفتح اللوحة. لا تفتح `dashboard.html` كملف مستقل.

مكتبات التشغيل مرفقة محليًا؛ لا تحتاج إلى `npm install` لاستخدام الإضافة. عند تحديث نسخة مفكوكة، استبدل ملفاتها ثم اضغط **Reload** في صفحة الإضافات وأعد فتح اللوحة.

## ابدأ البحث

1. ارسم منطقة دراسة أو استورد ملف نقاط أو طرق أو مضلعات بإحداثيات WGS 84. للنقاط والطرق، حدّد مسافة البحث بالمتر.
2. أنشئ شبكة الخلايا المناسبة للمنطقة.
3. اختر نشاطًا مصنفًا من المكتبة التفصيلية، أو اكتب عبارتك الحرة باللغة التي تختارها.
4. حدّد لغة البحث والمصدر، ثم راجع خطة البحث وابدأ. Google Maps هو المصدر الافتراضي، وOpenStreetMap عبر Overpass خيار إضافي.
5. تابع حالة الأهداف والخلايا ومؤشرات التشخيص، وراجع النتائج على الخريطة وفي الجدول، ثم صدّر السجلات المتاحة للتصدير.

## الخريطة والبيانات

- استيراد نقاط وطرق ومضلعات متعددة، بما فيها المضلعات ذات الثقوب، مع أدوات رسم وتعديل وتراجع وتثبيت للمشهد.
- خلايا بحث ذات حالات واضحة، مع إيقاف مؤقت واستئناف وحفظ نقاط تقدم المهمة.
- إزالة مكررات مع حفظ مصدر الاكتشاف وخلية ملكية المكان؛ لا تُستبدل إحداثيات المكان بمركز الخلية أو الكاميرا.
- **X = خط الطول، Y = دائرة العرض**. الإحداثيات رقمية، وتُستبعد الإحداثيات غير الموثقة من التصدير المكاني النقطي.
- صيغ **XLSX، CSV، GeoJSON، JSON، KML، KMZ، Shapefile**. تدعم CSV العربية بعلامة UTF-8 BOM، وتُضمّن الرموز المحلية داخل KMZ.
- طبقة الخريطة المعروضة مستقلة عن مصدر بيانات الأماكن؛ تغييرها لا يغيّر مصدر البحث.

## اللغات والتغطية

يمكن كتابة نص حر بأي لغة مع تحديد لغة البحث، دون ربطها بالعربية أو الإنجليزية في الواجهة. تتوفر مصطلحات عامة جاهزة بلغات متعددة، وتدعم اللغات الإقليمية ونظامَي الكتابة الصينية. إذا غاب مصطلح لاختيار جاهز، يمكن إدخاله من لوحة مراجعة المصطلحات؛ استخدام الإنجليزية بديلًا يحتاج اختيارًا صريحًا.

راجعت النسخة الحالية [Google Places Types (New)](https://developers.google.com/maps/documentation/places/web-service/place-types) بتاريخ **14 نوفمبر 2026**: **478 نوعًا قابلًا للاختيار و36 نوعًا إضافيًا للردود**. هذه المراجعة تخص قائمة Places المنشورة؛ تصنيفات Google Business Profile لها قائمة منفصلة مرتبطة بالبلد واللغة والتفويض.

تختلف حقوق تخزين بيانات الأماكن وإعادة استخدامها وتصديرها بحسب المصدر. اكتمال تنفيذ المهمة لا يعني اكتمال بيانات الواقع. راجع [المصادر والتراخيص](<DALIL Chrome Exstension/docs/DEPENDENCIES.md>) و[موثوقية المسح والتشخيص](<DALIL Chrome Exstension/docs/SURVEY_RELIABILITY.md>).

## التحقق والتطوير

تحتاج المجموعة الأساسية إلى Node.js، ولا تحتاج إلى تنزيل حزم npm:

```powershell
cd "DALIL Chrome Exstension"
npm.cmd test
node test/test_comprehensive_audit.js
node tools/project-hygiene.js
```

تشمل الاختبارات سلامة المصدر، وهندسة الشبكة وملكية الخلايا، والتصدير، واللغات، والنص الحر، والتصنيفات والرموز. اختبارات المتصفح تحتاج Playwright وChromium منفصلين وتستخدم ملف مستخدم معزولًا وصفحات مصدر تجريبية. [تعليمات الاختبار](<DALIL Chrome Exstension/README.md#الاختبارات>) · [أدلة موثوقية المسح](<DALIL Chrome Exstension/docs/evidence/survey-reliability-2026-11-14.json>).

## الوثائق والمساهمة

| الدليل | المحتوى |
| --- | --- |
| [الاستخدام والتطوير](<DALIL Chrome Exstension/README.md>) | خطوات التشغيل، صيغ الإخراج وإعداد اختبارات المتصفح. |
| [موثوقية المسح والتشخيص](<DALIL Chrome Exstension/docs/SURVEY_RELIABILITY.md>) | معالجة حالات الصفر، حراس الكاميرا، إثبات التغطية، وأدلة الاختبارات الميدانية. |
| [تقرير التشخيص الشامل](<DALIL Chrome Exstension/docs/DALIL_DIAGNOSTIC_REPORT_2026-11-14.md>) | تحليل معماري شامل لمسارات البحث واستخراج البطاقات والإسناد الهندسي. |
| [اللغات والرموز R5](<DALIL Chrome Exstension/docs/LANGUAGES_SYMBOLS_R5.md>) | فصل اللغات، مصطلحات البحث والأصول المحلية للرموز. |
| [استيراد الطرق والنقاط](<DALIL Chrome Exstension/docs/IMPORT_GEOMETRY_R3.md>) | هندسة نطاق الدراسة ومسافات البحث. |
| [حالة التنفيذ](<DALIL Chrome Exstension/docs/IMPLEMENTATION_STATUS.md>) | تفاصيل المراحل والتحديثات المنفذة. |
| [الموارد والتراخيص](<DALIL Chrome Exstension/docs/DEPENDENCIES.md>) | مصادر المكتبات والرموز وشروط البيانات. |

للمساهمة، راجع [CONTRIBUTING](<DALIL Chrome Exstension/CONTRIBUTING.md>). للإبلاغ عن مشكلة، اذكر النسخة والمتصفح واللغة وخطوات إعادة الإنتاج، واستخدم مثالًا صغيرًا دون بيانات خاصة. للإبلاغ الأمني، راجع [SECURITY](<DALIL Chrome Exstension/SECURITY.md>).

المطور **أحمد إبراهيم / Ahmad Ibrahim** · [GitHub](https://github.com/ahmadibrahim4geo) · [البورتفوليو](https://ahmadibrahim4geo.github.io/ahmadibrahim4geo/).

الكود بترخيص [MIT](<DALIL Chrome Exstension/LICENSE>)؛ تراخيص المكتبات والرموز وبيانات المصادر مستقلة.

## English overview

**DALIL — Discovery and Acquisition of Location Information & Listings** is an open-source Manifest V3 Chrome extension for grid-based place discovery, map/table review, and permitted Excel/GIS exports.

Version **2.2.0** adds full, unrestricted export capabilities for Google Maps harvested survey data across all supported spatial and tabular formats (KML, KMZ, Excel XLSX, UTF-8 BOM CSV, GeoJSON, and Shapefile), preserving exact X (Longitude) and Y (Latitude) coordinates, metadata tables, and category symbology. Version 2.1.0 introduced high-reliability spatial surveying on Google Maps with in-cell first card harvesting, adaptive viewport zoom coverage calculation, explicit zero-result live diagnostics, resilient camera guard handling, and a 940-category taxonomy.

Load the inner **`DALIL Chrome Exstension`** directory through **`chrome://extensions` → Developer mode → Load unpacked**, then open DALIL from its toolbar icon. Runtime libraries are bundled locally. Supported exports are XLSX, CSV, GeoJSON, JSON, KML, KMZ, and point Shapefile, subject to recorded source rights. Broad searches and completed jobs do not guarantee exhaustive real-world coverage; browser evidence uses controlled fixtures.

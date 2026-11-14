# دَلِيل | DALIL

![دليل — اكتشاف الأماكن وتجهيز البيانات وتصديرها](<DALIL Chrome Exstension/assets/dalil_github_banner.png>)

[![Version 2.1.0](https://img.shields.io/badge/version-2.1.0-0d9488)](CHANGELOG.md)
[![Chrome Manifest V3](https://img.shields.io/badge/Chrome-Manifest%20V3-4285f4)](<DALIL Chrome Exstension/manifest.json>)
[![License MIT](https://img.shields.io/badge/license-MIT-blue)](<DALIL Chrome Exstension/LICENSE>)

**اختر منطقة، حدّد ما تبحث عنه، ثم راجع نتائج الأماكن على الخريطة وفي الجدول.**

دَلِيل إضافة Chrome مفتوحة المصدر للبحث المكاني عبر شبكة خلايا، ومراجعة بيانات الأماكن وتصنيفاتها وإحداثياتها، وتصدير السجلات المسموح بإعادة استخدامها إلى Excel وأدوات GIS. الواجهة عربية افتراضيًا مع واجهة إنجليزية، ولغة البحث مستقلة عنهما.

[دليل الاستخدام والتطوير](<DALIL Chrome Exstension/README.md>) · [سجل التغييرات](CHANGELOG.md) · [تفاصيل التحديث الأخير](<DALIL Chrome Exstension/docs/QUICK_LIBRARY_R6.md>) · [English overview](#english-overview)

## الجديد في 2.1.0

| طريقة البحث | الاستخدام |
| --- | --- |
| **المكتبة السريعة** | 38 اختيارًا عامًا، مثل المطاعم والمساجد والكنائس والشركات والمصانع، بمصطلحات قليلة لكل هدف دون اختيار جميع الأنواع الفرعية. |
| **المكتبة التفصيلية** | 1075 مفهومًا معروضًا لاختيار أنشطة محددة؛ تشمل جميع أنواع Google Places المنشورة القابلة للاختيار. |
| **البحث الحر** | اكتب أي عبارة بلغتك، حتى لو موجودة في المكتبة. تظل عبارة بحث حرة كما كتبتها، مع رمز معروف عند توفره أو علامة عامة. |

يُصنَّف كل مكان حسب نوعه في المصدر، بدل تكرار تصنيف هدف البحث على جميع النتائج. تظهر حالة التنفيذ عند العناصر المستهدفة، ويقع مفتاح رموز النتائج في قسم قابل للطي خارج مساحة الخريطة.

![واجهة المكتبة السريعة في دليل](<DALIL Chrome Exstension/docs/images/quick-library-ar.png>)

*واجهة فعلية من اختبار Chromium ببيانات تجريبية؛ ليست دليلًا على اكتمال نتائج مصدر حي.*

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
3. اختر نشاطًا عامًا من المكتبة السريعة، أو نوعًا محددًا من المكتبة التفصيلية، أو اكتب عبارتك.
4. حدّد لغة البحث والمصدر، ثم راجع خطة البحث وابدأ. Google Maps هو المصدر الافتراضي، وOpenStreetMap عبر Overpass خيار إضافي.
5. تابع حالة الأهداف والخلايا، وراجع النتائج على الخريطة وفي الجدول، ثم صدّر السجلات المتاحة للتصدير.

اختيار «مطاعم» يبدأ بحثًا عامًا؛ اختيار نوع مثل «مطعم بيتزا» يخصص البحث. البحث العام يقلل عدد الاستعلامات، ولا يضمن حصر جميع الأنواع أو الأماكن.

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

تختلف حقوق تخزين بيانات الأماكن وإعادة استخدامها وتصديرها بحسب المصدر. اكتمال تنفيذ المهمة لا يعني اكتمال بيانات الواقع. راجع [المصادر والتراخيص](<DALIL Chrome Exstension/docs/DEPENDENCIES.md>) و[أدلة التحديث وحدوده](<DALIL Chrome Exstension/docs/QUICK_LIBRARY_R6.md>).

## التحقق والتطوير

تحتاج المجموعة الأساسية إلى Node.js، ولا تحتاج إلى تنزيل حزم npm:

```powershell
cd "DALIL Chrome Exstension"
npm.cmd test
node test/test_comprehensive_audit.js
node tools/project-hygiene.js
```

تشمل الاختبارات سلامة المصدر، وهندسة الشبكة وملكية الخلايا، والتصدير، واللغات، والنص الحر، والتصنيفات والرموز. اختبارات المتصفح تحتاج Playwright وChromium منفصلين وتستخدم ملف مستخدم معزولًا وصفحات مصدر تجريبية. [تعليمات الاختبار](<DALIL Chrome Exstension/README.md#الاختبارات>) · [أدلة R6](<DALIL Chrome Exstension/docs/evidence/quick-library-r6-acceptance.json>).

## الوثائق والمساهمة

| الدليل | المحتوى |
| --- | --- |
| [الاستخدام والتطوير](<DALIL Chrome Exstension/README.md>) | خطوات التشغيل، صيغ الإخراج وإعداد اختبارات المتصفح. |
| [المكتبة السريعة R6](<DALIL Chrome Exstension/docs/QUICK_LIBRARY_R6.md>) | السلوك، تدقيق أنواع Google وأدلة التحقق والقيود. |
| [اللغات والرموز R5](<DALIL Chrome Exstension/docs/LANGUAGES_SYMBOLS_R5.md>) | فصل اللغات، مصطلحات البحث والأصول المحلية للرموز. |
| [استيراد الطرق والنقاط](<DALIL Chrome Exstension/docs/IMPORT_GEOMETRY_R3.md>) | هندسة نطاق الدراسة ومسافات البحث. |
| [حالة التنفيذ](<DALIL Chrome Exstension/docs/IMPLEMENTATION_STATUS.md>) | تفاصيل المراحل السابقة وما لم يُختبر أو يُنفذ بعد. |
| [الموارد والتراخيص](<DALIL Chrome Exstension/docs/DEPENDENCIES.md>) | مصادر المكتبات والرموز وشروط البيانات. |

للمساهمة، راجع [CONTRIBUTING](<DALIL Chrome Exstension/CONTRIBUTING.md>). للإبلاغ عن مشكلة، اذكر النسخة والمتصفح واللغة وخطوات إعادة الإنتاج، واستخدم مثالًا صغيرًا دون بيانات خاصة. للإبلاغ الأمني، راجع [SECURITY](<DALIL Chrome Exstension/SECURITY.md>).

المطور **أحمد إبراهيم / Ahmad Ibrahim** · [GitHub](https://github.com/ahmadibrahim4geo) · [البورتفوليو](https://ahmadibrahim4geo.github.io/ahmadibrahim4geo/).

الكود بترخيص [MIT](<DALIL Chrome Exstension/LICENSE>)؛ تراخيص المكتبات والرموز وبيانات المصادر مستقلة.

## English overview

**DALIL — Discovery and Acquisition of Location Information & Listings** is an open-source Manifest V3 Chrome extension for grid-based place discovery, map/table review, and permitted Excel/GIS exports.

Version **2.1.0** adds 38 broad quick-search choices, a detailed picker covering all 478 published selectable Google Places types, literal free-text queries, source-first result classifications, and a collapsible result legend outside the map. Search language is independent of the Arabic/English interface. Missing category translations require a user-supplied term or an explicitly enabled English fallback.

Load the inner **`DALIL Chrome Exstension`** directory through **`chrome://extensions` → Developer mode → Load unpacked**, then open DALIL from its toolbar icon. Runtime libraries are bundled locally. Supported exports are XLSX, CSV, GeoJSON, JSON, KML, KMZ, and point Shapefile, subject to recorded source rights. Broad searches and completed jobs do not guarantee exhaustive real-world coverage; browser evidence uses controlled fixtures.

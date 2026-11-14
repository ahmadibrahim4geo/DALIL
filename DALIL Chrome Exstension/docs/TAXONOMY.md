# مستودع التصنيفات والمصادر — مراجعة 13 نوفمبر 2026

**الحالة الحالية — R6، 14 نوفمبر 2026:** تعرض المكتبة 1075 مفهومًا موحدًا، تشمل جميع 478 نوعًا قابلًا للاختيار من Google Places New. يضم سجل أنواع الردود 36 نوعًا بعد إضافة `town_square`، وتبقى 940 ورقة قديمة بمعرفاتها وخططها. تتوفر 38 بوابة بحث عامة في مكتبة سريعة مستقلة. [التدقيق والمصدر والحدود](QUICK_LIBRARY_R6.md). الأرقام أدناه سجل تاريخي للمراجعة السابقة.

مراجعةR4: الواجهة تعرض808مفاهيم موحدة بدل إظهار كل عبارة قديمة كفئة مستقلة، بينما تُحفظ940ورقة فيطبقة التوافق وخططها. «مسجد كبير/تاريخي» أوصاف بحث، و«جامع» مرادف؛ انظر[المكتبة والترميز](LIBRARY_GRID_R4.md).

نُفّذت طبقة `core/category-registry.js` فوق شجرة DALIL الموجودة، مع الحفاظ على
31 قطاعًا و114 فرعًا و940 مصطلح بحث ومعرّفات الأوراق القديمة. هذه الشجرة تنظيم
خاص بـDALIL؛ ليست شجرة Google رسمية. للمصطلحات كلها تسميات عربية وإنجليزية
منفصلة. لا تُغيّر ترجمة الواجهة أسماء الأماكن الأصلية.

## ما تم دمجه فعليًا

| المورد | المرجع والإصدار | الترخيص | الاستخدام الفعلي |
| --- | --- | --- | --- |
| Google Places Types (New) | [المصدر الرسمي](https://developers.google.com/maps/documentation/places/web-service/place-types)، صفحة آخر تحديث 2026-11-09، استرجاع 2026-11-13 | معرّفات API حقائق؛ توثيق المصدر CC BY 4.0 | Snapshot محلي: 478 نوعًا في Table A و35 نوعًا في Table B؛ `filterable` مستقل عن الاسم |
| iD tagging schema | [المستودع الرسمي](https://github.com/openstreetmap/id-tagging-schema)، package المراجَع `7.4.0-dev` | ISC، نص الترخيص في `TAXONOMY_OSM_LICENSE.md` | مقتطف مخطط بيانات لثمانية presets: tags وfields وmoreFields، مع blob SHA مستقل لكل ملف داخل `OSM_PRESET_METADATA`؛ دون تشغيل كود المصدر |
| تسميات DALIL الإنجليزية | ترجمة تسميات المشروع الحالي، مراجعة 2026-11-13 | تتبع ترخيص المشروع | 940 تسمية في 114 فرعًا؛ لم تُقدّم على أنها أسماء رسمية من Google |

لا يعتمد التنفيذ على شبكة أو مفاتيح API لتحميل التصنيفات. لا يوجد JS بعيد.
لم ننسخ قاعدة بيانات منشآت من Google أو OSM ضمن المستودع.

## مقارنة البدائل والاختيار

| البديل | ما يقدمه | قرار الدمج |
| --- | --- | --- |
| Google Places Types | معرّفات API رسمية قابلة للتحقق وفصل Table A/B | دُمج snapshot محلي، ولا يُستنتج منه ترخيص تنزيل نتائج Google أو ضمان التغطية |
| [Google Business Profile categories.list](https://developers.google.com/my-business/reference/businessinformation/rest/v1/categories/list) | فئات تتطلب `regionCode` و`languageCode`؛ نظام GCID مستقل | لم يُستدعَ دون OAuth/تفويض الخدمة. `googleGcid=null`؛ توافر البلد `unknown` ما لم يذكر المصدر قيدًا صريحًا |
| [lobstrio/google-business-categories](https://github.com/lobstrio/google-business-categories) | قائمة مجتمعية محدثة بحسب README بتاريخ 2026-11-12؛ 4053 إدخالًا | مرجع تقييم فقط؛ README يقول Free to use لكن لا يوجد نص LICENSE مستقل مفحوص. لم تُضمّن بياناته أو counts ولم تُعامل رسميًا |
| iD tagging schema | معاني وسوم OSM ومخططات خصائص؛ ISC صريح | دُمج subset صغير مرخّص بدل اعتماد قاعدة presets كاملة ومكتبات بناءها |

توجد 325 ورقة مرتبطة بنوع Places متحقق من snapshot؛ البقية مفاهيم بحث داخلية.
`mappingRelation` يميز الربط الأوسع/المرادف من التطابق. مثل «مسجد تاريخي»
يرتبط بمفهوم المسجد مع وصف بحث `heritage=true, verified=false`؛ هذا الوصف
ليس إثباتًا أن المكان المكتشف تاريخي. لا نختلق GCID من اسم أو slug.

## شكل البيانات واستخدامها

كل مفهوم يحمل `canonicalId`, `googlePlaceType|null`, `googleGcid|null`,
`labels`, `aliases`, `groupId`, `parentId`, `symbolId`, `legacyLeafIds`,
`attributeSchema`, `osmTags`, `osmMapping`, `countryAvailability`.
`groupId/parentId` تنظيم DALIL؛ `providerGroup` مجموعة جدول Google الوصفية.

`osmTags` قائمة شروط متزامنة `{key,value}`، ومصدر الربط ومعناه في
`osmMapping`. مثل المسجد: `amenity=place_of_worship` و`religion=muslim`.
هذه علاقة دلالية لمزايا OSM الموسومة، وليست مطابقة بين قاعدتي بيانات.
ربط المدرسة الابتدائية/الثانوية بـ`amenity=school` أوسع من المطلوب؛ يلزم
التحقق من مستوى التعليم بعد الجلب. [مرجع الوسم](https://wiki.openstreetmap.org/wiki/Tag:amenity=school).

```js
TaxonomyEngine.getLocalizedLeaf('S01.B01.L01', 'en'); // Mosque
TaxonomyEngine.getLocalizedLeaf(leafObject, 'ar');
TaxonomyEngine.getLocalizedLeaf(arabicName, 'en', branchId);
TaxonomyEngine.resolveConcept('جامع'); // canonical category, or null if ambiguous
TaxonomyEngine.rankTerminology('hospitl'); // suggestion requiring review
TaxonomyEngine.getCategory('google_places:mosque');
TaxonomyEngine.auditRegistry();
```

للمتصفح/worker يجب تحميل `category-registry.js` قبل `taxonomy-engine.js`.
في Node يحمّله taxonomy باستخدام CommonJS. الواجهة العامة
`DalilCategoryRegistry.resolveConcept/getCategory/rankCandidates` تشير إلى
المستودع الذي أنشأه taxonomy؛ لا تنشئ نسخة بيانات أخرى.

استخدم leaf ID أو object في العرض؛ «محطة شحن» تعني Charging station في
قطاع الكهرباء وCargo terminal في قطاع اللوجستيات. الاسم الخام الملتبس
لا يختار مفهومًا تلقائيًا. «زاوية» تتطلب مراجعة حتى مع معرفة البلد.
تعارض `cafeteria/cafetería` بين اللغات كذلك يرجع مرشحين للمراجعة.

## خطة البحث واللغة

`buildQueryPlan` يقبل `searchLanguage/queryLanguage` بوسم BCP47 مستقلًا عن
`uiLanguage/language`. العربية الافتراضية. التسميات الكاملة متاحة ar/en؛
غياب مصطلح بلغة أخرى يسجّل `missingTranslations` ويوقف صلاحية الخطة
الشاملة للتنفيذ. لا يستخدم الإنجليزية إلا مع `fallbackLanguage:'en'`
صريح أو اختيارها لغة إضافية. يوجد subset مصطلحات بحث من ترجمات iD في
سبع نسخ لغوية، وaliases محلية؛ ليست ترجمة كاملة لكل التصنيفات.
تفاصيل العقد والمصادر في `SEARCH_LANGUAGES_API.md`.

المسار comprehensive يحتفظ بكل leaf مع query ID فعّال، ويربط جميع الأوراق
ذات النص المكرر بالاستعلام المشترك. المساران balanced/fast يصرّحان
`represented` و`not_scheduled`؛ لا يقدمان عددًا تمثيليًا على أنه تنفيذ شامل.
معرّفات الخطط والاستعلامات مستقرة للمدخلات نفسها. النص الحر محفوظ كما أدخله المستخدم.

## الأدلة والحدود

`node test/test_taxonomy_registry.js` يتحقق من 940 معرّفًا وترجمة، snapshot
رسمي، فصل GCID/attributes، alias بلغات ثمانٍ، التباس النصوص، وعدم التصنيف
التلقائي للأخطاء الإملائية، وcoverage لكل ورقة، وsymbols بلا تعارض IDs.
يتحقق أيضًا من تحميل scripts نفسها في VM يشبه worker بلا CommonJS.
هذا اختبار محلي؛ لا يثبت نتائج Google الحية أو توافر فئات GBP في دولة.

تغطية عربية للعرض ليست مكتملة لكل الأنواع الرسمية الإضافية غير الموجودة
في الشجرة القديمة؛ `labels.ar=null` معلن لها بدل اختلاق ترجمة. الواجهة
تستخدم أوراق DALIL المترجمة، ويمكن توسيعها تدريجيًا بمراجعة تسميات موثقة.

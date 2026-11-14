# لغات البحث — API التنفيذ

`core/search-languages.js` يفصل لغة البحث عن لغة الواجهة وعن لغة أسماء الأماكن
الأصلية. يقبل وسم BCP 47 كاملًا، بما فيه script/region/variants/extensions،
ولا يحوّل لغة غير متاحة إلى الإنجليزية تلقائيًا. يحمّل قبل taxonomy-engine.js
في المتصفح وworker؛ يستورده taxonomy باستخدام require في Node.

```js
SearchLanguages.normalizeLocale('sr-latn-rs'); // sr-Latn-RS
SearchLanguages.normalizeLocale('zh-Hant-TW');
SearchLanguages.getCatalog('google_maps_platform');
SearchLanguages.listProviderLanguages('google_maps_platform', 'ar');
SearchLanguages.describeLocale('fr-CA', 'osm_overpass');
SearchLanguages.createFreeText('  مُسْتَشْفَى  ', 'fr-CA');
```

المعيار: [RFC 5646 / BCP 47](https://www.rfc-editor.org/rfc/rfc5646).
يتحقق normalizeLocale من البنية ويستخدم Intl canonicalization عند دعمها؛
يعالج private use وبعض grandfathered tags التي لا تقبلها Intl. ليس هذا
نسخة كاملة من سجل IANA ولا إثباتًا أن كل وسم صحيح البنية تدعمه خدمة معينة.
قيمة غير صحيحة مثل `en_US` ترمي خطأ `INVALID_LOCALE`؛ لا يوجد استبدال صامت.

## التخطيط

```js
TaxonomyEngine.buildQueryPlan({
  selectedLeaves: ['google_places:mosque', 'S01.B01.L03'],
  searchLanguage: 'de-DE',
  uiLanguage: 'ar',
  queryTerms: {
    'S01.B01.L03': { 'de-DE': ['Große Moschee'] }
  },
  fallbackLanguage: null,
  additionalSearchLanguages: []
});
```

`selectedLeaves` تقبل معرّفات القطاعات والفروع والأوراق والمفاهيم الحالية.
للتوافق تستمر الأسماء العربية/الإنجليزية الخام في معنى selection القديم.
للنص الحر استخدم object صريحًا، فهو يتجاوز بحث الفئات حتى لو طابق معرّفًا
أو مرادفًا معروفًا:

```js
const free = SearchLanguages.createFreeText('  مسجد  ', 'fr-CA');
TaxonomyEngine.selectionId(free); // object normalized locale, original text intact
TaxonomyEngine.selectionKey(free); // stable key for comparisons/storage
TaxonomyEngine.buildQueryPlan({ selectedLeaves: [free] });
// One query, text === '  مسجد  ', lang === 'fr-CA'; no translation or script guessing.
```

`freeTextQueries` بديل يقبل strings أو free_text objects. لا تغيّر
`selectionId` النص الحر إلى canonical ID. تُحفظ المسافات والتشكيل وحالة
الأحرف في النص الأصلي؛ التحقق من المصطلح الفارغ لا يغيّر قيمته.

ترتيب اختيار المصطلح: `queryTerms[leafId][locale]` ثم
`queryTerms[canonicalId][locale]`، ثم label بلغة الطلب أو parent locale من
نفس اللغة، ثم مصطلح مصدر محلي أو alias موثّق. الأولوية دائمًا للـleaf عند
وجود override. لا يُستبدل وسم كتابة مثل `zh-Hant` بـ`zh-Hans`؛ علاقة
parent locale تسجل `localeMatch`، وتحافظ query.lang على وسم الطلب الكامل.

الورقة الوصفية مثل «مسجد كبير» لا تتحول إلى ترجمة «مسجد» العامة. عند غياب
مصطلح لتفصيل الورقة، تسجل ترجمة مفقودة حتى يقدّم المستخدم override أو
يختار fallback. لا توجد ترجمة دلالية مولّدة وقت التشغيل.

كل query تحوي `text`, `lang`, `termLocale`, `requestedLocale`,
`termSource`, `sourceUrl`, `sourceBlobSha`, `localeMatch`, `explicitFallback`,
`targetLeaves`, `canonicalIds`. ينبغي أن يمرر المحرك metadata نفسها إلى
adapter بدل إعادة استنتاج الفئة أو اللغة من النص وحده.

## النقص والاستبدال الصريح

تعيد الخطة `missingTranslations` و`unresolvedTranslations` و`fallbacks`.
تبقى الأوراق الـ940 ومعرّفاتها في coverageMap؛ الورقة غير القابلة للبحث
تسجل `status='missing_translation'` ولا تحصل على استعلام إنجليزي مخفي.
`executable=false` ما دام نقص في اللغات المطلوبة غير محلول. لا تبدأ
الخلفية خطة شاملة في هذه الحالة دون إجراء واضح من المستخدم.

`fallbackLanguage:'en'` يجيز الاستبدال صراحةً. يبقى السبب واللغة المطلوبة
واللغة المنفذة في metadata. اختيار لغة إضافية يتم عبر
`additionalSearchLanguages:['en']`. يحافظ `bilingualEnabled` على اختيار
AR/EN القديم للفئات عند اختيار AR أو EN؛ لا يضيف الإنجليزية لطلب DE/FR
أو إلى النص الحر تلقائيًا.

## مصادر اللغات والمصطلحات

كتالوج Google يضم 82 رمزًا من [قائمة Maps JavaScript API الرسمية](https://developers.google.com/maps/documentation/javascript/localization#SupportedLanguages)،
آخر تحديث للصفحة 2026-11-09 واسترجاع 2026-11-14. القائمة ليست حصرًا لكل
اللغات المستقبلية، ولا تثبت دعم Google Maps DOM لكل `hl`؛ لهذا الأخير
`providerSupported=null` و`unverified_dom_language_support`.

Overpass لا يملك parameter لترجمة النتائج. [نموذج أسماء OSM متعددة اللغات](https://wiki.openstreetmap.org/wiki/Names#Localization)
يوضح `name:locale`؛ descriptor يسجّل `resultLanguageGuaranteed=false` ويعطي
nameTagCandidates، ولا يزعم أن الاسم المحلي الأساسي هو بلغة الطلب.

المصطلحات المحلية المستوردة 105 فقط: 15 نوعًا أساسيًا × سبع نسخ لغوية، من
ترجمات [iD tagging-schema](https://github.com/openstreetmap/id-tagging-schema).
هذه مصطلحات بحث محلية من مخطط OSM، وليست تسميات Google رسمية.
الترخيص ISC موجود في `docs/TAXONOMY_OSM_LICENSE.md`. لم تُضمّن حزم ترجمة
iD الكاملة؛ دُمج subset فقط في BASIC_TERMS، مع المصدر وpreset وblob SHA.

| النسخة | ملف المصدر | blob SHA |
| --- | --- | --- |
| de | dist/translations/de.json | 3fd81b247168b8af7be05b282905754862cb1220 |
| fr | dist/translations/fr.json | 461668da13b5e7992de88f3cff919d33f913cc0a |
| es | dist/translations/es.json | 53585ffc561c4d1c9163baf8f274a31fc233b198 |
| zh-Hans | dist/translations/zh-CN.json | 8282b5b3c8409f411b2d178b0ca1aac44ce8d65f |
| zh-Hant | dist/translations/zh-TW.json | e794c6d032ff610639e76c0680475e78cfd9dd18 |
| ja | dist/translations/ja.json | 6517b4b8834782eb7267f1cdd2cf3e7761511d48 |
| pt-BR | dist/translations/pt-BR.json | 0e1d43b50b7b8003499647831c4a46362e3c4086 |

الـaliases السابقة ar/en/fr/es/pt/hi/zh/ja تظل متاحة بصفتها aliases محلية.
فُحص ملف iD الهندي أيضًا لكنه لم يوفّر تسميات هذه الأنواع الخمسة عشر، فلم
نختلق أسماء أو ننسب aliases الهندية إلى ذلك المصدر.

`node test/test_search_languages.js` يختبر BCP47، النقص الصريح، fallback
بإذن، overrides، 940 ورقة، script/region، عدم تجاوز التباس المصطلحات،
والنص الحر الحرفي حتى إذا كان `S01` أو `google_places:mosque`.

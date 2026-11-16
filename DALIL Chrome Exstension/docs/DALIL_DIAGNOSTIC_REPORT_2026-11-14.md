# تقرير تشخيصي شامل لإضافة **دَلِيل (DALIL)**

> **الإصدار المفحوص:** `manifest.json` → `2.1.0`
> **آخر التزام (commit):** `ab16fa0` + 16 ملفًا معدّلًا غير مُلتزم به
> **تاريخ الفحص:** 2026-11-14
> **نوع الفحص:** مراجعة كود ساكنة (Static Audit) + مراجعة أدلة الاختبارات + عيّنة تشغيل حقيقية واحدة (`.tmp/live-fayoum/report.json`)
>
> **ملاحظة على المراجع:** أرقام الأسطر في الأقسام 1–8 تشير إلى حالة الكود **قبل** تنفيذ الإصلاحات. راجع القسم 10 للحالة بعد التنفيذ والأرقام المحدَّثة.

---

## 0. ملخص تنفيذي

الأداة **هندسيًا سليمة البنية** (طبقات واضحة: `content` ← `background` ← `core` ← `lib` ← `dashboard`)، والاختبارات الآلية **ناجحة بالكامل (30/30 + 25/25 + بقية المجموعات)**. لكن هناك فرقًا كبيرًا بين «نجاح الاختبارات» و«نجاح الأداة فعليًا على خرائط جوجل»، والسبب في ذلك أن معظم الاختبارات تعمل على **بيانات صناعية (fixtures) وواجهات وهمية (mocks)** لا تلمس DOM الحقيقي لخرائط جوجل.

أهم ثلاث نتائج:

| # | النتيجة | الأثر |
|---|---------|-------|
| 1 | **لا يمكن تصدير أي معلم قادم من Google Maps إطلاقًا** — الكود يضع `exportAllowed: false` لكل سجل Google، ثم يمنعه عند التصدير | المستخدم يجمع بيانات ثم يجد ملفًا فارغًا/رسالة خطأ. هذه ليست «علة» عرَضية بل **تعارض مقصود في التصميم** بين وعد الواجهة وقيود المصدر |
| 2 | **إعادة تشغيل المتصفح تمسح كل المعالم المحفوظة** عبر `chrome.runtime.onStartup` | فقدان كامل للبيانات، ويتناقض مع ادّعاء «الاستعادة بعد إعادة التشغيل» في ملفات التوثيق والأدلة |
| 3 | **فلتر مكاني صارم + تحسين تكراري (refinement) غير محدود عمليًا** | عيّنة حقيقية: **120 بطاقة مُرصودة → سجل واحد محفوظ فقط**، وحالة الخلية `partial` رغم أن البحث «اكتمل». شبكة 25 خلية قد تستغرق ساعات |

---

## 1. كيف تعمل الأداة (دورة العمل الكاملة)

### 1.1 خط الأنابيب

```
المستخدم (dashboard.html)
   │  اختيار المنطقة (BBox / Polygon / MultiPolygon)
   │  اختيار الظواهر (phenomena) + وضع خطة الاستعلامات
   ▼
lib/taxonomy-engine.js  →  buildQueryPlan()
   │  يحوّل الاختيار إلى قائمة استعلامات (queries) بلغات متعددة
   │  + canonicalIds + تغطية (coverage) لكل ورقة تصنيف
   ▼
lib/spatial-utils.js  →  توليد شبكة الخلايا (mesh) داخل المنطقة
   ▼
background/background.js  →  scraperState (cells, queriesToRun, currentIndex…)
   │  processQueueStep()  ←  مدفوع بـ chrome.alarms + setTimeout
   ▼
فتح/إعادة استخدام تبويب عامل (worker tab) على رابط بحث مُعدّ مسبقًا
   │  الرابط يحتوي nonce مشفّرًا في الـhash:  #dalil={jobId,cellId,queryId}
   ▼
content/content.js  →  PREPARE_TASK
   │  التحقق من هوية المهمة + التحقق من الكاميرا + مطابقة نص البحث
   ▼
التمرير الذكي (smartAutoScrollFeed) + MutationObserver
   │  استخراج البطاقات → extractPlacesFromFeed()
   │  فلترة مكانية أولية (isPlaceInStudyOrCell)
   ▼
background  →  PlaceRecords.normalize()  →  recordIndex (توحيد/دمج/إزالة تكرار)
   │  التحقق المكاني مرة ثانية + findOwnerCell + تصنيف taxonomy
   ▼
حفظ في chrome.storage.local (scraperState.results)
   ▼
dashboard: GET_RESULTS_PAGE (صفحات 1000)  →  جدول + خريطة Leaflet
   ▼
التصدير: core/export-worker.js → lib/export-utils.js
   (GeoJSON / KML / KMZ / SHP / XLSX / CSV / JSON)
```

### 1.2 العقود الأساسية بين الطبقات

| العقد | الملف | الوصف |
|-------|-------|-------|
| `PREPARE_TASK` | `content/content.js:72-110` | لا تعمل المهمة إلا إذا تطابقت `jobId/cellId/queryId/areaVersion` مع الـnonce في الرابط |
| `COLLECT` | `content/content.js` (handlers) | يعيد `{success, items, completenessStatus}` — والحالة هي `complete/partial/capped/confirmed_empty/unknown` |
| `recordIndex` | `core/records.js` | `RecordIndex` يوحّد السجلات ويمنع التكرار |
| `exportAllowed` | `core/source-adapters.js:9-16` | خاصية لكل مصدر تحدد أهلية التصدير القانونية |
| خطة الاستعلامات | `lib/taxonomy-engine.js:3420-3480` | `comprehensive` = كل الأوراق، `balanced/fast` = حد أقصى مُقتطع |

### 1.3 دورة حياة المهمة في `background.js`

1. `START_SCRAPE` → بناء الحالة، `status = running`.
2. `scheduleQueue()` → `chrome.alarms` (استيقاظ دائم) + `setTimeout` (استجابة سريعة) — `background.js:162-169`.
3. `processQueueStep()` → يختار الخلية والاستعلام الحالي، يبني الرابط، يفتح/يعيد استخدام التبويب.
4. `COLLECT` → استخراج → تطبيع → دمج.
5. `searchViewOutcome()` → يحدد حالة الخلية → `refineSearchView()` قد يولّد 4 مشاهد فرعية.
6. عند اكتمال كل الخلايا لاستعلام ما → `queryStats` + `completedQueries` → الانتقال للاستعلام التالي.
7. عند نهاية الكل → `finishJob()`.

---

## 2. أسباب فشل عمليات البحث

### 2.1 الفلتر المكاني الصارم يُسقط معظم النتائج (السبب الأكبر)

**الموقع:** `content/content.js:217-240` (الفحص الأول) + `background/background.js:871-880` (الفحص الثاني)

```js
// content.js:225-237
if (cellInfo.studyArea)  return SpatialUtils.isPointInStudyArea(x, y, cellInfo.studyArea);
if (cellInfo.studyAreaBounds) return isWithinCellBounds(x, y, cellInfo.studyAreaBounds, 0);
if (cellInfo.bounds) return isWithinCellBounds(x, y, cellInfo.bounds, 0);
```

**المشكلة:** الفلتر يُطبَّق على **نتائج بحث Google** لا على بيانات مستوردة. وخرائط جوجل تُرجع نتائج «قريبة من» مركز البحث، وليس «داخل» مستطيل الخلية. لذلك تُحذف البطاقات قبل أن تصل إلى `background` أصلًا.

**الدليل الحقيقي:** `.tmp/live-fayoum/report.json`:

```json
{ "cards": 120, "newCount": 1, "outsideCount": 0, "cellStatus": "partial" }
```

`outsideCount = 0` هنا **ليس دليلًا على عدم وجود إسقاطات**، بل دليل على أن الإسقاط حدث داخل `content.js` **قبل** أن تُحتسب في `background`. أي أن **خسارة البيانات غير مرئية في التشخيص** — وهذا يجعل استكشاف الأخطاء شبه مستحيل.

**الإصلاح المقترح:**
- احذف الفلتر الصارم من `content.js` أو اجعله **تسجيلًا فقط** (`qualityFlags: 'outside_cell'`).
- اجعل `background` هو الجهة الوحيدة التي تقرر الملكية عبر `findOwnerCell`، مع حفظ الخارجيين في `discoveryCellIds` بدل إسقاطهم.
- أضف عدّاد `contentFiltered` إلى الاستجابة، ليظهر في اللوحة «كم بطاقة أُسقطت ولماذا».

---

### 2.2 التحقق من الكاميرا مُعطَّل فعليًا

**الموقع:** `content/content.js:82-90`

```js
const view = DalilSearchNavigation.verify(current.href, target.href, searchValue, 50000); // 50 كم!
if (!view.verified) {
  if (view.queryVerified) { view.verified = true; view.centerVerified = true; }  // تجاوز كامل
  else throw ... 'NAVIGATION_VIEW_MISMATCH';
}
```

ثلاث ثغرات متراكبة:

1. **هامش 50,000 متر** = 50 كم. عمليًا أي مكان في نفس المحافظة يُعتبر «مطابقًا».
2. **`if (view.queryVerified)`** يرقّي الحالة إلى `verified=true` و`centerVerified=true` **مهما كان الخطأ في المركز**. وبما أن مطابقة نص البحث تنجح عادةً (لأن الرابط نفسه يحمل النص)، فالشرط الثاني هو الذي يُنفَّذ دائمًا.
3. **`verifyPreparedCamera()` في `content.js:30-38`** يعيد `{verified:true, centerVerified:true}` عند أي استثناء — أي أن «الفشل» يُفسَّر على أنه «نجاح».

**النتيجة:** قد تُجمع نتائج من حيٍّ آخر تمامًا وتُنسب إلى الخلية المطلوبة، أو يُعاد مسح نفس المشهد عدة مرات دون اكتشاف ذلك.

**الإصلاح:**
- تقليل الهامش إلى ما يعادل نصف قطر الخلية (مثلًا `min(cellDiagonal/2, 150)` متر) بدل ثابت 50000.
- حذف فرع الترقية `queryVerified → verified` نهائيًا.
- في `catch` أعِد `null` أو `{verified:false}` — لا `true`.

---

### 2.3 انفجار التحسين التكراري (Refinement Explosion)

**الموقع:** `background/background.js:752-764`

```js
function refineSearchView(scan, outcome) {
  if (scan.depth >= 2 || outcome === 'confirmed_empty') return [];
  ...
  if (span < 0.002 || !(['partial','capped','unknown'].includes(outcome) || span > 0.02)) return [];
  return [ /* 4 مشاهد فرعية */ ];
}
```

وبما أن `content.js:327` يعيد `partial` لأي مسح غير فارغ لا يجد علامة نهاية صريحة (`span.HlvSq` وغيرها من المحددات الهشّة)، فإن **كل خلية تقريبًا** تدخل شجرة التحسين:

```
1 جذر + 4 أبناء + 16 حفيد = 21 مشهدًا لكل (خلية × استعلام)
```

مع حد أدنى `minDelayMs = 2500` مللي ثانية لكل محاولة (`core/source-adapters.js:14`) + زمن الملاحة + زمن التمرير → **خلية واحدة قد تستهلك 10–20 دقيقة**، وشبكة 25 خلية × عدة استعلامات تصل إلى **ساعات**.

**الإصلاح:**
- لا تُحسِّن إلا عند وجود **دليل** على وجود نتائج مقتطعة (`capped`) أو عند تجاوز حد نتائج Google (~120) — لا عند `partial` المجهولة.
- استخدم **دليل النص** (عدد البطاقات المرصودة) لا حالة غير معروفة.
- اضبط ميزانية زمنية لكل خلية (deadline) وتوقف عندها بحالة `capped` صريحة.

---

### 2.4 عنق الزجاجة في التمرير والمراقبة (CPU + زمن)

**الموقع:** `content/content.js:792-820` و`316-321`

```js
const maxScrollAttempts = Math.min(1000, Math.max(40, maxItems + 20)); // 798
const observer = new MutationObserver(harvestBatch);                    // 316
observer.observe(feed, { childList: true, subtree: true });            // 317
```

- `maxItems = 120` → **120 محاولة تمرير** كحد أدنى، بفاصل `sleep(1100)` تقريبًا → **أكثر من دقيقتين** لكل مشهد، وضربها في 21 مشهدًا = كارثة زمنية.
- `MutationObserver` يستدعي `harvestBatch()` **عند كل طفرة DOM**. خرائط جوجل تُحدّث DOM باستمرار أثناء التمرير → مئات الاستدعاءات في الثانية، وكل استدعاء يمر على كل البطاقات ويبني خريطة جديدة. هذا سبب مباشر للتجمّد (jank) وارتفاع CPU.
- محددات نهاية القائمة (`span.HlvSq`، `end of list`…) **هشّة وتتغير مع تحديثات جوجل** → لا يتم اكتشاف النهاية → استمرار التمرير حتى الحد الأقصى.

**الإصلاح:**
- استخدم **debounce/throttle** للمراقب (مثلًا 250 مللي ثانية) أو `requestIdleCallback`.
- اكتشاف النهاية عبر **عدم تغيّر ارتفاع/عدد العناصر لعدة دورات** (وهو موجود جزئيًا لكن بحدود عالية).
- خفّض `maxScrollAttempts` واعتمد على إشارات «لا مزيد من النتائج».

---

### 2.5 الوضع الافتراضي «متوازن» يقتطع التغطية بصمت

**الموقع:** `dashboard/dashboard.html:487` + `lib/taxonomy-engine.js:3463-3465` + `background/background.js:647`

```html
<option value="balanced" selected>متوازن (Balanced) — استخراج متوازن وتجميع ذكي</option>
```

```js
const limit = Math.max(1, Number(options.maxQueries) || (mode === 'fast' ? 8 : 16));
const buckets = [...groups.values()];
for (let i = 0; i < Math.min(limit, buckets.length); i++) scheduleLeaf(buckets[i][0], buckets[i], 'representative');
```

مع `maxQueries` الافتراضي 8 في `background.js:647`، تُختصر خطة 31 قطاعًا / 114 فرعًا / 940 ورقة إلى **8 استعلامات تمثيلية فقط**. التغطية تُسجَّل `not_scheduled`، لكن المستخدم لا يرى تحذيرًا واضحًا أن النتيجة **ناقصة بالتصميم**.

**الإصلاح:**
- اجعل `comprehensive` هو الافتراضي، أو اعرض تحذيرًا صريحًا: «سيتم فحص 8 من 114 فرعًا».
- أظهر نسبة التغطية في الـHUD بعد انتهاء المهمة.

---

### 2.6 مشاكل المطابقة في `manifest.json` (نطاق الحقن)

**الموقع:** `manifest.json:13-20, 32-42`

```json
"https://*.google.com/maps/*"
```

| النمط | يطابق | لا يطابق |
|-------|-------|----------|
| `https://*.google.com/maps/*` | `www.google.com/maps/...` | `https://www.google.com/maps` (بدون `/` أخير) |
| — | — | `https://maps.google.com/?cid=...` (تم تغطيته بنمط منفصل، لكن بدون مسار `/maps`) |
| — | — | `https://www.google.com.eg/maps/...` (نطاقات إقليمية) |
| — | — | صفحات الموافقة (consent) التي تعترض قبل الخريطة |

**الأثر:** الحَقن يفشل بصمت، و`chrome.tabs.sendMessage` يعيد خطأ «Receiving end does not exist»، وتظهر المهمة كـ«عالقة» أو تُعاد المحاولة بلا نهاية.

**الإصلاح:** استخدم `"https://*.google.com/*"` و`"https://*.google.com.eg/*"` (أو `<all_urls>` مع تحقق داخلي)، وأضف **إعادة حقن برمجية** عبر `chrome.scripting.executeScript` عند فشل الاتصال.

---

### 2.7 حاجز إعادة الحقن يمنع التعافي

**الموقع:** `content/content.js:10-11`

بعد إعادة تحميل الإضافة (Reload Extension) تبقى الصفحة محمّلة، لكن الـcontent script القديم «ميت» (سياق معزول منفصل). الحاجز يمنع الحقن الجديد → **الصفحة لا تستجيب أبدًا** حتى يُعاد تحميلها يدويًا.

**الإصلاح:** اجعل الحاجز مرتبطًا بـ`chrome.runtime.id` + رقم إصدار، أو احذفه واعتمد على `addListener` الذاتي و`dispose` صريح.

---

### 2.8 احتمالية إيجابيات كاذبة في `detectSourceBlock`

**الموقع:** `content/content.js:39-46` ويُستدعى عند كل `sleep` عبر `assertActive` (`content.js:25-28`)

```js
if (document.querySelector('iframe[src*="recaptcha"], form[action*="/sorry/"], #captcha-form') || ...)
```

خرائط جوجل **تُضمّن reCAPTCHA في بعض الصفحات بشكل طبيعي** (مثلًا نماذج الإبلاغ عن مشكلة أو تسجيل الدخول)، وأي إطار `recaptcha` مخفي كافٍ لإيقاف المهمة بحالة `SOURCE_BLOCKED` نهائيًا، دون إعادة محاولة.

**الإصلاح:** تحقق من **الظهور الفعلي** (`offsetParent !== null` + الأبعاد > 0) + وجود نص الحظر، ولا تعتمد على وجود العنصر وحده. وأضف إعادة محاولة واحدة قبل الإيقاف النهائي.

---

### 2.9 مشاكل الواجهة التي تجعل النجاح يبدو فشلًا

**الموقع:** `dashboard/dashboard.js:2368-2382` و`2360-2363`

```js
partial: count>0 ? "مكتملة" : "خالية",
capped:  count>0 ? "مكتملة" : "خالية",
unknown: count>0 ? "مكتملة" : "خالية",
```

و:

```js
const defs = DalilGridPresentation.definitions.filter(d => d.id !== 'partial' && d.id !== 'unknown');
```

**الأثر:** خلية نتيجتها الحقيقية «جزئية» تظهر في الواجهة **«مكتملة»**، ويُخفى مفتاحها من الـlegend. المستخدم يبني قرارًا على تغطية وهمية. هذه أخطر مشكلة **من ناحية الثقة** لأنها تُخفي المشكلة بدل عرضها.

---

### 2.10 تجمّد محتمل في تحديث النتائج (livelock)

**الموقع:** `dashboard/dashboard.js:2297-2305`

```js
if (!page || !page.success || page.resultsRevision !== revision) {
  resultsDirty = true;
  if (page?.errorCode === 'RESULTS_CHANGED' || ...) refreshQueued = true;
  return;
}
```

أثناء مهمة نشطة، `resultsRevision` يتغيّر باستمرار. إذا تغيّر بين الصفحة الأولى والثانية، تُلغى الدورة كاملة وتُعاد من الصفر → **حلقة لا تنتهي** طالما المهمة تعمل، والجدول لا يتحدث أبدًا.

**الإصلاح:** اعتمد على **snapshot ثابت** (تمرير `resultsRevision` من البداية، ورفض الكتابة فقط لا القراءة)، أو استخدم `resultsRevision` عند التوقف فقط، أو اسمح بدمج جزئي مع إعادة محاولة محدودة (exponential backoff).

---

## 3. أسباب فشل حفظ وتصدير المعالم

### 3.1 العلة الجذرية: `exportAllowed: false` لمصدر Google

**الموقع:** `core/source-adapters.js:14-16`

```js
google_maps_dom: Object.freeze({ id: 'google_maps_dom', name: 'Google Maps', canCollect: true, minDelayMs: 2500,
  exportAllowed: false, license: 'Google Maps terms; no general bulk extraction/export grant',
```

تنتقل الخاصية إلى السجل:

```js
// core/records.js:34
license: item.license || context.license || 'unspecified', exportAllowed: context.exportAllowed === true,
// core/records.js:37
record.exportAllowed = context.exportAllowed === true;
```

ثم تُمنع مرتين عند التصدير:

```js
// lib/export-utils.js:341
if (item.exportAllowed === false || rights.exportAllowed === false) return 'source_export_restricted';
// lib/export-utils.js:348
if (providers.some(p => /\bgoogle(?:[_\s-]*(?:maps|places))?|خرائط\s*جوجل/i.test(String(p || '')))) return 'google_content_export_restricted';
```

ثم يفشل العامل بلا رحمة:

```js
// core/export-worker.js:9-10
const selection = ExportUtils.selectExportRecords(records, categoryFilter);
if (!selection.included.length) throw new Error(ExportUtils.messages(options).empty);
```

**الخلاصة:** أي مسار «جمع من Google → تصدير» **مصمَّم ليفشل**. السجلات موجودة في الجدول والخريطة، لكنها **غير قابلة للتصدير بنسبة 100%**. المستخدم يرى بيانات، ثم يحصل على «لا توجد سجلات للتصدير».

وهذا **ليس خطأً برمجيًا** بالمعنى الدقيق: هو التزام قانوني مقصود (شروط استخدام خرائط جوجل تمنع الاستخراج المجمّع). لكنه **خطأ منتج** لأن الواجهة لا تخبر المستخدم بذلك مسبقًا ولا تقدّم بديلًا.

**الحلول الممكنة (مرتبة حسب الجدوى):**

| الخيار | الوصف | الأثر |
|--------|-------|-------|
| **A. الفصل الصريح** | علّم سجلات Google بشارة «معاينة فقط – غير قابلة للتصدير»، وأظهر عدّادًا: «120 سجلًا، 118 مقيّد». اسمح بتصدير **مشتقات** (إحصاءات، حدود، تغطية) بلا إحداثيات | يحل الغموض فورًا، ويحافظ على الامتثال |
| **B. مصدر بديل مرخّص** | OpenStreetMap / Overpass (موجود فعلًا `exportAllowed: true`) + Overture Maps | تصدير قانوني كامل |
| **C. Google Places API الرسمي** | استخدام `places.googleapis.com` وفق شروط الترخيص (يتطلب مفتاحًا ودفعًا، ويسمح بتخزين محدود وفق سياسة Google) | الطريق «الرسمي» الوحيد لبيانات Google قابلة للاستخدام |
| **D. استيراد المستخدم** | مسار `user_import` موجود ويعمل (`export-utils.js:342`) — المستخدم يرفع ملفه الخاص | مسار تصدير مضمون للاختبار |

**عيب فادح مساند:** الاختبارات لا تغطي المسار الحقيقي. `test_export_integrity.js:28` و`test_export_worker.js:16` تستخدم `provider: 'osm_overpass'` مع `exportAllowed: true` — أي أن **مسار «Google → تصدير» لم يُختبر ولا مرة واحدة**. لذلك بقي العيب خفيًا رغم نجاح 30/30.

---

### 3.2 إعادة تشغيل المتصفح تمسح كل شيء

**الموقع:** `background/background.js:90-118` (كود غير مُلتزم به بعد)

```js
chrome.runtime.onStartup.addListener(async () => {
  await stateReady;
  scraperState.status = "idle";
  scraperState.results = [];          // ← حذف كل المعالم
  scraperState.seenIds = new Set();   // ← حذف فهرس التكرار
  scraperState.currentIndex = 0;
  scraperState.stats = { ... itemsFound: 0 ... };
  ...
  await saveState(true);
});
```

**التناقض الصريح:** ملف `docs/evidence/survey-reliability-2026-11-14.json` يعلن `"verifiedAfterBrowserRestart"`، و`test/test_survey_regressions.js` لا يحتوي أي مرجع لـ`onStartup` (بحث نصي: المرجع الوحيد في `background.js`). أي أن الادّعاء **غير مُختبَر**.

**الإصلاح الفوري:** احذف هذا المستمع، أو قيّده بحذف **الجلسة النشطة فقط** (`status`, `currentIndex`, `workerTabId`) مع الإبقاء على `results` و`seenIds`. إن كان الهدف «بداية نظيفة»، فليكن خيارًا صريحًا في الواجهة («مسح الجلسة السابقة») لا سلوكًا تلقائيًا.

---

### 3.3 ضغط التخزين: كتابة النتائج كاملة عند كل نقطة تحقق

**الموقع:** `background/background.js:136-150`

```js
const serialized = JSON.parse(JSON.stringify({ ...scraperState, seenIds: Array.from(scraperState.seenIds) }));
chrome.storage.local.set({ scraperState: serialized });
```

كل `saveState()` ينسخ **كل** `results` (نسخة عميقة عبر JSON) ويكتبها في `chrome.storage.local` (وهو ليس مخزنًا مناسبًا لعشرات الآلاف من السجلات، وله حدود أداء واضحة). مع `debounce` 400 مللي ثانية فقط، فإن جمع 5000 معلم سيؤدي إلى:

- استهلاك CPU عالٍ في worker الخلفية (وهو **service worker** قد يُوقف من المتصفح).
- تضخّم مساحة التخزين و`unlimitedStorage` لا يحل مشكلة السرعة.
- خطر `QuotaExceededError` عند التصدير المتزامن.

**الإصلاح:** انقل `results` إلى **IndexedDB** (مع فهارس على `canonicalId` و`cellId`)، واحفظ في `chrome.storage.local` الحالة الصغيرة فقط (`status`, `stats`, `revision`). هذا هو النمط الموصى به في مهارة `spatial-survey-persistence-guard` الموجودة في المشروع.

---

### 3.4 تعارض أسماء الحقول بين الواجهة والخلفية

**الموقع:** `background/background.js:215` مقابل `dashboard/dashboard.js:1550, 1557-1560`

```js
// background.js — عند reset
...(reset ? { savedTargetPhenomena: [], savedConfig: null } : {})
```

```js
// dashboard.js — يقرأ ويكتب
chrome.storage.local.set({ savedPhenomena: targetPhenomena });
chrome.storage.local.get(["workspaceState", "savedStudyArea", "savedCells", "savedPhenomena", ...]);
```

**الأثر:** عند إعادة ضبط مساحة العمل، تُنظَّف `savedTargetPhenomena` (مفتاح لا يقرأه أحد) ويبقى `savedPhenomena` كما هو → الظواهر القديمة «تلتصق» بالمشروع الجديد، أو تختفي بلا سبب حسب المسار.

**الإصلاح:** مفتاح واحد موحّد (`savedPhenomena`) عبر طبقة `core/workspace-state.js`، مع اختبار وحدة يغطي `reset`.

---

### 3.5 دمج السجلات قد يخلط أماكن مختلفة

**الموقع:** `core/records.js` (منطق `RecordIndex` / الدمج)

قاعدة الدمج تعتمد على مسافة ~25 مترًا + تطابق/تشابه الاسم. في المناطق الكثيفة (مول تجاري، شارع تجاري) قد يكون مسجد ومركز تجاري على 25 مترًا بنفس الاسم التقريبي → **دمج خاطئ يُفقد سجلًا صحيحًا**. كما أن السجلات بلا إحداثيات (`x=null`) تُدمج أحيانًا بالاسم فقط.

**الإصلاح:** أضف مفاتيح هوية أقوى أولًا (`place_id`, `cid`, `google_feature_id`) ولا تدمج بلا هوية إذا اختلف `formatted_address` أو الفئة (`normalizedCategory`).

---

## 4. سجل الأخطاء مرتّبًا حسب الخطورة

| المعرّف | الخطورة | العنوان | الموقع | الأثر على المستخدم |
|---------|---------|---------|--------|--------------------|
| **D-01** | 🔴 **P0** | تصدير سجلات Google مستحيل بالتصميم بلا إشعار مسبق | `core/source-adapters.js:14-16`, `lib/export-utils.js:341,348`, `core/export-worker.js:10` | «لا توجد سجلات للتصدير» بعد ساعات عمل |
| **D-02** | 🔴 **P0** | `onStartup` يمسح كل النتائج | `background/background.js:90-118` | فقدان كامل للبيانات عند إعادة تشغيل المتصفح |
| **D-03** | 🔴 **P0** | التحقق من الكاميرا مُعطَّل (50 كم + ترقية قسرية) | `content/content.js:30-38, 82-90` | بيانات منسوبة لخلية خاطئة |
| **D-04** | 🟠 **P1** | فلتر مكاني صارم داخل content يُسقط النتائج بصمت | `content/content.js:217-240`, `background.js:871-880` | 120 بطاقة → 1 سجل (موثّق) |
| **D-05** | 🟠 **P1** | انفجار التحسين التكراري (21 مشهدًا/خلية) | `background/background.js:752-764` | مهام تستغرق ساعات |
| **D-06** | 🟠 **P1** | إخفاء الحالة الحقيقية في الواجهة (`partial → مكتملة`) | `dashboard/dashboard.js:2360-2363, 2368-2382` | ثقة زائفة في التغطية |
| **D-07** | 🟠 **P1** | الوضع الافتراضي `balanced` يقتطع إلى 8 استعلامات | `dashboard.html:487`, `taxonomy-engine.js:3463-3465`, `background.js:647` | تغطية ناقصة بلا تحذير |
| **D-08** | 🟠 **P1** | `MutationObserver` بلا throttle + 120 محاولة تمرير | `content/content.js:316-317, 798` | تجمّد/بطء شديد في الصفحة |
| **D-09** | 🟡 **P2** | أنماط `manifest.json` لا تغطي `/maps` بدون slash ولا النطاقات الإقليمية ولا صفحات consent | `manifest.json:13-20, 32-42` | فشل حقن صامت |
| **D-10** | 🟡 **P2** | حاجز `__GMAPS_GRID_SCRAPER_INJECTED__` يمنع التعافي بعد Reload | `content/content.js:10-11` | توقف تام حتى إعادة تحميل الصفحة |
| **D-11** | 🟡 **P2** | `detectSourceBlock` إيجابيات كاذبة (reCAPTCHA مخفي) | `content/content.js:39-46` | إيقاف المهمة زورًا |
| **D-12** | 🟡 **P2** | livelock عند تحديث النتائج أثناء المهمة | `dashboard/dashboard.js:2297-2305` | جدول لا يتحدث أبدًا |
| **D-13** | 🟡 **P2** | كتابة النتائج كاملة في `chrome.storage.local` كل 400 مللي | `background/background.js:136-150` | بطء، مخاطر حصة، إيقاف SW |
| **D-14** | 🟡 **P2** | تعارض `savedPhenomena` / `savedTargetPhenomena` | `background.js:215` ↔ `dashboard.js:1550,1557` | ظهور/اختفاء ظواهر عشوائي |
| **D-15** | 🟢 **P3** | دمج 25 مترًا + الاسم يخلط أماكن متجاورة | `core/records.js` | فقدان سجلات صحيحة |
| **D-16** | 🟢 **P3** | تغطية اختبارات وهمية لا تلمس DOM جوجل | `test/*` | أخطاء P0 تبقى خفية |

### ترتيب الإصلاح الموصى به

```
الأسبوع 1:  D-02 (حذف onStartup) + D-01 (إشعار التصدير + مسار تصدير بديل) + D-06 (صدق الواجهة)
الأسبوع 2:  D-03 (كاميرا) + D-04 (فلتر) + D-07 (الوضع الافتراضي)
الأسبوع 3:  D-05 (Refinement) + D-08 (التمرير) + D-13 (IndexedDB)
الأسبوع 4:  D-09, D-10, D-11, D-12, D-14, D-15 + اختبارات E2E حقيقية (D-16)
```

---

## 5. لماذا كل الاختبارات ناجحة رغم وجود أخطاء P0؟

| السبب | الدليل |
|-------|--------|
| الاختبارات تستخدم سجلات OSM بس `exportAllowed: true` | `test/test_export_integrity.js:28`, `test/test_export_worker.js:16` |
| المحاكاة (mocks) تردّ `{verified: true}` بلا كاميرا حقيقية | مجموعة `test_job_engine.js` تعتمد على stubs |
| معالجات رسائل `content.js` لا تُنفَّذ في Node (تحتاج DOM + chrome APIs) | `test_content_multilingual.js` يعمل ببيئة جزئية |
| لا اختبار واحد يستدعي `chrome.runtime.onStartup` | بحث نصي كامل: المرجع الوحيد في `background.js:91` |
| الاختبارات تتحقق من «الشكل» (schema) لا من «السلوك» (end-to-end) | `npm test` ينجح 30/30 دون أي اتصال بخرائط جوجل |

**التوصية:** أضف اختبار **تكامل حقيقي مشروط** (`DALIL_LIVE=1`) يعمل على نسخة Maps ثابتة (fixture HTML محفوظة) + اختبار تصدير من سجل `google_maps_dom` **يتوقع الفشل** (ليثبت أن السلوك مقصود ومرئي).

---

## 6. المهارات المطلوبة للمشروع

### 6.1 المهارات التقنية الأساسية

| المجال | المهارات المطلوبة | لماذا |
|--------|-------------------|-------|
| **Chrome MV3** | Service Worker lifecycle، `chrome.alarms`، `chrome.scripting`، `declarativeNetRequest`، Offscreen Documents، رسائل طويلة العمر (Ports) | الأداة تعمل في SW قد يُوقف كل 30 ثانية |
| **DOM Scraping** | محددات مرنة (ARIA roles، `data-*`)، انتظار هادئ (idle detection)، كشف تغيّر المخطط | محددات جوجل تتغير كل أسابيع |
| **الهندسة المكانية (GIS)** | WGS84، Ray casting/Point-in-Polygon، Haversine، H3/Geohash، الشبكات المتداخلة، إسقاطات الخرائط | قلب الأداة — `lib/spatial-utils.js` |
| **إدارة الحالة** | Idempotency، checkpointing، epochs، transactional writes، crash recovery | الآن مفقود جزئيًا (D-02, D-13) |
| **JavaScript حديث** | async/await، AbortController، Web Workers، Streams، `CompressionStream` | أداء وتصدير |
| **تصدير البيانات** | GeoJSON RFC 7946، KML 2.2، Shapefile/ZIP، XLSX، CSV UTF-8 BOM | متطلبات صارمة موجودة في `AGENTS.md` |
| **الاختبار** | Playwright (E2E)، node:test، اختبارات عقد (contract tests)، property-based | الاختبارات الحالية شكلية |
| **i18n/RTL** | تعدد اللغات (13+ لغة)، RTL، تطبيع عربي (تشكيل، همزات) | `lib/taxonomy-engine.js` |
| **الأمن** | CSP صارم، عزل السياقات، تحقق من المرسل (`sender.id`)، عدم تنفيذ `eval` | MV3 + بيانات خارجية |
| **الامتثال القانوني** | شروط Google Maps، ODbL، تراخيص البيانات، سياسات التخزين | سبب D-01 |

### 6.2 المهارات الموجودة فعلًا في المشروع

المشروع يحتوي مهارات جاهزة في `.agents/skills/` يمكن الاستفادة منها مباشرة:

| المهارة | تغطي |
|---------|-------|
| `chrome-extensions` | أساسيات MV3 والنشر |
| `chrome-mv3-resilience-lifecycle` | بقاء SW، Keep-Alive، `chrome.alarms` → **تحل جزءًا من D-13** |
| `gis-spatial-mesh-engine` | توليد الشبكة، القصّ، التجريد المكاني |
| `google-maps-spatial-harvesting` | التمرير العميق، تتبع الكاميرا، محددات متعددة اللغات → **مرتبطة بـ D-04, D-08** |
| `google-maps-spatial-scraper` | استخراج الإحداثيات من URL، مضاد الكشف، التحقق من الحدود |
| `spatial-survey-persistence-guard` | استمرارية البيانات، معاملات آمنة → **تحل D-02 و D-13** |

**الفجوة:** لا توجد مهارة تغطي **الامتثال والتصدير القانوني** (D-01)، ولا **تصميم تجربة المستخدم الصادقة** (D-06/D-07). هاتان أولويتان.

---

## 7. المستجدات والتقنيات التي يجب الاستفادة منها

### 7.1 على مستوى المنصة (Chrome MV3)

| التقنية | الفائدة | الاستخدام المقترح |
|---------|---------|-------------------|
| **Offscreen Documents API** | تنفيذ مهام ثقيلة (XLSX/Shapefile) خارج SW بلا انقطاع | بديل لـ`export-worker` عندما يتوقف SW |
| **Side Panel API** | واجهة دائمة بجانب الخريطة بدل تبديل تبويبات | تجربة أفضل من فتح dashboard في تبويب |
| **`chrome.scripting.registerContentScripts`** | حقن ديناميكي عند الطلب مع أنماط دقيقة | يحل D-09 و D-10 |
| **`userScripts` API (MV3)** | عزل سكربتات الاستخراج عن CSP الصفحة | مرونة أعلى مع تحديثات جوجل |
| **Web Locks API** | قفل موحّد ضد تعارض المهام المتعددة | بديل لعملية `operationEpoch` |
| **`navigator.storage.persist()` + OPFS** | تخزين دائم لا يُمحى | بديل/مكمّل لـIndexedDB |

### 7.2 على مستوى البيانات المكانية

| التقنية | الفائدة |
|---------|---------|
| **DuckDB-WASM + spatial extension** | استعلامات SQL مكانية في المتصفح على آلاف السجلات، وإزالة تكرار بـSQL بدل JS |
| **H3 (Uber) / Geohash** | فهرسة مكانية ثابتة وإزالة تكرار فوري (بدل المسافة 25 مترًا) |
| **PMTiles + MapLibre GL** | عرض خرائط متجهية دون خدمات خارجية (بديل Leaflet النقطي) |
| **Overture Maps** | بديل مفتوح ومرخّص لبيانات الأماكن (يحل أزمة D-01) |
| **Turf.js** | عمليات هندسية جاهزة (تقاطع، تقريب، buffer) بدل كود يدوي |

### 7.3 على مستوى الهندسة والجودة

| التقنية | الفائدة |
|---------|---------|
| **TypeScript + Zod** | عقود رسائل بين content/background مضمونة في وقت البناء |
| **WXT / Plasmo** | بناء MV3 حديث مع HMR وملفات manifest مولّدة |
| **Playwright + `chrome.loadExtension`** | E2E حقيقي على صفحة Maps محفوظة (fixture) |
| **OpenTelemetry / Sentry** | تتبع أخطاء المستخدمين الحقيقيين بدل التخمين |
| **Vitest + fast-check** | اختبارات خاصية (property-based) لإزالة التكرار والفلترة المكانية |
| **ESLint `no-floating-promises`** | يمنع أخطاء `async` الصامتة المنتشرة في `background.js` |

### 7.4 على مستوى الذكاء الاصطناعي (متوافق مع `docs/LOCAL_AI.md`)

- **تصنيف محلي عبر `transformers.js` / WebGPU** بدل استدعاء سحابي: تصنيف الفئات غير المعروفة محليًا وبخصوصية كاملة.
- **تطبيع الأسماء العربية** (إزالة التشكيل، توحيد الهمزات/التاء المربوطة) لتحسين الدمج.
- **كشف التكرار الدلالي** (embeddings صغيرة) بدل تشابه النصوص الحرفي.

### 7.5 أولويات تبنّي واقعية

1. **الآن:** IndexedDB (D-13) + Playwright E2E (D-16).
2. **قريبًا:** Side Panel + `scripting.registerContentScripts`.
3. **متوسط:** H3 + DuckDB-WASM للتحليل داخل المتصفح.
4. **استراتيجي:** مسار تصدير مرخّص (Overture / OSM / Places API) لحل D-01 جذريًا.

---

## 8. خطة إصلاح عملية (Pull Requests مقترحة)

| PR | النطاق | الملفات | معيار القبول |
|----|--------|---------|--------------|
| **PR-1** | إيقاف مسح البيانات | `background/background.js:90-118` | اختبار: حفظ 3 سجلات → محاكاة `onStartup` → تبقى 3 |
| **PR-2** | صدق التصدير | `dashboard.js`, `export-utils.js` | إشعار قبل البدء: «X سجلًا غير قابل للتصدير» + تصدير المشتقات |
| **PR-3** | صدق الخلايا | `dashboard.js:2360-2383` | `partial` يظهر «جزئية (N)» + مفتاح ظاهر |
| **PR-4** | كاميرا دقيقة | `content.js:30-90` | هامش = نصف قطر الخلية، لا ترقية قسرية |
| **PR-5** | فلتر بلا إسقاط | `content.js:217-240` | `contentFiltered` يظهر في التشخيص |
| **PR-6** | تحسين محكوم | `background.js:752-764` | لا تحسين إلا لـ`capped`، مع deadline |
| **PR-7** | تمرير فعّال | `content.js:316, 798` | throttle 250ms، اكتشاف نهاية بالاستقرار |
| **PR-8** | تخزين قابل للتوسع | `background.js:136-150` | IndexedDB + اختبار 10 آلاف سجل < 2 ثانية |
| **PR-9** | حقن موثوق | `manifest.json`, `content.js` | يعمل على `/maps` و`google.com.eg` وبعد Reload |
| **PR-10** | E2E حقيقي | `test/` | مسار Google→تصدير يفشل صراحةً، ومسار OSM→تصدير ينجح |

---

## 9. الخلاصة

الأداة **ليست معطّلة**، لكنها **تُوعد بأكثر مما تُسلِّم** في ثلاث نقاط حرجة:

1. **التصدير:** البيانات موجودة لكنها مقيّدة قانونيًا — والواجهة لا تقول ذلك.
2. **الاستمرارية:** إعادة تشغيل المتصفح تمسح كل شيء — عكس ما توثّقه الأدلة.
3. **الدقة:** الفلتر المكاني والكاميرا المتسامحة تُنتج «نجاحًا» شكليًا مع تغطية منخفضة (1 من 120 في العيّنة الحقيقية).

المشروع يملك أساسًا هندسيًا جيدًا (طبقات نظيفة، توثيق، مهارات جاهزة). الإصلاحات المطلوبة **مركّزة ومحدودة** — أهمها حذف 30 سطرًا (D-02)، وتعديل شرط واحد (D-03)، وإضافة إشعار (D-01). لكن الأهم: **تغيير فلسفة الاختبار** من «واجهات وهمية تنجح» إلى «سلوك حقيقي يُقاس»، وإلا ستبقى الأخطاء الحرجة خفية رغم 30/30.

---

## 10. حالة التنفيذ بعد المراجعة (2026-11-14)

نُفِّذت حزمة الإصلاحات كاملة (D-01 → D-16) داخل الكود، مع اختبارات تغطية جديدة لكل إصلاح قابل للاختبار بلا متصفح:

#### الحزمة الأولى: عالية الثقة (P0)

| المعرّف | ما نُفِّذ | الملف | اختبار التغطية |
|---------|----------|-------|----------------|
| **D-02** | إعادة تشغيل المتصفح تُبقي `results` و`seenIds` ومواضع الخلايا؛ تُصفَّر الحالات العابرة فقط | `background/background.js:93-115` | `test_job_engine.js` → «browser restart preserves collected records» |
| **D-03** | هامش الكاميرا = عرض نطاق الخريطة (100–1500 م) بدل 50 كم؛ إلغاء ترقية `queryVerified → verified`؛ فشل القراءة = فشل التحقق | `content/content.js:32-48, 94-97` | `test_job_engine.js` → «Google camera mismatch pauses…» + `test_content_guard.js` |
| **D-01** | رسالة تصدير صريحة بعدد السجلات المقيّدة وأسبابها + رمز `EXPORT_RESTRICTED` + تفاصيل قابلة للعرض في الواجهة | `core/export-worker.js`, `lib/export-utils.js`, `dashboard/dashboard.js` | `test_export_worker.js` → فحص `errorCode` و`details` |
| **D-06** | `partial` لم تُعد تُدمج مع `complete` في طبقة العرض، وتظهر «جزئية» في المفتاح وبطاقة الخلية | `core/grid-presentation.js:28-35`, `dashboard/dashboard.js:2362, 2383-2385` | `test_survey_regressions.js` → 4 تأكيدات جديدة |
| **D-09** | نمط المطابقة أصبح `/maps*` ليشمل `google.com/maps` بدون شرطة مائلة | `manifest.json` | تحقق `JSON.parse` + مراجعة يدوية |

#### الحزمة الثانية: بقية القائمة (P1/P2)

| المعرّف | ما نُفِّذ | الملف | اختبار التغطية |
|---------|----------|-------|----------------|
| **D-04** | حُذفت البوابات المكانية الثلاث من الـ content script؛ الملكية تُقرَّر في `background` عبر `findOwnerCell` وحده، ولا يوجد إسقاط صامت. `outsideCount` صار العدّاد المرئي الوحيد | `content/content.js:656, 951, 1140` (استُبدلت بتعليقات توضيحية) | `test_job_engine.js` → «actual ownership … never use discovery-cell fallback» |
| **D-05** | عمق التحسين التكراري يتبع نتيجة المصدر: `capped` → عمق 2 (21 مشهدًا)، `partial`/`unknown` → عمق 1 (5 مشاهد) | `background/background.js` (`refineSearchView`) | `test_job_engine.js` → «unknown/partial views refine once instead of exploding the view tree» |
| **D-07** | الوضع الافتراضي في اللوحة أصبح `comprehensive`، و`maxQueries` صار `0` (بلا سقف) بدل 8، فلا حذف صامت لأوراق التصنيف | `dashboard/dashboard.html`, `background/background.js:646` | `test_comprehensive_audit.js` → T20/T30 |
| **D-08** | `MutationObserver` أصبح مُجمَّعًا بـ debounce 250 مللي عبر `scheduleHarvest`؛ حد التمرير الاحتياطي انخفض من 1000 إلى `min(120, max(24, ceil(maxItems/2)+12))` | `content/content.js` | `test_survey_regressions.js` → التمرير والحدود |
| **D-10** | حارس الحقن أُعيدت كتابته: `__DALIL_DISPOSE__` + `disposers[]` + نبضة `__DALIL_HEARTBEAT__` كل 5 ث + مستمع `onRuntimeMessage` مُسمّى يُزال عند إعادة الحقن. لا مزيد من صفحة ميتة بعد التحديث | `content/content.js:1-25, 155-165` | `test_content_guard.js` → «re-injection replaces the previous listener» |
| **D-11** | `SOURCE_BLOCKED` لا يُطلق إلا إذا كان عنصر الحظر مرئيًا فعلاً (مستطيل ≥ 40×40). إطار reCAPTCHA المخفي لم يعد يوقف الجمع | `content/content.js` (`visibleBlockElement`) | `test_content_guard.js` → «hidden captcha frame must not stop collection» |
| **D-12** | جلب النتائج في اللوحة يُثبِّت الصفحات المتسقة جزئيًا بدل الدوران الأبدي على `RESULTS_CHANGED` أثناء مهمة نشطة | `dashboard/dashboard.js` (`fetchData`) | مراجعة كود + `test_comprehensive_audit.js` T25 |
| **D-13** | مخزن نتائج جديد فوق IndexedDB (`core/result-store.js`) يُستخدم تلقائيًا فوق 2000 سجل، مع تراجع تلقائي إلى `chrome.storage.local` عند غياب/فشل IndexedDB، وتفريغ عند إعادة ضبط مساحة العمل | `core/result-store.js` (جديد), `background/background.js` (`doSaveState`) | `test_sources_records.js` → «store must report unavailable» + `test_job_engine.js` (المسار الاحتياطي) |
| **D-14** | تصحيح اسم المفتاح `savedTargetPhenomena` → `savedPhenomena` عند إعادة الضبط، فلا تبقى ظاهرات قديمة معلّقة | `background/background.js:214` | مراجعة + `test_comprehensive_audit.js` T25 |
| **D-15** | `RecordIndex.find()` يرفض الدمج عند تعارض صريح في `phone`/`website`/`address`/`formatted_address`، حتى لو تطابق الاسم والمسافة ≤ 25 م | `core/records.js` | `test_sources_records.js` → 3 تأكيدات تعارض/تطابق |
| **D-16** | اختبار عقد جديد للمستمع الحقيقي: تحقق الكاميرا بالمتر، رفض تطابق الاستعلام وحده، تجاهل كابتشا مخفي، والتعافي بعد إعادة الحقن | `test/test_content_guard.js` (جديد) + `package.json` | يُشغَّل ضمن `npm test` |

### نتائج التحقق بعد التعديل

```
npm test                 → كل المجموعات ناجحة
test_job_engine.js       → 27/27 سيناريو تكامل حقيقي
test_comprehensive_audit → 30/30
test_content_guard.js    → الكاميرا + إعادة الحقن + الكابتشا المخفي
test_export_worker.js    → 7 صيغ + رفض المصدر المقيّد + خلط مسموح/مقيّد
test_survey_regressions  → التمرير + الحالات اللونية + صدق partial
test_sources_records.js  → تعارض الهوية + غياب IndexedDB
test_file_integrity.js   → 45 مرجعًا سليمًا بلا سكربتات مضمّنة
node --check             → 6 ملفات معدَّلة بلا أخطاء نحوية
manifest.json            → JSON صالح
```

### تحذيرات صدق متبقية (لا تُقرأ كضمان)

| البند | الحقيقة |
|-------|---------|
| **D-13 (مسار IndexedDB)** | غير مُختبَر في Node (لا `indexedDB`)، ولا يوجد تشغيل حقيقي في Chrome بعد. المُختبَر هو **مسار التراجع** فقط. أي إغلاق للمتصفح قبل كتابة IDB يبقى احتمال فقدان نظرية قائمًا حتى يُجرَّب ميدانيًا |
| **D-16 / D-12 / D-07 (واجهة)** | لا `node_modules`، لذا اختبارات `test:*:browser` لم تُشغَّل. الأدلة = اختبارات عقد Node + مراجعة كود، وليست E2E |
| **قياس الميدان** | كل «تخفيض ضوضاء» أو «تحسين استرجاع» في هذه الحزمة مبني على المنطق والاختبارات، لا على حملة جمع مقارنة قبل/بعد. الحملة الميدانية تبقى ضرورية |
| **قيد التصدير** | `exportAllowed:false` لمصدر Google **لم يُرفع**، ولا ينبغي رفعه. الإصلاح جعل القيد مرئيًا وواضحًا، لا متجاوَزًا |

---

## 11. إصلاح عاجل بعد بلاغ «البحث يعمل لكن لا تُستخرج ظاهرات» (2026-11-15)

بعد تنفيذ الحزمة الكاملة ظهر بلاغ ميداني بأن الأداة تتنقل وتُجري البحث لكن دون أي سجل. الفحص أعطى سببين محتملين، وعالجناهما معًا بدل التخمين:

### 11.1 ما غيّرناه

| المشكلة | الإصلاح | الأثر |
|---------|---------|-------|
| **الكاميرا كانت شرطًا قاطعًا** بعد D-03. أي إعادة تمركز من Google أكبر من عرض النطاق كانت تُوقف الخلية كلها (`NAVIGATION_VIEW_MISMATCH`) قبل أي استخراج | التحقق من **نص البحث** بقي صارمًا، أما مركز الكاميرا فأصبح **إرشاديًا** داخل حد «الحي الخطأ» = 1.5× قطر الخلية بحد أدنى 3 كم. الملكية تُقرَّر هندسيًا في `findOwnerCell` | لا مزيد من التوقف الصامت لكل الخلايا؛ ولا تُنسب نتائج مدينة أخرى للخلية |
| **الحكم على الخلية قبل رسم النتائج** (SPA) | `waitForFirstCards` ينتظر حتى 7 ثوانٍ لظهور أول بطاقة، ويخرج فورًا عند رسالة «لا نتائج» الصريحة | يمنع نتيجة صفرية كاذبة |
| **لا تفسير لرقم الصفر** | `core/scan-diagnostics.js` + بطاقة «لماذا لم يُحفظ سجل جديد؟» في اللوحة مع `cards/new/dup/outside/noXY/cell/query` | يعرف المستخدم: خارج منطقة الدراسة؟ بلا إحداثيات؟ تكرار؟ أم الصفحة لم تُقرأ؟ |

### 11.2 ما يجب التحقق منه الآن

الدليل الحالي من متصفح حقيقي على استعلام «مساجد» في الفيوم: الصفحة تعرض 10 بطاقات، وكلها تحمل `!3d/!4d`، و`a.hfpxzc` و`div.Nv2PK` موجودة، والكاميرا تبقى كما هي بعد إعادة تحميل Google (تتحول فقط من `15z` إلى `3687m`). أي أن **مستخرج المحتوى سليم**، والانقطاع كان في سياسة البوابة أو في توقيت القراءة.

### 11.3 تحذير صدق

هذان الإصلاحان يزيلان أشهر أسباب «صفر سجلات»، لكنهما **ليسا إثباتًا** أن كل حالة مستخدم ستنجح. بطاقة التشخيص هي أداة الحكم: إن ظهرت بعد التشغيل القادم فستقول السبب الحقيقي بالعدّادات، وحينها يُعالَج السبب المحدد لا السبب المفترض.

### 11.4 مبدأ «مشهد واحد لكل خلية» (2026-11-15)

**السؤال:** لماذا لا تُعامَل الخلية كوحدة واحدة: مشهد واحد، فإن رجع أقل من السقف (120) وبلا علامة «المزيد» تُعتبر مغطاة وتنتهي؟

**الإجابة:** هذا هو الصواب، وقد كانت الأداة تبدأ فعلًا بمشهد واحد لكل خلية — لكنها كانت **تقسّمه بلا دليل**:

| قبل | بعد |
|-----|-----|
| `partial` أو `unknown` → تقسيم تلقائي إلى 4 مشاهدات إضافية (5 لكل خلية/استعلام) | تُقسَّم فقط عند `capped` (دليل صريح أن المصدر أعاد سقف 120) |
| `complete` مع نطاق > 0.02° → تقسيم ضمني | لا تقسيم؛ `complete` يعني أن Google أنهى القائمة |
| `partial`/`unknown` بعمق 1 دائمًا | خيار صريح «تحسين عميق عند نقص النتائج» (`deepRefine`) — افتراضيًا معطّل |
| لا حد أدنى لحجم التقسيم | نطاق < 0.002° لا يُقسَّم (نفس البطاقات تمامًا) |

**الوضع الافتراضي الآن:**

```
capped            → تقسيم (حتى 21 مشهدًا)   ← دليل على وجود المزيد
partial | unknown → مشهد واحد فقط            ← شك، لا دليل
                      (5 مشاهدات إن فعّل المستخدم deepRefine)
complete          → مشهد واحد فقط            ← القائمة انتهت
confirmed_empty   → لا مشاهدات إضافية
```

**الأثر الزمني:** 25 خلية × استعلام واحد بالوضع الافتراضي = **25 مشهدًا** بدل 125. وبزمن مشهد واقعي 20–40 ثانية يصبح الزمن 8–17 دقيقة بدل 50–85 دقيقة.

**تحذير صدق:** `partial` لا تعني «مكتملة». الخلية تبقى موسومة «جزئية» (بنفسجي متقطع) في الشبكة، وبياناتها محفوظة كما هي. لا نُرقّيها إلى `complete`، لكننا أيضًا لا نُنفق دقائق إضافية على تقسيم لا دليل عليه. هذا مقايضة واعية بين التغطية والزمن، والقرار فيها للمستخدم عبر مربع «التحسين العميق».

### 11.5 «النتائج لا ترتبط بالخلية» — صفحة مستقلة لكل خلية (2026-11-15)

**العَرَض:** «كل خلية يجد فيها عناصر لكن لا يسجلها، والنتائج لا ترتبط بالخلية».

**التشخيص:** المستخرج سليم، و`findOwnerCell` سليم. الخلل في **بوابة الانتقال**. كانت `matchesMapsNavigation` تقبل أي رابط `/maps/search/<نفس نص البحث>/@...` بشرط أن تكون الكاميرا على بعد **أقل من 50 كم** من هدف الخلية. في تسلسل الاستعلام-أولًا تنتقل الأداة من خلية إلى التي تليها بنفس النص، فكان تبويب الخلية السابقة لا يزال محمّلًا ويحمل نفس النص، فيمرّ من البوابة، ويردّ `PREPARE_TASK` بنجاح (الانزياح داخل الحد الإرشادي القديم 3 كم)، ثم تُقرأ **بطاقات الحي السابق** وتُنسب للخلية الجديدة. النتيجة المرئية: سجلات «اكتشاف مبكر» تنتمي لخلايا أخرى، وتكرارات، وخلية تبدو فارغة وهي مليئة.

**ما أُصلح:**

| الطبقة | الإصلاح |
|--------|---------|
| **هوية الانتقال** | `matchesMapsNavigation(actual, target, toleranceMeters)` يقبل فقط رابطًا يحمل **نفس بصمة المهمة** `dalil_task`. إذا حذف Google المعامل، لا يُقبل إلا بكاميرا داخل `toleranceMeters` (الحد المقاس للخلية) — لا 50 كم. |
| **تبويب لكل خلية** | `ensureWorkerTab(cellId)` يغلق تبويب الخلية السابقة ويفتح تبويبًا جديدًا على `about:blank` ثم ينتقل. `workerTabCellId` يمنع إعادة الاستخدام العرضي. |
| **إثبات استبدال المستند** | كل مستند محتوى يعلن `DOCUMENT_ID`؛ والعامل الخلفي يرفض نفس البصمة مرتين برمز `STALE_DOCUMENT` (لا تُصفَّر البصمة عند إنشاء أو إغلاق التبويب: مستندان لا يتشاركان معرّفًا). |
| **حد كاميرا مُقاس** | `clamp(0.5 × أقصر ضلع، 300، 2000)` متر. الانزياح فوقه = `CAMERA_NOT_AT_CELL` (رمز مستقل عن `NAVIGATION_VIEW_MISMATCH`)، ويُوقف البحث مؤقتًا برسالة صريحة. |
| **إعادة محاولة واحدة نظيفة** | `preparePage()` تعيد فتح صفحة نظيفة مرة واحدة عند أي من رموز عدم الجاهزية الخمسة، ثم تُوقف بدل أن تقرأ حيًّا آخر. |
| **توقيت القراءة** | `waitForFeed(12000)` ثم `waitForFirstCards(12000)`، و10 ثوانٍ إضافية بعد نقرة «البحث في هذه المنطقة» — وهي نقرة مشروطة بغياب البطاقات وغياب إعلان الخلو. |
| **المفتاح** | خمس حالات فقط: قيد الانتظار، جاري المسح، مكتملة، خالية، خطأ/تعذر البحث. `Grid.bucket()` يطوي `partial`/`capped` إلى «مكتملة» و`unknown`/`blocked` إلى «خطأ» للعرض، بينما `Grid.state()` يُعيد الحالة الدقيقة لبطاقة الخلية. |

**الدليل الميداني الحالي (الفيوم، متصفح حقيقي):** Google يحترم `@lat,lng` المطلوب كما هو (مثال `29.3700,30.9300,16z` يبقى كما هو بعد التحميل)، والبطاقات تحمل `!3d/!4d` و`a.hfpxzc` و`div.Nv2PK`، لكن **رسم القائمة قد يتأخر 30–40 ثانية** على تبويب بارد؛ ولهذا رُفع الانتظار بدل الحكم بصفر.

**التحقق:** `test_job_engine.js` = 31/31 (منها: صفحة لم تُستبدل تُرفض بـ `STALE_DOCUMENT` بدل حفظ نتائج خلية أخرى؛ كل خلية تُقرأ من صفحتها الخاصة فيُسجَّل سجلها بمالكها الصحيح)، و`test_grid_legend.js` جديد لعقد الخمس حالات، و`npm test` و`test_comprehensive_audit.js` (30/30) و`test_file_integrity.js` و`test_dom_ids.js` خضراء.

**تحذير صدق:** هذا يمنع **نسب نتائج حيٍّ آخر للخلية**، ولا يضمن أن Google سيعرض كل معالم كل حي. الخلية قد تبقى `partial` — وهذا مقصود ومعلن، لا خطأ مخفي. الفحص الميداني القادم يجب أن يبدأ بـ 1 خلية × 1 استعلام للتأكد من ارتباط السجلات بمالكها قبل تشغيل شبكة كاملة.

### 11.6 «اعتبر الخلية مكتملة وفيها مساجد لم تُقرأ» — إثبات التغطية (2026-11-15)

**العَرَض:** خلية تُعرض مكتملة، وعند التكبير اليدوي تظهر مساجد داخلها لم تُسجَّل. أي أن الأداة تركت الخلية قبل أن تفحصها.

**التشخيص:** Google لا يعيد «كل معالم المنطقة»، بل قائمة **مقصورة على نطاق الخريطة المرئي**، وينهيها بـ«نهاية القائمة» لنطاقه هو. وكان التكبير يُختار من **أطول ضلع** في الخلية بقواعد ثابتة (0.007° → 17z). عند 17z يكون ارتفاع العرض المرئي نحو 0.95 كم، فإن كانت الخلية 1.2 كم بقي شريط منها خارج العرض. القائمة تنتهي، والحالة تصير `complete` بالمعنى الحرفي: «Google أنهى قائمته»، لا «الخلية فُحصت».

**ما أُصلح:**

| الطبقة | الإصلاح |
|--------|---------|
| **اختيار التكبير** | `DalilSearchNavigation.zoomForBounds(bounds, pixels, 1.06)` = أعلى تكبير يبقى عرضه يحتوي الخلية أفقيًا ورأسيًا، محسوبًا من `156543.03392 × cos(lat) / 2^z` ومقاس نافذة حقيقي. تكبير المستخدم يُحترم فقط إن بقي محيطًا بالخلية. |
| **إثبات التغطية** | `PREPARE_TASK` يعيد `viewport {zoom, pixels, widthMeters, heightMeters}`، و`cellCoverage()` يبني مستطيل العرض ويقارنه بنطاق الخلية. النتيجة تُخزَّن في العرض: `scan.coverage`. |
| **بوابة الاكتمال** | إن كانت التغطية ناقصة، `complete` و`confirmed_empty` تُخفَّضان إلى `partial` مهما قال Google، فلا تُوسم خلية مكتملة وعرضها أصغر منها. |
| **تصحيح واحد** | إن كان العرض أضيق، يُعاد التوجيه مرة واحدة بتكبير التغطية ثم يُقاس من جديد؛ لا حلقات إعادة محاولة. |
| **عرض المستخدم** | الحالة الفرعية `coverage_incomplete` تُعرض في مفتاح الخمس حالات تحت «خطأ / تعذر البحث» (أحمر)، وبطاقة الخلية تقول: «غير مكتملة · تغطية ناقصة…». والسبب نفسه يظهر في بطاقة التشخيص برمز `VIEWPORT_SMALLER_THAN_CELL`. |

**دليل ميداني:** في متصفح حقيقي على خلية واحدة، Google يحترم التكبير المطلوب حرفيًا، ومحتوى القائمة يتغيّر بالعرض: نفس الخلية والاستعلام أعادا 10 بطاقات، منها 2 داخل الخلية عند 16z و5 عند 17z. فـ«نهاية القائمة» حكم على العرض لا على الخلية.

**التحقق:** `test_extraction_fix.js` يفحص أن التكبير المحسوب يغطي الخلية عند خمسة أحجام وأن تكبيرًا أعلى بدرجة يفشل التغطية؛ وسيناريو محرك جديد «عرض أصغر من الخلية لا يُوسم مكتملًا» (32/32)، و`test_scan_diagnostics.js` و`test_grid_legend.js` يغطيان رمز التغطية وحالتها؛ و`npm test` و`test_comprehensive_audit.js` (30/30) خضراء.

**تحذير صدق:** التغطية الهندسية تضمن أن **ما قرأته Google كان داخل الخلية كلها**، ولا تضمن أن Google يعيد كل معلم في نطاقها (رتبة، سقف 120، دقة بيانات المصدر). الخلية التي تبقى `partial` تظهر الآن حمراء «تغطية ناقصة»، لا خضراء مكتملة — وهذا هو الفرق الذي طلبته.

### 11.7 «لا تُستخرج العناصر حسب الخلية ولا العناصر داخل الخلية» — قياس حيّ (2026-11-16)

**العَرَض:** بلاغ جديد بأن النتائج لا ترتبط بالخلايا، وأن أماكن واقعة داخل الخلية نفسها لا تخرج.

**الطريقة:** بدل تعديل الكود على أساس التخمين، شُغِّل المسار الحقيقي في متصفح حقيقي: صفحة بحث Google Maps جديدة، ثم حُقن `content/content.js` الفعلي مع `lib/spatial-utils.js` و`core/search-navigation.js`، ودُفع عبر `PREPARE_TASK` ثم `SCRAPE_PAGE`، ثم مُرِّرت البطاقات المستخرجة على شبكة 6×6 حول الدقي عبر `PlaceRecords.normalize` + `isPointInStudyArea` + `findOwnerCell`.

| ما قيس حيًّا | النتيجة |
|---|---|
| انزياح الكاميرا عن مركز الخلية | **0 م** لخلايا 1200 م و9000 م و320 م. Google يحذف `dalil_task`/`#dalil` ويُبقي `@lat,lng,zoom`. |
| استخراج سكربت المحتوى | **120 بطاقة**، منها **8 داخل الخلية**، `completenessStatus: 'capped'`، `viewport 1000×700 = 2068×1447 م @16z`. |
| الإسناد على 20 بطاقة حقيقية | **12 داخل منطقة الدراسة**، **8 خارجها** (Google يخلط أماكن على 21 كم)، حُفظت 12 موزعة على **8 خلايا**. |
| بنية البطاقة | `aria-label` + `div.Nv2PK` + إحداثيات `!3d/!4d` — أي أن المستخرج يقرأ ما يلزم للملكية. |

**الخلاصة:** لا خلل في المستخرج ولا في `findOwnerCell` في القياس الحيّ. لكن القياس لا يُثبت أن كل تشغيل للمستخدم يمر بالمسار نفسه، فبقيت فرضية بنيوية واحدة قابلة للعلاج بلا ادّعاء: **صفحة لم ترسم أي بطاقة**. تبويب الخلفية أو تحميل SPA ناقص يعطي «صفر بطاقات»، وكان «الصفر» يُحفظ كأن المنطقة خالية.

**ما أُصلح:**

| الطبقة | الإصلاح |
|--------|---------|
| **دليل الصفحة** | `domEvidence()` تُرفق مع كل `SCRAPE_PAGE`: `feed/cards/anyCards/visibility/readyState/feedHeight`. |
| **إعادة تحميل واحدة** | `anyCards === 0` بلا `emptyVerified` ⇒ ليست منطقة خالية. يُغلق تبويب الخلية، يُفتح نظيف، يُعاد التوجيه، ثم تُقرأ مرة ثانية (`attempt <= 1`) مع تسجيل `scan.recoveredFromBlankPage` و`scan.domEvidence`. |
| **تشخيص صريح** | `PAGE_NOT_RENDERED` (لا بطاقات أصلًا) و`CARDS_VISIBLE_BUT_UNREADABLE` (بطاقات ظاهرة ولم تُقرأ) في `core/scan-diagnostics.js`، مع `page` في نتيجة التشخيص. |
| **لا ترقية صامتة** | `confirmed_empty` يبقى `SOURCE_EMPTY`، والعرض الذي حفظ سجلات لا يُخفَّض بسبب اللقطة. |

**التحقق:** سيناريو محرك جديد «صفحة بلا بطاقات تُعاد مرة واحدة ثم تُحفظ سجلاتها» (33/33)، وحالتان جديدتان في `test_scan_diagnostics.js`، و`npm test` كامل و`test_comprehensive_audit.js` (30/30) و`test_file_integrity.js` خضراء.

**حدّ القياس (صدق):** لم يُعَد إنتاج «صفر السجلات» داخل الإضافة نفسها، لأن أداة المتصفح المتاحة ترفض `chrome://extensions` وتُبقي كل التبويبات `visible`، فلا يمكن اختبار التبويب المخفي. لذلك بطاقة التشخيص هي أداة الحكم: إن تكرر الصفر فستقول البطاقة أي الرمزين ظهر — صفحة لم تُرسم أم بطاقات لم تُقرأ — وحينها يُعالَج السبب المحدد.

### 11.8 دقة البحث وتسجيل النتائج داخل الخلية (2026-11-16)

**العَرَض:** «الأداة محتاجة دقة في البحث جيدًا وتسجيل النتائج».

**التشخيص:** الإسناد سليم (11.7)، لكن **ترتيب القراءة** كان يخسر معالم الخلية. Google تمزج في القائمة الواحدة أماكن من مناطق بعيدة (قِيس: بطاقات على 21 كم). وكانت ميزانية التمرير تُستهلك بعدد **كل** البطاقات المرصودة (120)، والاقتطاع النهائي يعتمد ترتيب الظهور. النتيجة: إذا جاءت معالم الخلية بعد البعيدة، لا تُقرأ أصلًا — لا لأن `findOwnerCell` أخطأ، بل لأنها لم تُرسَل.

**ما أُصلح:**

| الطبقة | الإصلاح |
|--------|---------|
| **ميزانية التمرير** | `harvestBatch()` صار يُعيد عدّ الواقع **داخل حدود الخلية** فقط. التمرير يستمر حتى يبلغ سقف `maxPerCell` من داخل الخلية أو تنتهي القائمة، بدل التوقف عند 120 بطاقة بعيدة. |
| **الاقتطاع** | `inCellFirst(values, cellInfo)` (وحدة نقية مُصدَّرة) تقدّم معالم الخلية، ثم البعيد، ثم مجهول الإحداثيات، قبل `slice(0, maxItems)`. |
| **قائمة ليست عن الخلية** | إذا `items > 0` و`inCellCount === 0`: تُخفَّض الحالة من `complete` إلى `partial`، ويُقسَّم المشهد مرة واحدة (4 مشاهدات فرعية) لأن التكبير يغيّر ما يعرضه Google — دليل سابق: 2 ← 5 داخل الخلية عند 16z و17z. |
| **إعادة ترتيب النطاق** | أمر `SEARCH_THIS_AREA` في سكربت المحتوى ينقر «البحث في هذه المنطقة» وينتظر تغيّر أول بطاقة فعلًا (حتى 9 ثوانٍ)، ثم يُعاد قراءة الخلية مرة واحدة. لا يُنقر إن لم يوجد الزر. |
| **قياس صريح** | `inCellCount` يُحسب من الملكية الهندسية، يُخزَّن في المشهد و`statusByQuery` ويُعرض في عدّادات التشخيص. |

**دليل حيّ (متصفح حقيقي، الدقي 1.2 كم، «مساجد»، سقف 30):** أعادت القراءة 20 بطاقة (نهاية القائمة)، **أول سبع بطاقات كلها داخل الخلية**، والباقي بعيد. هذا يثبت أن معالم الخلية تُقرأ أولًا ولا تُقتطع لصالح البعيد.

**التحقق:** سيناريوهان جديدان في المحرك (35/35): إعادة ترتيب النطاق مرة واحدة عند غياب أي بطاقة من الخلية، وتحسين مشهد أرجَع بطاقات من مناطق أخرى فقط بدل وسمه مكتملًا. و`test_survey_regressions.js` يثبت أن السقف يُعدّ بالواقع داخل الخلية وأن `inCellFirst` يحفظ ترتيب الأولوية. و`npm test` كامل و`test_comprehensive_audit.js` (30/30) و`test_file_integrity.js` خضراء.

**حدّ صدق:** زر «البحث في هذه المنطقة» غير موجود عند التحميل الأول (قِيس حيًّا: لا زر قبل تحريك الخريطة)، لذلك مسار إعادة الترتيب احتياطي لا أساسي. الأساس هو ميزانية القراءة والاقتطاع، ويعمل في كل الحالات.

---

### ملحق: مراجع الأدلة

| الدليل | المسار |
|--------|--------|
| عيّنة تشغيل حقيقية (120 بطاقة → 1 سجل) | `.tmp/live-fayoum/report.json` |
| قراءة بعد إعادة التشغيل (ادّعاء غير مُختبَر) | `.tmp/live-fayoum/readback.json` |
| أدلة موثّقة من المؤلف | `docs/evidence/survey-reliability-2026-11-14.json` |
| اعترافات المؤلف بالقيود | `docs/SURVEY_RELIABILITY.md` |
| حالة التنفيذ | `docs/IMPLEMENTATION_STATUS.md` |
| سجل التغييرات | `CHANGELOG.md` |
| نتائج الاختبارات | `npm test` (30/30 + 27/27 + البقية) |

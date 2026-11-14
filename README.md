# دَلِيل | DALIL

هذا مجلد المشروع العام. الإضافة القابلة للتحميل في **[DALIL Chrome Exstension](<DALIL Chrome Exstension/README.md>)**؛ اختر المجلد الفرعي الذي يحتوي على manifest.json عند تحميل حزمة مفكوكة.

إضافة Chrome Manifest V3 مفتوحة المصدر لتحديد منطقة دراسة، والبحث بالشبكة، ومراجعة بيانات الأماكن وتصدير البيانات المسموح بإعادة استخدامها إلى GIS وExcel. الواجهة عربية افتراضيًا مع واجهة إنجليزية مستقلة. تدعم استيراد النقاط والطرق والمضلعات، ونصوص البحث متعددة اللغات، ورموزًا محلية مضمّنة داخل KMZ.

## التثبيت

1. نزّل المستودع من **Code → Download ZIP** وفك الضغط، أو استنسخه باستخدام Git.
2. افتح `chrome://extensions` وفعّل **Developer mode**.
3. اختر **Load unpacked** ثم مجلد `DALIL Chrome Exstension` الداخلي الذي يحتوي على `manifest.json`.
4. افتح الإضافة من أيقونتها. لا تفتح dashboard مباشرةً بوصفه ملف HTML.

## الاختبارات

يتطلب تشغيل الاختبارات Node.js. لا يلزم تنزيل تبعيات npm لتشغيل المجموعة الأساسية؛ مكتبات الإضافة محلية.

```powershell
cd "DALIL Chrome Exstension"
npm.cmd test
node test/test_comprehensive_audit.js
node tools/project-hygiene.js
```

اختبارات المتصفح والقراءة المستقلة للمخرجات لها متطلبات إضافية موثقة داخل مجلد الإضافة. قبول لغة بحث لا يعني ترجمة جميع الفئات أو ضمان تغطية جميع البلدان. تختلف حقوق جمع البيانات وتخزينها وتصديرها بحسب المصدر؛ طبقات العرض مستقلة عن مصدر البحث.

## الوثائق

- [التشغيل](<DALIL Chrome Exstension/README.md>)
- [التغييرات والأدلة والقيود](<DALIL Chrome Exstension/docs/IMPLEMENTATION_STATUS.md>)
- [الموارد والتراخيص](<DALIL Chrome Exstension/docs/DEPENDENCIES.md>)
- [تنظيف الملفات](<DALIL Chrome Exstension/docs/FILE_DEDUPLICATION.json>)
- [آخر تحديث: لغات البحث والرموز](<DALIL Chrome Exstension/docs/LANGUAGES_SYMBOLS_R5.md>)
- [المساهمة](<DALIL Chrome Exstension/CONTRIBUTING.md>) و[الإبلاغ الأمني](<DALIL Chrome Exstension/SECURITY.md>)
- [ترخيص المشروع MIT](<DALIL Chrome Exstension/LICENSE>)؛ تراخيص المكتبات والبيانات مستقلة
- [مرجع التطوير الأصلي](DALIL_Code_Audit_and_Restructuring_Blueprint_2026-11-13.md)

الصفحة التعريفية لها نسخة واحدة في index.html، والأصول المشتركة داخل assets بمجلد الإضافة. الأصول الفريدة للعلامة التجارية محفوظة. إعدادات الوكلاء وسجلات الجهاز والنسخ المضغوطة مستبعدة من المستودع.

/**
 * DALIL (دليل) - Export Utilities (Universal GIS & Location Intelligence Edition)
 * دوال تصدير البيانات إلى ملفات بالترتيب القياسي:
 * 1. KML (.kml) لبرنامج Google Earth مقسم في مجلدات (Folders) لكل فئة وظاهرة مع دبابيس ملونة
 * 2. KMZ (.kmz) حزمة مضغوطة أصلية لـ Google Earth جاهزة للمعاينة الفورية
 * 3. Excel (.xlsx) مع أوراق عمل مستقلة لكل فئة رئيسية وشيت مجمع مع الفصل الصارم لإحداثيات X و Y
 * 4. GeoJSON (.geojson) للربط المباشر مع نظم المعلومات الجغرافية ArcGIS Pro و QGIS
 * 5. JSON (.json) مصفوفة كائنات جغرافية قياسية
 * 6. CSV (.csv) مع كود UTF-8 BOM لدعم اللغة العربية في إكسيل بنسبة 100%
 */

let TaxonomyEngineRef = null;
if (typeof TaxonomyEngine !== "undefined") {
  TaxonomyEngineRef = TaxonomyEngine;
} else if (typeof require !== "undefined") {
  try {
    TaxonomyEngineRef = require("./taxonomy-engine.js").TaxonomyEngine;
  } catch (e) {}
}

const ExportUtils = {
  /**
   * حساب قيمة CRC32 الثنائية للأرشيف المضغوط
   */
  crc32(buf) {
    let table = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
      }
      table[i] = c;
    }
    let crc = 0 ^ (-1);
    for (let i = 0; i < buf.length; i++) {
      crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
  },

  /**
   * إنشاء ملف ZIP قياسي (PKZip) بدون أي مكتبات خارجية لتوليد ملفات KMZ
   */
  createZip(files) {
    if (!Array.isArray(files) || files.length > 65535) throw new Error('ZIP entry limit exceeded');
    const names = new Set();
    let totalBytes = 0;
    for (const file of files) {
      if (!file.name || /(^[\\/]|^[a-z]:|\\|(?:^|\/)\.\.(?:\/|$)|\x00)/i.test(file.name) || names.has(file.name.toLowerCase())) throw new Error('Unsafe or duplicate ZIP path');
      names.add(file.name.toLowerCase());
      totalBytes += typeof file.data === 'string' ? new TextEncoder().encode(file.data).length : file.data.byteLength;
      if (totalBytes > 536870912) throw new Error('Export archive exceeds the 512 MiB in-memory limit');
    }
    const encoder = new TextEncoder();
    let localHeaders = [];
    let centralHeaders = [];
    let offset = 0;

    for (const f of files) {
      const nameBytes = encoder.encode(f.name);
      const dataBytes = typeof f.data === "string" ? encoder.encode(f.data) : f.data;
      const crc = this.crc32(dataBytes);
      const size = dataBytes.length;

      // Local Header (30 bytes + name + data)
      const lh = new Uint8Array(30 + nameBytes.length + size);
      const view = new DataView(lh.buffer);
      view.setUint32(0, 0x04034b50, true);
      view.setUint16(4, 20, true);
      view.setUint16(6, 0x0800, true); // UTF-8
      view.setUint16(8, 0, true);      // Stored (no compression)
      view.setUint16(10, 0, true);
      view.setUint16(12, 0, true);
      view.setUint32(14, crc, true);
      view.setUint32(18, size, true);
      view.setUint32(22, size, true);
      view.setUint16(26, nameBytes.length, true);
      view.setUint16(28, 0, true);
      lh.set(nameBytes, 30);
      lh.set(dataBytes, 30 + nameBytes.length);
      localHeaders.push(lh);

      // Central Directory Header (46 bytes + name)
      const ch = new Uint8Array(46 + nameBytes.length);
      const cview = new DataView(ch.buffer);
      cview.setUint32(0, 0x02014b50, true);
      cview.setUint16(4, 20, true);
      cview.setUint16(6, 20, true);
      cview.setUint16(8, 0x0800, true);
      cview.setUint16(10, 0, true);
      cview.setUint16(12, 0, true);
      cview.setUint16(14, 0, true);
      cview.setUint32(16, crc, true);
      cview.setUint32(20, size, true);
      cview.setUint32(24, size, true);
      cview.setUint16(28, nameBytes.length, true);
      cview.setUint16(30, 0, true);
      cview.setUint16(32, 0, true);
      cview.setUint16(34, 0, true);
      cview.setUint16(36, 0, true);
      cview.setUint32(38, 0, true);
      cview.setUint32(42, offset, true);
      ch.set(nameBytes, 46);
      centralHeaders.push(ch);

      offset += lh.length;
    }

    const centralSize = centralHeaders.reduce((sum, h) => sum + h.length, 0);
    const endHeader = new Uint8Array(22);
    const eview = new DataView(endHeader.buffer);
    eview.setUint32(0, 0x06054b50, true);
    eview.setUint16(4, 0, true);
    eview.setUint16(6, 0, true);
    eview.setUint16(8, files.length, true);
    eview.setUint16(10, files.length, true);
    eview.setUint32(12, centralSize, true);
    eview.setUint32(16, offset, true);
    eview.setUint16(20, 0, true);

    const totalSize = offset + centralSize + 22;
    const result = new Uint8Array(totalSize);
    let pos = 0;
    for (const lh of localHeaders) {
      result.set(lh, pos);
      pos += lh.length;
    }
    for (const ch of centralHeaders) {
      result.set(ch, pos);
      pos += ch.length;
    }
    result.set(endHeader, pos);
    return result;
  },

  /**
   * استنتاج الفئة الرئيسية للظاهرة من محرك التصنيفات
   */
  resolveMainCategory(item) {
    if (item.categoryMain && item.categoryMain.trim()) {
      return item.categoryMain.trim();
    }
    if (item.sector && item.sector.trim()) {
      return item.sector.trim();
    }

    const engine = (typeof TaxonomyEngine !== "undefined") ? TaxonomyEngine : TaxonomyEngineRef;
    const query = (item.searchKeyword || item.category || item.name || "").trim();

    if (engine && typeof engine.getSectors === "function") {
      const sectors = engine.getSectors();
      for (const s of sectors) {
        if (s.name_ar === query || (s.name_en && s.name_en.toLowerCase() === query.toLowerCase())) {
          return s.name_ar;
        }
        for (const b of (s.branches || [])) {
          if (b.name_ar === query || (b.name_en && b.name_en.toLowerCase() === query.toLowerCase())) {
            return s.name_ar;
          }
          if (b.leaves) {
            for (const leaf of b.leaves) {
              const leafName = typeof leaf === "string" ? leaf : (leaf.ar || leaf.name_ar || "");
              if (leafName === query || (query.length >= 3 && (leafName.includes(query) || query.includes(leafName)))) {
                return s.name_ar;
              }
            }
          }
          // فحص جزئي لاسم الفرع
          if (query && query.length >= 3 && (b.name_ar.includes(query) || query.includes(b.name_ar))) {
            return s.name_ar;
          }
        }
      }
    }

    return item.searchKeyword || item.category || "معالم عامة";
  },

  /**
   * استنتاج وتحديد التصنيف الفرعي (الفرع الجغرافي المعياري من المكتبة) للظاهرة
   * بدلاً من النصوص الخام المشوشة لمخرجات خرائط جوجل
   * @param {object} item كائن المعلم الجغرافي
   * @returns {string} اسم الفرع / التصنيف الفرعي المعتمد (مثل: المساجد والمصليات)
   */
  resolveSubCategory(item) {
    if (!item) return "-";
    if (typeof item === "string") item = { searchKeyword: item };

    const engine = (typeof TaxonomyEngine !== "undefined") ? TaxonomyEngine : TaxonomyEngineRef;
    if (engine && typeof engine.resolveSubCategory === "function") {
      return engine.resolveSubCategory(item);
    }

    if (item.subCategory && typeof item.subCategory === "string" && item.subCategory.trim()) {
      return item.subCategory.trim();
    }
    if (item.branch && typeof item.branch === "string" && item.branch.trim()) {
      return item.branch.trim();
    }

    const mainCat = this.resolveMainCategory(item);
    const candidates = [];
    if (item.searchKeyword && typeof item.searchKeyword === "string" && item.searchKeyword.trim()) {
      candidates.push(item.searchKeyword.trim());
    }
    if (item.category && typeof item.category === "string") {
      let clean = item.category
        .replace(/\d+(\.\d+)?\s*\(\d+[\d,]*\)/g, "")
        .replace(/★\s*\d+(\.\d+)?/g, "")
        .replace(/[·•]/g, " ")
        .trim();
      if (item.name && clean.includes(item.name)) {
        clean = clean.replace(item.name, "").trim();
      }
      if (clean && !candidates.includes(clean)) candidates.push(clean);
    }
    if (item.name && typeof item.name === "string" && item.name.trim()) {
      candidates.push(item.name.trim());
    }

    if (engine && typeof engine.getSectors === "function") {
      const sectors = engine.getSectors();
      function matchInSec(sec, term) {
        if (!sec || !sec.branches) return null;
        const raw = term.toLowerCase();
        for (const br of sec.branches) {
          const brAr = (br.name_ar || "").toLowerCase();
          const brEn = (br.name_en || "").toLowerCase();
          if (brAr === raw || brEn === raw) return br.name_ar;
        }
        for (const br of sec.branches) {
          for (const leaf of (br.leaves || [])) {
            const lStr = (typeof leaf === "string" ? leaf : (leaf.ar || leaf.name_ar || "")).toLowerCase();
            if (lStr === raw) return br.name_ar;
          }
        }
        for (const br of sec.branches) {
          for (const leaf of (br.leaves || [])) {
            const lStr = (typeof leaf === "string" ? leaf : (leaf.ar || leaf.name_ar || "")).toLowerCase();
            if (lStr.length >= 3 && raw.includes(lStr)) return br.name_ar;
          }
        }
        for (const br of sec.branches) {
          const brAr = (br.name_ar || "").toLowerCase();
          if (brAr.length >= 4 && (raw.includes(brAr) || brAr.includes(raw))) return br.name_ar;
        }
        return null;
      }

      if (mainCat) {
        const sec = sectors.find(s => s.name_ar === mainCat || (s.name_en && s.name_en.toLowerCase() === mainCat.toLowerCase()));
        if (sec) {
          for (const c of candidates) {
            const f = matchInSec(sec, c);
            if (f) return f;
          }
        }
      }

      for (const c of candidates) {
        for (const sec of sectors) {
          const f = matchInSec(sec, c);
          if (f) return f;
        }
      }
    }

    return item.searchKeyword || (candidates[1] || item.category || "-");
  },

  escapeXml(unsafe) {
    if (unsafe == null) return "";
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  },

  /**
   * تحويل البيانات إلى مصفوفة كائنات منسقة باللغة العربية ومصطلحات جغرافية معيارية
   * مع الفصل الصارم والتام لإحداثيات خط الطول X ودائرة العرض Y في عمودين مستقلين
   */
  language: 'ar',
  categoryLabelCache: new Map(),

  setLanguage(language) {
    this.language = language === 'en' ? 'en' : 'ar';
  },

  exportInWorker(format, results, filenamePrefix = 'dalil_spatial_survey', categoryFilter = null, options = {}) {
    const effective = { ...options, language: this.exportLanguage(options) };
    if (typeof Worker === 'undefined' || typeof chrome === 'undefined' || !chrome.runtime?.getURL) {
      const method = { xlsx: 'exportToExcel', excel: 'exportToExcel', shp: 'exportToShapefile', shapefile: 'exportToShapefile', kmz: 'exportToKmz', kml: 'exportToKml', geojson: 'exportToGeoJson', json: 'exportToJson', csv: 'exportToCsv' }[format];
      if (!method) return Promise.reject(new Error('Unsupported export format'));
      return Promise.resolve(this[method](results, filenamePrefix, categoryFilter, effective));
    }
    return new Promise((resolve, reject) => {
      const worker = new Worker(chrome.runtime.getURL('core/export-worker.js'));
      const requestId = 'export-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      const cleanup = () => { clearTimeout(timeout); worker.terminate(); };
      const timeout = setTimeout(() => { cleanup(); reject(new Error(effective.language === 'en' ? 'The export exceeded its time limit.' : 'تجاوز التصدير المهلة المحددة.')); }, 180000);
      worker.onerror = () => { cleanup(); reject(new Error(effective.language === 'en' ? 'The local export worker could not finish.' : 'تعذر إكمال التصدير في المعالج المحلي.')); };
      worker.onmessage = event => {
        if (event.data?.requestId !== requestId) return;
        cleanup();
        if (!event.data.success) { reject(new Error(event.data.error)); return; }
        for (const file of event.data.files) this.downloadBlob(new Blob([file.bytes], { type: file.type }), file.name);
        resolve({ files: event.data.files.map(file => file.name) });
      };
      try { worker.postMessage({ requestId, format, records: results, prefix: filenamePrefix, categoryFilter, options: effective }); }
      catch (error) { cleanup(); reject(error); }
    });
  },

  exportLanguage(options) {
    return (typeof options === 'string' ? options : options?.language) === 'en' || (!options?.language && this.language === 'en') ? 'en' : 'ar';
  },

  messages(options) {
    return this.exportLanguage(options) === 'en'
      ? { empty: 'No reusable records are available for export.', unnamed: 'Unnamed place', general: 'Unclassified', places: 'Places', metadata: 'Metadata', fields: 'Fields', coverage: 'Source Coverage', unlocated: 'Unlocated', warning: 'Source rights are unspecified for imported legacy records; verify them before reuse.', description: 'DALIL spatial records. Source rights and coordinate verification are recorded in the metadata.' }
      : { empty: 'لا توجد سجلات متاحة ومسموح بإعادة استخدامها للتصدير.', unnamed: 'مكان بلا اسم', general: 'غير مصنف', places: 'الأماكن', metadata: 'البيانات الوصفية', fields: 'الحقول', coverage: 'تغطية المصادر', unlocated: 'بلا إحداثيات موثقة', warning: 'حقوق المصدر غير محددة للسجلات القديمة المستوردة؛ تحقق منها قبل إعادة الاستخدام.', description: 'سجلات مكانية من دليل. تُوثّق حقوق المصدر والتحقق من الإحداثيات في البيانات الوصفية.' };
  },

  numberOrEmpty(value, precision = null) {
    if (value === '' || value === null || value === undefined || !Number.isFinite(Number(value))) return '';
    return precision === null ? Number(value) : Number(Number(value).toFixed(precision));
  },

  hasVerifiedGeometry(item) {
    if (!item || item.hasExactCoords === false || item.isApproximate === true || /viewport|camera|cell_center|unverified/i.test(item.coordinateSource || '')) return false;
    if (item.x === '' || item.y === '' || item.x == null || item.y == null) return false;
    const x = Number(item.x), y = Number(item.y);
    return Number.isFinite(x) && Number.isFinite(y) && Math.abs(x) <= 180 && Math.abs(y) <= 90 && (x !== 0 || y !== 0 || item.hasExactCoords === true);
  },

  exportRestriction(item) {
    const rights = item.rights || item.licensePolicy || {};
    if (item.exportAllowed === false || rights.exportAllowed === false) return 'source_export_restricted';
    if (item.provider === 'user_import' && rights.exportAllowed === true && rights.license) return null;
    const providers = [item.provider, item.source];
    for (const p of (Array.isArray(item.provenance) ? item.provenance : [])) providers.push(p.provider, p.source);
    for (const provenance of Object.values(item.fieldProvenance || item.fieldSources || {})) {
      for (const p of (Array.isArray(provenance) ? provenance : [provenance])) providers.push(p?.provider, p?.source);
    }
    if (providers.some(p => /\bgoogle(?:[_\s-]*(?:maps|places))?|خرائط\s*جوجل/i.test(String(p || '')))) return 'google_content_export_restricted';
    return null;
  },

  selectExportRecords(results, categoryFilter = null) {
    const included = [], excluded = [];
    for (const item of (results || [])) {
      if (categoryFilter && String(categoryFilter).toLowerCase() !== 'all' && this.resolveMainCategory(item) !== categoryFilter && item.searchKeyword !== categoryFilter) continue;
      const reason = this.exportRestriction(item);
      if (reason) excluded.push({ reason });
      else included.push(item);
    }
    return { included, excluded, located: included.filter(item => this.hasVerifiedGeometry(item)), unlocated: included.filter(item => !this.hasVerifiedGeometry(item)) };
  },

  categoryLabel(item, kind, options) {
    const key = JSON.stringify([this.exportLanguage(options), kind, item.canonicalId || item.categoryId || (item.categoryIds || [])[0], item.categoryMain, item.sector, item.subCategory, item.branch, item.searchKeyword || item.category || item.name]);
    if (this.categoryLabelCache.has(key)) return this.categoryLabelCache.get(key);
    const raw = kind === 'main' ? this.resolveMainCategory(item) : this.resolveSubCategory(item);
    const remember = value => { if (this.categoryLabelCache.size > 4096) this.categoryLabelCache.clear(); this.categoryLabelCache.set(key, value); return value; };
    if (this.exportLanguage(options) === 'ar') return remember(raw);
    const engine = typeof TaxonomyEngine !== 'undefined' ? TaxonomyEngine : TaxonomyEngineRef;
    const categoryId = item.canonicalId || item.categoryId || (item.categoryIds || [])[0];
    const concept = categoryId && engine?.getCategory ? engine.getCategory(categoryId) : null;
    const groupId = concept?.groupId;
    for (const sector of (engine?.getSectors ? engine.getSectors() : [])) {
      if (sector.name_ar === raw || (kind === 'main' && sector.id === groupId)) return remember(sector.name_en || this.messages(options).general);
      for (const branch of (sector.branches || [])) if (branch.name_ar === raw) return remember(branch.name_en || this.messages(options).general);
    }
    return remember(/^[\x00-\x7F]*$/.test(raw || '') ? raw : this.messages(options).general);
  },

  exportFieldDefinitions(options) {
    const ar = ['م','اسم المعلم / الظاهرة الجغرافية','الاسم بالإنجليزية','خط الطول (X)','دائرة العرض (Y)','الفئة الرئيسية','التصنيف الفرعي','النشاط / التصنيف','الظاهرة المستهدفة','العنوان والحي','رقم الهاتف','الرمز المفتوح (Plus Code)','الموقع الإلكتروني','حالة العمل','مواعيد العمل','التقييم (نجوم)','عدد التقييمات','مستوى الأسعار','الخدمات والمزايا','معرف جوجل (Place ID / CID)','رابط الصورة','المصدر','المربع الجغرافي','الخلية المالكة','خلايا الاكتشاف','كلمات الاستعلام','مصدر الإحداثيات','حالة الدقة','رابط خرائط جوجل','معرف المكان','تاريخ الاستخراج','البريد الإلكتروني','معرفات التصنيف','معرف الرمز','مصدر كل حقل','ترخيص المصدر','حالة حقوق الاستخدام'];
    const en = ['Index','Place name','English name','Longitude (X)','Latitude (Y)','Main category','Subcategory','Source category','Search term','Address','Phone','Plus Code','Website','Business status','Opening hours','Rating','Review count','Price level','Attributes','Google Place ID / CID','Thumbnail URL','Source','Discovery cell','Owner cell','Discovery cells','Query IDs','Coordinate source','Coordinate quality','Google Maps URL','Internal ID','Observed at','Email','Category IDs','Symbol ID','Field provenance','Source license','Reuse rights'];
    const ids = ['index','name','name_en','longitude_x','latitude_y','main_category','subcategory','category','search_keyword','address','phone','plus_code','website','status','opening_hours','rating','reviews_count','price_level','attributes','place_id','thumbnail_url','source','discovery_cell','owner_cell','discovery_cells','query_ids','coordinate_source','coordinate_quality','url','id','observed_at','email','category_ids','symbol_id','field_provenance','source_license','reuse_rights'];
    ids.push('symbol_color','symbol_shape','symbol_glyph');ar.push('لون الرمز','شكل العلامة','رسم الرمز');en.push('Symbol color','Marker shape','Symbol glyph');
    return ids.map((id, index) => ({ id, label: (this.exportLanguage(options) === 'en' ? en : ar)[index], type: ['index','longitude_x','latitude_y','rating','reviews_count'].includes(id) ? 'number' : 'text' }));
  },

  symbolFor(item) {
    const registry = typeof DalilSymbology !== 'undefined' ? DalilSymbology : (typeof require === 'function' ? require('../core/symbology.js') : null);
    return registry ? registry.resolve(item) : { symbolId: 'dalil.unclassified', assetKey:'dalil-unclassified',glyph: 'marker', pngPath: 'assets/symbols/variants/dalil-unclassified.png', svgPath: 'assets/symbols/variants/dalil-unclassified.svg',color:'#536171',shape:'diamond',match: 'family' };
  },

  canonicalExportRecord(item, index, options) {
    const language = this.exportLanguage(options);
    const serialize = value => typeof value === 'object' && value !== null ? JSON.stringify(value) : (value ?? '');
    const rights = item.rights || item.licensePolicy || {};
    const valid = this.hasVerifiedGeometry(item);
    return {
      index: index + 1, name: item.name || '', name_en: item.name_en || '',
      longitude_x: valid ? this.numberOrEmpty(item.x, 6) : '', latitude_y: valid ? this.numberOrEmpty(item.y, 6) : '',
      main_category: this.categoryLabel(item, 'main', options), subcategory: this.categoryLabel(item, 'sub', options),
      category: item.category || '', search_keyword: item.searchKeyword || '', address: item.address || '', phone: item.phone || '', plus_code: item.plus_code || '',
      website: item.website || '', status: item.status || '', opening_hours: serialize(item.opening_hours), rating: this.numberOrEmpty(item.rating), reviews_count: this.numberOrEmpty(item.reviewsCount),
      price_level: item.price_level || '', attributes: serialize(item.attributes), place_id: item.cid || item.place_id || item.id || '', thumbnail_url: item.thumbnail_url || '',
      source: item.provider || item.source || 'user_import_unspecified', discovery_cell: item.cellName || item.discoveryCellId || '', owner_cell: item.ownerCellName || item.ownerCellId || '',
      discovery_cells: serialize(item.discoveryCellIds || []), query_ids: serialize(item.searchQueryIds || []),
      coordinate_source: item.coordinateSource || (item.hasExactCoords === true ? 'exact_place_geometry' : 'legacy_unspecified'),
      coordinate_quality: language === 'en' ? (valid ? 'Verified geometry' : 'Unverified geometry') : (valid ? 'إحداثيات موثقة' : 'إحداثيات غير مؤكدة'),
      url: item.url || '', id: item.internalId || item.id || '', observed_at: item.lastUpdated || item.timestamp || '', email: item.email || item.contact?.email || '',
      category_ids: serialize(item.categoryIds || (item.canonicalId ? [item.canonicalId] : [])), symbol_id: this.symbolFor(item).symbolId,
      symbol_color:this.symbolFor(item).color,symbol_shape:this.symbolFor(item).shape,symbol_glyph:this.symbolFor(item).glyph,
      field_provenance: serialize(item.fieldProvenance || item.fieldSources || item.provenance || []),
      source_license: rights.license || item.license || '', reuse_rights: rights.exportAllowed === true || item.exportAllowed === true ? 'permitted_by_source' : 'unspecified'
    };
  },

  formatDataForExport(results, options = {}) {
    const fields = this.exportFieldDefinitions(options);
    return (results || []).filter(item => !this.exportRestriction(item)).map((item, index) => {
      const canonical = this.canonicalExportRecord(item, index, options);
      return Object.fromEntries(fields.map(field => [field.label, canonical[field.id]]));
    });
  },

  exportMetadata(selection, options) {
    const sources = new Map();
    for (const item of selection.included) {
      const provider = item.provider || item.source || 'user_import_unspecified';
      const entry = sources.get(provider) || { provider, records: 0, license: item.rights?.license || item.license || '', attribution: item.rights?.attribution || item.attribution || '', rights: item.exportAllowed === true || item.rights?.exportAllowed === true ? 'permitted_by_source' : 'unspecified' };
      entry.records++;
      sources.set(provider, entry);
    }
    return { schemaVersion: 'dalil.export/1', generatedAt: new Date().toISOString(), language: this.exportLanguage(options), coordinateSystem: 'EPSG:4326', coordinateOrder: 'X=longitude,Y=latitude', included: selection.included.length, located: selection.located.length, unlocated: selection.unlocated.length, restricted: selection.excluded.length, excludedReasons: selection.excluded.reduce((counts, row) => { counts[row.reason] = (counts[row.reason] || 0) + 1; return counts; }, {}), sources: [...sources.values()], warnings: [...sources.values()].some(row => row.rights === 'unspecified') ? [this.messages(options).warning] : [] };
  },

  generateKmlString(results, filenamePrefix = 'dalil_spatial_survey', categoryFilter = null, options = {}) {
    const selection = this.selectExportRecords(results, categoryFilter);
    const fields = this.exportFieldDefinitions(options);
    const styles = new Map(), sectors = new Map();
    for (const item of selection.located) {
      const symbol = this.symbolFor(item);
      const styleId = 'style_' + symbol.symbolId.replace(/[^A-Za-z0-9_.-]/g, '_');
      styles.set(styleId, symbol);
      const main = this.categoryLabel(item, 'main', options), sub = this.categoryLabel(item, 'sub', options);
      if (!sectors.has(main)) sectors.set(main, new Map());
      if (!sectors.get(main).has(sub)) sectors.get(main).set(sub, []);
      sectors.get(main).get(sub).push({ item, symbol, styleId });
    }
    const esc = value => this.escapeXml(value);
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document>\n<name>' + esc(filenamePrefix) + '</name><description>' + esc(this.messages(options).description) + '</description>\n';
    for (const [styleId, symbol] of styles) {
      xml += '<Style id="' + esc(styleId) + '"><IconStyle><color>ffffffff</color><scale>1</scale><Icon><href>icons/' + symbol.assetKey + '.png</href></Icon><hotSpot x="0.5" y="0.5" xunits="fraction" yunits="fraction"/></IconStyle><LabelStyle><scale>0.85</scale></LabelStyle></Style>\n';
    }
    for (const [main, branches] of sectors) {
      xml += '<Folder><name>' + esc(main) + '</name>';
      for (const [sub, items] of branches) {
        xml += '<Folder><name>' + esc(sub) + '</name>';
        for (const { item, symbol, styleId } of items) {
          const record = this.canonicalExportRecord(item, 0, options);
          const html = '<div dir="' + (this.exportLanguage(options) === 'en' ? 'ltr' : 'rtl') + '"><b>' + esc(item.name || this.messages(options).unnamed) + '</b><table>' + fields.map(field => '<tr><th>' + esc(field.label) + '</th><td>' + esc(record[field.id]) + '</td></tr>').join('') + '</table></div>';
          xml += '<Placemark><name>' + esc(item.name || this.messages(options).unnamed) + '</name><description><![CDATA[' + html.replace(/]]>/g, ']]]]><![CDATA[>') + ']]></description><styleUrl>#' + styleId + '</styleUrl><ExtendedData>';
          for (const field of fields) xml += '<Data name="' + esc(field.id) + '"><displayName>' + esc(field.label) + '</displayName><value>' + esc(record[field.id]) + '</value></Data>';
          xml += '<Data name="original_record"><value>' + esc(JSON.stringify(item)) + '</value></Data><Data name="symbol_match"><value>' + symbol.match + '</value></Data></ExtendedData><Point><coordinates>' + record.longitude_x + ',' + record.latitude_y + ',0</coordinates></Point></Placemark>\n';
        }
        xml += '</Folder>';
      }
      xml += '</Folder>';
    }
    return xml + '<ExtendedData><Data name="dalil_export_metadata"><value>' + esc(JSON.stringify(this.exportMetadata(selection, options))) + '</value></Data></ExtendedData></Document></kml>';
  },

  async readLocalAsset(relativePath) {
    if (!/^assets\/symbols\/(?:variants\/)?[a-z0-9-]+\.png$/.test(relativePath)) throw new Error('Invalid local symbol path');
    if (typeof process !== 'undefined' && process.versions?.node && typeof require === 'function') return new Uint8Array(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', relativePath)));
    const url = typeof chrome !== 'undefined' && chrome.runtime?.getURL ? chrome.runtime.getURL(relativePath) : '../' + relativePath;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Local symbol unavailable: ' + relativePath);
    return new Uint8Array(await response.arrayBuffer());
  },

  async buildKmzFiles(results, filenamePrefix = 'dalil_spatial_survey', categoryFilter = null, options = {}) {
    const selection = this.selectExportRecords(results, categoryFilter);
    const symbols = new Map(selection.located.map(item => { const symbol = this.symbolFor(item); return [symbol.symbolId, symbol]; }));
    const icons = [];
    for (const symbol of symbols.values()) icons.push({ name: 'icons/' + symbol.assetKey + '.png', data: await this.readLocalAsset(symbol.pngPath) });
    return [{ name: 'doc.kml', data: this.generateKmlString(results, filenamePrefix, categoryFilter, options) }, ...icons, { name: 'metadata.json', data: JSON.stringify(this.exportMetadata(selection, options), null, 2) }];
  },

  exportFilename(prefix, categoryFilter, extension) {
    const clean = value => String(value || 'dalil').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').slice(0, 100);
    const suffix = categoryFilter && categoryFilter !== 'ALL' ? '_' + clean(categoryFilter) : '';
    return clean(prefix) + suffix + '_' + new Date().toISOString().slice(0, 10) + '.' + extension;
  },

  requireExportRecords(results, categoryFilter, options) {
    const selected = this.selectExportRecords(results, categoryFilter);
    if (selected.included.length) return selected;
    if (typeof alert === 'function') alert(this.messages(options).empty);
    return null;
  },

  async exportToKml(results, filenamePrefix = 'dalil_spatial_survey', categoryFilter = null, options = {}) {
    if (!this.requireExportRecords(results, categoryFilter, options)) return;
    const files = await this.buildKmzFiles(results, filenamePrefix, categoryFilter, options);
    const filename = this.exportFilename(filenamePrefix, categoryFilter, 'kml');
    this.downloadBlob(new Blob([files[0].data], { type: 'application/vnd.google-earth.kml+xml;charset=utf-8' }), filename);
    // Extract this companion archive beside the KML to resolve its relative icons/ paths.
    this.downloadBlob(new Blob([this.createZip(files.slice(1))], { type: 'application/zip' }), filename.replace(/\.kml$/, '_resources.zip'));
    return files;
  },

  async exportToKmz(results, filenamePrefix = 'dalil_spatial_survey', categoryFilter = null, options = {}) {
    if (!this.requireExportRecords(results, categoryFilter, options)) return;
    const files = await this.buildKmzFiles(results, filenamePrefix, categoryFilter, options);
    const bytes = this.createZip(files);
    this.downloadBlob(new Blob([bytes], { type: 'application/vnd.google-earth.kmz' }), this.exportFilename(filenamePrefix, categoryFilter, 'kmz'));
    return bytes;
  },

  getXlsx() {
    if (typeof XLSX !== 'undefined') return XLSX;
    if (typeof require === 'function') { try { return require('./xlsx.full.min.js'); } catch (_) {} }
    return null;
  },

  buildWorkbook(results, categoryFilter = null, options = {}) {
    const library = this.getXlsx();
    if (!library) throw new Error(this.exportLanguage(options) === 'en' ? 'The local spreadsheet library is unavailable.' : 'مكتبة الجداول المحلية غير متاحة.');
    const selection = this.selectExportRecords(results, categoryFilter), messages = this.messages(options);
    const workbook = library.utils.book_new(), language = this.exportLanguage(options);
    const metadata = this.exportMetadata(selection, options), fields = this.exportFieldDefinitions(options);
    const usedNames = new Set();
    const append = (name, rows, width = 24) => {
      const base = String(name).replace(/[:\\/?*\[\]]/g, '_').slice(0, 27) || messages.general;
      let sheetName = base, suffix = 1;
      while (usedNames.has(sheetName)) sheetName = base + '_' + suffix++;
      usedNames.add(sheetName);
      const sheet = library.utils.json_to_sheet(rows);
      if (rows[0]) {
        const columns = Object.keys(rows[0]);
        for (let column = 0; column < columns.length; column++) {
          if (!['Longitude (X)', 'Latitude (Y)', 'خط الطول (X)', 'دائرة العرض (Y)'].includes(columns[column])) continue;
          for (let row = 1; row <= rows.length; row++) {
            const cell = sheet[library.utils.encode_cell({ r: row, c: column })];
            if (cell && cell.t === 'n') cell.z = '0.000000';
          }
        }
      }
      sheet['!cols'] = Array.from({ length: rows[0] ? Object.keys(rows[0]).length : 1 }, () => ({ wch: width }));
      if (sheet['!ref']) sheet['!autofilter'] = { ref: sheet['!ref'] };
      sheet['!views'] = [{ RTL: language === 'ar', state: 'frozen', ySplit: 1, topLeftCell: 'A2' }];
      library.utils.book_append_sheet(workbook, sheet, sheetName);
    };
    append(messages.places, this.formatDataForExport(selection.included, options));
    append(messages.metadata, Object.entries(metadata).filter(([key]) => key !== 'sources').map(([key, value]) => language === 'en' ? { Property: key, Value: typeof value === 'object' ? JSON.stringify(value) : value } : { 'الخاصية': key, 'القيمة': typeof value === 'object' ? JSON.stringify(value) : value }));
    append(messages.fields, fields.map(field => language === 'en' ? { ID: field.id, Label: field.label, Type: field.type } : { 'المعرف': field.id, 'التسمية': field.label, 'النوع': field.type }));
    append(messages.coverage, metadata.sources.map(row => language === 'en' ? { Provider: row.provider, Records: row.records, License: row.license, Attribution: row.attribution, Rights: row.rights } : { 'المزود': row.provider, 'السجلات': row.records, 'الترخيص': row.license, 'النسب': row.attribution, 'الحقوق': row.rights }));
    append(messages.unlocated, this.formatDataForExport(selection.unlocated, options));
    if (options.perCategory !== false) {
      const groups = new Map();
      for (const item of selection.included) {
        const category = this.categoryLabel(item, 'main', options);
        if (!groups.has(category)) groups.set(category, []);
        groups.get(category).push(item);
      }
      for (const [name, items] of groups) append(name, this.formatDataForExport(items, options));
    }
    workbook.Workbook = { Views: [{ RTL: language === 'ar' }] };
    workbook.Props = { Title: 'DALIL', Subject: messages.description, Comments: JSON.stringify(metadata) };
    return workbook;
  },

  serializeWorkbook(workbook, options = {}) {
    const library = this.getXlsx();
    const bytes = library.write(workbook, { type: 'array', bookType: 'xlsx', compression: false });
    // SheetJS CE writes RTL views but does not serialize frozen panes. Add the OOXML pane
    // after writing our newly-created workbook; existing user workbooks are never rewritten.
    const zip = library.CFB.read(new Uint8Array(bytes), { type: 'array' });
    const files = [];
    for (let index = 0; index < zip.FullPaths.length; index++) {
      const name = zip.FullPaths[index].replace(/^[^/]+\//, '');
      const entry = zip.FileIndex[index];
      if (!name || name.endsWith('/') || name.includes('\u0001Sh33tJ5') || !entry.content) continue;
      let content = new Uint8Array(entry.content);
      if (/^xl\/worksheets\/sheet\d+\.xml$/.test(name)) {
        const xml = new TextDecoder().decode(content);
        const views = '<sheetViews><sheetView workbookViewId="0" rightToLeft="' + (this.exportLanguage(options) === 'ar' ? '1' : '0') + '"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>';
        content = new TextEncoder().encode(xml.replace(/<sheetViews>[\s\S]*?<\/sheetViews>/, views));
      }
      files.push({ name, data: content });
    }
    return this.createZip(files);
  },

  exportToExcel(results, filenamePrefix = 'dalil_spatial_survey', categoryFilter = null, options = {}) {
    if (!this.requireExportRecords(results, categoryFilter, options)) return;
    const workbook = this.buildWorkbook(results, categoryFilter, options);
    const bytes = this.serializeWorkbook(workbook, options);
    this.downloadBlob(new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), this.exportFilename(filenamePrefix, categoryFilter, 'xlsx'));
    return workbook;
  },

  generateGeoJson(results, filenamePrefix = 'dalil_spatial_survey', categoryFilter = null, options = {}) {
    const selection = this.selectExportRecords(results, categoryFilter);
    return { type: 'FeatureCollection', name: filenamePrefix, metadata: this.exportMetadata(selection, options), features: selection.located.map((item, index) => {
      const canonical = this.canonicalExportRecord(item, index, options);
      return { type: 'Feature', id: item.internalId || item.id || index + 1, geometry: { type: 'Point', coordinates: [canonical.longitude_x, canonical.latitude_y] }, properties: { ...item, ...canonical } };
    }), unlocated: selection.unlocated.map((item, index) => ({ ...item, ...this.canonicalExportRecord(item, index, options), geometry: null })) };
  },

  exportToGeoJson(results, filenamePrefix = 'dalil_spatial_survey', categoryFilter = null, options = {}) {
    if (!this.requireExportRecords(results, categoryFilter, options)) return;
    const geojson = this.generateGeoJson(results, filenamePrefix, categoryFilter, options);
    this.downloadBlob(new Blob([JSON.stringify(geojson, null, 2)], { type: 'application/geo+json;charset=utf-8' }), this.exportFilename(filenamePrefix, categoryFilter, 'geojson'));
    return geojson;
  },

  exportToJson(results, filenamePrefix = 'dalil_spatial_survey', categoryFilter = null, options = {}) {
    const selection = this.requireExportRecords(results, categoryFilter, options);
    if (!selection) return;
    const data = { schemaVersion: 'dalil.records/1', metadata: this.exportMetadata(selection, options), records: selection.included.map((item, index) => ({ ...item, ...this.canonicalExportRecord(item, index, options), geometry: this.hasVerifiedGeometry(item) ? { type: 'Point', coordinates: [Number(item.x.toFixed ? item.x.toFixed(6) : Number(item.x).toFixed(6)), Number(item.y.toFixed ? item.y.toFixed(6) : Number(item.y).toFixed(6))] } : null })) };
    this.downloadBlob(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' }), this.exportFilename(filenamePrefix, categoryFilter, 'json'));
    return data;
  },

  generateCsv(results, options = {}) {
    const data = this.formatDataForExport(results, options), headers = this.exportFieldDefinitions(options).map(field => field.label);
    const quote = value => {
      let text = value == null ? '' : String(value);
      if (typeof value === 'string' && /^[\s]*[=+@-]/.test(text)) text = "'" + text;
      return '"' + text.replace(/"/g, '""') + '"';
    };
    return '\uFEFF' + [headers.map(quote).join(','), ...data.map(row => headers.map(key => quote(row[key])).join(','))].join('\r\n');
  },

  exportToCsv(results, filenamePrefix = 'dalil_spatial_survey', categoryFilter = null, options = {}) {
    const selection = this.requireExportRecords(results, categoryFilter, options);
    if (!selection) return;
    const content = this.generateCsv(selection.included, options);
    this.downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8' }), this.exportFilename(filenamePrefix, categoryFilter, 'csv'));
    return content;
  },

  buildShapefile(results, filenamePrefix = 'places', categoryFilter = null, options = {}) {
    const selection = this.selectExportRecords(results, categoryFilter);
    const items = selection.located, points = items.map(item => [Number(Number(item.x).toFixed(6)), Number(Number(item.y).toFixed(6))]);
    const name = String(filenamePrefix).replace(/[^a-z0-9_-]/gi, '_').slice(0, 50) || 'places';
    const xs = points.map(point => point[0]), ys = points.map(point => point[1]);
    let xmin = 0, xmax = 0, ymin = 0, ymax = 0;
    if (points.length) {
      xmin = xmax = xs[0]; ymin = ymax = ys[0];
      for (const [x, y] of points) { xmin = Math.min(xmin, x); xmax = Math.max(xmax, x); ymin = Math.min(ymin, y); ymax = Math.max(ymax, y); }
    }
    const header = (bytes, length) => {
      const view = new DataView(bytes.buffer); view.setInt32(0, 9994, false); view.setInt32(24, length / 2, false); view.setInt32(28, 1000, true); view.setInt32(32, 1, true);
      [xmin,ymin,xmax,ymax].forEach((n, i) => view.setFloat64(36 + i * 8, n, true)); return view;
    };
    const shp = new Uint8Array(100 + points.length * 28), shx = new Uint8Array(100 + points.length * 8);
    const sv = header(shp, shp.length), xv = header(shx, shx.length);
    points.forEach(([x, y], index) => {
      const pos = 100 + index * 28;
      sv.setInt32(pos, index + 1, false); sv.setInt32(pos + 4, 10, false); sv.setInt32(pos + 8, 1, true); sv.setFloat64(pos + 12, x, true); sv.setFloat64(pos + 20, y, true);
      xv.setInt32(100 + index * 8, pos / 2, false); xv.setInt32(104 + index * 8, 10, false);
    });
    const definitions = [
      ['id','ID','C',80,0], ['name','NAME','C',254,0], ['name_en','NAME_EN','C',254,0], ['longitude_x','LONGITUDE','N',20,6], ['latitude_y','LATITUDE','N',20,6],
      ['main_category','MAIN_CAT','C',254,0], ['subcategory','SUB_CAT','C',254,0], ['category_ids','CAT_IDS','C',254,0], ['source','PROVIDER','C',100,0],
      ['phone','PHONE','C',80,0], ['email','EMAIL','C',160,0], ['website','WEBSITE','C',254,0], ['address','ADDRESS','C',254,0], ['place_id','PLACE_ID','C',160,0],
      ['symbol_id','SYMBOL_ID','C',160,0], ['symbol_color','SYM_COLOR','C',7,0], ['symbol_shape','SYM_SHAPE','C',20,0], ['symbol_glyph','SYM_GLYPH','C',32,0], ['coordinate_source','COORD_SRC','C',80,0], ['source_license','LICENSE','C',80,0]
    ];
    const encoder = new TextEncoder(), headerSize = 32 + definitions.length * 32 + 1, recordSize = 1 + definitions.reduce((n, d) => n + d[3], 0);
    const dbf = new Uint8Array(headerSize + recordSize * items.length + 1).fill(32), dv = new DataView(dbf.buffer), date = new Date();
    dbf[0] = 3; dbf[1] = date.getUTCFullYear() - 1900; dbf[2] = date.getUTCMonth() + 1; dbf[3] = date.getUTCDate();
    dv.setUint32(4, items.length, true); dv.setUint16(8, headerSize, true); dv.setUint16(10, recordSize, true); dbf.fill(0, 12, 32);
    definitions.forEach((def, index) => {
      const pos = 32 + index * 32; dbf.fill(0, pos, pos + 32); dbf.set(encoder.encode(def[1]), pos); dbf[pos + 11] = def[2].charCodeAt(0); dbf[pos + 16] = def[3]; dbf[pos + 17] = def[4];
    });
    dbf[headerSize - 1] = 13; dbf[dbf.length - 1] = 26;
    const truncated = [];
    items.forEach((item, index) => {
      let offset = headerSize + index * recordSize; dbf[offset++] = 32;
      const row = this.canonicalExportRecord(item, index, options);
      for (const [key, field, type, width, decimals] of definitions) {
        let value = type === 'N' ? (Number.isFinite(Number(row[key])) ? Number(row[key]).toFixed(decimals) : '') : String(row[key] ?? '');
        let bytes = encoder.encode(value);
        if (bytes.length > width) {
          truncated.push({ record: index + 1, field, reason: 'dbf_byte_limit', fullValueIn: 'records.json' });
          let text = ''; for (const character of value) { if (encoder.encode(text + character).length > width) break; text += character; } bytes = encoder.encode(text);
        }
        dbf.set(bytes, offset + (type === 'N' ? width - bytes.length : 0)); offset += width;
      }
    });
    const metadata = this.exportMetadata(selection, options);
    metadata.dbfTruncations = truncated; metadata.dbfEncoding = 'UTF-8'; metadata.fullRecordCompanion = 'records.json';
    const prj = 'GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]]';
    return [{ name: name + '.shp', data: shp }, { name: name + '.shx', data: shx }, { name: name + '.dbf', data: dbf }, { name: name + '.prj', data: prj }, { name: name + '.cpg', data: 'UTF-8' },
      { name: 'fields.json', data: JSON.stringify(definitions.map(([id, dbf, type, bytes, decimals]) => ({ id, dbf, type, bytes, decimals, label: this.exportFieldDefinitions(options).find(f => f.id === id)?.label || id })), null, 2) },
      { name: 'records.json', data: JSON.stringify({ metadata, records: selection.included }, null, 2) }, { name: 'metadata.json', data: JSON.stringify(metadata, null, 2) }];
  },

  exportToShapefile(results, filenamePrefix = 'dalil_spatial_survey', categoryFilter = null, options = {}) {
    if (!this.requireExportRecords(results, categoryFilter, options)) return;
    const files = this.buildShapefile(results, 'places', categoryFilter, options), bytes = this.createZip(files);
    this.downloadBlob(new Blob([bytes], { type: 'application/zip' }), this.exportFilename(filenamePrefix, categoryFilter, 'shp.zip'));
    return bytes;
  },

  async exportSeparateFilesPerCategory(results, format = 'kml', filenamePrefix = 'dalil_spatial_survey', options = {}) {
    const selection = this.requireExportRecords(results, null, options);
    if (!selection) return;
    const groups = new Map();
    for (const item of selection.included) { const cat = this.categoryLabel(item, 'main', options); if (!groups.has(cat)) groups.set(cat, []); groups.get(cat).push(item); }
    const method = { kml: 'exportToKml', kmz: 'exportToKmz', excel: 'exportToExcel', xlsx: 'exportToExcel', geojson: 'exportToGeoJson', json: 'exportToJson', csv: 'exportToCsv', shp: 'exportToShapefile', shapefile: 'exportToShapefile' }[format.toLowerCase()];
    if (!method) throw new Error('Unsupported export format: ' + format);
    for (const [category, items] of groups) await this[method](items, filenamePrefix + '_' + category, null, options);
  },
  smartDeduplicateByCoords(places) {
    if (!places || places.length <= 1) return places || [];
    const engine = typeof TaxonomyEngine !== 'undefined' ? TaxonomyEngine : TaxonomyEngineRef;
    const recordsApi = typeof PlaceRecords !== 'undefined' ? PlaceRecords : (typeof require === 'function' ? require('../core/records.js') : null);
    const normalize = value => recordsApi?.normalizeName ? recordsApi.normalizeName(value) : String(value || '').normalize('NFKC').toLowerCase().trim();
    const provider = item => item.provider || item.source || 'imported';
    const compatible = (a, b) => provider(a) === provider(b) && !(a.place_id && b.place_id && a.place_id !== b.place_id) && !(a.cid && b.cid && a.cid !== b.cid);
    const geometry = item => item.x !== '' && item.y !== '' && item.x != null && item.y != null && Number.isFinite(Number(item.x)) && Number.isFinite(Number(item.y)) && Math.abs(Number(item.x)) <= 180 && Math.abs(Number(item.y)) <= 90 && item.hasExactCoords !== false && !item.isApproximate;
    const distance = (a, b) => {
      if (recordsApi?.distanceMeters) return recordsApi.distanceMeters({ x: Number(a.x), y: Number(a.y) }, { x: Number(b.x), y: Number(b.y) });
      const radians = Math.PI / 180, dy = (Number(a.y) - Number(b.y)) * radians, dx = (Number(a.x) - Number(b.x)) * radians;
      const h = Math.sin(dy/2) ** 2 + Math.cos(Number(a.y)*radians) * Math.cos(Number(b.y)*radians) * Math.sin(dx/2) ** 2;
      return 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
    };
    const merge = (existing, incoming) => {
      const semantic = engine?.mergeEntities ? engine.mergeEntities(existing, incoming) : { ...existing };
      const safe = recordsApi?.merge ? recordsApi.merge(existing, incoming) : { ...existing };
      const result = { ...semantic, ...safe };
      for (const [key, value] of Object.entries(incoming)) if ((result[key] == null || result[key] === '') && value != null && value !== '') result[key] = value;
      for (const key of ['discoveryCellIds','searchQueryIds','categoryIds','qualityFlags']) result[key] = [...new Set([...(existing[key] || []), ...(incoming[key] || [])])];
      for (const key of ['provenance','discoveries']) result[key] = [...new Map([...(existing[key] || []), ...(incoming[key] || [])].map(value => [JSON.stringify(value), value])).values()];
      result.fieldProvenance = { ...(existing.fieldProvenance || {}) };
      for (const [key, value] of Object.entries(incoming.fieldProvenance || {})) if (!result.fieldProvenance[key] || ((!existing[key] || existing[key] === '') && incoming[key])) result.fieldProvenance[key] = value;
      if (result.name_en && !existing.name_en && !incoming.name_en) {
        const origin = result.name_en === incoming.name ? incoming : existing;
        result.fieldProvenance.name_en = origin.fieldProvenance?.name || { provider: provider(origin), sourceUrl: origin.url || '', state: 'provided', sourceField: 'name' };
      }
      result.providerIds = { ...(existing.providerIds || {}), ...(incoming.providerIds || {}) };
      result.observationsCount = (existing.observationsCount || 1) + (incoming.observationsCount || 1);
      if (existing.exportAllowed === false || incoming.exportAllowed === false) result.exportAllowed = false;
      if (geometry(existing) && geometry(incoming) && distance(existing, incoming) > 25) result.qualityFlags = [...new Set([...result.qualityFlags, 'coordinate_conflict'])];
      return result;
    };
    const output = [], identities = new Map(), buckets = new Map(), size = 0.001;
    const identityKeys = item => ['place_id','cid','id'].filter(key => item[key]).map(key => provider(item) + '|' + key + '|' + item[key]);
    const add = (item, index) => {
      identityKeys(item).forEach(key => identities.set(key, index));
      if (!geometry(item)) return;
      const key = Math.floor(Number(item.x)/size) + '|' + Math.floor(Number(item.y)/size);
      if (!buckets.has(key)) buckets.set(key, new Set());
      buckets.get(key).add(index);
    };
    for (const incoming of places) {
      let match = -1;
      for (const key of identityKeys(incoming)) if (identities.has(key) && compatible(output[identities.get(key)], incoming)) { match = identities.get(key); break; }
      if (match < 0 && geometry(incoming)) {
        const x = Math.floor(Number(incoming.x)/size), y = Math.floor(Number(incoming.y)/size);
        const lonRange = Math.ceil(0.00032 / (size * Math.max(0.000001, Math.cos(Number(incoming.y) * Math.PI / 180))));
        if (lonRange <= 50) outer: for (let dx = -lonRange; dx <= lonRange; dx++) for (let dy = -1; dy <= 1; dy++) {
          const wrapX = ((x + dx + 180000) % 360000 + 360000) % 360000 - 180000;
          for (const index of (buckets.get(wrapX + '|' + (y + dy)) || [])) {
            const other = output[index];
            if (!compatible(other, incoming) || distance(other, incoming) > 25) continue;
            const same = engine?.areSameEntity ? engine.areSameEntity(other, incoming) : normalize(other.name) && normalize(other.name) === normalize(incoming.name);
            if (same) { match = index; break outer; }
          }
        }
      }
      if (match < 0) { const index = output.length; output.push(incoming); add(incoming, index); }
      else { output[match] = merge(output[match], incoming); add(output[match], match); }
    }
    return output;
  },

  downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 200);
  }
};

if (typeof window !== "undefined") {
  window.ExportUtils = ExportUtils;
}
if (typeof module !== "undefined" && module.exports) {
  module.exports = ExportUtils;
}

/* Dedicated local export worker: no remote executable resources, network providers or DOM. */
'use strict';
importScripts('category-registry.js','search-languages.js','quick-library.js', '../lib/taxonomy-engine.js', 'records.js', 'symbology.js', '../lib/xlsx.full.min.js', '../lib/export-utils.js');
self.onmessage = async function (event) {
  const { requestId, format, records, prefix, categoryFilter, options = {} } = event.data || {};
  try {
    if (!Array.isArray(records)) throw new Error('Invalid export records');
    ExportUtils.setLanguage(options.language || 'ar');
    const selection = ExportUtils.selectExportRecords(records, categoryFilter);
    if (!selection.included.length) throw new Error(ExportUtils.messages(options).empty);
    const files = [];
    const text = (content, extension, type) => files.push({ name: ExportUtils.exportFilename(prefix, categoryFilter, extension), type, bytes: new TextEncoder().encode(content) });
    if (format === 'xlsx' || format === 'excel') files.push({ name: ExportUtils.exportFilename(prefix, categoryFilter, 'xlsx'), type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: ExportUtils.serializeWorkbook(ExportUtils.buildWorkbook(records, categoryFilter, options), options) });
    else if (format === 'shp' || format === 'shapefile') files.push({ name: ExportUtils.exportFilename(prefix, categoryFilter, 'shp.zip'), type: 'application/zip', bytes: ExportUtils.createZip(ExportUtils.buildShapefile(records, 'places', categoryFilter, options)) });
    else if (format === 'kmz' || format === 'kml') {
      const resources = await ExportUtils.buildKmzFiles(records, prefix, categoryFilter, options);
      if (format === 'kmz') files.push({ name: ExportUtils.exportFilename(prefix, categoryFilter, 'kmz'), type: 'application/vnd.google-earth.kmz', bytes: ExportUtils.createZip(resources) });
      else {
        const filename = ExportUtils.exportFilename(prefix, categoryFilter, 'kml');
        files.push({ name: filename, type: 'application/vnd.google-earth.kml+xml;charset=utf-8', bytes: new TextEncoder().encode(resources[0].data) });
        files.push({ name: filename.replace(/\.kml$/, '_resources.zip'), type: 'application/zip', bytes: ExportUtils.createZip(resources.slice(1)) });
      }
    }
    else if (format === 'geojson') text(JSON.stringify(ExportUtils.generateGeoJson(records, prefix, categoryFilter, options)), 'geojson', 'application/geo+json;charset=utf-8');
    else if (format === 'json') {
      const payload = { schemaVersion: 'dalil.records/1', metadata: ExportUtils.exportMetadata(selection, options), records: selection.included.map((item, index) => ({ ...item, ...ExportUtils.canonicalExportRecord(item, index, options), geometry: ExportUtils.hasVerifiedGeometry(item) ? { type: 'Point', coordinates: [Number(Number(item.x).toFixed(6)), Number(Number(item.y).toFixed(6))] } : null })) };
      text(JSON.stringify(payload), 'json', 'application/json;charset=utf-8');
    }
    else if (format === 'csv') text(ExportUtils.generateCsv(selection.included, options), 'csv', 'text/csv;charset=utf-8');
    else throw new Error('Unsupported export format');
    self.postMessage({ requestId, success: true, files }, files.map(file => file.bytes.buffer));
  } catch (error) {
    self.postMessage({ requestId, success: false, error: error.message || 'Export failed' });
  }
};

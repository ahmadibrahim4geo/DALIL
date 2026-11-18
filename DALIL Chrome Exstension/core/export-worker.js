/* Dedicated local export worker: no remote executable resources, network providers or DOM. */
'use strict';
importScripts('arabic-normalize.js','category-registry.js','search-languages.js', '../lib/taxonomy-engine.js', 'records.js', 'symbology.js', '../lib/xlsx.full.min.js', '../lib/export-utils.js');

const CHUNK_SIZE = 500;
const pending = new Map();
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

function report(requestId, phase, processed, total) {
  const safeTotal = Math.max(0, Number(total) || 0);
  const safeProcessed = Math.min(safeTotal || processed, Math.max(0, Number(processed) || 0));
  self.postMessage({ requestId, progress: { phase, processed: safeProcessed, total: safeTotal,
    percent: safeTotal ? Math.round((safeProcessed / safeTotal) * 100) : 0 } });
}

function csvRowsOnly(text) {
  const withoutBom = text.charCodeAt(0) === 0xFEFF ? text.slice(1) : text;
  const firstBreak = withoutBom.indexOf('\r\n');
  return firstBreak < 0 ? '' : withoutBom.slice(firstBreak + 2);
}

async function chunkedCsv(records, options, requestId) {
  const header = ExportUtils.generateCsv([], options);
  const parts = [header];
  let processed = 0;
  for (let index = 0; index < records.length; index += CHUNK_SIZE) {
    const chunk = records.slice(index, index + CHUNK_SIZE);
    const part = csvRowsOnly(ExportUtils.generateCsv(chunk, options));
    // The header itself has no trailing break, so every row slice needs one.
    if (part) parts.push('\r\n' + part);
    processed += chunk.length;
    report(requestId, 'rows', processed, records.length);
    await tick();
  }
  return parts.join('');
}

async function processExport(data, records) {
  const { requestId, format, prefix, categoryFilter, options = {} } = data || {};
  try {
    if (!Array.isArray(records)) throw new Error('Invalid export records');
    ExportUtils.setLanguage(options.language || 'ar');
    report(requestId, 'selection', 0, records.length);
    const selection = ExportUtils.selectExportRecords(records, categoryFilter);
    if (!selection.included.length) {
      const reasons = selection.excluded.reduce((counts, row) => { counts[row.reason] = (counts[row.reason] || 0) + 1; return counts; }, {});
      const error = new Error(ExportUtils.restrictionReport(records, categoryFilter, options));
      error.code = selection.excluded.length ? 'EXPORT_RESTRICTED' : 'EXPORT_EMPTY';
      error.details = { total: records.length, exportable: 0, restricted: selection.excluded.length, reasons };
      throw error;
    }
    const files = [];
    const text = (content, extension, type) => files.push({ name: ExportUtils.exportFilename(prefix, categoryFilter, extension), type, bytes: new TextEncoder().encode(content) });
    report(requestId, 'build', 0, selection.included.length);
    if (format === 'xlsx' || format === 'excel') {
      files.push({ name: ExportUtils.exportFilename(prefix, categoryFilter, 'xlsx'), type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes: ExportUtils.serializeWorkbook(ExportUtils.buildWorkbook(records, categoryFilter, options), options) });
    } else if (format === 'shp' || format === 'shapefile') {
      files.push({ name: ExportUtils.exportFilename(prefix, categoryFilter, 'shp.zip'), type: 'application/zip', bytes: ExportUtils.createZip(ExportUtils.buildShapefile(records, 'places', categoryFilter, options)) });
    } else if (format === 'kmz' || format === 'kml') {
      const resources = await ExportUtils.buildKmzFiles(records, prefix, categoryFilter, options);
      if (format === 'kmz') files.push({ name: ExportUtils.exportFilename(prefix, categoryFilter, 'kmz'), type: 'application/vnd.google-earth.kmz', bytes: ExportUtils.createZip(resources) });
      else {
        const filename = ExportUtils.exportFilename(prefix, categoryFilter, 'kml');
        files.push({ name: filename, type: 'application/vnd.google-earth.kml+xml;charset=utf-8', bytes: new TextEncoder().encode(resources[0].data) });
        files.push({ name: filename.replace(/\.kml$/, '_resources.zip'), type: 'application/zip', bytes: ExportUtils.createZip(resources.slice(1)) });
      }
    } else if (format === 'geojson') text(JSON.stringify(ExportUtils.generateGeoJson(records, prefix, categoryFilter, options)), 'geojson', 'application/geo+json;charset=utf-8');
    else if (format === 'json') {
      const payload = { schemaVersion: 'dalil.records/1', metadata: ExportUtils.exportMetadata(selection, options), records: selection.included.map((item, index) => ({ ...item, ...ExportUtils.canonicalExportRecord(item, index, options), geometry: ExportUtils.hasVerifiedGeometry(item) ? { type: 'Point', coordinates: [Number(Number(item.x).toFixed(6)), Number(Number(item.y).toFixed(6))] } : null })) };
      text(JSON.stringify(payload), 'json', 'application/json;charset=utf-8');
    } else if (format === 'csv') {
      const content = await chunkedCsv(selection.included, options, requestId);
      text(content, 'csv', 'text/csv;charset=utf-8');
    } else throw new Error('Unsupported export format');
    report(requestId, 'done', selection.included.length, selection.included.length);
    self.postMessage({ requestId, success: true, files }, files.map(file => file.bytes.buffer));
  } catch (error) {
    self.postMessage({ requestId, success: false, error: error.message || 'Export failed', errorCode: error.code || 'EXPORT_FAILED', details: error.details || null });
  }
}

self.onmessage = async function (event) {
  const data = event.data || {};
  // Large exports are transferred in slices so the dashboard thread never
  // structured-clones the whole record array in a single long task.
  if (data.kind === 'chunk') {
    let session = pending.get(data.requestId);
    if (!session) { session = { records: [], meta: null }; pending.set(data.requestId, session); }
    if (data.meta) session.meta = data.meta;
    if (Array.isArray(data.records)) session.records.push(...data.records);
    report(data.requestId, 'transfer', session.records.length, data.total || session.records.length);
    return;
  }
  if (data.kind === 'run') {
    const session = pending.get(data.requestId);
    pending.delete(data.requestId);
    if (!session) { self.postMessage({ requestId: data.requestId, success: false, error: 'No records were transferred', errorCode: 'EXPORT_FAILED' }); return; }
    return processExport({ ...session.meta, ...data, records: undefined }, session.records);
  }
  return processExport(data, data.records);
};

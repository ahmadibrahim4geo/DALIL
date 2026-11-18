'use strict';
// Executes the browser worker's actual scripts in an isolated worker-like VM. Native
// Chrome extension worker startup/CSP is a separate integration check.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const workerDirectory = path.join(root, 'core');
const context = vm.createContext({ TextEncoder, TextDecoder, Uint8Array, Uint16Array, Uint32Array, Int32Array, ArrayBuffer, DataView, console, setTimeout, clearTimeout, atob, btoa,
  fetch: async url => { const filename = path.resolve(workerDirectory, url); assert.ok(filename.startsWith(path.join(root, 'assets', 'symbols') + path.sep)); const bytes = fs.readFileSync(filename); return { ok: true, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) }; }
});
context.self = context;
context.importScripts = (...names) => names.forEach(name => vm.runInContext(fs.readFileSync(path.resolve(workerDirectory, name), 'utf8'), context, { filename: name }));
vm.runInContext(fs.readFileSync(path.join(workerDirectory, 'export-worker.js'), 'utf8'), context, { filename: 'export-worker.js' });
const records = [{ id: 'p1', name: 'مسجد الاختبار 東京', canonicalId: 'google_places:mosque', provider: 'osm_overpass', exportAllowed: true, x: 31.25, y: 30.05, hasExactCoords: true, coordinateSource: 'osm_node' }];
(async () => {
  for (const format of ['geojson','json','csv','shp','kmz','kml','xlsx']) {
    let response;
    context.self.postMessage = message => { response = message; };
    await context.self.onmessage({ data: { requestId: format, format, records, prefix: 'worker_test', options: { language: 'en', perCategory: false } } });
    assert.ok(response?.success, format + ': ' + response?.error);
    assert.equal(response.files.length, format === 'kml' ? 2 : 1);
    assert.ok(response.files.every(file => file.bytes.length > 10));
    if (format === 'csv') assert.deepEqual([...response.files[0].bytes.slice(0, 3)], [239, 187, 191]);
    if (format === 'kml') assert.ok(response.files[1].name.endsWith('_resources.zip'));
  }
  let rejected;
  context.self.postMessage = message => { rejected = message; };
  await context.self.onmessage({ data: { requestId: 'restricted', format: 'json', records: [{ ...records[0], provider: 'restricted_source', exportAllowed: false }], options: { language: 'en' } } });
  assert.equal(rejected.success, false);
  assert.equal(rejected.errorCode, 'EXPORT_RESTRICTED');
  assert.equal(rejected.details.restricted, 1);
  assert.equal(rejected.details.total, 1);
  assert.equal(rejected.details.exportable, 0);
  assert.match(rejected.error, /source license does not permit bulk export/);
  let mixed;
  context.self.postMessage = message => { mixed = message; };
  await context.self.onmessage({ data: { requestId: 'mixed', format: 'json', records: [records[0], { ...records[0], id: 'p2', provider: 'restricted_source', exportAllowed: false }], options: { language: 'en' } } });
  assert.equal(mixed.success, true, 'A mixed selection still exports its reusable records');
  // Verify Google Maps survey records export seamlessly across all formats
  const googleRecords = [{ id: 'g1', name: 'مسجد النور', canonicalId: 'google_places:mosque', provider: 'google_maps_dom', source: 'Google Maps', x: 31.25, y: 30.05, hasExactCoords: true }];
  for (const fmt of ['kml', 'kmz', 'xlsx', 'csv', 'geojson']) {
    let gResponse;
    context.self.postMessage = message => { gResponse = message; };
    await context.self.onmessage({ data: { requestId: 'g_' + fmt, format: fmt, records: googleRecords, prefix: 'google_test', options: { language: 'ar', perCategory: false } } });
    assert.equal(gResponse?.success, true, 'Google Maps export failed for ' + fmt + ': ' + gResponse?.error);
  }
  // Chunked transfer at 1000+ records: the worker must accept slices, report
  // progress, and still produce one BOM-prefixed CSV with every row.
  const bulk = Array.from({ length: 1200 }, (_, index) => ({ ...records[0], id: 'bulk' + index, name: 'مسجد ' + index,
    place_id: 'osm/node/' + index, x: Number((31.25 + (index % 100) * 0.0001).toFixed(6)), y: 30.05 }));
  const messages = [];
  context.self.postMessage = message => { messages.push(message); };
  const meta = { format: 'csv', prefix: 'bulk_test', options: { language: 'en', perCategory: false } };
  for (let index = 0; index < bulk.length; index += 400) {
    await context.self.onmessage({ data: { kind: 'chunk', requestId: 'bulk', meta, records: bulk.slice(index, index + 400), total: bulk.length } });
  }
  await context.self.onmessage({ data: { kind: 'run', requestId: 'bulk' } });
  const bulkResponse = messages.at(-1);
  assert.equal(bulkResponse.success, true, 'chunked export failed: ' + bulkResponse.error);
  assert.deepEqual([...bulkResponse.files[0].bytes.slice(0, 3)], [239, 187, 191], 'chunked CSV must keep the UTF-8 BOM');
  const bulkCsv = new TextDecoder('utf-8', { ignoreBOM: true }).decode(new Uint8Array(bulkResponse.files[0].bytes));
  assert.equal(bulkCsv.split('\r\n').filter(Boolean).length, bulk.length + 1, 'header + every transferred record');
  const phases = messages.filter(message => message.progress).map(message => message.progress.phase);
  assert.ok(phases.includes('transfer') && phases.includes('rows') && phases.includes('done'), 'progress phases: ' + phases.join(','));
  console.log('Local export worker: all seven formats, chunked 1200-record transfer with progress, and restricted-source rejection passed (isolated worker-like VM).');
})().catch(error => { console.error(error); process.exitCode = 1; });

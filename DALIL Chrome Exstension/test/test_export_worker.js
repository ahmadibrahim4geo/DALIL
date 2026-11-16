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
  await context.self.onmessage({ data: { requestId: 'restricted', format: 'json', records: [{ ...records[0], provider: 'google_maps_dom', exportAllowed: false }], options: { language: 'en' } } });
  assert.equal(rejected.success, false);
  assert.equal(rejected.errorCode, 'EXPORT_RESTRICTED');
  assert.equal(rejected.details.restricted, 1);
  assert.equal(rejected.details.total, 1);
  assert.equal(rejected.details.exportable, 0);
  assert.match(rejected.error, /source license does not permit bulk export/);
  let mixed;
  context.self.postMessage = message => { mixed = message; };
  await context.self.onmessage({ data: { requestId: 'mixed', format: 'json', records: [records[0], { ...records[0], id: 'p2', provider: 'google_maps_dom', exportAllowed: false }], options: { language: 'en' } } });
  assert.equal(mixed.success, true, 'A mixed selection still exports its reusable records');
  console.log('Local export worker: all seven formats and restricted-source rejection passed (isolated worker-like VM).');
})().catch(error => { console.error(error); process.exitCode = 1; });

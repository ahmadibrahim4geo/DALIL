'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const ExportUtils = require('../lib/export-utils.js');
const symbols = require('../core/symbology.js');

function unzipStored(bytes) {
  const files = new Map();
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 30 < bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 8, true), 0);
    const size = view.getUint32(offset + 18, true), names = view.getUint16(offset + 26, true), extra = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + names));
    const start = offset + 30 + names + extra, content = bytes.slice(start, start + size);
    assert.equal(ExportUtils.crc32(content), view.getUint32(offset + 14, true));
    files.set(name, content); offset = start + size;
  }
  assert.ok(files.size); return files;
}

(async () => {
  const output = process.env.DALIL_EXPORT_EVIDENCE_DIR || fs.mkdtempSync(path.join(os.tmpdir(), 'dalil-export-evidence-'));
  fs.mkdirSync(output, { recursive: true });
  const base = { provider: 'osm_overpass', exportAllowed: true, rights: { exportAllowed: true, license: 'ODbL-1.0', attribution: '© OpenStreetMap contributors' }, hasExactCoords: true, coordinateSource: 'osm_node_geometry' };
  const records = [
    { ...base, id: 'ar', name: 'مسجد <النور> & "السلام" ]]> 東京', category: 'مسجد', canonicalId: 'google_places:mosque', x: 31.2345678, y: 30.0100001, phone: '+202345', attributes: [{ key: 'wheelchair', value: 'yes', source: 'osm' }], fieldProvenance: { name: { provider: 'osm_overpass', field: 'name', confidence: 1 } } },
    { ...base, id: 'zero_x', name: 'Greenwich café', category: 'cafe', canonicalId: 'google_places:cafe', x: 0, y: 10 },
    { ...base, id: 'zero_y', name: 'Equator', category: 'school', x: 40, y: 0 },
    { ...base, id: 'origin', name: 'Verified origin', x: 0, y: 0 },
    { ...base, id: 'long', name: 'مكان '.repeat(100), x: 31.3, y: 30.2 },
    { ...base, id: 'unverified', name: 'Pending', hasExactCoords: false, x: 30, y: 30 },
    { ...base, id: 'missing', name: 'No coordinates', x: null, y: null },
    { ...base, id: 'invalid', name: 'Invalid bounds', x: 181, y: 0 },
    { id: 'restricted', provider: 'google_maps_dom', source: 'Google Maps', name: 'Restricted content', x: 31, y: 30, hasExactCoords: true },
    { id: 'restricted2', provenance: [{ provider: 'google_maps_dom' }], name: 'Restricted provenance', x: 31, y: 30, hasExactCoords: true }
  ];
  ExportUtils.setLanguage('ar');
  const selection = ExportUtils.selectExportRecords(records);
  assert.equal(selection.located.length, 5); assert.equal(selection.unlocated.length, 3); assert.equal(selection.excluded.length, 2);
  const geojson = ExportUtils.generateGeoJson(records, 'Evidence', null, { language: 'en' });
  assert.equal(geojson.features.length, 5); assert.deepEqual(geojson.features[1].geometry.coordinates, [0,10]);
  assert.equal(geojson.features[0].properties.name, records[0].name); assert.deepEqual(geojson.features[0].properties.fieldProvenance, records[0].fieldProvenance);
  assert.equal(geojson.metadata.restricted, 2); assert.ok(!JSON.stringify(geojson).includes('Restricted content'));
  assert.ok(!('crs' in geojson), 'RFC 7946 uses WGS84 without a legacy crs member');
  fs.writeFileSync(path.join(output, 'places.geojson'), JSON.stringify(geojson));

  const kml = ExportUtils.generateKmlString(records, '<Evidence & test>', null, { language: 'en' });
  assert.equal((kml.match(/<Placemark>/g) || []).length, 5); assert.ok(kml.includes('&lt;Evidence &amp; test&gt;'));
  assert.ok(!kml.includes('Restricted content')); assert.ok(kml.includes('icons/'+ExportUtils.symbolFor({category:'مسجد'}).assetKey+'.png')); assert.ok(!kml.includes('https://maps.google.com/mapfiles/'));
  assert.ok(!kml.includes('<th>الفئة الرئيسية</th>'), 'English export headers are independent');
  fs.writeFileSync(path.join(output, 'places.kml'), kml);
  const kmz = ExportUtils.createZip(await ExportUtils.buildKmzFiles(records, 'Evidence', null, { language: 'en' }));
  const kmzFiles = unzipStored(kmz), kmlText = new TextDecoder().decode(kmzFiles.get('doc.kml'));
  for (const match of kmlText.matchAll(/<href>([^<]+)<\/href>/g)) {
    const bytes = kmzFiles.get(match[1]); assert.ok(bytes, 'Every KML icon is present in KMZ');
    assert.deepEqual([...bytes.slice(0,8)], [137,80,78,71,13,10,26,10]);
    assert.equal(new DataView(bytes.buffer, bytes.byteOffset).getUint32(16), 64);
  }
  fs.writeFileSync(path.join(output, 'places.kmz'), kmz);

  const files = ExportUtils.buildShapefile(records, 'places', null, { language: 'ar' });
  for (const file of files) fs.writeFileSync(path.join(output, file.name), file.data);
  const shp = new DataView(files.find(file => file.name.endsWith('.shp')).data.buffer);
  assert.equal(shp.getInt32(0, false), 9994); assert.equal(shp.getInt32(32, true), 1);
  assert.equal(shp.getFloat64(112, true), 31.234568); assert.equal(shp.getFloat64(120, true), 30.01);
  const shpMeta = JSON.parse(files.find(file => file.name === 'metadata.json').data);
  assert.ok(shpMeta.dbfTruncations.some(row => row.field === 'NAME')); assert.equal(JSON.parse(files.find(file => file.name === 'records.json').data).records.find(item => item.id === 'long').name, records[4].name);
  assert.equal(files.find(file => file.name.endsWith('.cpg')).data, 'UTF-8');
  const shpZip = unzipStored(ExportUtils.createZip(files));
  for (const extension of ['shp','shx','dbf','prj','cpg']) assert.ok(shpZip.has('places.' + extension));

  const csv = ExportUtils.generateCsv([{ ...base, name: '=HYPERLINK("https://unsafe.example")', x: 0, y: 10 }], { language: 'en' });
  assert.equal(csv.charCodeAt(0), 0xFEFF); assert.ok(csv.includes("'=HYPERLINK")); assert.ok(!csv.includes('خط الطول'));
  const emptyFiltered = ExportUtils.generateCsv([records[8]], { language: 'en' }); assert.equal(emptyFiltered.split('\r\n').length, 1);
  fs.writeFileSync(path.join(output, 'places.csv'), ExportUtils.generateCsv(selection.included, { language: 'ar' }));

  for (const language of ['ar','en']) {
    const workbook = ExportUtils.buildWorkbook(records, null, { language, perCategory: false });
    const xlsxBytes = ExportUtils.serializeWorkbook(workbook, { language });
    const archive = unzipStored(xlsxBytes);
    const xml = new TextDecoder().decode(archive.get('xl/worksheets/sheet1.xml'));
    assert.ok(xml.includes('state="frozen"')); assert.ok(xml.includes('rightToLeft="' + (language === 'ar' ? '1' : '0') + '"'));
    const readback = ExportUtils.getXlsx().read(xlsxBytes, { type: 'array' });
    const rows = ExportUtils.getXlsx().utils.sheet_to_json(readback.Sheets[readback.SheetNames[0]]);
    assert.equal(rows.length, 8); assert.equal(rows[1][language === 'ar' ? 'خط الطول (X)' : 'Longitude (X)'], 0);
    assert.equal(rows[0][language === 'ar' ? 'اسم المعلم / الظاهرة الجغرافية' : 'Place name'], records[0].name);
    if (language === 'en') assert.ok(Object.keys(rows[0]).every(key => !/[\u0600-\u06ff]/.test(key)));
    fs.writeFileSync(path.join(output, 'places_' + language + '.xlsx'), xlsxBytes);
  }

  for (const unsafe of ['../escape.txt','/absolute.txt','C:/escape.txt','icons\\escape.png']) assert.throws(() => ExportUtils.createZip([{ name: unsafe, data: 'bad' }]));
  assert.throws(() => ExportUtils.createZip([{ name: 'A', data: '' }, { name: 'a', data: '' }]));
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/symbols/manifest.json')));
  for (const entry of manifest.resources) for (const format of ['svg','png']) {
    const asset = fs.readFileSync(path.join(__dirname, '..', entry[format].path));
    assert.equal(crypto.createHash('sha256').update(asset).digest('hex'), entry[format].sha256);
    if (format === 'svg') assert.ok(!/<script|foreignObject|\bon\w+\s*=|(?:href|src)\s*=/i.test(asset.toString()));
  }
  assert.notEqual(symbols.resolve({ canonicalId: 'google_places:mosque' }).glyph, symbols.resolve({ canonicalId: 'google_places:pharmacy' }).glyph);
  assert.notEqual(symbols.resolve({ canonicalId: 'google_places:pharmacy' }).glyph, symbols.resolve({ canonicalId: 'google_places:hospital' }).glyph);
  assert.equal(ExportUtils.exportRestriction({ ...base, provider: 'osm_overpass', fieldProvenance: { phone: { provider: 'google_maps_dom' } } }), 'google_content_export_restricted');
  const guardedDedup = ExportUtils.smartDeduplicateByCoords([
    { ...base, id: 'same', place_id: 'first', name: 'Same building', x: 31, y: 30 },
    { ...base, id: 'same', place_id: 'second', name: 'Same building', x: 31, y: 30 },
    { ...base, id: 'same', provider: 'other_provider', place_id: 'first', name: 'Same building', x: 31, y: 30 }
  ]);
  assert.equal(guardedDedup.length, 3, 'Different provider namespaces and IDs must remain independent');
  const merged = ExportUtils.smartDeduplicateByCoords([
    { ...base, id: 'a', place_id: 'same', name: 'Venue', x: 31, y: 30, provenance: [{ cellId: 'c1' }], fieldProvenance: { name: { provider: 'osm_overpass', field: 'name' } }, discoveries: [{ cellId: 'c1' }], discoveryCellIds: ['c1'] },
    { ...base, id: 'b', place_id: 'same', name: 'Venue', x: 31, y: 30, phone: '123', provenance: [{ cellId: 'c2' }], fieldProvenance: { phone: { provider: 'osm_overpass', field: 'phone' } }, discoveries: [{ cellId: 'c2' }], discoveryCellIds: ['c2'] }
  ]);
  assert.equal(merged.length, 1); assert.equal(merged[0].provenance.length, 2); assert.equal(merged[0].discoveries.length, 2); assert.deepEqual(merged[0].discoveryCellIds, ['c1','c2']); assert.equal(merged[0].fieldProvenance.phone.field, 'phone');
  const expectedLeaflet = { 'marker-icon.png': '950edf24677ded147df13b26f91baa2b0fa70513', 'marker-icon-2x.png': '88f9e501888c9c6cb29ad340d9a888627dd1b6d8', 'marker-shadow.png': '9fd2979532a19a15b824ce763c76e04a8dafadfb', 'layers.png': '1a72e5784b2b456eac5d7670738db80697af3377', 'layers-2x.png': '200c333dca9652ac4cba004d609e5af4eee168c1' };
  for (const [name, expectedHash] of Object.entries(expectedLeaflet)) {
    const bytes = fs.readFileSync(path.join(__dirname, '../lib/images', name));
    const actualHash = crypto.createHash('sha1').update(Buffer.from('blob ' + bytes.length + '\0')).update(bytes).digest('hex');
    assert.equal(actualHash, expectedHash, 'Leaflet image matches its upstream Git blob: ' + name);
  }
  fs.writeFileSync(path.join(output, 'expected.json'), JSON.stringify({ features: 5, records: 8, firstName: records[0].name, longName: records[4].name }));
  console.log('Export integrity: VERIFIED (coordinates, rights, Unicode, provenance, CSV, KMZ assets, SHP bundle, XLSX AR/EN frozen panes, asset hashes).');
  console.log('Native readback artifacts: ' + output);
})().catch(error => { console.error(error); process.exitCode = 1; });

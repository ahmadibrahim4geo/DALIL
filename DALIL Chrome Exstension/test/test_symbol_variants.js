/* R5 symbology acceptance: real packaged assets and real KMZ bytes, synthetic reusable records. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Symbols = require('../core/symbology');
const Export = require('../lib/export-utils');
const { TaxonomyEngine: Taxonomy } = require('../lib/taxonomy-engine');
const root = path.resolve(__dirname, '..');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets/symbols/category-map.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'assets/symbols/variants-manifest.json'), 'utf8'));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const allowedShapes = ['circle','rounded-square','diamond','hexagon','pentagon','shield','pin','square'];

function luminance(hex) {
  const [red, green, blue] = hex.slice(1).match(/../g).map(value => parseInt(value, 16) / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function readStoredZip(bytes) {
  const files = new Map(), view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let offset = 0;
  while (offset + 30 < bytes.length && view.getUint32(offset, true) === 0x04034b50) {
    assert.equal(view.getUint16(offset + 8, true), 0, 'The local packer uses ZIP stored members');
    const length = view.getUint32(offset + 18, true), names = view.getUint16(offset + 26, true), extra = view.getUint16(offset + 28, true);
    const name = new TextDecoder().decode(bytes.slice(offset + 30, offset + 30 + names));
    const start = offset + 30 + names + extra, content = bytes.slice(start, start + length);
    assert.equal(Export.crc32(content), view.getUint32(offset + 14, true), 'ZIP member CRC: ' + name);
    assert.equal(files.has(name), false, 'Repeated ZIP member path: ' + name);
    files.set(name, content); offset = start + length;
  }
  return files;
}

async function main() {
  const expected = Taxonomy.registry.getCategories().length + Taxonomy.getSectors().reduce((count, sector) => count + 1 + sector.branches.length, 0) + 1;
  assert.equal(catalog.entries.length, expected, 'Every category, sector, branch and fallback has a binding');
  assert.equal(catalog.entries.length, 1255, 'R6 catalog includes the verified Google town_square type');
  assert.equal(manifest.resources.length, catalog.entries.length);
  const manifests = new Map(manifest.resources.map(resource => [resource.symbolId, resource]));
  const ids = new Set(), colors = new Set(), assetKeys = new Set(), pngHashes = new Set(), shapes = new Set(), byGlyph = new Map();
  let minimumContrast = Infinity, totalBytes = 0;
  for (const entry of catalog.entries) {
    const actual = Symbols.resolve(entry.id);
    for (const key of ['symbolId','canonicalId','glyph','assetKey','color','foreground','shape','svgPath','pngPath']) assert.equal(actual[key], entry[key], entry.id + ': stale catalog ' + key);
    assert.equal(ids.has(entry.symbolId), false, 'A symbol ID belongs to exactly one canonical binding'); ids.add(entry.symbolId);
    assert.equal(assetKeys.has(entry.assetKey), false, 'Variant asset paths cannot collide'); assetKeys.add(entry.assetKey);
    assert.match(entry.color, /^#[0-9a-f]{6}$/i); assert.match(entry.foreground, /^#[0-9a-f]{6}$/i);
    assert.equal(colors.has(entry.color), false, 'Different categories have different marker colors'); colors.add(entry.color);
    assert.ok(allowedShapes.includes(entry.shape)); shapes.add(entry.shape);
    const a = luminance(entry.color), b = luminance(entry.foreground), contrast = (Math.max(a,b) + 0.05) / (Math.min(a,b) + 0.05);
    minimumContrast = Math.min(minimumContrast, contrast);
    assert.ok(contrast >= 3, 'Graphical glyph contrast must be at least 3:1: ' + entry.symbolId);
    assert.match(entry.pngPath, /^assets\/symbols\/variants\/[a-z0-9-]+\.png$/);
    assert.match(entry.svgPath, /^assets\/symbols\/variants\/[a-z0-9-]+\.svg$/);
    const png = fs.readFileSync(path.join(root, entry.pngPath)), svg = fs.readFileSync(path.join(root, entry.svgPath), 'utf8'); totalBytes += png.length + Buffer.byteLength(svg);
    assert.deepEqual([...png.slice(0,8)], [137,80,78,71,13,10,26,10]);
    assert.equal(png.readUInt32BE(16), 64); assert.equal(png.readUInt32BE(20), 64);
    assert.ok(svg.includes('width="64"') && svg.includes('height="64"'));
    assert.ok(svg.includes('data-symbol-id="' + entry.symbolId + '"'));
    assert.ok(svg.includes('fill="' + entry.color + '"'));
    assert.equal(/<(?:script|foreignObject|image|iframe|object|embed)\b|\bon\w+\s*=|(?:href|src)\s*=|url\s*\(|<!DOCTYPE|<!ENTITY/i.test(svg), false, 'No active or external content in SVG: ' + entry.svgPath);
    const hash = digest(png);
    assert.equal(pngHashes.has(hash), false, 'Different symbols cannot be identical PNG bytes'); pngHashes.add(hash);
    const resource = manifests.get(entry.symbolId); assert.ok(resource);
    assert.equal(resource.sha256, hash); assert.equal(resource.color, entry.color); assert.equal(resource.shape, entry.shape); assert.equal(resource.png, entry.pngPath); assert.equal(resource.svg, entry.svgPath);
    if (!byGlyph.has(entry.glyph)) byGlyph.set(entry.glyph, []); byGlyph.get(entry.glyph).push(entry);
  }
  assert.deepEqual([...shapes].sort(), [...allowedShapes].sort(), 'All eight geometric frames are used');
  for (const entries of byGlyph.values()) assert.equal(new Set(entries.map(entry => entry.color)).size, entries.length, 'Every reuse of a base glyph has a different color');
  const mosque = Symbols.resolve('google_places:mosque'), prayer = Symbols.resolve('dalil:prayer_room');
  for (const key of ['glyph','color','shape','symbolId','assetKey']) assert.notEqual(mosque[key], prayer[key], 'Mosque and prayer room are distinct: ' + key);

  const paired = ['google_places:bank','google_places:atm'];
  const records = [...paired,'google_places:mosque','dalil:prayer_room'].map((id, index) => ({ id: 'synthetic-r5-' + index, canonicalId: id, category: Taxonomy.getCategory(id)?.labels.en || id, name: 'Synthetic symbol ' + index, provider: 'synthetic_fixture', exportAllowed: true, rights: { exportAllowed: true, license: 'CC0-1.0' }, x: 31.23 + index * 0.001, y: 30.04, hasExactCoords: true, coordinateSource: 'synthetic_fixture' }));
  const first = Symbols.resolve(records[0]), second = Symbols.resolve(records[1]);
  assert.equal(first.glyph, second.glyph, 'Fixture exercises two categories sharing a base glyph');
  assert.notEqual(first.color, second.color); assert.notEqual(first.assetKey, second.assetKey);
  const members = await Export.buildKmzFiles(records, 'symbol-r5-fixture', null, { language: 'en' });
  const packed = readStoredZip(Export.createZip(members)), kml = new TextDecoder().decode(packed.get('doc.kml'));
  assert.equal([...packed.keys()].filter(name => name.startsWith('icons/')).length, records.length, 'Base glyph reuse must not collapse different variants');
  for (const record of records) {
    const symbol = Symbols.resolve(record), iconName = 'icons/' + symbol.assetKey + '.png';
    assert.ok(packed.has(iconName), 'Variant exists in KMZ: ' + symbol.symbolId);
    assert.deepEqual(Buffer.from(packed.get(iconName)), fs.readFileSync(path.join(root, symbol.pngPath)), 'KMZ uses the exact same PNG as the map/picker');
    assert.ok(kml.includes('<href>' + iconName + '</href>'));
    for (const [key, value] of [['symbol_id',symbol.symbolId],['symbol_color',symbol.color],['symbol_shape',symbol.shape],['symbol_glyph',symbol.glyph]]) assert.ok(kml.includes('<Data name="' + key + '"><displayName>') && kml.includes('<value>' + value + '</value>'), 'KML has symbol metadata: ' + key);
    const exported = Export.canonicalExportRecord(record, 0, { language: 'en' });
    assert.equal(exported.symbol_id, symbol.symbolId); assert.equal(exported.symbol_color, symbol.color); assert.equal(exported.symbol_shape, symbol.shape); assert.equal(exported.symbol_glyph, symbol.glyph);
  }
  assert.equal((kml.match(/<Placemark>/g) || []).length, records.length);
  assert.ok(kml.includes('<color>ffffffff</color>'), 'Precolored PNGs must not be tinted a second time');
  assert.equal(/<href>https?:/i.test(kml), false);
  const geojson = Export.generateGeoJson(records, 'r5', null, { language: 'en' });
  for (const feature of geojson.features) { const symbol = Symbols.resolve(feature.properties); assert.equal(feature.properties.symbol_color, symbol.color); assert.equal(feature.properties.symbol_shape, symbol.shape); }
  const rows = Export.formatDataForExport(records, { language: 'en' });
  assert.equal(rows[0]['Symbol color'], first.color); assert.equal(rows[0]['Marker shape'], first.shape);
  const shp = Export.buildShapefile(records, 'r5', null, { language: 'en' });
  const fields = JSON.parse(shp.find(file => file.name === 'fields.json').data);
  assert.ok(fields.some(field => field.id === 'symbol_color' && field.dbf === 'SYM_COLOR'));
  assert.ok(fields.some(field => field.id === 'symbol_shape' && field.dbf === 'SYM_SHAPE'));
  const report = { status: 'passed', revision: 'r5', bindings: ids.size, uniqueColors: colors.size, uniquePngHashes: pngHashes.size, uniqueAssetKeys: assetKeys.size, baseGlyphs: byGlyph.size, shapes: [...shapes].sort(), minimumGlyphContrast: Number(minimumContrast.toFixed(3)), packagedAssetBytes: totalBytes, sameGlyphKmzVariants: paired, kmzIcons: records.length, checks: ['full registry binding coverage','unique per-category colors and PNG bytes','eight geometric frames','mosque vs prayer room glyph/color/shape','safe local SVG and PNG 64x64','same base glyph retained as separate KMZ assets','identical map/KMZ PNG bytes','symbol color/shape metadata in canonical, KML, GeoJSON, table and SHP schema'], limitations: ['Distinct RGB values and PNG hashes do not prove every pair is perceptually distinguishable or color-vision safe.','Native Google Earth/ArcGIS/QGIS visual appearance is a separate check.'] };
  const evidence = process.env.DALIL_BROWSER_EVIDENCE_DIR;
  if (evidence) { fs.mkdirSync(evidence, { recursive: true }); fs.writeFileSync(path.join(evidence, 'r5-symbol-unit-report.json'), JSON.stringify(report, null, 2)); fs.writeFileSync(path.join(evidence, 'r5-symbols-fixture.kmz'), Export.createZip(members)); }
  console.log(JSON.stringify(report));
}
main().catch(error => { console.error(error); process.exitCode = 1; });

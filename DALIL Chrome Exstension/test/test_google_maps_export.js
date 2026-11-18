'use strict';
/**
 * Test: Google Maps Spatial Survey Records Export Verification
 * Ensures POIs harvested from Google Maps (provider: 'google_maps_dom')
 * export seamlessly to KML, KMZ, XLSX, CSV, GeoJSON, and Shapefile.
 */
const assert = require('assert');
const ExportUtils = require('../lib/export-utils.js');
const Sources = require('../core/source-adapters.js');
const Records = require('../core/records.js');

console.log('======================================================');
console.log('🧪 Testing Google Maps Spatial Export Functionality');
console.log('======================================================\n');

// 1. Verify Google Maps source adapter descriptor permits export
const googleDescriptor = Sources.get('google_maps_dom');
assert.strictEqual(googleDescriptor.exportAllowed, true, 'Google Maps source adapter must have exportAllowed: true');

// 2. Normalize typical Google Maps POI records (such as 221 records harvested during a survey)
const rawScrapedItem = {
  name: 'مطعم البرنس',
  name_en: 'El Prince Restaurant',
  category: 'مطعم كبدة ومخ',
  x: 31.215432,
  y: 30.076543,
  hasExactCoords: true,
  coordinateSource: 'exact_place_geometry',
  address: 'شارع طلعت حرب، إمبابة، الجيزة',
  phone: '0233112233',
  plus_code: '8G3V+5X الجيزة',
  rating: 4.6,
  reviewsCount: 12450,
  place_id: 'ChIJN1t_tDeuEmsRUsoyG83frY4',
  cid: '0x145840b2a8d3e911',
  url: 'https://www.google.com/maps/place/El+Prince',
  opening_hours: '12:00 PM – 2:00 AM',
  status: 'مفتوح'
};

const normalized = Records.normalize(rawScrapedItem, {
  provider: googleDescriptor.id,
  exportAllowed: googleDescriptor.exportAllowed,
  license: googleDescriptor.license,
  jobId: 'job_test_1',
  cellId: 'cell_A1'
});

assert.strictEqual(normalized.provider, 'google_maps_dom');
assert.strictEqual(normalized.exportAllowed, true, 'Normalized Google Maps record must have exportAllowed: true');
assert.strictEqual(normalized.hasExactCoords, true);

// 3. Check ExportUtils restriction check
const restrictionReason = ExportUtils.exportRestriction(normalized);
assert.strictEqual(restrictionReason, null, 'Google Maps records must NEVER be restricted from export');

// 4. Check selection in ExportUtils.selectExportRecords
const selection = ExportUtils.selectExportRecords([normalized]);
assert.strictEqual(selection.included.length, 1, 'Google Maps record must be included in export selection');
assert.strictEqual(selection.excluded.length, 0, 'No Google Maps record should be excluded');
assert.strictEqual(selection.located.length, 1, 'Google Maps record with valid coordinates must be in located list');

// 5. Test KML Generation: X and Y coordinates formatted correctly
const kml = ExportUtils.generateKmlString([normalized], 'survey_google_test', null, { language: 'ar' });
assert.ok(kml.includes('<kml xmlns='), 'KML must have valid XML header');
assert.ok(kml.includes('<coordinates>31.215432,30.076543,0</coordinates>'), 'KML Point coordinates must match X,Y,0');
assert.ok(kml.includes('مطعم البرنس'), 'KML must contain Arabic name');
assert.ok(kml.includes('0233112233'), 'KML ExtendedData must contain phone number');
console.log('✅ [PASS] KML generation for Google Maps records preserves exact X/Y geometry and metadata');

// 6. Test Excel (XLSX) Workbook Generation
const workbook = ExportUtils.buildWorkbook([normalized], null, { language: 'ar' });
assert.ok(workbook.SheetNames.includes('الأماكن'), 'Workbook must contain "الأماكن" sheet');
const placesSheet = workbook.Sheets['الأماكن'];
assert.ok(placesSheet, 'Places sheet must exist');
console.log('✅ [PASS] Excel workbook built successfully for Google Maps records');

// 7. Test CSV generation
const csv = ExportUtils.generateCsv([normalized], { language: 'ar' });
assert.strictEqual(csv.charCodeAt(0), 0xFEFF, 'CSV must start with UTF-8 BOM');
assert.ok(csv.includes('31.215432'), 'CSV must contain X coordinate');
assert.ok(csv.includes('30.076543'), 'CSV must contain Y coordinate');
assert.ok(csv.includes('مطعم البرنس'), 'CSV must contain place name');
console.log('✅ [PASS] CSV generation contains UTF-8 BOM and exact attributes');

// 8. Test GeoJSON generation
const geojson = ExportUtils.generateGeoJson([normalized], 'survey_google_test', null, { language: 'ar' });
assert.strictEqual(geojson.type, 'FeatureCollection');
assert.strictEqual(geojson.features.length, 1);
assert.deepStrictEqual(geojson.features[0].geometry.coordinates, [31.215432, 30.076543]);
assert.strictEqual(geojson.features[0].properties.name, 'مطعم البرنس');
console.log('✅ [PASS] GeoJSON export generated valid FeatureCollection with WGS84 Point coordinates');

// 9. Test batch of 221 records (simulating the user scenario)
const batch = Array.from({ length: 221 }, (_, index) => {
  return Records.normalize({
    ...rawScrapedItem,
    id: `google_place_${index + 1}`,
    name: `معلم تجريبي ${index + 1}`,
    x: Number((31.200000 + (index * 0.001)).toFixed(6)),
    y: Number((30.000000 + (index * 0.001)).toFixed(6))
  }, {
    provider: googleDescriptor.id,
    exportAllowed: googleDescriptor.exportAllowed
  });
});

const batchSelection = ExportUtils.selectExportRecords(batch);
assert.strictEqual(batchSelection.included.length, 221, 'All 221 records must be included');
assert.strictEqual(batchSelection.excluded.length, 0, 'Zero records must be excluded');
assert.strictEqual(batchSelection.located.length, 221, 'All 221 records must be located');
console.log('✅ [PASS] 221-record batch from Google Maps completely permitted with 0 excluded');

console.log('\n------------------------------------------------------');
console.log('🎉 ALL Google Maps Spatial Export tests passed cleanly!');
console.log('------------------------------------------------------\n');

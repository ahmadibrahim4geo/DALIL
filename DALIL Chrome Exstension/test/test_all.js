/**
 * Automated Test Suite for DALIL (دليل) Chrome Extension
 */

const assert = require("assert");
const path = require("path");
const SpatialUtils = require("../lib/spatial-utils.js");
const ExportUtils = require("../lib/export-utils.js");
const { TaxonomyEngine } = require("../lib/taxonomy-engine.js");

console.log("=========================================");
console.log("🧪 DALIL Extension - Test Suite Running");
console.log("=========================================\n");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
  }
}

// 1. Test Shapefile Polygon Record Parsing (C1)
runTest("Shapefile Polygon parser reads correct offsets (+36, +40, +44)", () => {
  const recordLengthBytes = 4 + 32 + 4 + 4 + 4 + 4 * 16;
  const totalBytes = 100 + 8 + recordLengthBytes;
  const buf = Buffer.alloc(totalBytes);

  buf.writeInt32BE(9994, 0); // File code
  buf.writeInt32BE(totalBytes / 2, 24); // File length
  buf.writeInt32LE(1000, 28); // Version
  buf.writeInt32LE(5, 32); // ShapeType 5 (Polygon)

  buf.writeInt32BE(1, 100); // Record number
  buf.writeInt32BE(recordLengthBytes / 2, 104); // Length in words

  let o = 108;
  buf.writeInt32LE(5, o); o += 4; // ShapeType
  buf.writeDoubleLE(31.0, o); o += 8; // Xmin
  buf.writeDoubleLE(30.0, o); o += 8; // Ymin
  buf.writeDoubleLE(31.2, o); o += 8; // Xmax
  buf.writeDoubleLE(30.2, o); o += 8; // Ymax

  buf.writeInt32LE(1, o); o += 4; // NumParts
  buf.writeInt32LE(4, o); o += 4; // NumPoints
  buf.writeInt32LE(0, o); o += 4; // Part index 0

  const pts = [[31.0, 30.0], [31.2, 30.0], [31.2, 30.2], [31.0, 30.0]];
  for (const p of pts) {
    buf.writeDoubleLE(p[0], o); o += 8;
    buf.writeDoubleLE(p[1], o); o += 8;
  }

  const res = SpatialUtils.parseShapefile(buf.buffer, "test.shp");
  assert.strictEqual(res.success, true, "Parsing should succeed");
  assert.strictEqual(res.allPolygons.length, 1, "Should detect 1 polygon");
  assert.strictEqual(res.coordinates.length, 4, "Should read 4 ring coordinates");
  assert.strictEqual(res.bounds.minLng, 31.0, "Bounds minLng should match");
  assert.strictEqual(res.bounds.minLat, 30.0, "Bounds minLat should match");
});

// 2. Test Spatial Hash Deduplication with Prime Meridian zero coordinate (C4, M5)
runTest("Spatial Hash Dedup merges near duplicates and handles (0, 0) coordinates", () => {
  const items = [
    { id: "1", name: "Shop Alpha", x: 31.23456, y: 30.05678, phone: "0100000000" },
    { id: "2", name: "Shop Alpha Branch", x: 31.23460, y: 30.05680, address: "Nasr City" }, // within 35m
    { id: "3", name: "Meridian Zero", x: 0.00000, y: 0.00000, phone: "12345" },
    { id: "4", name: "Meridian Zero Dup", x: 0.00005, y: 0.00005, address: "Zero Point" }, // within 35m
    { id: "5", name: "Distinct Shop", x: 31.50000, y: 30.50000, phone: "0111111111" }
  ];

  const deduped = ExportUtils.smartDeduplicateByCoords(items);
  assert.strictEqual(deduped.length, 3, "Should reduce 5 items to 3 unique items");

  const alpha = deduped.find((p) => p.name.includes("Alpha"));
  assert.ok(alpha, "Alpha must exist");
  assert.ok(alpha.phone, "Merged item must preserve phone");
  assert.ok(alpha.address, "Merged item must preserve address");

  const zero = deduped.find((p) => p.name.includes("Zero"));
  assert.ok(zero, "Zero point item must not be dropped");
  assert.ok(zero.phone && zero.address, "Zero point merged item must combine data");
});

// 3. Test Ray-Casting Point In Polygon
runTest("SpatialUtils isPointInPolygon correctly validates inside vs outside", () => {
  const poly = [
    [30.0, 31.0],
    [30.0, 31.5],
    [30.5, 31.5],
    [30.5, 31.0],
    [30.0, 31.0]
  ];

  assert.strictEqual(SpatialUtils.isPointInPolygon([30.2, 31.2], poly), true, "Point inside should be true");
  assert.strictEqual(SpatialUtils.isPointInPolygon([31.0, 31.2], poly), false, "Point outside should be false");
});

// 4. Test Taxonomy Engine Hierarchy (31 Sectors & Global Coverage)
runTest("TaxonomyEngine loads 31 Sectors, 114 Branches, and provides recursive leaf queries", () => {
  const sectors = TaxonomyEngine.getSectors();
  assert.strictEqual(sectors.length, 31, "Must contain exactly 31 sectors");

  const s01 = TaxonomyEngine.getSector("S01");
  assert.ok(s01, "Sector S01 (Religion) must exist");
  assert.strictEqual(s01.name_ar, "الدين ودور العبادة");
  assert.strictEqual(s01.name_en, "Religion & Places of Worship");

  const leaves = TaxonomyEngine.getAllLeafLabels("S01");
  assert.ok(leaves.includes("مسجد"), "Leaves must include مسجد");
  assert.ok(leaves.includes("كنيسة"), "Leaves must include كنيسة");
  assert.ok(leaves.length >= 40, "Sector S01 leaves count should be >= 40");
});

// 5. Test Smart Bilingual Search Expansion (AR <-> EN)
runTest("TaxonomyEngine.resolveBilingualSearch expands Arabic and English counterparts accurately", () => {
  const mosque = TaxonomyEngine.resolveBilingualSearch("مسجد");
  assert.strictEqual(mosque.primary, "مسجد");
  assert.strictEqual(mosque.secondary, "Mosque");
  assert.ok(mosque.queriesToRun.includes("Mosque"));

  const starbucks = TaxonomyEngine.resolveBilingualSearch("Starbucks");
  assert.strictEqual(starbucks.primary, "Starbucks");
  assert.strictEqual(starbucks.secondary, "ستارباكس");

  const koshary = TaxonomyEngine.resolveBilingualSearch("كشري");
  assert.strictEqual(koshary.primary, "كشري");
  assert.strictEqual(koshary.secondary, "Koshary");

  const bank = TaxonomyEngine.resolveBilingualSearch("Bank");
  assert.strictEqual(bank.primary, "Bank");
  assert.strictEqual(bank.secondary, "بنك");
});

// 6. Test Smart Entity Disambiguation (Merge same place in AR/EN vs Preserve different brands)
runTest("Smart Deduplication merges same venue in AR/EN but preserves distinct brands at same GPS point", () => {
  const items = [
    // 1 & 2: Same mosque, one Arabic and one English at the same coordinates
    { id: "m1", name: "جامع الراجحي", x: 46.70000, y: 24.60000, phone: "0112345678", category: "مسجد" },
    { id: "m2", name: "Al Rajhi Grand Mosque", x: 46.70001, y: 24.60002, address: "Riyadh, Saudi Arabia" },
    // 3: Starbucks at the exact same location (e.g. adjacent in mall)
    { id: "c1", name: "Starbucks Coffee", x: 46.70000, y: 24.60000, category: "كافيه" },
    // 4: Pharmacy at the exact same location
    { id: "p1", name: "صيدليات النهدي", x: 46.70000, y: 24.60000, category: "صيدلية" }
  ];

  const deduped = ExportUtils.smartDeduplicateByCoords(items);
  // Expected: m1 & m2 merged into 1, while Starbucks and Nahdi Pharmacy are KEPT as distinct entities!
  assert.strictEqual(deduped.length, 3, "4 raw items should yield 3 distinct venues (Mosque, Starbucks, Nahdi)");

  const mergedMosque = deduped.find(p => p.name.includes("الراجحي") || p.name.includes("Rajhi"));
  assert.ok(mergedMosque, "Mosque must exist");
  assert.strictEqual(mergedMosque.name, "جامع الراجحي", "Arabic name preserved");
  assert.strictEqual(mergedMosque.name_en, "Al Rajhi Grand Mosque", "English name attached");
  assert.strictEqual(mergedMosque.phone, "0112345678", "Phone preserved");
  assert.strictEqual(mergedMosque.address, "Riyadh, Saudi Arabia", "Address preserved from English record");

  const starbucks = deduped.find(p => p.name.includes("Starbucks"));
  assert.ok(starbucks, "Starbucks must be preserved and NOT merged with mosque or pharmacy");

  const nahdi = deduped.find(p => p.name.includes("النهدي"));
  assert.ok(nahdi, "Nahdi pharmacy must be preserved and NOT merged");
});

// 7. Test Export Data Format prioritizing Longitude X and Latitude Y as numeric floats
runTest("ExportUtils formatDataForExport places X and Y immediately after Name as numeric floats", () => {
  const records = [
    { id: "1", name: "Masjid Al Noor", name_en: "Al Noor Mosque", x: 31.234567, y: 30.056789, category: "مسجد" }
  ];

  const exported = ExportUtils.formatDataForExport(records);
  const row = exported[0];
  const keys = Object.keys(row);

  assert.strictEqual(keys[0], "م");
  assert.strictEqual(keys[1], "اسم المعلم / الظاهرة الجغرافية");
  assert.strictEqual(keys[2], "الاسم بالإنجليزية");
  assert.strictEqual(keys[3], "خط الطول (X)");
  assert.strictEqual(keys[4], "دائرة العرض (Y)");

  assert.strictEqual(typeof row["خط الطول (X)"], "number", "X must be a numeric float");
  assert.strictEqual(typeof row["دائرة العرض (Y)"], "number", "Y must be a numeric float");
  assert.strictEqual(row["خط الطول (X)"], 31.234567);
  assert.strictEqual(row["دائرة العرض (Y)"], 30.056789);
});

// 8. Test Serpentine (Snake / Boustrophedon) Grid Scanning Pattern
runTest("SpatialUtils generateMeshForBounds generates Serpentine/Snake scan path alternating odd rows", () => {
  const bounds = { minLat: 30.0, maxLat: 32.0, minLng: 31.0, maxLng: 33.0 };
  const cells = SpatialUtils.generateMeshForBounds(bounds, 2, 3, 0);

  assert.strictEqual(cells.length, 6, "2x3 grid must have 6 cells");
  
  // Row 0 (even index): West -> East (col 1, 2, 3)
  assert.strictEqual(cells[0].name, "مربع (1, 1)");
  assert.strictEqual(cells[1].name, "مربع (1, 2)");
  assert.strictEqual(cells[2].name, "مربع (1, 3)");
  
  // Row 1 (odd index): East -> West (col 3, 2, 1) - Serpentine pattern
  assert.strictEqual(cells[3].name, "مربع (2, 3)", "Row 1 must start at col 3 (East to West)");
  assert.strictEqual(cells[4].name, "مربع (2, 2)");
  assert.strictEqual(cells[5].name, "مربع (2, 1)", "Row 1 must end at col 1");

  // Verify spatial continuity: distance between cell 2 and cell 3 should be much smaller than cell 2 and col 1
  const lngDiffCell2To3 = Math.abs(cells[3].centerLng - cells[2].centerLng);
  const lngDiffCell2ToFirstCol = Math.abs(cells[2].centerLng - cells[0].centerLng);
  assert.ok(lngDiffCell2To3 < lngDiffCell2ToFirstCol, "Serpentine pattern must avoid long jump back across columns");
});

// 9. Test Rich Attributes & Google Details in Export Formats
runTest("ExportUtils formatDataForExport includes Plus Code, CID, Place ID, Price and Amenities", () => {
  const records = [
    {
      id: "p1",
      name: "مطعم ومقهى النيل",
      name_en: "Nile Restaurant & Cafe",
      x: 31.235000,
      y: 30.045000,
      category: "مطعم",
      plus_code: "8G4F+2W Cairo",
      price_level: "$$",
      cid: "1234567890123456",
      place_id: "0x14583f:0xabcdef",
      attributes: "توصيل · سفري · صالة طعام",
      thumbnail_url: "https://lh5.googleusercontent.com/p/test.jpg"
    }
  ];

  const exported = ExportUtils.formatDataForExport(records);
  const row = exported[0];

  assert.strictEqual(row["الرمز المفتوح (Plus Code)"], "8G4F+2W Cairo");
  assert.strictEqual(row["مستوى الأسعار"], "$$");
  assert.strictEqual(row["الخدمات والمزايا"], "توصيل · سفري · صالة طعام");
  assert.strictEqual(row["معرف جوجل (Place ID / CID)"], "1234567890123456");
  assert.strictEqual(row["رابط الصورة"], "https://lh5.googleusercontent.com/p/test.jpg");
});

// 10. Test Manifest V3 Match Patterns Valid Format
runTest("Manifest V3 match patterns and host permissions follow Chrome specifications", () => {
  const fs = require("fs");
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "../manifest.json"), "utf8"));
  
  assert.strictEqual(manifest.manifest_version, 3);
  
  const matchPatternRegex = /^(\*|https?|file|ftp):\/\/(\*|\*\.[a-z0-9\.\-]+|[a-z0-9\.\-]+)\/.*$/i;
  
  const allPatterns = [
    ...(manifest.host_permissions || []),
    ...((manifest.content_scripts && manifest.content_scripts[0] && manifest.content_scripts[0].matches) || [])
  ];
  
  for (const pattern of allPatterns) {
    assert.ok(matchPatternRegex.test(pattern), `Pattern "${pattern}" is not a valid Chrome match pattern`);
    const hostPart = pattern.split("://")[1].split("/")[0];
    assert.ok(!hostPart.includes(".*"), `Pattern host "${hostPart}" contains illegal trailing wildcard`);
  }
});

// 11. Test Smart Sector Query Consolidation
runTest("TaxonomyEngine.consolidateQueries consolidates huge leaf sets to representative terms", () => {
  const { DALIL_SECTORS } = require("../lib/taxonomy-engine.js");
  const religionLeaves = [];
  DALIL_SECTORS[0].branches.forEach(b => b.leaves.forEach(l => religionLeaves.push(l)));

  assert.ok(religionLeaves.length > 30, "Religion sector must have > 30 leaves");
  const consolidated = TaxonomyEngine.consolidateQueries(religionLeaves, 10);

  assert.ok(consolidated.length <= 10, "Must be consolidated to at most 10 terms");
  assert.ok(consolidated.includes("مسجد") || consolidated.includes("جامع"), "Must include primary mosque terms");
  assert.ok(consolidated.includes("كنيسة"), "Must include primary church term");
});

console.log(`\n-----------------------------------------`);
console.log(`Summary: ${passed}/${total} tests passed.`);
console.log(`-----------------------------------------\n`);

if (passed !== total) {
  process.exit(1);
}

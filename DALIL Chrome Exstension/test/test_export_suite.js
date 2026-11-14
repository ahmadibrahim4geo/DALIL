/**
 * Test Suite for DALIL Export Utilities & KMZ Engine
 */

const assert = require("assert");
const fs = require("fs");
const ExportUtils = require("../lib/export-utils.js");
const { TaxonomyEngine } = require("../lib/taxonomy-engine.js");

console.log("=========================================");
console.log("🧪 DALIL Export Suite & KMZ Test Suite");
console.log("=========================================\n");

const samplePlaces = [
  {
    id: "p1",
    name: "جامع عمرو بن العاص",
    name_en: "Amr ibn al-Aas Mosque",
    category: "مسجد",
    searchKeyword: "مسجد",
    x: 31.2333,
    y: 30.0100,
    address: "مصر القديمة، القاهرة",
    phone: "0223654321",
    website: "https://example.com/mosque",
    status: "مفتوح على مدار 24 ساعة",
    opening_hours: "مفتوح على مدار 24 ساعة",
    rating: 4.8,
    reviewsCount: 1540,
    cellName: "مربع 1",
    url: "https://www.google.com/maps/place/Amr+Ibn+Al-Aas",
    timestamp: "2026-11-11T12:00:00.000Z"
  },
  {
    id: "p2",
    name: "مطعم أبو طارق",
    name_en: "Abou Tarek",
    category: "كشري",
    searchKeyword: "كشري",
    x: 31.2370,
    y: 30.0520,
    address: "وسط البلد، القاهرة",
    phone: "0100000000",
    website: "https://aboutarek.com",
    status: "مفتوح",
    opening_hours: "يومياً 9 ص - 12 ص",
    rating: 4.5,
    reviewsCount: 8900,
    cellName: "مربع 2",
    url: "https://www.google.com/maps/place/Abou+Tarek",
    timestamp: "2026-11-11T12:05:00.000Z"
  }
];

// 1. Verify category resolution
const cat1 = ExportUtils.resolveMainCategory(samplePlaces[0]);
assert.strictEqual(cat1, "الدين ودور العبادة", "Mosque belongs to Religion sector");

const cat2 = ExportUtils.resolveMainCategory(samplePlaces[1]);
assert.strictEqual(cat2, "الأطعمة والمشروبات", "Koshary restaurant belongs to Food & Beverage sector");
console.log("✅ [PASS] Main Category resolution works accurately for multiple sectors");

// 2. Verify formatted data strictly separates X and Y columns
const formatted = ExportUtils.formatDataForExport(samplePlaces);
assert.strictEqual(formatted.length, 2);
const row1 = formatted[0];
assert.strictEqual(row1["خط الطول (X)"], 31.2333);
assert.strictEqual(row1["دائرة العرض (Y)"], 30.0100);
assert.strictEqual(row1["الفئة الرئيسية"], "الدين ودور العبادة");
assert.strictEqual(row1["حالة العمل"], "مفتوح على مدار 24 ساعة");
assert.strictEqual(row1["مواعيد العمل"], "مفتوح على مدار 24 ساعة");
console.log("✅ [PASS] formatDataForExport enforces strict separation of Longitude X and Latitude Y in individual columns");

// 3. Verify KML Generation with Folders
const kmlStr = ExportUtils.generateKmlString(samplePlaces, "dalil_test");
assert.ok(kmlStr.includes("<kml xmlns="), "Valid KML header");
assert.ok(kmlStr.includes("<Folder>"), "Contains Folder hierarchy");
assert.ok(kmlStr.includes("الدين ودور العبادة"), "Contains Religion folder");
assert.ok(kmlStr.includes("الأطعمة والمشروبات"), "Contains Food folder");
assert.ok(kmlStr.includes("<coordinates>31.2333,30.01,0</coordinates>"), "Coordinates formatted as X,Y,0 in Point");
console.log("✅ [PASS] KML generation organizes features in clean, distinct category folders");

// 4. Verify KMZ creation (PKZip packaging of doc.kml)
const zipBytes = ExportUtils.createZip([
  { name: "doc.kml", data: kmlStr }
]);
assert.ok(zipBytes instanceof Uint8Array, "KMZ bytes is Uint8Array");
assert.ok(zipBytes.length > 200, "KMZ file has positive valid size");
// Check PKZip header: 0x50, 0x4B, 0x03, 0x04
assert.strictEqual(zipBytes[0], 0x50);
assert.strictEqual(zipBytes[1], 0x4B);
assert.strictEqual(zipBytes[2], 0x03);
assert.strictEqual(zipBytes[3], 0x04);
console.log("✅ [PASS] KMZ generation packages doc.kml into genuine, standard PKZip archive without external dependencies");

// 5. Verify TaxonomyEngine.resolveCategoryStyle provides official Google Earth KML icons & GIS symbology
const s01Style = TaxonomyEngine.resolveCategoryStyle("مسجد");
assert.strictEqual(s01Style.sectorId, "S01");
assert.strictEqual(s01Style.icon, "mosque");
assert.strictEqual(s01Style.emoji, "🕌");
assert.strictEqual(s01Style.kmlIcon, "https://maps.google.com/mapfiles/kml/shapes/mosque.png");

const hospStyle = TaxonomyEngine.resolveCategoryStyle("مستشفى");
assert.strictEqual(hospStyle.sectorId, "S09");
assert.strictEqual(hospStyle.icon, "hospitals");
assert.strictEqual(hospStyle.kmlIcon, "https://maps.google.com/mapfiles/kml/shapes/hospitals.png");

const pharmStyle = TaxonomyEngine.resolveCategoryStyle("صيدلية");
assert.strictEqual(pharmStyle.sectorId, "S09");
assert.strictEqual(pharmStyle.icon, "pharmacy_rx");
assert.strictEqual(pharmStyle.emoji, "💊");
assert.strictEqual(pharmStyle.kmlIcon, "https://maps.google.com/mapfiles/kml/shapes/pharmacy_rx.png");

const cafeStyle = TaxonomyEngine.resolveCategoryStyle("كافيه");
assert.strictEqual(cafeStyle.sectorId, "S02");
assert.strictEqual(cafeStyle.icon, "coffee");
assert.strictEqual(cafeStyle.emoji, "☕");
assert.strictEqual(cafeStyle.kmlIcon, "https://maps.google.com/mapfiles/kml/shapes/coffee.png");

const diningStyle = TaxonomyEngine.resolveCategoryStyle("مطعم");
assert.strictEqual(diningStyle.sectorId, "S02");
assert.strictEqual(diningStyle.icon, "dining");
assert.strictEqual(diningStyle.kmlIcon, "https://maps.google.com/mapfiles/kml/shapes/dining.png");
console.log("✅ [PASS] TaxonomyEngine.resolveCategoryStyle provides official Google Earth KML icons & GIS symbology");

// 6. KML now references locally vendored thematic assets, shared with portable KMZ.
const testPoiList = [
  samplePlaces[0], // Mosque -> S01
  samplePlaces[1], // Koshary -> S02
  { name: "صيدلية العزبي", category: "صيدلية", x: 31.2400, y: 30.0600 },
  { name: "مستشفى القصر العيني", category: "مستشفى", x: 31.2500, y: 30.0700 }
];
const richKml = ExportUtils.generateKmlString(testPoiList, "dalil_thematic_test");
for(const item of testPoiList){const symbol=ExportUtils.symbolFor(item);assert.ok(richKml.includes("<href>icons/"+symbol.assetKey+".png</href>"),"Each category keeps its local colored/shaped symbol");}
assert.ok(!richKml.includes("https://maps.google.com/mapfiles/"), "Exported icons must work without Google icon requests");
const localStyles = [...richKml.matchAll(/<Style id="([^"]+)"/g)].map(match => match[1]);
for (const match of richKml.matchAll(/<styleUrl>#([^<]+)<\/styleUrl>/g)) assert.ok(localStyles.includes(match[1]), "Every feature references an emitted style");
assert.ok(!richKml.includes("blu-circle.png"), "Must NOT use simplistic colored paddle dots");
assert.ok(richKml.includes("<color>ffffffff</color>"), "IconStyle must use ffffffff to prevent color distortion");
console.log("✅ [PASS] KML generation exports genuine thematic icons with crisp untinted colors");

// 7. Verify Sub-Category resolution from taxonomy
const mosqueSubCat = ExportUtils.resolveSubCategory({ name: "مسجد حسن عبد الله", category: "مسجد حسن عبد الله 5.0 (1) مسجد", searchKeyword: "مسجد" });
assert.strictEqual(mosqueSubCat, "المساجد والمصليات", "Must resolve to branch name المساجد والمصليات");

const formattedRows = ExportUtils.formatDataForExport([
  { name: "مسجد حسن عبد الله", category: "مسجد حسن عبد الله 5.0 (1) مسجد", searchKeyword: "مسجد", x: 31.27, y: 29.84 }
]);
assert.strictEqual(formattedRows[0]["التصنيف الفرعي"], "مسجد", "Table/export uses the cleaned observed type; legacy branch lookup remains available");
console.log("✅ [PASS] Clean Sub-Category resolution resolves to branch names accurately");

console.log("\n-----------------------------------------");
console.log("🎉 All 6 Export Suite tests passed cleanly!");
console.log("-----------------------------------------\n");

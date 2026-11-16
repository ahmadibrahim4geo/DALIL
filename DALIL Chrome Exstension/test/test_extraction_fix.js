const assert = require("assert");

// تغطية الخلية: كم يجب أن يكون التكبير كي يحتوي عرض الخريطة الخلية كاملة.
const Navigation = require("../core/search-navigation.js");
const pixels = { width: 1280, height: 800 };
const zoomFor = bounds => Navigation.zoomForBounds(bounds, pixels);
const coversAt = (bounds, zoom) => Navigation.covers(
  Navigation.viewportBox((bounds.minLat + bounds.maxLat) / 2, (bounds.minLng + bounds.maxLng) / 2, pixels, zoom),
  bounds
);

// Test isWithinCellBounds & isPlaceInStudyOrCell logic
function isWithinCellBounds(x, y, bounds, defaultMargin = 0.0015) {
  if (!bounds) return true;

  const marginLat = defaultMargin;
  const marginLng = defaultMargin;

  const minLat = bounds.minLat - marginLat;
  const maxLat = bounds.maxLat + marginLat;
  const minLng = bounds.minLng - marginLng;
  const maxLng = bounds.maxLng + marginLng;

  return y >= minLat && y <= maxLat && x >= minLng && x <= maxLng;
}

function isPlaceInStudyOrCell(x, y, cellInfo) {
  if (!cellInfo) return true;
  if (x === 0 && y === 0) return false;

  if (cellInfo.studyAreaBounds) {
    return isWithinCellBounds(x, y, cellInfo.studyAreaBounds, 0.0015);
  }

  if (cellInfo.bounds) {
    return isWithinCellBounds(x, y, cellInfo.bounds, 0.002);
  }

  return true;
}

console.log("=========================================");
console.log("🧪 DALIL Extraction & Zoom Logic Test");
console.log("=========================================");

// 1. التكبير المحسوب يجعل العرض يحتوي الخلية كاملة — عند أي حجم خلية.
const wideCell = { bounds: { minLat: 30.0, maxLat: 30.2, minLng: 31.0, maxLng: 31.2 } };
const cityCell = { bounds: { minLat: 30.0, maxLat: 30.05, minLng: 31.0, maxLng: 31.05 } };
const districtCell = { bounds: { minLat: 30.0, maxLat: 30.02, minLng: 31.0, maxLng: 31.02 } };
const blockCell = { bounds: { minLat: 30.0, maxLat: 30.005, minLng: 31.0, maxLng: 31.005 } };
const microCell = { bounds: { minLat: 30.0, maxLat: 30.0005, minLng: 31.0, maxLng: 31.0005 } };
for (const [name, cell] of Object.entries({ wideCell, cityCell, districtCell, blockCell, microCell })) {
  const zoom = zoomFor(cell.bounds);
  assert.ok(zoom >= 10 && zoom <= 20, `${name}: zoom must stay usable (${zoom})`);
  assert.strictEqual(coversAt(cell.bounds, zoom), true, `${name}: the map viewport must contain the whole cell`);
  // تكبير أعلى يضيّق العرض عن الخلية: هذا بالضبط ما كان يقطع القراءة قبل نهايتها.
  const narrower = zoom >= 20 ? zoom + 2 : zoom + 1;
  assert.strictEqual(coversAt(cell.bounds, narrower), false, `${name}: a narrower viewport must fail coverage`);
}
// الخلية النموذجية (نحو 1.2 كم) — الحالة التي اشتكى منها المستخدم: 16z لا 17z.
const complained = { minLat: 29.3600, maxLat: 29.3708, minLng: 30.9250, maxLng: 30.9360 };
assert.strictEqual(zoomFor(complained), 16, "A ~1.2 km cell needs 16z so its full height fits the viewport");
assert.strictEqual(coversAt(complained, 17), false, "17z is shorter than the cell, which ended the list too early");
console.log("✅ [PASS] Coverage-based zoom keeps the whole cell inside the map viewport at every cell size");

// 2. Test spatial boundary verification
const cellInfo = {
  bounds: { minLat: 29.84, maxLat: 29.85, minLng: 31.24, maxLng: 31.25 },
  studyAreaBounds: { minLat: 29.83, maxLat: 29.86, minLng: 31.23, maxLng: 31.26 },
  centerLat: 29.845,
  centerLng: 31.245
};

// Place inside study area: ACCEPTED
const insidePlaceX = 31.245;
const insidePlaceY = 29.845;
assert.strictEqual(isPlaceInStudyOrCell(insidePlaceX, insidePlaceY, cellInfo), true, "Place in study area must be preserved");

// Place far outside (e.g. Helwan at 31.30 or Saqqara at 31.20): MUST BE REJECTED!
const helwanX = 31.30;
const helwanY = 29.85;
assert.strictEqual(isPlaceInStudyOrCell(helwanX, helwanY, cellInfo), false, "Place outside study area (Helwan) must be strictly rejected");

const saqqaraX = 31.20;
const saqqaraY = 29.85;
assert.strictEqual(isPlaceInStudyOrCell(saqqaraX, saqqaraY, cellInfo), false, "Place outside study area (Saqqara) must be strictly rejected");
console.log("✅ [PASS] Strict spatial boundary gate accepts internal places and rejects external places (Helwan / Saqqara)");

console.log("-----------------------------------------");
console.log("🎉 All Extraction & Zoom tests passed cleanly!");
console.log("-----------------------------------------");

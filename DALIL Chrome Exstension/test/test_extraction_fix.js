const assert = require("assert");

// Test resolveCellZoom logic
function resolveCellZoom(cell, configZoom) {
  if (configZoom && configZoom !== "auto" && !isNaN(parseInt(configZoom))) {
    return Math.min(20, Math.max(12, parseInt(configZoom)));
  }
  if (cell && cell.bounds) {
    const latSpan = Math.abs(cell.bounds.maxLat - cell.bounds.minLat);
    const lngSpan = Math.abs(cell.bounds.maxLng - cell.bounds.minLng);
    const maxSpan = Math.max(latSpan, lngSpan);
    if (maxSpan > 0.35) return 11;
    if (maxSpan > 0.18) return 12;
    if (maxSpan > 0.09) return 13;
    if (maxSpan > 0.04) return 14;
    if (maxSpan > 0.018) return 15;
    if (maxSpan > 0.007) return 16;
    if (maxSpan > 0.0025) return 17;
    if (maxSpan > 0.001) return 18;
    return 19;
  }
  return 15;
}

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

// 1. Test auto-zoom calculation
const wideCell = { bounds: { minLat: 30.0, maxLat: 30.2, minLng: 31.0, maxLng: 31.2 } };
assert.strictEqual(resolveCellZoom(wideCell, "auto"), 12, "Wide cell should resolve to zoom 12");

const cityCell = { bounds: { minLat: 30.0, maxLat: 30.05, minLng: 31.0, maxLng: 31.05 } };
assert.strictEqual(resolveCellZoom(cityCell, "auto"), 14, "City cell should resolve to zoom 14");

const districtCell = { bounds: { minLat: 30.0, maxLat: 30.02, minLng: 31.0, maxLng: 31.02 } };
assert.strictEqual(resolveCellZoom(districtCell, "auto"), 15, "District cell should resolve to zoom 15");

const blockCell = { bounds: { minLat: 30.0, maxLat: 30.005, minLng: 31.0, maxLng: 31.005 } };
assert.strictEqual(resolveCellZoom(blockCell, "auto"), 17, "Block cell should resolve to zoom 17");

const microCell = { bounds: { minLat: 30.0, maxLat: 30.0005, minLng: 31.0, maxLng: 31.0005 } };
assert.strictEqual(resolveCellZoom(microCell, "auto"), 19, "Micro cell should resolve to zoom 19");

assert.strictEqual(resolveCellZoom(blockCell, "19"), 19, "Explicit zoom 19 should be respected");
assert.strictEqual(resolveCellZoom(blockCell, "14"), 14, "Explicit zoom 14 should be respected");
console.log("✅ [PASS] Dynamic zoom resolution accurately adapts to cell bounds or explicit user choice (including 19z)");

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

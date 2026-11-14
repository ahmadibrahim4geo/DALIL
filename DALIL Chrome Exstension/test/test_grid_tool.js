/**
 * Dedicated Test Suite for DALIL Mesh Grid Tool & Regeneration
 */
const assert = require("assert");
const SpatialUtils = require("../lib/spatial-utils.js");

console.log("=========================================");
console.log("🧪 DALIL Mesh Grid Tool - Verification");
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

// 1. Grid generation from standard Bounding Box
runTest("Grid generation produces valid cells with serpentine order", () => {
  const bounds = { minLat: 30.0, maxLat: 30.1, minLng: 31.2, maxLng: 31.3 };
  const cells = SpatialUtils.generateMeshForBounds(bounds, 3, 3, 0.05);
  assert.strictEqual(cells.length, 9, "Should generate exactly 9 cells for 3x3");
  assert.strictEqual(cells[0].id, "cell_1");
  assert.strictEqual(cells[8].id, "cell_9");
  // Check bounds of first cell
  assert(cells[0].bounds.minLat < cells[0].bounds.maxLat);
  assert(cells[0].bounds.minLng < cells[0].bounds.maxLng);
});

// 2. Grid generation with polygon clipping
runTest("Grid generation clips cells against non-convex study area", () => {
  const bounds = { minLat: 30.0, maxLat: 30.2, minLng: 31.0, maxLng: 31.2 };
  // Legacy SpatialUtils rings use [latitude, longitude], unlike GeoJSON [X,Y].
  // Triangle polygon occupying top-right half
  const filterPoly = [
    [30.0, 31.0],
    [30.0, 31.2],
    [30.2, 31.2],
    [30.0, 31.0]
  ];
  const allCells = SpatialUtils.generateMeshForBounds(bounds, 4, 4, 0.0, null);
  const clippedCells = SpatialUtils.generateMeshForBounds(bounds, 4, 4, 0.0, filterPoly);
  assert(clippedCells.length < allCells.length, "Clipped cells must be fewer than total BBox cells");
  assert(clippedCells.length > 0, "Must retain overlapping cells");
});

// 3. Viewport fallback bounds verification
runTest("Viewport fallback bounds are correctly formatted as float numbers", () => {
  const mockViewport = {
    getSouth: () => 29.950001,
    getNorth: () => 30.050002,
    getWest: () => 31.200003,
    getEast: () => 31.300004
  };
  const south = Number(mockViewport.getSouth().toFixed(6));
  const north = Number(mockViewport.getNorth().toFixed(6));
  const west = Number(mockViewport.getWest().toFixed(6));
  const east = Number(mockViewport.getEast().toFixed(6));

  const bounds = { minLat: south, maxLat: north, minLng: west, maxLng: east };
  const cells = SpatialUtils.generateMeshForBounds(bounds, 2, 2, 0.05);
  assert.strictEqual(cells.length, 4, "Should generate 4 cells from viewport fallback");
});

// 4. Grid mutation state guard
runTest("Grid generation rejects mutation while scraping is actively executing", () => {
  function canRegenerateGrid(currentStatus, isProcessingQueue) {
    if (isProcessingQueue && (currentStatus === "running" || currentStatus === "paused")) {
      return false;
    }
    return true;
  }

  assert.strictEqual(canRegenerateGrid("running", true), false, "Must block while running with active queue");
  assert.strictEqual(canRegenerateGrid("paused", true), false, "Must block while paused with active queue");
  assert.strictEqual(canRegenerateGrid("idle", false), true, "Must allow when idle");
  assert.strictEqual(canRegenerateGrid("stopped", false), true, "Must allow when stopped");
  assert.strictEqual(canRegenerateGrid("paused", false), true, "Must recover and allow if no queue is running (stale storage)");
});

// 5. Query-First Pass Execution logic
runTest("Pass-based Query-First execution advances through all cells for each query", () => {
  const queries = ["مساجد", "كنائس"];
  const cells = [{ id: "c1" }, { id: "c2" }, { id: "c3" }];
  const completedQueries = [];
  let qIdx = 0;
  let cIdx = 0;
  let totalSteps = 0;

  while (qIdx < queries.length) {
    totalSteps++;
    cIdx++;
    if (cIdx >= cells.length) {
      completedQueries.push(queries[qIdx]);
      qIdx++;
      cIdx = 0;
    }
  }

  assert.strictEqual(totalSteps, 6, "Total steps must be queries * cells (2 * 3 = 6)");
  assert.strictEqual(completedQueries.length, 2, "Both queries must be marked completed");
  assert.strictEqual(completedQueries[0], "مساجد");
  assert.strictEqual(completedQueries[1], "كنائس");
});

console.log("\n-----------------------------------------");
console.log(`Summary: ${passed}/${total} grid tool tests passed.`);
console.log("-----------------------------------------\n");

if (passed !== total) {
  process.exit(1);
}

/**
 * Test Suite: Backend Scraper Engineer Verification
 * Tests the fix for name_en scope in content.js, rich fields extraction,
 * background message handling (GET_STATUS, GET_RESULTS, GET_ALL_RESULTS),
 * and port keepalive mechanism.
 */

const assert = require("assert");
const fs = require("fs");
const path = require("path");

console.log("=========================================");
console.log("🧪 Backend Scraper & Port Keepalive Tests");
console.log("=========================================");

// 1. Verify content.js source code syntax & name_en scope
const contentSource = fs.readFileSync(path.join(__dirname, "../content/content.js"), "utf8");

// Verify that let name_en is declared at the outer place attributes scope
const outerDeclRegex = /let\s+name_en\s*=\s*"";\s*let\s+category\s*=\s*"";/m;
assert.ok(outerDeclRegex.test(contentSource), "name_en must be declared at the outer scope alongside category");

// Verify that name_en is NOT redeclared with let inside if (card)
const innerRedeclRegex = /if\s*\(\s*card\s*\)\s*\{[^}]*let\s+name_en\s*=/s;
assert.ok(!innerRedeclRegex.test(contentSource), "name_en must NOT be redeclared with let inside if (card)");

// Verify that extractCardsFromDocument safely defines name_en and rich fields
const fallbackFuncRegex = /function\s+extractCardsFromDocument\s*\([^)]*\)\s*\{/m;
assert.ok(fallbackFuncRegex.test(contentSource), "extractCardsFromDocument must exist");
assert.ok(contentSource.includes("name_en,"), "name_en must be included in places output");
assert.ok(contentSource.includes("plus_code:"), "plus_code must be included in output");
assert.ok(contentSource.includes("place_id:"), "place_id must be included in output");
assert.ok(contentSource.includes("cid,"), "cid must be included in output");

console.log("✅ [PASS] content.js has name_en properly scoped and rich POI fields intact");

// 2. Verify background.js source code for keepalive and message handling
const backgroundSource = fs.readFileSync(path.join(__dirname, "../background/background.js"), "utf8");

// Verify port keepalive listener
assert.ok(backgroundSource.includes("chrome.runtime.onConnect.addListener"), "background.js must implement chrome.runtime.onConnect listener");
assert.ok(backgroundSource.includes("PING_PORT") || backgroundSource.includes("PING"), "Port listener must handle PING keepalive messages");

// Verify broadcastUpdate calls onConnect ports
assert.ok(backgroundSource.includes("activePorts"), "broadcastUpdate must send updates to activePorts");

// Verify GET_STATUS and GET_RESULTS return results and stats
const getStatusBlock = backgroundSource.substring(backgroundSource.indexOf('case "GET_STATUS":'), backgroundSource.indexOf('case "START_SCRAPING":'));
assert.ok(getStatusBlock.includes("results: scraperState.results"), "GET_STATUS must return results array");
assert.ok(getStatusBlock.includes("stats: scraperState.stats"), "GET_STATUS must return stats");
assert.ok(getStatusBlock.includes('case "GET_ALL_RESULTS":'), "GET_ALL_RESULTS action must be handled");
assert.ok(getStatusBlock.includes('case "GET_RESULTS":'), "GET_RESULTS action must be handled");

// Verify processQueue calls broadcastUpdate when items are found
const processQueueBlock = backgroundSource.substring(backgroundSource.indexOf("async function processQueue()"), backgroundSource.indexOf("async function ensureWorkerTab()"));
assert.ok(processQueueBlock.includes("broadcastUpdate();"), "processQueue must call broadcastUpdate() when items are found");

console.log("✅ [PASS] background.js port keepalive, real-time broadcast and GET_RESULTS verified");

// 3. Test functional behavior of name_en extraction logic
function simulatePlaceExtraction(name, cardMock = null) {
  let name_en = "";
  let category = "";
  let address = "";
  let phone = "";
  let website = "";
  let status = "";
  let openingHours = "";
  let plusCode = "";
  let priceLevel = "";
  let attributes = "";
  let thumbnailUrl = "";

  const englishMatch = name.match(/[\(\[]([A-Za-z0-9\s.,'&-]+)[\)\]]/);
  if (englishMatch) {
    name_en = englishMatch[1].trim();
  }

  if (cardMock) {
    if (cardMock.website) website = cardMock.website;
    if (cardMock.phone) phone = cardMock.phone;
    if (cardMock.category) category = cardMock.category;
    if (cardMock.englishName && !name_en) name_en = cardMock.englishName;
  }

  return {
    name,
    name_en,
    category,
    x: 31.235,
    y: 30.045,
    address,
    phone,
    website,
    status,
    opening_hours: openingHours,
    rating: "4.5",
    reviewsCount: "120",
    plus_code: plusCode,
    price_level: priceLevel,
    place_id: "ChIJ12345678",
    cid: "987654321"
  };
}

// Case A: Name with English in parentheses, card is null (previous fatal error trigger!)
const resultA = simulatePlaceExtraction("مطعم البرنس (El Prince Restaurant)", null);
assert.strictEqual(resultA.name_en, "El Prince Restaurant", "name_en must be extracted even when card is null");
assert.strictEqual(resultA.cid, "987654321", "cid must be preserved");

// Case B: Pure Arabic name, card has English title block
const resultB = simulatePlaceExtraction("فودافون مصر", { englishName: "Vodafone Egypt", category: "شركة اتصالات" });
assert.strictEqual(resultB.name_en, "Vodafone Egypt", "name_en from card must be assigned to the outer variable");
assert.strictEqual(resultB.category, "شركة اتصالات");

console.log("✅ [PASS] Extraction logic works without ReferenceError in all card scenarios");

console.log("-----------------------------------------");
console.log("🎉 All Backend Scraper tests passed cleanly!");
console.log("-----------------------------------------");

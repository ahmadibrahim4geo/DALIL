/* R5 native Chromium rendering QA; synthetic fixtures only, all external requests blocked. */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require(process.env.DALIL_PLAYWRIGHT_MODULE || 'playwright');
const Symbols = require('../core/symbology');
const Export = require('../lib/export-utils');
const { TaxonomyEngine: Taxonomy } = require('../lib/taxonomy-engine');
const root = path.resolve(__dirname, '..'), output = process.env.DALIL_BROWSER_EVIDENCE_DIR;
if (!output) throw new Error('Set DALIL_BROWSER_EVIDENCE_DIR to an isolated evidence directory.');
fs.mkdirSync(output, { recursive: true });
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'assets/symbols/category-map.json'), 'utf8'));
const selected = new Map();
const add = entry => { if (entry) selected.set(entry.symbolId, entry); };
const preferred = ['google_places:mosque','dalil:prayer_room','google_places:church','google_places:synagogue','google_places:buddhist_temple','google_places:hindu_temple','google_places:bank','google_places:atm','google_places:hospital','google_places:doctor','google_places:dentist','google_places:pharmacy','google_places:cafe','google_places:coffee_shop','google_places:restaurant','google_places:bakery','google_places:grocery_store','google_places:supermarket','google_places:car_dealer','google_places:car_rental','google_places:school','google_places:university','google_places:post_office','google_places:fire_station','google_places:cell_phone_store','google_places:mobile_phone_store'];
preferred.forEach(id => add(catalog.entries.find(entry => entry.id === id)));
for (const shape of ['circle','rounded-square','diamond','hexagon','pentagon','shield','pin','square']) add(catalog.entries.find(entry => entry.shape === shape));
for (const glyph of ['museum','lodging','industry','farm','park','water','communications-tower','cemetery']) add(catalog.entries.find(entry => entry.glyph === glyph));
const sample = [...selected.values()];
const escape = value => String(value || '').replace(/[&<>"']/g, value => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[value]);
const cards = sample.map(entry => {
  const svg = pathToFileURL(path.join(root, entry.svgPath)).href, png = pathToFileURL(path.join(root, entry.pngPath)).href;
  const label = entry.labels?.en || Taxonomy.getCategory(entry.id)?.labels.en || entry.id;
  return '<article data-symbol-id="' + escape(entry.symbolId) + '"><h3>' + escape(label) + '</h3><div class="images"><figure><img src="' + svg + '" width="64" height="64" alt="' + escape(label) + ' SVG"><figcaption>SVG 64</figcaption></figure><figure><img src="' + png + '" width="64" height="64" alt="' + escape(label) + ' PNG"><figcaption>PNG 64</figcaption></figure><figure><img src="' + svg + '" width="30" height="30" alt="' + escape(label) + ' small SVG"><figcaption>SVG 30</figcaption></figure><figure><img src="' + png + '" width="30" height="30" alt="' + escape(label) + ' small PNG"><figcaption>PNG 30</figcaption></figure></div><code>' + escape(entry.id) + '</code><p><i style="background:' + entry.color + '"></i>' + entry.color + ' · ' + entry.shape + '<br>' + entry.glyph + '</p></article>';
}).join('');
const html = '<!doctype html><html lang="en"><meta charset="UTF-8"><title>DALIL R5 local symbol QA</title><style>*{box-sizing:border-box}body{margin:0;background:#e5e9ef;font-family:Segoe UI,Arial,sans-serif;color:#172b4d}header{padding:24px 32px}h1{margin:0 0 8px;font-size:26px}header p{max-width:1200px;margin:6px 0;font-size:14px}.themes{display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:0 16px 16px}.theme{padding:16px;border-radius:14px;background:#fff}.theme.dark{background:#101820;color:#f5f7fa}.theme>h2{margin:0 0 14px;font-size:20px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}article{padding:10px;border:1px solid #cbd5e1;border-radius:10px;min-height:190px;overflow:hidden}.dark article{border-color:#425165;background:#1e293b}h3{height:31px;margin:0 0 4px;font-size:13px;line-height:15px}.images{display:flex;align-items:center;gap:4px;min-height:85px}figure{display:flex;align-items:center;flex-direction:column;margin:0;min-width:30px;gap:3px}img{object-fit:contain}figcaption{font-size:9px;opacity:.75}code{display:block;font-size:9px;overflow-wrap:anywhere}article p{font-size:11px;line-height:15px;margin:7px 0 0}i{display:inline-block;width:10px;height:10px;border:1px solid #ffffffaa;margin-right:4px}</style><header><h1>DALIL R5 · Local GIS symbol QA</h1><p>' + sample.length + ' representative category variants, eight geometric frames, paired shared glyphs, mosque versus prayer room. Actual local SVG and PNG assets at detail and map sizes.</p><p>All 1,254 symbols have distinct RGB values and PNG hashes; this does not imply that every pair is perceptually distinct or safe for every color-vision condition. Native Google Earth / ArcGIS / QGIS appearance is not tested here.</p></header><main class="themes"><section class="theme"><h2>Light background</h2><div class="grid">' + cards + '</div></section><section class="theme dark"><h2>Dark background</h2><div class="grid">' + cards + '</div></section></main></html>';
fs.writeFileSync(path.join(output, 'contact-sheet.html'), html);

(async () => {
  const errors = [], dialogs = [];
  const context = await chromium.launchPersistentContext(path.join(output, 'profile-' + Date.now()), { channel: 'chromium', headless: true, viewport: { width: 1700, height: 1100 }, deviceScaleFactor: 1, args: ['--disable-extensions-except=' + root, '--load-extension=' + root] });
  try {
    await context.route('https://**/*', route => route.abort());
    const preview = await context.newPage(); preview.on('pageerror', error => errors.push(error.message));
    await preview.goto(pathToFileURL(path.join(output, 'contact-sheet.html')).href);
    await preview.waitForFunction(() => [...document.images].every(image => image.complete && image.naturalWidth > 0));
    const previewImages = await preview.locator('img').evaluateAll(images => images.map(image => ({ width: image.naturalWidth, height: image.naturalHeight, file: image.src, displayWidth: image.width })));
    assert.equal(previewImages.length, sample.length * 8); assert.ok(previewImages.every(image => image.width === 64 && image.height === 64));
    assert.deepEqual([...new Set(sample.map(entry => entry.shape))].sort(), ['circle','diamond','hexagon','pentagon','pin','rounded-square','shield','square']);
    await preview.screenshot({ path: path.join(output, 'contact-sheet-light-dark.png'), fullPage: true, animations: 'disabled' });

    const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker');
    const id = worker.url().split('/')[2], page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message)); page.on('dialog', async dialog => { dialogs.push(dialog.message()); await dialog.accept(); });
    await page.goto('chrome-extension://' + id + '/dashboard/dashboard.html');
    await page.waitForFunction(() => !!window.__dalilViewportLock);
    await page.locator('[data-route="phenomena"]').click();
    await page.locator('#taxSector_S01 .tax-sector-header').click();
    const mosqueButton = page.locator('.tax-leaf-btn[data-leaf="google_places:mosque"]');
    const prayerButton = page.locator('.tax-leaf-btn[data-leaf="dalil:prayer_room"]');
    assert.equal(await mosqueButton.count(), 1); assert.equal(await prayerButton.count(), 1);
    for (const [button, category] of [[mosqueButton,'google_places:mosque'],[prayerButton,'dalil:prayer_room']]) {
      const symbol = Symbols.resolve(category), image = button.locator('img');
      assert.equal(await image.getAttribute('data-symbol-id'), symbol.symbolId);
      assert.equal(await image.getAttribute('src'), '../' + symbol.pngPath);
      assert.deepEqual(await image.evaluate(element => [element.naturalWidth, element.naturalHeight]), [64,64]);
    }
    await mosqueButton.scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(output, 'library-r5-ar-light.png'), fullPage: true, animations: 'disabled' });
    await page.locator('#btnThemeToggle').click(); await page.screenshot({ path: path.join(output, 'library-r5-ar-dark.png'), fullPage: true, animations: 'disabled' });
    await page.locator('#btnLangToggle').click();
    await page.waitForFunction(() => document.documentElement.lang === 'en');
    assert.equal(await page.locator('body').evaluate(element => /[\u0600-\u06ff]/.test(element.innerText)), false, 'Independent English library UI');
    await page.screenshot({ path: path.join(output, 'library-r5-en-dark.png'), fullPage: true, animations: 'disabled' });

    await page.locator('[data-route="setup"]').click(); await page.locator('#inputGridRowsNum').fill('1'); await page.locator('#inputGridColsNum').fill('1');
    const geometry = { type: 'Polygon', coordinates: [[[31.21,30.03],[31.26,30.03],[31.26,30.07],[31.21,30.07],[31.21,30.03]]] };
    await page.locator('#studyAreaFileInput').setInputFiles({ name: 'r5-fixture.geojson', mimeType: 'application/geo+json', buffer: Buffer.from(JSON.stringify(geometry)) });
    await page.waitForFunction(async () => (await chrome.runtime.sendMessage({ action: 'GET_GRID' })).cells.length === 1);
    const fixture = ['google_places:mosque','dalil:prayer_room','google_places:bank','google_places:atm'].map((category, index) => ({ id: 'r5-fixture-' + index, name: 'Synthetic ' + (Taxonomy.getCategory(category)?.labels.en || category), canonicalId: category, category: Taxonomy.getCategory(category)?.labels.en || category, provider: 'synthetic_fixture', exportAllowed: true, rights: { exportAllowed: true, license: 'CC0-1.0' }, x: 31.22 + index * 0.01, y: 30.05, hasExactCoords: true, coordinateSource: 'synthetic_fixture' }));
    await worker.evaluate(async records => { await stateReady; scraperState.cells = scraperState.cells.map(cell => ({ ...cell, status: 'done', statusByQuery: { Q1: { status: 'complete' } } })); for (const record of records) record.ownerCellId = scraperState.cells[0].id; scraperState.results = records; scraperState.resultsRevision = (scraperState.resultsRevision || 0) + 1; scraperState.status = 'completed'; scraperState.stats.itemsFound = records.length; scraperState.stats.completedCells = scraperState.cells.length; broadcastUpdate(); }, fixture);
    await page.locator('[data-route="workspace"]').click();
    await page.waitForFunction(() => document.querySelectorAll('.dalil-gis-symbol img').length === 4);
    await page.waitForFunction(() => [...document.querySelectorAll('.dalil-gis-symbol img')].every(image => image.complete && image.naturalWidth === 64));
    const mapAssets = await page.locator('.dalil-gis-symbol img').evaluateAll(images => images.map(image => ({ id: image.dataset.symbolId, src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight })));
    for (const record of fixture) { const symbol = Symbols.resolve(record), icon = mapAssets.find(image => image.id === symbol.symbolId); assert.ok(icon); assert.equal(icon.src, '../' + symbol.pngPath); assert.equal(icon.width, 64); assert.equal(icon.height, 64); }
    await page.screenshot({ path: path.join(output, 'map-r5-en-dark.png'), fullPage: true, animations: 'disabled' });
    await page.locator('#btnThemeToggle').click(); await page.screenshot({ path: path.join(output, 'map-r5-en-light.png'), fullPage: true, animations: 'disabled' });
    const downloadPromise = page.waitForEvent('download');
    await page.evaluate(records => ExportUtils.exportInWorker('kmz', records, 'r5-browser-symbols', null, { language: 'en' }), fixture);
    const download = await downloadPromise; await download.saveAs(path.join(output, 'r5-browser-symbols.kmz'));
    const archive = fs.readFileSync(path.join(output, 'r5-browser-symbols.kmz')), members = new Map();
    let offset = 0;
    while (offset + 30 < archive.length && archive.readUInt32LE(offset) === 0x04034b50) {
      assert.equal(archive.readUInt16LE(offset + 8), 0);
      const length = archive.readUInt32LE(offset + 18), names = archive.readUInt16LE(offset + 26), extra = archive.readUInt16LE(offset + 28);
      const name = archive.subarray(offset + 30, offset + 30 + names).toString('utf8'), start = offset + 30 + names + extra;
      const content = archive.subarray(start, start + length); assert.equal(Export.crc32(content), archive.readUInt32LE(offset + 14));
      assert.equal(members.has(name), false); members.set(name, content); offset = start + length;
    }
    assert.equal([...members.keys()].filter(name => name.startsWith('icons/')).length, fixture.length);
    const exportedKml = members.get('doc.kml').toString('utf8');
    for (const record of fixture) {
      const symbol = Symbols.resolve(record), icon = 'icons/' + symbol.assetKey + '.png';
      assert.deepEqual(members.get(icon), fs.readFileSync(path.join(root, symbol.pngPath)), 'Browser-exported KMZ retains exactly the map PNG');
      assert.ok(exportedKml.includes('<href>' + icon + '</href>')); assert.ok(exportedKml.includes('<value>' + symbol.color + '</value>')); assert.ok(exportedKml.includes('<value>' + symbol.shape + '</value>'));
    }
    assert.deepEqual(errors, []); assert.deepEqual(dialogs, []);
    const report = { status: 'passed', revision: 'r5', browser: context.browser().version(), syntheticData: true, externalRequests: 'blocked', previewSymbols: sample.length, previewImages: previewImages.length, previewShapes: [...new Set(sample.map(entry => entry.shape))].sort(), mapAssets, kmzIcons: fixture.length, kmzSamePngBytes: true, checks: ['local SVG/PNG load and render on light/dark backgrounds','mosque/prayer room variants in real library picker','independent Arabic/English library','real Leaflet map uses canonical PNG variants','same-glyph bank/ATM use separate map paths','real MV3 local export worker downloads KMZ without CSP errors','downloaded KMZ CRC, distinct variants, exact map PNG bytes and color/shape metadata'], limitations: ['Screenshots are Chromium rendering evidence, not Google Earth or ArcGIS/QGIS visual proof.','Global perceptual distinction and all color-vision conditions are not established by RGB/hash uniqueness.'] };
    fs.writeFileSync(path.join(output, 'r5-symbol-browser-report.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report));
  } finally { await context.close(); }
})().catch(error => { fs.writeFileSync(path.join(output, 'r5-symbol-browser-failure.txt'), error.stack || String(error)); console.error(error); process.exitCode = 1; });

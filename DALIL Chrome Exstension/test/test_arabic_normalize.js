/* Arabic normalization contract: one fold for every matching key.
 * Covers hamza forms, taa marbuta, alef maqsura, tashkeel/tatweel, invisible
 * characters, Latin accents, and the call sites that must agree with it.
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.resolve(__dirname, '..');

const Arabic = require(path.join(root, 'core/arabic-normalize.js'));
let passed = 0;
function test(name, fn) { fn(); passed++; console.log('PASS ' + name); }

test('hamza forms fold to bare alef (إلمدرسة -> المدرسة)', () => {
  assert.strictEqual(Arabic.normalize('إلمدرسة'), 'المدرسه');
  assert.strictEqual(Arabic.normalize('المدرسة'), 'المدرسه');
  assert.ok(Arabic.equals('إلمدرسة', 'المدرسة'));
  assert.ok(Arabic.equals('أحمد', 'احمد'));
  assert.ok(Arabic.equals('آمن', 'امن'));
  assert.ok(Arabic.equals('ٱلله', 'الله'));
  assert.ok(Arabic.equals('أَسْوَد', 'اسود'));
});

test('taa marbuta and alef maqsura fold for lookup keys', () => {
  assert.ok(Arabic.equals('مدرسة', 'مدرسه'));
  assert.ok(Arabic.equals('مستشفى', 'مستشفي'));
  assert.ok(Arabic.equals('على', 'علي'));
  assert.strictEqual(Arabic.normalize('مقهى'), 'مقهي');
});

test('tashkeel, tatweel and Quranic marks are stripped', () => {
  assert.strictEqual(Arabic.normalize('مَدْرَسَة'), 'مدرسه');
  assert.strictEqual(Arabic.normalize('مســـجد'), 'مسجد');
  assert.strictEqual(Arabic.stripDiacritics('مُحَمَّد'), 'محمد');
  assert.ok(Arabic.equals('جَامِع', 'جامع'));
  assert.ok(Arabic.equals('مَسْجِدٌ', 'مسجد'));
});

test('invisible characters and BOM never break equality', () => {
  assert.ok(Arabic.equals('\uFEFFمسجد\u200F', 'مسجد'));
  assert.ok(Arabic.equals('مس\u200Cجد', 'مسجد'));
  assert.strictEqual(Arabic.normalize('\u2066مطعم\u2069'), 'مطعم');
});

test('Latin accents, case and spacing fold without touching Arabic letters', () => {
  assert.strictEqual(Arabic.normalize('  Café   Crème '), 'cafe creme');
  assert.ok(Arabic.equals('MUSÉE', 'musee'));
  assert.strictEqual(Arabic.normalize('مطعم  الخير'), 'مطعم الخير');
  assert.strictEqual(Arabic.normalize(null), '');
  assert.strictEqual(Arabic.equals('', ''), false);
});

test('category registry and search language modules share the same fold', () => {
  const DalilArabic = require(path.join(root, 'core/arabic-normalize.js'));
  const context = vm.createContext({ console, DalilArabic, Intl, URL, URLSearchParams });
  for (const file of ['core/category-registry.js', 'core/search-languages.js', 'lib/taxonomy-engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  assert.strictEqual(vm.runInContext("DalilCategoryRegistry.normalize('إلمدرسة')", context), Arabic.normalize('المدرسة'));
  // The catalogued Arabic labels live in the taxonomy registry; the language
  // module is checked through the same fold on accented Latin and hamza text.
  const accented = vm.runInContext("SearchLanguages.findConceptIds('Mosquée')", context);
  const plain = vm.runInContext("SearchLanguages.findConceptIds('mosquee')", context);
  assert.ok(accented.length > 0, 'the French mosque term must be indexed');
  assert.deepStrictEqual(plain, accented);
  assert.strictEqual(Arabic.normalize('Mosquée'), 'mosquee');

  const canonical = vm.runInContext("TaxonomyEngine.resolveConcept('مدرسة')", context);
  const colloquial = vm.runInContext("TaxonomyEngine.resolveConcept('مدرسه')", context);
  assert.ok(canonical && canonical.canonicalId, 'the formal term must resolve');
  assert.ok(colloquial && colloquial.canonicalId, 'colloquial spelling must resolve too');
  assert.strictEqual(colloquial.canonicalId, canonical.canonicalId);
  assert.strictEqual(
    vm.runInContext("(TaxonomyEngine.resolveConcept('إلمدرسة')||{}).canonicalId", context),
    canonical.canonicalId);

  // Common colloquial Arabic terms in manual search resolve accurately to concepts
  const colloquialChecks = [
    ['قهوه', 'google_places:cafe'],
    ['اجزخانه', 'google_places:pharmacy'],
    ['لوكانده', 'google_places:hotel'],
    ['ورشه', 'google_places:car_repair'],
    ['ميكانيكي', 'google_places:car_repair'],
    ['فرن', 'google_places:bakery']
  ];
  for (const [term, expectedId] of colloquialChecks) {
    const res = vm.runInContext("TaxonomyEngine.resolveConcept('" + term + "')", context);
    assert.ok(res && res.canonicalId === expectedId, 'Colloquial ' + term + ' must resolve to ' + expectedId);
  }
});

test('record identity merges hamza and taa-marbuta variants but keeps distinct names', () => {
  const PlaceRecords = require(path.join(root, 'core/records.js'));
  const base = { provider: 'osm_overpass', hasExactCoords: true, coordinateSource: 'osm_node', x: 31.2, y: 30.0 };
  assert.strictEqual(PlaceRecords.normalizeName('إلمدرسة النموذجية'), PlaceRecords.normalizeName('المدرسة النموذجيه'));
  const near = (name, id) => PlaceRecords.normalize({ ...base, id, name }, {});
  const index = new PlaceRecords.RecordIndex([near('إلمدرسة النموذجية', 'a')]);
  assert.strictEqual(index.find(near('المدرسة النموذجيه', 'b')), 0, 'the same venue written with hamza/taa-marbuta must merge');
  assert.strictEqual(index.find(near('المستشفى العام', 'c')), -1, 'a different venue must stay separate');
});

test('free-text manual search keeps the user wording verbatim', () => {
  const context = vm.createContext({ console, DalilArabic: require(path.join(root, 'core/arabic-normalize.js')), Intl, URL, URLSearchParams });
  vm.runInContext('globalThis.globalThis=globalThis', context);
  for (const file of ['core/category-registry.js', 'core/search-languages.js', 'lib/taxonomy-engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  // Colloquial spelling is accepted, but the text sent to the provider is untouched.
  const plan = vm.runInContext("TaxonomyEngine.buildQueryPlan({freeTextQueries:['  مطعم شعبي بالمدرسه  '],searchLanguage:'ar'})", context);
  assert.strictEqual(plan.queries[0].text, '  مطعم شعبي بالمدرسه  ');
});

test('large non-Arabic selections keep running instead of blocking on translations', () => {
  const context = vm.createContext({ console, DalilArabic: require(path.join(root, 'core/arabic-normalize.js')), Intl, URL, URLSearchParams });
  for (const file of ['core/category-registry.js', 'core/search-languages.js', 'lib/taxonomy-engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, file), 'utf8'), context, { filename: file });
  }
  // A large French selection would previously halt with 930 missing translations.
  const wide = vm.runInContext("TaxonomyEngine.buildQueryPlan({selectedLeaves:TaxonomyEngine.getSectors().map(s=>s.id),searchLanguage:'fr',sourceLabelFallback:true,mode:'comprehensive'})", context);
  assert.strictEqual(wide.executable, true);
  assert.strictEqual(wide.unresolvedTranslations.length, 0);
  assert.ok(wide.coverageMap.every(row => row.queryIds.length > 0), 'every leaf still reaches the provider');
  // A small selection keeps the explicit review flow so users can supply real terms.
  const narrow = vm.runInContext("TaxonomyEngine.buildQueryPlan({selectedLeaves:['google_places:bakery'],searchLanguage:'fr',sourceLabelFallback:true})", context);
  assert.strictEqual(narrow.executable, false);
  assert.strictEqual(narrow.queries.length, 0);
});

console.log('Arabic normalization: ' + passed + ' groups verified (hamza, taa marbuta, alef maqsura, tashkeel, invisible, Latin, shared fold, record identity, verbatim free text, large-selection fallback).');

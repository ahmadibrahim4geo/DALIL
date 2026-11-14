'use strict';
const assert = require('assert');
const { performance } = require('perf_hooks');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { TaxonomyEngine: t, DALIL_SECTORS: sectors } = require('../lib/taxonomy-engine.js');
const registry = require('../core/category-registry.js');
const { findSmartBrandMatch } = require('../lib/smart-brands.js');

const leaves = sectors.flatMap(s => s.branches.flatMap(b => b.leafObjects));
assert.strictEqual(leaves.length, 940);
assert.strictEqual(new Set(leaves.map(l => l.id)).size, 940);
for (const leaf of leaves) {
  assert(leaf.name_en && !/[\u0600-\u06ff]/.test(leaf.name_en), leaf.id + ' English label');
  assert.strictEqual(t.getLocalizedLeaf(leaf, 'en'), leaf.name_en);
  assert.strictEqual(t.getLocalizedLeaf(leaf.name_ar, 'en', leaf.branchId), leaf.name_en);
  assert.strictEqual(t.getLocalizedLeaf(leaf.id, 'ar'), leaf.name_ar);
  assert(leaf.symbolId && leaf.canonicalId);
  assert.strictEqual(leaf.googleGcid, null);
  if (leaf.googlePlaceType) assert(registry.GOOGLE_TYPES_SNAPSHOT.tableA.concat(registry.GOOGLE_TYPES_SNAPSHOT.tableB).some(type => type.id === leaf.googlePlaceType));
}

// Canonical aliases never become separate official categories.
for (const term of ['mosque', 'مسجد', 'مساجد', 'جامع', 'mosquée', 'mezquita', 'mesquita', 'मस्जिद', '清真寺', 'モスク']) {
  assert.strictEqual(t.resolveConcept(term).canonicalId, 'google_places:mosque', term);
}
for (const term of ['مدرسة', 'مدارس', 'school', 'école', 'escuela', 'escola', 'विद्यालय', '学校']) {
  assert.strictEqual(t.resolveConcept(term).canonicalId, 'google_places:school', term);
}
assert.strictEqual(t.getLeafMeta('مسجد تاريخي').canonicalId, t.getLeafMeta('مسجد').canonicalId);
assert.deepStrictEqual(t.getLeafMeta('مسجد تاريخي').descriptiveAttributes, [{ key: 'heritage', value: true, origin: 'discovery_term', verified: false }]);
assert.strictEqual(t.resolveConcept('زاوية'), null);
assert.strictEqual(t.rankTerminology('زاوية', { country: 'EG' })[0].requiresReview, true);
assert.strictEqual(t.resolveBilingualSearch('زاوية').secondary, '');
assert.strictEqual(t.resolveBilingualSearch('زاوية').requiresReview, true);
assert.strictEqual(t.resolveConcept('Clinic').googlePlaceType, 'medical_clinic');
assert.notStrictEqual(t.resolveConcept('Clinic').canonicalId, t.resolveConcept('Hospital').canonicalId);
assert.strictEqual(t.resolveConcept('hospitl'), null, 'spelling suggestion must never auto classify');
assert.strictEqual(t.rankTerminology('hospitl')[0].canonicalId, 'google_places:hospital');
assert.strictEqual(t.rankTerminology('hospitl')[0].requiresReview, true);
assert.strictEqual(t.rankTerminology('neighborhood_police_station', { country: 'EG' }).length, 0);
assert(t.rankTerminology('neighborhood_police_station', { country: 'JP' }).length > 0);
assert.strictEqual(t.getCategory('google_places:point_of_interest').filterable, false);
assert.strictEqual(t.getCategory('google_places:mosque').filterable, true);
assert.strictEqual(t.getCategory('google_places:mosque').countryAvailability.status, 'unknown');
assert.deepStrictEqual(t.resolveConcept('جامع').osmTags, [{ key: 'amenity', value: 'place_of_worship' }, { key: 'religion', value: 'muslim' }]);
assert(t.resolveConcept('restaurant').attributeSchema.some(f => f.key === 'cuisine' && f.sourceBlobSha));

// All legacy leaves have an actual execution link, including repeated labels.
const plan = t.buildQueryPlan({ selectedLeaves: sectors.map(s => s.id), mode: 'comprehensive', bilingualEnabled: true, searchLanguage: 'en', uiLanguage: 'en' });
assert.strictEqual(plan.totalLeavesInScope, 940);
assert.strictEqual(plan.leavesCovered, 940);
assert(!/[\u0600-\u06ff]/.test(plan.summaryText));
for (const leaf of plan.coverageMap) {
  assert(leaf.queryIds.length > 0, leaf.leafId + ' must be scheduled');
  for (const id of leaf.queryIds) assert(plan.queries.find(q => q.queryId === id).targetLeaves.includes(leaf.leafId));
}
const englishPlan = t.buildQueryPlan({ selectedLeaves: ['S01'], searchLanguage: 'en', uiLanguage: 'en' });
assert(englishPlan.queries.every(q => q.lang === 'en' && !/[\u0600-\u06ff]/.test(q.text)));
assert.deepStrictEqual(englishPlan, t.buildQueryPlan({ selectedLeaves: ['S01'], searchLanguage: 'en', uiLanguage: 'en' }));
const reduced = t.buildQueryPlan({ selectedLeaves: sectors.map(s => s.id), mode: 'fast', maxQueries: 3 });
assert(reduced.queries.length <= 3);
assert.strictEqual(reduced.leavesCovered, 0, 'representatives are not direct coverage');
assert(reduced.coverageMap.some(c => c.status === 'not_scheduled'));
assert.strictEqual(t.buildQueryPlan({ selectedLeaves: ['مساجد'] }).queries[0].text, 'مساجد');
assert.strictEqual(findSmartBrandMatch('flower shop', 'en'), null, 'WE substring must not match unrelated words');
assert.strictEqual(findSmartBrandMatch('WE', 'en').categoryId, 'telecom');
assert(!/[\u0600-\u06ff]/.test(findSmartBrandMatch('Vodafone', 'en').category));
assert.strictEqual(t.auditRegistry().untranslatedLeafIds.length, 0);
assert.strictEqual(t.auditRegistry().missingSymbolIds.length, 0);
const categories = t.registry.getCategories();
assert.strictEqual(new Set(categories.map(c => c.symbolId)).size, categories.length);
assert.strictEqual(registry.resolveConcept('مسجد').canonicalId, 'google_places:mosque');
assert.strictEqual(t.buildQueryPlan({ selectedLeaves: ['google_places:mosque'], searchLanguage: 'en' }).queries[0].text, 'Mosque');
const frenchScope = t.buildQueryPlan({ selectedLeaves: ['S01'], searchLanguage: 'fr' });
assert(frenchScope.missingTranslations.length > 0);
assert.strictEqual(frenchScope.languageFallback, null);
assert(!frenchScope.queries.some(query => query.lang === 'en'));
assert.strictEqual(t.resolveConcept('محطة شحن'), null);
assert.notStrictEqual(t.getLeafMeta('S15.B02.L05').canonicalId, t.getLeafMeta('S28.B02.L03').canonicalId);
for (const unknown of ['R', 'Starbucks', 'WE', 'unclassified-place-123', '', null, { name: 'R' }]) {
  assert.doesNotThrow(() => t.resolveCategoryStyle(unknown));
}
assert.strictEqual(t.resolveCategoryStyle('R').sectorId, 'S00');
assert.strictEqual(t.classifyPlaceCategory({ name: 'R' }, 'mosque').confidence, 'uncertain');
assert.strictEqual(t.classifyPlaceCategory({ name: 'R', category: 'Mosque' }, ['مسجد']).confidence, 'match');
assert.strictEqual(t.classifyPlaceCategory({ name: 'R', category: 'Pharmacy' }, ['mosque']).confidence, 'mismatch');

// Execute the exact browser/worker scripts without CommonJS or network access.
const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync(path.join(__dirname, '../core/category-registry.js'), 'utf8'), context);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../lib/taxonomy-engine.js'), 'utf8'), context);
assert.strictEqual(vm.runInContext("TaxonomyEngine.getLocalizedLeaf('S01.B01.L01','en')", context), 'Mosque');
assert.strictEqual(vm.runInContext("DalilCategoryRegistry.resolveConcept('جامع').googlePlaceType", context), 'mosque');

const start = performance.now();
for (let i = 0; i < 1000; i++) t.resolveConcept(i % 2 ? 'مساجد' : 'hospital');
const exactMs = performance.now() - start;
const fuzzyStart = performance.now();
for (let i = 0; i < 50; i++) t.rankTerminology('hospitl');
const fuzzyMs = performance.now() - fuzzyStart;
console.log(JSON.stringify({ status: 'passed', leaves: leaves.length, officialTypes: t.auditRegistry().officialTypes, mappedLeaves: t.auditRegistry().mappedLeaves, conceptCount: t.auditRegistry().concepts, queries: plan.queries.length, exactLookup1000Ms: +exactMs.toFixed(2), fuzzyLookup50Ms: +fuzzyMs.toFixed(2), aliasCollisionsRequiringReview: t.auditRegistry().aliasCollisions }));

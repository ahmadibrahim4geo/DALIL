'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const languages = require('../core/search-languages.js');
const { TaxonomyEngine: taxonomy } = require('../lib/taxonomy-engine.js');

for (const [input, expected] of [
  ['AR-eg', 'ar-EG'], ['fr-ca', 'fr-CA'], ['es-419', 'es-419'], ['sr-latn-rs', 'sr-Latn-RS'],
  ['zh-hant-tw', 'zh-Hant-TW'], ['en-u-nu-arab', 'en-u-nu-arab'], ['iw', 'he'],
  ['x-dalil-test', 'x-dalil-test'], ['i-klingon', 'tlh'], ['en-GB-oed', 'en-GB-oxendict'],
  ['i-default', 'i-default'], ['qaa-Qaaa-QM-x-local', 'qaa-Qaaa-QM-x-local']
]) assert.strictEqual(languages.normalizeLocale(input), expected, input);
for (const bad of ['', 'en_US', 'a', 'en--US', '12', 'x', 'en-a', 'en-a-abc-a-def', 'sl-rozaj-rozaj', 'en<script>', null]) {
  assert.throws(() => languages.normalizeLocale(bad), error => error.code === 'INVALID_LOCALE', String(bad));
}
assert(languages.lookupChain('fr-CA').includes('fr'));
assert(languages.lookupChain('zh-TW').includes('zh-Hant'));
assert(!languages.lookupChain('zh-Hant-TW').includes('zh'), 'Traditional Chinese cannot silently use simplified parent labels');
assert(languages.lookupChain('en-US-posix').includes('en-US'));
assert.deepStrictEqual(languages.lookupChain('i-default'), ['i-default']);
assert(languages.getCatalog('google_maps_platform').locales.length > 70);
assert.strictEqual(languages.describeLocale('he', 'google_maps_platform').providerLocale, 'iw');
assert.strictEqual(languages.describeLocale('fr-CA', 'google_maps_platform').status, 'listed');
assert.strictEqual(languages.describeLocale('fr-BE', 'google_maps_platform').providerLocale, null);
assert.strictEqual(languages.describeLocale('fr-BE', 'google_maps_platform').suggestedProviderLocale, 'fr');
assert.strictEqual(languages.describeLocale('de-DE', 'google_maps_dom').providerSupported, null);
assert.strictEqual(languages.describeLocale('de-DE', 'osm_overpass').resultLanguageGuaranteed, false);

for (const locale of ['fr-CA', 'es-419', 'de-DE', 'zh-CN', 'zh-Hant-TW', 'pt-BR', 'ja-JP']) {
  const plan = taxonomy.buildQueryPlan({ selectedLeaves: ['google_places:mosque'], searchLanguage: locale, uiLanguage: 'en' });
  assert.strictEqual(plan.searchLanguage, locale);
  assert.strictEqual(plan.executable, true);
  assert.strictEqual(plan.queries.length, 1);
  assert.strictEqual(plan.queries[0].lang, locale);
  assert.strictEqual(plan.queries[0].termSource, 'id_tagging_schema_translation');
  assert(plan.queries[0].sourceBlobSha);
  assert.notStrictEqual(plan.queries[0].text, 'Mosque');
  assert.strictEqual(taxonomy.resolveConcept(plan.queries[0].text).canonicalId, 'google_places:mosque');
}
for (const locale of ['pt-PT', 'hi-IN']) {
  const plan = taxonomy.buildQueryPlan({ selectedLeaves: ['google_places:mosque'], searchLanguage: locale });
  assert.strictEqual(plan.executable, true);
  assert.strictEqual(plan.queries[0].lang, locale);
  assert.strictEqual(plan.queries[0].termSource, 'dalil_local_alias');
  assert(!plan.queries.some(query => query.lang === 'en'));
}

// Unknown/absent category terms are explicit gaps, never an English fallback.
const absent = taxonomy.buildQueryPlan({ selectedLeaves: ['google_places:mosque'], searchLanguage: 'zu-ZA' });
assert.strictEqual(absent.executable, false);
assert.strictEqual(absent.queries.length, 0);
assert.strictEqual(absent.unresolvedTranslations[0].locale, 'zu-ZA');
assert.strictEqual(absent.coverageMap[0].status, 'missing_translation');
assert.strictEqual(absent.languageFallback, null);
assert.strictEqual(taxonomy.resolveConcept('cafeteria'), null, 'New translated dictionary cannot bypass an existing semantic ambiguity');
const fallback = taxonomy.buildQueryPlan({ selectedLeaves: ['google_places:mosque'], searchLanguage: 'zu-ZA', fallbackLanguage: 'en' });
assert.strictEqual(fallback.executable, true);
assert.strictEqual(fallback.queries[0].text, 'Mosque');
assert.strictEqual(fallback.queries[0].lang, 'en');
assert.strictEqual(fallback.queries[0].requestedLocale, 'zu-ZA');
assert.strictEqual(fallback.queries[0].explicitFallback, true);
assert.strictEqual(fallback.missingTranslations[0].resolvedByFallback, true);
assert.strictEqual(fallback.languageFallback.explicit, true);

const overridden = taxonomy.buildQueryPlan({ selectedLeaves: ['google_places:mosque'], searchLanguage: 'zu-ZA', queryTerms: {
  'google_places:mosque': { 'zu-ZA': ['  User term  ', 'Alternate term'] }
} });
assert.strictEqual(overridden.executable, true);
assert.deepStrictEqual(overridden.queriesToRun, ['  User term  ', 'Alternate term']);
assert(overridden.queries.every(query => query.lang === 'zu-ZA' && query.termSource === 'user_override'));
const descriptor = taxonomy.buildQueryPlan({ selectedLeaves: ['S01.B01.L03'], searchLanguage: 'de', queryTerms: {
  'google_places:mosque': { de: 'Allgemeine Moschee' }, 'S01.B01.L03': { de: 'Große Moschee' }
} });
assert.strictEqual(descriptor.queries[0].text, 'Große Moschee');
const missingDescriptor = taxonomy.buildQueryPlan({ selectedLeaves: ['S01.B01.L03'], searchLanguage: 'de' });
assert.strictEqual(missingDescriptor.queries.length, 0, 'Generic concept translation must not erase descriptive leaf specificity');

// Explicit free text bypasses alias/canonical selection and preserves every character.
for (const text of ['  مسجد  ', 'MOSQUE', '  Café Élévation  ', '清真寺', 'مُسْتَشْفَى', 'S01', 'google_places:mosque']) {
  const free = languages.createFreeText(text, 'fr-CA');
  const selected = taxonomy.selectionId(free);
  assert.strictEqual(selected.text, text);
  assert.strictEqual(taxonomy.getLeafMeta(free), null);
  assert.strictEqual(taxonomy.getLocalizedLeaf(free, 'en'), text);
  const plan = taxonomy.buildQueryPlan({ selectedLeaves: [selected], searchLanguage: 'en', bilingualEnabled: true, fallbackLanguage: 'en' });
  assert.strictEqual(plan.queries.length, 1);
  assert.strictEqual(plan.queries[0].text, text);
  assert.strictEqual(plan.queries[0].lang, 'fr-CA');
  assert.strictEqual(plan.queries[0].termSource, 'user_free_text');
  assert.strictEqual(plan.executable, true);
}
assert.notStrictEqual(taxonomy.selectionKey(languages.createFreeText('مسجد','ar')), taxonomy.selectionKey(languages.createFreeText('مسجد','fr')));
assert.throws(() => languages.createFreeText(['mosque'], 'en'), error => error.code === 'INVALID_QUERY_TERM');
assert.strictEqual(taxonomy.buildQueryPlan({ freeTextQueries: ['  مسجد  '], searchLanguage: 'sr-Latn-RS' }).queries[0].text, '  مسجد  ');
const noImplicitEnglish = taxonomy.buildQueryPlan({ selectedLeaves: ['google_places:mosque'], searchLanguage: 'de', bilingualEnabled: true });
assert(!noImplicitEnglish.queries.some(query => query.lang === 'en'));
const explicitExtra = taxonomy.buildQueryPlan({ selectedLeaves: ['google_places:mosque'], searchLanguage: 'de', additionalSearchLanguages: ['en'] });
assert(explicitExtra.queries.some(query => query.lang === 'en'));

// Comprehensive legacy scope always records every leaf, including missing translations.
const sectors = taxonomy.getSectors().map(sector => sector.id);
for (const locale of ['ar-EG', 'en-GB']) {
  const plan = taxonomy.buildQueryPlan({ selectedLeaves: sectors, searchLanguage: locale });
  assert.strictEqual(plan.totalLeavesInScope, 940);
  assert.strictEqual(plan.leavesCovered, 940);
  assert.strictEqual(plan.executable, true);
  assert(plan.coverageMap.every(row => row.queryIds.length > 0 && row.status === 'covered'));
}
const partial = taxonomy.buildQueryPlan({ selectedLeaves: sectors, searchLanguage: 'fr' });
assert.strictEqual(partial.totalLeavesInScope, 940);
assert.strictEqual(partial.coverageMap.length, 940);
assert(partial.missingTranslations.length > 0);
assert.strictEqual(partial.executable, false);
assert(!partial.queries.some(query => query.lang === 'en'));
assert(partial.coverageMap.every(row => row.queryIds.length > 0 || row.status === 'missing_translation'));
const allOverrides = Object.fromEntries(sectors.flatMap(id => taxonomy.getAllLeavesWithMeta(id)).map(leaf => [leaf.id, { 'qaa-Qaaa': 'Term ' + leaf.id }]));
const complete = taxonomy.buildQueryPlan({ selectedLeaves: sectors, searchLanguage: 'qaa-Qaaa', queryTerms: allOverrides });
assert.strictEqual(complete.leavesCovered, 940);
assert.strictEqual(complete.executable, true);
assert.strictEqual(complete.unresolvedTranslations.length, 0);
assert.deepStrictEqual(complete, taxonomy.buildQueryPlan({ selectedLeaves: sectors, searchLanguage: 'qaa-Qaaa', queryTerms: allOverrides }));
assert.throws(() => taxonomy.buildQueryPlan({ selectedLeaves: sectors, searchLanguage: 'not_a_locale' }), error => error.code === 'INVALID_LOCALE');
assert.throws(() => taxonomy.buildQueryPlan({ selectedLeaves: ['google_places:mosque'], searchLanguage: 'fr', queryTerms: { 'google_places:mosque': { fr: [] } } }), error => error.code === 'INVALID_QUERY_TERM');

const context = vm.createContext({ console });
for (const file of ['core/category-registry.js', 'core/search-languages.js', 'lib/taxonomy-engine.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
assert.strictEqual(vm.runInContext("TaxonomyEngine.buildQueryPlan({selectedLeaves:['google_places:mosque'],searchLanguage:'de'}).executable", context), true);
console.log(JSON.stringify({ status: 'passed', bcp47: true, officialProviderCatalogue: languages.getCatalog('google_maps_platform').locales.length, translatedBasicTerms: Object.fromEntries(Object.entries(languages.BASIC_TERMS).map(([locale,data]) => [locale,Object.keys(data.terms).length])), legacyLeafScope: partial.totalLeavesInScope, frenchQueries: partial.queries.length, frenchMissingTranslations: partial.unresolvedTranslations.length, explicitOverridesCoverAll940: true, freeTextVerbatim: true }));

'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {TaxonomyEngine:T}=require('../lib/taxonomy-engine');
const L=require('../core/search-languages'),Q=require('../core/quick-library'),S=require('../core/symbology'),E=require('../lib/export-utils');
const snapshot=require('../core/category-registry').GOOGLE_TYPES_SNAPSHOT;
const reference=JSON.parse(fs.readFileSync(path.join(__dirname,'../docs/evidence/google-place-types-2026-11-14.json'),'utf8'));
for(const table of ['tableA','tableB'])assert.deepEqual(snapshot[table].map(t=>t.id).sort(),reference[table],'Fresh official type snapshot '+table);
const visible=T.getLibrarySectors().flatMap(s=>s.branches.flatMap(b=>T.getDisplayCategories(b.id).map(c=>c.canonicalId)));
assert.equal(new Set(visible).size,visible.length,'Each detailed concept appears once');
for(const type of snapshot.tableA)assert(visible.includes('google_places:'+type.id),'Selectable type visible: '+type.id);
assert(!visible.includes('google_places:town_square'),'Response-only types do not become search filters');
assert(T.getLibrarySectors('truck_dealer').some(s=>s.branches.some(b=>T.getDisplayCategories(b.id,b.leaves).some(c=>c.googlePlaceType==='truck_dealer'))));
assert.equal(T.getSectors().flatMap(s=>T.getAllLeavesWithMeta(s.id)).length,940,'Legacy leaf identity remains intact');
assert.equal(Q.list().length,38);
for(const p of Q.list())for(const locale of ['ar-EG','en-GB']){
  const plan=T.buildQueryPlan({selectedLeaves:[p.id],searchLanguage:locale});
  assert(plan.executable,p.id+' '+locale);assert.equal(plan.totalLeavesInScope,1);
  assert(plan.queries.length<=3,'Broad terms never expand detailed descendants');
  assert(plan.queries.every(q=>q.lang===locale));assert.equal(T.selectionId(p.id),p.id);
}
for(const locale of ['fr-CA','de-DE','es-419','pt-BR','ja','zh-Hant-TW','hi']){
  const plan=T.buildQueryPlan({selectedLeaves:Q.list().map(p=>p.id),searchLanguage:locale});
  assert(plan.executable,locale);assert(plan.queries.every(q=>q.lang===locale));
  assert(!plan.queries.some(q=>q.lang==='ar'||q.lang==='en'));
}
const mosque=T.buildQueryPlan({selectedLeaves:['quick:mosques'],searchLanguage:'ar'});
assert.deepEqual(mosque.queriesToRun,['مساجد','مصليات','زوايا']);
for(const mode of ['comprehensive','balanced','fast']){
  const plan=T.buildQueryPlan({selectedLeaves:Q.list().map(p=>p.id),mode,maxQueries:1});
  assert.equal(plan.leavesCovered,38,'Every selected broad target executes in '+mode);
}
const missing=T.buildQueryPlan({selectedLeaves:['quick:factories'],searchLanguage:'qaa-Qaaa'});
assert.equal(missing.executable,false);assert.equal(missing.unresolvedTranslations[0].selectionId,'quick:factories');
const manual=T.buildQueryPlan({selectedLeaves:['quick:factories'],searchLanguage:'qaa-Qaaa',queryTerms:{'quick:factories':{'qaa-Qaaa':'Custom factory term'}}});
assert.deepEqual(manual.queriesToRun,['Custom factory term']);
for(const p of Q.list())if(p.canonicalId)assert(T.getCategory(p.canonicalId),'Quick preset category exists');
const factories=L.createFreeText('  مصانع  ','ar');
assert.deepEqual(T.buildQueryPlan({selectedLeaves:[factories]}).queriesToRun,['  مصانع  ']);
assert.equal(T.resolveSearchHint(factories.text).canonicalId,'google_places:manufacturer');
assert.equal(T.resolveSearchHint('زاوية'),null,'Ambiguous prayer-related input stays unclassified');
assert.equal(S.resolve({queryCategoryId:T.resolveSearchHint(factories.text).canonicalId,searchKeyword:factories.text}).canonicalId,'google_places:manufacturer');
for(const text of ['  مسجد  ','S01','google_places:mosque','quick:mosques','清真寺','خدمة جديدة <خاصة>']){
  const free=L.createFreeText(text,'ja');const plan=T.buildQueryPlan({selectedLeaves:[free],bilingualEnabled:true});
  assert.deepEqual(plan.queriesToRun,[text]);assert.equal(plan.queries[0].lang,'ja');
  assert.notEqual(T.selectionKey(free),T.selectionKey('google_places:mosque'));
}
const a={category:'مطعم بيتزا',searchKeyword:'مطاعم'},b={category:'مطعم مأكولات بحرية',searchKeyword:'مطاعم'};
assert.equal(E.categoryLabel(a,'sub',{language:'ar'}),a.category);
assert.equal(E.categoryLabel(b,'sub',{language:'ar'}),b.category,'Same search must not poison cached result classification');
const church={category:'Church',canonicalId:'google_places:mosque',searchKeyword:'Mosque'};
assert.equal(T.resolveResultConcept(church).canonicalId,'google_places:church');
assert.equal(S.resolve(church).canonicalId,'google_places:church');
assert.equal(E.categoryLabel(church,'sub',{language:'en'}),'Church');
const unknown={category:'Unmapped source type',searchKeyword:'restaurant'};
assert.equal(S.resolve(unknown).symbolId,'dalil.unclassified');assert.equal(S.resolve(unknown).glyph,'marker');
assert.equal(S.resolve({category:'Uncatalogued activity xyz'}).symbolId,'dalil.unclassified');
assert.equal(S.resolve({category:'مسجد'}).canonicalId,'google_places:mosque');
assert.equal(E.canonicalExportRecord({...b,name:'بحري',x:31,y:30,hasExactCoords:true},0,{language:'ar'}).subcategory,b.category);
console.log(JSON.stringify({status:'passed',quickTargets:38,selectableGoogleTypes:478,responseTypes:36,detailedTargets:visible.length,checks:['official snapshot equality','complete selectable library','bounded broad searches','all explicit quick targets in every mode','regional locale terms and manual gaps','literal free text','source-first symbols','independent category cache and exports']}));

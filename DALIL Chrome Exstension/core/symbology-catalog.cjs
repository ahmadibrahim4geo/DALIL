/* Rebuild the reviewable, local category-to-symbol map without downloads. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {TaxonomyEngine:T}=require('../lib/taxonomy-engine'),Symbols=require('./symbology');
const entries=[];
for(const sector of T.getSectors()){
 for(const scope of [sector,...sector.branches])entries.push({id:scope.id,kind:scope.id.includes('.B')?'branch':'sector',...Symbols.resolve(scope.id)});
}
for(const category of T.registry.getCategories())entries.push({id:category.canonicalId,kind:'category',googlePlaceType:category.googlePlaceType,labels:category.labels,...Symbols.resolve(category.canonicalId)});
entries.push({id:'dalil:unclassified',kind:'fallback',...Symbols.resolve('dalil:unclassified')});
entries.sort((a,b)=>a.id.localeCompare(b.id));
const catalog={schema:'dalil.symbol-map/2',library:'@mapbox/maki',version:'8.2.0',license:'CC0-1.0',note:'Unique category colors with geometric marker frames; shared base glyphs always use different colors. Variants are rendered locally and embedded unchanged in KMZ.',entries};
const file=path.resolve(__dirname,'../assets/symbols/category-map.json');fs.writeFileSync(file,JSON.stringify(catalog,null,2)+'\n');
console.log(JSON.stringify({entries:entries.length,uniqueIds:new Set(entries.map(e=>e.symbolId)).size,glyphs:new Set(entries.map(e=>e.glyph)).size}));

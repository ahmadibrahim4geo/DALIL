const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const Grid=require('../core/grid-presentation'),Nav=require('../core/search-navigation'),Symbols=require('../core/symbology');
const {TaxonomyEngine:T}=require('../lib/taxonomy-engine'),Export=require('../lib/export-utils');
async function main(){
 assert.equal(Grid.style('pending').color,'#2563eb');assert.notEqual(Grid.style('pending').color,Grid.style('confirmed_empty').color);
 assert.equal(Grid.style('running').color,'#f59e0b');assert.equal(Grid.style('done').color,'#16a34a');
 const cell={id:'a',status:'done',statusByQuery:{Q1:{status:'complete'}}};
 assert.equal(Grid.state(cell,{status:'running',queryIndex:1}),'pending','New query starts with blue cells');
 assert.equal(Grid.state(cell,{status:'completed'}),'complete');assert.equal(Grid.ownerVisited({ownerCellId:'a'},[cell]),true);
 assert.equal(Grid.ownerVisited({ownerCellId:'b'},[cell,{id:'b',status:'pending'}]),false);
 assert.equal(Grid.state({statusByQuery:{Q1:{status:'confirmed_empty'},Q2:{status:'unknown'}}},{status:'completed'}),'unknown','Unknown is not empty');
 const mosque=T.getDisplayCategories('S01.B01').filter(c=>c.googlePlaceType==='mosque');assert.equal(mosque.length,1);
 assert.equal(mosque[0].labels.ar,'مسجد');assert.equal(T.getDisplayCategories('S01.B01').some(c=>['مسجد كبير','مسجد تاريخي','جامع','مصلى نساء'].includes(c.labels.ar)),false);
 assert.equal(T.selectionId('جامع'),'google_places:mosque');assert.equal(T.selectionId('مساجد'),'google_places:mosque');assert.equal(T.selectionId('مسجد تاريخي'),'مسجد تاريخي','Explicit descriptor searches are preserved');
 assert.ok(mosque[0].searchTerms.find(t=>t.labels.ar==='مسجد تاريخي').descriptiveAttributes.every(a=>a.verified===false));
 const categories=T.getSectors().flatMap(s=>T.getDisplayCategories(s.id));assert.equal(new Set(categories.map(c=>c.canonicalId)).size,categories.length);
 assert.equal(T.buildQueryPlan({selectedLeaves:['google_places:mosque'],bilingualEnabled:false}).queries.length,1);
 assert.equal(Object.keys(T.buildQueryPlan({selectedLeaves:['S01.B01'],mode:'comprehensive'}).coverageMap).length,12,'Legacy leaf coverage is retained');
 assert.notEqual(Symbols.resolve('google_places:mosque').glyph,Symbols.resolve('google_places:church').glyph);
 assert.notEqual(Symbols.resolve('google_places:mosque').glyph,Symbols.resolve('google_places:synagogue').glyph);
 assert.equal(Symbols.resolve({category:'Church',searchKeyword:'Mosque'}).glyph,'religious-christian','Source category outranks query hint');
 assert.equal(Symbols.resolve({canonicalId:'google_places:mosque',googlePlaceType:'church'}).canonicalId,'google_places:church','Declared source type stays consistent with the symbol');
 assert.notEqual(Symbols.resolve('S01').symbolId,Symbols.resolve('S01.B01').symbolId);
 const catalog=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/symbols/category-map.json'),'utf8'));
 assert.equal(new Set(catalog.entries.map(e=>e.symbolId)).size,catalog.entries.length);
 for(const entry of catalog.entries){const symbol=Symbols.resolve(entry.id);assert.equal(symbol.symbolId,entry.symbolId);assert.equal(symbol.glyph,entry.glyph);for(const key of ['svgPath','pngPath'])assert.ok(fs.existsSync(path.join(__dirname,'..',symbol[key])),symbol[key]);}
 const target='https://www.google.com/maps/search/mosque/@30,31,16z';
 assert.equal(Nav.verify('https://www.google.com/maps/search/mosque/@30,31,941m/data=!test',target).verified,true,'Google z-to-m URL normalization is accepted');
 assert.equal(Nav.verify('https://www.google.com/maps/search/mosque/@30,31.01,941m',target).verified,false,'Same query with a stale camera is rejected');
 assert.equal(Nav.verify('https://www.google.com/maps/search/school/@30,31,16z',target).verified,false);
 assert.equal(Nav.verify('https://www.google.com/maps/place/Name/@30,31,16z',target,'mosque').verified,true);
 assert.equal(Nav.verify('https://www.google.com/maps/place/Name',target,'mosque').verified,false,'Missing camera is not verified');
 const arabicTarget='https://www.google.com/maps/search/'+encodeURIComponent('مسجد')+'/@30,31,16z';
 assert.equal(Nav.verify('https://www.google.com/maps/search/'+encodeURIComponent('مسجد\u202d')+'/@30,31,941m',arabicTarget).verified,true,'Observed Google directional suffix does not change the query');
 assert.equal(Nav.verify('https://www.google.com/maps/search/'+encodeURIComponent('مدرسة\u202d')+'/@30,31,941m',arabicTarget).verified,false,'Direction normalization must not accept a different query');
 assert.equal(Nav.searchValue({querySelector:selector=>selector==='input[role="combobox"]'?{value:'مسجد\u202d'}:null}),'مسجد');
 const records=['mosque','church','pharmacy'].map((type,i)=>({id:String(i),name:'Place '+type,x:31+i*.001,y:30,hasExactCoords:true,canonicalId:'google_places:'+type,provider:'osm_overpass',rights:{exportAllowed:true,license:'ODbL-1.0'},category:type}));
 const files=await Export.buildKmzFiles(records,'symbols',null,{language:'en'}),kml=files.find(f=>f.name==='doc.kml').data;
 for(const record of records){const symbol=Symbols.resolve(record),icon=files.find(f=>f.name==='icons/'+symbol.assetKey+'.png');assert.ok(icon);assert.deepEqual(Buffer.from(icon.data),fs.readFileSync(path.join(__dirname,'..',symbol.pngPath)));assert.ok(kml.includes('icons/'+symbol.assetKey+'.png'));assert.ok(kml.includes(symbol.symbolId));}
 console.log(JSON.stringify({status:'passed',displayConcepts:categories.length,symbolEntries:catalog.entries.length,glyphs:new Set(catalog.entries.map(e=>e.glyph)).size,checks:['query-scoped cell colors','early discoveries vs owner survey','canonical concepts vs descriptors','1253 stable local symbol bindings','source-type symbol precedence','map and KMZ identical PNG bytes','URL query and camera verification']}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});

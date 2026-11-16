/* Offline source-language fixtures call the real content parsers/extractors.
 * They are not evidence of live provider wording or coverage in every country. */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const Content=require('../content/content');

const numericCases=[
  ['٤٫٧','rating','ar',4.7],['۴٫۷','rating','fa',4.7],['४.७','rating','hi',4.7],['৪.৭','rating','bn',4.7],
  ['４．７','rating','ja',4.7],['4,7','rating','fr',4.7],['4,7','rating','de',4.7],['4.7','rating','zh',4.7],
  ['١٬٢٣٤','count','ar',1234],['۱٬۲۳۴','count','fa',1234],['१,२३,४५६','count','hi-IN',123456],
  ['১,২৩,৪৫৬','count','bn',123456],['1\u202f234','count','fr',1234],['1\u00a0234','count','fr',1234],
  ['1.234.567','count','de',1234567],['1.234','count','pt-BR',1234],['1,234','count','zh-CN',1234],
  ["1'234",'count','de-CH',1234],['๑,๒๓๔','count','th',1234],['１，２３４','count','zh',1234],
  ['0','count','en',0],['0,0','rating','fr',0],['12,34','count','en',null],['1,234','count','fr',null],
  ['1.234','count','en',null],['1,2K','count','fr',null],['1.2万','count','zh',null],['4,789','rating','de',null],
  ['5.1','rating','en',null],['-1','count','en',null],['9007199254740992','count','en',null],
  ['1234 567','count','fr',null],['4.7 123','rating','en',null]
];
for(const [raw,kind,locale,expected]of numericCases)assert.equal(Content.parseSourceNumber(raw,kind,locale),expected,`${locale} ${kind}: ${raw}`);

const locales=[
  {locale:'ar',rating:'٤٫٧',reviews:'(١٬٢٣٤)',combined:'٤٫٧ نجوم، ١٬٢٣٤ مراجعة',name:'مكتبة النور',category:'مكتبة',hours:'مفتوح · يغلق ٢١:٠٠',website:'الموقع الإلكتروني',phone:'الهاتف',empty:'لم يتم العثور على أي نتائج',end:'وصلت إلى نهاية القائمة',search:'البحث في هذه المنطقة'},
  {locale:'fr',rating:'4,7',reviews:'(1\u202f234)',combined:'4,7 étoiles, 1\u202f234 avis',name:'Café de la Gare',category:'Café',hours:'Ouvert · Ferme à 21:00',website:'Site Web',phone:'Téléphone',empty:'Aucun résultat trouvé',end:'Vous êtes arrivé à la fin de la liste.',search:'Rechercher dans cette zone'},
  {locale:'de',rating:'4,7',reviews:'(1.234)',combined:'4,7 Sterne, 1.234 Bewertungen',name:'Bäckerei Müller',category:'Bäckerei',hours:'Geöffnet · Schließt um 21:00',website:'Webseite',phone:'Telefon',empty:'Keine Ergebnisse gefunden',end:'Sie haben das Ende der Liste erreicht.',search:'In diesem Bereich suchen'},
  {locale:'es',rating:'4,7',reviews:'(1.234)',combined:'4,7 estrellas, 1.234 reseñas',name:'Librería del Sol',category:'Librería',hours:'Abierto · Cierra a las 21:00',website:'Sitio web',phone:'Teléfono',empty:'No se encontraron resultados',end:'Has llegado al final de la lista.',search:'Buscar en esta zona'},
  {locale:'pt-BR',rating:'4,7',reviews:'(1.234)',combined:'4,7 estrelas, 1.234 avaliações',name:'Café São José',category:'Cafeteria',hours:'Aberto · Fecha às 21:00',website:'Website',phone:'Telefone',empty:'Nenhum resultado encontrado',end:'Você chegou ao final da lista.',search:'Pesquisar nesta área'},
  {locale:'zh-CN',rating:'4.7',reviews:'(1,234)',combined:'4.7 星, 1,234 条评价',name:'人民书店',category:'书店',hours:'营业中 · 21:00',website:'网站',phone:'电话',empty:'未找到任何结果',end:'已显示所有结果',search:'搜索此区域'},
  {locale:'ja',rating:'４．７',reviews:'(１，２３４)',combined:'5つ星のうち4.7、1,234 件のクチコミ',name:'さくら書店',category:'書店',hours:'営業中 · 21:00',website:'ウェブサイト',phone:'電話',empty:'検索結果が見つかりませんでした',end:'リストの最後に到達しました',search:'このエリアを検索'},
  {locale:'hi',rating:'४.७',reviews:'(१,२३४)',combined:'४.७ सितारे, १,२३४ समीक्षाएं',name:'भारत पुस्तकालय',category:'पुस्तकालय',hours:'खुला है · २१:००',website:'वेबसाइट',phone:'फ़ोन',empty:'कोई परिणाम नहीं मिला',end:'आप सूची के अंत तक पहुंच गए हैं',search:'इस क्षेत्र में खोजें'}
];
for(const row of locales){
  assert.equal(Content.parseRatingText(row.combined,row.locale),4.7,row.locale+' rating label');
  assert.equal(Content.parseReviewText(row.combined,row.locale),1234,row.locale+' review label');
  assert.equal(Content.matchesSourceSignal(row.empty,'empty'),true,row.locale+' empty wording');
  assert.equal(Content.matchesSourceSignal(row.end,'end'),true,row.locale+' end wording');
  assert.equal(Content.matchesSourceSignal(row.search,'search'),true,row.locale+' search-area wording');
  assert.equal(Content.fieldLabelMatches(row.website,'website'),true,row.locale+' website label');
  assert.equal(Content.fieldLabelMatches(row.phone,'phone'),true,row.locale+' phone label');
  assert.equal(Content.hasHoursText(row.hours),true,row.locale+' hours status');
}
assert.equal(Content.parseReviewText('1.2K reviews','en'),null,'Abbreviations are not exact counts');
assert.equal(Content.parseReviewText('1.2万条评价','zh'),null,'Rounded Chinese units are not exact counts');
assert.equal(Content.hasHoursText('Open University'),false,'A place/category name is not an hours value');
assert.equal(Content.matchesSourceSignal('No reviews yet','empty'),false);
assert.equal(Content.matchesSourceSignal('An article about No results found messages','empty'),false);
assert.equal(Content.matchesSourceSignal('Source is still loading','end'),false);
assert.equal(Content.matchesSourceSignal('未知のソースメッセージ','empty'),false);
assert.equal(Content.matchesSourceSignal('Header\nNo results found for "museum"','empty'),true);
assert.notEqual(Content.generatePlaceId('人民书店',31,30),Content.generatePlaceId('中央医院',31,30),'Different CJK names do not collapse to an empty Latin-only identity');
assert.notEqual(Content.generatePlaceId('さくら書店',0,0),Content.generatePlaceId('さくら書店',null,null),'Unlocated and verified zero geometry have different identities');

function element(text='',attributes={}){
  return {textContent:text,innerText:text,href:attributes.href||'',getAttribute:key=>attributes[key]??null,querySelector:()=>null,querySelectorAll:()=>[],click(){this.clicked=true;}};
}
const source=fs.readFileSync(path.join(__dirname,'../content/content.js'),'utf8');
function fixture(row,{approximate=false,camera=false}={}){
  const name=element(row.name,{'aria-label':row.name});
  const rating=element(row.rating),reviews=element(approximate?'(1.2K)':row.reviews);
  const combined=element('',{'aria-label':approximate?'4.7 stars':row.combined});
  const web=element('',{'aria-label':row.website,href:'https://example.org/localized'});
  const phone=element('+३३ १ २३ ४५ ६७ ८९',{'aria-label':row.phone,'data-tooltip':row.phone});
  const category=element(row.category),status=element(row.hours),address=element('10 Rue de la Gare');
  const blocks=[category,status,element(row.locale==='fr'?'Livraison':'')];
  const href=camera?'https://www.google.com/maps/place/Test/@30.125,31.25,18z':'https://www.google.com/maps/place/Test/data=!3d30.125!4d31.25';
  const card=element();
  const link=element(row.name,{'aria-label':row.name,href});link.closest=()=>card;link.parentElement=card;
  function select(selector){
    if(selector==='span[role="img"]')return combined;
    if(selector==='span.MW4etd'||selector==='div.F7nice span[aria-hidden="true"]')return rating;
    if(selector==='span.UY7F9')return reviews;
    if(selector.startsWith('h1.'))return name;
    if(selector.startsWith('button[jsaction*="category"]'))return category;
    if(selector==='button[data-item-id*="address"]')return address;
    if(selector.includes('ZDu9vd'))return status;
    return null;
  }
  function selectAll(selector){
    if(selector==='a[href]')return [web];
    if(selector==='button, a[href]')return [phone,web];
    if(selector==='button, a, div[aria-label]')return [phone,web];
    if(selector.includes('div.W4Efsd'))return blocks;
    if(selector.includes('a[href*="/maps/place/"]'))return [link];
    return [];
  }
  card.querySelector=select;card.querySelectorAll=selectAll;
  const doc={documentElement:{lang:row.locale},body:element(''),querySelector:select,querySelectorAll:selectAll};
  const context=vm.createContext({console,URL,Intl,Date,Event:class{},setTimeout:callback=>setTimeout(callback,0),clearTimeout,module:{exports:{}},window:{location:{href:href+'?hl=en'}},document:doc});
  vm.runInContext(source,context);return {api:context.module.exports,doc,card,link,web,phone};
}
for(const row of locales){
  const {api,doc,link}=fixture(row);
  assert.equal(api.pageLocale(),Intl.getCanonicalLocales(row.locale)[0],'Actual DOM language has priority over URL fallback');
  const feed={querySelectorAll:()=>[link]};
  const outputs=[api.checkSinglePlace(null),...api.extractPlacesFromFeed(feed,null),...api.extractCardsFromDocument(null)];
  assert.equal(outputs.length,3,row.locale+' all extraction paths');
  for(const record of outputs){
    assert.equal(record.name,row.name,row.locale+' original name is preserved');
    assert.equal(record.rating,'4.7',row.locale+' normalized rating');
    assert.equal(record.reviewsCount,'1234',row.locale+' normalized reviews');
    assert.ok(record.ratingRaw&&record.reviewsCountRaw,row.locale+' raw numeric evidence');
    assert.equal(record.sourceLocale,Intl.getCanonicalLocales(row.locale)[0]);
    assert.equal(record.website,'https://example.org/localized',row.locale+' localized website button');
    assert.equal(record.phone,'+33 1 23 45 67 89',row.locale+' phone digits');
    assert.equal(record.phoneRaw,'+३३ १ २३ ४५ ६७ ८९',row.locale+' raw phone evidence');
    assert.equal(record.category,row.category,row.locale+' original category');
    assert.equal(record.status,row.hours,row.locale+' raw status');
    assert.equal(record.x,31.25);assert.equal(record.y,30.125);assert.equal(record.hasExactCoords,true);
    if(row.locale==='fr')assert.equal(record.name_en,'','French text is not invented as an English alternate name');
  }
  doc.querySelector=()=>null;doc.querySelectorAll=()=>[];doc.body.innerText=row.empty;
  assert.equal(api.hasExplicitNoResults(),true);
  doc.body.innerText='Unknown/loading message';assert.equal(api.hasExplicitNoResults(),false);
  doc.body.innerText=row.empty;doc.querySelectorAll=()=>[link];assert.equal(api.hasExplicitNoResults(),false,'Cards prevent a verified empty classification');
  const button=element(row.search);doc.querySelectorAll=()=>[button];assert.equal(api.clickSearchThisAreaIfPresent(),true);assert.equal(button.clicked,true);
  button.clicked=false;assert.equal(api.clickSearchThisAreaIfPresent(),false);assert.equal(button.clicked,false,'A task never refreshes the search area repeatedly');
  doc.body.innerText='تظهر لك طريقة عرض محدودة من خرائط Google';assert.equal(api.hasLimitedView(),true);
  doc.body.innerText="You're seeing a limited view of Google Maps";assert.equal(api.hasLimitedView(),true);
  doc.body.innerText=row.name;assert.equal(api.hasLimitedView(),false);
}
const approximate=fixture(locales[1],{approximate:true}).api.extractPlacesFromFeed({querySelectorAll(){return [];}});
assert.deepEqual(Array.from(approximate),[]);
const approxFixture=fixture(locales[1],{approximate:true});
const approx=approxFixture.api.extractPlacesFromFeed({querySelectorAll:()=>[approxFixture.link]},null)[0];
assert.equal(approx.reviewsCount,'');assert.equal(approx.reviewsCountRaw,'(1.2K)');assert.equal(approx.reviewsCountApproximate,true);
const cameraFixture=fixture(locales[6],{camera:true});
const unlocated=cameraFixture.api.extractPlacesFromFeed({querySelectorAll:()=>[cameraFixture.link]},null)[0];
assert.equal(unlocated.hasExactCoords,false);assert.equal(unlocated.x,null);assert.equal(unlocated.y,null);
cameraFixture.card.getAttribute=key=>key==='data-url'?'https://www.google.com/maps/place/Test/data=!3d30.125!4d31.25':null;
const upgraded=cameraFixture.api.extractPlacesFromFeed({querySelectorAll:()=>[cameraFixture.link]},null)[0];
assert.equal(upgraded.hasExactCoords,true,'A camera URL must not prevent checking an exact card data-url');
assert.equal(upgraded.x,31.25);assert.equal(upgraded.y,30.125);
const malformedRating=element('Not provided');
const malformedMetrics=Content.extractRatingMetrics({querySelector:selector=>selector==='span.MW4etd'?malformedRating:null,querySelectorAll:()=>[]});
assert.equal(malformedMetrics.rating,'');assert.equal(malformedMetrics.ratingRaw,'Not provided','Unparseable observed numbers retain source evidence without inventing a value');
const branches=fixture(locales[6]);
const secondBranch=element(locales[6].name,{'aria-label':locales[6].name,href:'https://www.google.com/maps/place/Test/data=!3d35.2!4d139.2'});
secondBranch.closest=()=>branches.card;secondBranch.parentElement=branches.card;
branches.doc.querySelectorAll=selector=>selector.includes('a[href*="/maps/place/"]')?[branches.link,secondBranch,branches.link]:[];
assert.equal(branches.api.extractCardsFromDocument(null).length,2,'Same-name branches at different coordinates remain distinct; exact duplicate links merge');
const firstId=element(locales[6].name,{'aria-label':locales[6].name,href:'https://www.google.com/maps/place/Test/data=!1s0xabc:0x111!3d30.125!4d31.25'});
const secondId=element(locales[6].name,{'aria-label':locales[6].name,href:'https://www.google.com/maps/place/Test/data=!1s0xabc:0x222!3d30.125!4d31.25'});
for(const link of [firstId,secondId]){link.closest=()=>branches.card;link.parentElement=branches.card;}
branches.doc.querySelectorAll=selector=>selector.includes('a[href*="/maps/place/"]')?[firstId,secondId]:[];
assert.equal(branches.api.extractCardsFromDocument(null).length,2,'Distinct source IDs at the same location are not merged');

async function checkScroll(row,insidePlace=false,unknown=false){
  const {api,doc,card}=fixture(row);
  const marker=element(unknown?'Unrecognized source wording':row.end);marker.closest=()=>insidePlace?card:null;
  doc.querySelector=()=>null;doc.querySelectorAll=()=>[];
  const feed={scrollHeight:100,scrollTop:0,dispatchEvent(){},querySelector:()=>marker,querySelectorAll:selector=>selector.startsWith('span.HlvSq')?[marker]:[]};
  return api.smartAutoScrollFeed(feed,120,0,null,()=>1);
}
Promise.all(locales.map(async row=>assert.equal(await checkScroll(row),'complete',row.locale+' translated feed end marker')))
  .then(async()=>{
    assert.equal(await checkScroll(locales[1],true),'partial','End wording inside a place card cannot prove feed completion');
    assert.equal(await checkScroll(locales[1],false,true),'partial','Unrecognized wording stays partial');
    console.log(`PASS multilingual source parsing: ${numericCases.length} numeric cases; ${locales.length} locales through single/feed/fallback extraction, raw evidence, conservative empty/end signals, distinct branches, and unverified camera coordinates`);
  }).catch(error=>{console.error(error);process.exitCode=1;});

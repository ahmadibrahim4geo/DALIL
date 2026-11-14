/* Local GIS symbol registry. Maki 8.2.0 glyphs are CC0; see assets/symbols/manifest.json. */
(function (root) {
  'use strict';
  const types = {
    mosque: 'religious-muslim', church: 'religious-christian', synagogue: 'religious-jewish', buddhist_temple:'religious-buddhist', hindu_temple: 'place-of-worship', shinto_shrine:'place-of-worship', place_of_worship: 'place-of-worship',
    restaurant: 'restaurant', cafe: 'cafe', coffee_shop: 'cafe', bakery: 'bakery', fast_food_restaurant: 'fast-food', grocery_store: 'grocery', supermarket: 'grocery', convenience_store: 'grocery',
    store: 'shop', shopping_mall: 'shop', bank: 'bank', atm: 'bank', hospital: 'hospital', pharmacy: 'pharmacy', doctor: 'doctor', dentist: 'doctor',
    school: 'school', primary_school: 'school', secondary_school: 'school', university: 'college', library: 'library', museum: 'museum', art_gallery: 'museum',
    hotel: 'lodging', lodging: 'lodging', police: 'police', fire_station: 'fire-station', city_hall: 'town-hall', local_government_office: 'town-hall', embassy: 'embassy', post_office: 'post',
    airport: 'airport', bus_station: 'bus', bus_stop: 'bus', train_station: 'rail', subway_station: 'rail', transit_station: 'bus', ferry_terminal: 'harbor', marina: 'harbor', taxi_stand: 'taxi',
    gas_station: 'fuel', car_dealer: 'car', car_rental: 'car', car_repair: 'car-repair', car_wash: 'car-repair', parking: 'parking',parking_garage:'parking',parking_lot:'parking', warehouse_store: 'warehouse',
    farm: 'farm', park: 'park', national_park: 'park', hiking_area: 'mountain', beach: 'beach', public_bathroom: 'toilet', tourist_information_center: 'information',
    playground: 'playground', gym: 'fitness-centre', fitness_center: 'fitness-centre', stadium: 'stadium', swimming_pool: 'swimming', movie_theater: 'cinema', performing_arts_theater: 'theatre',
    hair_care: 'hairdresser', hair_salon: 'hairdresser', beauty_salon: 'hairdresser', clothing_store: 'clothing-store', cell_phone_store: 'mobile-phone'
  };
  const legacyIcons = { mosque: 'religious-muslim', churches: 'religious-christian', synagogue: 'religious-jewish', dining: 'restaurant', coffee: 'cafe', hospitals: 'hospital', pharmacy_rx: 'pharmacy', schools: 'school', universities: 'college', library: 'library', museums: 'museum', lodging: 'lodging', police: 'police', firedept: 'fire-station', airports: 'airport', bus: 'bus', rail: 'rail', ferry: 'harbor', gas_stations: 'fuel', parking_lot: 'parking', shopping: 'shop', grocery: 'grocery', banks: 'bank', dollar: 'bank', factories: 'industry', industrial: 'industry', parks: 'park', mountains: 'mountain', water: 'water', swimming: 'swimming', movies: 'cinema', info: 'information', info_circle: 'information', placemark_circle: 'marker' };
  const families = { S01: 'place-of-worship', S02: 'restaurant', S03: 'shop', S04: 'lodging', S05: 'home', S06: 'commercial', S07: 'industry', S08: 'school', S09: 'hospital', S10: 'town-hall', S11: 'police', S12: 'bank', S13: 'bus', S14: 'car', S15: 'industry', S16: 'water', S17: 'recycling', S18: 'communications-tower', S19: 'information', S20: 'theatre', S21: 'museum', S22: 'playground', S23: 'stadium', S24: 'park', S25: 'natural', S26: 'farm', S27: 'construction', S28: 'warehouse', S29: 'commercial', S30: 'cemetery', S31: 'marker' };
  const cache = new Map();
  const visualStyles=new Map();
  const providerFamilies={'Automotive':'car','Business':'commercial','Culture':'museum','Education':'school','Entertainment and Recreation':'theatre','Facilities':'information','Finance':'bank','Food and Drink':'restaurant','Geographical Areas':'natural','Government':'town-hall','Health and Wellness':'hospital','Housing':'home','Lodging':'lodging','Natural Features':'natural','Places of Worship':'place-of-worship','Services':'commercial','Shopping':'shop','Sports':'stadium','Transportation':'bus','Additional types':'marker'};
  const conceptGlyphs={'dalil:prayer_room':'place-of-worship','dalil:drug_warehouse':'warehouse','dalil:elderly_care_home':'home','dalil:S13.B05.L01':'parking','dalil:S14.B03.L04':'parking'};
  const shapeOverrides={'dalil.google-places-doctor':'circle','dalil.google-places-dentist':'diamond','dalil.google-places-bank':'circle','dalil.google-places-atm':'rounded-square','dalil.google-places-cafe':'circle','dalil.google-places-coffee-shop':'hexagon'};
  const shapes=['circle','rounded-square','diamond','hexagon','pentagon','shield','pin','square'];
  const hash=value=>{let h=2166136261;for(const ch of value){h^=ch.codePointAt(0);h=Math.imul(h,16777619);}return h>>>0;};
  function hsl(h,s,l){s/=100;l/=100;const a=s*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12;return Math.round(255*(l-a*Math.max(-1,Math.min(k-3,9-k,1))));};return '#'+[f(0),f(8),f(4)].map(v=>v.toString(16).padStart(2,'0')).join('');}
  function foreground(hex){const rgb=hex.slice(1).match(/../g).map(s=>{const v=parseInt(s,16)/255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});const lum=rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;return 1.05/(lum+.05)>=(lum+.05)/.05?'#ffffff':'#101820';}
  function initializeStyles(){
    if(visualStyles.size)return;
    const taxonomy=engine();
    const ids=['dalil.unclassified',...(taxonomy?.registry?.getCategories?.()||[]).map(c=>c.symbolId)];
    for(const sector of taxonomy?.getSectors?.()||[])for(const scope of [sector,...sector.branches])ids.push('dalil.scope-'+scope.id.toLowerCase().replaceAll('.','-'));
    const reserved={'dalil.google-places-mosque':{color:'#087f5b',shape:'circle'},'dalil.dalil-prayer-room':{color:'#1c5ed6',shape:'rounded-square'},'dalil.unclassified':{color:'#536171',shape:'diamond'}};
    const used=new Set(Object.values(reserved).map(v=>v.color));
    for(const id of [...new Set(ids)].sort()){
      const h=hash(id);let color=reserved[id]?.color;
      if(!color){let attempt=0;do{color=hsl(((h%36000)/100+attempt*137.508)%360,57+((h>>>10)%24),28+((h>>>20)%15));attempt++;}while(used.has(color));used.add(color);}
      visualStyles.set(id,Object.freeze({color,foreground:foreground(color),shape:reserved[id]?.shape||shapeOverrides[id]||(id.startsWith('dalil.scope-')?(id.includes('-b')?'hexagon':'shield'):shapes[h%shapes.length])}));
    }
  }
  let engineRef;
  function engine() {
    if (typeof TaxonomyEngine !== 'undefined') return TaxonomyEngine;
    if (root.TaxonomyEngine) return root.TaxonomyEngine;
    if (!engineRef && typeof require === 'function') { try { engineRef = require('../lib/taxonomy-engine.js').TaxonomyEngine; } catch (_) {} }
    return engineRef;
  }
  function resolve(value) {
    const item=typeof value==='string'?{categoryId:value,category:value}:(value||{});
    const taxonomy=engine(),categoryId=item.canonicalId||item.categoryId||(item.categoryIds||[])[0]||'';
    const scope=/^S\d{2}(?:\.B\d{2})?$/.test(categoryId)?categoryId:null;
    const sourceTerm=item.sourceCategory||item.category||'';
    const explicitType=taxonomy?.getCategory?.('google_places:'+item.googlePlaceType);
    let concept=explicitType||taxonomy?.getCategory?.(categoryId)||taxonomy?.resolveConcept?.(categoryId)||null;
    let origin=explicitType?'google_place_type':concept?'canonical_id':null;
    if(!concept&&sourceTerm){concept=taxonomy?.resolveConcept?.(sourceTerm)||null;if(concept)origin='source_category';}
    if(!concept&&!scope){concept=taxonomy?.getCategory?.(item.queryCategoryId)||taxonomy?.resolveConcept?.(item.searchKeyword||'')||null;if(concept)origin='query_hint';}
    if(scope?.includes('.B')){concept=taxonomy?.getDisplayCategories?.(scope)?.[0]||null;origin='branch';}
    const term=concept?.labels.en||sourceTerm||item.searchKeyword||'';
    const style=taxonomy?.resolveCategoryStyle?.(scope?.split('.')[0]||term)||{};
    const officialType=item.googlePlaceType||concept?.googlePlaceType||'';
    const family=scope?.split('.')[0]||concept?.groupId||item.sectorId||style.sectorId||'S31';
    const canonicalId=scope||concept?.canonicalId||'dalil:unclassified';
    const key=canonicalId+'|'+officialType+'|'+family+'|'+origin;
    if(cache.has(key))return cache.get(key);
    const legacyGlyph=legacyIcons[style.icon]==='marker'?null:legacyIcons[style.icon];
    const glyph=scope&&!scope.includes('.B')?(families[family]||'marker'):(types[officialType]||conceptGlyphs[canonicalId]||legacyGlyph||families[concept?.groupId]||providerFamilies[concept?.providerGroup]||families[family]||'marker');
    const symbolId=scope?'dalil.scope-'+scope.toLowerCase().replaceAll('.','-'):concept?.symbolId||'dalil.unclassified';
    initializeStyles();const visual=visualStyles.get(symbolId)||visualStyles.get('dalil.unclassified');
    const assetKey=symbolId.replace(/[^a-z0-9-]/g,'-');
    const result=Object.freeze({symbolId,canonicalId,glyph,assetKey,svgPath:'assets/symbols/variants/'+assetKey+'.svg',pngPath:'assets/symbols/variants/'+assetKey+'.png',...visual,
      match:types[officialType]?'type':scope?'scope':conceptGlyphs[canonicalId]||legacyGlyph?'concept':'family',resolutionOrigin:origin||'family',license:'CC0-1.0'});
    if(cache.size>=4096)cache.clear();cache.set(key,result);return result;
  }
  const api = { resolve, typeGlyphs: Object.freeze(types), clearCache() { cache.clear();visualStyles.clear(); }, assetUrl(path) { return root.chrome?.runtime?.getURL ? root.chrome.runtime.getURL(path) : '../' + path; } };
  root.DalilSymbology = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

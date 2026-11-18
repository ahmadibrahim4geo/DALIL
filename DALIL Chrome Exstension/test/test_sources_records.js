const assert=require('assert');
const {performance}=require('perf_hooks');
const Sources=require('../core/source-adapters');
require('../lib/taxonomy-engine');
const Records=require('../core/records');
const round=value=>JSON.parse(JSON.stringify(value));
const bounds={minLng:30,maxLng:32,minLat:29,maxLat:31};
const task={identity:{jobId:'j',queryId:'q',cellId:'c',areaVersion:1},query:'mosque',cell:{bounds},locale:'en'};
const mockResponse=data=>({ok:true,status:200,headers:{get:()=>null},text:async()=>JSON.stringify(data)});
(async()=>{
  assert.ok(Sources.buildOverpassQuery('مساجد',bounds).text.includes('["religion"="muslim"]'));
  const german=Sources.buildOverpassQuery('Apotheke',bounds,5000,['google_places:pharmacy']);
  assert.strictEqual(german.coverageMode,'tag_mapping');assert.ok(german.text.includes('["amenity"="pharmacy"]'),'Canonical identity preserves tags across search languages');
  assert.strictEqual(Sources.buildOverpassQuery('shared word',bounds,5000,['google_places:pharmacy','google_places:mosque']).coverageMode,'name_only','Incompatible concepts must not invent a shared tag');
  assert.ok(Sources.buildOverpassQuery('panadería',bounds).text.includes('name:[a-zA-Z0-9-]+'),'Regional tags such as name:es-419 are searchable');
  const injection=Sources.buildOverpassQuery('x");out;["name"~".*',bounds);
  assert.strictEqual(injection.coverageMode,'name_only');
  assert.throws(()=>Sources.buildOverpassQuery('x',{...bounds,minLng:181}));
  const sample=Sources.fromOsmElement({type:'node',id:5,lon:0,lat:0,tags:{name:'مسجد',amenity:'place_of_worship',email:'public@example.org'}},'en');
  assert.strictEqual(sample.x,0);assert.strictEqual(sample.hasExactCoords,true);assert.strictEqual(sample.email,'public@example.org');assert.strictEqual(sample.rating,undefined);
  const way=Sources.fromOsmElement({type:'way',id:6,center:{lat:30,lon:31},tags:{name:'Building'}});
  assert.strictEqual(way.x,null);assert.strictEqual(way.hasExactCoords,false);
  // Full metadata: contact tags, hours, subcategory, structured address and accessibility.
  const rich=Sources.fromOsmElement({type:'node',id:7,lon:31.24,lat:30.04,tags:{name:'صيدلية النور','name:en':'Al Noor Pharmacy',
    amenity:'pharmacy','contact:phone':'+2022345678','contact:email':'info@example.com',opening_hours:'Mo-Sa 09:00-22:00',
    'addr:housenumber':'12','addr:street':'شارع طلعت حرب','addr:city':'القاهرة',brand:'Noor',operator:'Noor Group',
    cuisine:'mediterranean',wheelchair:'yes',delivery:'yes',takeaway:'yes',wikidata:'Q1',wikipedia:'ar:صيدلية',ref:'PH-7'}},'ar');
  assert.strictEqual(rich.phone,'+2022345678');assert.strictEqual(rich.email,'info@example.com');
  assert.strictEqual(rich.contact.phone,'+2022345678');assert.strictEqual(rich.contact.email,'info@example.com');
  assert.strictEqual(rich.opening_hours,'Mo-Sa 09:00-22:00');assert.strictEqual(rich.subcategory,'pharmacy');
  assert.strictEqual(rich.address,'12, شارع طلعت حرب, القاهرة');assert.strictEqual(rich.addressParts.city,'القاهرة');
  assert.strictEqual(rich.business_status,'');assert.strictEqual(rich.wheelchair,'yes');assert.strictEqual(rich.cuisine,'mediterranean');
  assert.strictEqual(rich.delivery,'yes');assert.strictEqual(rich.takeaway,'yes');assert.strictEqual(rich.wikidata,'Q1');
  assert.strictEqual(rich.wikipedia,'ar:صيدلية');assert.strictEqual(rich.ref,'PH-7');
  const richNormalized=Records.normalize(rich,{provider:'osm_overpass',exportAllowed:true,license:'ODbL-1.0',cellId:'c',queryId:'q'});
  assert.strictEqual(richNormalized.fieldProvenance.opening_hours.state,'provided');
  assert.strictEqual(richNormalized.fieldProvenance.wheelchair.state,'provided');
  assert.strictEqual(richNormalized.fieldProvenance.description.state,'not_provided');
  const normalized=Records.normalize(sample,{provider:'osm_overpass',exportAllowed:true,license:'ODbL-1.0',cellId:'c',queryId:'q'});
  assert.strictEqual(normalized.fieldProvenance.rating.state,'not_provided');assert.strictEqual(normalized.fieldProvenance.email.state,'provided');assert.deepStrictEqual(normalized.geometry.coordinates,[0,0]);
  const camera=Records.normalize({name:'camera',x:31,y:30,hasExactCoords:false});assert.strictEqual(camera.geometry,null);assert.strictEqual(camera.x,null);
  const received=await Sources.collectOverpass(task,{fetch:async()=>mockResponse({elements:[]})});assert.strictEqual(received.evidence.emptyVerified,true);
  const partial=await Sources.collectOverpass(task,{fetch:async()=>mockResponse({elements:[],remark:'runtime timeout'})});assert.strictEqual(partial.completenessStatus,'partial');assert.strictEqual(partial.evidence.emptyVerified,false);
  await assert.rejects(()=>Sources.collectOverpass(task,{fetch:async()=>({status:429,headers:{get:()=> '120'}})}),e=>e.code==='RATE_LIMITED' && e.retryAfterMs===120000);
  await assert.rejects(()=>Sources.collectOverpass(task,{fetch:async()=>({status:406,headers:{get:()=>null}})}),e=>e.code==='RATE_LIMITED' && e.blocked===true);
  await assert.rejects(()=>Sources.collectOverpass(task,{fetch:async()=>({status:403})}),e=>e.code==='SOURCE_BLOCKED');
  const list=[Records.normalize({id:'1',place_id:'branch1',name:'Cafe',x:31,y:30,hasExactCoords:true},{provider:'osm_overpass'})];
  const index=new Records.RecordIndex(list);
  assert.strictEqual(index.find(Records.normalize({id:'2',place_id:'branch2',name:'Cafe',x:31,y:30,hasExactCoords:true},{provider:'osm_overpass'})),-1);
  assert.strictEqual(index.find({...list[0],id:'different',name:'مقهى'}),0);
  assert.strictEqual(index.find({...list[0],provider:'other'}),-1);
  const venueA={provider:'osm_overpass',id:'a',name:'Mall',x:31,y:30,hasExactCoords:true,address:'1 First St'};
  const venueB={provider:'osm_overpass',id:'b',name:'Mall',x:31,y:30,hasExactCoords:true,address:'99 Second St'};
  assert.strictEqual(new Records.RecordIndex([venueA]).find(venueB),-1,'Conflicting addresses must not merge distinct venues');
  assert.strictEqual(new Records.RecordIndex([venueA]).find({...venueB,address:'1 First St'}),0,'Identical address at the same point still merges');
  assert.strictEqual(new Records.RecordIndex([{...venueA,address:''}]).find({...venueB,address:'',phone:'+201000000001'}),0,'Absent identity fields never block a merge');
  assert.strictEqual(new Records.RecordIndex([{...venueA,address:'',phone:'+201000000001'}]).find({...venueB,address:'',phone:'+201000000002'}),-1,'Conflicting phones must not merge distinct venues');
  const ResultStore=require('../core/result-store');
  assert.strictEqual(ResultStore.available(),false,'Node has no IndexedDB; the store must report unavailable instead of failing');
  assert.strictEqual(await ResultStore.save([sample]),false);
  assert.strictEqual(await ResultStore.load(),null);
  const merged=Records.merge(list[0],{...list[0],discoveryCellIds:['two'],phone:'+20123456789',fieldProvenance:{phone:{provider:'osm_overpass',state:'provided'}}});
  assert.ok(merged.discoveryCellIds.includes('two'));assert.strictEqual(merged.fieldProvenance.phone.state,'provided');
  const first={...list[0],reviewsCount:0,names:{name:'Cafe'},attributes:[{key:'amenity',value:'cafe',provider:'osm_overpass'}],fieldProvenance:{reviewsCount:{sourceUrl:'old'}}};
  const next={...list[0],reviewsCount:5,names:{'name:ar':'مقهى'},attributes:[{key:'wheelchair',value:'yes',provider:'osm_overpass'}],fieldProvenance:{reviewsCount:{sourceUrl:'new'}}};
  const expanded=Records.merge(first,next);assert.strictEqual(expanded.names['name:ar'],'مقهى');assert.strictEqual(expanded.attributes.length,2);assert.strictEqual(expanded.reviewsCount,0);assert.strictEqual(expanded.fieldProvenance.reviewsCount.sourceUrl,'old');assert.strictEqual(expanded.fieldObservations[0].value,5);
  const upgraded=Records.merge(Records.normalize({id:'u',name:'Pending',hasExactCoords:false}),Records.normalize({id:'u',name:'Pending',hasExactCoords:true,x:0,y:0}));
  assert.strictEqual(upgraded.record_status,'verified');assert.ok(!upgraded.qualityFlags.includes('unlocated'));
  const measurements=[];
  for(const count of [10000,50000,100000]){
    const records=[];const start=performance.now();const indexed=new Records.RecordIndex(records);
    for(let i=0;i<count;i++){const r={provider:'fixture',id:String(i),place_id:String(i),name:`Place ${i}`,x:(i%1000)/100,y:Math.floor(i/1000)/100,hasExactCoords:true};assert.strictEqual(indexed.find(r),-1);records.push(r);indexed.add(r,i);}
    for(let i=0;i<count;i+=997)assert.strictEqual(indexed.find(records[i]),i);
    measurements.push({records:count,milliseconds:Number((performance.now()-start).toFixed(2))});
  }
  console.log('PASS source queries, bounded responses, rate limits, field provenance, identity separation, unlocated/zero coordinates');
  console.log(JSON.stringify({benchmark:'indexed_insert_and_lookup_offline',measurements}));
})().catch(e=>{console.error(e);process.exitCode=1;});

/* Executes the real service worker and real modules in an isolated Chrome API harness. */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root=path.resolve(__dirname,'..');
const clone=value=>value==null?value:JSON.parse(JSON.stringify(value));
const settle=async()=>{for(let i=0;i<14;i++)await new Promise(resolve=>setImmediate(resolve));};
function createHarness(saved={}){
  const storage=clone(saved),timers=new Map(),alarms=new Map(),writes=[],messages=[];
  let listener,alarmListener,timerId=0;
  let currentTime=Date.now();
  class ClockDate extends Date {constructor(...args){super(...(args.length?args:[currentTime]));}static now(){return currentTime;}}
  let context;
  const chrome={
    runtime:{id:'dalil-test',lastError:null,getURL:p=>`chrome-extension://dalil-test/${p}`,
      onMessage:{addListener:fn=>listener=fn},onConnect:{addListener:()=>{}},sendMessage:async m=>{messages.push(clone(m));}},
    storage:{local:{get:(keys,callback)=>{
      const result={};for(const key of typeof keys==='string'?[keys]:keys||Object.keys(storage))if(key in storage)result[key]=clone(storage[key]);
      if(callback){queueMicrotask(()=>callback(result));return;}return Promise.resolve(result);
    },set:async values=>{Object.assign(storage,clone(values));writes.push(clone(values));}}},
    alarms:{create:(name,info)=>alarms.set(name,info),clear:async name=>alarms.delete(name),onAlarm:{addListener:fn=>alarmListener=fn}},
    action:{onClicked:{addListener:()=>{}}},
    tabs:{remove:async()=>{},sendMessage:async()=>({success:true}),get:async id=>({id,status:'complete',url:'https://www.google.com/maps/'}),
      create:async()=>({id:10}),update:async()=>{},query:async()=>[],onUpdated:{addListener:()=>{},removeListener:()=>{}}},
    windows:{update:async()=>{}},scripting:{executeScript:async()=>{}}
  };
  context=vm.createContext({console,URL,URLSearchParams,TextEncoder,TextDecoder,AbortController,Date:ClockDate,Set,Map,Uint8Array,ArrayBuffer,DataView,Blob,
    chrome,setTimeout:(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clearTimeout:id=>timers.delete(id)});
  context.importScripts=(...files)=>files.forEach(file=>vm.runInContext(fs.readFileSync(path.resolve(root,'background',file),'utf8'),context,{filename:file}));
  vm.runInContext(fs.readFileSync(path.join(root,'background/background.js'),'utf8'),context,{filename:'background.js'});
  vm.runInContext('globalThis.testApi={state:()=>scraperState,ready:stateReady,processQueue,navigateTabAndWait,resetScraper,buildMapsSearchUrl,processing:()=>isProcessingQueue};',context);
  const api=context.testApi;
  const command=async request=>{await api.ready;const response=await new Promise(resolve=>listener(request,{id:'dalil-test',url:'chrome-extension://dalil-test/dashboard/dashboard.html'},resolve));await settle();return response;};
  const runQueueTimer=async()=>{
    const pair=[...timers].find(([,value])=>value.ms>=0);
    if(pair){timers.delete(pair[0]);currentTime+=pair[1].ms;pair[1].fn();await settle();}
  };
  return {context,api,storage,writes,messages,timers,alarms,command,runQueueTimer,get alarmListener(){return alarmListener;}};
}
const bounds={minLng:30,maxLng:32,minLat:29,maxLat:31};
const cell=(id='c1',b=bounds)=>({id,name:id,bounds:b,centerLng:(b.minLng+b.maxLng)/2,centerLat:(b.minLat+b.maxLat)/2});
const area={id:'study',geometry:{type:'Polygon',coordinates:[[[30,29],[32,29],[32,31],[30,31],[30,29]]]},bounds};
const config={provider:'osm_overpass',query:'mosque',queriesToRun:['mosque'],bilingualEnabled:false,customCells:[cell()],studyArea:area,searchLocale:'en'};
const result=(identity,items=[],status='confirmed_empty',evidence={emptyVerified:true})=>({success:true,items,task:identity,completenessStatus:status,evidence});
let passed=0;
async function test(name,fn){await fn();passed++;console.log(`PASS ${name}`);}
(async()=>{
  await test('real queue finishes a one-cell task with persisted evidence',async()=>{
    const h=createHarness();h.context.SourceAdapters.collectOverpass=async task=>result(task.identity);
    assert.strictEqual((await h.command({action:'START_SCRAPING',config})).success,true);
    assert.strictEqual(h.api.state().status,'completed');
    assert.strictEqual(h.storage.scraperState.cells[0].statusByQuery.Q1.status,'confirmed_empty');
    assert.strictEqual(h.api.state().stats.currentStep,1);
  });
  await test('late stop response cannot insert records, advance or complete the cancelled job',async()=>{
    const h=createHarness();let release;h.context.SourceAdapters.collectOverpass=task=>new Promise(resolve=>release=()=>resolve(result(task.identity,[{id:'p',name:'late',x:31,y:30,hasExactCoords:true}],'complete')));
    await h.command({action:'START_SCRAPING',config});assert.ok(release);
    await h.command({action:'STOP_SCRAPING'});release();await settle();
    assert.strictEqual(h.api.state().status,'stopped');assert.strictEqual(h.api.state().results.length,0);assert.strictEqual(h.api.state().currentIndex,0);
  });
  await test('pause/resume while a cancelled request unwinds runs a fresh checkpoint once',async()=>{
    const h=createHarness();let release,calls=0;h.context.SourceAdapters.collectOverpass=task=>{calls++;if(calls===1)return new Promise(resolve=>release=()=>resolve(result(task.identity)));return Promise.resolve(result(task.identity));};
    await h.command({action:'START_SCRAPING',config});await h.command({action:'PAUSE_SCRAPING'});await h.command({action:'RESUME_SCRAPING'});
    release();await settle();await h.runQueueTimer();await h.runQueueTimer();await settle();
    assert.strictEqual(h.api.state().status,'completed');assert.strictEqual(calls,2);
  });
  await test('stale task identity is an error, never a verified empty cell',async()=>{
    const h=createHarness();h.context.SourceAdapters.collectOverpass=async task=>result({...task.identity,cellId:'old-cell'});
    await h.command({action:'START_SCRAPING',config});
    assert.strictEqual(h.api.state().cells[0].status,'error');assert.strictEqual(h.api.state().results.length,0);
    assert.strictEqual(h.api.state().lastError.code,'STALE_TASK_RESPONSE');
  });
  await test('unknown DOM/source emptiness stays unknown',async()=>{
    const h=createHarness();h.context.SourceAdapters.collectOverpass=async task=>result(task.identity,[],'confirmed_empty',{});
    await h.command({action:'START_SCRAPING',config});assert.strictEqual(h.api.state().cells[0].status,'unknown');
  });
  await test('rate limiting pauses same task, records cooldown and prevents immediate resume',async()=>{
    const h=createHarness();h.context.SourceAdapters.collectOverpass=async()=>{throw new h.context.SourceAdapters.SourceError('RATE_LIMITED','wait',{blocked:true,retryAfterMs:60000});};
    await h.command({action:'START_SCRAPING',config});assert.strictEqual(h.api.state().status,'paused');assert.strictEqual(h.api.state().currentIndex,0);
    assert.strictEqual((await h.command({action:'RESUME_SCRAPING'})).errorCode,'SOURCE_COOLDOWN');
    assert.strictEqual((await h.command({action:'SET_ACTIVE_GRID',customCells:[cell('replacement')]})).errorCode,'WORKSPACE_LOCKED');
  });
  await test('pause/resume cannot bypass the persisted minimum source request interval',async()=>{
    const h=createHarness();let calls=0;h.context.SourceAdapters.collectOverpass=async task=>{calls++;return result(task.identity);};
    await h.command({action:'START_SCRAPING',config:{...config,customCells:[cell('one'),cell('two')]}});
    assert.strictEqual(calls,1);await h.command({action:'PAUSE_SCRAPING'});await h.command({action:'RESUME_SCRAPING'});
    assert.strictEqual(calls,1);assert.ok([...h.timers.values()].some(t=>t.ms>=5000));
    await h.runQueueTimer();assert.strictEqual(calls,2);assert.strictEqual(h.api.state().status,'completed');
  });
  await test('actual ownership, zero coordinates and unlocated records never use discovery-cell fallback',async()=>{
    const h=createHarness();const cells=[cell('left',{minLng:30,maxLng:31,minLat:29,maxLat:31}),cell('right',{minLng:31,maxLng:32,minLat:29,maxLat:31})];
    h.context.SourceAdapters.collectOverpass=async task=>result(task.identity,[{id:'right-place',name:'R',x:31.5,y:30,hasExactCoords:true},{id:'pending',name:'P',x:null,y:null,hasExactCoords:false},{id:'outside',name:'O',x:33,y:30,hasExactCoords:true}],'partial');
    await h.command({action:'START_SCRAPING',config:{...config,customCells:cells}});
    const records=h.api.state().results;assert.strictEqual(records.length,2,JSON.stringify(h.api.state().lastError));assert.strictEqual(records[0].ownerCellId,'right');assert.strictEqual(records[1].ownerCellId,null);
    assert.strictEqual(h.api.state().cells[0].itemsFound,0);assert.strictEqual(h.api.state().cells[1].itemsFound,1);
    assert.strictEqual(h.api.state().cells[0].status,'partial');
    await h.command({action:'STOP_SCRAPING'});
  });
  await test('worker restart restores pending checkpoint as paused and blocks grid changes even without active loop',async()=>{
    const h=createHarness({scraperState:{status:'running',jobId:'old',config,results:[],cells:[{...cell(),status:'processing'}],currentIndex:0,currentQueryIndex:0,seenIds:[],stats:{itemsFound:0,totalCells:1,duplicatesSkipped:0}}});
    await h.api.ready;assert.strictEqual(h.api.state().status,'paused');assert.strictEqual(h.api.state().pauseReason,'worker_restarted');
    assert.strictEqual((await h.command({action:'SET_ACTIVE_GRID',customCells:[cell('new')]})).success,false);
    await h.command({action:'RESUME_SCRAPING'});await h.command({action:'STOP_SCRAPING'});
  });
  await test('workspace removal and reset commit explicit empty keys and do not resurrect on reopen',async()=>{
    const h=createHarness();const workspace={schemaVersion:1,revision:0,importedStudyArea:area,drawnStudyArea:null,activeAreaId:'study',cells:[cell()]};
    assert.strictEqual((await h.command({action:'WORKSPACE_ACTION',operation:'SAVE_WORKSPACE',workspace})).success,true);
    await h.command({action:'WORKSPACE_ACTION',operation:'REMOVE_IMPORTED'});
    assert.strictEqual(h.storage.savedStudyArea,null);assert.strictEqual(h.storage.savedCells.length,0);
    const reopened=createHarness(h.storage);await reopened.api.ready;assert.strictEqual((await reopened.command({action:'GET_WORKSPACE'})).workspace.activeAreaId,null);
    await reopened.command({action:'WORKSPACE_ACTION',operation:'RESET_WORKSPACE'});assert.strictEqual(reopened.storage.scraperState.results.length,0);
  });
  await test('failed workspace commit preserves both the active geometry and grid in memory and storage',async()=>{
    const h=createHarness();const workspace={schemaVersion:1,revision:0,importedStudyArea:area,drawnStudyArea:null,activeAreaId:'study',cells:[cell()]};
    await h.command({action:'WORKSPACE_ACTION',operation:'SAVE_WORKSPACE',workspace});
    const originalSet=h.context.chrome.storage.local.set;
    h.context.chrome.storage.local.set=async values=>{if(values.workspaceState)throw new Error('disk unavailable');return originalSet(values);};
    const response=await h.command({action:'WORKSPACE_ACTION',operation:'REMOVE_IMPORTED'});
    assert.strictEqual(response.success,false);assert.strictEqual(response.errorCode,'STORAGE_WRITE_FAILED');
    assert.strictEqual(h.api.state().studyArea.id,'study');assert.strictEqual(h.api.state().cells.length,1);
    assert.strictEqual(h.storage.workspaceState.activeAreaId,'study');assert.strictEqual((await h.command({action:'GET_WORKSPACE'})).workspace.activeAreaId,'study');
  });
  await test('clear results preserves the selected study area and grid; compact status omits full records',async()=>{
    const h=createHarness();h.context.SourceAdapters.collectOverpass=async task=>result(task.identity,[{id:'p',name:'P',x:31,y:30,hasExactCoords:true}],'complete');
    await h.command({action:'START_SCRAPING',config});
    const status=await h.command({action:'GET_STATUS'});assert.strictEqual(status.results,undefined);assert.strictEqual(status.resultsCount,1);
    await h.command({action:'CLEAR_RESULTS'});assert.strictEqual(h.api.state().results.length,0);assert.strictEqual(h.api.state().cells.length,1);assert.ok(h.api.state().studyArea);
  });
  await test('oversized public Overpass jobs are rejected without requests',async()=>{
    const h=createHarness();
    assert.strictEqual((await h.command({action:'START_SCRAPING',config:{...config,customCells:Array.from({length:101},(_,i)=>cell(`c${i}`))}})).errorCode,'PUBLIC_SOURCE_JOB_LIMIT');
    assert.strictEqual(h.storage.sourceUsage,undefined);
  });
  await test('Google primary source uses task handshake and completes each query across all cells first',async()=>{
    const h=createHarness();await h.api.ready;const visits=[];
    vm.runInContext('navigateTabAndWait=async()=>true',h.context);
    h.context.chrome.tabs.sendMessage=async(tab,message)=>{
      if(message.action==='PREPARE_TASK')return {success:true,task:message.task,view:{verified:true}};
      if(message.action==='SCRAPE_PAGE'){visits.push([message.query,message.cellInfo.id]);return result(message.task);}
      return {success:true};
    };
    const response=await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',queriesToRun:['mosque','school'],customCells:[cell('one'),cell('two'),cell('three')]}});
    assert.equal(response.success,true);
    for(let n=0;n<10&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    const queries=h.api.state().config.queriesToRun;
    assert.equal(queries.length,2);assert.equal(h.api.state().status,'completed');
    assert.deepEqual(visits,queries.flatMap(query=>['one','two','three'].map(id=>[query,id])));
    assert.equal(h.storage.sourceUsage,undefined);
  });
  await test('Google camera mismatch pauses the same cell without inserting or advancing',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);
    h.context.chrome.tabs.sendMessage=async(tab,message)=>message.action==='PREPARE_TASK'?{success:false,errorCode:'NAVIGATION_VIEW_MISMATCH'}:{success:true};
    assert.equal((await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom'}})).success,true);
    await h.runQueueTimer();const state=h.api.state();assert.equal(state.status,'paused');assert.equal(state.currentIndex,0);assert.equal(state.results.length,0);assert.equal(state.pauseReason,'NAVIGATION_VIEW_MISMATCH');
  });
  await test('missing query translations reject before changing the previous job state',async()=>{
    const h=createHarness();await h.api.ready;const before=JSON.stringify(h.api.state());
    const response=await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',searchLocale:'fr',queriesToRun:['google_places:airstrip'],bilingualEnabled:false}});
    assert.equal(response.errorCode,'MISSING_QUERY_TRANSLATION');assert.equal(JSON.stringify(h.api.state()),before);
  });
  await test('mixed explicit free-text locales reach each Google URL without English rewriting',async()=>{
    const h=createHarness();await h.api.ready;const urls=[];
    h.context.captureUrl=url=>urls.push(url);vm.runInContext('navigateTabAndWait=async(tab,url)=>{captureUrl(url);return true}',h.context);
    h.context.chrome.tabs.sendMessage=async(tab,message)=>message.action==='PREPARE_TASK'?{success:true,task:message.task,view:{verified:true}}:message.action==='SCRAPE_PAGE'?result(message.task):{success:true};
    const selections=[{kind:'free_text',text:'  mosquée  ',locale:'fr'},{kind:'free_text',text:'清真寺',locale:'zh-Hans'}];
    assert.equal((await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',searchLocale:'de-DE',queriesToRun:selections,bilingualEnabled:false}})).success,true);
    for(let n=0;n<7&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    assert.equal(h.api.state().status,'completed');assert.deepEqual(urls.map(url=>new URL(url).searchParams.get('hl')),['fr','zh-Hans']);
    assert.deepEqual(h.api.state().config.queriesToRun,selections.map(v=>v.text));
  });
  await test('navigation timeout returns false and a task URL carries separate search language and nonce',async()=>{
    const h=createHarness();await h.api.ready;
    const identity={jobId:'j',queryId:'q',cellId:'c',areaVersion:1};
    const url=h.api.buildMapsSearchUrl('mosque',cell(),15,'en',identity);assert.ok(url.includes('hl=en'));assert.ok(new URL(url).hash.startsWith('#dalil='));
    const navigation=h.api.navigateTabAndWait(10,url,5);await settle();const timeout=[...h.timers].find(([,t])=>t.ms===5);assert.ok(timeout);h.timers.delete(timeout[0]);timeout[1].fn();assert.strictEqual(await navigation,false);
  });
  console.log(`Job engine: ${passed} real worker integration scenarios passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});

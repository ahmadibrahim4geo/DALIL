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
  let listener,alarmListener,tabRemovedListener,tabUpdatedListener,startupListener,timerId=0;
  let currentTime=Date.now();
  class ClockDate extends Date {constructor(...args){super(...(args.length?args:[currentTime]));}static now(){return currentTime;}}
  let context;
  const chrome={
    runtime:{id:'dalil-test',lastError:null,getURL:p=>`chrome-extension://dalil-test/${p}`,
      onMessage:{addListener:fn=>listener=fn},onConnect:{addListener:()=>{}},onStartup:{addListener:fn=>startupListener=fn},sendMessage:async m=>{messages.push(clone(m));}},
    storage:{local:{get:(keys,callback)=>{
      const result={};for(const key of typeof keys==='string'?[keys]:keys||Object.keys(storage))if(key in storage)result[key]=clone(storage[key]);
      if(callback){queueMicrotask(()=>callback(result));return;}return Promise.resolve(result);
    },set:async values=>{Object.assign(storage,clone(values));writes.push(clone(values));}}},
    alarms:{create:(name,info)=>alarms.set(name,info),clear:async name=>alarms.delete(name),onAlarm:{addListener:fn=>alarmListener=fn}},
    action:{onClicked:{addListener:()=>{}}},
    tabs:{remove:async()=>{},sendMessage:async()=>({success:true}),get:async id=>({id,status:'complete',url:'https://www.google.com/maps/'}),
      create:async()=>({id:10}),update:async()=>{},query:async()=>[],onUpdated:{addListener:fn=>tabUpdatedListener=fn,removeListener:()=>{}},onRemoved:{addListener:fn=>tabRemovedListener=fn}},
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
  return {context,api,storage,writes,messages,timers,alarms,command,runQueueTimer,startup:async()=>{assert.ok(startupListener,'onStartup listener must be registered');startupListener();await settle();},get alarmListener(){return alarmListener;},get tabRemovedListener(){return tabRemovedListener;},get tabUpdatedListener(){return tabUpdatedListener;}};
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
  await test('browser restart preserves collected records, seen ids and cell progress',async()=>{
    const h=createHarness();h.context.SourceAdapters.collectOverpass=async task=>result(task.identity,[{id:'p1',name:'kept',x:31,y:30,hasExactCoords:true}],'complete');
    await h.command({action:'START_SCRAPING',config});
    assert.strictEqual(h.api.state().results.length,1);
    const seenBefore=h.api.state().seenIds.size;
    await h.startup();
    assert.strictEqual(h.api.state().results.length,1,'a browser restart must not delete collected records');
    assert.strictEqual(h.storage.scraperState.results.length,1,'the retained records must stay persisted');
    assert.strictEqual(h.api.state().seenIds.size,seenBefore);
    assert.strictEqual(h.api.state().stats.itemsFound,1);
    assert.strictEqual(h.api.state().status,'idle');
    assert.strictEqual(h.storage.scraperState.resultsStoredExternally,false,'Small surveys stay inline in chrome.storage.local');
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
      if(message.action==='PREPARE_TASK')return {success:true,task:message.task,view:{verified:true,queryVerified:true,centerVerified:true}};
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
  await test('a camera-only offset is advisory: collection continues and records are saved',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);
    h.context.chrome.tabs.sendMessage=async(tab,message)=>{
      if(message.action==='PREPARE_TASK')return {success:true,task:message.task,view:{queryVerified:true,centerVerified:false,centerErrorMeters:420}};
      if(message.action==='SCRAPE_PAGE')return result(message.task,[{id:'p1',name:'Place',x:31.001,y:30.005,hasExactCoords:true}],'complete');
      return {success:true};
    };
    assert.equal((await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',customCells:[cell('only',{minLng:31,maxLng:31.01,minLat:30,maxLat:30.01})]}})).success,true);
    for(let n=0;n<20&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    const state=h.api.state();
    assert.equal(state.status,'completed');
    assert.equal(state.results.length,1,'an advisory camera offset must not discard the view');
    assert.equal(state.navigationEvidence.centerErrorMeters,420,'the offset stays visible as evidence');
    assert.equal(state.lastScanDiagnosis.code,'ITEMS_SAVED');
  });
  await test('a search page that did not reload is refused instead of harvesting the previous cell',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);let scrapes=0;
    h.context.chrome.tabs.sendMessage=async(tab,m)=>{
      // نفس بصمة المستند في كل مرة: أي أن الصفحة لم تُستبدل.
      if(m.action==='PREPARE_TASK')return {success:true,task:m.task,view:{queryVerified:true,centerVerified:true},documentId:'doc-same'};
      if(m.action==='SCRAPE_PAGE'){scrapes++;return result(m.task,[{id:'p',name:'P',x:31.005,y:30.005,hasExactCoords:true}],'complete');}
      return {success:true};
    };
    const cells=[cell('c1',{minLng:31,maxLng:31.01,minLat:30,maxLat:30.01}),cell('c2',{minLng:31.01,maxLng:31.02,minLat:30,maxLat:30.01})];
    assert.equal((await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',customCells:cells}})).success,true);
    for(let n=0;n<20&&h.api.state().status==='running';n++)await h.runQueueTimer();
    const state=h.api.state();
    assert.equal(state.status,'paused','a stale page must pause instead of saving another cell’s places');
    assert.equal(state.pauseReason,'STALE_DOCUMENT');
    assert.equal(scrapes,1,'only the first cell may be harvested');
    assert.equal(state.results.length,1);
  });
  await test('each cell is read from its own freshly loaded page',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);const documents=[];let seq=0;
    h.context.chrome.tabs.sendMessage=async(tab,m)=>{
      if(m.action==='PREPARE_TASK'){seq++;return {success:true,task:m.task,view:{queryVerified:true,centerVerified:true},documentId:'doc-'+seq};}
      if(m.action==='SCRAPE_PAGE'){
        const sameCell=m.task.cellId==='c1';
        return result(m.task,[{id:sameCell?'p1':'p2',name:sameCell?'One':'Two',x:sameCell?31.005:31.015,y:30.005,hasExactCoords:true}],'complete');
      }
      return {success:true};
    };
    const cells=[cell('c1',{minLng:31,maxLng:31.01,minLat:30,maxLat:30.01}),cell('c2',{minLng:31.01,maxLng:31.02,minLat:30,maxLat:30.01})];
    assert.equal((await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',customCells:cells}})).success,true);
    for(let n=0;n<20&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    const state=h.api.state();
    assert.equal(state.status,'completed');
    assert.equal(state.results.length,2,'each cell contributes its own records');
    const owners=state.results.map(record=>record.ownerCellId).sort();
    assert.deepEqual(owners,['c1','c2'],'records are owned by the cell that actually contains them');
  });
  await test('a page that rendered no cards is reloaded once instead of being recorded as an empty cell',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);let scrapes=0,seq=0;
    h.context.chrome.tabs.sendMessage=async(tab,m)=>{
      if(m.action==='PREPARE_TASK'){seq++;return {success:true,task:m.task,view:{queryVerified:true,centerVerified:true},documentId:'doc-blank-'+seq,
        viewport:{zoom:m.zoom,pixels:{width:1400,height:1000}}};}
      if(m.action==='SCRAPE_PAGE'){
        scrapes++;
        // الصفحة الأولى لم ترسم أي بطاقة: ليست منطقة خالية، بل صفحة لم تُقرأ.
        if(scrapes===1)return result(m.task,[],'unknown',{emptyVerified:false,dom:{feed:false,cards:0,anyCards:0,visibility:'hidden',readyState:'complete'}});
        return result(m.task,[{id:'p1',name:'One',x:31.005,y:30.005,hasExactCoords:true},
          {id:'p2',name:'Two',x:31.006,y:30.006,hasExactCoords:true}],'complete',
          {emptyVerified:false,dom:{feed:true,cards:2,anyCards:2,visibility:'visible',readyState:'complete'}});
      }
      return {success:true};
    };
    assert.equal((await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',customCells:[cell('blank',{minLng:31,maxLng:31.01,minLat:30,maxLat:30.01})]}})).success,true);
    for(let n=0;n<25&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    const state=h.api.state();
    assert.equal(state.status,'completed');
    assert.equal(scrapes,2,'a blank page is retried exactly once, then read');
    assert.equal(state.results.length,2,'records are saved from the recovered page');
    const scanState=state.cells[0].statusByQuery.Q1;
    assert.equal(scanState.scans[0].recoveredFromBlankPage,true);
    assert.equal(scanState.scans[0].dom.anyCards,2,'the live DOM snapshot is kept as evidence');
    assert.equal(scanState.status,'complete');
  });

  await test('a list that contains no card from the cell is re-ranked with "search this area" before saving',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);
    let scrapes=0,areaRequests=0,seq=0;
    h.context.chrome.tabs.sendMessage=async(tab,m)=>{
      if(m.action==='PREPARE_TASK'){seq++;return {success:true,task:m.task,view:{queryVerified:true,centerVerified:true},documentId:'doc-area-'+seq,
        viewport:{zoom:m.zoom,pixels:{width:1400,height:1000}}};}
      if(m.action==='SEARCH_THIS_AREA'){areaRequests++;return {success:true,clicked:true,changed:true,count:2};}
      if(m.action==='SCRAPE_PAGE'){
        scrapes++;
        // القائمة الأولى عن منطقة أوسع: ثلاث بطاقات بعيدة، ولا بطاقة من الخلية.
        if(scrapes===1)return result(m.task,[
          {id:'far1',name:'Far one',x:31.5,y:30.5,hasExactCoords:true},
          {id:'far2',name:'Far two',x:31.6,y:30.6,hasExactCoords:true},
          {id:'far3',name:'Far three',x:31.7,y:30.7,hasExactCoords:true}],'complete',
          {emptyVerified:false,dom:{feed:true,cards:3,anyCards:3,visibility:'visible',readyState:'complete'}});
        // وبعد إعادة ترتيب النطاق تظهر بطاقة الخلية نفسها.
        return result(m.task,[{id:'in1',name:'Inside',x:31.005,y:30.005,hasExactCoords:true}],'complete',
          {emptyVerified:false,dom:{feed:true,cards:1,anyCards:1,visibility:'visible',readyState:'complete'}});
      }
      return {success:true};
    };
    assert.equal((await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',customCells:[cell('area',{minLng:31,maxLng:31.01,minLat:30,maxLat:30.01})]}})).success,true);
    for(let n=0;n<25&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    const state=h.api.state();
    assert.equal(state.status,'completed');
    assert.equal(areaRequests,1,'the viewport re-rank is requested exactly once');
    assert.equal(scrapes,2,'the cell is read again after re-ranking, not abandoned as empty');
    assert.equal(state.results.length,1,'the place inside the cell is saved');
    assert.equal(state.results[0].ownerCellId,'area');
    const scanState=state.cells[0].statusByQuery.Q1;
    assert.equal(scanState.scans[0].searchedAreaAgain,true);
    assert.equal(scanState.scans[0].diagnosis.code,'ITEMS_SAVED');
  });

  await test('a list that belongs to other areas is refined once instead of being recorded as a complete cell',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);let seq=0;
    h.context.chrome.tabs.sendMessage=async(tab,m)=>{
      if(m.action==='PREPARE_TASK'){seq++;return {success:true,task:m.task,view:{queryVerified:true,centerVerified:true},documentId:'doc-off-'+seq,
        viewport:{zoom:m.zoom,pixels:{width:1400,height:1000}}};}
      if(m.action==='SCRAPE_PAGE'){
        // المشهد الجذري: ثلاث بطاقات من مناطق أخرى ولا بطاقة واحدة من الخلية.
        if(m.task.queryId==='Q1')return result(m.task,[
          {id:'far1',name:'Far one',x:31.5,y:30.5,hasExactCoords:true},
          {id:'far2',name:'Far two',x:31.6,y:30.6,hasExactCoords:true},
          {id:'far3',name:'Far three',x:31.7,y:30.7,hasExactCoords:true}],'complete');
        // وبعد التقسيم يظهر معلم الخلية نفسه في كل مشهد فرعي (نفس المعرّف = تكرار).
        return result(m.task,[{id:'p-in',name:'Inside',x:31.005,y:30.005,hasExactCoords:true}],'complete');
      }
      return {success:true};
    };
    assert.equal((await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',customCells:[cell('off',{minLng:31,maxLng:31.01,minLat:30,maxLat:30.01})]}})).success,true);
    for(let n=0;n<30&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    const state=h.api.state();
    const scanState=state.cells[0].statusByQuery.Q1;
    assert.equal(scanState.scans.length,5,'one evidence-driven refinement (4 sub-views), not an endless tree');
    assert.equal(scanState.scans[0].refined,true);
    assert.equal(scanState.scans[0].status,'partial','a view with no card from the cell is not complete');
    assert.equal(scanState.scans[0].inCellCount,0);
    assert.equal(state.status,'completed');
    assert.equal(state.results.length,1,'the in-cell record is saved once after refinement');
  });

  await test('a viewport smaller than the cell is never marked complete',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);let seq=0;
    h.context.chrome.tabs.sendMessage=async(tab,m)=>{
      if(m.action==='PREPARE_TASK'){
        // صفحة صحيحة وكاميرا صحيحة، لكن نافذتها أضيق من الخلية نفسها.
        seq++;
        return {success:true,task:m.task,view:{queryVerified:true,centerVerified:true},documentId:'doc-cov-'+seq,
          viewport:{zoom:m.zoom,pixels:{width:320,height:240}}};
      }
      if(m.action==='SCRAPE_PAGE')return result(m.task,[{id:'inside',name:'INSIDE',x:31.5,y:30.5,hasExactCoords:true}],'complete');
      return {success:true};
    };
    const cells=[cell('huge',{minLng:31,maxLng:32,minLat:30,maxLat:31})];
    assert.equal((await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',customCells:cells}})).success,true);
    for(let n=0;n<20&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    const state=h.api.state();
    const scanState=state.cells[0].statusByQuery.Q1;
    // «نهاية القائمة» وردت من Google، لكن العرض لم يكن يحتوي الخلية: لا اكتمال.
    assert.notEqual(scanState.status,'complete','a partial viewport must not be recorded as complete');
    assert.equal(scanState.status,'partial');
    assert.equal(scanState.scans[0].coverageIncomplete,true);
    assert.equal(scanState.scans[0].diagnosis.code,'VIEWPORT_SMALLER_THAN_CELL');
    assert.equal(state.results.length,1,'the place that was actually read is still saved honestly');
  });
  await test('missing query translations reject before changing the previous job state',async()=>{
    const h=createHarness();await h.api.ready;const before=JSON.stringify(h.api.state());
    const response=await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',searchLocale:'fr',queriesToRun:['google_places:airstrip'],bilingualEnabled:false}});
    assert.equal(response.errorCode,'MISSING_QUERY_TRANSLATION');assert.equal(JSON.stringify(h.api.state()),before);
  });
  await test('mixed explicit free-text locales reach each Google URL without English rewriting',async()=>{
    const h=createHarness();await h.api.ready;const urls=[];
    h.context.captureUrl=url=>urls.push(url);vm.runInContext('navigateTabAndWait=async(tab,url)=>{captureUrl(url);return true}',h.context);
    h.context.chrome.tabs.sendMessage=async(tab,message)=>message.action==='PREPARE_TASK'?{success:true,task:message.task,view:{verified:true,queryVerified:true,centerVerified:true}}:message.action==='SCRAPE_PAGE'?result(message.task):{success:true};
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
  await test('capped Google view refines within one owner cell and keeps grid progress at zero until committed',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);
    const visits=[],updates=[];
    const small={minLng:31,maxLng:31.01,minLat:30,maxLat:30.01};
    h.context.chrome.tabs.sendMessage=async(tab,m)=>{
      if(m.action==='JOB_STATUS'){updates.push(clone(m.state));return {success:true};}
      if(m.action==='PREPARE_TASK')return {success:true,task:m.task,view:{verified:true,queryVerified:true,centerVerified:true}};
      if(m.action!=='SCRAPE_PAGE')return {success:true};
      visits.push(clone(m));
      return result(m.task,[{id:'p'+visits.length,name:'Place '+visits.length,x:31.001+visits.length*.001,y:30.005,hasExactCoords:true}],visits.length===1?'capped':'complete');
    };
    await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',customCells:[cell('owner',small)]}});
    assert.equal(h.api.state().stats.currentStep,0);assert.equal(h.api.state().cells.length,1);
    assert.equal(h.storage.scraperState.cells[0].statusByQuery.Q1.scans.length,5);
    for(let n=0;n<12&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    assert.equal(h.api.state().status,'completed');assert.equal(visits.length,5);
    assert.equal(new Set(visits.map(m=>m.task.queryId)).size,5,'Subscans have distinct navigation identities');
    assert.equal(h.api.state().stats.currentStep,1);assert.equal(h.api.state().stats.totalCells,1);
    assert.equal(h.api.state().cells[0].statusByQuery.Q1.status,'complete');
    assert.equal(h.api.state().results.length,5);assert(h.api.state().results.every(r=>r.ownerCellId==='owner'));
    assert(updates.some(s=>s.status==='running'&&s.stats.currentStep===0));
  });
  await test('detail scans are bounded and a remaining cap is never marked complete',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);let calls=0;
    h.context.chrome.tabs.sendMessage=async(tab,m)=>{
      if(m.action==='PREPARE_TASK')return {success:true,task:m.task,view:{verified:true,queryVerified:true,centerVerified:true}};
      if(m.action==='SCRAPE_PAGE'){calls++;return result(m.task,[{id:'p',name:'same',x:31,y:30,hasExactCoords:true}],'capped');}
      return {success:true};
    };
    await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom'}});
    for(let n=0;n<50&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    assert.equal(calls,21);assert.equal(h.api.state().status,'completed');
    assert.equal(h.api.state().cells[0].statusByQuery.Q1.status,'capped');
    assert.equal(h.api.state().completionSummary.capped,1);assert.equal(h.api.state().results.length,1);
  });
  await test('a single incomplete view is not subdivided without proof of more results',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);let calls=0;
    h.context.chrome.tabs.sendMessage=async(tab,m)=>{
      if(m.action==='PREPARE_TASK')return {success:true,task:m.task,view:{verified:true,queryVerified:true,centerVerified:true}};
      if(m.action==='SCRAPE_PAGE'){calls++;return result(m.task,[{id:'p',name:'place',x:31,y:30,hasExactCoords:true}],'partial');}
      return {success:true};
    };
    await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom'}});
    for(let n=0;n<30&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    // «partial» شك لا دليل: مشهد واحد لكل خلية. لا نُقسّم إلا إذا قال المصدر إن هناك المزيد.
    assert.equal(calls,1,'one view per cell unless the source proves more results');
    assert.equal(h.api.state().cells[0].statusByQuery.Q1.scans.length,1);
    assert.equal(h.api.state().cells[0].statusByQuery.Q1.status,'partial');
    assert.equal(h.api.state().results.length,1);
    assert.equal(h.api.state().status,'completed');
  });
  await test('opt-in deep refinement subdivides an incomplete view exactly once',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);let calls=0;
    h.context.chrome.tabs.sendMessage=async(tab,m)=>{
      if(m.action==='PREPARE_TASK')return {success:true,task:m.task,view:{verified:true,queryVerified:true,centerVerified:true}};
      if(m.action==='SCRAPE_PAGE'){calls++;return result(m.task,[],'partial');}
      return {success:true};
    };
    await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',deepRefine:true}});
    for(let n=0;n<30&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    assert.equal(calls,5,'deepRefine splits once (4 children) instead of the full 21-view tree');
    assert.equal(h.api.state().cells[0].statusByQuery.Q1.scans.length,5);
  });
  await test('new job retaining records resets old scan states and re-observes the same identity',async()=>{
    const h=createHarness();h.context.SourceAdapters.collectOverpass=async task=>result(task.identity,[{id:'p',name:'same',x:31,y:30,hasExactCoords:true}],'complete');
    await h.command({action:'START_SCRAPING',config});
    const firstJob=h.api.state().jobId;
    await h.command({action:'START_SCRAPING',config:{...config,clearPreviousData:false}});
    for(let n=0;n<8&&h.api.state().status!=='completed';n++)await h.runQueueTimer();
    assert.equal(h.api.state().status,'completed');assert.notEqual(h.api.state().jobId,firstJob);
    assert.equal(h.api.state().results.length,1);assert.equal(h.api.state().results[0].observationsCount,2);
    assert.equal(h.api.state().cells[0].itemsFound,1);assert.equal(h.api.state().cells[0].statusByQuery.Q1.scans.length,1);
  });
  await test('worker restart resumes the pending detail view without replaying the committed root',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);
    const small={minLng:31,maxLng:31.01,minLat:30,maxLat:30.01};
    h.context.chrome.tabs.sendMessage=async(tab,m)=>m.action==='PREPARE_TASK'?{success:true,task:m.task,view:{verified:true,queryVerified:true,centerVerified:true}}:
      m.action==='SCRAPE_PAGE'?result(m.task,[{id:'root',name:'Root',x:31.005,y:30.005,hasExactCoords:true}],'capped'):{success:true};
    await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom',customCells:[cell('owner',small)]}});
    const reopened=createHarness(h.storage);await reopened.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',reopened.context);const ids=[];
    reopened.context.chrome.tabs.sendMessage=async(tab,m)=>{
      if(m.action==='PREPARE_TASK')return {success:true,task:m.task,view:{verified:true,queryVerified:true,centerVerified:true}};
      if(m.action==='SCRAPE_PAGE'){ids.push(m.task.queryId);return result(m.task);}
      return {success:true};
    };
    assert.equal(reopened.api.state().status,'paused');await reopened.command({action:'RESUME_SCRAPING'});
    for(let n=0;n<12&&reopened.api.state().status!=='completed';n++)await reopened.runQueueTimer();
    assert.equal(reopened.api.state().status,'completed');assert.deepEqual(ids,['Q1.S1','Q1.S2','Q1.S3','Q1.S4']);
    assert.equal(reopened.api.state().results.length,1);assert.equal(reopened.api.state().cells[0].statusByQuery.Q1.scans.length,5);
  });
  await test('closing the Google worker pauses its checkpoint; a late response cannot advance it',async()=>{
    const h=createHarness();await h.api.ready;vm.runInContext('navigateTabAndWait=async()=>true',h.context);let release;
    h.context.chrome.tabs.sendMessage=async(tab,m)=>{
      if(m.action==='PREPARE_TASK')return {success:true,task:m.task,view:{verified:true,queryVerified:true,centerVerified:true}};
      if(m.action==='SCRAPE_PAGE')return new Promise(resolve=>release=()=>resolve(result(m.task)));
      return {success:true};
    };
    await h.command({action:'START_SCRAPING',config:{...config,provider:'google_maps_dom'}});
    await h.tabRemovedListener(10);release();await settle();
    assert.equal(h.api.state().status,'paused');assert.equal(h.api.state().pauseReason,'WORKER_TAB_CLOSED');
    assert.equal(h.api.state().currentIndex,0);assert.equal(h.api.state().results.length,0);assert.equal(h.api.state().workerTabId,null);
  });
  await test('Google camera canonicalization after document completion is accepted on URL-only events',async()=>{
    const h=createHarness();await h.api.ready;
    const target='https://www.google.com/maps/search/mosque/@30,31,18z?hl=en';let actual='https://www.google.com/maps/';
    h.context.chrome.tabs.get=async()=>({id:10,status:'complete',url:actual});
    const navigation=h.api.navigateTabAndWait(10,target,26000);await settle();
    h.tabUpdatedListener(10,{status:'complete'});await settle();
    actual=target;h.tabUpdatedListener(10,{url:actual});await settle();
    assert.equal(await navigation,true);assert.equal(h.timers.size,0);
  });
  await test('navigation polls the final camera if the SPA URL event is missing',async()=>{
    const h=createHarness();await h.api.ready;
    const target='https://www.google.com/maps/search/mosque/@30,31,18z?hl=en';let actual='https://www.google.com/maps/';
    h.context.chrome.tabs.get=async()=>({id:10,status:'complete',url:actual});
    const navigation=h.api.navigateTabAndWait(10,target,26000);await settle();
    actual=target;const pair=[...h.timers].find(([,t])=>t.ms===500);assert(pair);h.timers.delete(pair[0]);pair[1].fn();await settle();
    assert.equal(await navigation,true);assert.equal(h.timers.size,0);
  });
  console.log(`Job engine: ${passed} real worker integration scenarios passed.`);
})().catch(error=>{console.error(error);process.exitCode=1;});

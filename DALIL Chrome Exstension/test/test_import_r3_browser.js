/* Native MV3 import journeys. Network documents below are synthetic fixtures. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.DALIL_PLAYWRIGHT_MODULE||'playwright');
const {filesFor}=require('./import_fixtures');
const out=process.env.DALIL_BROWSER_EVIDENCE_DIR;if(!out)throw Error('Set DALIL_BROWSER_EVIDENCE_DIR');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const extension=path.resolve(__dirname,'..'),errors=[],alerts=[],imports=[],jobs=[];
 const context=await chromium.launchPersistentContext(path.join(out,'profile-'+Date.now()),{channel:'chromium',headless:true,viewport:{width:1500,height:1000},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try{
  await context.route('https://**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='www.google.com'&&u.pathname.startsWith('/maps')&&route.request().resourceType()==='document'){
    const query=decodeURIComponent(u.pathname.split('/maps/search/')[1]?.split('/')[0]||'');
    const point=query.includes('point');
    const places=point?[['Inside point',31.001,30.001],['Outside circle',31.005,30.004]]:[['Inside road',31.01,30.0003],['Outside corridor',31.005,30.015]];
    return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><body><input id="searchboxinput" value="${query}"><div role="feed" style="height:500px;overflow:auto">${places.map(([name,x,y])=>`<div class="Nv2PK"><a class="hfpxzc" aria-label="${name}" href="https://www.google.com/maps/place/${name.replaceAll(' ','-')}/data=!3d${y}!4d${x}">${name}</a><div class="qBF1Pd">${name}</div></div>`).join('')}<span class="HlvSq">You've reached the end of the list</span></div></body></html>`});
   }
   return route.abort();
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),id=worker.url().split('/')[2];
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.accept();});
  const open=async()=>{await page.goto(`chrome-extension://${id}/dashboard/dashboard.html`);await page.waitForFunction(()=>!!window.__dalilViewportLock);await page.locator('[data-route="setup"]').click();};
  const state=()=>page.evaluate(()=>chrome.runtime.sendMessage({action:'GET_WORKSPACE'}));
  const poll=async(predicate,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await predicate())return;await page.waitForTimeout(80);}throw Error('Timed out waiting for import state');};
  const ready=()=>poll(async()=>await page.locator('#btnGenerateGridNow').isEnabled());
  await open();await ready();
  await page.locator('#inputGridRowsNum').fill('2');await page.locator('#inputGridColsNum').fill('3');
  const geometries=[{type:'Point',coordinates:[31,30]},{type:'LineString',coordinates:[[31,30],[31.02,30],[31.02,30.02]]}];
  const upload=async(name,buffer)=>{
   await ready();const revision=(await state()).workspace.revision;
   await page.locator('#studyAreaFileInput').setInputFiles({name,mimeType:'application/octet-stream',buffer});
   await poll(async()=>(await state()).workspace.revision>revision);await ready();
   return (await state()).workspace;
  };
  for(const geometry of geometries)for(const [name,buffer] of filesFor(geometry,geometry.type.toLowerCase())){
   const s=await upload(name,buffer);assert.ok(s.importedStudyArea,name);assert.equal(s.drawnStudyArea,null);assert.equal(s.cells.length,6,name);
   assert.equal(s.importedStudyArea.bufferMeters,500);assert.equal(await page.locator('#proximitySettings').isVisible(),true);assert.equal(await page.locator('#checkClipToStudyArea').isDisabled(),true);
   const g=s.importedStudyArea.geometry;assert.deepEqual(g.coordinates,g.type==='MultiLineString'?[geometry.coordinates]:geometry.coordinates);
   imports.push(name);
  }
  let s=(await state()).workspace;const original=s.importedStudyArea.geometry;
  await page.locator('#inputSearchBufferMeters').fill('750');await page.locator('#inputSearchBufferMeters').press('Tab');
  await poll(async()=>(await state()).workspace.revision>s.revision);await ready();s=(await state()).workspace;
  assert.equal(s.importedStudyArea.bufferMeters,750);assert.deepEqual(s.importedStudyArea.geometry,original);
  await open();await poll(async()=>await page.locator('#inputSearchBufferMeters').inputValue()==='750');assert.equal((await state()).workspace.cells.length,6);
  assert.equal(await page.locator('#inputGridRowsNum').inputValue(),'2');assert.equal(await page.locator('#inputGridColsNum').inputValue(),'3');
  assert.ok((await page.evaluate(()=>window.__dalilViewportLock.snapshot())).zoom>11,'Restored map fits the road');
  await page.locator('#btnEditArea').click();assert.equal(await page.locator('.dalil-vertex').count(),3,'Line has no artificial closing vertex');
  const v=await page.locator('.dalil-vertex').first().boundingBox(),revision=(await state()).workspace.revision;
  await page.mouse.move(v.x+7,v.y+7);await page.mouse.down();await page.mouse.move(v.x+24,v.y+18,{steps:5});await page.mouse.up();
  await poll(async()=>(await state()).workspace.revision>revision);await ready();await page.locator('#btnFinishDrawing').click();
  assert.notDeepEqual((await state()).workspace.importedStudyArea.geometry,original);assert.equal((await state()).workspace.importedStudyArea.bufferMeters,750);
  const undoRevision=(await state()).workspace.revision;await page.locator('#btnUndoArea').click();await poll(async()=>(await state()).workspace.revision>undoRevision);assert.deepEqual((await state()).workspace.importedStudyArea.geometry,original);
  await page.screenshot({path:path.join(out,'road-ar.png'),fullPage:true});
  await page.locator('#btnLangToggle').click();assert.equal(await page.locator('#inputSearchBufferMeters').inputValue(),'750');assert.match(await page.locator('label[for="inputSearchBufferMeters"]').textContent(),/Search distance/);
  await page.screenshot({path:path.join(out,'road-en.png'),fullPage:true});
  await page.locator('#btnLangToggle').click();
  const mixed={type:'GeometryCollection',geometries:[geometries[0],geometries[1],{type:'Polygon',coordinates:[[[31.03,30],[31.04,30],[31.04,30.01],[31.03,30.01],[31.03,30]]]}]};
  const mixedState=await upload('mixed.geojson',Buffer.from(JSON.stringify(mixed)));assert.equal(mixedState.importedStudyArea.geometry.type,'GeometryCollection');assert.equal(mixedState.cells.length,6);
  // Exercise both original source geometry and the actual background/content
  // acceptance filter: all fixture points lie in the rectangular grid.
  await page.locator('#inputGridRowsNum').fill('1');await page.locator('#inputGridColsNum').fill('1');
  for(const geometry of geometries){
   const [name,buffer]=filesFor(geometry,'run-'+geometry.type)[0];s=await upload(name,buffer);
   if(geometry.type==='Point'){
    await page.locator('#btnEditArea').click();assert.equal(await page.locator('.dalil-vertex').count(),1);
    const v=await page.locator('.dalil-vertex').boundingBox(),revision=s.revision;
    await page.mouse.move(v.x+7,v.y+7);await page.mouse.down();await page.mouse.move(v.x+24,v.y+18,{steps:5});await page.mouse.up();
    await poll(async()=>(await state()).workspace.revision>revision);await ready();await page.locator('#btnFinishDrawing').click();
    assert.notDeepEqual((await state()).workspace.importedStudyArea.geometry,geometry);
    const undoRevision=(await state()).workspace.revision;await page.locator('#btnUndoArea').click();await poll(async()=>(await state()).workspace.revision>undoRevision);await ready();s=(await state()).workspace;assert.deepEqual(s.importedStudyArea.geometry,geometry);
   }
   if(geometry.type==='LineString'){
    const revision=s.revision;await page.locator('#inputSearchBufferMeters').fill('100');await page.locator('#inputSearchBufferMeters').press('Tab');await poll(async()=>(await state()).workspace.revision>revision);await ready();s=(await state()).workspace;
   }
   const query=geometry.type==='Point'?'r3-point':'r3-road';
   const started=await page.evaluate(({s,query})=>chrome.runtime.sendMessage({action:'START_SCRAPING',config:{provider:'google_maps_dom',searchLocale:'en',uiLanguage:'en',queriesToRun:[query],query,queryPlanMode:'comprehensive',studyArea:s.importedStudyArea,customCells:s.cells,customBounds:s.importedStudyArea.bounds,clearPreviousData:true,bilingualEnabled:false,delayMs:2500,maxPerCell:20}}),{s,query});
   assert.equal(started.success,true,JSON.stringify(started));
   await poll(async()=>{const state=await page.evaluate(()=>chrome.runtime.sendMessage({action:'GET_STATUS'}));return state.status==='completed'||state.status==='paused';},55000);
   const final=await page.evaluate(()=>chrome.runtime.sendMessage({action:'GET_STATE'}));assert.equal(final.status,'completed',JSON.stringify(final.lastError));assert.equal(final.resultsCount,1,JSON.stringify(final));
   const records=await page.evaluate(()=>chrome.runtime.sendMessage({action:'GET_RESULTS',offset:0,limit:20}));
   assert.match(records.results[0].name,/Inside/);jobs.push({geometry:geometry.type,results:final.resultsCount,name:records.results[0].name});
  }
  await open();const [tinyName,tinyBuffer]=filesFor(geometries[0],'tiny-point')[0];s=await upload(tinyName,tinyBuffer);
  await page.locator('#inputGridRowsNum').fill('40');await page.locator('#inputGridColsNum').fill('40');
  await page.locator('#inputSearchBufferMeters').fill('1');await page.locator('#inputSearchBufferMeters').press('Tab');
  await poll(async()=>await page.locator('#inputSearchBufferMeters').inputValue()==='500');await ready();
  assert.deepEqual((await state()).workspace,s,'Invalid tiny cells do not change saved area or grid');assert.match(alerts.pop()||'',/دقة الإحداثيات/);
  assert.equal(await page.locator('#inputGridRowsNum').inputValue(),'1');
  await page.locator('#btnClearStudyArea').click();await poll(async()=>(await state()).workspace.revision>s.revision);assert.equal((await state()).workspace.activeAreaId,null);assert.equal(await page.locator('#proximitySettings').isVisible(),false);
  const clearRevision=(await state()).workspace.revision;await page.locator('#btnUndoArea').click();await poll(async()=>(await state()).workspace.revision>clearRevision);assert.equal((await state()).workspace.importedStudyArea.bufferMeters,500);assert.equal(await page.locator('#proximitySettings').isVisible(),true);
  assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);
  const report={status:'passed',browser:context.browser().version(),imports,jobs,checks:['distance change keeps original geometry','6-cell rectangular grids','radius, grid settings and geometry survive reopening','point and open-line vertex editing and undo','mixed geometry import and rendering','clear and restore','AR/EN proximity UI','invalid tiny cells restore persisted geometry and grid','real MV3 background/content filters synthetic point and road results']};
  fs.writeFileSync(path.join(out,'r3-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await context.close();}
})().catch(error=>{fs.writeFileSync(path.join(out,'r3-failure.txt'),error.stack||String(error));console.error(error);process.exitCode=1;});

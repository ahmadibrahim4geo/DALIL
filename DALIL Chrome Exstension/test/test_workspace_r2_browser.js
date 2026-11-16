/* Real native Chrome extension journeys. Provider HTML is a synthetic fixture.
 * Small search cells isolate query-first order; test_survey_browser covers refinement. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.DALIL_PLAYWRIGHT_MODULE||'playwright');
const Export=require('../lib/export-utils');
const out=process.env.DALIL_BROWSER_EVIDENCE_DIR;if(!out)throw Error('Set DALIL_BROWSER_EVIDENCE_DIR');fs.mkdirSync(out,{recursive:true});
function polygonShp(){const b=Buffer.alloc(236);b.writeInt32BE(9994,0);b.writeInt32BE(118,24);b.writeInt32LE(1000,28);b.writeInt32LE(5,32);[31,30,31.01,30.01].forEach((n,i)=>b.writeDoubleLE(n,36+i*8));b.writeInt32BE(1,100);b.writeInt32BE(64,104);b.writeInt32LE(5,108);[31,30,31.01,30.01].forEach((n,i)=>b.writeDoubleLE(n,112+i*8));b.writeInt32LE(1,144);b.writeInt32LE(5,148);b.writeInt32LE(0,152);[[31,30],[31.01,30],[31.01,30.01],[31,30.01],[31,30]].forEach((p,i)=>{b.writeDoubleLE(p[0],156+i*16);b.writeDoubleLE(p[1],164+i*16);});return b;}
(async()=>{
 const extension=path.resolve(__dirname,'..'),errors=[],alerts=[],searches=[];
 const context=await chromium.launchPersistentContext(path.join(out,'profile-'+Date.now()),{channel:'chromium',headless:true,viewport:{width:1500,height:1000},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try{
  await context.route('https://**/*',async route=>{
   const request=route.request(),u=new URL(request.url());
   if(u.hostname==='www.google.com'&&u.pathname.startsWith('/maps')&&request.resourceType()==='document'){
    const query=decodeURIComponent(u.pathname.split('/maps/search/')[1]?.split('/')[0]||'');
    const camera=u.pathname.match(/@(-?[\d.]+),(-?[\d.]+)/);const lat=camera?Number(camera[1]):30.05,lng=camera?Number(camera[2]):31.05;
    if(query)searches.push({query,lat,lng});
    return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><body><input id="searchboxinput" value="${query}"><div role="feed" style="height:500px;overflow:auto"><div class="Nv2PK"><a class="hfpxzc" aria-label="Fixture ${query}" href="https://www.google.com/maps/place/Fixture/data=!3d${lat}!4d${lng}">Fixture ${query}</a><div class="qBF1Pd">Fixture ${query}</div></div><span class="HlvSq">You've reached the end of the list</span></div></body></html>`});
   }
   return route.abort();
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker');const id=worker.url().split('/')[2];
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.accept();});
  await page.goto(`chrome-extension://${id}/dashboard/dashboard.html`);await page.waitForFunction(()=>!!window.__dalilViewportLock);
  const state=()=>page.evaluate(()=>chrome.runtime.sendMessage({action:'GET_WORKSPACE'}));
  const poll=async(predicate,timeout=15000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await predicate())return;await page.waitForTimeout(80);}throw Error('Timed out waiting for extension state');};
  const waitRevision=revision=>poll(async()=>(await state()).workspace.revision>revision);
  await page.locator('[data-route="setup"]').click();assert.equal(await page.locator('#dataSource').inputValue(),'google_maps_dom');
  await page.locator('#inputGridRowsNum').fill('1');await page.locator('#inputGridColsNum').fill('2');
  await page.locator('#btnStartDrawRect').click();let canvas=await page.locator('#map').boundingBox();
  await page.mouse.move(canvas.x+130,canvas.y+110);await page.mouse.down();await page.mouse.move(canvas.x+380,canvas.y+260,{steps:8});await page.mouse.up();
  await poll(async()=>!!(await state()).workspace.drawnStudyArea);
  let s=(await state()).workspace;assert.equal(s.cells.length,2);assert.equal(s.importedStudyArea,null);assert.equal(await page.locator('#drawSessionActions').isVisible(),false);
  await page.locator('#btnEditArea').click();assert.equal(await page.locator('.dalil-vertex').count(),4);
  const vertex=await page.locator('.dalil-vertex').first().boundingBox(),revision=s.revision;
  await page.mouse.move(vertex.x+7,vertex.y+7);await page.mouse.down();await page.mouse.move(vertex.x+22,vertex.y+18,{steps:5});await page.mouse.up();await waitRevision(revision);
  await page.locator('#btnFinishDrawing').click();assert.equal(await page.locator('.dalil-vertex').count(),0);
  s=(await state()).workspace;const edited=s.drawnStudyArea.geometry;
  await page.locator('#btnClearStudyArea').click();await waitRevision(s.revision);assert.equal((await state()).workspace.activeAreaId,null);
  await page.locator('#btnUndoArea').click();await poll(async()=>!!(await state()).workspace.drawnStudyArea);assert.deepEqual((await state()).workspace.drawnStudyArea.geometry,edited);
  await page.locator('#btnLockView').click();await page.waitForTimeout(250);const locked=await page.evaluate(()=>window.__dalilViewportLock.snapshot());
  canvas=await page.locator('#map').boundingBox();await page.mouse.move(canvas.x+300,canvas.y+150);await page.mouse.wheel(0,-900);await page.mouse.down();await page.mouse.move(canvas.x+500,canvas.y+250,{steps:4});await page.mouse.up();await page.keyboard.press('+');await page.locator('#btnMapToolPan').click();
  assert.deepEqual(await page.evaluate(()=>window.__dalilViewportLock.snapshot()),locked);assert.equal(await page.locator('#btnLockView').getAttribute('aria-pressed'),'true');await page.locator('#btnLockView').click();
  await page.locator('#btnDrawPolygon').click();canvas=await page.locator('#map').boundingBox();const polygonClicks=[];for(const [x,y]of [[180,180],[330,180],[300,300]]){polygonClicks.push(await page.evaluate(([x,y])=>{const e=document.elementFromPoint(x,y);return {x,y,tag:e?.tagName,classes:e?.getAttribute('class')};},[canvas.x+x,canvas.y+y]));await page.mouse.click(canvas.x+x,canvas.y+y);}
  await page.waitForTimeout(120);
  const polygonRevision=(await state()).workspace.revision;await page.locator('#btnFinishDrawing').click();await waitRevision(polygonRevision).catch(async error=>{fs.writeFileSync(path.join(out,'polygon-failure.json'),JSON.stringify({polygonClicks,canvas,alerts,state:await state(),hint:await page.locator('#drawInstructionHint').textContent()},null,2));await page.screenshot({path:path.join(out,'polygon-failure.png'),fullPage:true});throw error;});s=(await state()).workspace;assert.equal(s.drawnStudyArea.geometry.type,'Polygon');assert.equal(s.drawnStudyArea.geometry.coordinates[0].length,4,JSON.stringify(s.drawnStudyArea.geometry));
  await page.locator('#btnDrawPolygon').click();await page.mouse.click(canvas.x+210,canvas.y+210);await page.locator('#btnCancelDrawing').click();assert.deepEqual((await state()).workspace.drawnStudyArea.geometry,s.drawnStudyArea.geometry);
  await page.locator('#btnDrawPolygon').click();await page.keyboard.press('Escape');assert.equal(await page.locator('#drawSessionActions').isVisible(),false);
  const coords=[[31,30],[31.01,30],[31.01,30.01],[31,30.01],[31,30]];
  const kml=`<kml><Document><Placemark><Polygon><outerBoundaryIs><LinearRing><coordinates>${coords.map(p=>p.join(',')).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark></Document></kml>`;
  const shapes=polygonShp();
  const files=[['boundary.kml',Buffer.from(kml)],['boundary.kmz',Buffer.from(Export.createZip([{name:'doc.kml',data:kml}]))],['boundary.geojson',Buffer.from(JSON.stringify({type:'Polygon',coordinates:[coords]}))],['boundary.shp',shapes],['boundary.zip',Buffer.from(Export.createZip([{name:'area.shp',data:shapes}]))]];
  for(const [name,buffer]of files){const revision=(await state()).workspace.revision;await page.locator('#studyAreaFileInput').setInputFiles({name,mimeType:'application/octet-stream',buffer});await waitRevision(revision);const s=(await state()).workspace;assert.ok(s.importedStudyArea,name);assert.equal(s.drawnStudyArea,null,name);assert.deepEqual(s.importedStudyArea.geometry.coordinates[0],coords,name);}
  await page.locator('#searchLocale').selectOption('en');await page.locator('[data-route="phenomena"]').click();const bilingual=page.locator('#sideBilingualToggle');if(await bilingual.count())await bilingual.uncheck();
  await page.locator('[data-route="phenomena"]').click();for(const term of ['mosque','school']){await page.locator('#inputNewPhenomenon').fill(term);await page.locator('#btnAddPhenomenon').click();}
  await page.locator('[data-route="workspace"]').click();await page.locator('#btnLockView').click();await page.waitForTimeout(250);const fixed=await page.evaluate(()=>window.__dalilViewportLock.getView());await page.locator('#btnTopStart').click();
  await poll(async()=>context.pages().some(p=>p.url().includes('/maps/search/')));const sourcePage=context.pages().find(p=>p.url().includes('/maps/search/'));await sourcePage.locator('#__gmaps_scraper_overlay').waitFor({state:'visible',timeout:15000});await sourcePage.screenshot({path:path.join(out,'search-status.png')});
  await poll(async()=>{const state=await page.evaluate(()=>chrome.runtime.sendMessage({action:'GET_STATUS'}));return state.status==='completed'||state.status==='paused';},65000);
  const final=await page.evaluate(()=>chrome.runtime.sendMessage({action:'GET_STATE'}));assert.equal(final.status,'completed',JSON.stringify(final.lastError));assert.equal(searches.length,4);assert.equal(searches[0].query,searches[1].query);assert.equal(searches[2].query,searches[3].query);assert.notEqual(searches[0].query,searches[2].query);assert.deepEqual(await page.evaluate(()=>window.__dalilViewportLock.snapshot()),fixed);assert.ok(final.resultsCount>0);
  await page.waitForFunction(()=>document.querySelector('#metricProgressVal').textContent==='100');await page.waitForFunction(count=>Number(document.querySelector('#hudPlacesCount').textContent)===count,final.resultsCount);await page.screenshot({path:path.join(out,'workspace-ar.png'),fullPage:true});
  await page.locator('[data-route="setup"]').click();await page.screenshot({path:path.join(out,'setup-ar.png'),fullPage:true});
  await page.locator('[data-route="about"]').click();const logo=await page.locator('.about-brand-logo').boundingBox();assert.ok(logo.width<=90&&logo.height<=90);assert.equal(await page.locator('.titlebar').isVisible(),false);await page.screenshot({path:path.join(out,'about-ar.png'),fullPage:true});
  await page.locator('#btnLangToggle').click();await page.screenshot({path:path.join(out,'about-en.png'),fullPage:true});
  assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);
  const report={status:'passed',browser:context.browser().version(),journeys:['rectangle drag/release','polygon finish/cancel/Escape','edit vertices','single area delete/undo','lock manual and automatic camera','5 import formats','real Google DOM adapter with synthetic HTML','query-first 2x2 order','bounded About AR/EN'],searches,results:final.resultsCount};fs.writeFileSync(path.join(out,'r2-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await context.close();}
})().catch(error=>{fs.writeFileSync(path.join(out,'r2-failure.txt'),error.stack||String(error));console.error(error);process.exitCode=1;});

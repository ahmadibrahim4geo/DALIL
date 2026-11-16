/* Real MV3/Leaflet journeys with controlled Google-origin DOM, no live coverage claim. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.DALIL_PLAYWRIGHT_MODULE||'playwright');
const out=process.env.DALIL_BROWSER_EVIDENCE_DIR;if(!out)throw Error('Set DALIL_BROWSER_EVIDENCE_DIR');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const extension=path.resolve(__dirname,'..'),errors=[],visits=[];let mode='complete';
 const context=await chromium.launchPersistentContext(path.join(out,'profile-'+Date.now()),{channel:'chromium',headless:true,
  viewport:{width:1500,height:1000},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try{
  await context.route('https://**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='www.google.com'||!u.pathname.startsWith('/maps')||route.request().resourceType()!=='document')return route.abort();
   const q=decodeURIComponent(u.pathname.split('/maps/search/')[1]?.split('/')[0]||'');
   const camera=u.pathname.match(/@(-?[\d.]+),(-?[\d.]+)/),lat=camera?+camera[1]:30.005,lng=camera?+camera[2]:31.005;
   const visit=visits.length;if(q)visits.push({q,lat,lng,mode});
   const card=(i,name='Venue '+i)=>`<div class="Nv2PK"><a class="hfpxzc" aria-label="${name}" href="https://www.google.com/maps/place/venue-${i}/data=!3d${lat}!4d${lng+i*.000001}">${name}</a><div class="W4Efsd fontBodyMedium">Mosque</div></div>`;
   const count=mode==='refine'?(visit===0?2:1):3;
   const body=`<input role="combobox" value="${q}"><div role="feed" style="height:400px;overflow:auto"><div id="batch" style="min-height:1800px">${Array.from({length:count},(_,i)=>card(mode==='refine'?visit*10+i:i)).join('')}</div>${mode==='complete'||mode==='refine'?'<span class="HlvSq">You\'ve reached the end of the list</span>':''}</div>`;
   const script=mode==='virtual'?`<script>let batch=0,pending=false;const feed=document.querySelector('[role=feed]');feed.addEventListener('scroll',()=>{if(pending||batch>=10)return;pending=true;setTimeout(()=>{batch++;document.getElementById('batch').innerHTML=Array.from({length:3},(_,i)=>'<div class="Nv2PK"><a class="hfpxzc" aria-label="Virtual '+(batch*3+i)+'" href="https://www.google.com/maps/place/virtual-'+(batch*3+i)+'/data=!3d${lat}!4d'+(${lng}+(batch*3+i)*.000001)+'">Virtual '+(batch*3+i)+'</a><div class="W4Efsd">Mosque</div></div>').join('');if(batch===10)feed.insertAdjacentHTML('beforeend',"<span class='HlvSq'>You've reached the end of the list</span>");pending=false;},100);});<\/script>`:'';
   return route.fulfill({contentType:'text/html; charset=utf-8',body:'<!doctype html><html lang="en"><body>'+body+script+'</body></html>'});
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),id=worker.url().split('/')[2];
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{errors.push(d.message());await d.accept();});
  await page.goto(`chrome-extension://${id}/dashboard/dashboard.html`);await page.waitForFunction(()=>!!window.__dalilViewportLock);
  const command=request=>page.evaluate(request=>chrome.runtime.sendMessage(request),request);
  const poll=async(fn,timeout=45000)=>{const until=Date.now()+timeout;while(Date.now()<until){if(await fn())return;await page.waitForTimeout(100);}throw Error('Timeout '+JSON.stringify({errors,visits,state:await command({action:'GET_STATUS'})}));};
  await page.locator('[data-route="setup"]').click();
  const geometry={type:'Polygon',coordinates:[[[31,30],[31.01,30],[31.01,30.01],[31,30.01],[31,30]]]};
  await page.locator('#studyAreaFileInput').setInputFiles({name:'survey.geojson',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(geometry))});
  await poll(async()=>(await command({action:'GET_GRID'})).cells.length===25);
  const initialWorkspace=(await command({action:'GET_WORKSPACE'})).workspace;
  await page.locator('#btnStartDrawRect').click();assert.equal(await page.locator('#btnStartDrawRect').getAttribute('aria-pressed'),'true');
  await page.locator('#btnDrawPolygon').click();assert.equal(await page.locator('#btnDrawPolygon').getAttribute('aria-pressed'),'true');
  assert.equal(await page.locator('#btnStartDrawRect').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#btnStartDrawRect').evaluate(el=>el.classList.contains('primary')),false);
  const canvas=await page.locator('#map').boundingBox();
  await page.mouse.click(canvas.x+200,canvas.y+130);await page.mouse.move(canvas.x+350,canvas.y+150);
  assert(await page.locator('path[stroke="#06b6d4"]').count()>0,'Draft responds after its first vertex');
  await page.mouse.click(canvas.x+350,canvas.y+150);await page.mouse.click(canvas.x+300,canvas.y+280);
  await page.locator('#btnFinishDrawing').click();await poll(async()=>!!(await command({action:'GET_WORKSPACE'})).workspace.drawnStudyArea);
  await page.screenshot({path:path.join(out,'polygon-and-grid.png'),fullPage:true});
  assert.equal(await page.locator('#btnDrawPolygon').getAttribute('aria-pressed'),'false');
  assert(await page.locator('path[stroke="#06b6d4"][stroke-width="4"]').count()>0);
  assert.equal(await page.locator('#showUnscannedDiscoveries').isChecked(),true);
  // A source worker carries the full 25-cell denominator, independent of term count.
  let ws=(await command({action:'GET_WORKSPACE'})).workspace;
  const config={provider:'google_maps_dom',queriesToRun:['mosque'],bilingualEnabled:false,searchLocale:'en',uiLanguage:'ar',
    customCells:initialWorkspace.cells,studyArea:initialWorkspace.importedStudyArea,scrollDelay:500,maxPerCell:120};
  mode='hold';assert.equal((await command({action:'START_SCRAPING',config})).success,true);
  await poll(()=>context.pages().some(p=>p.url().includes('/maps/search/')));
  let source=context.pages().find(p=>p.url().includes('/maps/search/'));await source.locator('#__gmaps_scraper_overlay').waitFor();
  const overlayText=await source.locator('#__gmaps_scraper_overlay').innerText();assert(overlayText.includes('1 / 25'),overlayText);
  const handle=await source.locator('[data-dalil-drag]').boundingBox();
  const before=await source.locator('#__gmaps_scraper_overlay').boundingBox();
  await source.mouse.move(handle.x+30,handle.y+10);await source.mouse.down();await source.mouse.move(handle.x+260,handle.y+110,{steps:6});await source.mouse.up();
  const after=await source.locator('#__gmaps_scraper_overlay').boundingBox();assert(after.x-before.x>150);assert(after.y-before.y>50);
  assert.equal((await command({action:'PAUSE_SCRAPING'})).success,true);await source.waitForTimeout(800);
  assert.equal(await source.locator('#__dalil_overlay_phase').textContent(),'متوقف مؤقتًا');
  const paused=await source.locator('#__gmaps_scraper_overlay').boundingBox();assert.equal(Math.round(paused.x),Math.round(after.x));
  await source.screenshot({path:path.join(out,'dragged-paused-overlay.png')});
  assert.equal((await command({action:'STOP_SCRAPING'})).success,true);await poll(()=>source.isClosed());
  assert.equal((await command({action:'GET_STATUS'})).status,'stopped');
  // Use one small owning cell to exercise extraction, refinement and reopen.
  await page.locator('[data-route="setup"]').click();await page.locator('#inputGridRowsNum').fill('1');await page.locator('#inputGridColsNum').fill('1');
  await page.locator('#studyAreaFileInput').setInputFiles({name:'survey-small.geojson',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(geometry))});
  await poll(async()=>(await command({action:'GET_GRID'})).cells.length===1);ws=(await command({action:'GET_WORKSPACE'})).workspace;
  const small={...config,customCells:ws.cells,studyArea:ws.importedStudyArea};
  mode='virtual';assert.equal((await command({action:'START_SCRAPING',config:small})).success,true);
  await poll(async()=>(await command({action:'GET_STATUS'})).status==='completed');
  let state=await command({action:'GET_STATE'});assert.equal(state.resultsCount,33);assert.equal(state.currentIndex,1);
  assert.equal((await command({action:'GET_GRID'})).cells[0].status,'done');
  mode='complete';assert.equal((await command({action:'START_SCRAPING',config:{...small,clearPreviousData:false}})).success,true);
  await poll(async()=>(await command({action:'GET_STATUS'})).status==='completed');
  state=await command({action:'GET_STATE'});assert.equal(state.resultsCount,33);
  await page.reload();await page.locator('[data-route="workspace"]').click();
  await page.waitForFunction(()=>document.querySelectorAll('.dalil-gis-symbol').length===33);
  assert.equal(await page.locator('#quickGridBadge').textContent(),'1 خلية','Reopening restores the quick grid counter too');
  await page.screenshot({path:path.join(out,'reopened-results.png'),fullPage:true});
  visits.length=0;mode='refine';assert.equal((await command({action:'START_SCRAPING',config:{...small,maxPerCell:2}})).success,true);
  await poll(async()=>(await command({action:'GET_STATUS'})).status==='completed');
  state=await command({action:'GET_STATE'});assert.equal(visits.length,5);assert.equal(state.resultsCount,6);assert.equal(state.stats.totalCells,1);
  const cell=(await command({action:'GET_GRID'})).cells[0];assert.equal(cell.statusByQuery.Q1.scans.length,5);assert.equal(cell.statusByQuery.Q1.status,'complete');
  assert(state.results.every(r=>r.ownerCellId===cell.id));assert.deepEqual(errors,[]);
  const report={status:'passed',browser:context.browser().version(),virtualizedPlaces:33,detailViews:5,refinedPlaces:6,
    checks:['drawing tool selection and first-vertex feedback','separate fixed study boundary','25-cell HUD denominator','drag position survives pause','pause and final stop','recycled DOM extraction','retained results on new job and dashboard reload','bounded detail scans and original owner cell'],
    limitation:'Controlled source HTML. Completeness of live Fayoum / Google Maps is not verified.'};
  fs.writeFileSync(path.join(out,'survey-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await context.close();}
})().catch(error=>{fs.writeFileSync(path.join(out,'survey-failure.txt'),error.stack||String(error));console.error(error);process.exitCode=1;});

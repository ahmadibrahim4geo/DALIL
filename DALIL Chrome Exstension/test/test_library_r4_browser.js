/* Native MV3 QA; Google-origin documents are controlled synthetic fixtures. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.DALIL_PLAYWRIGHT_MODULE||'playwright');
const out=process.env.DALIL_BROWSER_EVIDENCE_DIR;if(!out)throw Error('Set DALIL_BROWSER_EVIDENCE_DIR');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const extension=path.resolve(__dirname,'..'),errors=[],alerts=[],visits=[];let drift=false;
 const context=await chromium.launchPersistentContext(path.join(out,'profile-'+Date.now()),{channel:'chromium',headless:true,viewport:{width:1500,height:1000},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try{
  await context.route('https://**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='www.google.com'&&u.pathname.startsWith('/maps')&&route.request().resourceType()==='document'){
    const query=decodeURIComponent(u.pathname.split('/maps/search/')[1]?.split('/')[0]||''),camera=u.pathname.match(/@(-?[\d.]+),(-?[\d.]+)/);
    if(query&&camera)visits.push({query,lat:Number(camera[1]),lng:Number(camera[2]),drift});
    const cards=query==='r4-empty'?'<div class="section-no-result">No results found</div>':[['First mosque',31.004,30.005],['Early second mosque',31.016,30.005]].map(([name,x,y])=>`<div class="Nv2PK"><a class="hfpxzc" aria-label="${name}" href="https://www.google.com/maps/place/${name.replaceAll(' ','-')}/data=!3d${y}!4d${x}">${name}</a><div class="qBF1Pd">${name}</div></div>`).join('');
    const normalize=`const u=new URL(location.href);u.pathname=u.pathname.replace(/,([0-9.]+)z/,',941m');const token=u.pathname.split('/maps/search/')[1]?.split('/')[0];if(token)u.pathname=u.pathname.replace(token,token+'%E2%80%AD');u.hash='';u.searchParams.delete('dalil_task');history.replaceState(null,'',u.href);`;
    const move=drift?`setTimeout(()=>{const u=new URL(location.href);u.pathname=u.pathname.replace(/@(-?[0-9.]+),(-?[0-9.]+)/,(_,y,x)=>'@'+y+','+(Number(x)+0.02));history.replaceState(null,'',u.href);},700);`:'';
    return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html><body><input role="combobox" aria-label="Search Google Maps" value="${query}"><div role="feed" style="height:500px;overflow:auto">${cards}<span class="HlvSq">You've reached the end of the list</span></div><script>${normalize}${move}</script></body></html>`});
   }return route.abort();
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),id=worker.url().split('/')[2],page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.accept();});
  const command=request=>page.evaluate(request=>chrome.runtime.sendMessage(request),request),workspace=async()=>(await command({action:'GET_WORKSPACE'})).workspace;
  const poll=async(predicate,timeout=20000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await predicate())return;await page.waitForTimeout(80);}throw Error('Timed out waiting for library/grid state');};
  await page.goto(`chrome-extension://${id}/dashboard/dashboard.html`);await page.waitForFunction(()=>!!window.__dalilViewportLock);await page.locator('[data-route="setup"]').click();
  await page.locator('#inputGridRowsNum').fill('1');await page.locator('#inputGridColsNum').fill('2');
  const geometry={type:'Polygon',coordinates:[[[31,30],[31.02,30],[31.02,30.01],[31,30.01],[31,30]]]};
  await page.locator('#studyAreaFileInput').setInputFiles({name:'two-cells.geojson',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(geometry))});
  await poll(async()=>(await workspace()).cells.length===2);await poll(async()=>await page.locator('path[data-cell-id][data-grid-status="pending"]').count()===2);
  const colors=await page.locator('path[data-cell-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('stroke')));assert.deepEqual(colors,['#2563eb','#2563eb']);
  assert.equal(await page.locator('path[stroke="#f59e0b"]').count(),0,'No stale active cell before search');
  await page.locator('[data-route="phenomena"]').click();
  await page.locator('#taxSector_S01 .tax-sector-header').click();const mosque=page.locator('.tax-leaf-btn[data-leaf="google_places:mosque"]');assert.equal(await mosque.count(),1);assert.match(await mosque.getAttribute('title'),/مسجد تاريخي/);
  assert.equal(await page.locator('.tax-leaf-btn').filter({hasText:'مسجد كبير'}).count(),0);
  assert.ok(await page.locator('.tax-sector-title .tax-symbol').count()>=31);assert.ok(await page.locator('.tax-branch-header .tax-symbol').count()>=114);
  await mosque.click();assert.deepEqual(await page.evaluate(()=>new Promise(resolve=>chrome.storage.local.get('savedPhenomena',resolve))),{savedPhenomena:['google_places:mosque']});
  await page.locator('#sideBilingualToggle').uncheck();
  await page.locator('[data-route="workspace"]').click();
  const s=await workspace(),config={provider:'google_maps_dom',searchLocale:'en',uiLanguage:'en',query:'google_places:mosque',queriesToRun:['google_places:mosque'],studyArea:s.importedStudyArea,customCells:s.cells,customBounds:s.importedStudyArea.bounds,clearPreviousData:true,bilingualEnabled:false,delayMs:12000,maxPerCell:20};
  assert.equal((await command({action:'START_SCRAPING',config})).success,true);
  await poll(async()=>{const state=await command({action:'GET_STATUS'});return state.resultsCount===2&&state.currentIndex===1;});
  assert.equal((await command({action:'PAUSE_SCRAPING'})).success,true);
  await poll(async()=>await page.locator('.dalil-gis-symbol').count()===1);assert.equal(await page.locator('path[data-grid-status="pending"]').count(),1);assert.equal(await page.locator('path[data-grid-status="complete"]').count(),1);
  assert.match(await page.locator('#mapDiscoveryNotice').textContent(),/1/);assert.equal(await page.locator('.dalil-gis-symbol img').getAttribute('src'),'../'+require('../core/symbology').resolve('google_places:mosque').pngPath);
  await page.locator('#showUnscannedDiscoveries').check();assert.equal(await page.locator('.dalil-gis-symbol').count(),2);assert.equal(await page.locator('.is-early-discovery').count(),1);
  await page.screenshot({path:path.join(out,'early-discoveries-ar.png'),fullPage:true,animations:'disabled'});await page.locator('#showUnscannedDiscoveries').uncheck();
  assert.equal((await command({action:'RESUME_SCRAPING'})).success,true);
  await poll(async()=>await page.locator('path[data-grid-status="processing"]').count()===1,25000);
  await poll(async()=>await page.locator('.dalil-gis-symbol').count()===2);
  const source=context.pages().find(p=>p.url().includes('/maps/search/'));await source.locator('#__dalil_overlay_camera').waitFor();await source.screenshot({path:path.join(out,'source-camera.png')});
  await poll(async()=>(await command({action:'GET_STATUS'})).status==='completed',30000);const done=await command({action:'GET_STATUS'});assert.equal(done.navigationEvidence.verified,true);assert.equal(done.navigationEvidence.observed.unit,'m');
  await poll(async()=>await page.locator('path[data-grid-status="complete"]').count()===2);assert.notEqual(visits[0].lng,visits[1].lng);assert.equal(done.resultsCount,2);
  await page.screenshot({path:path.join(out,'completed-grid-ar.png'),fullPage:true,animations:'disabled'});
  await page.locator('[data-route="about"]').click();const brand=await page.locator('.about-brand-logo').boundingBox(),dev=await page.locator('.about-dev-logo').boundingBox();assert.equal(brand.width,84);assert.equal(dev.width,brand.width);assert.equal(dev.height,brand.height);await page.screenshot({path:path.join(out,'about-ar.png'),fullPage:true,animations:'disabled'});
  await page.locator('#btnLangToggle').click();await page.locator('[data-route="phenomena"]').click();assert.equal(await page.locator('body').evaluate(el=>/[\u0600-\u06ff]/.test(el.innerText)),false,'No Arabic UI text in English');assert.equal(await page.locator('#railNav .nav-item.active').getAttribute('data-route'),'phenomena');await page.locator('#taxSector_S01 .tax-sector-header').click();await page.locator('#taxSector_S01').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,'library-en.png'),fullPage:true,animations:'disabled'});
  // A source camera that drifts after readiness must pause the same cell.
  drift=true;assert.equal((await command({action:'START_SCRAPING',config:{...config,queriesToRun:['r4-drift'],query:'r4-drift',delayMs:2500}})).success,true);
  await poll(async()=>(await command({action:'GET_STATUS'})).status==='paused',35000);const failed=await command({action:'GET_STATUS'});assert.equal(failed.pauseReason,'NAVIGATION_VIEW_MISMATCH');assert.equal(failed.currentIndex,0);assert.equal(failed.resultsCount,0);
  await command({action:'STOP_SCRAPING'});drift=false;
  assert.equal((await command({action:'START_SCRAPING',config:{...config,queriesToRun:['r4-empty'],query:'r4-empty',delayMs:2500}})).success,true);
  await poll(async()=>(await command({action:'GET_STATUS'})).status==='completed',35000);
  await page.locator('[data-route="workspace"]').click();await poll(async()=>await page.locator('path[data-grid-status="confirmed_empty"]').count()===2);
  const emptyColors=await page.locator('path[data-cell-id]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('stroke')));assert.deepEqual(emptyColors,['#64748b','#64748b']);
  await page.screenshot({path:path.join(out,'verified-empty-grid-en.png'),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);
  const report={status:'passed',browser:context.browser().version(),visits,checks:['new grid is blue; legend contract','canonical mosque picker and local icons at all hierarchy levels','early owner-cell discoveries hidden by default; explicit dashed preview','map and library mosque use local PNG','real source URL z-to-m normalization; distinct cell cameras','camera drift pauses without results or task advance','completed grid green; verified-empty grid grey','developer and tool logo 84x84','English library contains no Arabic UI']};
  fs.writeFileSync(path.join(out,'r4-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await context.close();}
})().catch(error=>{fs.writeFileSync(path.join(out,'r4-failure.txt'),error.stack||String(error));console.error(error);process.exitCode=1;});

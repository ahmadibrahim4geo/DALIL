/* Real MV3/UI test with controlled Google-origin documents; no live-provider claim. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.DALIL_PLAYWRIGHT_MODULE||'playwright');
const out=process.env.DALIL_BROWSER_EVIDENCE_DIR;if(!out)throw Error('Set DALIL_BROWSER_EVIDENCE_DIR');fs.mkdirSync(out,{recursive:true});
(async()=>{
 const extension=path.resolve(__dirname,'..'),errors=[],alerts=[],visits=[];
 const context=await chromium.launchPersistentContext(path.join(out,'profile-'+Date.now()),{channel:'chromium',headless:true,viewport:{width:1500,height:1000},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
 try{
  const escape=s=>s.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  await context.route('https://**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='www.google.com'&&u.pathname.startsWith('/maps')&&route.request().resourceType()==='document'){
    const query=decodeURIComponent(u.pathname.split('/maps/search/')[1]?.split('/')[0]||''),hl=u.searchParams.get('hl')||'und';
    if(query)visits.push({query,hl});
    return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html lang="${escape(hl)}"><body><input role="combobox" aria-label="Search Google Maps" value="${escape(query)}"><div role="feed" style="height:500px;overflow:auto"><div class="Nv2PK"><a class="hfpxzc" aria-label="Fixture venue" href="https://www.google.com/maps/place/Fixture/data=!3d30.005!4d31.005">Fixture venue</a><div class="qBF1Pd">Fixture venue</div></div><span class="HlvSq">You've reached the end of the list</span></div></body></html>`});
   }return route.abort();
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),id=worker.url().split('/')[2],page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.accept();});
  const command=request=>page.evaluate(request=>chrome.runtime.sendMessage(request),request);
  const stored=key=>page.evaluate(async key=>(await chrome.storage.local.get(key))[key],key);
  const poll=async(predicate,timeout=25000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await predicate())return;await page.waitForTimeout(80);}await page.screenshot({path:path.join(out,'failure-screen.png'),fullPage:true});throw Error('Timed out waiting for multilingual state: '+JSON.stringify({errors,alerts,saved:await stored('savedPhenomena'),chipCount:await page.locator('.phenom-chip').count(),visits}));};
  const route=async view=>page.locator(`[data-route="${view}"]`).click();
  const locale=async value=>{await route('setup');const known=await page.locator('#searchLocale option').evaluateAll((nodes,value)=>nodes.some(n=>n.value===value),value);await page.locator('#searchLocale').selectOption(known?value:'__custom__');if(!known){await page.locator('#customSearchLocale').fill(value);await page.locator('#customSearchLocale').dispatchEvent('change');}};
  const clear=async()=>{await route('phenomena');await page.locator('#btnClearAllPhenomena').click();await poll(async()=>JSON.stringify(await stored('savedPhenomena'))==='[]');};
  const choose=async(canonical,sector)=>{await route('phenomena');const node=page.locator(`#taxSector_${sector}`);if(!(await node.getAttribute('class')).includes('expanded'))await node.locator('.tax-sector-header').click();await page.locator(`.tax-leaf-btn[data-leaf="${canonical}"]`).click();};
  const start=async()=>{await route('workspace');await page.locator('#btnTopStart').click();};
  const finish=async()=>{await poll(async()=>['running','completed','paused','error'].includes((await command({action:'GET_STATUS'})).status));await poll(async()=>{const state=await command({action:'GET_STATUS'});if(['paused','error'].includes(state.status))throw Error(JSON.stringify(state));return state.status==='completed';},110000);};
  await page.goto(`chrome-extension://${id}/dashboard/dashboard.html`);await page.waitForFunction(()=>!!window.__dalilViewportLock);
  assert.ok(await page.locator('#searchLocale option').count()>80);
  await route('setup');await page.locator('#inputGridRowsNum').fill('1');await page.locator('#inputGridColsNum').fill('1');
  const geometry={type:'Polygon',coordinates:[[[31,30],[31.01,30],[31.01,30.01],[31,30.01],[31,30]]]};
  await page.locator('#studyAreaFileInput').setInputFiles({name:'locale-fixture.geojson',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(geometry))});
  await poll(async()=>(await command({action:'GET_WORKSPACE'})).workspace.cells.length===1);
  const selections=[['fr','  mosquée  '],['es-AR','panadería'],['de-DE','Apotheke'],['zh-CN','清真寺'],['ja','図書館'],['pt-BR','padaria'],['hi','विद्यालय']];
  for(const [lang,text] of selections){await locale(lang);await route('phenomena');await page.locator('#inputNewPhenomenon').fill(text);await page.locator('#btnAddPhenomenon').click();}
  const expected=selections.map(([locale,text])=>({kind:'free_text',text,locale}));await poll(async()=>require('node:util').isDeepStrictEqual(await stored('savedPhenomena'),expected));
  await page.locator('#btnLangToggle').click();assert.equal(await page.locator('html').getAttribute('lang'),'en');await page.reload();
  await route('phenomena');await poll(async()=>{if(errors.length)throw Error(JSON.stringify(errors));return await page.locator('#activePhenomenaContainer .phenom-chip').count()===7;});
  assert.deepEqual(await stored('savedPhenomena'),expected);assert.equal((await stored('searchLanguageSettings')).locale,'hi');
  assert.deepEqual((await command({action:'GET_WORKSPACE'})).workspace.importedStudyArea.geometry,geometry);
  await start();await finish();let state=await command({action:'GET_STATUS'});
  assert.deepEqual(state.config.queriesToRun,selections.map(v=>v[1]));assert.deepEqual(visits.map(v=>v.hl),selections.map(v=>v[0]));assert.deepEqual(visits.map(v=>v.query),selections.map(v=>v[1]));
  await page.screenshot({path:path.join(out,'multilingual-completed.png'),fullPage:true});
  await clear();await locale('fr');await choose('google_places:bakery','S02');await page.locator('#translationReviewPanel').waitFor({state:'visible'});
  const previousJob=state.jobId,priorVisits=visits.length;await start();await poll(async()=>alerts.length===1);state=await command({action:'GET_STATUS'});assert.equal(state.jobId,previousJob);assert.equal(visits.length,priorVisits);
  await page.locator('.query-term-override').fill('boulangerie');await page.locator('#btnSaveQueryTerms').click();await page.locator('#translationReviewPanel').waitFor({state:'hidden'});await start();await finish();
  assert.deepEqual(visits.at(-1),{query:'boulangerie',hl:'fr'});assert.equal((await stored('searchLanguageSettings')).queryTerms['google_places:bakery'].fr,'boulangerie');
  await clear();await locale('fr');await choose('google_places:car_wash','S14');await page.locator('#translationReviewPanel').waitFor({state:'visible'});await locale('fr');await page.locator('#allowEnglishSearchFallback').check();
  await route('phenomena');await page.locator('#translationReviewPanel').waitFor({state:'hidden'});await start();await finish();
  assert.deepEqual(visits.at(-1),{query:'Car wash',hl:'en'});assert.equal((await command({action:'GET_STATUS'})).config.searchLocale,'fr');
  const persisted=await stored('scraperState');assert.equal(persisted.queryPlan.fallbacks.length,1);
  await locale('invalid_locale!');await start();await poll(async()=>alerts.length===2);assert.equal(visits.length,priorVisits+2);
  await clear();await page.reload();await poll(async()=>await page.locator('.phenom-chip').count()===0);assert.deepEqual(await stored('savedPhenomena'),[]);
  assert.deepEqual(errors,[]);
  const report={status:'passed',browser:context.browser().version(),visits,expectedAlerts:alerts.length,checks:['seven verbatim free-text locales survive interface change and reload','each Google URL uses its own requested hl and term','missing category translation blocks before changing job','manual French query term saved and executed','English fallback is explicit and uses hl=en','invalid BCP47 blocks requests','clearing all targets persists across reload','source documents are controlled fixtures; worldwide live coverage not tested']};
  fs.writeFileSync(path.join(out,'languages-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await context.close();}
})().catch(error=>{fs.writeFileSync(path.join(out,'languages-failure.txt'),error.stack||String(error));console.error(error);process.exitCode=1;});

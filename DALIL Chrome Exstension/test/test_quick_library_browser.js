/* Real MV3 service-worker/UI/navigation QA against controlled source documents. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.DALIL_PLAYWRIGHT_MODULE||'playwright');
const out=process.env.DALIL_BROWSER_EVIDENCE_DIR;if(!out)throw Error('Set DALIL_BROWSER_EVIDENCE_DIR');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const extension=path.resolve(__dirname,'..'),errors=[],alerts=[],visits=[];
 const context=await chromium.launchPersistentContext(path.join(out,'profile-'+Date.now()),{
  channel:'chromium',headless:true,viewport:{width:1500,height:1000},
  args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]
 });
 try{
  const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
  await context.route('https://**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='www.google.com'&&u.pathname.startsWith('/maps')&&route.request().resourceType()==='document'){
    const term=decodeURIComponent(u.pathname.split('/maps/search/')[1]?.split('/')[0]||''),hl=u.searchParams.get('hl');
    if(term)visits.push({term,hl});
    const cards=['Pizza restaurant','Seafood restaurant','Unmapped fixture activity'].map((category,i)=>
     `<div class="Nv2PK"><a class="hfpxzc" aria-label="Venue ${i}" href="https://www.google.com/maps/place/Venue-${i}/data=!3d30.005!4d${31.003+i*.001}">Venue ${i}</a><div class="qBF1Pd">Venue ${i}</div><div class="W4Efsd">${category}</div></div>`).join('');
    return route.fulfill({contentType:'text/html; charset=utf-8',body:`<!doctype html><html lang="${escape(hl)}"><body><input role="combobox" aria-label="Search Google Maps" value="${escape(term)}"><div role="feed" style="height:500px;overflow:auto">${cards}<span class="HlvSq">You've reached the end of the list</span></div></body></html>`});
   }
   return route.abort();
  });
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker'),id=worker.url().split('/')[2],page=await context.newPage();
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',async d=>{alerts.push(d.message());await d.accept();});
  const command=request=>page.evaluate(request=>chrome.runtime.sendMessage(request),request);
  const stored=key=>page.evaluate(async key=>(await chrome.storage.local.get(key))[key],key);
  const view=async name=>page.locator(`[data-route="${name}"]`).click();
  const poll=async(predicate,timeout=35000)=>{const end=Date.now()+timeout;while(Date.now()<end){if(await predicate())return;await page.waitForTimeout(100);}throw Error('Timed out: '+JSON.stringify({errors,alerts,visits}));};
  const clear=async()=>{await view('phenomena');await page.locator('#btnClearAllPhenomena').click();await poll(async()=>JSON.stringify(await stored('savedPhenomena'))==='[]');};
  const locale=async code=>{await view('setup');const known=await page.locator('#searchLocale option').evaluateAll((nodes,code)=>nodes.some(n=>n.value===code),code);await page.locator('#searchLocale').selectOption(known?code:'__custom__');if(!known){await page.locator('#customSearchLocale').fill(code);await page.locator('#customSearchLocale').dispatchEvent('change');}};
  const start=async()=>{await view('workspace');await page.locator('#btnTopStart').click();};
  const finish=async()=>poll(async()=>(await command({action:'GET_STATUS'})).status==='completed');
  await page.goto(`chrome-extension://${id}/dashboard/dashboard.html`);await page.waitForFunction(()=>!!window.__dalilViewportLock);
  await view('phenomena');assert.equal(await page.locator('.suggest-chip').count(),38);
  for(const [preset,type] of [['hotels','hotel'],['companies','corporate_office'],['factories','manufacturer']]){
   assert.equal(await page.locator(`.suggest-chip[data-phenom="quick:${preset}"] img`).getAttribute('data-symbol-id'),'dalil.google-places-'+type.replaceAll('_','-'));
  }
  assert.equal(await page.locator('.suggest-chip:visible').count(),12);await page.locator('#btnQuickLibraryMore').click();assert.equal(await page.locator('.suggest-chip:visible').count(),38);
  assert.equal(await page.locator('#btnQuickLibraryMore').getAttribute('aria-expanded'),'true');
  assert.equal(await page.locator('.tax-leaf-btn[data-leaf="google_places:truck_dealer"]').count(),1);
  await page.locator('#taxSearchInput').fill('truck_dealer');await page.locator('.tax-leaf-btn[data-leaf="google_places:truck_dealer"]').waitFor({state:'visible'});
  await page.locator('.tax-leaf-btn[data-leaf="google_places:truck_dealer"]').click();await poll(async()=>(await stored('savedPhenomena')).includes('google_places:truck_dealer'));
  await page.locator('#btnTaxSearchClear').click();await clear();
  await page.locator('.suggest-chip[data-phenom="quick:restaurants"]').click();assert.equal(await page.locator('.phenom-chip').count(),1);
  assert.deepEqual(await stored('savedPhenomena'),['quick:restaurants']);await page.locator('#sideBilingualToggle').uncheck();
  await page.screenshot({path:path.join(out,'quick-library-ar.png'),fullPage:true,animations:'disabled'});
  await view('setup');await page.locator('#inputGridRowsNum').fill('1');await page.locator('#inputGridColsNum').fill('1');
  const geometry={type:'Polygon',coordinates:[[[31,30],[31.01,30],[31.01,30.01],[31,30.01],[31,30]]]};
  await page.locator('#studyAreaFileInput').setInputFiles({name:'quick-fixture.geojson',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(geometry))});
  await poll(async()=>(await command({action:'GET_WORKSPACE'})).workspace.cells.length===1);
  await start();await finish();let status=await command({action:'GET_STATUS'});
  assert.deepEqual(status.config.queriesToRun,['مطاعم']);assert.equal(status.resultsCount,3);
  const saved=await stored('scraperState');assert.equal(saved.results.length,3);
  assert.deepEqual(saved.results.map(p=>p.category),['Pizza restaurant','Seafood restaurant','Unmapped fixture activity']);
  assert.deepEqual(saved.results.slice(0,2).map(p=>p.canonicalId),['google_places:pizza_restaurant','google_places:seafood_restaurant']);
  await poll(async()=>await page.locator('.dalil-gis-symbol').count()===3);
  const symbols=await page.locator('.dalil-gis-symbol img').evaluateAll(nodes=>nodes.map(n=>n.dataset.symbolId));
  assert(symbols.includes('dalil.unclassified'));assert.equal(new Set(symbols).size,3);
  assert.equal(await page.locator('.map-canvas #mapSymbolLegend').count(),0);
  await page.locator('.result-symbols-panel summary').click();await page.locator('#mapSymbolLegend').waitFor({state:'visible'});
  const labels=await page.locator('#mapSymbolLegend [role="listitem"] span').allTextContents();
  assert.deepEqual(labels,['Pizza restaurant','Seafood restaurant','Unmapped fixture activity']);
  await poll(async()=>/مكتمل/.test(await page.locator('#quickPhenomChipsContainer').textContent()));
  await page.screenshot({path:path.join(out,'source-classification-map-ar.png'),fullPage:true,animations:'disabled'});
  // A custom word equal to a library/sector identifier remains literal in BOTH entry points.
  await clear();await locale('ja');await view('workspace');await page.locator('#inputQuickPhenom').fill('  S01  ');await page.locator('#btnQuickAddPhenom').click();
  assert.deepEqual(await stored('savedPhenomena'),[{kind:'free_text',text:'  S01  ',locale:'ja'}]);
  await start();await finish();assert.deepEqual(visits.at(-1),{term:'  S01  ',hl:'ja'});
  await clear();await locale('fr-CA');await view('phenomena');await page.locator('#inputNewPhenomenon').fill('  مسجد  ');await page.locator('#btnAddPhenomenon').click();
  assert.deepEqual(await stored('savedPhenomena'),[{kind:'free_text',text:'  مسجد  ',locale:'fr-CA'}]);
  await page.reload();await view('phenomena');assert.equal(await page.locator('.phenom-chip').count(),1);
  await start();await finish();assert.deepEqual(visits.at(-1),{term:'  مسجد  ',hl:'fr-CA'});
  // Broad mosque family remains one target; only its compact French phrases execute.
  await clear();await locale('fr-CA');await view('phenomena');await page.locator('.suggest-chip[data-phenom="quick:mosques"]').click();
  assert.equal(await page.locator('.phenom-chip').count(),1);await start();await finish();
  status=await command({action:'GET_STATUS'});assert.deepEqual(status.config.queriesToRun,['Mosquée','Salle de prière','Zaouïa']);
  assert(visits.slice(-3).every(v=>v.hl==='fr-CA'));
  // The whole quick library has authored phrases in these search locales.
  for(const code of ['de-DE','es-419','pt-BR','hi','zh-Hant-TW']){
   await locale(code);await view('phenomena');assert.equal(await page.locator('#translationReviewPanel').isVisible(),false);
  }
  await locale('qaa-Qaaa');await view('phenomena');assert.equal(await page.locator('#translationReviewPanel').isVisible(),true);
  await page.locator('.query-term-override').fill('Custom prayer term');await page.locator('#btnSaveQueryTerms').click();await page.locator('#translationReviewPanel').waitFor({state:'hidden'});
  await page.locator('#btnLangToggle').click();assert.equal(await page.locator('html').getAttribute('lang'),'en');
  assert.equal(await page.locator('body').evaluate(el=>/[\u0600-\u06ff]/.test(el.innerText)),false,'English controls remain localized');
  await page.screenshot({path:path.join(out,'quick-library-en.png'),fullPage:true,animations:'disabled'});
  assert.deepEqual(errors,[]);assert.deepEqual(alerts,[]);
  const report={status:'passed',browser:context.browser().version(),quickTargets:38,visits,checks:['38 quick choices, show more and one-target selection','previously hidden official type can be searched/selected','literal typed input in both entry points survives reload and reaches its own hl URL','three actual source categories and symbols from one general query','generic marker for unknown source type','result legend outside map; progress on target chips','compact French mosque family, regional locales and explicit missing-term override','Arabic/English UI'],limitation:'Google-origin documents are controlled fixtures; live completeness was not tested.'};
  fs.writeFileSync(path.join(out,'quick-library-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 }finally{await context.close();}
})().catch(error=>{fs.writeFileSync(path.join(out,'failure.txt'),error.stack||String(error));console.error(error);process.exitCode=1;});

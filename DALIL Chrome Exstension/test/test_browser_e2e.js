/* Optional real MV3 test: use a separate Playwright Chromium and an isolated profile. */
const assert=require('node:assert/strict'),path=require('node:path'),fs=require('node:fs');
const {chromium}=require(process.env.DALIL_PLAYWRIGHT_MODULE||'playwright');
const extension=path.resolve(__dirname,'..');
const output=process.env.DALIL_BROWSER_EVIDENCE_DIR;
if(!output)throw new Error('Set DALIL_BROWSER_EVIDENCE_DIR to an isolated evidence directory.');
fs.mkdirSync(output,{recursive:true});
(async()=>{
  const errors=[],dialogs=[];
  const context=await chromium.launchPersistentContext(path.join(output,'profile-'+Date.now()),{channel:'chromium',headless:true,
    viewport:{width:1500,height:980},args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`]});
  try{
    await context.route('https://**/*',route=>route.abort());
    const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:15000});
    const id=worker.url().split('/')[2];
    const poll=async fn=>{const end=Date.now()+20000;while(Date.now()<end){if(await fn())return;await new Promise(r=>setTimeout(r,100));}throw Error('Extension state did not settle');};
    const page=await context.newPage();
    page.on('pageerror',e=>errors.push(e.message));
    page.on('dialog',async d=>{dialogs.push(d.message());await d.accept();});
    await page.goto(`chrome-extension://${id}/dashboard/dashboard.html`);
    await page.evaluate(()=>localStorage.setItem("dalil_lang","ar"));await page.reload();
    await page.waitForFunction(()=>document.querySelector('#btnLangToggle')?.textContent.includes('الإنجليزية'));
    assert.equal(await page.locator('html').getAttribute('dir'),'rtl');
    await page.screenshot({path:path.join(output,'dashboard-ar.png'),fullPage:true});
    await page.locator('#btnLangToggle').click();
    assert.equal(await page.locator('html').getAttribute('lang'),'en');
    const leaks=[];
    for(const view of ['workspace','phenomena','setup','records','about']){
      await page.locator(`[data-route="${view}"]`).click();
      const texts=await page.evaluate(()=>{
        const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT),out=[];let node;
        while(node=walker.nextNode()){
          const element=node.parentElement;
          if(!element||element.closest('script,style,svg')||!element.getClientRects().length)continue;
          const text=node.textContent.trim();if(/[\u0600-\u06ff]/.test(text))out.push(text);
        }return out;
      });
      if(texts.length)leaks.push({view,texts});
    }
    assert.deepEqual(leaks,[],'English UI must not show Arabic UI strings');
    await page.locator('[data-route="setup"]').click();
    await page.locator('#inputGridRowsNum').fill('1');await page.locator('#inputGridColsNum').fill('1');
    const geometry={type:'MultiPolygon',coordinates:[[[[30,29],[32,29],[32,31],[30,31],[30,29]],[[30.1,29.1],[30.2,29.1],[30.2,29.2],[30.1,29.2],[30.1,29.1]]],[[[33,30],[33.1,30],[33.1,30.1],[33,30.1],[33,30]]]]};
    await page.locator('#inputGridRowsNum').fill('1');await page.locator('#inputGridColsNum').fill('1');
    await page.locator('#studyAreaFileInput').setInputFiles({name:'fixture.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify({type:'Feature',properties:{name:'Fixture'},geometry}))});
    await poll(()=>page.evaluate(async()=>!!(await chrome.storage.local.get('workspaceState')).workspaceState?.importedStudyArea));
    const workspace=await page.evaluate(async()=> (await chrome.storage.local.get('workspaceState')).workspaceState);
    assert.deepEqual(workspace.importedStudyArea.geometry,geometry);assert.equal(workspace.cells.length,1);
    await page.locator('#btnClearStudyArea').click();
    await poll(()=>page.evaluate(async()=>!(await chrome.storage.local.get('workspaceState')).workspaceState?.importedStudyArea));
    await page.reload();
    const deleted=await page.evaluate(async()=> (await chrome.runtime.sendMessage({action:'GET_WORKSPACE'})).workspace);
    assert.equal(deleted.importedStudyArea,null);assert.equal(deleted.cells.length,0);
    await page.locator('[data-route="setup"]').click();
    await page.locator('#btnUndoArea').click(); // New page has no undo history; must stay empty.
    assert.equal((await page.evaluate(async()=> (await chrome.runtime.sendMessage({action:'GET_WORKSPACE'})).workspace)).importedStudyArea,null);
    await page.locator('#inputGridRowsNum').fill('1');await page.locator('#inputGridColsNum').fill('1');
    await page.locator('#studyAreaFileInput').setInputFiles({name:'fixture.geojson',mimeType:'application/geo+json',buffer:Buffer.from(JSON.stringify({type:'Feature',properties:{name:'Fixture'},geometry}))});
    await poll(()=>page.evaluate(async()=>!!(await chrome.storage.local.get('workspaceState')).workspaceState?.cells?.length));
    await page.locator('#dataSource').selectOption('osm_overpass');
    await page.locator('[data-route="phenomena"]').click();
    await page.locator('#inputNewPhenomenon').fill('mosque');await page.locator('#btnAddPhenomenon').click();
    // Synthetic provider response tests browser IPC/CSP without sending the fixture to a provider.
    await worker.evaluate(()=>{SourceAdapters.collectOverpass=async task=>({success:true,task:task.identity,
      completenessStatus:'complete',evidence:{provider:'synthetic_fixture',emptyVerified:false},
      items:[{id:'fixture1',place_id:'node/1',provider:'osm_overpass',name:'Fixture venue',x:31,y:30,hasExactCoords:true,
        category:'amenity=place_of_worship',osmTags:{amenity:'place_of_worship',religion:'muslim'},license:'ODbL-1.0'}]});});
    await page.locator('#btnTopStart').click();
    await poll(()=>page.evaluate(async()=> (await chrome.runtime.sendMessage({action:'GET_STATUS'})).status==='completed'));
    const state=await page.evaluate(()=>chrome.runtime.sendMessage({action:'GET_STATE'}));
    assert.equal(state.resultsCount,1);assert.equal(state.results[0].ownerCellId,state.currentCell?.id||'cell_1');
    assert.ok(state.results[0].fieldProvenance.name);
    const downloadPromise=page.waitForEvent('download');
    await page.evaluate(records=>ExportUtils.exportInWorker('kmz',records,'browser-fixture',null,{language:'en'}),state.results);
    const download=await downloadPromise;await download.saveAs(path.join(output,'browser-fixture.kmz'));
    await page.locator('[data-route="workspace"]').click();
    await page.waitForFunction(()=>!document.querySelector('#btnTopStart').classList.contains('hidden'));
    await page.waitForTimeout(400);
    await page.screenshot({path:path.join(output,'dashboard-en.png'),fullPage:true});
    await page.locator("#btnRefresh").click();
    await page.waitForFunction(()=>!document.querySelector("#btnTopStart").classList.contains("hidden"));
    await page.locator('[data-route="setup"]').click();await page.locator('#btnClearStudyArea').click();
    await poll(()=>page.evaluate(async()=> (await chrome.runtime.sendMessage({action:'GET_WORKSPACE'})).workspace.activeAreaId===null));
    await page.reload();const reset=await page.evaluate(()=>chrome.runtime.sendMessage({action:'GET_WORKSPACE'}));
    assert.equal(reset.workspace.activeAreaId,null);assert.equal(reset.workspace.cells.length,0);
    assert.deepEqual(errors,[],'No browser page runtime errors');
    const report={status:'passed',browser:context.browser()?.version(),extensionId:id,views:5,englishUiLeaks:0,
      tests:['AR/EN rendering','real MV3 worker startup','MultiPolygon/holes import','delete/reopen','IPC job with synthetic source','field provenance','local export worker CSP','reset/reopen'],dialogs};
    fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
  }finally{await context.close();}
})().catch(error=>{fs.writeFileSync(path.join(output,'failure.txt'),error.stack||String(error));console.error(error);process.exitCode=1;});

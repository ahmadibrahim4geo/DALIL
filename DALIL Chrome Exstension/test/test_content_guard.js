/* Contract tests for the real content-script listener: navigation nonce, camera
 * verification, block detection visibility and re-injection recovery. */
'use strict';
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const root = path.resolve(__dirname, '..');

function createPage({ href = 'https://www.google.com/maps/', innerText = '', blockNodes = [] } = {}) {
  const listeners = [];
  const windowObject = { location: { href }, innerWidth: 1280, innerHeight: 800 };
  const documentObject = {
    readyState: 'complete',
    body: { innerText },
    querySelector: () => null,
    querySelectorAll: selector => (/recaptcha|sorry|captcha/i.test(selector) ? blockNodes : []),
    getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => null }),
    documentElement: { lang: 'en' }
  };
  const context = vm.createContext({
    console, URL, URLSearchParams, setTimeout, clearTimeout, module: { exports: {} }, window: windowObject, document: documentObject,
    chrome: {
      runtime: {
        id: 'dalil-test',
        onMessage: {
          addListener: fn => listeners.push(fn),
          removeListener: fn => { const at = listeners.indexOf(fn); if (at >= 0) listeners.splice(at, 1); }
        }
      }
    }
  });
  context.importScripts = () => {};
  const reload = () => vm.runInContext(fs.readFileSync(path.join(root, 'content/content.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, 'core/search-navigation.js'), 'utf8'), context);
  reload();
  const send = request => new Promise(resolve => {
    const handler = listeners[listeners.length - 1];
    assert.ok(handler, 'content script must register a runtime listener');
    handler(request, { id: 'dalil-test' }, resolve);
  });
  return { context, windowObject, documentObject, listeners, api: context.module.exports, send, reload };
}

const identity = { jobId: 'job-1', cellId: 'cell-1', queryId: 'Q1', areaVersion: 0 };
const taskUrl = camera => 'https://www.google.com/maps/search/mosque/@' + camera + '/data=!4m2!2m1!6e1?hl=en#dalil=' +
  encodeURIComponent(JSON.stringify(identity));

(async () => {
  const page = createPage({ href: taskUrl('29.3094,30.8416,18z') });
  assert.strictEqual(typeof page.windowObject.__DALIL_DISPOSE__, 'function', 're-injection recovery hook must be registered');

  // Hidden reCAPTCHA widgets are normal page furniture, not a source block.
  const hidden = createPage({ blockNodes: [{ getBoundingClientRect: () => ({ width: 0, height: 0 }) }] });
  assert.strictEqual(hidden.api.detectSourceBlock(), null, 'a hidden captcha frame must not stop collection');

  // A visible challenge page still stops collection.
  const visible = createPage({ blockNodes: [{ getBoundingClientRect: () => ({ width: 320, height: 240 }) }] });
  assert.strictEqual(visible.api.detectSourceBlock(), 'SOURCE_BLOCKED');
  assert.strictEqual(createPage({ innerText: 'Our systems have detected unusual traffic' }).api.detectSourceBlock(), 'SOURCE_BLOCKED');

  // The camera must actually be over the cell; a matching query alone is not enough.
  const farPage = createPage({ href: taskUrl('29.4000,30.9000,18z') });
  const mismatch = await farPage.send({ action: 'PREPARE_TASK', task: identity, targetUrl: taskUrl('29.3094,30.8416,18z') });
  assert.strictEqual(mismatch.success, false);
  assert.strictEqual(mismatch.errorCode, 'CAMERA_NOT_AT_CELL');

  const exact = await page.send({ action: 'PREPARE_TASK', task: identity, targetUrl: taskUrl('29.3094,30.8416,18z') });
  assert.strictEqual(exact.success, true);
  assert.strictEqual(exact.view.centerVerified, true);
  assert.strictEqual(exact.view.centerErrorMeters, 0);
  assert.ok(typeof exact.documentId === 'string' && exact.documentId.length > 4, 'each document must identify itself so a stale page cannot be read twice');

  // A stated mismatch is measured in metres, not tolerated at 50 km.
  const near = await createPage({ href: taskUrl('29.3120,30.8416,18z') })
    .send({ action: 'PREPARE_TASK', task: identity, targetUrl: taskUrl('29.3094,30.8416,18z') });
  assert.strictEqual(near.success, true, 'a few hundred metres of Google re-centring stays accepted');

  // A modest offset inside the cell is advisory: evidence, not a stop.
  const advisory = await createPage({ href: taskUrl('29.3160,30.8416,18z') })
    .send({ action: 'PREPARE_TASK', task: identity, targetUrl: taskUrl('29.3094,30.8416,18z'), hardCameraLimitMeters: 1200 });
  assert.strictEqual(advisory.success, true, 'an in-cell offset must not stop collection');
  assert.strictEqual(advisory.view.centerVerified, false, 'the offset is still reported as evidence');

  // A page whose camera sits over another neighbourhood is refused outright: reading it
  // would save a neighbouring cell's places under this cell's scan.
  const wrongNeighbourhood = await createPage({ href: taskUrl('29.3250,30.8416,18z') })
    .send({ action: 'PREPARE_TASK', task: identity, targetUrl: taskUrl('29.3094,30.8416,18z') });
  assert.strictEqual(wrongNeighbourhood.success, false, 'the neighbouring cell page must not be harvested');
  assert.strictEqual(wrongNeighbourhood.errorCode, 'CAMERA_NOT_AT_CELL');

  // Re-injection disposes the previous listener instead of leaving a dead page.
  assert.strictEqual(page.listeners.length, 1, 'exactly one live listener per document');
  page.reload();
  assert.strictEqual(page.listeners.length, 1, 're-injection replaces the previous listener');
  const afterReload = await page.send({ action: 'PREPARE_TASK', task: identity, targetUrl: taskUrl('29.3094,30.8416,18z') });
  assert.strictEqual(afterReload.success, true, 'the reloaded content script still answers tasks');

  console.log('PASS content handshake: camera metre tolerance, query-only mismatch rejection, hidden captcha ignored, re-injection recovers');
})().catch(error => { console.error(error); process.exitCode = 1; });

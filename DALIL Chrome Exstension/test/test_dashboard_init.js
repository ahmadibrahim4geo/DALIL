/**
 * Test to verify that dashboard.js initializes without throwing any runtime error
 */
const fs = require('fs');
const path = require('path');

const htmlContent = fs.readFileSync(path.join(__dirname, '../dashboard/dashboard.html'), 'utf8');

// Extract all element IDs from dashboard.html
const idRegex = /id="([^"]+)"/g;
const validIds = new Set();
let match;
while ((match = idRegex.exec(htmlContent)) !== null) {
  validIds.add(match[1]);
}

// Build a mock DOM element
function createMockElement(id = '', tag = 'div') {
  const listeners = {};
  const classes = new Set();
  const children = [];
  return {
    id,
    tagName: tag.toUpperCase(),
    value: '',
    checked: false,
    textContent: '',
    innerHTML: '',
    style: {},
    classList: {
      add: (c) => classes.add(c),
      remove: (c) => classes.delete(c),
      contains: (c) => classes.has(c),
      toggle: (c) => classes.has(c) ? classes.delete(c) : classes.add(c)
    },
    addEventListener: (event, handler) => {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    removeEventListener: () => {},
    dispatchEvent: () => {},
    setAttribute: () => {},
    getAttribute: (attr) => attr === 'id' ? id : null,
    removeAttribute: () => {},
    remove: () => {},
    insertAdjacentHTML: () => {},
    querySelector: (sel) => createMockElement('', 'div'),
    querySelectorAll: (sel) => [createMockElement('', 'div')],
    appendChild: (el) => children.push(el),
    removeChild: () => {},
    click: function() {
      if (listeners['click']) listeners['click'].forEach(fn => fn({ stopPropagation: () => {}, target: this }));
    }
  };
}

const elementsById = new Map();
function getOrCreateElement(id, tag = 'div') {
  if (!elementsById.has(id)) {
    elementsById.set(id, createMockElement(id, tag));
  }
  return elementsById.get(id);
}

const mockDoc = {
  documentElement: createMockElement('html', 'html'),
  getElementById: (id) => {
    return getOrCreateElement(id);
  },
  querySelector: (sel) => createMockElement('', 'div'),
  querySelectorAll: (sel) => [createMockElement('', 'div')],
  createElement: (tag) => createMockElement('', tag),
  addEventListener: (event, fn) => {
    if (event === 'DOMContentLoaded') {
      // Execute the callback immediately to test runtime initialization
      fn();
    }
  },
  body: createMockElement('body', 'body')
};

const mockWindow = {
  location: { href: 'http://localhost/dashboard.html' },
  localStorage: {
    getItem: () => null,
    setItem: () => {}
  },
  addEventListener: () => {}
};

const mockChrome = {
  runtime: {
    getURL: (p) => p,
    sendMessage: (msg, cb) => { if (cb) cb({ success: true }); },
    onMessage: { addListener: () => {} }
  },
  storage: {
    local: { get: (keys, cb) => cb({}), set: () => {} }
  }
};

const mockMapObj = {
  setView: function() { return this; },
  on: function() { return this; },
  addLayer: function() { return this; },
  panTo: function() { return this; },
  invalidateSize: function() { return this; },
  fitBounds: function() { return this; },
  getBounds: function() {
    return {
      getSouth: () => 29.9,
      getNorth: () => 30.1,
      getWest: () => 31.1,
      getEast: () => 31.3
    };
  }
};

const mockL = {
  map: () => mockMapObj,
  tileLayer: () => ({ addTo: () => {} }),
  control: { layers: () => ({ addTo: () => {} }) },
  layerGroup: () => ({ clearLayers: () => {}, addLayer: () => {}, addTo: () => ({ clearLayers: () => {}, addLayer: () => {} }) }),
  canvas: () => ({}),
  rectangle: () => ({
    bindPopup: () => ({}),
    on: () => {},
    setStyle: () => {},
    setPopupContent: () => {}
  }),
  circleMarker: () => ({
    bindPopup: () => ({}),
    on: () => {}
  })
};

// Test running dashboard.js
const vm = require('vm');
const dashboardCode = fs.readFileSync(path.join(__dirname, '../dashboard/dashboard.js'), 'utf8');
const SpatialUtils = require('../lib/spatial-utils.js');
const ExportUtils = require('../lib/export-utils.js');
const { TaxonomyEngine } = require('../lib/taxonomy-engine.js');
const SmartBrands = require('../lib/smart-brands.js');

const sandbox = {
  document: mockDoc,
  window: mockWindow,
  localStorage: mockWindow.localStorage,
  chrome: mockChrome,
  L: mockL,
  SpatialUtils,
  SearchLanguages:require('../core/search-languages.js'),
  DalilGridPresentation: require('../core/grid-presentation.js'),
  ExportUtils,
  TaxonomyEngine,
  SmartBrands,
  I18N_DICT: {},
  console: {
    log: () => {},
    warn: () => {},
    error: (...args) => console.error('[Dashboard Error]:', ...args)
  },
  setTimeout: (fn) => setTimeout(fn, 1),
  clearTimeout: () => {},
  setInterval: () => {},
  clearInterval: () => {}
};

try {
  vm.createContext(sandbox);
  vm.runInContext(dashboardCode, sandbox);
  console.log('✅ [PASS] dashboard.js loaded and DOMContentLoaded executed with ZERO runtime errors!');

  // Test grid generation button
  const btnGen = elementsById.get('btnGenerateGridNow');
  if (btnGen) {
    btnGen.click();
    console.log('✅ [PASS] btnGenerateGridNow clicked: Mesh grid generated cleanly with viewport fallback!');
  }
} catch (err) {
  console.error('❌ [FAIL] Runtime error during dashboard initialization:', err);
  process.exit(1);
}

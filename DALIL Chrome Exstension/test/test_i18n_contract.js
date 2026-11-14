/* Full dictionary and HTML binding contract; live rendering is a separate browser check. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const extra = require('../core/i18n');
const {TaxonomyEngine: taxonomy} = require('../lib/taxonomy-engine');
const code = fs.readFileSync(path.join(__dirname,'../dashboard/dashboard.js'),'utf8');
const start=code.indexOf('const I18N_DICT = '),end=code.indexOf('\n  };',start);
assert.ok(start>=0&&end>start);
const base=vm.runInNewContext('('+code.slice(start,end+5).replace('const I18N_DICT = ','').replace(/;$/,'')+')');
const ar={...base.ar,...extra.messages.ar},en={...base.en,...extra.messages.en};
assert.deepEqual(Object.keys(ar).sort(),Object.keys(en).sort(),'All UI dictionary keys must have both languages');
for(const [key,value] of Object.entries(en))assert.ok(!/[\u0600-\u06ff]/.test(value),'English resource contains Arabic: '+key);
for(const dictionary of [ar,en])for(const [key,value] of Object.entries(dictionary))assert.equal(typeof value,'string',key);
const html=fs.readFileSync(path.join(__dirname,'../dashboard/dashboard.html'),'utf8');
for(const match of html.matchAll(/data-i18n(?:-placeholder|-title|-aria-label|-alt)?="([^"]+)"/g)){
  assert.ok(ar[match[1]],'Untranslated Arabic HTML key: '+match[1]);
  assert.ok(en[match[1]],'Untranslated English HTML key: '+match[1]);
}
const sectors=taxonomy.searchTaxonomy('','en');
for(const sector of sectors)for(const branch of sector.branches)for(const leaf of branch.leafObjects||[]){
  const label=taxonomy.getLocalizedLeaf(leaf,'en');
  assert.ok(label&&!/[\u0600-\u06ff]/.test(label),'English leaf label contains Arabic: '+leaf.id);
}
assert.ok(html.includes('lang="ar" dir="rtl"'),'Arabic is the initial HTML locale');
assert.ok(html.includes('id="dataSource"')&&html.includes('id="searchLocale"'),'Search language is a separate control');
assert.ok(html.includes('../core/map-controls.js'),'Display basemaps use a module independent of source adapters');
assert.ok(!html.includes('Pro Edition')&&!html.includes('خصوصية 100%'),'Unsupported claims are absent from About');
console.log('PASS '+Object.keys(ar).length+' paired UI resources, HTML bindings, English taxonomy leaves, Arabic default, source/search locale separation');

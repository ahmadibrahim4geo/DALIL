/* Validate real packaged resource links after duplicate cleanup. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const manifest=JSON.parse(fs.readFileSync(path.join(root,'manifest.json'),'utf8'));
const resources=[manifest.background.service_worker,...Object.values(manifest.icons),...Object.values(manifest.action.default_icon),...manifest.content_scripts.flatMap(x=>x.js)];
let checked=0;
for(const resource of resources){assert.ok(fs.existsSync(path.join(root,resource)),resource);checked++;}
for(const file of ['dashboard/dashboard.html','popup/popup.html','index.html','../index.html']){
  const full=path.resolve(root,file),html=fs.readFileSync(full,'utf8');
  for(const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))assert.equal(script[1].trim(),'','Inline script in '+file);
  for(const [,ref] of html.matchAll(/\b(?:src|href)="([^"]+)"/g)){
    if(/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(ref))continue;
    const resource=decodeURIComponent(ref.split(/[?#]/)[0]);if(!resource)continue;
    assert.ok(fs.existsSync(path.resolve(path.dirname(full),resource)),file+' -> '+resource);checked++;
  }
}
console.log(`PASS ${checked} packaged/local resource references, including landing page and cleaned icons; no inline scripts`);

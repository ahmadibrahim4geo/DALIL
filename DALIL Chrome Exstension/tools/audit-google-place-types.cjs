/* Development-only read of public Google documentation; no runtime API/key needed. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {GOOGLE_TYPES_SNAPSHOT:local}=require('../core/category-registry');
const {TaxonomyEngine:T}=require('../lib/taxonomy-engine');
(async()=>{
 const response=await fetch(local.source);if(!response.ok)throw Error('Documentation HTTP '+response.status);
 const html=await response.text();
 const start=id=>{const index=html.search(new RegExp('<h3[^>]*id="'+id+'"'));if(index<0)throw Error('Missing official section '+id);return index;};
 const a=start('table-a'),b=start('table-b'),c=start('table-c');
 const ids=section=>[...new Set([...section.matchAll(/<code[^>]*>([a-z][a-z0-9_]+)<\/code>/g)].map(m=>m[1]))].sort();
 const reference={source:local.source,retrieved:new Date().toISOString().slice(0,10),sha256:crypto.createHash('sha256').update(html).digest('hex'),tableA:ids(html.slice(a,b)),tableB:ids(html.slice(b,c))};
 if(reference.tableA.length<400||reference.tableB.length<20)throw Error('Unexpected documentation shape; review before replacing evidence');
 const comparison=Object.fromEntries(['tableA','tableB'].map(table=>[table,{
  official:reference[table].length,local:local[table].length,
  missing:reference[table].filter(id=>!local[table].some(t=>t.id===id)),
  extra:local[table].filter(t=>!reference[table].includes(t.id)).map(t=>t.id)
 }]));
 const visible=new Set(T.getLibrarySectors().flatMap(s=>s.branches.flatMap(b=>T.getDisplayCategories(b.id).map(c=>c.googlePlaceType))));
 const hidden=reference.tableA.filter(id=>!visible.has(id));
 if(process.argv.includes('--save'))fs.writeFileSync(path.resolve(__dirname,'../docs/evidence/google-place-types-'+reference.retrieved+'.json'),JSON.stringify(reference,null,2)+'\n');
 const passed=Object.values(comparison).every(t=>!t.missing.length&&!t.extra.length)&&!hidden.length;
 console.log(JSON.stringify({status:passed?'passed':'failed',source:local.source,retrieved:reference.retrieved,comparison,hiddenSelectableTypes:hidden,
  scope:'Google Places New tables A/B, not the separately authorized Google Business Profile category catalogue'},null,2));
 if(!passed)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1;});

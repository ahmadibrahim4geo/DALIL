/* Optional artifacts for independent OGR/GeographicLib verification. */
const fs=require('node:fs'),path=require('node:path');
const Spatial=require('../lib/spatial-utils'),{filesFor}=require('./import_fixtures');
const out=process.argv[2];if(!out)throw Error('Pass an evidence directory');fs.mkdirSync(out,{recursive:true});
const geometry=[{type:'Point',coordinates:[31,30]},{type:'LineString',coordinates:[[31,30],[31.02,30],[31.02,30.02]]}];
for(const g of geometry)for(const [name,data] of filesFor(g,g.type.toLowerCase()))fs.writeFileSync(path.join(out,name),data);
const cases=[];
let seed=53438;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/2**32;};
for(let i=0;i<160;i++){
 const start=[random()*260-130,random()*140-70],end=[start[0]+random()*40-20,Math.max(-85,Math.min(85,start[1]+random()*30-15))],point=[start[0]+random()*60-30,Math.max(-89,Math.min(89,start[1]+random()*40-20))];
 cases.push({start,end,point,meters:Spatial.pointSegmentDistanceMeters(point,start,end)});
}
cases.push({start:[-45,80],end:[45,80],point:[0,82.89328488238122],meters:Spatial.pointSegmentDistanceMeters([0,82.89328488238122],[-45,80],[45,80])});
fs.writeFileSync(path.join(out,'expected.json'),JSON.stringify({geometry,cases},null,2));console.log(`Created ${cases.length} spherical distance cases and 10 import fixtures`);

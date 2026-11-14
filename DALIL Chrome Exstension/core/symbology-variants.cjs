/* Build colored/shaped GIS markers from the pinned, local CC0 Maki sources. */
'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let sharpModule;try{sharpModule=require(process.env.DALIL_SHARP_MODULE||'sharp');}catch(error){throw Error('Set DALIL_SHARP_MODULE to a development-host sharp module. It is not bundled in the extension.');}
const sharp=sharpModule.default||sharpModule;
const base=path.resolve(__dirname,'../assets/symbols'),directory=path.join(base,'variants'),catalog=require(path.join(base,'category-map.json'));
const outlines={circle:'M47 24a23 23 0 1 1-46 0 23 23 0 0 1 46 0Z','rounded-square':'M9 2h30q7 0 7 7v30q0 7-7 7H9q-7 0-7-7V9q0-7 7-7Z',square:'M3 3h42v42H3Z',diamond:'M24 1 47 24 24 47 1 24Z',hexagon:'M12 3h24l11 21-11 21H12L1 24Z',pentagon:'M24 1 47 18 38 45H10L1 18Z',shield:'M3 3h42v24q0 12-21 20Q3 39 3 27Z',pin:'M24 47C18 38 3 28 3 18a21 17 0 0 1 42 0c0 10-15 20-21 29Z'};
const hash=data=>crypto.createHash('sha256').update(data).digest('hex');
function render(entry){
 const original=fs.readFileSync(path.join(base,entry.glyph+'.svg'),'utf8');
 if(/<(?:script|foreignObject|image)\b|\bon\w+\s*=|(?:href|src)\s*=/i.test(original))throw Error('Unsafe source SVG: '+entry.glyph);
 let inner=original.replace(/^[\s\S]*?<svg[^>]*>/,'').replace(/<\/svg>[\s\S]*$/,'').replace(/fill="(?!none)[^"]*"/g,'fill="'+entry.foreground+'"');
 const scale=entry.shape==='pin'?1.8:entry.shape==='diamond'?1.4:1.72,x=(48-15*scale)/2,y=entry.shape==='pin'?5:x;
 return '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="-2 -2 52 52" data-symbol-id="'+entry.symbolId+'"><path d="'+outlines[entry.shape]+'" fill="'+entry.color+'" stroke="#ffffff" stroke-width="2.5" stroke-linejoin="round"/><path d="'+outlines[entry.shape]+'" fill="none" stroke="#102a43" stroke-width="0.65" stroke-linejoin="round"/><g transform="translate('+x+' '+y+') scale('+scale+')" fill="'+entry.foreground+'">'+inner+'</g></svg>';
}
(async()=>{
 fs.mkdirSync(directory,{recursive:true});const resources=[],hashes=new Set(),expected=new Set();
 for(const entry of catalog.entries){
  const svg=render(entry),png=await sharp(Buffer.from(svg)).png().toBuffer();
  if(hashes.has(hash(png)))throw Error('Duplicate rendered marker: '+entry.symbolId);hashes.add(hash(png));
  for(const [ext,data]of [['svg',svg],['png',png]]){const name=entry.assetKey+'.'+ext;expected.add(name);fs.writeFileSync(path.join(directory,name),data);}
  resources.push({symbolId:entry.symbolId,glyph:entry.glyph,color:entry.color,shape:entry.shape,svg:entry.svgPath,png:entry.pngPath,sha256:hash(png)});
 }
 const extra=fs.readdirSync(directory).filter(name=>!expected.has(name));if(extra.length)throw Error('Stale variant assets require explicit review: '+extra.join(', '));
 const report={schema:'dalil.symbol-variants/1',renderer:'sharp '+sharp.versions.sharp,baseLibrary:'Maki 8.2.0 (CC0-1.0)',icons:resources.length,uniquePngHashes:hashes.size,resources};
 fs.writeFileSync(path.join(base,'variants-manifest.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({icons:resources.length,uniquePngHashes:hashes.size}));
})().catch(error=>{console.error(error);process.exitCode=1;});

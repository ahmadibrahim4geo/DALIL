/* Exact-byte deduplication only. Dry run by default; never delete unique resources. */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..');
const extension=path.join(root,'DALIL Chrome Exstension');
const apply=process.argv.includes('--apply');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
function within(file){const relative=path.relative(root,path.resolve(file));if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('Outside project: '+file);}
function list(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
  if(entry.name==='.git'||entry.name==='node_modules')return [];
  const file=path.join(dir,entry.name);within(file);if(entry.isSymbolicLink())throw new Error('Refusing symlink: '+file);
  return entry.isDirectory()?list(file):entry.isFile()?[file]:[];
});}
function priority(file){const rel=path.relative(root,file).replaceAll('\\','/');
  if(rel.startsWith('.agents/'))return 0;
  if(rel.startsWith('DALIL Chrome Exstension/assets/'))return 1;
  if(rel.startsWith('DALIL Chrome Exstension/icons/'))return 2;
  if(rel.startsWith('DALIL Chrome Exstension/'))return 3;
  if(rel.startsWith('DALIL_Complete_Brand_Package/'))return 4;
  return 10;
}
const files=list(root),groups=new Map();
for(const file of files){const key=hash(file);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(file);}
const plan=[];
for(const [sha256,group] of groups){if(group.length<2)continue;
  group.sort((a,b)=>priority(a)-priority(b)||a.localeCompare(b));
  // Multiple protected files are retained; do not work around read-only roots.
  const keep=group[0];for(const remove of group.slice(1)){
    if(path.relative(root,remove).startsWith('.agents'+path.sep))continue;
    plan.push({sha256,bytes:fs.statSync(remove).size,keep:path.relative(root,keep).replaceAll('\\','/'),remove:path.relative(root,remove).replaceAll('\\','/')});
  }
}
if(apply && plan.length){
  // Rewrite existing relative resource references before removing their aliases.
  const removed=new Set(plan.map(row=>path.join(root,row.remove)));
  for(const file of files){if(removed.has(file)||file.includes(path.sep+'.agents'+path.sep)||file.includes('.agent-development-log')||file.endsWith('AGENTS.md')||file.includes('Blueprint_'))continue;
    if(!/\.(?:html|css|js|md|ps1|json)$/i.test(file))continue;
    let text=fs.readFileSync(file,'utf8'),next=text;
    for(const row of plan){const oldPath=path.join(root,row.remove),newPath=path.join(root,row.keep);
      const oldRef=path.relative(path.dirname(file),oldPath).replaceAll('\\','/'),newRef=path.relative(path.dirname(file),newPath).replaceAll('\\','/');
      if(oldRef!==newRef){for(const [left,right] of [['\"','\"'],["'","'"],['`','`'],['(',')'],['<','>']])next=next.split(left+oldRef+right).join(left+newRef+right);if(file.endsWith('.ps1'))next=next.split('\"'+oldRef.replaceAll('/','\\')+'\"').join('\"'+newRef.replaceAll('/','\\')+'\"');}
    }
    if(next!==text)fs.writeFileSync(file,next,'utf8');
  }
  fs.mkdirSync(path.join(extension,'docs'),{recursive:true});
  const report={schemaVersion:1,method:'SHA-256 and byte length; references rewritten before exact file removal',
    removedFiles:plan.length,reclaimedBytes:plan.reduce((n,row)=>n+row.bytes,0),entries:plan};
  fs.writeFileSync(path.join(extension,'docs/FILE_DEDUPLICATION.json'),JSON.stringify(report,null,2)+'\n');
  for(const row of plan){const remove=path.join(root,row.remove),keep=path.join(root,row.keep);within(remove);within(keep);
    if(hash(remove)!==row.sha256||hash(keep)!==row.sha256)throw new Error('Resource changed during cleanup: '+row.remove);
    fs.unlinkSync(remove);
  }
  function prune(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true}))if(entry.isDirectory()&&!['.agents','.git','node_modules','.agent-development-log'].includes(entry.name)){
    const sub=path.join(dir,entry.name);within(sub);prune(sub);if(fs.readdirSync(sub).length===0)fs.rmdirSync(sub);
  }}prune(root);
}
console.log(JSON.stringify({mode:apply?'applied':'dry_run',duplicateGroups:[...groups.values()].filter(g=>g.length>1).length,
  removableFiles:plan.length,reclaimableBytes:plan.reduce((n,row)=>n+row.bytes,0),...(apply?{}:{plan})},null,2));

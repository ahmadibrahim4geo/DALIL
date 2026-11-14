/* node --check accepts one entry point; explicitly check every shipped/local JS file. */
const fs=require('fs');
const path=require('path');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
let count=0;
function visit(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
  if(['node_modules','.git','.agent-development-log'].includes(entry.name))continue;
  const file=path.join(dir,entry.name);
  if(entry.isDirectory())visit(file);
  else if(/\.(?:cjs|mjs|js)$/.test(file)){const result=spawnSync(process.execPath,['--check',file],{encoding:'utf8',windowsHide:true});
    if(result.status!==0){process.stderr.write(result.stderr||result.error?.message||`Syntax check failed: ${file}`);process.exit(1);}count++;}
}}
visit(root);console.log(`Checked syntax of ${count} JavaScript files.`);

// Review the user flows in disposable previews. No desktop profile, real
// novels, provider credentials or model calls are used by these tests.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const root=resolve(import.meta.dirname,'..'),reports=join(root,'test-results/review-0.5.0/ui');
await mkdir(reports,{recursive:true});
const flows=process.argv.slice(2).length?process.argv.slice(2):[
  'history-routing','workspace-refinements','document-editing','document-growth','graph','readable-canvas',
  'library-tree','nested-groups','root-directory','content-order','canvas-junctions','canvas-workspaces','director-workspaces','manuscript-search',
  'guidance-transfer','writing-records','pet','navigation','unified-workspace',
  'transfer','presets','welcome-batch','novel-recycle','directory','chapter-order',
  'manuscript','pages','controls','layout','smoke','management','author-workflow','workbench-recovery','startup',
];
const results=[];let cursor=0;
async function worker(){
  while(cursor<flows.length){
    const name=flows[cursor++];if(!/^[a-z-]+$/.test(name))throw Error('Invalid flow name');
    const started=Date.now(),child=spawn(process.execPath,[`tests/ui-${name}.mjs`],{cwd:root,windowsHide:true,stdio:['ignore','pipe','pipe']});
    let output='';child.stdout.on('data',bytes=>output+=bytes);child.stderr.on('data',bytes=>output+=bytes);
    const code=await new Promise((done,reject)=>{child.once('error',reject);child.once('exit',done);});
    await writeFile(join(reports,name+'.log'),output);
    const result={name,ok:code===0,seconds:Math.round((Date.now()-started)/1000)};results.push(result);
    console.log(JSON.stringify(result));
  }
}
await Promise.all([worker(),worker()]);
const report={ok:results.every(r=>r.ok),total:results.length,passed:results.filter(r=>r.ok).length,results};
await writeFile(join(reports,'report.json'),JSON.stringify(report,null,2));
if(!report.ok)process.exitCode=1;

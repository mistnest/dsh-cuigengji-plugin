// Production components and Store, in a disposable workspace. Never opens the desktop data directory.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {Store} from '../src/core/store.js';
import {WorkData} from '../src/data/workspace.js';

const root=resolve(import.meta.dirname,'..');
const directory=await mkdtemp(join(tmpdir(),'cuigengji-preview-'));
const store=new Store(directory),workData=new WorkData(store);
const actor={kind:'human',sessionId:'production-preview'};
let novelId;
if(process.argv[2]){
  const backup=JSON.parse(await readFile(resolve(process.argv[2]),'utf8'));
  backup.novel.title+=' · 试用副本';
  novelId=(await store.dispatch('novel.import',{backup},actor)).id;
}else{
  novelId=(await store.dispatch('novel.create',{title:'催更姬 · 试用作品'},actor)).id;
  await store.dispatch('chapter.create',{novelId,title:'第一章 雨夜来信',content:'　　雨停以后，街道重新安静下来。窗边的灯仍亮着，故事还在继续。'},actor);
}
await store.dispatch('binding.set',{novelId},actor);
const output=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{Workbench}from'./src/client/index.tsx';const rpc=async(action,args)=>{const response=await fetch('/dispatch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,args})});const result=await response.json();if(!response.ok)throw new Error(result.error);return result;};createRoot(document.getElementById('root')).render(<Workbench sessionId="production-preview" rpc={rpc}/>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"development"'}});
const server=createServer(async(req,res)=>{
  try{
    res.setHeader('Cache-Control','no-store');
    if(req.url==='/dispatch'&&req.method==='POST'){
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)throw new Error('Invalid origin');
      if(!req.headers['content-type']?.startsWith('application/json'))throw new Error('Expected JSON');
      let body='';for await(const part of req){body+=part;if(body.length>64*1024*1024)throw new Error('Request too large');}
      const {action,args={}}=JSON.parse(body);
      const method={'workspace.status':'status','workspace.export':'export','workspace.preview':'preview','workspace.import':'import'}[action];
      const result=method?await workData[method](args.backup):await store.dispatch(action,args,actor);
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify(result));return;
    }
    if(req.method!=='GET'){res.statusCode=405;res.end();return;}
    if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript; charset=utf-8');res.end(output.outputFiles[0].contents);return;}
    if(req.url!=='/'){res.statusCode=404;res.end();return;}
    res.setHeader('Content-Type','text/html; charset=utf-8');res.end('<!doctype html><html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>催更姬 · 正式前端独立试用</title><style>html,body,#root{height:100%;margin:0}</style><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  }catch(error){res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:error.message}));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
console.log(JSON.stringify({url:`http://127.0.0.1:${server.address().port}/`,dataDirectory:directory,mode:'production UI with isolated data'}));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>process.exit(0)));

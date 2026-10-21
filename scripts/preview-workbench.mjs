// Production components and Store, in a disposable workspace. Never opens the desktop data directory.
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {mkdtemp,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {LibraryService} from '../src/application/libraries/service.ts';
import {convertLegacyExport} from '../src/infrastructure/migrations/legacy.js';
import {seedCanvasDemo} from './canvas-demo.mjs';
import {seedReadableCanvasDemo} from './readable-canvas-demo.mjs';

const root=resolve(import.meta.dirname,'..');
const directory=await mkdtemp(join(tmpdir(),'cuigengji-preview-'));
const libraries=new LibraryService(directory,{persist:async()=>{}});
const store=libraries.proxy('store'),workData=libraries.proxy('workData'),transfer=libraries.proxy('transfer');
await libraries.current.maintenance.ensureReady();
const actor={kind:'human',sessionId:'production-preview'};
let layoutFault=process.argv.includes('--fail-layout-once')?'before':process.argv.includes('--lose-layout-response-once')?'after':null;
let novelId;
const welcome=process.argv.includes('--welcome'),empty=process.argv.includes('--empty');
const readableCanvas=process.argv.includes('--readable-canvas');
if(readableCanvas){
  novelId=await seedReadableCanvasDemo(store,actor);
}else if(process.argv[2]==='--canvas-demo'){
  novelId=await seedCanvasDemo(store,actor);
}else if(empty){
  // A genuine first launch, with no works and no session binding.
}else if(process.argv[2]&&!process.argv[2].startsWith('--')){
  const backup=JSON.parse(await readFile(resolve(process.argv[2]),'utf8'));
  backup.novel.title+=' · 试用副本';
  novelId=(await store.dispatch('novel.import',{backup},actor)).id;
}else{
  novelId=(await store.dispatch('novel.create',{title:'催更姬 · 试用作品'},actor)).id;
  await store.dispatch('chapter.create',{novelId,title:'第一章 雨夜来信',content:'　　雨停以后，街道重新安静下来。窗边的灯仍亮着，故事还在继续。'},actor);
}
if(novelId&&!welcome&&!empty)await store.dispatch('binding.set',{novelId},actor);
const initialView=readableCanvas?"if(localStorage.getItem('cuigengji:ui:production-preview:page')===null)localStorage.setItem('cuigengji:ui:production-preview:page',JSON.stringify('plan'));":"";
const previewEntry=process.argv.includes('--sidebar-host')?"import{mountSidebarHost}from'./tests/fixtures/sidebar-host.tsx';mountSidebarHost(rpc);":"createRoot(document.getElementById('root')).render(<Workbench sessionId=\"production-preview\" rpc={rpc}/>);";
const output=await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{Workbench}from'./src/client/index.tsx';${initialView}const rpc=async(action,args)=>{const response=await fetch('/dispatch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,args})});const result=await response.json();if(!response.ok)throw new Error(result.error);return result;};${previewEntry}`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',loader:{'.png':'dataurl'},define:{'process.env.NODE_ENV':'"development"'}});
const server=createServer(async(req,res)=>{
  try{
    res.setHeader('Cache-Control','no-store');
    if(req.url==='/dispatch'&&req.method==='POST'){
      if(req.headers.origin&&req.headers.origin!==`http://${req.headers.host}`)throw new Error('Invalid origin');
      if(!req.headers['content-type']?.startsWith('application/json'))throw new Error('Expected JSON');
      const parts=[];let size=0;for await(const part of req){size+=part.length;if(size>64*1024*1024)throw new Error('Request too large');parts.push(part);}const body=Buffer.concat(parts).toString('utf8');
      const {action,args={}}=JSON.parse(body),acting=actor;
      const layout=action==='graph.layout'||(action==='planning.apply'&&args.reason==='调整画布布局');
      if(layout&&layoutFault==='before'){layoutFault=null;throw new Error('试用：模拟布局保存失败，尚未提交');}
      const method={'workspace.status':'status','workspace.export':'export','workspace.preview':'preview','workspace.import':'import'}[action];
      const transferMethod={'transfer.catalog':'catalog','transfer.inspect':'inspect','transfer.preview':'preview','transfer.import':'import','transfer.exportPreview':'exportPreview','transfer.export':'export'}[action];
      if(args.__libraryRoot&&args.__libraryRoot!==store.root)throw new Error('作品库已切换，请刷新后重试');
      delete args.__libraryRoot;
      const handle=async()=>action==='settings.get'?{dataRoot:store.root}:transferMethod?await transfer[transferMethod](args,acting):action==='legacy.preview'?convertLegacyExport(args.input):method?await workData[method](args.backup):await store.dispatch(action,args,acting);
      const result=action==='library.status'?await libraries.status():action==='library.pick'?{path:null,manual:true}:action==='library.inspect'?await libraries.inspect(args.path):action==='library.change'?await libraries.change(args):await libraries.use(handle);
      if(layout&&layoutFault==='after'){layoutFault=null;throw new Error('试用：模拟布局已提交但响应丢失');}
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

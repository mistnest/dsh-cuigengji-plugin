// Real browser exercise of the shipped component against the production Store.
import { chromium, expect } from '@playwright/test';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { Store } from '../src/core/store.js';

const root = resolve(import.meta.dirname, '..');
const directory = await mkdtemp(join(tmpdir(), 'cuigengji-ui-'));
const store = new Store(directory);
const actor = {kind:'human',sessionId:'ui-smoke'};
const novel = await store.dispatch('novel.create',{title:'浏览器测试小说'},actor);
await store.dispatch('binding.set',{novelId:novel.id},actor);
const chapter = await store.dispatch('chapter.create',{novelId:novel.id,title:'第一章',content:'门口有人敲门。'},actor);
  const output = await build({stdin:{contents:`import React from 'react';import{createRoot}from'react-dom/client';import{Workbench}from'./src/client/index.tsx';const rpc=async(action,args,sessionId)=>{const r=await fetch('/dispatch',{method:'POST',body:JSON.stringify({action,args,sessionId})});const value=await r.json();if(!r.ok)throw new Error(value.error);return value;};createRoot(document.getElementById('root')).render(<Workbench sessionId="ui-smoke" rpc={rpc}/>);`,resolveDir:root,loader:'tsx'},bundle:true,write:false,format:'iife',define:{'process.env.NODE_ENV':'"development"'}});
const server = createServer(async(req,res)=>{
  try {
    if(req.url==='/bundle.js'){res.setHeader('content-type','text/javascript');res.end(output.outputFiles[0].contents);return;}
    if(req.url==='/dispatch'){
      let body='';for await(const part of req)body+=part;
      const {action,args,sessionId}=JSON.parse(body);
      res.setHeader('content-type','application/json');
      res.end(JSON.stringify(await store.dispatch(action,args,{kind:'human',sessionId})));return;
    }
    res.setHeader('content-type','text/html');res.end('<!doctype html><html lang="zh"><meta charset="utf-8"><title>cuigengji UI smoke</title><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  }catch(e){res.statusCode=400;res.end(JSON.stringify({error:e.message}));}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
let browser;
try {
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:900,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.getByRole('button',{name:/第一章/}).click();
  await page.getByRole('button',{name:'编辑',exact:true}).click();
  await expect(page.getByLabel('正文',{exact:true})).toHaveValue('门口有人敲门。');
  await page.getByLabel('正文',{exact:true}).fill('门外站着一位陌生姑娘。');
  await page.getByRole('button',{name:'保存修改',exact:true}).click();
  await expect(page.getByText(/版本2/)).toBeVisible();
  await page.getByLabel('正文',{exact:true}).fill('作者的未保存草稿。');
  await expect(page.getByLabel('正文',{exact:true})).toHaveValue('作者的未保存草稿。');
  await page.reload();
  await page.getByRole('button',{name:/第一章/}).click();
  await page.getByRole('button',{name:'编辑',exact:true}).click();
  await expect(page.getByLabel('正文',{exact:true})).toHaveValue('作者的未保存草稿。');
  await page.getByRole('button',{name:'资料',exact:true}).click();
  await page.locator('details.menu summary.primary').click();
  await page.locator('details.menu[open] .menu-panel button').filter({hasText:'人物'}).click();
  await page.getByLabel('名称',{exact:true}).fill('夜班姑娘');
  await page.getByLabel('摘要',{exact:true}).fill('住在隔壁的剑仙。');
  await page.getByLabel('全文',{exact:true}).fill('她刚刚搬进这栋楼。');
  await page.getByRole('button',{name:'保存资料',exact:true}).click();
  await expect(page.getByRole('heading',{name:'夜班姑娘',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'规划',exact:true}).click();
  await page.getByRole('button',{name:/规划/}).first().click();
  await mkdir(join(root,'test-results'),{recursive:true});
  await page.screenshot({path:join(root,'test-results','ui-smoke.png'),fullPage:true});
  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ok:true,checks:['chapter edit','draft survives reload','资料 CRUD create','planning entry'],dataDir:directory}));
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}

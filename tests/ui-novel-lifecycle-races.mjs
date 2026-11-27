// Real UI and Store with a second writer, entirely in a disposable library.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {Store} from '../src/composition/store.ts';

const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','novel-lifecycle-races');
await mkdir(shots,{recursive:true});
const preview=spawn(process.execPath,['scripts/preview-workbench.mjs','--welcome'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
try{
  const {url,dataDirectory}=await new Promise((done,reject)=>{
    let output='',errors='';const timer=setTimeout(()=>reject(new Error('Preview timeout: '+errors)),25000);
    preview.stderr.on('data',chunk=>{errors+=chunk;});
    preview.once('exit',code=>{clearTimeout(timer);reject(new Error('Preview exit '+code+': '+errors));});
    preview.stdout.on('data',chunk=>{output+=chunk;const line=output.split('\n').find(line=>line.startsWith('{'));if(line){clearTimeout(timer);done(JSON.parse(line));}});
  });
  const store=new Store(dataDirectory),human={kind:'human',sessionId:'production-preview'},agent={kind:'agent',sessionId:'parallel-writer'};
  const other=await store.dispatch('novel.create',{title:'持续写作的另一部作品'},human);
  const book=(await store.dispatch('novel.list',{},human)).find(book=>book.id!==other.id);
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1200,height:900}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  const card=page.getByRole('article',{name:`作品 ${book.title}`,exact:true});
  await expect(card).toBeVisible();
  // AI advances the book revision after the home has loaded; repeated clicks
  // must not keep submitting the obsolete revision retained by that home.
  const chapter=await store.dispatch('chapter.create',{novelId:book.id,title:'AI 刚写好的正文',content:'需要完整保留的正文。'},agent);
  await card.getByRole('button',{name:`将《${book.title}》移入回收站`,exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'确定',exact:true}).click();
  await expect(card,'recycling must use the state reviewed at confirmation, rather than the stale home revision').toHaveCount(0);
  await expect(page.locator('.notice.error')).toHaveCount(0);
  assert.equal((await store.dispatch('novel.export',{novelId:book.id},human)).novel.chapters[chapter.id].content,'需要完整保留的正文。');
  await page.getByRole('button',{name:/^作品回收站/}).click();
  const row=()=>page.locator('.management-trash-row').filter({hasText:book.title});
  await expect(row()).toBeVisible();
  // An unrelated writer keeps working while the author reviews deletion.
  await row().getByRole('button',{name:`永久删除《${book.title}》`,exact:true}).click();
  const cleanup=page.getByRole('dialog',{name:'永久删除回收站内容',exact:true});
  await expect(cleanup.getByRole('button',{name:'永久删除 1 项',exact:true})).toBeEnabled();
  const liveChapter=await store.dispatch('chapter.create',{novelId:other.id,title:'仍在继续',content:'并行编辑不可丢失。'},agent);
  await cleanup.getByRole('button',{name:'永久删除 1 项',exact:true}).click();
  await expect(cleanup.getByRole('status')).toContainText('已删除 1');
  await cleanup.getByRole('button',{name:'完成',exact:true}).click();
  await expect(row()).toHaveCount(0);
  assert.equal((await store.dispatch('chapter.get',{novelId:other.id,chapterId:liveChapter.id},human)).content,'并行编辑不可丢失。');
  // A change after the confirmation appears still requires fresh review.
  await page.getByRole('button',{name:'作品首页',exact:true}).click();
  await page.getByRole('button',{name:`将《${other.title}》移入回收站`,exact:true}).click();
  const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
  const lastChapter=await store.dispatch('chapter.create',{novelId:other.id,title:'确认期间的新章',content:'不能在作者未重新核对时回收。'},agent);
  await dialog.getByRole('button',{name:'确定',exact:true}).click();
  await expect(page.locator('.notice.error')).toContainText('版本已变化');
  assert.equal((await store.dispatch('novel.list',{},human)).length,1);
  await page.getByRole('button',{name:'关闭提示',exact:true}).click();
  await page.getByRole('button',{name:`将《${other.title}》移入回收站`,exact:true}).click();
  await page.getByRole('dialog').getByRole('button',{name:'确定',exact:true}).click();
  await expect(page.getByRole('heading',{name:'你的故事，从这里开始。'})).toBeVisible();
  assert.equal((await store.dispatch('novel.export',{novelId:other.id},human)).novel.chapters[lastChapter.id].content,'不能在作者未重新核对时回收。');
  assert.deepEqual(errors,[]);
  await page.screenshot({path:join(shots,'completed.png')});
  console.log(JSON.stringify({ok:true,covered:['stale home after AI edits','unrelated AI edits during purge approval','confirmation races require another review','chapter content preserved']}));
}catch(error){await page?.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;}
finally{await browser?.close();preview.kill();}

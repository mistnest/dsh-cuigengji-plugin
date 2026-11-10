// Story workspace visuals in a disposable preview. No desktop profile, real novels or model calls.
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';
const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','story');
await mkdir(shots,{recursive:true});
const preview=spawn(process.execPath,['scripts/preview-workbench.mjs','--story-demo'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser;
try{
 const {url}=await new Promise((done,reject)=>{let output='',errors='';const timeout=setTimeout(()=>reject(new Error(errors||'Preview timeout')),30000);preview.stderr.on('data',v=>errors+=v);preview.once('exit',code=>{clearTimeout(timeout);reject(new Error('Preview exited '+code+errors));});preview.stdout.on('data',v=>{output+=v;const line=output.split('\n').find(v=>v.startsWith('{'));if(line){clearTimeout(timeout);done(JSON.parse(line));}});});
 let calls=0,lastContext=null;
 const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;};
 browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
 const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 page.on('request',request=>{if(!request.url().endsWith('/dispatch'))return;try{if(JSON.parse(request.postData()).action==='story.context.get')calls++;}catch{}});
 page.on('response',async response=>{if(!response.url().endsWith('/dispatch'))return;try{const body=JSON.parse(await response.text());if(body?.plans&&body?.facts)lastContext=body;}catch{}});
 await page.goto(url);
 await page.getByRole('button',{name:'创作',exact:true}).click();
 await expect(page.getByRole('heading',{name:'简报与流程',exact:true})).toBeVisible();
 await page.screenshot({path:join(shots,'story-overview.png'),fullPage:true});
 // The health matrix is a real table: one row per chapter, six evidence columns.
 await page.getByRole('button',{name:'章节蓝图与追踪',exact:true}).click();
 const matrix=page.getByRole('region',{name:'章节健康度矩阵'});
 await expect(matrix.locator('tbody tr')).toHaveCount(5);
 await expect(matrix.getByRole('rowheader').filter({hasText:'第三章 南岸码头'})).toBeVisible();
 await matrix.getByRole('rowheader').filter({hasText:'第三章 南岸码头'}).getByRole('button').click();
 await expect(page.locator('.story-matrix tr[data-selected]')).toContainText('第三章 南岸码头');
 await expect(page.getByRole('heading',{name:'第三章 南岸码头',exact:true})).toBeVisible();
 await expect(matrix.locator('.story-matrix-cell.tone-bad').first()).toBeVisible();
 await page.screenshot({path:join(shots,'story-chapters.png'),fullPage:true});
 // Threads: one drawn row per recorded thread, spanning source to due chapter.
 await page.getByRole('button',{name:'故事线索',exact:true}).click();
 const timeline=page.getByRole('region',{name:'线索时间线'});
 await expect(timeline.locator('.story-timeline-row')).toHaveCount(5);
 await expect(timeline.locator('.story-timeline-due')).toHaveCount(3);
 const row=timeline.locator('.story-timeline-row').first();
 await row.hover();
 await expect(page.locator('.story-timeline-detail')).toBeVisible();
 await expect(page.locator('.story-timeline-detail')).toContainText('来源');
 // A thread is overdue only when its due chapter already has prose and it is still unverified.
 await expect(page.locator('.story-timeline-detail')).toContainText('已到期未兑现');
 await expect(timeline.locator('.story-timeline-due')).toHaveCount(3);
 await page.screenshot({path:join(shots,'story-threads.png'),fullPage:true});
 // Context preview: read-only projection, omissions are grouped by reason.
 await page.getByRole('button',{name:'AI 上下文',exact:true}).click();
 await expect.poll(()=>calls).toBeGreaterThan(0);
 await expect(page.locator('.story-context-item').first()).toBeVisible();
 const preview_=await page.locator('.story-context-budget p').textContent();
 expect(preview_).toMatch(/\/ 12,000 字符/);
 expect(lastContext.usedChars).toBeLessThanOrEqual(lastContext.maxChars);
 const omitted=await page.locator('.story-context-omitted summary').allTextContents();
 expect(omitted.length>0||await page.locator('.story-context-omitted').getByText('只保留计数').count()>0).toBe(true);
 await page.getByLabel('字符预算').selectOption('4000');
 await expect(page.locator('.story-context-budget p')).toContainText('/ 4,000 字符');
 await page.screenshot({path:join(shots,'story-context.png'),fullPage:true});
 for(const width of [760,420]){
  await page.setViewportSize({width,height:1000});
  expect(await page.locator('.story-context').evaluate(el=>el.scrollWidth<=el.clientWidth+2)).toBe(true);
  await page.screenshot({path:join(shots,`story-context-${width}.png`),fullPage:true});
 }
 await page.setViewportSize({width:1280,height:1000});
 if(errors.length)throw new Error(errors.join('\n'));
 console.log(JSON.stringify({ok:true,checks:['chapter health matrix rows and selection','thread timeline spans and due marker','context preview request, budget and omission groups','narrow layouts'],contextCalls:calls}));
}finally{await browser?.close();preview.kill();}

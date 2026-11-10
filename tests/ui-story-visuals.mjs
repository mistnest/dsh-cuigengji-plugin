// Browser acceptance for the four new story visuals. Disposable preview only:
// no desktop profile, no real novel, no model calls.
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {chromium,expect} from '@playwright/test';

const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','story-visuals');
await mkdir(shots,{recursive:true});
const preview=spawn(process.execPath,['scripts/preview-workbench.mjs','--story-demo'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser;
try{
  const {url}=await new Promise((done,reject)=>{let output='',errors='';const timeout=setTimeout(()=>reject(new Error(errors||'Preview timeout')),30000);preview.stderr.on('data',v=>errors+=v);preview.once('exit',code=>{clearTimeout(timeout);reject(new Error('Preview exited '+code+errors));});preview.stdout.on('data',v=>{output+=v;const line=output.split('\n').find(v=>v.startsWith('{'));if(line){clearTimeout(timeout);done(JSON.parse(line));}});});
  const call=async(action,args={})=>{const r=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});const result=await r.json();if(!r.ok)throw new Error(result.error);return result;};
  browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_EXECUTABLE||undefined});
  const page=await browser.newPage({viewport:{width:1280,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  await page.getByRole('button',{name:'创作',exact:true}).click();
  await expect(page.getByRole('heading',{name:'简报与流程',exact:true})).toBeVisible();

  // 1. Volume board: three levels plus the storyline matrix.
  await page.getByRole('button',{name:'卷纲与单元',exact:true}).click();
  await expect(page.getByRole('heading',{name:/卷纲与单元|卷/}).first()).toBeVisible();
  await expect(page.locator('.story-unit-card')).toHaveCount(2);
  await expect(page.locator('.story-unit-card').filter({hasText:'锈住的钟'})).toBeVisible();
  await expect(page.locator('.story-unit-card').filter({hasText:'码头上的十年'})).toBeVisible();
  // The demo deliberately leaves one unit at reinforce, so the diagnostic must show.
  await expect(page.getByText(/章节已写完|契约仍待补强|需补强/).first()).toBeVisible();
  await page.screenshot({path:join(shots,'units.png'),fullPage:true});

  // 2. Detector board: real candidates with jump targets, no score anywhere.
  await page.getByRole('button',{name:'去 AI 味体检',exact:true}).click();
  await expect(page.getByText(/候选/).first()).toBeVisible();
  const tiles=page.locator('[class*="story-detect"]').filter({hasText:/条|干净/});
  expect(await tiles.count()).toBeGreaterThan(0);
  await expect(page.getByText(/不是评分|不是分数/).first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/AI 味 \d+ ?分/);
  await page.screenshot({path:join(shots,'detect.png'),fullPage:true});

  // 3. Rhythm heat map: one column per chapter, tone + role legend, and an editor.
  await page.getByRole('button',{name:'节奏热力图',exact:true}).click();
  await expect(page.locator('.story-heat')).toBeVisible();
  await expect(page.locator('[class*="tone-tense"], [class*="tone-oppressive"]').first()).toBeVisible();
  await page.screenshot({path:join(shots,'rhythm.png'),fullPage:true});
  // Recording a tone goes through story.apply and the grid repaints.
  await page.getByRole('button',{name:/编辑这一章的基调|记录基调|编辑/}).first().click();
  await expect(page.locator('.story-rhythm-editor, [aria-label*="节奏"]').first()).toBeVisible();
  await page.screenshot({path:join(shots,'rhythm-editor.png'),fullPage:true});

  // 4. Dual timeline: author truth vs reader knowledge, with a visible gap.
  await page.getByRole('button',{name:'双时间线',exact:true}).click();
  const truth=page.getByRole('region',{name:'双时间线'});
  await expect(truth.locator('tbody tr')).toHaveCount(2);
  await expect(truth.getByText('第三封信是陆行舟寄出的').first()).toBeVisible();
  await expect(truth.getByText(/信息差/).first()).toBeVisible();
  await page.screenshot({path:join(shots,'truth.png'),fullPage:true});

  // 5. Review distribution matrix appears on the review page.
  await page.getByRole('button',{name:/证据审稿/}).click();
  await expect(page.getByRole('region',{name:'审稿问题分布'})).toBeVisible();
  await page.screenshot({path:join(shots,'review-matrix.png'),fullPage:true});

  // 6. Reference library (拆文库/对标): imported copy with rhythm comparison.
  await page.getByRole('button',{name:'拆文库与对标',exact:true}).click();
  const reference=page.getByRole('region',{name:'拆文库与对标'});
  await expect(reference.getByRole('heading',{name:'把拆文库变成可以对照的对标书'})).toBeVisible();
  await expect(reference.getByText('对标示例 · 雨城来信拆文').first()).toBeVisible();
  await expect(reference.getByRole('region',{name:'对标节奏对照'})).toBeVisible();
  await expect(reference.locator('.story-reference-chapters tbody tr')).toHaveCount(4);
  await page.screenshot({path:join(shots,'reference.png'),fullPage:true});

  // 7. Style board: real prose samples, targets set, and an editable dossier.
  await page.getByRole('button',{name:'文风对照',exact:true}).click();
  await expect(page.locator('table')).toBeVisible();
  // A configured target must produce a signed deviation, never a bare number.
  await expect(page.locator('[data-state="value"], [data-state="unset"], [data-state="unmeasured"]').first()).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/AI 味 \d+ ?分/);
  await page.screenshot({path:join(shots,'style.png'),fullPage:true});

  // Narrow layouts must not scroll sideways on any new section.
  for(const name of ['卷纲与单元','去 AI 味体检','节奏热力图','双时间线','拆文库与对标','文风对照']){
    await page.setViewportSize({width:420,height:900});
    await page.getByRole('button',{name,exact:true}).click();
    const overflow=await page.locator('.story-scroll').evaluate(el=>el.scrollWidth-el.clientWidth);
    expect(overflow,`${name} at 420px`).toBeLessThanOrEqual(2);
    const docOverflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
    expect(docOverflow,`${name} document at 420px`).toBeLessThanOrEqual(2);
    await page.setViewportSize({width:1280,height:1000});
  }
  await page.setViewportSize({width:420,height:900});
  await page.getByRole('button',{name:'卷纲与单元',exact:true}).click();
  await page.screenshot({path:join(shots,'units-420.png'),fullPage:true});

  if(errors.length)throw new Error(errors.join('\n'));
  console.log(JSON.stringify({ok:true,checks:['unit cards and contract diagnostic','detector candidates without a score','rhythm grid and editor','style samples, signed deviation and dossier','420px layouts']}));
}finally{await browser?.close();preview.kill();}

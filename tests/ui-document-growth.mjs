// Grow real setting documents one line at a time; prefilling a long body misses caret/scroll regressions.
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {chromium,expect} from '@playwright/test';
import {showOrganization} from './helpers/navigation.mjs';

const root=resolve(import.meta.dirname,'..'),shots=join(root,'test-results','document-growth');
await mkdir(shots,{recursive:true});
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:root,stdio:['ignore','pipe','pipe']});
let browser,page;
const samples=[];
try {
  const {url}=await new Promise((resolve,reject)=>{
    let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview timeout')),25000);
    host.stderr.on('data',chunk=>errors+=chunk);
    host.once('exit',code=>{clearTimeout(timer);reject(Error(`Preview exit ${code}: ${errors}`));});
    host.stdout.on('data',chunk=>{output+=chunk;const line=output.split('\n').find(line=>line.startsWith('{'));if(line){clearTimeout(timer);resolve(JSON.parse(line));}});
  });
  const call=async(action,args={})=>{const response=await fetch(new URL('/dispatch',url),{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action,args})});if(!response.ok)throw Error(await response.text());return response.json();};
  const novelId=(await call('novel.list'))[0].id;
  const entries=[];
  for(const type of ['world_entry','character_card'])entries.push(await call('graph.create',{novelId,type,name:type==='world_entry'?'逐行世界设定':'逐行人物设定',content:''}));
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1100,height:900},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);
  for(const entry of entries) {
    await page.getByRole('button',{name:'设定',exact:true}).click();await showOrganization(page);
    await page.locator(`.directory-entry[data-entry-id="${entry.id}"]`).getByRole('button').dblclick();
    await page.getByRole('button',{name:'编辑',exact:true}).click();
    const editor=page.getByLabel('全文',{exact:true});
    for(const width of [1100,360]) {
      await page.setViewportSize({width,height:900});await editor.fill('');await editor.click();
      let content='',previousTop=0;
      for(let line=1;line<=65;line++) {
        const text=`第${String(line).padStart(2,'0')}行记录`;
        await page.keyboard.insertText(text);await page.keyboard.press('Enter');content+=text+'\n';
        await editor.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        const sample=await editor.evaluate(element=>{
          const viewport=element.closest('.detail-scroll'),box=element.getBoundingClientRect(),view=viewport.getBoundingClientRect(),css=getComputedStyle(element);
          const lineHeight=parseFloat(css.lineHeight),fontSize=parseFloat(css.fontSize);
          const caretBottom=box.top+parseFloat(css.borderTopWidth)+parseFloat(css.paddingTop)+(element.value.slice(0,element.selectionEnd).split('\n').length-1)*lineHeight+(lineHeight+fontSize)/2-element.scrollTop;
          return {top:viewport.scrollTop,innerTop:element.scrollTop,clipped:element.scrollHeight-element.clientHeight,start:element.selectionStart,end:element.selectionEnd,length:element.value.length,caretBottom,viewTop:view.top,viewBottom:view.top+viewport.clientHeight};
        });
        samples.push({type:entry.type,width,line,...sample});
        expect(await editor.inputValue()).toBe(content);
        expect(sample.start,`caret at ${entry.type}/${width}/${line}`).toBe(content.length);
        expect(sample.end).toBe(content.length);
        expect(sample.clipped,`full height at line ${line}`).toBeLessThanOrEqual(1);
        expect(sample.innerTop,`no inner scroll at line ${line}`).toBe(0);
        expect(sample.top,`no upward jump at line ${line}`).toBeGreaterThanOrEqual(previousTop-1);
        expect(sample.caretBottom,`caret visible at line ${line}`).toBeLessThanOrEqual(sample.viewBottom+1);
        expect(sample.caretBottom).toBeGreaterThan(sample.viewTop);
        previousTop=sample.top;
      }
      await page.screenshot({path:join(shots,`${entry.type}-${width}.png`)});
    }
    const expected=await editor.inputValue();
    await page.getByRole('button',{name:'保存设定',exact:true}).click();
    await expect(page.getByRole('button',{name:'编辑',exact:true})).toBeVisible();
    expect((await call('graph.get',{novelId,nodeId:entry.id})).content).toBe(expected);
    await page.getByRole('button',{name:'‹ 返回设定',exact:true}).click();
    await page.setViewportSize({width:1100,height:900});
  }
  expect(errors).toEqual([]);
  console.log(JSON.stringify({ok:true,checks:['65 successive Enter lines in world and character editors at wide/narrow widths','native caret stays at end and in view','no inner scrolling, clipping or upward jumps','saved body retains all typed lines']}));
} catch(error) {
  await page?.screenshot({path:join(shots,'failure.png')}).catch(()=>{});throw error;
} finally {
  await writeFile(join(shots,'samples.json'),JSON.stringify(samples,null,2));await browser?.close();host.kill();
}

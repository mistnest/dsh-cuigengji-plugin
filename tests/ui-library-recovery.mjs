import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,readFile,readdir,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium,expect} from '@playwright/test';
import {selectSettingsCategory} from './helpers/navigation.mjs';

const workspace=resolve(import.meta.dirname,'..'),out=join(workspace,'test-results/upgrade-readiness');
await mkdir(out,{recursive:true});
const destination=await mkdtemp(join(tmpdir(),'cuigengji-recovery-ui-'));
const host=spawn(process.execPath,['scripts/preview-workbench.mjs'],{cwd:workspace,stdio:['ignore','pipe','pipe'],windowsHide:true});
let browser,page,dataDirectory;
const owned=(path,prefix)=>dirname(resolve(path))===resolve(tmpdir())&&basename(path).startsWith(prefix);
async function hashes(root){
  const files={};
  async function scan(path=''){
    for(const entry of await readdir(join(root,path),{withFileTypes:true})){
      const file=path?`${path}/${entry.name}`:entry.name;
      if(file==='.lock')continue;
      if(entry.isDirectory())await scan(file);
      else if(entry.isFile())files[file]=createHash('sha256').update(await readFile(join(root,file))).digest('hex');
    }
  }
  await scan();return files;
}
try{
  const info=await new Promise((done,reject)=>{
    let output='',errors='';const timer=setTimeout(()=>reject(Error(errors||'Preview startup timed out')),25000);
    host.stderr.on('data',chunk=>errors+=chunk);host.once('exit',()=>{clearTimeout(timer);reject(Error(errors||'Preview exited'));});
    host.stdout.on('data',chunk=>{output+=chunk;const line=output.split('\n').find(value=>value.startsWith('{'));if(line){clearTimeout(timer);done(JSON.parse(line));}});
  });
  dataDirectory=info.dataDirectory;assert.ok(owned(dataDirectory,'cuigengji-preview-'));
  const index=join(dataDirectory,'library.json');assert.equal(dirname(resolve(index)),resolve(dataDirectory));
  const originalIndex=await readFile(index,'utf8');
  await rm(index);const before=await hashes(dataDirectory);
  browser=await chromium.launch({headless:true});page=await browser.newPage({viewport:{width:1280,height:950}});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));await page.goto(info.url);
  await page.getByRole('button',{name:'设置',exact:true}).click();await selectSettingsCategory(page,'数据与备份');
  const directory=page.getByRole('region',{name:'作品库目录管理',exact:true});
  await expect(directory.getByLabel('作品库目录',{exact:true})).toHaveText(dataDirectory);
  await expect(directory.getByRole('alert')).toContainText('作品索引缺失');
  await expect(directory.getByRole('button',{name:/^迁移当前作品库/})).toBeDisabled();
  await expect(directory.getByRole('button',{name:/^打开已有作品库/})).toBeEnabled();
  assert.deepEqual(await hashes(dataDirectory),before,'opening settings must not initialize or change the damaged library');
  await directory.getByRole('button',{name:'从本地副本恢复索引'}).click();
  await directory.getByRole('button',{name:'确认恢复索引'}).click();
  await expect(directory.getByRole('alert')).toHaveCount(0);
  assert.equal(await readFile(index,'utf8'),originalIndex);
  await rm(index);
  await page.reload();
  await page.getByRole('button',{name:'设置',exact:true}).click();
  await selectSettingsCategory(page,'数据与备份');
  await directory.getByRole('button',{name:/^新建空作品库/}).click();
  await directory.getByLabel('目标作品库目录',{exact:true}).fill(destination);
  await directory.getByRole('button',{name:'检查目标目录',exact:true}).click();
  await expect(directory.getByText('目标文件夹为空',{exact:true})).toBeVisible();
  const changed=page.waitForResponse(response=>response.url().endsWith('/dispatch')&&response.request().postDataJSON().action==='library.change');
  await directory.getByRole('button',{name:'创建并打开',exact:true}).click();
  const response=await changed;assert.equal(response.status(),200);assert.equal((await response.json()).dataRoot,destination);
  await expect(directory).toHaveCount(0);
  await expect(page.getByRole('button',{name:'＋ 新建作品',exact:true})).toBeVisible();
  assert.deepEqual(await hashes(dataDirectory),before,'switching keeps every surviving source file unchanged');
  await assert.rejects(stat(index),{code:'ENOENT'});
  const created=JSON.parse(await readFile(join(destination,'library.json'),'utf8'));assert.deepEqual(created.novels,{});
  assert.deepEqual(errors,[]);
  await page.screenshot({path:join(out,'recovered-library.png')});
  await writeFile(join(out,'library-ui.json'),JSON.stringify({ok:true,checks:['damaged source path and error remain visible','status never initializes an empty source index','migration disabled; explicit new library remains available','new library opens normally; every surviving source file retains its hash'],pageErrors:errors},null,2));
  console.log('Library recovery UI passed.');
}finally{
  await browser?.close();
  if(host.exitCode===null)await new Promise(done=>{host.once('exit',done);host.kill();});
  if(dataDirectory){assert.ok(owned(dataDirectory,'cuigengji-preview-'));await rm(dataDirectory,{recursive:true,force:true,maxRetries:5,retryDelay:200});}
  assert.ok(owned(destination,'cuigengji-recovery-ui-'));await rm(destination,{recursive:true,force:true,maxRetries:5,retryDelay:200});
}

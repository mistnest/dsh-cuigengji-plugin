import {readFile, readdir, mkdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash, randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {STORAGE_VERSION} from '../../infrastructure/persistence/project-layout.ts';
import {validateSharedPlans} from '../../domain/collaboration/legacy.ts';
import {normalizeActivity,mergeActivity} from '../activity.ts';
import {ordinaryBindings} from '../bindings/state.ts';

const hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw Object.assign(new Error(message),{code:'INVALID_WORKSPACE_BACKUP'});};
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const equal=isDeepStrictEqual;
const counts=state=>({novels:Object.keys(state.novels).length,chapters:Object.values(state.novels).reduce((sum,n)=>sum+Object.values(n.chapters).filter(c=>!c.deleted).length,0),bindings:Object.keys(state.bindings).length});
const allowed=path=>path==='activity.json'||/^audit\/[a-f0-9]{64}\.jsonl$/.test(path)||/^before-planning-[a-f0-9]{64}\.json$/.test(path);

// Human-only backup boundary. Reuses Store's lock, validation and atomic commit;
// neither agent prompts nor the novel editor knows the archive layout.
export class WorkData {
 constructor(store){this.store=store;}
 async locked(fn){const release=await this.store.acquire();try{return await fn(await this.store.load());}finally{await release();}}
 async files(activity){
  const result=[];
  for(const dir of ['', 'audit']){
   const entries=await readdir(join(this.store.root,dir),{withFileTypes:true}).catch(e=>{if(e.code==='ENOENT')return [];throw e;});
   for(const entry of entries){const path=dir?`${dir}/${entry.name}`:entry.name;if(entry.isFile()&&allowed(path)&&path!=='activity.json'){const content=await readFile(join(this.store.root,path),'utf8');result.push({path,content,sha256:hash(content)});}}
  }
  // A canonical attachment preserves compatibility with older backups while
  // the working library stores and loads counters in separate annual files.
  const content=JSON.stringify(normalizeActivity(activity));
  result.push({path:'activity.json',content,sha256:hash(content)});
  return result.sort((a,b)=>a.path.localeCompare(b.path));
 }
 async status(){return this.locked(async state=>({dataRoot:this.store.root,storageVersion:STORAGE_VERSION,storageLayout:'content-tree',...counts(state),books:Object.values(state.novels).map(n=>({id:n.id,title:n.title,archived:n.archived})),included:['所有作品（含归档）、正文与历史版本、预设、规划与变更、人物世界资料','按书名、卷、页面、类型和分组存放；条目使用名称与稳定短 ID 命名','会话焦点、请求记录、操作日志、规划迁移备份和写作统计（含作者聊天字数）'],excluded:['DSH 聊天记录、附件、API 密钥','浏览器未保存草稿和界面偏好']}));}
 archive(state,files){
  // `activity` is intentionally non-enumerable on a live Workspace. It is
  // carried by the separate activity.json attachment so the writing companion
  // keeps its daily counters after a full workspace migration without changing
  // the logical novel snapshot shape.
  const payload={state,files};
  return {format:'cuigengji-workspace',version:1,exportedAt:new Date().toISOString(),summary:counts(state),sha256:hash(JSON.stringify(payload)),payload};
 }
 async export(){return this.locked(async state=>this.archive(state,await this.files(state.activity)));}
 validate(backup){
  if(backup?.format!=='cuigengji-workspace'||backup.version!==1||!object(backup.payload))fail('不是支持的工作数据备份');
  const {state:sourceState,files}=backup.payload;
  if(hash(JSON.stringify(backup.payload))!==backup.sha256)fail('备份校验失败：内容不完整或已被修改');
  if(sourceState?.schemaVersion!==1||!['novels','bindings','requests'].every(k=>object(sourceState[k]))||!Array.isArray(files))fail('数据结构无效');
  const state={...sourceState,bindings:ordinaryBindings(sourceState.bindings),activity:normalizeActivity(sourceState.activity)};
  if(state.guidance!==undefined&&(!object(state.guidance)||Object.entries(state.guidance).some(([key,value])=>! /^[a-f0-9]{64}$/.test(key)||typeof value!=='boolean')))fail('会话指引设置无效');
  const validated={novels:{}};
  for(const [id,novel] of Object.entries(state.novels)){if(id!==novel.id||['__proto__','constructor','prototype'].includes(id))fail('作品 ID 无效');this.store.importNovel(validated,{backup:{format:'cuigengji',schemaVersion:2,novel}});}
  validateSharedPlans(validated);
  for(const [key,binding] of Object.entries(state.bindings)){const novelId=binding.activeNovelId||binding.novelId;if(!/^[a-f0-9]{64}$/.test(key)||typeof binding.sessionId!=='string'||hash(binding.sessionId)!==key||!Object.hasOwn(state.novels,novelId)||!['discuss','plan','write','revise','memory'].includes(binding.stage)||(binding.chapterId&&!Object.hasOwn(state.novels[novelId].chapters,binding.chapterId)))fail('会话绑定无效');}
  for(const [key,value] of Object.entries(state.requests))if(!/^[a-f0-9]{64}$/.test(key)||!object(value)||typeof value.signature!=='string')fail('请求记录无效');
  const paths=new Set();for(const f of files){if(!object(f)||typeof f.path!=='string'||!allowed(f.path)||paths.has(f.path)||typeof f.content!=='string'||hash(f.content)!==f.sha256)fail('备份文件路径或校验无效');paths.add(f.path);}
  const activityFile=files.find(file=>file.path==='activity.json');
  if(activityFile){try{state.activity=normalizeActivity(JSON.parse(activityFile.content));}catch{fail('活动统计文件无效');}}
  return {...backup.payload,state};
 }
 async plan(state,backup){
  const payload=this.validate(backup),conflicts=[],added=[],skipped=[];
  for(const [id,n] of Object.entries(payload.state.novels)){if(Object.hasOwn(state.novels,id)){if(!equal(state.novels[id],n))conflicts.push(`作品：${n.title}`);else skipped.push(n.title);}else added.push(n.title);}
  for(const section of ['bindings','requests']){const local=section==='bindings'?ordinaryBindings(state.bindings):state.requests;for(const [key,v] of Object.entries(payload.state[section]))if(Object.hasOwn(local,key)&&!equal(local[key],v))conflicts.push(`${section==='bindings'?'会话绑定':'请求记录'}：${key.slice(0,12)}`);}
  const activityMerge=mergeActivity(state.activity,payload.state.activity);
  conflicts.push(...activityMerge.conflicts.map(value=>'写作记录：'+value));
  const local=new Map((await this.files(state.activity)).map(f=>[f.path,f]));
  for(const file of payload.files){
   // Activity is a derived daily ledger. A destination always has its own
   // empty activity.json, so replacing it during a full restore must not be
   // reported as a user data conflict.
   if(file.path==='activity.json')continue;
   const previous=local.get(file.path);if(previous&&!equal(previous,file)&&!(file.path.startsWith('audit/')&&(file.content.startsWith(previous.content)||previous.content.startsWith(file.content))))conflicts.push(`文件：${file.path}`);
  }
  return {payload,activity:activityMerge.activity,report:{...counts(payload.state),added,skipped,conflicts,files:payload.files.length,valid:!conflicts.length}};
 }
 async preview(backup){return this.locked(async state=>(await this.plan(state,backup)).report);}
 async import(backup){return this.locked(async state=>{
  const {payload,activity,report}=await this.plan(state,backup);if(report.conflicts.length)fail('存在冲突，未导入：'+report.conflicts.join('；'));
  const backupDir=join(this.store.root,'backups',`before-import-${Date.now()}-${randomUUID()}`);await mkdir(backupDir,{recursive:true});
  await writeFile(join(backupDir,'workspace.json'),JSON.stringify({state,files:await this.files(state.activity)}),{flag:'wx',mode:0o600});
  const attachments=new Map();
  for(const f of payload.files){if(f.path==='activity.json')continue;const path=join(this.store.root,f.path);let old;try{old=await readFile(path,'utf8');}catch(e){if(e.code!=='ENOENT')throw e;}if(old===undefined||old!==f.content&&f.content.startsWith(old))attachments.set(f.path,f.content);}
  for(const section of ['novels','bindings','requests'])for(const [key,v] of Object.entries(payload.state[section]))if(!Object.hasOwn(state[section],key))state[section][key]=v;
  if(payload.state.guidance)state.guidance={...payload.state.guidance,...state.guidance};
  Object.defineProperty(state,'activity',{value:activity,enumerable:false,writable:true,configurable:true});
  await this.store.save(state,attachments);return {...report,backupDir};
 });}
}

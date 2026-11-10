import {createHash, randomUUID} from 'node:crypto';
import {emptyVariables, type VariableState, type StoryAnchor, type VariableCommit, type Values, type VariableDefinition, type VariablePatch} from './model.ts';
import {variableError, pointer, pathsOverlap, applyVariablePatch, valueAt, jsonValue} from './patch.ts';
import {renderVariables, parseVariableUpdates, importVariableSource} from './tavern.ts';

type Row=Record<string,any>;
const key=(value:string)=>createHash('sha256').update(value).digest('hex');
const object=(v:any)=>v&&typeof v==='object'&&!Array.isArray(v);
const scopes=['story','session'];
const types=['string','number','boolean','object','array','null'];

function validateDefinitions(definitions:VariableDefinition[], novel?:Row){
  if(!Array.isArray(definitions)||definitions.length>1000)variableError('变量说明最多一千项');
  const paths=new Set();
  for(const d of definitions){
    if(!d||typeof d.name!=='string'||!d.name.trim()||d.name.length>200||d.type&&!types.includes(d.type)||d.resourceId&&typeof d.resourceId!=='string')variableError('变量说明格式无效');
    pointer(d.path);
    if(paths.has(d.path)||d.resourceId&&novel&&!novel.nodes?.[d.resourceId])variableError('变量路径重复或关联设定不存在');
    paths.add(d.path);if(d.schema){if(!object(d.schema))variableError('变量约束必须是对象');jsonValue(d.schema);}
  }
}

export function validateVariables(state:VariableState){
  if(!state||state.version!==1||!Number.isSafeInteger(state.revision)||state.revision<0||!Number.isSafeInteger(state.definitionRevision)||state.definitionRevision<0||state.definitionRevision>state.revision||typeof state.enabled!=='boolean'||!Array.isArray(state.commits)||!object(state.initial)||!object(state.localDefaults)||!Array.isArray(state.imports))variableError('变量存储格式无效','CORRUPT_STORE');
  validateDefinitions(state.definitions);jsonValue(state.initial);jsonValue(state.localDefaults);
  const commits=new Map<string,VariableCommit>(),revisions=new Set<number>();
  for(const c of state.commits){
    const parent=c.parentId&&commits.get(c.parentId);
    if(typeof c.id!=='string'||!c.id||commits.has(c.id)||!Number.isSafeInteger(c.revision)||c.revision<1||c.revision>state.revision||revisions.has(c.revision)||c.parentId&&!parent||parent&&(parent.scope!==c.scope||parent.sessionKey!==c.sessionKey)||!Array.isArray(c.paths)||!Array.isArray(c.operations)||!object(c.data)||!scopes.includes(c.scope)||c.scope==='session'&&!/^[a-f0-9]{64}$/.test(c.sessionKey||'')||!c.actor||typeof c.reason!=='string'||!Number.isFinite(Date.parse(c.time)))variableError('变量快照轨迹无效','CORRUPT_STORE');
    validateAnchorShape(c.anchor);jsonValue(c.data);for(const path of c.paths)pointer(path);
    for(const op of c.operations){pointer(op.path);if(op.from!==undefined)pointer(op.from);if(Object.hasOwn(op,'value'))jsonValue(op.value);}
    commits.set(c.id,c);revisions.add(c.revision);
  }
  for(const row of state.imports){if(!row||typeof row.digest!=='string'||!Number.isFinite(Date.parse(row.time)))variableError('变量原始来源无效','CORRUPT_STORE');jsonValue(row.raw);}
}

function validateAnchorShape(value:any){
  if(!value||!['initial','chapter'].includes(value.kind)||value.kind==='chapter'&&(typeof value.chapterId!=='string'||!Number.isSafeInteger(value.chapterRevision)||value.chapterRevision<1||!['start','end'].includes(value.position)))variableError('剧情锚点需要章节 ID、版本和 start/end');
}
function anchor(novel:Row,value:any):StoryAnchor{
  validateAnchorShape(value);if(value.kind==='initial')return {kind:'initial'};
  const chapter=novel.chapters?.[value.chapterId];
  if(!chapter||chapter.deleted||value.chapterRevision>chapter.revision)variableError('剧情锚点的章节不存在或版本无效');
  return {kind:'chapter',chapterId:value.chapterId,chapterRevision:value.chapterRevision,position:value.position,...(value.label?{label:String(value.label).slice(0,100)}:{})};
}
/** Compare positions as tuples: chapter order may be fractional, so never add .5. */
function compareAnchor(novel:Row,a:StoryAnchor,b:StoryAnchor){
  if(a.kind==='initial')return b.kind==='initial'?0:-1;if(b.kind==='initial')return 1;
  const ac=novel.chapters?.[a.chapterId],bc=novel.chapters?.[b.chapterId];
  const volume=(chapter:Row)=>chapter?.volumeId?(novel.volumes?.[chapter.volumeId]?.order??0):0;
  const volumeOrder=volume(ac)-volume(bc);if(volumeOrder)return volumeOrder;
  const order=(novel.chapters?.[a.chapterId]?.order??Infinity)-(novel.chapters?.[b.chapterId]?.order??Infinity);
  if(order)return order;if(a.chapterId!==b.chapterId)return a.chapterId.localeCompare(b.chapterId);
  return Number(a.position==='end')-Number(b.position==='end');
}
function isStale(novel:Row,commit:VariableCommit,byId:Map<string,VariableCommit>):boolean{
  const seen=new Set<string>();let current:VariableCommit|undefined=commit;
  while(current){
    if(seen.has(current.id)||current.invalidatedBy)return true;seen.add(current.id);const a=current.anchor;
    if(a.kind==='chapter'&&(!novel.chapters?.[a.chapterId]||novel.chapters[a.chapterId].deleted||novel.chapters[a.chapterId].revision!==a.chapterRevision))return true;
    current=current.parentId?byId.get(current.parentId):undefined;
  }
  return false;
}
function scopeFor(args:Row,sessionId:string){
  const scope=args.scope||'story';if(!scopes.includes(scope))variableError('scope 必须是 story 或 session');
  if(scope==='session'&&!sessionId)variableError('会话草稿需要当前会话身份');return scope as 'story'|'session';
}
export function variableSnapshot(novel:Row,args:Row={},sessionId=''){
  const state:VariableState=novel.variables||emptyVariables(),scope=scopeFor(args,sessionId),sessionKey=key(sessionId),byId=new Map(state.commits.map(c=>[c.id,c]));
  let commits=state.commits.filter(c=>c.scope===scope&&(scope!=='session'||c.sessionKey===sessionKey));
  const target=args.anchor?anchor(novel,args.anchor):args.chapterId?anchor(novel,{kind:'chapter',chapterId:args.chapterId,chapterRevision:args.chapterRevision??novel.chapters?.[args.chapterId]?.revision,position:args.position||'start'}):null;
  if(target)commits=commits.filter(c=>compareAnchor(novel,c.anchor,target)<=0&&(target.kind!=='chapter'||c.anchor.kind!=='chapter'||c.anchor.chapterId!==target.chapterId||c.anchor.chapterRevision===target.chapterRevision));
  const stale=commits.filter(c=>isStale(novel,c,byId));
  const ordered=[...commits].sort((a,b)=>compareAnchor(novel,a.anchor,b.anchor)||a.revision-b.revision);
  const commit=args.snapshotId?commits.find(c=>c.id===args.snapshotId):ordered.reverse().find(c=>!isStale(novel,c,byId));
  if(args.snapshotId&&!commit)variableError('此剧情范围没有该变量快照','NOT_FOUND');
  return {enabled:state.enabled,revision:state.revision,snapshotId:commit?.id||null,anchor:commit?.anchor||{kind:'initial'},scope,data:structuredClone(commit?.data||(scope==='session'?state.localDefaults:state.initial)),stale:stale.map(c=>({id:c.id,revision:c.revision,anchor:c.anchor,reason:'来源章节或上游状态已变化，请核对'})),historical:!!commit&&isStale(novel,commit,byId)};
}
/** Array insertions/removals shift siblings, so concurrent edits conflict at the array. */
function impactPaths(data:Values,operations:VariablePatch[]){
  const paths=new Set<string>();
  for(const op of operations||[]){if(op.op==='test')continue;
    for(const path of [op.path,...(op.from!==undefined?[op.from]:[])]){
      pointer(path);paths.add(path);const parent=path.slice(0,path.lastIndexOf('/'));
      if(path&&Array.isArray(valueAt(data,parent)))paths.add(parent);
    }
  }
  return [...paths];
}
function mergeValues(before:Values,added:Values):Values{
  const result=structuredClone(before);for(const [k,v] of Object.entries(added))result[k]=object(v)&&object(result[k])?mergeValues(result[k] as Values,v as Values):structuredClone(v);return result;
}

export function variableAction(novel:Row,action:string,args:Row,actor:Row):any{
  const state:VariableState=novel.variables||emptyVariables(),sessionId=String(actor.sessionId||'');
  if(action==='variables.config')return {enabled:state.enabled,revision:state.revision,definitions:structuredClone(state.definitions),localDefaults:structuredClone(state.localDefaults)};
  if(action==='variables.list'){
    const result=variableSnapshot(novel,args,sessionId);
    return {...result,data:undefined,items:Object.entries(result.data).map(([path,value])=>({path:'/'+path.replaceAll('~','~0').replaceAll('/','~1'),type:Array.isArray(value)?'array':value===null?'null':typeof value,summary:JSON.stringify(value).slice(0,160)})),definitions:state.definitions};
  }
  if(action==='variables.read'){const result=variableSnapshot(novel,args,sessionId);return args.path!==undefined?{...result,data:undefined,path:args.path,value:valueAt(result.data,args.path)}:result;}
  if(action==='variables.history'){
    const scope=args.scope?scopeFor(args,sessionId):null,offset=Math.max(0,Math.floor(Number(args.offset)||0)),limit=Math.min(200,Math.max(1,Math.floor(Number(args.limit)||50))),byId=new Map(state.commits.map(c=>[c.id,c]));
    const rows=state.commits.filter(c=>(!scope||c.scope===scope)&&(c.scope!=='session'||c.sessionKey===key(sessionId))).reverse();
    return {revision:state.revision,count:rows.length,nextOffset:rows.length>offset+limit?offset+limit:null,items:rows.slice(offset,offset+limit).map(c=>({...c,sessionKey:undefined,data:args.includeData===true?c.data:undefined,operations:undefined,actor:{kind:c.actor.kind},stale:isStale(novel,c,byId)}))};
  }
  if(action==='variables.render'){
    const result=variableSnapshot(novel,{...args,scope:'story'},sessionId),local=sessionId?variableSnapshot(novel,{...args,snapshotId:undefined,scope:'session'},sessionId):{data:state.localDefaults};
    return {...renderVariables(String(args.text||''),result.data,local.data,{user:args.userName,char:args.characterName}),snapshotId:result.snapshotId,revision:result.revision,stale:result.stale};
  }
  if(action==='variables.parse')return parseVariableUpdates(String(args.text||''));
  if(action==='variables.importPreview')return importVariableSource(args.input);
  if(['variables.configure','variables.import'].includes(action)){
    if(actor.kind!=='human')variableError('变量启用、说明与来源导入由作者在设置中确认','HUMAN_REQUIRED');
    if(args.baseRevision!==state.revision)variableError('变量配置已变化，请刷新','CONFLICT');
    const next=structuredClone(state);
    if(action==='variables.configure'){
      if(typeof args.enabled==='boolean')next.enabled=args.enabled;
      if(args.definitions!==undefined){validateDefinitions(args.definitions,novel);next.definitions=structuredClone(args.definitions);}
    }else{
      const imported=importVariableSource(args.input);
      if(args.digest!==imported.digest)variableError('导入内容已变化，请重新预览','CONFLICT');
      if(next.imports.some(i=>i.digest===imported.digest))return {revision:next.revision,enabled:next.enabled,duplicate:true};
      if(imported.hasGlobals&&args.globalScope!=='story')variableError('请确认把原酒馆全局变量映射到此作品，避免影响其他作品');
      next.initial=mergeValues(variableSnapshot(novel,{anchor:{kind:'initial'}}).data,imported.story);
      next.localDefaults=mergeValues(next.localDefaults,imported.local);
      for(const c of next.commits)c.invalidatedBy=next.revision+1;
      next.imports.push({digest:imported.digest,raw:structuredClone(args.input),time:new Date().toISOString()});
    }
    next.revision++;next.definitionRevision=next.revision;novel.variables=next;return {revision:next.revision,enabled:next.enabled};
  }
  if(!['variables.preview','variables.patch','variables.restore'].includes(action))variableError('未知变量操作');
  if(!state.enabled)variableError('此作品尚未启用变量，请由作者在设置中启用');
  if(!Number.isSafeInteger(args.baseRevision)||args.baseRevision<0||args.baseRevision>state.revision)variableError('请读取变量并提供 baseRevision');
  const target=anchor(novel,args.anchor),scope=scopeFor(args,sessionId),current=variableSnapshot(novel,{anchor:target,scope},sessionId);
  if(target.kind==='chapter'&&novel.chapters[target.chapterId].revision!==target.chapterRevision)variableError('章节已更新，请重新核对变量后使用当前章节版本','CONFLICT');
  let operations:VariablePatch[]=args.operations;
  if(action==='variables.restore'){
    const from=state.commits.find(c=>c.id===args.snapshotId&&c.scope===scope&&(scope!=='session'||c.sessionKey===key(sessionId)));
    if(!from)variableError('待恢复的快照不存在于此作用域','NOT_FOUND');operations=[{op:'set',path:'',value:from!.data}];
  }
  const data=applyVariablePatch(current.data,operations,state.definitions),paths=impactPaths(current.data,operations),chain:VariableCommit[]=[];
  let cursor:VariableCommit|undefined=current.snapshotId?state.commits.find(c=>c.id===current.snapshotId):undefined;
  while(cursor){chain.push(cursor);const parentId=cursor.parentId;cursor=parentId?state.commits.find(c=>c.id===parentId):undefined;}
  if(args.baseRevision<state.definitionRevision||chain.some(c=>c.revision>args.baseRevision&&c.paths.some(a=>paths.some(b=>pathsOverlap(a,b)))))variableError('相同变量或配置已变化，请重读后决定如何合并','CONFLICT');
  const changes=paths.map(path=>({path,before:valueAt(current.data,path),after:valueAt(data,path)}));
  if(action==='variables.preview')return {revision:state.revision,snapshotId:current.snapshotId,anchor:target,scope,data,changes,stale:current.stale};
  if(typeof args.requestId!=='string'||!args.requestId)variableError('变量提交需要 requestId，重试必须复用');
  const next=structuredClone(state),commit:VariableCommit={id:randomUUID(),revision:state.revision+1,parentId:current.snapshotId,anchor:target,scope,...(scope==='session'?{sessionKey:key(sessionId)}:{}),data,operations:structuredClone(operations),paths,actor:{kind:actor.kind||'agent',...(actor.sessionId?{sessionId:actor.sessionId}:{})},time:new Date().toISOString(),reason:String(args.reason||'').slice(0,4000)};
  for(const c of next.commits)if(c.scope===scope&&(scope==='story'||c.sessionKey===key(sessionId))&&compareAnchor(novel,c.anchor,target)>0)c.invalidatedBy=commit.revision;
  next.revision++;next.commits.push(commit);novel.variables=next;return {revision:next.revision,snapshotId:commit.id,anchor:target,scope,changes};
}

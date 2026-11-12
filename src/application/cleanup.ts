import {createHash} from 'node:crypto';
import type {Row,Workspace} from '../infrastructure/persistence/project-layout.ts';
import type {CleanupSelection,CleanupPreview,CleanupRow,CleanupReference,CleanupResult} from '../contracts/cleanup.ts';
import {planningNodeVersions} from '../domain/planning/history.ts';
import {retainSharedPlans} from '../domain/collaboration/legacy.ts';
import {applyNovelLifecycle} from './novels/lifecycle.ts';

const fail=(code:string,message:string):never=>{throw Object.assign(new Error(message),{code});};
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const own=(map:Row,id:string)=>Object.hasOwn(map,id);
const scopes=['chapter-history','memory-history','planning-history','chapter-trash','novel-trash'];
const normalizeSelection=(value:CleanupSelection):CleanupSelection=>({scope:value.scope,
  ...(value.scope==='novel-trash'?{}:{novelId:value.novelId}),
  ...(typeof value.scope==='string'&&value.scope.endsWith('-history')?{entityId:value.entityId,filter:value.filter??{mode:'keep',count:10}}:value.ids===undefined?{}:{ids:value.ids}),
});
const stamp=(novel:Row)=>{novel.revision++;novel.updatedAt=new Date().toISOString();};
const getNovel=(state:Workspace,id?:string):Row=>{
  if(!id||!own(state.novels,id))return fail('NOT_FOUND','目标作品不存在');
  return state.novels[id];
};

/** Include references in retained history as well as current cards. Restoring a
 * surviving version must never silently recreate an invalid chapter pointer. */
function chapterReferences(novel:Row,chapterId:string,revision?:number):CleanupReference[]{
  const result:CleanupReference[]=[],seen=new Set<string>();
  const add=(ref:CleanupReference)=>{const key=JSON.stringify(ref);if(!seen.has(key)){seen.add(key);result.push(ref);}};
  const matches=(ref:Row)=>ref?.chapterId===chapterId&&(revision===undefined||ref.revision===revision);
  for(const node of Object.values(novel.nodes||{}) as Row[])for(const snapshot of [node,...(node.versions||[])]){
    if((snapshot.sources||[]).some(matches))add({kind:'memory',id:node.id,title:node.name,revision:snapshot.revision,locatable:!node.deleted});
  }
  for(const edge of Object.values(novel.edges||{}) as Row[])if((edge.sources||[]).some(matches))add({kind:'relation',id:edge.id,title:edge.name||'人物关系'});
  for(const node of Object.values(novel.planning?.nodes||{}) as Row[])for(const snapshot of planningNodeVersions(novel.planning,node as any)){
    if(snapshot.chapterRefs?.some(matches))add({kind:'planning',id:node.id,title:node.title,revision:snapshot.revision,locatable:!node.deleted});
  }
  for(const commit of novel.variables?.commits||[])if(commit.anchor?.kind==='chapter'&&commit.anchor.chapterId===chapterId&&(revision===undefined||commit.anchor.chapterRevision===revision))add({kind:'variables',id:commit.id,title:commit.reason||'剧情变量快照',revision:commit.revision});
  // Immutable legacy snapshots have their own digest; protect their anchors
  // instead of changing them behind the author's back.
  for(const snapshot of Object.values(novel.collaboration?.snapshots||{}) as Row[])for(const value of [...Object.values(snapshot.nodes||{}),...Object.values(snapshot.settings||{})] as Row[]){
    if([...(value.chapterRefs||[]),...(value.sources||[])].some(matches))add({kind:'legacy',id:snapshot.id,title:'旧版共同规划快照'});
  }
  for(const report of Object.values(novel.collaborationProgress?.reports||{}) as Row[])if((report.artifacts||[]).some((ref:Row)=>ref.kind==='chapter'&&ref.id===chapterId&&(revision===undefined||ref.revision===revision)))add({kind:'legacy',id:report.taskId,title:'旧版写作成果记录',revision:report.revision});
  return result;
}

function versions(novel:Row,selection:CleanupSelection):Row[]{
  const collection=selection.scope==='chapter-history'?novel.chapters:selection.scope==='memory-history'?novel.nodes:novel.planning?.nodes;
  if(!selection.entityId||!collection||!own(collection,selection.entityId))return fail('NOT_FOUND','目标章节或卡片不存在');
  const item=collection[selection.entityId];
  return selection.scope==='planning-history'?planningNodeVersions(novel.planning,item):item.versions||[];
}

export function previewCleanup(state:Workspace,selection:CleanupSelection):CleanupPreview{
  selection=normalizeSelection(selection);
  if(!scopes.includes(selection.scope))fail('INVALID_INPUT','清理范围无效');
  if(selection.ids!==undefined&&(!Array.isArray(selection.ids)||selection.ids.some(id=>typeof id!=='string'||!id)))fail('INVALID_INPUT','删除条目需要有效 ID 列表');
  let title:string,rows:CleanupRow[],fingerprint:unknown;
  if(selection.scope==='novel-trash'){
    const books=(Object.values(state.novels) as Row[]).filter(n=>n.archived);
    if(selection.ids?.some(id=>!books.some(n=>n.id===id)))fail('CONFLICT','回收站已变化，请重新核对');
    title='作品回收站';fingerprint=state.novels;
    rows=books.map(n=>({id:n.id,title:n.title,time:n.archivedAt||n.updatedAt,selected:selection.ids===undefined||selection.ids.includes(n.id),protected:false,references:[]}));
  }else{
    const novel=getNovel(state,selection.novelId);if(novel.archived)fail('NOVEL_RECYCLED','请先恢复作品，再清理其中的内容');
    fingerprint=novel;
    if(selection.scope==='chapter-trash'){
      const chapters=(Object.values(novel.chapters) as Row[]).filter(c=>c.deleted);
      if(selection.ids?.some(id=>!chapters.some(c=>c.id===id)))fail('CONFLICT','章节回收站已变化，请重新核对');
      title=`《${novel.title}》的章节回收站`;
      rows=chapters.map(c=>{const refs=chapterReferences(novel,c.id);return{id:c.id,title:c.title,time:c.updatedAt,selected:selection.ids===undefined||selection.ids.includes(c.id),protected:refs.length>0,reason:refs.length?'仍被引用':undefined,references:refs};});
    }else{
      const history=versions(novel,selection).slice().sort((a,b)=>b.revision-a.revision);
      const current=(selection.scope==='chapter-history'?novel.chapters:selection.scope==='memory-history'?novel.nodes:novel.planning.nodes)[selection.entityId!];
      title=current.title||current.name;
      const filter=selection.filter??{mode:'keep',count:10};
      if(filter.mode==='keep'&&(!Number.isSafeInteger(filter.count)||filter.count<1))fail('INVALID_INPUT','至少保留最近 1 个版本');
      if(filter.mode==='selected'&&(!Array.isArray(filter.revisions)||filter.revisions.some(r=>!Number.isSafeInteger(r)||r<1)))fail('INVALID_INPUT','版本选择无效');
      if(filter.mode==='selected'&&filter.revisions.some(r=>!history.some(v=>v.revision===r)))fail('CONFLICT','历史版本已变化，请重新核对');
      if(filter.mode==='before'&&(typeof filter.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(filter.date)||Number.isNaN(Date.parse(filter.date))||new Date(filter.date).toISOString().slice(0,10)!==filter.date))fail('INVALID_INPUT','请选择有效日期');
      if(!['keep','selected','before'].includes(filter.mode))fail('INVALID_INPUT','历史清理条件无效');
      rows=history.map((v,index)=>{
        const time=v.timestamp||v.updatedAt;
        const refs=selection.scope==='chapter-history'?chapterReferences(novel,current.id,v.revision):[];
        // Earlier builds occasionally omitted a metadata-only memory revision.
        // Its last saved body still represents the current version.
        const isCurrent=v.revision===current.revision||selection.scope==='memory-history'&&index===0;
        const selected=filter.mode==='selected'?filter.revisions.includes(v.revision):filter.mode==='keep'?index>=filter.count:!!time&&new Date(time).getTime()<new Date(filter.date+'T00:00:00').getTime();
        return{id:String(v.revision),title:`v${v.revision}`,revision:v.revision,time,selected,protected:isCurrent||refs.length>0,reason:isCurrent?'当前版本':refs.length?'仍被引用':undefined,references:refs};
      });
    }
  }
  return{scope:selection.scope,title,rows,token:hash({selection,fingerprint}),count:rows.filter(r=>r.selected&&!r.protected).length,protectedCount:rows.filter(r=>r.selected&&r.protected).length,unit:selection.scope==='novel-trash'?'部作品':selection.scope==='chapter-trash'?'个章节':'个版本'};
}

/** Explicitly remove both sides of every matching planning snapshot. Markers
 * carry identity only; the original body cannot be reconstructed by history,
 * batch revert, a later update, or a cache retry. Sibling changes survive. */
function prunePlanning(novel:Row,nodeId:string,revisions:Set<number>){
  for(const transaction of novel.planning.transactions)for(const change of transaction.changes)if(change.collection==='nodes'&&change.id===nodeId){
    for(const side of ['before','after'])if(change[side]&&revisions.has(change[side].revision))change[side]={id:nodeId,revision:change[side].revision,pruned:true};
  }
  novel.planning.sequence++;
}

export function applyCleanup(state:Workspace,selection:CleanupSelection,preview:CleanupPreview):void{
  const ids=preview.rows.filter(r=>r.selected&&!r.protected).map(r=>r.id);
  const affected=selection.scope==='novel-trash'?ids:[selection.novelId!];
  // Preserve idempotency signatures. Erasing them could replay a previously
  // completed create and resurrect deleted data after a delayed transport retry.
  const expired=Object.fromEntries(Object.entries(state.requests).filter(([,request])=>affected.includes(request.novelId)||affected.includes(request.result?.id)||affected.includes(request.result?.novelId)||Array.isArray(request.result?.novelIds)&&request.result.novelIds.some((id:string)=>affected.includes(id))).map(([id,request])=>[id,{signature:request.signature,timestamp:request.timestamp,novelId:request.novelId,cleaned:true}]));
  if(selection.scope==='novel-trash'){
    for(const id of ids){const novel=getNovel(state,id);retainSharedPlans(state,novel);applyNovelLifecycle(state,novel,'novel.purge',{confirm:true});}
  }else{
    const novel=getNovel(state,selection.novelId);
    if(selection.scope==='chapter-trash'){
      for(const id of ids)delete novel.chapters[id];
      for(const binding of Object.values(state.bindings) as Row[])if((binding.activeNovelId||binding.novelId)===novel.id&&ids.includes(binding.chapterId))binding.chapterId=null;
    }else{
      const revisions=new Set(ids.map(Number));
      if(selection.scope==='planning-history')prunePlanning(novel,selection.entityId!,revisions);
      else{const node=(selection.scope==='chapter-history'?novel.chapters:novel.nodes)[selection.entityId!];node.versions=node.versions.filter((v:Row)=>!revisions.has(v.revision));}
    }
    stamp(novel);
  }
  Object.assign(state.requests,expired);
}

export function prepareCleanup(state:Workspace,args:CleanupSelection&{token?:string;confirm?:boolean;backup?:unknown;requestId?:string}){
  if(args.confirm!==true||typeof args.requestId!=='string'||!args.requestId)fail('CONFIRM_REQUIRED','清理需要作者确认和 requestId');
  // An old open panel must not delete under the promise of creating a backup.
  if(args.backup!==undefined&&args.backup!==false)fail('INVALID_INPUT','清理已改为直接删除，请刷新页面后重新确认');
  // Only the selection participates in the preview fingerprint.
  const selection=normalizeSelection(args);
  const preview=previewCleanup(state,selection);
  if(args.token!==preview.token)fail('CONFLICT','内容或引用已变化，请重新核对清理清单');
  if(!preview.count)fail('NOTHING_TO_CLEAN','没有可以删除的内容；当前版本和被引用内容会保留');
  applyCleanup(state,selection,preview);
  const result:CleanupResult={deleted:preview.count};
  return{result,affected:selection.scope==='novel-trash'?Object.keys(state.novels):[selection.novelId!]};
}

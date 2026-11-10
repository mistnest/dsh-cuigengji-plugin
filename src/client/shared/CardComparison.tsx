import React,{useEffect,useMemo,useRef,useState} from 'react';
import {diffProse} from '../../domain/chapters/diff.ts';
import {planningContentFields} from '../../domain/planning/history.ts';
import {memoryVersionFields} from '../../domain/memory/history.ts';
import {ChangeRows,UnchangedRows} from './ProseDiff.tsx';
import {useResource} from './state.js';
import {ResourceState} from './ui.jsx';
import type {FeatureCall} from './workspace-state.ts';
import {CleanupDialog,HistoryCleanupMenu} from './CleanupDialog.tsx';
import type {CleanupFilter} from '../../contracts/cleanup.ts';

type Card=Record<string,any>&{id:string;revision:number};
type Version=Card&{kind:string;reason?:string;content?:string;timestamp?:string;updatedAt?:string;actor?:{kind?:string}};
const labels:Record<string,string>={title:'标题',name:'名称',summary:'摘要',content:'正文',type:'类型',scope:'范围',status:'状态',threads:'故事线',chapterRefs:'正文引用',memoryRefs:'关联设定',storyTime:'适用阶段',factType:'事实属性',sources:'正文来源',aliases:'别名',knownBy:'知情人物',dependsOn:'依赖设定'};
const names:Record<string,string>={character_card:'角色卡',world_entry:'世界书',world_book:'世界书',idea:'讨论中',selected:'准备采用',written:'已写入正文',dropped:'暂不采用',long:'长期',phase:'阶段',near:'近期',unspecified:'未指定',active:'使用中',stale:'待核对',unconfirmed:'待讨论',retired:'已停用',fact:'事实',belief:'角色认知',misunderstanding:'误解',plan:'计划'};
const equal=(a:unknown,b:unknown)=>JSON.stringify(a??null)===JSON.stringify(b??null);
export async function readCardVersions(call:FeatureCall,kind:'planning'|'memory',novelId:string,nodeId:string,revision?:number):Promise<Version[]> {
  const args={novelId,nodeId,...(revision!==undefined?{revision,includeContent:true}:{})};
  if(kind==='memory')return (await call('graph.history',args)).map((version:Version)=>({...version,id:nodeId}));
  const versions:Version[]=[];let offset:number|null=0,sequence:number|undefined;
  do {
    const result=await call('planning.node.history',{...args,offset,limit:200});
    if(sequence!==undefined&&sequence!==result.sequence)throw new Error('规划历史在读取期间已更新，请重试');
    sequence=result.sequence;
    versions.push(...result.items);offset=result.nextOffset;
  } while(offset!==null);
  return versions;
}

/** Both card editors keep their draft hook mounted while this read-only view is open. */
export function CardComparison({call,novelId,kind,draft,dirty,busy,close,restore,referenceName}: {
  call:FeatureCall;novelId:string;kind:'planning'|'memory';draft:Card;dirty:boolean;busy:boolean;
  close:()=>void;restore:(revision:number)=>Promise<unknown>;referenceName?:(id:string)=>string;
}) {
  const root=useRef<HTMLElement>(null);
  const [selected,setSelected]=useState<number|null>(null),[layout,setLayout]=useState<'side'|'inline'>('side'),[narrow,setNarrow]=useState(true),[change,setChange]=useState(0);
  const [cleanup,setCleanup]=useState<CleanupFilter|null>(null),[historyEpoch,setHistoryEpoch]=useState(0);
  const history=useResource(async()=>({epoch:historyEpoch,items:await readCardVersions(call,kind,novelId,draft.id)}),[call,kind,novelId,draft.id,draft.revision,historyEpoch]);
  const loaded=history.value as {epoch:number;items:Version[]}|null;
  const versions=useMemo(()=>(loaded?.epoch===historyEpoch?loaded.items:[]).filter(v=>!['layout','organization'].includes(v.kind)).sort((a,b)=>b.revision-a.revision),[history.value,historyEpoch]);
  useEffect(()=>{
    if(!versions.length||selected!==null&&versions.some(v=>v.revision===selected))return;
    const prior=versions.find(v=>dirty?v.revision<=draft.revision:v.revision<draft.revision);
    setSelected((prior||versions[0]).revision);
  },[versions,selected,draft.revision,dirty]);
  const body=useResource(()=>selected===null?Promise.resolve([]):readCardVersions(call,kind,novelId,draft.id,selected),[call,kind,novelId,draft.id,selected,historyEpoch]);
  const before=(body.value as Version[]|null)?.find(v=>v.id===draft.id&&v.revision===selected);
  const keys=kind==='planning'?planningContentFields:memoryVersionFields.filter(key=>!['groupId','pageId','deleted'].includes(key));
  const text=(value:unknown,key:string):string=>{
    if(value==null)return '';
    if(Array.isArray(value))return value.map(item=>typeof item==='string'?referenceName&&['memoryRefs','knownBy','dependsOn'].includes(key)?referenceName(item):item:item&&typeof item==='object'&&'chapterId'in item?`${referenceName?.(item.chapterId)||'章节'} · v${item.revision}`:JSON.stringify(item)).join('\n');
    return typeof value==='string'?(names[value]&&['type','scope','status','factType'].includes(key)?names[value]:value):String(value);
  };
  const fields=useMemo(()=>before?keys.map(key=>({key,before:text(before[key],key),after:text(draft[key],key),different:!equal(before[key],draft[key])})):[],[before,draft,kind,referenceName]);
  const diffs=useMemo(()=>{
    let index=0;
    return fields.map(field=>({...field,chunks:diffProse(field.before,field.after).map(chunk=>chunk.kind==='change'?{...chunk,change:index++}:chunk)}));
  },[fields]);
  const changes=diffs.reduce((n,field)=>n+field.chunks.filter(c=>c.kind==='change').length,0);
  useEffect(()=>setChange(0),[selected]);
  useEffect(()=>{const el=root.current;if(!el)return;el.querySelector<HTMLButtonElement>('button')?.focus({preventScroll:true});const observer=new ResizeObserver(([entry])=>setNarrow(entry.contentRect.width<640));observer.observe(el);return()=>observer.disconnect();},[]);
  const move=(delta:number)=>{if(!changes)return;const next=(change+delta+changes)%changes;setChange(next);root.current?.querySelector(`[data-change="${next}"]`)?.scrollIntoView({block:'nearest'});};
  const same=fields.every(field=>!field.different);
  const untouched=Boolean(before)&&same&&versions.length<=1&&!dirty;
  return <section ref={root} className="card-comparison prose-comparison" aria-label="卡片改动对比" data-layout={narrow?'inline':layout}>
    <header className="card-comparison-head"><div><small>改动对比</small><strong title={draft.title||draft.name}>{draft.title||draft.name}</strong></div><button type="button" onClick={close}>返回内容</button></header>
    <div className="card-comparison-tools"><label>历史版本<select aria-label="对照卡片版本" value={selected??''} onChange={event=>setSelected(Number(event.target.value))}><option value="" disabled>选择版本</option>{versions.map(version=><option value={version.revision} key={version.revision}>v{version.revision} · {version.actor?.kind==='agent'?'AI':'作者'}{version.reason?` · ${version.reason}`:''}</option>)}</select></label><span className="card-comparison-current">→ {dirty?'当前草稿':`当前 v${draft.revision}`}</span><div className="chapter-diff-modes"><button type="button" aria-pressed={!narrow&&layout==='side'} disabled={narrow} onClick={()=>setLayout('side')}>并排</button><button type="button" aria-pressed={narrow||layout==='inline'} onClick={()=>setLayout('inline')}>行内</button></div><HistoryCleanupMenu disabled={busy||dirty||history.loading} selected={selected} current={draft.revision} open={setCleanup}/></div>
    <div className="card-diff-navigation"><div><button type="button" aria-label="上一处改动" disabled={!changes} onClick={()=>move(-1)}>↑</button><span role="status">{changes?`第 ${Math.min(change+1,changes)} / ${changes} 处改动`:'无内容改动'}</span><button type="button" aria-label="下一处改动" disabled={!changes} onClick={()=>move(1)}>↓</button></div><span className="chapter-diff-legend"><span>− 删除</span><span>＋ 新增</span></span></div>
    <div className="card-diff-scroll"><ResourceState resource={history}><ResourceState resource={body}>
      {untouched&&<p className="empty">这张卡片还没有历史改动。</p>}
      {before&&!untouched&&<><div className="card-diff-labels"><span>历史 v{before.revision}</span><span>{dirty?'当前草稿':`当前 v${draft.revision}`}</span></div>{diffs.filter(field=>field.different||['title','name','summary','content'].includes(field.key)).map(field=><section className="card-diff-field" key={field.key} data-field={field.key}><h4>{labels[field.key]||field.key}{!field.different&&<small>未修改</small>}</h4>{field.different||['title','name','summary','content'].includes(field.key)?field.chunks.map((chunk,index)=>chunk.kind==='same'?<UnchangedRows key={`${selected}:${index}`} chunk={chunk}/>:<section className="chapter-diff-change" data-change={chunk.change} data-current={chunk.change===change} key={`${selected}:${index}`}><ChangeRows chunk={chunk}/></section>):null}</section>)}{same&&<p className="empty">此版本与当前内容一致。</p>}</>}
      {!versions.length&&history.value&&<p className="empty">暂无可比较的历史版本。</p>}
      {!before&&selected!==null&&!body.error&&<p className="empty" role="status">正在读取 v{selected}…</p>}
    </ResourceState></ResourceState></div>
    <footer className="card-comparison-foot"><span>{before?`v${before.revision}${before.timestamp||before.updatedAt?` · ${new Date(before.timestamp||before.updatedAt!).toLocaleString('zh-CN')}`:''}`:'改动对比'}</span><button type="button" disabled={busy||!before||same||draft.deleted} onClick={()=>{if(before)void restore(before.revision);}}>{dirty?'保存草稿后恢复':'恢复此版'}</button></footer>
    {cleanup&&<CleanupDialog call={call} selection={{scope:kind==='planning'?'planning-history':'memory-history',novelId,entityId:draft.id,filter:cleanup}} close={()=>setCleanup(null)} onCleaned={()=>{setSelected(null);setHistoryEpoch(n=>n+1);}}/>}
  </section>;
}

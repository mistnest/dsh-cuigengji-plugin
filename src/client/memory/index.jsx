import React, { useEffect, useRef, useState } from 'react';
import { useDialog } from '../dialog.jsx';
import { useDraft, useResource } from '../shared/state.js';
import { ResourceState, ReadingText, SaveBar, saveShortcut } from '../shared/ui.jsx';
import { TavernImport } from './tavern-import.jsx';
const message = error => error?.message || String(error);
export function Memory({call, novelId, tick, run, busy}) {
  const [query,setQuery]=useState(''),[type,setType]=useState(''),[node,setNode]=useState(null),[edge,setEdge]=useState(null),[view,setView]=useState('list');
  const [poll,setPoll]=useState(0),[selectionError,setSelectionError]=useState('');
  const {confirm}=useDialog();
  const resource=useResource(()=>Promise.all([call('graph.list',{novelId}),call('edge.list',{novelId}),call('chapter.list',{novelId})]),[call,novelId,tick,poll]);
  useEffect(()=>{const timer=setInterval(()=>setPoll(n=>n+1),5000);return ()=>clearInterval(timer);},[]);
  const [nodes=[],edges=[],chapters=[]]=resource.value||[];
  const selection = useRef(0);
  useEffect(()=>()=>{selection.current++;},[]);
  const select=async n=>{const request=++selection.current;setSelectionError('');try{const data=await call('graph.get',{novelId,nodeId:n.id});if(request!==selection.current)return;setEdge(null);setNode(data);}catch(e){if(request===selection.current)setSelectionError(message(e));}};
  const visible=nodes.filter(n=>(!type||n.type===type)&&`${n.name} ${n.summary} ${(n.aliases||[]).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  if(node)return <><button onClick={()=>setNode(null)}>‹ 所有设定</button><NodeEditor key={node.id||node.type} {...{call,novelId,run,busy,nodes,chapters}} initial={node} latest={nodes.find(n=>n.id===node.id)} saved={setNode}/></>;
  if(edge)return <><button onClick={()=>setEdge(null)}>‹ 所有设定</button><EdgeEditor key={edge.id||'new'} {...{call,novelId,nodes,run,busy}} initial={edge} saved={setEdge}/></>;
  return <><span className="eyebrow">故事资料库</span><h2>人物与世界</h2>
    <TavernImport {...{call,novelId,run,busy}}/>
    <div className="row"><input className="grow" aria-label="搜索设定" placeholder="搜索名称、摘要或别名" value={query} onChange={e=>setQuery(e.target.value)}/><select aria-label="设定类型" value={type} onChange={e=>setType(e.target.value)}><option value="">全部设定</option><option value="character_card">人物</option><option value="world_book">世界书</option><option value="world_entry">世界条目</option></select></div>
    <div className="row"><button className="primary" onClick={()=>setNode({type:'character_card',name:'',summary:'',content:'',factType:'unconfirmed',status:'unconfirmed'})}>新建人物</button><button onClick={()=>setNode({type:'world_entry',name:'',summary:'',content:'',factType:'unconfirmed',status:'unconfirmed'})}>新建设定</button><button disabled={nodes.length<2} onClick={()=>setEdge({from:nodes[0]?.id,to:nodes[1]?.id,name:'',content:''})}>添加关系</button></div>
    {selectionError&&<p className="notice error" role="alert">{selectionError}</p>}
    <ResourceState resource={resource}>
      {!nodes.length&&<div className="empty">还没有资料。新建人物或设定，也可以让 Agent 根据正文整理。</div>}
      {!!nodes.length&&!visible.length&&<p className="empty">没有匹配的设定，试试其他关键词。</p>}
      <div className="list">{visible.map(n=><button key={n.id} onClick={()=>select(n)}><strong>{n.name}</strong><span className="status-badge">{n.type==='character_card'?'人物':'设定'} · {({active:'有效',stale:'待核对',unconfirmed:'未确认',retired:'已失效'})[n.status]}</span><div className="muted">{n.summary}</div></button>)}</div>
      <section className="card"><div className="row"><h3 className="grow">关系 · {edges.length}</h3><button onClick={()=>setView(view==='list'?'graph':'list')}>{view==='list'?'查看关系图':'收起关系图'}</button></div>
      {view==='graph'&&<Graph nodes={visible.slice(0,40)} edges={edges} select={select}/>}{view==='graph'&&visible.length>40&&<p className="muted">图中展示前40项，请搜索缩小范围。</p>}
      {edges.map(e=><div className="source-row" key={e.id}><p>{nodes.find(n=>n.id===e.from)?.name||'缺失设定'} <strong>— {e.name} →</strong> {nodes.find(n=>n.id===e.to)?.name||'缺失设定'}</p><button onClick={()=>setEdge(e)}>编辑关系</button></div>)}</section>
    </ResourceState></>;
}

function Graph({nodes,edges,select}) {
  const positions=new Map(nodes.map((n,i)=>[n.id,{x:230+175*Math.cos(2*Math.PI*i/Math.max(1,nodes.length)),y:150+105*Math.sin(2*Math.PI*i/Math.max(1,nodes.length))}]));
  return <svg viewBox="0 0 460 300" role="img" aria-label="世界书与角色关系图">
    {edges.filter(e=>positions.has(e.from)&&positions.has(e.to)).map(e=>{const a=positions.get(e.from),b=positions.get(e.to);return <g key={e.id}><line x1={a.x} y1={a.y} x2={b.x} y2={b.y}><title>{e.name}</title></line><text x={(a.x+b.x)/2} y={(a.y+b.y)/2-6} textAnchor="middle">{e.name}</text></g>;})}
    {nodes.map(n=>{const p=positions.get(n.id);return <g key={n.id} role="button" tabIndex={0} aria-label={n.name} onClick={()=>select(n)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(n);}}}><circle cx={p.x} cy={p.y} r="9"/><text x={p.x} y={p.y+24} textAnchor="middle">{n.name.length>10?n.name.slice(0,10)+'…':n.name}</text><title>{n.name}：{n.summary}</title></g>;})}
  </svg>;
}

function Sources({sources=[],onChange,chapters,call,novelId}) {
  const [selected,setSelected]=useState(''),[error,setError]=useState(''),[version,setVersion]=useState('');
  const versions=useResource(()=>selected?call('chapter.history',{novelId,chapterId:selected}):Promise.resolve([]),[call,novelId,selected]);
  return <div><h3>依据章节</h3><p className="muted">选择支持这条设定的正文版本。正文修改后会提醒重新核对。</p>
    {sources.map((source,i)=><div className="source-row" key={`${source.chapterId}:${i}`}><span>{chapters.find(c=>c.id===source.chapterId)?.title||'章节缺失或已删除'} · 版本{source.revision}</span><button onClick={()=>onChange(sources.filter((_,j)=>j!==i))}>移除引用</button></div>)}
    <div className="row"><select className="grow" aria-label="选择来源章节" value={selected} onChange={e=>{setSelected(e.target.value);setVersion('');}}><option value="">选择章节</option>{chapters.map(c=><option key={c.id} value={c.id}>{c.title} · 当前版本{c.revision}</option>)}</select><select aria-label="来源版本" value={version} onChange={e=>setVersion(e.target.value)}><option value="">当前版本</option>{!versions.loading&&versions.value?.map(v=><option key={v.revision} value={v.revision}>版本{v.revision}</option>)}</select><button disabled={!selected||versions.loading} onClick={async()=>{try{const c=await call('chapter.get',{novelId,chapterId:selected,maxChars:1});onChange([...sources.filter(s=>s.chapterId!==selected),{chapterId:c.id,revision:version?Number(version):c.revision}]);setError('');}catch(e){setError(message(e));}}}>添加引用</button></div>{error&&<p role="alert">{error}</p>}</div>;
}
function NodeEditor({call,novelId,run,busy,initial,latest,saved,nodes,chapters}) {
  const {value:draft,base,change,accept,dirty,cacheError}=useDraft(`${novelId}:node:${initial.id||initial.type+':new'}`,initial);
  const [editing,setEditing]=useState(!initial.id||dirty);
  const {confirm}=useDialog();
  const set=(key,value)=>change(d=>({...d,[key]:value}));
  const save=()=>{if(!draft.name.trim()||busy)return;run(async()=>{const n=await call(draft.id?'graph.update':'graph.create',{...draft,novelId,nodeId:draft.id,expectedRevision:base.revision});accept(n);saved(n);setEditing(false);});};
  return <div onKeyDown={e=>saveShortcut(e,save)}><div className="row"><h2 className="grow">{draft.name|| (draft.type==='character_card'?'新人物':'新设定')}</h2><button onClick={()=>setEditing(!editing)}>{editing?'阅读预览':'编辑资料'}</button></div>
    {latest&&latest.revision!==base.revision&&<p className="notice">资料已有新版本，草稿仍保留。请先保留需要的草稿内容，再从下方“更多操作”读取最新资料；保存会检查版本。</p>}
    {draft.status==='stale'&&<p className="notice">引用的正文或关联资料发生过变化。请核对来源，再更新引用并标记有效。</p>}
    {editing?<fieldset disabled={busy} className="editor-fields">
      <section className="card"><label>资料类型<select value={draft.type} onChange={e=>set('type',e.target.value)}><option value="character_card">人物</option><option value="world_book">世界书</option><option value="world_entry">世界条目</option></select></label><label>名称<input value={draft.name} onChange={e=>set('name',e.target.value)}/></label><label>简短介绍<textarea value={draft.summary||''} onChange={e=>set('summary',e.target.value)}/></label><label>详细设定<textarea className="prose" value={draft.content||''} onChange={e=>set('content',e.target.value)}/></label><label>别名（逗号分隔）<input value={(draft.aliases||[]).join(',')} onChange={e=>set('aliases',e.target.value.split(/[,，]/).map(s=>s.trim()).filter(Boolean))}/></label></section>
      <details className="card"><summary>依据与信息边界</summary><div className="split"><label>信息性质<select value={draft.factType||'unconfirmed'} onChange={e=>set('factType',e.target.value)}>{[['fact','客观事实'],['belief','人物认知'],['misunderstanding','人物误解'],['unconfirmed','未确认'],['plan','未来计划']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label><label>核对状态<select value={draft.status||'unconfirmed'} onChange={e=>set('status',e.target.value)}>{[['active','有效'],['stale','待核对'],['unconfirmed','未确认'],['retired','已失效']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label></div>
      <label>故事时间<input value={draft.storyTime||''} onChange={e=>set('storyTime',e.target.value)}/></label><h3>哪些人物知道</h3><p className="muted">不指定人物表示不额外限制知情范围。</p>{[...nodes.filter(n=>n.type==='character_card'),...(draft.knownBy||[]).filter(id=>!nodes.some(n=>n.id===id)).map(id=>({id,name:'缺失的人物引用'}))].map(n=><label className="row" key={n.id}><input type="checkbox" checked={(draft.knownBy||[]).includes(n.id)} onChange={e=>set('knownBy',e.target.checked?[...(draft.knownBy||[]),n.id]:(draft.knownBy||[]).filter(id=>id!==n.id))}/>{n.name}</label>)}
      <Sources {...{call,novelId,chapters}} sources={draft.sources} onChange={value=>set('sources',value)}/></details>
    </fieldset>:<><p className="muted">{draft.summary}</p><ReadingText text={draft.content||'尚未填写详细设定。'}/><section className="card"><h3>依据章节</h3>{draft.sources?.length?draft.sources.map((s,i)=><p key={i}>{chapters.find(c=>c.id===s.chapterId)?.title||'缺失或已删除章节'} · 版本{s.revision}</p>):<p className="muted">尚未关联正文来源</p>}</section></>}
    <div className="sticky-actions"><SaveBar dirty={dirty||!draft.id} busy={busy} error={cacheError} invalid={!draft.name.trim()?"请填写资料名称":null} onSave={save} label="保存资料"/></div>
    {draft.id&&<details className="card"><summary>更多操作</summary><button disabled={busy} onClick={async()=>{if(!dirty||await confirm('丢弃本地资料草稿，读取最新版本？'))run(async()=>{const n=await call('graph.get',{novelId,nodeId:draft.id});accept(n);saved(n);});}}>放弃草稿，读取最新</button><button className="danger" disabled={busy} onClick={async()=>{if(await confirm(`删除“${draft.name}”及连接关系？`))run(async()=>{await call('graph.delete',{novelId,nodeId:draft.id,expectedRevision:base.revision,confirm:true});accept(initial);saved(null);});}}>删除资料及关系</button></details>}
  </div>;
}
function EdgeEditor({call,novelId,nodes,run,busy,initial,saved}) {
  const {value:draft,base,change,accept,dirty,cacheError}=useDraft(`${novelId}:edge:${initial.id||'new'}`,initial);
  const {confirm}=useDialog();
  const save=()=>{if(draft.name.trim()&&!busy)run(async()=>{const e=await call(draft.id?'edge.update':'edge.create',{...draft,novelId,edgeId:draft.id,expectedRevision:base.revision});accept(e);saved(e);});};
  return <div onKeyDown={e=>saveShortcut(e,save)}><h2>{draft.id?'编辑关系':'添加关系'}</h2><fieldset disabled={busy} className="editor-fields">{[['from','从'],['to','到']].map(([key,label])=><label key={key}>{label}<select value={draft[key]} onChange={e=>change(d=>({...d,[key]:e.target.value}))}>{nodes.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label>)}<label>关系名称<input placeholder="例如：居住于、朋友、敌对" value={draft.name} onChange={e=>change(d=>({...d,name:e.target.value}))}/></label><label>说明<textarea value={draft.content||''} onChange={e=>change(d=>({...d,content:e.target.value}))}/></label></fieldset><SaveBar dirty={dirty||!draft.id} {...{busy}} error={cacheError} invalid={!draft.name.trim()?"请填写关系名称":null} onSave={save} label="保存关系"/>{draft.id&&<details><summary>更多操作</summary><button disabled={busy} onClick={async()=>{if(!dirty||await confirm("丢弃关系草稿并读取最新版本？"))run(async()=>{const latest=await call("edge.get",{novelId,edgeId:draft.id});accept(latest);saved(latest);});}}>读取最新关系</button><button disabled={busy} className="danger" onClick={async()=>{if(await confirm('删除这条关系？'))run(async()=>{await call('edge.delete',{novelId,edgeId:draft.id,expectedRevision:base.revision,confirm:true});accept(initial);saved(null);});}}>删除关系</button></details>}</div>;
}

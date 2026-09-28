import React,{useEffect,useRef,useState} from 'react';
import {useDialog} from '../dialog.jsx';
import {useDraft,useResource,usePreference} from '../shared/state.js';
import {ResourceState,SaveBar,saveShortcut} from '../shared/ui.jsx';
import {TavernImport} from './tavern-import.jsx';
const kind=n=>n.type==='character_card'?'人物':'世界设定';
export function Memory({call,novelId,tick,run,busy}) {
 const [selected,setSelected]=usePreference(`${novelId}:memory-selected`,null);
 const [node,setNode]=useState(null),[edge,setEdge]=useState(null),[query,setQuery]=useState(''),[filter,setFilter]=useState(''),[importing,setImporting]=useState(false),[error,setError]=useState(''),[poll,setPoll]=useState(0);
 const request=useRef(0);
 const resource=useResource(()=>Promise.all([call('graph.list',{novelId,query}),call('edge.list',{novelId})]),[call,novelId,tick,poll,query]);
 const [nodes=[],edges=[]]=resource.value||[];
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)setPoll(v=>v+1);},5000);return()=>{clearInterval(timer);request.current++;};},[]);
 const open=async id=>{const seq=++request.current;setError('');try{const data=await call('graph.get',{novelId,nodeId:id});if(seq===request.current){setNode(data);setSelected(id);setEdge(null);}}catch(e){if(seq===request.current)setError(e.message);}};
 useEffect(()=>{if(selected)open(selected);},[]);
 const create=type=>{request.current++;setEdge(null);setSelected(null);setNode({type,name:'',summary:'',content:''});};
 const saved=n=>{setNode(n);setSelected(n?.id||null);};
 const all=useResource(()=>call('graph.list',{novelId}),[call,novelId,tick,poll]);
 const allNodes=all.value||nodes;
 const related=edges.filter(e=>e.from===node?.id||e.to===node?.id);
 if(importing)return <><button disabled={busy} onClick={()=>setImporting(false)}>‹ 返回设定</button><h2>导入资料</h2><TavernImport {...{call,novelId,run,busy}} onOpen={id=>{setImporting(false);open(id);}}/></>;
 return <><div className="row"><h2 className="grow">设定</h2><details className="menu"><summary>更多</summary><div className="menu-panel"><button disabled={busy} onClick={()=>setImporting(true)}>导入酒馆资料</button></div></details><details className="menu"><summary className="primary">新建</summary><div className="menu-panel"><button onClick={()=>create('character_card')}>人物</button><button onClick={()=>create('world_entry')}>世界设定</button></div></details></div>
 {error&&<p role="alert">{error}</p>}<div className={`memory-layout ${node?'has-detail':''}`}><div className="memory-overview"><input className="search" aria-label="搜索设定" placeholder="搜索资料" value={query} onChange={e=>setQuery(e.target.value)}/><div className="row segmented">{['','人物','世界设定'].map(type=><button key={type} aria-pressed={filter===type} onClick={()=>setFilter(type)}>{type||'全部'}</button>)}</div><ResourceState resource={resource}><div className="list">{nodes.filter(n=>!filter||kind(n)===filter).map(n=><button key={n.id} className={node?.id===n.id?'selected':''} onClick={()=>open(n.id)}><strong>{n.name}</strong><small className="status-badge">{kind(n)}</small><p className="muted">{n.summary}</p></button>)}</div>{!nodes.length&&<p className="empty">没有资料。新建人物或世界设定，也可以导入。</p>}</ResourceState></div>
 {node&&<div className="memory-detail"><button onClick={()=>{request.current++;setNode(null);setEdge(null);setSelected(null);}}>‹ 所有设定</button><NodeEditor key={node.id||node.type} {...{call,novelId,run,busy,saved}} initial={node} latest={allNodes.find(n=>n.id===node.id)}/>
 {node.id&&<section className="section-fold"><div className="row"><h3 className="grow">关系</h3><button disabled={busy||allNodes.length<2} onClick={()=>setEdge({from:node.id,to:allNodes.find(n=>n.id!==node.id)?.id,name:'',content:''})}>添加关系</button></div>{allNodes.length<2&&<p className="muted">再添加一条资料，就能建立关系。</p>}{related.map(e=><div key={e.id} className="source-row"><div className="row"><button onClick={()=>open(e.from)}>{allNodes.find(n=>n.id===e.from)?.name||'资料'}</button><span>→ {e.name} →</span><button onClick={()=>open(e.to)}>{allNodes.find(n=>n.id===e.to)?.name||'资料'}</button><button disabled={busy} onClick={()=>setEdge(e)}>修改</button></div>{e.content&&<p>{e.content}</p>}</div>)}
 {edge&&<section className="card"><button disabled={busy} onClick={()=>setEdge(null)}>关闭关系编辑</button><EdgeEditor key={edge.id||`new:${node.id}`} {...{call,novelId,run,busy}} nodes={allNodes} initial={edge} saved={()=>setEdge(null)}/></section>}</section>}
 </div>}</div></>;
}
function NodeEditor({call,novelId,run,busy,initial,latest,saved}) {
 const {value,base,change,accept,dirty,cacheError}=useDraft(`${novelId}:node:${initial.id||initial.type+':new'}`,initial);
 const [editing,setEditing]=useState(!initial.id||dirty);const {confirm}=useDialog();
 const set=(key,v)=>change(old=>({...old,[key]:v}));
 const save=()=>{if(!value.name.trim()||busy)return;run(async()=>{const result=await call(value.id?'graph.update':'graph.create',{novelId,nodeId:value.id,expectedRevision:base.revision,type:value.type==='character_card'?'character_card':'world_entry',name:value.name,summary:value.summary||'',content:value.content||''});accept(result);saved(result);setEditing(false);});};
 return <div onKeyDown={e=>saveShortcut(e,save)}><div className="row"><h2 className="grow">{value.name||`新${kind(value)}`}</h2><button onClick={()=>setEditing(!editing)}>{editing?'阅读':'编辑'}</button></div>{latest&&latest.revision!==base.revision&&<p className="notice">资料已有新版本，本地草稿仍保留。保存会检查冲突。</p>}
 {editing?<fieldset disabled={busy} className="editor-fields"><label>类型<select value={value.type==='character_card'?'character_card':'world_entry'} onChange={e=>set('type',e.target.value)}><option value="character_card">人物</option><option value="world_entry">世界设定</option></select></label><label>名称<input value={value.name} onChange={e=>set('name',e.target.value)}/></label><label>摘要<textarea value={value.summary||''} onChange={e=>set('summary',e.target.value)}/></label><label>全文<textarea className="prose" value={value.content||''} onChange={e=>set('content',e.target.value)}/></label></fieldset>:<><p className="memory-summary">{value.summary||'暂无摘要'}</p><article className="manuscript">{value.content||'暂无内容'}</article></>}
 {(editing||dirty)&&<SaveBar dirty={dirty||!value.id} {...{busy}} error={cacheError} invalid={!value.name.trim()?'请填写名称':null} onSave={save} label="保存资料"/>}
 {value.id&&<details className="section-fold"><summary>更多操作</summary><button disabled={busy} onClick={async()=>{if(!dirty||await confirm('放弃本地草稿并读取最新资料？'))run(async()=>{const n=await call('graph.get',{novelId,nodeId:value.id});accept(n);saved(n);});}}>读取最新</button><button className="danger" disabled={busy} onClick={async()=>{if(await confirm(`删除“${value.name}”及其关系？`))run(async()=>{await call('graph.delete',{novelId,nodeId:value.id,expectedRevision:base.revision,confirm:true});accept(initial);saved(null);});}}>删除资料</button></details>}
 </div>;
}
function EdgeEditor({call,novelId,nodes,run,busy,initial,saved}) {
  const {value:draft,base,change,accept,dirty,cacheError}=useDraft(`${novelId}:edge:${initial.id||`new:${initial.from}`}`,initial);
  const {confirm}=useDialog();
  const save=()=>{if(draft.name.trim()&&!busy)run(async()=>{const e=await call(draft.id?'edge.update':'edge.create',{from:draft.from,to:draft.to,name:draft.name,content:draft.content,novelId,edgeId:draft.id,expectedRevision:base.revision});accept(e);saved(e);});};
  return <div onKeyDown={e=>saveShortcut(e,save)}><h2>{draft.id?'编辑关系':'添加关系'}</h2><fieldset disabled={busy} className="editor-fields">{[['from','从'],['to','到']].map(([key,label])=><label key={key}>{label}<select value={draft[key]} onChange={e=>change(d=>({...d,[key]:e.target.value}))}>{nodes.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label>)}<label>关系名称<input placeholder="例如：居住于、朋友、敌对" value={draft.name} onChange={e=>change(d=>({...d,name:e.target.value}))}/></label><label>说明<textarea value={draft.content||''} onChange={e=>change(d=>({...d,content:e.target.value}))}/></label></fieldset><SaveBar dirty={dirty||!draft.id} {...{busy}} error={cacheError} invalid={!draft.name.trim()?"请填写关系名称":null} onSave={save} label="保存关系"/>{draft.id&&<details><summary>更多操作</summary><button disabled={busy} onClick={async()=>{if(!dirty||await confirm("丢弃关系草稿并读取最新版本？"))run(async()=>{const latest=await call("edge.get",{novelId,edgeId:draft.id});accept(latest);saved(latest);});}}>读取最新关系</button><button disabled={busy} className="danger" onClick={async()=>{if(await confirm('删除这条关系？'))run(async()=>{await call('edge.delete',{novelId,edgeId:draft.id,expectedRevision:base.revision,confirm:true});accept(initial);saved(null);});}}>删除关系</button></details>}</div>;
}

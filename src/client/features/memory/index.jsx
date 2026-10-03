import {OverviewPage,DetailPage,DetailActions,useDetailTrail} from '../../shared/detail-page.tsx';
import {DocumentTextarea} from '../../shared/workspace.tsx';
import {CreateDocument} from '../../shared/creation.tsx';
import {RelationCanvas} from './RelationCanvas.tsx';
import {Modal,useWorkbenchPreferences} from '../../shared/preferences.tsx';
import {ViewSwitch,FilterControl,SearchControl} from '../../shared/workspace.tsx';
import {Groups, GroupSelect, MoveSelection, filterGroup} from '../../shared/groups.tsx';
import React,{useEffect,useRef,useState} from 'react';
import {useDialog} from '../../dialog.tsx';
import {useDraft,useResource,usePreference} from '../../shared/state.js';
import {ResourceState,SaveBar,saveShortcut} from '../../shared/ui.jsx';
import {TavernImport} from './tavern-import.jsx';
const kind=n=>n.type==='character_card'?'角色卡':'世界书';
export function Memory({call,novelId,tick,run,busy}) {
 const {preferences}=useWorkbenchPreferences();
 const {confirm}=useDialog();
 const [view,setView]=useState(preferences.memoryView),[batch,setBatch]=useState(false),[creating,setCreating]=useState(null);
 const [selected,setSelected]=usePreference(`${novelId}:memory-selected`,null);
 const [node,setNode]=useState(null),[edge,setEdge]=useState(null),[query,setQuery]=useState(''),[filter,setFilter]=useState(''),[group,setGroup]=useState(''),[checked,setChecked]=useState([]),[importing,setImporting]=useState(false),[error,setError]=useState(''),[poll,setPoll]=useState(0);
 const request=useRef(0),canvas=useRef(null);
 const trail=useDetailTrail(node?.id||null);
 const resource=useResource(()=>Promise.all([call('graph.list',{novelId,query,groupId:filterGroup(group)}),call('edge.list',{novelId}),call('graph.groups',{novelId})]),[call,novelId,tick,poll,query,group]);
 const [nodes=[],edges=[],groups=[]]=resource.value||[];
 useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)setPoll(v=>v+1);},5000);return()=>{clearInterval(timer);request.current++;};},[]);
 const open=async (id,back=false)=>{const seq=++request.current;setError('');try{const data=await call('graph.get',{novelId,nodeId:id});if(seq===request.current){if(back)trail.back(id);else trail.visit(id);setNode(data);setSelected(id);setEdge(null);}}catch(e){if(seq===request.current)setError(e.message);}};
 useEffect(()=>{if(selected)open(selected);},[]);
 const create=(type,position,connection)=>setCreating({type,position:position||canvas.current?.(),connection:connection?{...connection,expectedRevision:allNodes.find(n=>n.id===connection.id)?.revision}:undefined});
 const saved=n=>{if(n)trail.visit(n.id);else trail.clear();setNode(n);setSelected(n?.id||null);};
 const all=useResource(()=>call('graph.list',{novelId}),[call,novelId,tick,poll]);
 const merged=new Map();for(const n of [...(all.value||[]),...nodes])if(!merged.has(n.id)||merged.get(n.id).revision<n.revision)merged.set(n.id,n);
 const allNodes=[...merged.values()];
 const related=edges.filter(e=>e.from===node?.id||e.to===node?.id);
 const visible=nodes.filter(n=>!filter||n.type===filter);
 const clear=()=>{setQuery('');setFilter('');setGroup('');};
 const close=()=>{if(trail.previous){void open(trail.previous,true);return;}request.current++;trail.clear();setNode(null);setEdge(null);setSelected(null);};
 const connect=(from,to)=>setEdge({from,to,name:'',content:''});
 const connectDirect=(from,to)=>run(()=>call('edge.create',{novelId,from,to,name:'',content:'',requestId:crypto.randomUUID()}));
 const saveLayout=(points,revisions={},requestId=crypto.randomUUID())=>run(()=>call('graph.layout',{novelId,requestId,positions:Object.entries(points).map(([nodeId,position])=>({nodeId,position,expectedRevision:revisions[nodeId]??allNodes.find(n=>n.id===nodeId)?.revision}))}));
 const disconnect=items=>run(()=>call('edge.disconnect',{novelId,requestId:crypto.randomUUID(),confirm:true,edges:items.map(e=>({id:e.id,expectedRevision:e.revision}))}));
 const removeNodes=async ids=>{if(ids.length&&!busy&&await confirm(`删除选中的 ${ids.length} 张设定卡片及其关系？`))await run(()=>call('graph.remove',{novelId,requestId:crypto.randomUUID(),confirm:true,members:ids.map(id=>({id,expectedRevision:allNodes.find(n=>n.id===id)?.revision}))}));};
 const duplicateNodes=(ids,points={})=>run(()=>call('graph.duplicate',{novelId,requestId:crypto.randomUUID(),members:ids.map(id=>({id,expectedRevision:allNodes.find(n=>n.id===id)?.revision,...(points[id]?{position:points[id]}:{})}))}));
 const moveNodes=(ids,groupId)=>run(()=>call('graph.move',{novelId,requestId:crypto.randomUUID(),groupId,members:ids.map(id=>({id,expectedRevision:allNodes.find(n=>n.id===id)?.revision}))}));
 if(creating)return <CreateDocument draftKey={`${novelId}:memory-create:${creating.type}:${creating.connection?.id||'new'}`} label={creating.type==='character_card'?'新建角色卡':'新建世界书'} context={creating.connection?'创建后自动连接到原设定':undefined} initial={{title:'',summary:'',content:'',groupId:filterGroup(group)||allNodes.find(n=>n.id===creating.connection?.id)?.groupId||null}} {...{groups,busy}} close={()=>setCreating(null)} createGroup={async name=>{let result;await run(async()=>{result=await call('graph.group.create',{novelId,name});});return result;}} save={(value,requestId)=>run(async()=>{const fields={type:creating.type,name:value.title,summary:value.summary,content:value.content,groupId:value.groupId,...(creating.position?{position:creating.position}:{})};const result=creating.connection?await call('graph.continue',{novelId,requestId,nodeId:creating.connection.id,expectedRevision:creating.connection.expectedRevision,side:creating.connection.side,value:fields}):await call('graph.create',{novelId,requestId,...fields});saved(result.node||result);})}/>;
 if(importing)return <div className="page"><button disabled={busy} onClick={()=>setImporting(false)}>‹ 返回设定</button><h2>导入设定</h2><TavernImport {...{call,novelId,run,busy}} onOpen={id=>{setImporting(false);open(id);}}/></div>;
 return <div className="memory-workspace"><OverviewPage active={!node}><header className="module-heading canvas-heading"><div className="module-toolbar">
 <Groups {...{groups,busy,call,run,novelId}} prefix="graph" value={group} onChange={value=>{setGroup(value);setChecked([]);}}/>
 <FilterControl label="类型" value={filter} change={setFilter}><option value="">全部类型</option><option value="character_card">角色卡</option><option value="world_entry">世界书</option></FilterControl>
 <span className="toolbar-spacer"/><SearchControl label="搜索设定" value={query} change={setQuery}/><ViewSwitch value={view} change={setView} graph="画布"/>
 <details className="menu"><summary className="primary">＋ 设定</summary><div className="menu-panel"><button disabled={busy} onClick={()=>create('character_card')}>新建角色卡</button><button disabled={busy} onClick={()=>create('world_entry')}>新建世界书</button></div></details>
 <details className="menu"><summary aria-label="设定更多操作">···</summary><div className="menu-panel"><button disabled={busy} onClick={()=>setImporting(true)}>导入酒馆资料</button><button onClick={()=>{setBatch(!batch);setChecked([]);setView('list');}}>批量管理</button>{(query||group||filter)&&<button onClick={clear}>清除筛选</button>}</div></details>
 {batch&&<button onClick={()=>{setBatch(false);setChecked([]);}}>完成多选</button>}
 </div></header>
 <div className="memory-layout"><div className="memory-overview"><MoveSelection count={checked.length} {...{groups,busy}} clear={()=>setChecked([])} onMove={groupId=>run(async()=>{await call('graph.move',{novelId,groupId,members:checked.map(id=>({id,expectedRevision:allNodes.find(n=>n.id===id)?.revision}))});setChecked([]);})}/><ResourceState resource={resource}>
 {view==='canvas'?<RelationCanvas key={novelId} scopeKey={`${novelId}:settings`} nodes={visible} allNodes={allNodes} edges={edges} groups={groups} busy={busy} onReady={center=>{canvas.current=center;}} onNew={(position,connection,type)=>create(type||allNodes.find(n=>n.id===connection?.id)?.type||'character_card',position,connection)} onSelect={open} onConnect={connectDirect} onLayout={saveLayout} onEdit={setEdge} onDelete={disconnect} onRemove={removeNodes} onDuplicate={duplicateNodes} onMove={moveNodes}/>:!visible.length?<div className="empty">{query||filter||group?'没有匹配的设定，试试调整筛选。':'添加第一张角色卡或世界书。'}</div>:<div className="library-list">{visible.map(n=><div className="selectable-entry" key={n.id}>{batch&&<input type="checkbox" aria-label={`选择 ${n.name}`} checked={checked.includes(n.id)} onChange={e=>setChecked(ids=>e.target.checked?[...ids,n.id]:ids.filter(id=>id!==n.id))}/>}<button className={`library-entry ${trail.lastOpened===n.id?'selected':''}`} aria-current={trail.lastOpened===n.id?'true':undefined} onClick={()=>open(n.id)}><span className="entry-heading"><strong>{n.name}</strong><small>{kind(n)}</small></span>{n.summary&&<p>{n.summary}</p>}{n.groupId&&<small>{groups.find(g=>g.id===n.groupId)?.name}</small>}</button></div>)}</div>}</ResourceState></div></div></OverviewPage>
 {error&&<p className="notice error" role="alert">{error}</p>}
 {node&&<DetailPage key={node.id} className="memory-detail" backLabel={trail.previous?'‹ 返回上一条':'‹ 返回设定'} onBack={close}><NodeEditor key={node.id||node.type} {...{call,novelId,run,busy,saved,groups}} initial={node} latest={allNodes.find(n=>n.id===node.id)}/>
 {node.id&&<section className="section-fold"><div className="row"><h3 className="grow">相关设定</h3><button disabled={busy||allNodes.length<2} onClick={()=>connect(node.id,allNodes.find(n=>n.id!==node.id)?.id)}>添加关系</button></div>{related.map(e=><div key={e.id} className="related-entry"><button onClick={()=>open(e.from===node.id?e.to:e.from)}>{allNodes.find(n=>n.id===(e.from===node.id?e.to:e.from))?.name||'设定'}</button>{e.name&&<small>{e.name}</small>}{e.content&&<p>{e.content}</p>}<button aria-label={`修改关系 ${e.name||'连线'}`} onClick={()=>setEdge(e)}>···</button></div>)}</section>}
 </DetailPage>}{edge&&<Modal title={edge.id?'编辑关系':'添加关系'} close={()=>setEdge(null)}><EdgeEditor key={edge.id||`new:${edge.from}:${edge.to}`} {...{call,novelId,run,busy}} nodes={allNodes} initial={edge} saved={()=>setEdge(null)}/></Modal>}</div>;
}

function NodeEditor({call,novelId,run,busy,initial,latest,saved,groups}) {
 const {value,base,change,accept,dirty,cacheError}=useDraft(`${novelId}:node:${initial.id||initial.type+':new'}`,initial);
 const [editing,setEditing]=useState(!initial.id||dirty);const {confirm,ask}=useDialog();
 const set=(key,v)=>change(old=>({...old,[key]:v}));
 const save=()=>{if(!value.name.trim()||busy)return;run(async()=>{const result=await call(value.id?'graph.update':'graph.create',{novelId,nodeId:value.id,expectedRevision:base.revision,type:value.type==='character_card'?'character_card':'world_entry',groupId:value.groupId||null,name:value.name,summary:value.summary||'',content:value.content||''});accept(result);saved(result);setEditing(false);});};
 return <div onKeyDown={e=>saveShortcut(e,save)}><h2>{value.name||`新${kind(value)}`}</h2><DetailActions><button onClick={()=>setEditing(!editing)}>{editing?'阅读':'编辑'}</button></DetailActions>{latest&&latest.revision!==base.revision&&<p className="notice">设定已有新版本，本地草稿仍保留。保存会检查冲突。</p>}
 {editing?<fieldset disabled={busy} className="editor-fields document-fields"><label>类型<select value={value.type==='character_card'?'character_card':'world_entry'} onChange={e=>set('type',e.target.value)}><option value="character_card">角色卡</option><option value="world_entry">世界书</option></select></label><div className="creation-settings"><GroupSelect groups={groups} value={value.groupId} onChange={id=>set('groupId',id)}/><button type="button" disabled={busy} onClick={async()=>{const name=await ask('新建分组名称');if(name?.trim())run(async()=>{const g=await call('graph.group.create',{novelId,name});set('groupId',g.id);});}}>＋ 新建分组</button></div><label>名称<input value={value.name} onChange={e=>set('name',e.target.value)}/></label><label>摘要<DocumentTextarea aria-label="摘要" value={value.summary||''} onChange={e=>set('summary',e.target.value)}/></label><label>全文<DocumentTextarea aria-label="全文" className="prose" value={value.content||''} onChange={e=>set('content',e.target.value)}/></label></fieldset>:<><p className="document-summary">{value.summary||'暂无摘要'}</p><article className="document-body">{value.content||'暂无内容'}</article></>}
 {(editing||dirty)&&<SaveBar dirty={dirty||!value.id} {...{busy}} error={cacheError} invalid={!value.name.trim()?'请填写名称':null} onSave={save} label="保存设定"/>}
 {value.id&&<details className="section-fold"><summary>更多操作</summary><button disabled={busy} onClick={async()=>{if(!dirty||await confirm('放弃本地草稿并读取最新设定？'))run(async()=>{const n=await call('graph.get',{novelId,nodeId:value.id});accept(n);saved(n);});}}>读取最新</button><button className="danger" disabled={busy} onClick={async()=>{if(await confirm(`删除“${value.name}”及其关系？`))run(async()=>{await call('graph.delete',{novelId,nodeId:value.id,expectedRevision:base.revision,confirm:true});accept(initial);saved(null);});}}>删除设定</button></details>}
 </div>;
}
function EdgeEditor({call,novelId,nodes,run,busy,initial,saved}) {
  const {value:draft,base,change,accept,dirty,cacheError}=useDraft(`${novelId}:edge:${initial.id||`new:${initial.from}:${initial.to}`}`,initial);
  const {confirm,ask}=useDialog();
  const save=()=>{if(draft.from&&draft.to&&!busy)run(async()=>{const e=await call(draft.id?'edge.update':'edge.create',{from:draft.from,to:draft.to,name:draft.name,content:draft.content,novelId,edgeId:draft.id,expectedRevision:base.revision});accept(e);saved(e);});};
  return <div onKeyDown={e=>saveShortcut(e,save)}><fieldset disabled={busy} className="editor-fields">{[['from','从'],['to','到']].map(([key,label])=><label key={key}>{label}<select value={draft[key]} onChange={e=>change(d=>({...d,[key]:e.target.value}))}>{nodes.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label>)}<label>关系名称（可选）<input placeholder="例如：居住于、朋友、敌对" value={draft.name||''} onChange={e=>change(d=>({...d,name:e.target.value}))}/></label><label>说明<DocumentTextarea value={draft.content||''} onChange={e=>change(d=>({...d,content:e.target.value}))}/></label></fieldset><SaveBar dirty={dirty||!draft.id} {...{busy}} error={cacheError} invalid={!draft.from||!draft.to?"请选择关系端点":null} onSave={save} label="保存关系"/>{draft.id&&<details><summary>更多操作</summary><button disabled={busy} onClick={async()=>{if(!dirty||await confirm("丢弃关系草稿并读取最新版本？"))run(async()=>{const latest=await call("edge.get",{novelId,edgeId:draft.id});accept(latest);saved(latest);});}}>读取最新关系</button><button disabled={busy} className="danger" onClick={async()=>{if(await confirm('删除这条关系？'))run(async()=>{await call('edge.delete',{novelId,edgeId:draft.id,expectedRevision:base.revision,confirm:true});accept(initial);saved(null);});}}>删除关系</button></details>}</div>;
}

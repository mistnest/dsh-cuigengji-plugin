import React,{useEffect,useState} from 'react';
import {DetailPage} from '../../shared/detail-page.tsx';
import {Modal} from '../../shared/preferences.tsx';
import {TreeGroups,DirectoryTools,useTreeGroupActions} from '../../shared/ContentTree.tsx';
import {BatchManager} from '../../shared/batch-management.tsx';
import {ResourceState} from '../../shared/ui.jsx';
import {OrganizedWorkspace,SidebarSection} from '../../shared/OrganizedWorkspace.tsx';
import type {FeatureServices} from '../../shared/workspace-state.ts';
import type {TransferShortcut} from '../../../contracts/transfer.ts';
import {groupTrail} from '../../../domain/directory/groups.ts';
import {RelationCanvas} from './RelationCanvas.tsx';
import {NodeEditor,EdgeEditor} from './Detail.jsx';
import {useSettingsWorkspace} from './useSettingsWorkspace.ts';
import {useDirectoryReorder} from '../../shared/useDirectoryReorder.ts';
import {DirectoryOrderNotice} from '../../shared/DirectoryEntries.tsx';
import {searchDirectory} from '../../../domain/directory/search.ts';

interface Props extends FeatureServices {novelTitle?:string;onTransfer:(shortcut:TransferShortcut)=>void}
export function Memory(props:Props) {
  const {call,novelId,run,busy:working,onTransfer}=props;
  const settings=useSettingsWorkspace(props);
  const {batch,creating,setCreating,node,edge,setEdge,query,setQuery,checked,setChecked,error,canvas,trail,resource,edges,groups,canvasGroups,folderId,pageReady,open,create,saved,allNodes,related,visible,close}=settings;
  const scope=`${novelId}:settings:folder:${folderId||'root'}`;
  const folderActions=useTreeGroupActions({prefix:'graph',novelId,pageId:null,call,run,refresh:resource.reload,reveal:()=>setQuery('')});
  const [collapseKey,setCollapseKey]=useState(0);
  const [directoryReveal,setDirectoryReveal]=useState<string|null>(null);
  useEffect(()=>setDirectoryReveal(null),[novelId]);
  useEffect(()=>{if(settings.focused)setDirectoryReveal(settings.focused);},[settings.focused]);
  const directoryItem=(n:(typeof allNodes)[number])=>({id:n.id,title:n.name,summary:n.summary,groupId:n.groupId,icon:n.type==='character_card'?'person' as const:'world' as const});
  const directoryReorder=useDirectoryReorder({scopeKey:`${novelId}:memory:folders`,items:allNodes.map(directoryItem),groups,disabled:working||!pageReady||batch||Boolean(query.trim()),move:args=>call('graph.directory.move',{novelId,pageId:null,...args}),read:async()=>{const [nodes,,groups]=await resource.reload();return {items:nodes.map(directoryItem),groups};}});
  const busy=working||directoryReorder.saving||!pageReady;
  const directory={items:directoryReorder.items,activeIds:node?[node.id]:settings.highlighted,open:settings.openDirectory,select:(id:string)=>settings.openDirectory(id,false),batch,checked,toggle:(id:string)=>setChecked(checked.includes(id)?checked.filter(value=>value!==id):[...checked,id]),busy,searching:Boolean(query.trim()),reorder:directoryReorder};
  const currentTitle=groups.find(g=>g.id===folderId)?.name||'全书设定';
  const path=groupTrail(groups,folderId);
  const visibleIds=new Set(visible.map(n=>n.id));
  const searchMatches = batch && directory.searching ? searchDirectory(directory.items, groups, query).matches : null;
  const selectableIds = batch ? directory.items
    .filter(item => visibleIds.has(item.id) && (!searchMatches || searchMatches.has(item.id)))
    .map(item => item.id) : undefined;
  const selectAllLabel = folderId
    ? (directory.searching ? '全选本文件夹命中项' : '全选当前文件夹')
    : (directory.searching ? '全选全书命中项' : '全选全书设定');
  const outsideIds=[...new Set(edges.filter(e=>visibleIds.has(e.from)!==visibleIds.has(e.to)).map(e=>visibleIds.has(e.from)?e.to:e.from))];
  const sidebar=<>
    <button className="resource-root" aria-current={!folderId?'location':undefined} disabled={busy} onClick={()=>settings.switchFolder(null)}>全书设定<small>{allNodes.length}</small></button>
    <SidebarSection title="内容目录" action={<DirectoryTools create={()=>void folderActions.create()} collapse={()=>setCollapseKey(Date.now())} busy={busy} searching={Boolean(query)}/>}>
      <div className="content-tree" ref={directoryReorder.directoryRef} aria-label="设定内容目录" aria-busy={directoryReorder.saving}>
        <TreeGroups key={novelId} {...{busy,groups,directory,query}} actions={folderActions} prefix="graph" scope={`${novelId}:settings:directory`} onOpenFolder={settings.switchFolder} activeFolder={folderId} collapseKey={collapseKey} revealItem={directoryReveal} newItems={[{label:'新建角色卡',create:groupId=>create('character_card',undefined,undefined,groupId)},{label:'新建世界书',create:groupId=>create('world_entry',undefined,undefined,groupId)}]}/>
        <DirectoryOrderNotice {...directoryReorder}/>
      </div>
    </SidebarSection>
  </>;
  const tools=<>{batch?<BatchManager items={directory.items} selectableIds={selectableIds} selectAllLabel={selectAllLabel}
    selected={checked} change={setChecked} groups={groups} busy={busy} done={settings.endBatch}
    onMove={async(ids,groupId)=>{if(await settings.moveNodes(ids,groupId))setChecked([]);}}
    onFolder={()=>settings.createFolder(checked)} onDuplicate={()=>settings.duplicateNodes(checked)} onDelete={()=>settings.removeNodes(checked)}/>:<>
    <button className="module-select" aria-label="多选" disabled={busy} onClick={settings.beginBatch}>多选</button>
    <details className="menu"><summary className="primary">＋ 设定</summary><div className="menu-panel"><button disabled={busy} onClick={()=>create('character_card')}>新建角色卡</button><button disabled={busy} onClick={()=>create('world_entry')}>新建世界书</button></div></details>
    <details className="menu"><summary aria-label="设定更多操作">···</summary><div className="menu-panel"><button disabled={busy} onClick={()=>onTransfer({mode:'import',selection:{kind:'memory',novelId}})}>导入设定</button><button disabled={busy} onClick={()=>onTransfer({mode:'export',selection:{kind:'memory',novelId,...(folderId?{groupIds:[folderId]}:{})}})}>导出当前文件夹</button></div></details>
  </>}</>;
  const detail=node&&<DetailPage key={node.id} className="memory-detail" backLabel={trail.previous?'‹ 返回上一条':'‹ 返回设定'} onBack={close}><NodeEditor {...{call,novelId,run,busy,saved,groups,onTransfer}} referenceName={(id:string)=>allNodes.find(n=>n.id===id)?.name||''} initial={node} latest={allNodes.find(n=>n.id===node.id)}>
    <details className="section-fold"><summary>相关设定 · {related.length}</summary><button disabled={busy||allNodes.length<2} onClick={()=>settings.connect(node.id,allNodes.find(n=>n.id!==node.id)!.id)}>添加关系</button>{related.map(e=><div key={e.id} className="related-entry"><button onClick={()=>open(e.from===node.id?e.to:e.from,false,true)}>{allNodes.find(n=>n.id===(e.from===node.id?e.to:e.from))?.name||'设定'}</button>{e.name&&<small>{e.name}</small>}{e.content&&<p>{e.content}</p>}<button aria-label={`修改关系 ${e.name||'连线'}`} onClick={()=>setEdge(e)}>···</button></div>)}</details>
  </NodeEditor></DetailPage>;
  return <div className="memory-workspace"><OrganizedWorkspace scopeKey={`${novelId}:memory`} title={currentTitle} count={visible.length} search={{label:'搜索设定',value:query,change:setQuery}} {...{sidebar,tools,detail}}>
    <div className="memory-overview">
      <nav className="resource-breadcrumb" aria-label="设定路径"><button disabled={!folderId} onClick={()=>settings.switchFolder(null)}>全书设定</button>{path.map(g=><React.Fragment key={g.id}><span>›</span><button aria-current={g.id===folderId?'location':undefined} onClick={()=>settings.switchFolder(g.id)}>{g.name}</button></React.Fragment>)}</nav>
      {outsideIds.length>0&&<details className="resource-external"><summary>文件夹外的关联 · {outsideIds.length}</summary><div>{outsideIds.map(id=><button key={id} onClick={()=>void open(id)}>{allNodes.find(n=>n.id===id)?.name||'已移除设定'} ↗</button>)}</div></details>}

      {error&&<p className="notice error" role="alert">{error}</p>}
      <ResourceState resource={resource}><RelationCanvas loading={!pageReady} key={`${novelId}:folder:${folderId||'root'}`} scopeKey={scope} title={[props.novelTitle,currentTitle].filter(Boolean).join(' · ')} nodes={visible} allNodes={visible.map(n=>({...n,groupId:n.groupId===folderId?null:n.groupId}))} edges={edges.filter(e=>visibleIds.has(e.from)&&visibleIds.has(e.to)).filter((e):e is typeof e&{id:string;revision:number}=>Boolean(e.id&&e.revision))} groups={canvasGroups} busy={busy}
        onOpenFolder={settings.switchFolder} allGroups={groups} scopeFolderId={folderId}
        multiSelect={batch} selection={checked} onSelectionChange={ids=>setChecked([...checked.filter(id=>!visibleIds.has(id)),...ids])} onHighlightChange={settings.setHighlighted} focusId={settings.focused} focused={()=>settings.setFocused(null)}
        onReady={center=>{canvas.current=center;}} onNew={(position,connection,type)=>create(type||(allNodes.find(n=>n.id===connection?.id)?.type==='world_entry'?'world_entry':'character_card'),position,connection)} creation={creating} saveCreation={settings.saveCreation} cancelCreation={()=>setCreating(null)}
        onSelect={open} onConnect={settings.connectDirect} onLayout={settings.saveLayout} onArrange={settings.arrangeLayout} onEdit={setEdge} onDelete={settings.disconnect} onRemove={settings.removeNodes} onDuplicate={settings.duplicateNodes} onMove={settings.moveNodes} onCreateFolder={settings.createFolder} onRenameFolder={folderActions.rename} onDissolveFolder={folderActions.remove}/></ResourceState>
    </div>
  </OrganizedWorkspace>{edge&&<Modal title={edge.id?'编辑关系':'添加关系'} close={()=>setEdge(null)}><EdgeEditor key={edge.id||`new:${edge.from}:${edge.to}`} {...{call,novelId,run,busy}} nodes={allNodes} initial={edge} saved={()=>setEdge(null)}/></Modal>}</div>;
}

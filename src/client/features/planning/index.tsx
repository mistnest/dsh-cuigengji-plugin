import React,{useEffect,useState} from 'react';
import {DetailPage} from '../../shared/detail-page.tsx';
import {TreeGroups,DirectoryTools,useTreeGroupActions} from '../../shared/ContentTree.tsx';
import {BatchManager} from '../../shared/batch-management.tsx';
import {ResourceState} from '../../shared/ui.jsx';
import {OrganizedWorkspace,SidebarSection} from '../../shared/OrganizedWorkspace.tsx';
import {DirectoryEntries,DirectoryOrderNotice} from '../../shared/DirectoryEntries.tsx';
import type {FeatureServices} from '../../shared/workspace-state.ts';
import type {TransferShortcut} from '../../../contracts/transfer.ts';
import {PlanningPages} from './Pages.tsx';
import {PlanningCanvas} from './Canvas.tsx';
import {PlanningDetail} from './Detail.jsx';
import {PlanningHistory} from './History.jsx';
import {usePlanningWorkspace} from './usePlanningWorkspace.ts';
import {statusNames} from './model.ts';
import {useDirectoryReorder} from '../../shared/useDirectoryReorder.ts';

interface Props extends FeatureServices {novelTitle?:string;onChapter:(id:string)=>void;onMemory:(id:string)=>void;onTransfer:(shortcut:TransferShortcut)=>void}

export function Planning(props:Props) {
  const {call,novelId,run,busy:working,onChapter,onMemory,onTransfer}=props;
  const board=usePlanningWorkspace(props);
  const folderActions=useTreeGroupActions({prefix:'planning',novelId,pageId:board.pageId||null,call,run,refresh:board.refreshWritten,reveal:()=>board.setQuery('')});
  const [collapseKey,setCollapseKey]=useState(0);
  const [directoryReveal,setDirectoryReveal]=useState<string|null>(null);
  const {canvas,creating,created,batch,selected,query,setQuery,checked,setChecked,pageId,nodes,edges,groups,pages,decorations,seen,sequence,trail,open,close,back,transact,refreshWritten,continueFrom,resource}=board;
  useEffect(()=>setDirectoryReveal(null),[novelId,pageId]);
  useEffect(()=>{if(created)setDirectoryReveal(created);},[created]);
  const directoryItem=(n:(typeof nodes)[number])=>({id:n.id,title:n.title,summary:n.summary,groupId:n.groupId,parentId:n.parentId,meta:statusNames[n.status]});
  const directoryReorder=useDirectoryReorder({scopeKey:`${novelId}:planning:${pageId||'main'}`,items:board.directoryNodes.map(directoryItem),groups,disabled:working||!board.pageReady||batch||Boolean(query),move:args=>call('planning.directory.move',{novelId,pageId:pageId||null,...args}),read:async()=>{const [snapshot,groups]=await refreshWritten();return {items:snapshot.items.map(directoryItem),groups};}});
  const busy=working||directoryReorder.saving||!board.pageReady;
  const directory={items:batch?board.directoryNodes.map(directoryItem):directoryReorder.items,activeIds:selected?[selected]:board.highlighted,open:board.openDirectory,select:(id:string)=>board.openDirectory(id,false),batch,checked,toggle:(id:string)=>setChecked(checked.includes(id)?checked.filter(value=>value!==id):[...checked,id]),busy:busy||directoryReorder.saving||(!board.pageReady),searching:Boolean(query),reorder:directoryReorder};
  const sidebar=<>
    <PlanningPages pages={pages} value={pageId} busy={busy} change={board.switchPage}
      create={(name,summary)=>run(async()=>{const page=await call('planning.page.create',{novelId,name,summary,requestId:crypto.randomUUID()});board.switchPage(page.id);})}
      update={(page,name,summary)=>run(()=>call('planning.page.update',{novelId,pageId:page.id,expectedRevision:page.revision,name,summary,requestId:crypto.randomUUID()}))}
      remove={page=>run(async()=>{await call('planning.page.delete',{novelId,pageId:page.id,expectedRevision:page.revision,confirm:true,requestId:crypto.randomUUID()});board.switchPage('');})}/>
    <SidebarSection title="内容目录" action={<DirectoryTools create={()=>void folderActions.create()} collapse={()=>setCollapseKey(Date.now())} busy={busy} searching={Boolean(query)}/>}>
      <div className="content-tree" ref={directoryReorder.directoryRef}><TreeGroups {...{groups,directory,collapseKey}} actions={folderActions} busy={busy} prefix="planning" scope={`${novelId}:planning:${pageId||'main'}`} revealItem={directoryReveal} newItems={[{label:'新建情节',create:groupId=>board.beginCreation(undefined,null,'out',groupId)}]}/><DirectoryOrderNotice {...directoryReorder}/></div>
    </SidebarSection>
      {!!query.trim()&&!!board.matchingDecorations.length&&!batch&&<SidebarSection title="批注搜索结果"><DirectoryEntries {...directory} select={id=>{close();board.setHighlighted([id]);board.setCreated(id);}} reorder={undefined} items={board.matchingDecorations.map(d=>({id:d.id,title:d.title||(d.kind==='frame'?'讨论框':'文字批注'),summary:d.content,icon:'edit'}))} activeIds={board.decoration?[board.decoration.id]:board.highlighted} open={id=>{const d=decorations.find(d=>d.id===id);if(d){close();board.setCreating(null);board.setDecoration(d);board.setCreated(id);}}}/></SidebarSection>}

  </>;
  const tools=<>
    {!batch&&<><button className="module-select" aria-label="多选" disabled={busy} onClick={board.beginBatch}>多选</button><div className="module-add"><button className="primary" disabled={busy} onClick={board.add}>＋ 情节</button><details className="menu"><summary className="primary" aria-label="添加画布内容">⌄</summary><div className="menu-panel"><button disabled={busy} onClick={()=>board.decorate('note',canvas.current?.()||{x:40,y:60})}>文字批注</button><button disabled={busy} onClick={()=>void board.createFolder([],canvas.current?.())}>文件夹</button></div></details></div>
      <details className="menu"><summary aria-label="规划更多操作">···</summary><div className="menu-panel"><button disabled={busy} onClick={()=>onTransfer({mode:'export',selection:{kind:'planning',novelId,pageIds:[pageId||null]}})}>导出当前画布</button><button disabled={busy} onClick={()=>onTransfer({mode:'import',selection:{kind:'planning',novelId}})}>导入规划</button><button disabled={busy} onClick={board.openHistory}>{sequence>seen?'有新变化 · ':''}修改记录</button></div></details>
    </>}
  </>;
  const detail=selected&&<DetailPage key={selected} className="planning-detail" backLabel={trail.previous?'‹ 返回上一条':'‹ 返回规划'} onBack={back}><PlanningDetail {...{call,novelId,run,busy,nodes,edges,groups,transact,refreshWritten,onChapter,onMemory,continueFrom,close}} onSelect={(id:string)=>open(id,true)} onEnter={()=>board.beginChild(selected)} id={selected} latest={nodes.find(n=>n.id===selected)}/></DetailPage>;
  return <div className="planning-workspace">
    <OrganizedWorkspace scopeKey={`${novelId}:planning`} title={pages.find(p=>(p.id||'')===pageId)?.name||'规划'} count={board.visible.length+(query?board.matchingDecorations.length:0)} search={{label:'搜索规划',value:query,change:setQuery}} {...{sidebar,tools,detail}}>
      <div className="planning-overview">
        {batch&&<BatchManager items={board.batchItems} selected={checked} change={setChecked} groups={groups} busy={busy||(!board.pageReady)} pages={pages} currentPage={pageId} done={board.endBatch} onPage={board.moveToPage} onMove={async(ids,groupId)=>{if(await board.moveObjects(ids,groupId))setChecked([]);}} onDuplicate={()=>board.duplicateObjects(checked)} onDelete={()=>board.removeObjects(checked)}/>}
        <ResourceState resource={resource}>
          <PlanningCanvas loading={!board.pageReady} key={`${novelId}:${pageId}`} scopeKey={`${novelId}:planning:${pageId||'main'}`} title={[props.novelTitle,pages.find(p=>(p.id||'')===pageId)?.name||'情节规划'].filter(Boolean).join(' · ')} nodes={board.visible} allNodes={nodes} edges={edges} groups={groups} decorations={decorations} matchingDecorations={query?board.matchingDecorations.map(d=>d.id):[]} filtered={false} busy={busy} seen={seen}
            multiSelect={batch} selection={checked} onSelectionChange={setChecked} onHighlightChange={board.setHighlighted}
            onReady={center=>{canvas.current=center;}} onNew={(position,connection)=>board.beginCreation(position,connection?nodes.find(n=>n.id===connection.id):null,connection?.side)}
            creation={creating} saveCreation={board.saveCreation} cancelCreation={()=>board.setCreating(null)} focusId={created} focused={()=>board.setCreated(null)} editingDecoration={board.decoration} saveDecoration={board.saveDecoration} closeDecoration={()=>board.setDecoration(null)}
            onDecorate={board.decorate} onEditDecoration={value=>{close();board.setCreating(null);board.setDecoration(value);}}
            onResizeDecoration={(d,size)=>transact([{op:'decoration.update',id:d.id,expectedRevision:d.revision,value:size}],'调整批注大小')}
            onToggleFrame={d=>transact([{op:'decoration.update',id:d.id,expectedRevision:d.revision,value:{moveContents:!d.moveContents}}],'调整讨论框移动方式')}
            onSetStage={board.setStage} onCreateStage={board.createStage} onAddChild={board.beginChild} onSelect={open} onLayout={board.saveLayout} onArrange={board.arrangeLayout} onConnect={board.connect} onDisconnect={board.disconnect} onRemove={board.removeObjects} onDuplicate={board.duplicateObjects} onMove={board.moveObjects}
            onCreateFolder={board.createFolder} onRenameFolder={folderActions.rename} onDissolveFolder={folderActions.remove} emptyMessage="右键开始新的情节"/>
        </ResourceState>
      </div>
    </OrganizedWorkspace>
    {board.historyOpen&&<PlanningHistory {...board} {...{busy,run,call,novelId}} setPageId={board.switchPage}/>}
  </div>;
}

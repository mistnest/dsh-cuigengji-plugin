import React, {useEffect, useState} from 'react';
import {useDialog} from '../../dialog.tsx';
import {ManagementPage, ManagementSection, type Call, type Run, type BackProps} from '../../shared/management-page.tsx';
import type {TransferShortcut} from '../../../contracts/transfer.ts';
import type {BookSummary} from '../../../contracts/novels.ts';
import {useResource} from '../../shared/state.js';
import {ResourceState} from '../../shared/ui.jsx';
import {Icon} from '../../shared/icons.tsx';
import {notifyLibraryChanged} from '../../shared/library-events.ts';
import {CleanupDialog} from '../../shared/CleanupDialog.tsx';
import type {CleanupSelection} from '../../../contracts/cleanup.ts';

type Props = BackProps & {call: Call; novelId?: string; novel?: {title: string}; run: Run; busy: boolean; tick: number; initialView?: 'overview' | 'recycle'; onTransfer: (value: TransferShortcut) => void};
function recycledDate(book: BookSummary) {
  return book.archivedAt ? new Date(book.archivedAt).toLocaleDateString('zh-CN') + ' 移入' : '已移入回收站';
}
export function Manage({call, novelId, novel, run, busy, tick, initialView = 'overview', onTransfer, onBack, backLabel}: Props) {
  const {ask} = useDialog();
  const [view,setView] = useState(initialView);
  const [cleanup,setCleanup]=useState<CleanupSelection|null>(null),[checked,setChecked]=useState<string[]>([]);
  useEffect(()=>setView(initialView),[initialView]);
  const resource = useResource(()=>call<BookSummary[]>('novel.list',{includeArchived:true}),[call,tick]);
  const recycled = ((resource.value || []) as BookSummary[]).filter(book=>book.archived).sort((a,b)=>(b.archivedAt || b.updatedAt || '').localeCompare(a.archivedAt || a.updatedAt || ''));
  useEffect(()=>{setChecked(old=>{const next=old.filter(id=>(resource.value||[]).some((b:BookSummary)=>b.id===id&&b.archived));return next.length===old.length?old:next;});},[resource.value]);
  const restore = (book: BookSummary) => run(async()=>{
    await call('novel.restore',{novelId:book.id,expectedRevision:book.revision,requestId:crypto.randomUUID()});
    notifyLibraryChanged();
  });
  return <ManagementPage title="作品与备份" description={view==='recycle'?'找回暂时收起的故事，或清理不再需要的作品。':'管理作品，或前往导入 / 导出带走数据。'} {...{onBack, backLabel}} actions={<div className="management-view-switch" role="group" aria-label="作品管理视图"><button aria-pressed={view==='overview'} onClick={()=>setView('overview')}>作品与备份</button><button aria-pressed={view==='recycle'} onClick={()=>setView('recycle')}>回收站{recycled.length > 0 ? ` · ${recycled.length}` : ''}</button></div>}>
    {view==='recycle'?<ResourceState resource={resource}><ManagementSection title="作品回收站" description={recycled.length ? '恢复后，正文、历史和所有关联信息都会回到原作品。' : undefined}>
      {recycled.length>0&&<div className="trash-toolbar"><label><input type="checkbox" aria-label="全选回收作品" checked={recycled.every(b=>checked.includes(b.id))} disabled={busy} onChange={e=>setChecked(e.target.checked?recycled.map(b=>b.id):[])}/>全选</label><div><button className="danger" disabled={busy||!checked.length} onClick={()=>setCleanup({scope:'novel-trash',ids:checked})}>删除所选{checked.length?` (${checked.length})`:''}</button><button className="danger" disabled={busy} onClick={()=>setCleanup({scope:'novel-trash'})}>清空作品回收站</button></div></div>}
      {recycled.length ? <ul className="management-trash-list">{recycled.map(book=><li className="management-trash-row" key={book.id}>
        <input className="chapter-trash-select" type="checkbox" aria-label={`选择《${book.title}》`} checked={checked.includes(book.id)} disabled={busy} onChange={e=>setChecked(old=>e.target.checked?[...new Set([...old,book.id])]:old.filter(id=>id!==book.id))}/>
        <div className="management-trash-copy"><h3>{book.title}</h3><p>{recycledDate(book)}</p></div>
        <div className="management-trash-actions"><button disabled={busy||resource.loading} aria-label={`恢复《${book.title}》`} onClick={()=>restore(book)}><Icon name="restore"/>恢复作品</button><button className="quiet danger" disabled={busy||resource.loading} aria-label={`永久删除《${book.title}》`} onClick={()=>setCleanup({scope:'novel-trash',ids:[book.id]})}>永久删除</button></div>
      </li>)}</ul>:<div className="management-trash-empty"><Icon name="trash"/><p>回收站是空的</p><small>在首页点击作品卡片右侧的回收按钮，作品会暂存在这里。</small></div>}
    </ManagementSection></ResourceState>:<>
    {novelId && <ManagementSection title="当前作品">
      <div className="management-action-row management-current-work"><div><h3>{novel?.title}</h3><p className="management-hint">正文、设定、规划和写作预设保存在这部作品里。</p></div><button className="quiet" disabled={busy} onClick={async () => {const title = await ask('作品名称', novel?.title || ''); if (title?.trim()) void run(async () => {const current = await call<{revision: number}>('novel.get', {novelId}); await call('novel.update', {novelId, title, expectedRevision: current.revision});});}}>重命名</button></div>
      <button className="primary" disabled={busy} onClick={() => onTransfer({mode: 'export', selection: {kind: 'works', novelIds: [novelId]}})}>导出这部作品</button>
    </ManagementSection>}
    <ManagementSection title="导入与迁移">
      <button className="management-action-link" aria-label="恢复或导入作品" disabled={busy} onClick={() => onTransfer({mode: 'import'})}><span><strong>恢复或导入作品</strong><small>催更姬备份、旧项目和写作内容，统一识别并预览</small></span><span aria-hidden="true">›</span></button>
      <button className="management-action-link" aria-label="备份整个工作库" disabled={busy} onClick={() => onTransfer({mode: 'export', selection: {kind: 'workspace'}})}><span><strong>备份整个工作库</strong><small>保留所有作品、历史和会话绑定，适合迁移到新电脑</small></span><span aria-hidden="true">›</span></button>
    </ManagementSection>
    <ManagementSection title="作品回收站"><button className="management-action-link" disabled={busy} onClick={()=>setView('recycle')}><span><strong>查看回收站{recycled.length > 0 ? ` · ${recycled.length} 部作品` : ''}</strong><small>恢复完整作品，或永久删除不再需要的内容</small></span><span aria-hidden="true">›</span></button></ManagementSection>
    </>}
    {cleanup&&<CleanupDialog call={call} selection={cleanup} close={()=>setCleanup(null)} onCleaned={()=>{setChecked([]);notifyLibraryChanged();void resource.reload().catch(()=>{});}}/>}
  </ManagementPage>;
}

import React, {useState} from 'react';
import {groupMatches,groupRows} from '../../../domain/directory/groups.ts';
import type {Catalog, CatalogBook, Selection, ExportKind} from '../../../contracts/transfer.ts';

export const kindNames: Record<ExportKind, string> = {chapters: '正文', memory: '设定', planning: '规划', preset: '写作预设', works: '作品', workspace: '完整工作库'};
export function defaultSelection(kind: ExportKind, catalog: Catalog, novelId?: string, imported = false): Selection {
  const book = catalog.books.find(n => n.id === novelId) || catalog.books[0];
  return {kind, ...(kind === 'works' ? {novelIds: imported ? catalog.books.map(n => n.id) : book ? [book.id] : []} : kind === 'workspace' ? {} : {novelId: book?.id}), includeDependencies: imported};
}
export function KindPicker({value, change, kinds = ['chapters', 'memory', 'planning', 'preset', 'works', 'workspace'], disabled}: {
  value: ExportKind; change: (kind: ExportKind) => void; kinds?: ExportKind[]; disabled?: boolean;
}) {
  return <div className="transfer-kinds" role="group" aria-label="内容类型">{kinds.map(kind => <button key={kind} disabled={disabled} aria-pressed={kind === value} onClick={() => change(kind)}>{kindNames[kind]}</button>)}</div>;
}
type Row = {id: string | null; title: string; detail?: string};
function SelectionList({rows, selected, change, disabled, noun}: {rows: Row[]; selected: (string | null)[]; change: (ids: (string | null)[]) => void; disabled?: boolean; noun: string}) {
  const [query, setQuery] = useState('');
  const visible = rows.filter(r => (r.title + ' ' + (r.detail || '')).toLowerCase().includes(query.toLowerCase()));
  const all = visible.length > 0 && visible.every(r => selected.includes(r.id));
  return <div className="transfer-selection">
    <div className="transfer-selection-head"><label className="transfer-checkbox"><input type="checkbox" aria-label={`选择全部${noun}`} checked={all} disabled={disabled || !visible.length} onChange={e => change(e.target.checked ? [...new Set([...selected, ...visible.map(r => r.id)])] : selected.filter(id => !visible.some(r => r.id === id)))}/>全选<small>已选 {selected.length} 项</small></label>
      {rows.length > 6 && <input type="search" aria-label={`查找${noun}`} placeholder="查找…" value={query} onChange={e => setQuery(e.target.value)}/>}</div>
    <div className="transfer-selection-list" aria-label={`选择${noun}`}>{visible.map(row => <label key={row.id ?? 'main'} className="transfer-selection-row"><input type="checkbox" aria-label={`选择 ${row.title}`} checked={selected.includes(row.id)} disabled={disabled} onChange={e => change(e.target.checked ? [...selected, row.id] : selected.filter(id => id !== row.id))}/><span><strong>{row.title}</strong>{row.detail && <small>{row.detail}</small>}</span></label>)}
      {!visible.length && <p className="transfer-empty">{query ? '没有找到匹配内容' : `还没有可选择的${noun}`}</p>}</div>
  </div>;
}
export function ScopePicker({catalog, selection, change, disabled}: {catalog: Catalog; selection: Selection; change: (selection: Selection) => void; disabled?: boolean}) {
  const [volume, setVolume] = useState(selection.volumeIds?.[0] || ''), [group, setGroup] = useState(selection.groupIds ? selection.groupIds[0] ?? 'none' : ''), [type, setType] = useState(selection.memoryType || '');
  const [memoryPage,setMemoryPage]=useState(selection.kind==='memory'&&selection.pageIds?.length===1?selection.pageIds[0]??'main':'');
  const book = catalog.books.find(n => n.id === selection.novelId) || catalog.books[0];
  if (selection.kind === 'workspace') return <div className="transfer-whole-library"><span aria-hidden="true">▤</span><div><h3>把整个作品库带走</h3><p>所有作品与版本历史、回收站、会话绑定和操作日志。</p></div></div>;
  if (selection.kind === 'works') return <SelectionList rows={catalog.books.map(b => ({id: b.id, title: b.title, detail: `${b.counts.chapters} 章 · ${b.counts.memory} 条设定${b.archived ? ' · 回收站' : ''}`}))} selected={selection.novelIds ?? catalog.books.map(n => n.id)} change={ids => change({...selection, novelIds: ids as string[]})} noun="作品" disabled={disabled}/>;
  return <>
    <label className="management-field transfer-book-field">来源作品<select aria-label="来源作品" disabled={disabled} value={book?.id || ''} onChange={e => {setVolume(''); setGroup(''); setType('');setMemoryPage(''); change(defaultSelection(selection.kind, catalog, e.target.value, selection.includeDependencies));}}>{catalog.books.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}</select></label>
    {book ? selection.kind === 'chapters' ? <>
      <label className="management-field transfer-filter">章节范围<select aria-label="章节范围" disabled={disabled} value={volume} onChange={e => {const id = e.target.value; setVolume(id); change({...selection, volumeIds: undefined, chapterIds: book.chapters.filter(ch => !id || (ch.volumeId ?? 'none') === id).map(ch => ch.id)});}}><option value="">全书章节</option>{book.volumes.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}<option value="none">未分卷</option></select></label>
      <SelectionList rows={book.chapters.filter(ch => !volume || (ch.volumeId ?? 'none') === volume).map(ch => ({id: ch.id, title: ch.title, detail: `${ch.words.toLocaleString('zh-CN')} 字`}))} selected={selection.chapterIds ?? book.chapters.filter(ch => !selection.volumeIds || ch.volumeId && selection.volumeIds.includes(ch.volumeId)).map(ch => ch.id)} noun="章节" disabled={disabled} change={ids => change({...selection, volumeIds: undefined, chapterIds: ids as string[]})}/>
    </> : selection.kind === 'memory' ? <>
      {(book.memoryPages?.length||0)>1&&<label className="management-field transfer-filter">设定画布<select aria-label="导出设定画布" disabled={disabled} value={memoryPage} onChange={e=>{const id=e.target.value;setMemoryPage(id);setGroup('');change({...selection,pageIds:id?[id==='main'?null:id]:undefined,groupIds:undefined,nodeIds:undefined,memoryType:(type||undefined) as Selection['memoryType']});}}><option value="">所有画布</option>{book.memoryPages.map(p=><option key={p.id||'main'} value={p.id||'main'}>{p.name}</option>)}</select></label>}
      <div className="transfer-filter-pair"><label className="management-field">设定分组<select aria-label="设定分组" disabled={disabled} value={group} onChange={e => {const id = e.target.value; setGroup(id); change({...selection,pageIds:undefined, groupIds: undefined, nodeIds: memoryRows(book, id, type,memoryPage).map(n => n.id)});}}><option value="">全部分组</option>{groupRows(book.groups.filter(g=>!memoryPage||(g.pageId??null)===(memoryPage==='main'?null:memoryPage))).map(({group,label}) => <option key={group.id} value={group.id}>{!memoryPage&&group.pageId?`${book.memoryPages.find(p=>p.id===group.pageId)?.name} / `:''}{label}</option>)}<option value="none">根目录</option></select></label>
        <label className="management-field">设定类型<select aria-label="设定类型" disabled={disabled} value={type} onChange={e => {const next = e.target.value; setType(next); change({...selection,pageIds:undefined, groupIds: undefined, memoryType: undefined, nodeIds: memoryRows(book, group, next,memoryPage).map(n => n.id)});}}><option value="">人物与世界</option><option value="character_card">人物</option><option value="world_entry">世界设定</option></select></label></div>
      <SelectionList rows={memoryRows(book, group, type,memoryPage).map(n => ({id: n.id, title: n.name, detail: `${n.type === 'character_card' ? '人物' : '世界设定'}${n.summary ? ' · ' + n.summary.slice(0, 80) : ''}`}))} selected={selection.nodeIds ?? memoryRows(book, group, type,memoryPage).map(n => n.id)} noun="设定" disabled={disabled} change={ids => change({...selection,pageIds:undefined, groupIds: undefined, memoryType: undefined, nodeIds: ids as string[]})}/>
    </> : selection.kind === 'planning' ? <SelectionList rows={book.pages.map(p => ({id: p.id, title: p.name, detail: `${p.beats} 个情节 · ${p.decorations} 个框与便签`}))} selected={selection.pageIds ?? book.pages.map(p => p.id)} noun="规划页" disabled={disabled} change={ids => change({...selection, pageIds: ids})}/> : <div className="transfer-preset-scope"><h3>{book.preset?.name || '还没有写作预设'}</h3><p>{book.preset ? `${book.preset.blocks} 条提示词，保留编辑后的内容与顺序。` : '在写作预设页面添加要求后，就可以单独导出。'}</p></div> : <p className="transfer-empty">还没有作品。也可以先从文件导入。</p>}
  </>;
}
function memoryRows(book: CatalogBook, group: string, type: string,page:string) {
  const inGroup=groupMatches(book.groups,group==='none'?null:group||undefined);
  return book.memory.filter(n => (!page||(n.pageId??null)===(page==='main'?null:page))&&inGroup(n) && (!type || (type === 'world_entry' ? n.type !== 'character_card' : n.type === type)));
}

import React, {useEffect, useRef, useState} from 'react';
import type {GroupItem} from './groups.tsx';
import {groupRows} from '../../domain/directory/groups.ts';

interface Item {id: string; title: string; summary?: string; meta?: string}
interface Selection {items: Item[]; selected: string[]; change: (ids: string[]) => void; busy: boolean}
interface Props extends Selection {
  groups: GroupItem[]; done: () => void;
  onMove: (ids: string[], groupId: string | null) => unknown;
  pages?: {id: string | null; name: string}[]; currentPage?: string;
  onPage?: (ids: string[], pageId: string) => unknown;
  onDuplicate?: () => unknown; onDelete?: () => unknown;
  selectableIds?:string[];selectAllLabel?:string;onFolder?:()=>unknown;onStage?:()=>unknown;
}

export function BatchManager({items, selected, change, groups, busy, done, onMove, pages, currentPage, onPage, onDuplicate, onDelete,selectableIds,selectAllLabel,onFolder,onStage}: Props) {
  const [target, setTarget] = useState('');
  const all = useRef<HTMLInputElement>(null);
  const available=new Set(items.map(item=>item.id)),ids=(selectableIds||[...available]).filter(id=>available.has(id)),checked=selected.filter(id=>available.has(id));
  const visibleKey = [...available].join('|'),visibleChecked=ids.filter(id=>checked.includes(id));
  const every = !!ids.length && visibleChecked.length === ids.length;
  useEffect(() => {if (all.current) all.current.indeterminate = visibleChecked.length > 0 && !every;}, [visibleChecked.length, every]);
  useEffect(() => {if (checked.length !== selected.length) change(checked);}, [visibleKey, selected, change]);
  const destinations = pages?.filter(page => (page.id || '') !== currentPage) || [];
  const valid = target.startsWith('group:') ? target === 'group:' || groups.some(group => `group:${group.id}` === target) : destinations.some(page => `page:${page.id || ''}` === target);
  const move = () => {
    if (busy || !checked.length || !valid) return;
    if (target.startsWith('page:')) onPage?.(checked, target.slice(5));
    else onMove(checked, target.slice(6) || null);
  };
  return <section className="batch-toolbar" aria-label="批量管理">
    <label className="batch-select-all">
      <input ref={all} type="checkbox" aria-label={selectAllLabel ?? '全选当前列表'} title={selectAllLabel ?? (selectableIds?'全选筛选结果':'全选当前目录')}
        checked={every} disabled={busy || !ids.length} onChange={event=>change(event.target.checked?[...new Set([...checked,...ids])]:checked.filter(id=>!ids.includes(id)))}/>
      {selectAllLabel&&<span>{selectAllLabel}</span>}
      <span className="batch-count" role="status">已选 {checked.length} 项</span>
    </label>
    {onFolder&&<details className="menu"><summary aria-label="收纳选中条目" aria-disabled={busy||!checked.length}>收纳</summary><div className="menu-panel" onClick={event=>{if((event.target as HTMLElement).closest('button:not(:disabled)'))event.currentTarget.closest('details')!.open=false;}}><button disabled={busy||!checked.length} onClick={onFolder}>新建文件夹收纳</button>{onStage&&<button disabled={busy||!checked.length} onClick={onStage}>新建阶段收纳</button>}</div></details>}
    <details className="menu batch-move-menu"><summary aria-label="移动选中条目">移动</summary><div className="menu-panel"><label>移动到<select aria-label="批量移动目标" value={valid ? target : ''} disabled={busy} onChange={event => setTarget(event.target.value)}><option value="">选择{onPage ? '文件夹或画布' : '目标文件夹'}</option><optgroup label="文件夹"><option value="group:">根目录</option>{groupRows(groups).map(({group,label}) => <option key={group.id} value={`group:${group.id}`}>{label}</option>)}</optgroup>{onPage && destinations.length > 0 && <optgroup label="规划画布">{destinations.map(page => <option key={page.id || 'main'} value={`page:${page.id || ''}`}>{page.name}</option>)}</optgroup>}</select></label><button className="primary" disabled={busy || !checked.length || !valid} onClick={event=>{event.currentTarget.closest('details')!.open=false;move();}}>确认移动</button></div></details>
    <details className="menu"><summary aria-label="批量更多操作">···</summary><div className="menu-panel" onClick={event=>{if((event.target as HTMLElement).closest('button:not(:disabled)'))event.currentTarget.closest('details')!.open=false;}}>{onDuplicate&&<button disabled={busy||!checked.length} onClick={onDuplicate}>复制</button>}{onDelete&&<button className="danger" disabled={busy||!checked.length} onClick={onDelete}>删除</button>}<button disabled={busy||!checked.length} onClick={()=>change([])}>清空选择</button></div></details>
    <button className="batch-done" disabled={busy} onClick={done}>完成</button>
  </section>;
}

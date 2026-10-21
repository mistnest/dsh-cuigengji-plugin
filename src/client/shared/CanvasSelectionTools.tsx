import React from 'react';
import {groupRows} from '../../domain/directory/groups.ts';

interface Props {
  selected: string[]; nodeIds: string[]; groups: {id: string; name: string}[]; busy: boolean;
  clear: () => void; move: (groupId: string | null) => void; duplicate: () => void; remove: () => void;
  frame?: () => void;
}

/** Offer object actions after selection, without occupying the empty canvas. */
export function CanvasSelectionTools({selected, nodeIds, groups, busy, clear, move, duplicate, remove, frame}: Props) {
  if (!selected.length) return null;
  const onlyNodes = nodeIds.length === selected.length;
  return <div className="canvas-selection-tools" data-canvas-actions role="toolbar" aria-label="画布选中操作" onPointerDown={event=>event.stopPropagation()} onKeyDown={event=>{if(event.key!=='Escape')event.stopPropagation();}}>
    <span>已选 {selected.length} 项</span>
    {onlyNodes && <><details className="menu"><summary aria-label="移动选中卡片">移动</summary><div className="menu-panel"><button disabled={busy} onClick={()=>move(null)}>根目录</button>{groupRows(groups).map(({group,label})=><button disabled={busy} key={group.id} onClick={()=>move(group.id)}>{label}</button>)}</div></details><button disabled={busy} aria-label="复制选中卡片" onClick={duplicate}>复制</button></>}
    {frame && selected.length > 1 && <button disabled={busy} aria-label="将选中内容收纳为文件夹" onClick={frame}>收纳</button>}
    <button disabled={busy} aria-label="删除选中内容" onClick={remove}>删除</button><button className="selection-clear" disabled={busy} aria-label="取消画布选择" onClick={clear}>×</button>
  </div>;
}

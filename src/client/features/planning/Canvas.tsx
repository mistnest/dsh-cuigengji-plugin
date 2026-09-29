import React, { useEffect, useId, useRef, useState } from 'react';
import { arrangeGroups } from './layout.ts';
import type { NodeIndex, PlanningEdge, PlanningGroup, Point } from '../../../contracts/planning.ts';
const edgeNames = { next: '剧情推进', requires: '依赖铺垫', alternative: '备选分支' };
interface Props {
  nodes: NodeIndex[]; edges: PlanningEdge[]; groups: PlanningGroup[];
  seen: number; selected: string | null; busy: boolean;
  onSelect: (id: string) => void;
  onLayout: (positions: Record<string, Point>) => Promise<boolean | undefined>;
  onConnect: (from: string, to: string, type: string) => Promise<boolean | undefined>;
}
export function PlanningCanvas({ nodes, edges, groups, seen, selected, busy, onSelect, onLayout, onConnect }: Props) {
  const markerId = useId(), scroll = useRef<HTMLDivElement>(null);
  const [local, setLocal] = useState<Record<string, Point>>({});
  const [zoom, setZoom] = useState(1), [collapsed, setCollapsed] = useState<string[]>([]);
  const [connectMode, setConnectMode] = useState(false), [connectFrom, setConnectFrom] = useState<string | null>(null), [edgeType, setEdgeType] = useState('next');
  const drag = useRef<{ id: string; x: number; y: number; start: Point } | null>(null);
  const computed = arrangeGroups(nodes, edges);
  const points = Object.fromEntries(nodes.map(n => [n.id, local[n.id] || n.position || computed[n.id]]));
  const dirty = Object.keys(local).length > 0;
  useEffect(() => { setLocal(previous => Object.fromEntries(Object.entries(previous).filter(([id, point]) => {
    const saved = nodes.find(n => n.id === id)?.position;
    return saved?.x !== point.x || saved?.y !== point.y;
  }))); }, [nodes]);
  const frames = [...new Set(nodes.map(n => n.groupId || ''))].map(id => {
    const members = nodes.filter(n => (n.groupId || '') === id), positions = members.map(n => points[n.id]);
    const x = Math.min(...positions.map(p => p.x)) - 16, y = Math.min(...positions.map(p => p.y)) - 38;
    return { id, members, name: groups.find(g => g.id === id)?.name || '未分组', x, y,
      width: Math.max(...positions.map(p => p.x)) - x + 236,
      height: collapsed.includes(id) ? 38 : Math.max(...positions.map(p => p.y)) - y + 158 };
  });
  const visible = nodes.filter(n => !collapsed.includes(n.groupId || ''));
  const ids = new Set(visible.map(n => n.id));
  const width = Math.max(800, ...frames.map(f => f.x + f.width + 24));
  const height = Math.max(450, ...frames.map(f => f.y + f.height + 24));
  return <><div className="row canvas-tools">
    <button aria-label="缩小画布" onClick={() => setZoom(z => Math.max(.4, z - .1))}>−</button><span>{Math.round(zoom * 100)}%</span><button aria-label="放大画布" onClick={() => setZoom(z => Math.min(1.6, z + .1))}>＋</button>
    <button onClick={() => setZoom(Math.min(1, (scroll.current?.clientWidth || 800) / width))}>适应视图</button><button disabled={busy} onClick={() => setLocal(arrangeGroups(nodes, edges))}>整理布局</button>
    <button aria-pressed={connectMode} disabled={busy} onClick={() => { setConnectMode(v => !v); setConnectFrom(null); }}>{connectMode ? '退出连线' : '连线节点'}</button>{connectMode && <><select aria-label="画布关系类型" value={edgeType} onChange={e => setEdgeType(e.target.value)} disabled={busy}>{Object.entries(edgeNames).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><small role="status">{connectFrom ? `起点：${nodes.find(n => n.id === connectFrom)?.title}，请点击目标节点` : '请先点击起点节点'}</small></>}
    {dirty && <><button className="primary" disabled={busy} onClick={() => onLayout(local)}>保存布局</button><button disabled={busy} onClick={() => setLocal({})}>放弃布局调整</button><small>布局尚未保存</small></>}
  </div><div className="planning-canvas-scroll" ref={scroll}><div style={{ width: width * zoom, height: height * zoom }}><div className="planning-canvas" style={{ width, height, transform: `scale(${zoom})`, transformOrigin: 'top left' }}>
    {frames.map(f => <div key={f.id} className="planning-group-frame" style={{ left: f.x, top: f.y, width: f.width, height: f.height }}><button aria-expanded={!collapsed.includes(f.id)} onClick={() => setCollapsed(values => values.includes(f.id) ? values.filter(id => id !== f.id) : [...values, f.id])}>{collapsed.includes(f.id) ? '▸' : '▾'} {f.name} · {f.members.length}</button></div>)}
    <svg className="planning-lines" width={width} height={height} aria-label="规划连线"><defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>
      {edges.filter(e => ids.has(e.from) && ids.has(e.to)).map(e => { const a = points[e.from], b = points[e.to]; return <g key={e.id} opacity={selected && e.from !== selected && e.to !== selected ? .3 : 1}><path d={`M${a.x + 220},${a.y + 55} C${a.x + 245},${a.y + 55} ${b.x - 25},${b.y + 55} ${b.x},${b.y + 55}`} fill="none" stroke="currentColor" strokeDasharray={e.type === 'next' ? undefined : '5 4'} markerEnd={`url(#${markerId})`}/><text x={(a.x + 220 + b.x) / 2} y={(a.y + b.y) / 2 + 45}>{e.label || edgeNames[e.type]}</text></g>; })}
    </svg>
    {visible.map(n => { const p = points[n.id]; const click = () => { if (busy) return; if (!connectMode) return onSelect(n.id); if (!connectFrom) return setConnectFrom(n.id); if (connectFrom === n.id) return setConnectFrom(null); void onConnect(connectFrom, n.id, edgeType).then(ok => { if (ok === true) setConnectFrom(null); }); }; return <section key={n.id} className={`planning-card ${selected === n.id ? 'selected' : ''} ${connectFrom === n.id ? 'connect-source' : ''}`} style={{ left: p.x, top: p.y }} onClick={connectMode ? click : undefined}>
      <div className="drag-handle" onPointerDown={e => { if (busy || connectMode) return; drag.current = { id: n.id, x: e.clientX, y: e.clientY, start: p }; e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={e => { const d = drag.current; if (d?.id === n.id) setLocal(old => ({ ...old, [n.id]: { x: Math.max(32, d.start.x + (e.clientX - d.x) / zoom), y: Math.max(60, d.start.y + (e.clientY - d.y) / zoom) } })); }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>⋮⋮ <span>{(n.lastSequence || 0) > seen ? '有更新' : '拖动调整位置'}</span></div>
      <button className="planning-title" title={n.title} onClick={e => { e.stopPropagation(); click(); }}>{n.title}</button><p title={n.summary}>{n.summary || '打开填写摘要与正文'}</p>
    </section>; })}
  </div></div></div></>;
}

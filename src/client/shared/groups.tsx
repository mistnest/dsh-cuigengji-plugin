import React, { useState } from 'react';
import { useDialog } from '../dialog.tsx';
import type { Group } from '../../domain/memory/groups.ts';

export type GroupItem = Pick<Group, 'id' | 'name' | 'summary' | 'revision'>;
interface Props {
  groups: GroupItem[];
  value: string;
  onChange: (value: string) => void;
  prefix: 'planning' | 'graph';
  novelId: string;
  busy: boolean;
  call: (action: string, args: Record<string, unknown>) => Promise<unknown>;
  run: (task: () => Promise<unknown>) => unknown;
}
export const filterGroup = (value: string): string | null | undefined => value === '__ungrouped' ? null : value || undefined;
export function GroupSelect({ groups, value, onChange }: { groups: GroupItem[]; value?: string | null; onChange: (id: string | null) => void }) {
  return <label>分组<select value={value || ''} onChange={e => onChange(e.target.value || null)}><option value="">未分组</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>;
}
export function Groups({ groups, value, onChange, prefix, novelId, busy, call, run }: Props) {
  const { ask, confirm } = useDialog();
  const selected = groups.find(g => g.id === value);
  const mutate = (action: string, args: Record<string, unknown>) => call(`${prefix}.group.${action}`, { novelId, requestId: crypto.randomUUID(), ...args });
  return <div className="group-toolbar">
    <label className="grow"><select aria-label={prefix === 'planning' ? '规划分组' : '资料分组'} value={value} onChange={e => onChange(e.target.value)}><option value="">全部分组</option><option value="__ungrouped">未分组</option>{groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
    <details className="menu"><summary>管理分组</summary><div className="menu-panel">
      <button disabled={busy} onClick={async () => { const name = await ask('新建分组名称'); if (name?.trim()) run(() => mutate('create', { name })); }}>新建分组</button>
      {selected && <><button disabled={busy} onClick={async () => { const name = await ask('分组名称', selected.name); if (name?.trim()) run(() => mutate('update', { groupId: selected.id, expectedRevision: selected.revision, name })); }}>重命名</button>
        <button disabled={busy} onClick={async () => { const summary = await ask('分组描述', selected.summary); if (summary !== null) run(() => mutate('update', { groupId: selected.id, expectedRevision: selected.revision, summary })); }}>编辑描述</button>
        <button className="danger" disabled={busy} onClick={async () => { if (await confirm(`删除分组“${selected.name}”？内容将保留在未分组中。`)) run(async () => { await mutate('delete', { groupId: selected.id, expectedRevision: selected.revision, confirm: true }); onChange('__ungrouped'); }); }}>删除分组</button></>}
    </div></details>
    {selected?.summary && <p className="muted group-description">{selected.summary}</p>}
  </div>;
}
export function MoveSelection({ count, groups, busy, onMove, clear }: { count: number; groups: GroupItem[]; busy: boolean; onMove: (id: string | null) => void; clear: () => void }) {
  const [target, setTarget] = useState<string | null>(null);
  if (!count) return null;
  return <div className="batch-toolbar"><span>已选 {count} 项</span><GroupSelect groups={groups} value={target} onChange={setTarget}/><button disabled={busy} onClick={() => onMove(target)}>移动</button><button disabled={busy} onClick={clear}>取消选择</button></div>;
}

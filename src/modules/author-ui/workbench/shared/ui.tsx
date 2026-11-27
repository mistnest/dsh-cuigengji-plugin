import React from 'react';
export function ResourceState({ resource, children }: {resource: {loading: boolean; value: unknown; error?: string; retry(): void}; children?: React.ReactNode}) {
  if (resource.loading && resource.value === null) return <p className="empty empty-loading" role="status">正在读取…</p>;
  return <>{resource.error&&<div className="notice error" role="alert">{resource.error}<button onClick={resource.retry}>重试</button></div>}{children}</>;
}
export function SaveBar({ dirty, busy, error, invalid, onSave, children, label = '保存修改' }: {dirty: boolean; busy?: boolean; error?: string; invalid?: string | boolean; onSave(): void; children?: React.ReactNode; label?: string}) {
  return <footer className="savebar"><div role="status" className={error || invalid ? 'error-text' : 'muted'}>{error || invalid || (dirty ? '本地草稿 · 尚未保存到作品' : '已保存')}{children}</div><button className="primary" disabled={!dirty || busy || !!invalid} onClick={onSave}>{busy ? '请稍候…' : label}</button></footer>;
}
export function saveShortcut(event: Pick<KeyboardEvent,"ctrlKey"|"metaKey"|"key"|"preventDefault"|"stopPropagation">, save: () => void) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); event.stopPropagation(); save(); }
}

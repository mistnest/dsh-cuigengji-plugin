import React from 'react';
export function ResourceState({ resource, children }) {
  if (resource.loading && resource.value === null) return <p className="empty" role="status">正在读取…</p>;
  return <>{resource.error&&<div className="notice error" role="alert">{resource.error}<button onClick={resource.retry}>重试</button></div>}{children}</>;
}
// Deliberately small Markdown reader: React escapes all text, no HTML or unsafe links.
export function ReadingText({ text = '' }) {
  return <div className="reading-text">{text.split(/\n\s*\n/).map((block, i) => {
    const heading = /^(#{1,3})\s+(.+)$/.exec(block);
    if (heading) return <h3 key={i}>{heading[2]}</h3>;
    return <p key={i}>{block.split(/(\*\*[^*]+\*\*)/g).map((part,j) => part.startsWith('**') && part.endsWith('**') ? <strong key={j}>{part.slice(2,-2)}</strong> : part)}</p>;
  })}</div>;
}
export function SaveBar({ dirty, busy, error, invalid, onSave, children, label = '保存修改' }) {
  return <footer className="savebar"><div role="status" className={error || invalid ? 'error-text' : 'muted'}>{error || invalid || (dirty ? '本地草稿 · 尚未保存到作品' : '已保存')}{children}</div><button className="primary" disabled={!dirty || busy || !!invalid} onClick={onSave}>{busy ? '请稍候…' : label}</button></footer>;
}
export function saveShortcut(event, save) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); event.stopPropagation(); save(); }
}

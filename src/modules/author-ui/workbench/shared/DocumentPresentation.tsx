import React from 'react';
import {Icon, type IconName} from './icons.tsx';
import {MarkdownReading} from './MarkdownReading.tsx';

export interface ArchiveChip {
  label: string;
  icon?: IconName;
  tone?: 'default' | 'accent' | 'ok' | 'warn' | 'muted';
  dot?: boolean;
}

export function DocumentHeading({
  title, kind, kindIcon, group, updatedAt, revision, summary, chips, statusSlot, aliases,
}: {
  title:string; kind:string; kindIcon?:IconName; group?:string; updatedAt?:string; revision?:number; summary?:string;
  chips?:ArchiveChip[]; statusSlot?:React.ReactNode; aliases?:string[];
}) {
  const timeText = updatedAt ? new Date(updatedAt).toLocaleString('zh-CN', {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}) : '';
  return <header className="document-heading">
    <div className="document-chip-bar">
      <span className="detail-chip is-accent">{kindIcon && <Icon name={kindIcon}/>}<span>{kind}</span></span>
      {group && <span className="detail-chip"><Icon name="folder"/><span>{group}</span></span>}
      {statusSlot}
      {chips?.map((chip, i) => <span key={i} className={`detail-chip ${chip.tone ? `is-${chip.tone}` : ''}`}>
        {chip.dot && <i className="detail-chip-dot" aria-hidden="true"/>}
        {chip.icon && <Icon name={chip.icon}/>}
        <span>{chip.label}</span>
      </span>)}
      {(revision !== undefined || timeText) && <span className="document-meta-inline">
        {revision !== undefined && <span>v{revision}</span>}
        {timeText && <time dateTime={updatedAt}>{timeText}</time>}
      </span>}
    </div>
    <h2>{title}</h2>
    {aliases && aliases.length > 0 && <div className="document-aliases" aria-label="别名">
      <span className="document-aliases-label">别名</span>
      {aliases.map((alias, idx) => <span key={idx} className="document-alias-pill">{alias}</span>)}
    </div>}
    {summary && <p className="document-summary">{summary}</p>}
  </header>;
}

export function DocumentBody({text, empty = '尚未填写详细内容', onQuickEdit}: {
  text:string; empty?:string; onQuickEdit?:()=>void;
}) {
  const handleClick = onQuickEdit ? (e: React.MouseEvent) => {
    const target = e.target instanceof Element ? e.target : null;
    if (target?.closest('a,button,summary,input,textarea')) return;
    if ((window.getSelection()?.toString().length || 0) > 0) return;
    onQuickEdit();
  } : undefined;
  if (!text) {
    return <article className={`document-body document-empty ${onQuickEdit ? 'is-clickable-empty' : ''}`} onClick={handleClick}>
      <span>{empty}</span>
      {onQuickEdit && <span className="document-empty-cta">点击开始编写</span>}
    </article>;
  }
  if (!onQuickEdit) return <MarkdownReading className="document-body" text={text}/>;
  return <div className="detail-prose-editable" onClick={handleClick} title="点击直接编辑正文">
    <span className="detail-prose-edit-hint" aria-hidden="true"><Icon name="edit"/>点击编辑</span>
    <MarkdownReading className="document-body" text={text}/>
  </div>;
}

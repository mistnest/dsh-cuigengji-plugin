import React from 'react';
import {Icon} from './icons.tsx';

interface BookOption {id: string; title: string}
interface Props {
  home: boolean; novelId?: string; novelTitle?: string; tab: string; busy: boolean; refreshing: boolean; showTabs?: boolean;
  books?: BookOption[]; boundNovelId?: string; guidanceEnabled?: boolean;
  onHome: () => void; onTab: (tab: string) => void; onRefresh: () => void; onSettings: () => void; onAbout: () => void;
  onSelectBook?: (id: string) => void; onBindCurrent?: () => void;
}

export function WorkbenchHeader({
  home, novelId, novelTitle, tab, busy, refreshing, onHome, onTab, onRefresh, onSettings, onAbout,
  showTabs=true, books, boundNovelId, guidanceEnabled, onSelectBook, onBindCurrent,
}: Props) {
  const isBound = Boolean(novelId && boundNovelId === novelId);
  const dotState = guidanceEnabled === false ? 'is-muted' : isBound ? 'is-bound' : boundNovelId ? 'is-other' : 'is-muted';
  const dotHint = guidanceEnabled === false
    ? '当前会话写作指引已关闭'
    : isBound
      ? '当前对话 AI 已绑定此作品'
      : boundNovelId
        ? '当前对话 AI 绑定在另一部作品'
        : '当前对话尚未指定目标作品';
  return <header className="workbench-header workbench-navigation">
    <div className="navigation-origin"><button className="navigation-home" aria-label="作品首页" title="作品首页" aria-current={home ? 'page' : undefined} disabled={busy} onClick={onHome}><Icon name="home"/><span>首页</span></button>
      {novelTitle && !home && (books && books.length > 0 && onSelectBook
        ? <details className="menu book-switcher-menu">
            <summary className="book-switcher-trigger" title={`${novelTitle} · ${dotHint}`}>
              <i className={`ai-focus-dot ${dotState}`} aria-hidden="true"/>
              <span className="navigation-book">{novelTitle}</span>
              <span className="book-switcher-caret" aria-hidden="true">▾</span>
            </summary>
            <div className="menu-panel book-switcher-panel" aria-label="切换作品">
              <div className="book-switcher-status">{dotHint}</div>
              {books.map(book => <button type="button" key={book.id} className={book.id === novelId ? 'is-current' : ''} disabled={busy} onClick={() => onSelectBook(book.id)}>
                <span className="book-switcher-title">{book.title}</span>
                {book.id === boundNovelId && <small>AI当前</small>}
              </button>)}
              {!isBound && novelId && onBindCurrent && <div className="book-switcher-foot">
                <button type="button" className="book-bind-action" disabled={busy} onClick={onBindCurrent}>将《{novelTitle}》设为当前对话目标</button>
              </div>}
            </div>
          </details>
        : <span className="navigation-book" title={novelTitle}>{novelTitle}</span>)}
    </div>
    {novelTitle && !home && showTabs && <nav className="navigation-tabs" aria-label="小说功能">{[['chapters', '正文'], ['plan', '规划'], ['memory', '设定'], ['creativeMemory', '记忆']].map(([id, name]) => <button key={id} disabled={busy} className={tab === id ? 'selected' : ''} aria-pressed={tab === id} onClick={() => onTab(id)}>{name}</button>)}</nav>}
    <div className="navigation-actions"><button className={`navigation-action ${refreshing ? 'is-refreshing' : ''}`} aria-label="刷新当前页面" aria-busy={refreshing} title="刷新数据，保留草稿与当前视野" disabled={busy || refreshing} onClick={onRefresh}><Icon name="refresh"/><span>刷新</span></button>
      <button className="navigation-action" aria-label="设置" title="设置" onClick={onSettings}><Icon name="settings"/><span>设置</span></button>
      <button className="navigation-action navigation-about" aria-label="关于催更姬" title="关于催更姬 · 交流与支持" onClick={onAbout}><Icon name="about"/><span>关于</span></button>
    </div>
  </header>;
}

import React from 'react';
import {Icon} from './icons.tsx';

interface Props {
  home: boolean; novelTitle?: string; tab: string; busy: boolean; refreshing: boolean; showTabs?: boolean;
  onHome: () => void; onTab: (tab: string) => void; onRefresh: () => void; onSettings: () => void; onAbout: () => void;
}

export function WorkbenchHeader({home, novelTitle, tab, busy, refreshing, onHome, onTab, onRefresh, onSettings, onAbout, showTabs=true}: Props) {
  return <header className="workbench-header workbench-navigation">
    <div className="navigation-origin"><button className="navigation-home" aria-label="作品首页" aria-current={home ? 'page' : undefined} disabled={busy} onClick={onHome}><Icon name="home"/><span>首页</span></button>
      {novelTitle && !home && <span className="navigation-book" title={novelTitle}>{novelTitle}</span>}
    </div>
    {novelTitle && !home && showTabs && <nav className="navigation-tabs" aria-label="小说功能">{[['story', '创作'], ['chapters', '正文'], ['plan', '规划'], ['memory', '设定']].map(([id, name]) => <button key={id} disabled={busy} className={tab === id ? 'selected' : ''} aria-pressed={tab === id} onClick={() => onTab(id)}>{name}</button>)}</nav>}
    <div className="navigation-actions"><button className={`navigation-action ${refreshing ? 'is-refreshing' : ''}`} aria-label="刷新当前页面" aria-busy={refreshing} title="刷新数据，保留草稿与当前视野" disabled={busy || refreshing} onClick={onRefresh}><Icon name="refresh"/><span>刷新</span></button>
      <button className="navigation-action" aria-label="设置" onClick={onSettings}><Icon name="settings"/><span>设置</span></button>
      <button className="navigation-action navigation-about" aria-label="关于催更姬" title="关于催更姬 · 交流与支持" onClick={onAbout}><Icon name="about"/><span>关于</span></button>
    </div>
  </header>;
}

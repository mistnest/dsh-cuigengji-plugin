import React, {useLayoutEffect, useRef, useState} from 'react';
import {usePreference} from './state.js';
import {OverviewPage} from './detail-page.tsx';
import {Icon} from './icons.tsx';

interface Props {
  scopeKey: string; title: string; count: number; sidebar: React.ReactNode;
  tools: React.ReactNode; children: React.ReactNode; detail?: React.ReactNode;
  className?: string;
  detailMode?: 'auto' | 'full';
  search?:{label:string;value:string;change:(value:string)=>void};
}

/** Only layout is shared. Each feature owns its queries, drafts and commands. */
export function OrganizedWorkspace({scopeKey, title, count, sidebar, tools, children, detail, className = '', detailMode='auto',search}: Props) {
  const root = useRef<HTMLDivElement>(null), toggle = useRef<HTMLButtonElement>(null);
  const searchInput=useRef<HTMLInputElement>(null);
  const side = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0), [expanded, setExpanded] = useState(false);
  const [choice, setChoice] = usePreference(`${scopeKey}:sidebar`, 'auto') as [string, (v: string) => void];
  useLayoutEffect(() => {
    const element = root.current!;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    setWidth(element.clientWidth); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const hasSidebar = Boolean(sidebar);
  const narrow = width < 560, open = hasSidebar && (choice === 'open' || choice === 'auto' && !narrow);
  const fullDetail = Boolean(detail) && (detailMode==='full' || width < 1060 || expanded);
  const closeSidebar = () => {setChoice('closed'); toggle.current?.focus({preventScroll: true});};
  useLayoutEffect(()=>{if(narrow&&detail)setChoice('closed');},[narrow,Boolean(detail)]);
  useLayoutEffect(()=>{if(open&&narrow&&!fullDetail)side.current?.querySelector<HTMLElement>('button')?.focus({preventScroll:true});},[open,narrow,fullDetail]);
  return <div ref={root} className={`organized-workspace ${className}`} data-sidebar={open ? 'open' : 'closed'} data-narrow={narrow} data-detail={detail ? fullDetail ? 'full' : 'side' : 'none'}>
    <header className="workspace-toolbar">
      {hasSidebar && <button ref={toggle} className="workspace-sidebar-toggle" aria-label={open ? '收起组织侧栏' : '显示组织侧栏'} aria-expanded={open} onClick={() => setChoice(open ? 'closed' : 'open')}><Icon name="sidebar"/></button>}
      <div className="workspace-heading"><strong title={title}>{title}</strong><small>{count}</small></div>
      <div className="workspace-tools">{search&&<button className="workspace-search-toggle" aria-label={search.label} title={search.label} onClick={()=>{setChoice('open');requestAnimationFrame(()=>searchInput.current?.focus({preventScroll:true}));}}><Icon name="search"/></button>}{tools}</div>
    </header>
    <div className="workspace-layout">
      {narrow && open && !fullDetail && <button className="workspace-sidebar-scrim" aria-label="关闭组织侧栏" onClick={closeSidebar}/>}
      <aside ref={side} className="workspace-sidebar" aria-label="内容组织" role={narrow?'dialog':undefined} aria-modal={narrow&&open||undefined} hidden={!open} onKeyDown={event=>{
        if(!narrow)return;
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeSidebar();}
        if(event.key==='Tab'){const controls=Array.from(side.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,summary')).filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
      }}>
        <div className="workspace-sidebar-heading"><span>目录</span><button aria-label="关闭组织侧栏" onClick={closeSidebar}>×</button></div>
        {search&&<div className="workspace-directory-search"><Icon name="search"/><input ref={searchInput} aria-label={search.label} placeholder="搜索标题、摘要" value={search.value} onChange={event=>search.change(event.target.value)}/>{search.value&&<button aria-label="清除目录搜索" onClick={()=>{search.change('');searchInput.current?.focus();}}>×</button>}</div>}
        <div className="workspace-sidebar-scroll" onClick={event => {if (narrow && (event.target as HTMLElement).closest('[data-workspace-entry="true"]')) closeSidebar();}}>{sidebar}</div>
      </aside>
      <div className="workspace-stage">
        <OverviewPage active={!fullDetail}>{children}</OverviewPage>
        {detail && <aside className="workspace-detail" aria-label="条目详情面板">
          {width >= 1060 && <button className="workspace-detail-size" aria-label={expanded ? '收起详情' : '展开详情'} onClick={() => setExpanded(v => !v)}><Icon name={expanded ? 'collapse' : 'expand'}/></button>}
          {detail}
        </aside>}
      </div>
    </div>
  </div>;
}

export function SidebarSection({title, hint, action, children}: {title: string; hint?:string; action?: React.ReactNode; children: React.ReactNode}) {
  return <section className="workspace-sidebar-section"><header><h3 title={hint}>{title}</h3>{action}</header>{children}</section>;
}

export function WorkspaceFilterNotice({text,clear}:{text:string;clear:()=>void}) {
  return text?<div className="workspace-filter-notice"><span title={text}>当前范围 · {text}</span><button onClick={clear}>显示全部</button></div>:null;
}

export function SidebarChoice({label, selected, count, choose, ariaLabel, value}: {label: string; selected: boolean; count?: number; choose: () => void; ariaLabel?: string; value?: string}) {
  return <button className="workspace-choice" data-workspace-filter="true" data-choice={value} aria-label={ariaLabel} aria-pressed={selected} onClick={choose}><span title={label}>{label}</span>{count !== undefined && <small>{count}</small>}</button>;
}

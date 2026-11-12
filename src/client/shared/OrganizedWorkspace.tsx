import React, {useLayoutEffect, useRef, useState} from 'react';
import {usePreference} from './state.js';
import {OverviewPage} from './detail-page.tsx';
import {Icon} from './icons.tsx';
import {panelGeometry,panelMinimum,resizePanel,type PanelWidths,type PanelSide} from './workspace-panels.ts';

interface Props {
  scopeKey: string; title: string; count: number; sidebar: React.ReactNode;
  tools: React.ReactNode; children: React.ReactNode; detail?: React.ReactNode;
  className?: string;
  search?:{label:string;value:string;change:(value:string)=>void};
}

/** Only layout is shared. Each feature owns its queries, drafts and commands. */
export function OrganizedWorkspace({scopeKey, title, count, sidebar, tools, children, detail, className = '',search}: Props) {
  const root = useRef<HTMLDivElement>(null), toggle = useRef<HTMLButtonElement>(null);
  const searchInput=useRef<HTMLInputElement>(null);
  const side = useRef<HTMLElement>(null);
  const [width, setWidth] = useState(0);
  const [choice, setChoice] = usePreference(`${scopeKey}:sidebar`, 'auto') as [string, (v: string) => void];
  const [stored,setStored]=usePreference(`${scopeKey}:panels`,{directory:232,detail:420,split:null}) as [PanelWidths,(v:PanelWidths)=>void];
  const drag=useRef<{pointer:number;start:number;width:number;side:PanelSide}|null>(null);
  useLayoutEffect(() => {
    const element = root.current!;
    const observer = new ResizeObserver(() => setWidth(element.clientWidth));
    setWidth(element.clientWidth); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const hasSidebar = Boolean(sidebar);
  const narrow = width < 560;
  // Temporarily hide the directory in a narrow inspector without overwriting
  // the author's saved open/closed preference.
  const open = hasSidebar && !(narrow&&detail) && (choice === 'open' || choice === 'auto' && !narrow);
  const geometry=panelGeometry(width,open,Boolean(detail),stored);
  const live=useRef(geometry);live.current=geometry;
  const resize=(side:PanelSide,target:number)=>{
    const next=resizePanel(live.current,side,target);
    // Preserve the hidden panel's requested width for when it is opened again.
    if(!open)next.directory=stored.directory;
    if(!detail)next.detail=stored.detail;
    setStored(next);
  };
  const grip=(side:PanelSide)=><div className={`workspace-panel-grip grip-${side}`} role="separator" tabIndex={0} aria-orientation="vertical" aria-label={side==='directory'?'调整目录宽度':'调整详情宽度'} aria-valuemin={Math.min(width,panelMinimum[side])} aria-valuemax={Math.max(Math.min(width,panelMinimum[side]),width-(geometry.both?panelMinimum[side==='directory'?'detail':'directory']:0))} aria-valuenow={Math.round(geometry[side])}
    onPointerDown={event=>{if(event.button!==0)return;event.preventDefault();event.currentTarget.focus({preventScroll:true});event.currentTarget.setPointerCapture(event.pointerId);drag.current={pointer:event.pointerId,start:event.clientX,width:live.current[side],side};}}
    onPointerMove={event=>{const gesture=drag.current;if(gesture?.pointer===event.pointerId)resize(side,gesture.width+(event.clientX-gesture.start)*(side==='directory'?1:-1));}}
    onPointerUp={event=>{if(drag.current?.pointer===event.pointerId){drag.current=null;event.currentTarget.releasePointerCapture(event.pointerId);}}}
    onLostPointerCapture={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}
    onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const step=event.shiftKey?40:12;resize(side,event.key==='Home'?panelMinimum[side]:event.key==='End'?width:live.current[side]+(event.key==='ArrowRight'?step:-step)*(side==='directory'?1:-1));}}/>;
  const closeSidebar = () => {setChoice('closed'); toggle.current?.focus({preventScroll: true});};
  useLayoutEffect(()=>{if(open&&narrow)side.current?.querySelector<HTMLElement>('button')?.focus({preventScroll:true});},[open,narrow]);
  return <div ref={root} className={`organized-workspace ${className}`} style={{'--workspace-directory':`${geometry.directory}px`,'--workspace-inspector':`${geometry.detail}px`} as React.CSSProperties} data-sidebar={open ? 'open' : 'closed'} data-narrow={narrow} data-detail={detail ? 'side' : 'none'} data-joined={geometry.joined} data-canvas-space={geometry.room-geometry.directory-geometry.detail<120?'none':geometry.room-geometry.directory-geometry.detail<350?'small':'open'}>
    <header className="workspace-toolbar">
      {hasSidebar && <button ref={toggle} className="workspace-sidebar-toggle" aria-label={open ? '收起组织侧栏' : '显示组织侧栏'} aria-expanded={open} onClick={() => setChoice(open ? 'closed' : 'open')}><Icon name="sidebar"/></button>}
      <div className="workspace-heading"><strong title={title}>{title}</strong><small>{count}</small></div>
      <div className="workspace-tools">{search&&<button className="workspace-search-toggle" aria-label={search.label} title={search.label} onClick={()=>{setChoice('open');requestAnimationFrame(()=>searchInput.current?.focus({preventScroll:true}));}}><Icon name="search"/></button>}{tools}</div>
    </header>
    <div className="workspace-layout">
      <div className="workspace-stage"><OverviewPage active>{children}</OverviewPage></div>
      {narrow && open && <button className="workspace-sidebar-scrim" aria-label="关闭组织侧栏" onClick={closeSidebar}/>}
      <aside ref={side} style={{width:geometry.directory}} className="workspace-sidebar" aria-label="内容组织" role={narrow?'dialog':undefined} aria-modal={narrow&&open||undefined} hidden={!open} onKeyDown={event=>{
        if(!narrow)return;
        if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeSidebar();}
        if(event.key==='Tab'){const controls=Array.from(side.current!.querySelectorAll<HTMLElement>('button:not(:disabled),input,select,summary')).filter(el=>el.getClientRects().length);const first=controls[0],last=controls.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}}
      }}>
        <div className="workspace-sidebar-heading"><span>目录</span><button aria-label="关闭组织侧栏" onClick={closeSidebar}>×</button></div>
        {search&&<div className="workspace-directory-search"><Icon name="search"/><input ref={searchInput} aria-label={search.label} placeholder="搜索标题、摘要" value={search.value} onChange={event=>search.change(event.target.value)}/>{search.value&&<button aria-label="清除目录搜索" onClick={()=>{search.change('');searchInput.current?.focus();}}>×</button>}</div>}
        <div className="workspace-sidebar-scroll" onClick={event => {if (narrow && (event.target as HTMLElement).closest('[data-workspace-entry="true"]')) closeSidebar();}}>{sidebar}</div>
        {grip('directory')}
      </aside>
      {detail && <aside style={{width:geometry.detail}} className="workspace-detail" aria-label="条目详情面板">{grip('detail')}{detail}</aside>}
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

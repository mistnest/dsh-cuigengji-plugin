import React,{useEffect,useRef} from 'react';
import {useSurfaceActivity} from './surface-activity.ts';
export function Modal({title, close, children, className = ''}: {title: string; close: () => void; children: React.ReactNode; className?: string}) {
  const ref = useRef<HTMLDialogElement>(null);
  const active=useSurfaceActivity();
  useEffect(() => {const previous = document.activeElement as HTMLElement | null; return () => {ref.current?.close();if(previous?.isConnected)previous.focus({preventScroll:true});};}, []);
  useEffect(()=>{const dialog=ref.current;if(active&&!dialog?.open)dialog?.showModal();else if(!active)dialog?.close();},[active]);
  return <dialog className={`utility-modal ${className}`} ref={ref} aria-label={title} data-no-drag="true" onKeyDown={e=>e.stopPropagation()} onPointerDown={e=>e.stopPropagation()} onClick={e=>e.stopPropagation()} onContextMenu={e=>e.stopPropagation()} onCancel={e => {e.preventDefault();close();}}>
    <header className="utility-head"><h2>{title}</h2><button type="button" aria-label={`关闭${title}`} onClick={close}>×</button></header>
    <div className="utility-content">{children}</div>
  </dialog>;
}

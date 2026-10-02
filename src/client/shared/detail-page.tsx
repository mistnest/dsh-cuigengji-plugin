import React, {createContext, useContext, useLayoutEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';

/** Keep the overview mounted for canvas state, but remove it from layout and focus. */
export function OverviewPage({active, children}: {active:boolean; children:React.ReactNode}) {
  const root = useRef<HTMLDivElement>(null);
  const positions = useRef(new Map<HTMLElement, {top:number; left:number}>());
  const focus = useRef<HTMLElement | null>(null);
  const wasActive = useRef(active);
  useLayoutEffect(() => {
    if (active && !wasActive.current) {
      positions.current.forEach((position, element) => {
        if (root.current?.contains(element)) element.scrollTo(position.left, position.top);
        else positions.current.delete(element);
      });
      if (focus.current && root.current?.contains(focus.current)) focus.current.focus({preventScroll:true});
    }
    wasActive.current = active;
  }, [active]);
  return <div ref={root} className="overview-page" hidden={!active}
    onFocusCapture={event => {focus.current = event.target as HTMLElement;}}
    onScrollCapture={event => {
      if (!active) return;
      const element = event.target as HTMLElement;
      positions.current.set(element, {top:element.scrollTop, left:element.scrollLeft});
    }}>{children}</div>;
}

/** Related entries form a back trail; the last entry remains highlighted in overview. */
export function useDetailTrail(current:string | null) {
  const [trail, setTrail] = useState<string[]>([]);
  const [lastOpened, setLastOpened] = useState(current);
  return {
    previous: trail.at(-1), lastOpened,
    visit(id:string) {
      if (current && current !== id) setTrail(items => [...items, current]);
      setLastOpened(id);
    },
    back(id:string) {setTrail(items => items.slice(0, -1)); setLastOpened(id);},
    clear() {setTrail([]);},
  };
}

const ActionSlot = createContext<HTMLDivElement | null>(null);
export function DetailActions({children}: {children:React.ReactNode}) {
  const slot = useContext(ActionSlot);
  return slot ? createPortal(children, slot) : null;
}

/** Navigation and edit controls stay outside the single scrolling document. */
export function DetailPage({className, backLabel, onBack, children}: {
  className:string; backLabel:string; onBack:()=>void; children:React.ReactNode;
}) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const back = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {back.current?.focus({preventScroll:true});}, []);
  return <section className={`detail-page ${className}`} aria-label="条目详情">
    <header className="detail-bar"><button ref={back} className="detail-back" onClick={onBack}>{backLabel}</button><div className="detail-actions" ref={setSlot}/></header>
    <div className="detail-scroll"><div className="detail-document"><ActionSlot.Provider value={slot}>{children}</ActionSlot.Provider></div></div>
  </section>;
}

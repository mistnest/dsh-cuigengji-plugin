import {useLayoutEffect,useRef,type PointerEvent} from 'react';

export type SearchPosition={x:number;y:number};
/** The parent is a viewport-sized portal, independent of the sidebar width. */
export function useFloatingSearch(position:SearchPosition|null,change:(position:SearchPosition)=>void,active=true) {
  const ref=useRef<HTMLElement>(null),current=useRef({position,change});current.current={position,change};
  const drag=useRef<{id:number;x:number;y:number;left:number;top:number}|null>(null);
  const clamp=(x:number,y:number)=>{
    const element=ref.current,parent=element?.parentElement;
    if(!element||!parent)return {x,y};
    return {x:Math.max(8,Math.min(x,parent.clientWidth-element.offsetWidth-8)),y:Math.max(8,Math.min(y,parent.clientHeight-element.offsetHeight-8))};
  };
  useLayoutEffect(()=>{
    if(!active)return;
    const element=ref.current,parent=element?.parentElement;
    if(!element||!parent)return;
    const fit=()=>{
      const pos=current.current.position||{x:parent.clientWidth-element.offsetWidth-16,y:56};
      const next=clamp(pos.x,pos.y);
      if(!current.current.position||next.x!==pos.x||next.y!==pos.y)current.current.change(next);
    };
    const observer=new ResizeObserver(fit);observer.observe(parent);observer.observe(element);fit();
    return()=>observer.disconnect();
  },[active]);
  const onPointerDown=(event:PointerEvent<HTMLElement>)=>{
    if(event.button!==0||(event.target as HTMLElement).closest('button,input,select'))return;
    const element=ref.current;if(!element)return;
    event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);
    drag.current={id:event.pointerId,x:event.clientX,y:event.clientY,left:element.offsetLeft,top:element.offsetTop};
  };
  const onPointerMove=(event:PointerEvent<HTMLElement>)=>{
    const start=drag.current;if(!start||start.id!==event.pointerId)return;
    current.current.change(clamp(start.left+event.clientX-start.x,start.top+event.clientY-start.y));
  };
  const end=(event:PointerEvent<HTMLElement>)=>{if(drag.current?.id===event.pointerId){drag.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);}};
  return {ref,style:position?{left:position.x,top:position.y,right:'auto' as const}:undefined,handle:{onPointerDown,onPointerMove,onPointerUp:end,onPointerCancel:end,onLostPointerCapture:()=>{drag.current=null;}}};
}

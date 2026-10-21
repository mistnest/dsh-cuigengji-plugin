import {useLayoutEffect,useRef} from 'react';
import type {RefObject} from 'react';
import type {Point} from '../../contracts/planning.ts';

/** Reveal the measured editor after canvas/inspector resize has settled.
 * A guessed height leaves the footer clipped when continuing from details. */
export function useCanvasPanel(ref:RefObject<HTMLElement|null>,point:Point,ensureVisible?:(point:Point,width:number,height:number)=>void) {
  const reveal=useRef(ensureVisible);reveal.current=ensureVisible;
  useLayoutEffect(()=>{
    const panel=ref.current,viewport=panel?.closest('.planning-canvas-scroll');
    if(!panel||!viewport)return;
    let frame=0;
    const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>reveal.current?.(point,panel.offsetWidth,panel.offsetHeight));};
    const observer=new ResizeObserver(update);observer.observe(panel);observer.observe(viewport);update();
    return()=>{observer.disconnect();cancelAnimationFrame(frame);};
  },[ref,point.x,point.y]);
}

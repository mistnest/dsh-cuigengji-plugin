import { useEffect, useRef, useState } from 'react';
import type React from 'react';
import type {CompanionSettings} from '../../../contracts/usage.ts';

export interface PetPosition { right: number; bottom: number }
export interface Viewport { width: number; height: number; left: number; top: number; right: number; bottom: number }
export const PET_SIZE = 112;
const MARGIN = 8;
const POSITION_KEY = 'cuigengji:pet:position:v2';
const RESET = 'cuigengji:pet:reset-position';
const initialPosition: PetPosition = { right: 18, bottom: 22 };
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(Math.max(min, max), value));
function viewport(): Viewport {
  const view = window.visualViewport;
  const width = window.innerWidth, height = window.innerHeight;
  const left = view?.offsetLeft || 0, top = view?.offsetTop || 0;
  return { width, height, left, top, right: left + (view?.width || width), bottom: top + (view?.height || height) };
}
export function clampPetPosition(position: PetPosition, view: Viewport,scale=1): PetPosition {
  const extra=PET_SIZE*(scale-1)/2,size=PET_SIZE*scale;
  return {
    right: clamp(position.right, view.width - view.right + MARGIN+extra, view.width - view.left - PET_SIZE - MARGIN-extra),
    bottom: clamp(position.bottom, view.height - view.bottom + MARGIN, view.height - view.top - size - MARGIN),
  };
}
function readPosition(): PetPosition {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(POSITION_KEY) || 'null');
    if (value && typeof value === 'object') {
      const { right, bottom } = value as PetPosition;
      if (Number.isFinite(right) && Number.isFinite(bottom)) return clampPetPosition({ right, bottom }, viewport());
    }
  } catch { /* corrupt or unavailable storage uses a visible default */ }
  return clampPetPosition(initialPosition, viewport());
}
function persist(position: PetPosition) { try { localStorage.setItem(POSITION_KEY, JSON.stringify(position)); } catch { /* current window still works */ } }
export function resetPetPosition() {
  persist(initialPosition);
  window.dispatchEvent(new Event(RESET));
}
export function usePetViewport(): Viewport {
  const [value, setValue] = useState(viewport);
  useEffect(() => {
    const update = () => setValue(previous => { const next = viewport(); return Object.keys(next).every(key => next[key as keyof Viewport] === previous[key as keyof Viewport]) ? previous : next; });
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => { window.removeEventListener('resize', update); window.visualViewport?.removeEventListener('resize', update); window.visualViewport?.removeEventListener('scroll', update); };
  }, []);
  return value;
}

/** Anchor bubbles to the character, then fit them to the *visible* viewport.
 * ResizeObserver supplies their actual height (including errors/menu items). */
export function petBubbleRect(position: PetPosition, view: Viewport, measuredHeight: number,scale=1) {
  const width = Math.min(340, Math.max(0, view.right - view.left - 2 * MARGIN));
  const height = Math.min(measuredHeight, Math.max(0, view.bottom - view.top - 2 * MARGIN));
  const x = view.width - position.right - PET_SIZE, y = view.height - position.bottom - PET_SIZE*scale;
  let side: 'left' | 'right' | 'above' | 'below' = 'above';
  let left = x + PET_SIZE / 2 - width / 2, top = y - height - 10;
  if (x - width - 10 >= view.left + MARGIN) { side = 'left'; left = x - width - 10; top = y + PET_SIZE - height; }
  else if (x + PET_SIZE + width + 10 <= view.right - MARGIN) { side = 'right'; left = x + PET_SIZE + 10; top = y + PET_SIZE - height; }
  else if (top < view.top + MARGIN && y + PET_SIZE + 10 + height <= view.bottom - MARGIN) { side = 'below'; top = y + PET_SIZE + 10; }
  return { left: clamp(left, view.left + MARGIN, view.right - width - MARGIN), top: clamp(top, view.top + MARGIN, view.bottom - height - MARGIN), width, maxHeight: view.bottom - view.top - 2 * MARGIN, side };
}

export function usePetDrag(view: Viewport,snap:CompanionSettings['snap']='none',scale=1,zones?:CompanionSettings['snapZones']) {
  const [position, setPosition] = useState(readPosition);
  const [dragging, setDragging] = useState(false);
  const positionRef = useRef(position);
  const viewRef = useRef(view); viewRef.current = view;
  const stop = useRef<(() => void) | null>(null);
  const snapRef=useRef(snap);snapRef.current=snap;
  const scaleRef=useRef(scale);scaleRef.current=scale;
  const zonesRef=useRef(zones);zonesRef.current=zones;
  const suppressClick = useRef(false);
  const update = (next: PetPosition) => { positionRef.current = next; setPosition(next); };
  useEffect(() => {
    const next = clampPetPosition(positionRef.current, view,scale);
    if (next.right !== positionRef.current.right || next.bottom !== positionRef.current.bottom) { stop.current?.(); update(next); persist(next); }
  }, [view,scale]);
  useEffect(() => {
    const reset = () => { stop.current?.(); const next = clampPetPosition(initialPosition, viewRef.current,scaleRef.current); update(next); persist(next); };
    window.addEventListener(RESET, reset);
    return () => { stop.current?.(); window.removeEventListener(RESET, reset); };
  }, []);
  const onPointerDown: React.PointerEventHandler<HTMLButtonElement> = event => {
    if (event.button !== 0 || event.isPrimary === false || stop.current) return;
    const target = event.currentTarget, pointerId = event.pointerId;
    const origin = { ...positionRef.current, x: event.clientX, y: event.clientY };
    let moved = false, ended = false;
    suppressClick.current = false;
    target.focus({ preventScroll: true });
    const move = (next: PointerEvent) => {
      if (next.pointerId !== pointerId) return;
      const dx = next.clientX - origin.x, dy = next.clientY - origin.y;
      if (!moved && Math.hypot(dx, dy) < 5) return;
      moved = true;
      suppressClick.current = true;
      setDragging(true);
      // Always use the unchanged origin; accumulating this delta makes the pet
      // accelerate away from the cursor after the second pointermove.
      update(clampPetPosition({ right: origin.right - dx, bottom: origin.bottom - dy }, viewRef.current,scaleRef.current));
    };
    const finish = (next?: PointerEvent) => {
      if (ended || next && next.pointerId !== pointerId) return;
      ended = true;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', finish);
      window.removeEventListener('pointercancel', finish);
      window.removeEventListener('blur', blur);
      target.removeEventListener('lostpointercapture', finish);
      stop.current = null;
      if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
      if (moved){
        if(snapRef.current!=='none'){
          const v=viewRef.current,p=positionRef.current,s=scaleRef.current,left=clampPetPosition({right:Infinity,bottom:p.bottom},v,s).right,right=clampPetPosition({right:-Infinity,bottom:p.bottom},v,s).right,top=clampPetPosition({right:p.right,bottom:Infinity},v,s).bottom,bottom=clampPetPosition({right:p.right,bottom:-Infinity},v,s).bottom;
          let result={...p};if(snapRef.current==='corners')result={right:Math.abs(p.right-left)<Math.abs(p.right-right)?left:right,bottom:Math.abs(p.bottom-top)<Math.abs(p.bottom-bottom)?top:bottom};
          else if(snapRef.current==='custom'){
            const z=zonesRef.current||{unit:'percent',left:12,right:12,top:0,bottom:12},limit=(side:'left'|'right'|'top'|'bottom')=>z[side]*(z.unit==='percent'?(['left','right'].includes(side)?v.right-v.left:v.bottom-v.top)/100:1);
            if(z.left>0&&Math.abs(p.right-left)<=limit('left'))result.right=left;else if(z.right>0&&Math.abs(p.right-right)<=limit('right'))result.right=right;
            if(z.top>0&&Math.abs(p.bottom-top)<=limit('top'))result.bottom=top;else if(z.bottom>0&&Math.abs(p.bottom-bottom)<=limit('bottom'))result.bottom=bottom;
          }else{const options=[{...p,right:left},{...p,right},{...p,bottom:top},{...p,bottom}];result=options.sort((a,b)=>Math.hypot(a.right-p.right,a.bottom-p.bottom)-Math.hypot(b.right-p.right,b.bottom-p.bottom))[0];}update(result);
        }persist(positionRef.current);
      }
      setDragging(false);
    };
    const blur = () => finish();
    stop.current = finish;
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', finish);
    window.addEventListener('pointercancel', finish);
    window.addEventListener('blur', blur);
    target.addEventListener('lostpointercapture', finish);
    try { target.setPointerCapture(pointerId); } catch { /* synthetic events and old WebViews use the window listeners */ }
  };
  const acceptClick = (event: React.MouseEvent) => {
    if (event.detail !== 0 && suppressClick.current) { suppressClick.current = false; event.preventDefault(); event.stopPropagation(); return false; }
    return true;
  };
  return { position: clampPetPosition(position, view,scale), dragging, onPointerDown, acceptClick };
}

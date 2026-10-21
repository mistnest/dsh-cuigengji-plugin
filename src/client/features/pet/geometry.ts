import { useEffect, useRef, useState } from 'react';
import type React from 'react';

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
export function clampPetPosition(position: PetPosition, view: Viewport): PetPosition {
  return {
    right: clamp(position.right, view.width - view.right + MARGIN, view.width - view.left - PET_SIZE - MARGIN),
    bottom: clamp(position.bottom, view.height - view.bottom + MARGIN, view.height - view.top - PET_SIZE - MARGIN),
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
export function petBubbleRect(position: PetPosition, view: Viewport, measuredHeight: number) {
  const width = Math.min(280, Math.max(0, view.right - view.left - 2 * MARGIN));
  const height = Math.min(measuredHeight, Math.max(0, view.bottom - view.top - 2 * MARGIN));
  const x = view.width - position.right - PET_SIZE, y = view.height - position.bottom - PET_SIZE;
  let side: 'left' | 'right' | 'above' | 'below' = 'above';
  let left = x + PET_SIZE / 2 - width / 2, top = y - height - 10;
  if (x - width - 10 >= view.left + MARGIN) { side = 'left'; left = x - width - 10; top = y + PET_SIZE - height; }
  else if (x + PET_SIZE + width + 10 <= view.right - MARGIN) { side = 'right'; left = x + PET_SIZE + 10; top = y + PET_SIZE - height; }
  else if (top < view.top + MARGIN && y + PET_SIZE + 10 + height <= view.bottom - MARGIN) { side = 'below'; top = y + PET_SIZE + 10; }
  return { left: clamp(left, view.left + MARGIN, view.right - width - MARGIN), top: clamp(top, view.top + MARGIN, view.bottom - height - MARGIN), width, maxHeight: view.bottom - view.top - 2 * MARGIN, side };
}

export function usePetDrag(view: Viewport) {
  const [position, setPosition] = useState(readPosition);
  const [dragging, setDragging] = useState(false);
  const positionRef = useRef(position);
  const viewRef = useRef(view); viewRef.current = view;
  const stop = useRef<(() => void) | null>(null);
  const suppressClick = useRef(false);
  const update = (next: PetPosition) => { positionRef.current = next; setPosition(next); };
  useEffect(() => {
    const next = clampPetPosition(positionRef.current, view);
    if (next.right !== positionRef.current.right || next.bottom !== positionRef.current.bottom) { stop.current?.(); update(next); persist(next); }
  }, [view]);
  useEffect(() => {
    const reset = () => { stop.current?.(); const next = clampPetPosition(initialPosition, viewRef.current); update(next); persist(next); };
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
      update(clampPetPosition({ right: origin.right - dx, bottom: origin.bottom - dy }, viewRef.current));
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
      if (moved) persist(positionRef.current);
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
  return { position: clampPetPosition(position, view), dragging, onPointerDown, acceptClick };
}

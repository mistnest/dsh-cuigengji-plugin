import {useEffect, useRef, useState, type PointerEvent, type KeyboardEvent} from 'react';
import {directorySnapshot, planChapterMove, type ChapterPlacement, type ChapterDestination, type DirectorySnapshot, type VolumePlacement} from '../../../domain/chapters/order.ts';

interface ChapterItem extends ChapterPlacement { title: string; revision: number; textCount?: number }
interface Options {
  chapters: ChapterItem[]; volumes: VolumePlacement[]; novelId: string; busy: boolean;
  descending?: boolean;
  call: (action: string, args: Record<string, unknown>) => Promise<any>;
  onMoved: (volumeId: string | null) => void;
}
type DropIndicator = {kind:'row';chapterId:string;edge:'before'|'after'} | {kind:'group';volumeId:string|null;edge:'start'|'end'};
interface Gesture {
  pointerId: number; element: HTMLElement; source: ChapterItem; active: boolean;
  startX: number; startY: number; x: number; y: number;
  chapters: ChapterItem[]; volumes: VolumePlacement[]; snapshot: DirectorySnapshot;
  descending: boolean; target: ChapterDestination | null; indicator: DropIndicator | null;
}
interface DragView { source: ChapterItem; x: number; y: number; target: ChapterDestination | null; indicator: DropIndicator | null }
const includeDeleted = (original: ChapterItem[], live: ChapterItem[]) => [...live, ...original.filter(chapter => chapter.deleted)].sort((a, b) => a.order - b.order);

/** Pointer gestures keep native scrolling/clicking; only a real drag writes a placement. */
export function useChapterReorder(options: Options) {
  const directoryRef = useRef<HTMLElement>(null), gesture = useRef<Gesture | null>(null), frame = useRef(0);
  const suppressClick = useRef(false), savingRef = useRef(false);
  const [overlay, setOverlay] = useState<{source: ChapterItem[]; chapters: ChapterItem[]} | null>(null);
  const [drag, setDrag] = useState<DragView | null>(null), [saving, setSaving] = useState(false), [error, setError] = useState('');
  const chapters = overlay?.chapters || options.chapters;
  const latest = useRef({...options, visibleChapters: chapters}); latest.current = {...options, visibleChapters: chapters};
  useEffect(() => {if (!savingRef.current && overlay && overlay.source !== options.chapters) setOverlay(null);}, [options.chapters, overlay]);

  const clearGesture = () => {
    const current = gesture.current; gesture.current = null;
    cancelAnimationFrame(frame.current); setDrag(null);
    if (current?.element.hasPointerCapture(current.pointerId)) current.element.releasePointerCapture(current.pointerId);
  };
  useEffect(() => {
    let clickTimer: ReturnType<typeof setTimeout>;
    // Cross-volume drops remount the source row, so the browser may emit no
    // click to consume. Suppress only this gesture's click, never the next one.
    const releaseClick = () => {clearTimeout(clickTimer); clickTimer = setTimeout(() => {suppressClick.current = false;}, 0);};
    const escape = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape' || !gesture.current) return;
      if (gesture.current.active) {event.preventDefault(); event.stopPropagation();}
      clearGesture();
    };
    const cancel = () => clearGesture();
    window.addEventListener('keydown', escape, true); window.addEventListener('blur', cancel);
    window.addEventListener('pointerup', releaseClick); window.addEventListener('pointercancel', releaseClick);
    return () => {window.removeEventListener('keydown', escape, true); window.removeEventListener('blur', cancel); window.removeEventListener('pointerup', releaseClick); window.removeEventListener('pointercancel', releaseClick); clearTimeout(clickTimer); cancelAnimationFrame(frame.current); gesture.current = null;};
  }, []);
  useEffect(() => {if (options.busy) clearGesture();}, [options.busy]);
  useEffect(() => {if (gesture.current && gesture.current.descending !== !!options.descending) clearGesture();}, [options.descending]);

  const locate = (current: Gesture): ChapterDestination | null => {
    current.indicator = null;
    const directory = directoryRef.current, hit = document.elementFromPoint(current.x, current.y);
    if (!directory || !hit || !directory.contains(hit)) return null;
    let section = hit.closest<HTMLElement>('[data-chapter-volume]'), trailing = false;
    // Edge scrolling can move the last row above the pointer between events.
    // Keep the trailing whitespace a stable end drop, except on footer controls.
    if (!section && !hit.closest('button,input,summary,.menu')) {
      const sections = Array.from(directory.querySelectorAll<HTMLElement>('[data-chapter-volume]'));
      const last = sections.filter(item => item.getBoundingClientRect().height > 0).at(-1);
      if (last && current.y >= last.getBoundingClientRect().bottom) {section = last; trailing = true;}
    }
    if (!section || hit.closest('.menu')) return null;
    const volumeId = section.dataset.chapterVolume || null;
    const row = hit.closest<HTMLElement>('[data-chapter-id]');
    const peers = current.chapters.filter(chapter => !chapter.deleted && chapter.id !== current.source.id && (chapter.volumeId || null) === volumeId).sort((a, b) => a.order - b.order);
    let beforeChapterId: string | null = null;
    let indicator: DropIndicator;
    if (row) {
      const target = current.chapters.find(chapter => chapter.id === row.dataset.chapterId);
      if (!target || target.deleted || target.id === current.source.id) return null;
      const box = row.getBoundingClientRect();
      const above = current.y < box.top + box.height / 2;
      // The storage API always means "before" in manuscript order. A reverse
      // directory flips that meaning, while the indicator follows the pointer.
      const before = current.descending ? !above : above;
      beforeChapterId = before ? target.id : peers[peers.findIndex(chapter => chapter.id === target.id) + 1]?.id || null;
      const atEnd = !above && (current.descending ? target.id === peers[0]?.id : beforeChapterId === null);
      indicator = atEnd ? {kind:'group',volumeId,edge:'end'} : {kind:'row',chapterId:target.id,edge:above?'before':'after'};
    } else {
      const rows = section.querySelectorAll<HTMLElement>('[data-chapter-id]');
      const last = rows.item(rows.length - 1);
      const atEnd = trailing || !!last && current.y >= last.getBoundingClientRect().bottom;
      beforeChapterId = current.descending && atEnd ? peers[0]?.id || null : null;
      indicator = {kind:'group',volumeId,edge:current.descending && !atEnd?'start':'end'};
    }
    const destination = {volumeId, beforeChapterId};
    if (!planChapterMove(current.chapters, current.volumes, current.source.id, destination).changed) return null;
    current.indicator = indicator;
    return destination;
  };
  const showDrag = (current: Gesture) => {
    current.target = locate(current);
    setDrag({source: current.source, x: current.x, y: current.y, target: current.target, indicator: current.indicator});
  };
  const autoScroll = () => {
    const current = gesture.current, directory = directoryRef.current;
    if (!current?.active || !directory) return;
    const box = directory.getBoundingClientRect();
    if (current.x >= box.left && current.x <= box.right && current.y >= box.top && current.y <= box.bottom) {
      const edge = 44, offset = current.y - box.top, remaining = box.bottom - current.y;
      const speed = offset < edge ? -14 * (1 - offset / edge) : remaining < edge ? 14 * (1 - remaining / edge) : 0;
      const before = directory.scrollTop; directory.scrollTop += speed;
      if (directory.scrollTop !== before) showDrag(current);
    }
    frame.current = requestAnimationFrame(autoScroll);
  };
  const persist = async (current: Pick<Gesture, 'source' | 'chapters' | 'volumes' | 'snapshot'>, destination: ChapterDestination) => {
    if (savingRef.current || latest.current.busy) return;
    const plan = planChapterMove(current.chapters, current.volumes, current.source.id, destination);
    if (!plan.changed) return;
    savingRef.current = true; setSaving(true); setError('');
    setOverlay({source: latest.current.chapters, chapters: includeDeleted(current.chapters, plan.chapters)});
    const {call, novelId} = latest.current;
    try {
      const result = await call('chapter.move', {novelId, chapterId: current.source.id, ...destination, expectedDirectory: current.snapshot, requestId: crypto.randomUUID()});
      setOverlay({source: latest.current.chapters, chapters: includeDeleted(latest.current.chapters, result.chapters)});
    } catch (failure: any) {
      // Re-read after a transport failure too: the atomic commit may have succeeded.
      const results = await Promise.allSettled([call('chapter.list', {novelId, includeDeleted: true}), call('volume.list', {novelId})]);
      const [chapterResult, volumeResult] = results;
      if (chapterResult.status === 'fulfilled' && volumeResult.status === 'fulfilled') {
        setOverlay({source: latest.current.chapters, chapters: chapterResult.value.filter((chapter: ChapterItem) => !chapter.deleted || latest.current.chapters.some(item => item.id === chapter.id))});
        const confirmed = JSON.stringify(directorySnapshot(chapterResult.value, volumeResult.value)) === JSON.stringify(directorySnapshot(plan.chapters, current.volumes));
        if (!confirmed) setError(failure?.code === 'CONFLICT' || /目录.*变化/.test(failure?.message || '') ? '目录已变化，已刷新。请重新拖动。' : '顺序未能保存，请重试。');
      } else {setOverlay(null); setError('无法确认目录顺序，请联网后重试。');}
    } finally {
      savingRef.current = false; setSaving(false); latest.current.onMoved(destination.volumeId);
    }
  };
  const rowProps = (chapter: ChapterItem) => ({
    'data-chapter-id': chapter.id,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      suppressClick.current = false;
      if (event.button !== 0 || !event.isPrimary || chapter.deleted || savingRef.current || latest.current.busy) return;
      if ((event.target as HTMLElement).closest('.chapter-row-action,input,textarea,select')) return;
      if (event.pointerType === 'touch' && !(event.target as HTMLElement).closest('.chapter-grip')) return;
      const {visibleChapters, volumes} = latest.current;
      gesture.current = {pointerId: event.pointerId, element: event.currentTarget, source: chapter, active: false, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, chapters: visibleChapters, volumes, snapshot: directorySnapshot(visibleChapters, volumes), descending: !!latest.current.descending, target: null, indicator: null};
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const current = gesture.current; if (!current || current.pointerId !== event.pointerId) return;
      current.x = event.clientX; current.y = event.clientY;
      if (!current.active && Math.hypot(current.x - current.startX, current.y - current.startY) < 6) return;
      event.preventDefault();
      if (!current.active) {current.active = true; suppressClick.current = true; frame.current = requestAnimationFrame(autoScroll);}
      showDrag(current);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => {
      const current = gesture.current; if (!current || current.pointerId !== event.pointerId) return;
      if (current.active) {current.x = event.clientX; current.y = event.clientY; current.target = locate(current); event.preventDefault();}
      clearGesture();
      if (current.active && current.target) void persist(current, current.target);
    },
    onPointerCancel: clearGesture,
    onLostPointerCapture: (event: PointerEvent<HTMLElement>) => {if (gesture.current?.pointerId === event.pointerId) clearGesture();},
    onDragStart: (event: React.DragEvent) => event.preventDefault(),
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (!event.altKey || !['ArrowUp', 'ArrowDown'].includes(event.key) || chapter.deleted) return;
      event.preventDefault();
      const {visibleChapters, volumes} = latest.current;
      const peers = visibleChapters.filter(item => !item.deleted && (item.volumeId || null) === (chapter.volumeId || null)).sort((a, b) => a.order - b.order);
      const index = peers.findIndex(item => item.id === chapter.id), up = (event.key === 'ArrowUp') !== !!latest.current.descending;
      if (up ? index <= 0 : index >= peers.length - 1) return;
      void persist({source: chapter, chapters: visibleChapters, volumes, snapshot: directorySnapshot(visibleChapters, volumes)}, {volumeId: chapter.volumeId || null, beforeChapterId: up ? peers[index - 1].id : peers[index + 2]?.id || null});
    },
  });
  const onClickCapture = (event: React.MouseEvent) => {if (suppressClick.current) {suppressClick.current = false; event.preventDefault(); event.stopPropagation();}};
  const onPointerDownCapture = () => {suppressClick.current = false;};
  return {chapters, directoryRef, drag, saving, error, rowProps, onClickCapture, onPointerDownCapture};
}

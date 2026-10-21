import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-store';
import bigfishPetPoses from '../../assets/pets/bigfish-pet-poses.png';
import cuigengjiPetPoses from '../../assets/pets/cuigengji-pet-poses.png';
import { petStyles } from './style.ts';
import { usePetActivity } from './activity.ts';
import { petBubbleRect, resetPetPosition, usePetDrag, usePetViewport } from './geometry.ts';
import { usePetPreferences, setPetRole, setPetVisible } from './preferences.ts';
import { usePetMood } from './mood.ts';
import { NativeCompanion } from './native.tsx';
import { dateLabel, emptyStats, formatCount, moodLabels, petMessage, roles, type PetMood, type PetRole, type PetRPC, type PetStatusSource } from './model.ts';
export type { PetRole } from './model.ts';
function PetAvatar({ role, mood, onClick, floating = false, ...props }: {
  role: PetRole; mood: PetMood; floating?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const asset = role === 'bigfish' ? bigfishPetPoses : cuigengjiPetPoses;
  return <button {...props} className={`pet-avatar pet-avatar-${role} pet-mood-${mood}`} type="button" onClick={onClick}
    aria-label={`${roles[role].name}，${moodLabels[mood]}，${floating ? '点击查看进度，拖动移动' : '点击打招呼'}`}
    title={floating ? '点击查看进度 · 拖动移动 · 右键更多操作' : '点一下和我打个招呼'}>
    <span className="pet-avatar-art" style={{ backgroundImage: `url(${asset})` }} aria-hidden="true" />
    {(mood === 'celebrate' || mood === 'reacting') && <span className="pet-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i></span>}
  </button>;
}

function Companion({ rpc, sessionId, openDetails, statusSource }: { rpc: PetRPC; sessionId?: string; openDetails: () => void; statusSource?: PetStatusSource }) {
  const { role, reduced } = usePetPreferences();
  const { result, loading, error, refresh } = usePetActivity(rpc, sessionId);
  const { mood, interact } = usePetMood(result, loading, error, sessionId, statusSource);
  const stats = result?.stats || emptyStats;
  const view = usePetViewport(), drag = usePetDrag(view);
  const [open, setOpen] = useState<'bubble' | 'menu' | null>(null);
  const [navigationError, setNavigationError] = useState('');
  const root = useRef<HTMLDivElement>(null), bubble = useRef<HTMLDivElement>(null), avatar = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(228);
  useLayoutEffect(() => {
    if (!bubble.current || !open) return;
    const element = bubble.current;
    const measure = () => setHeight(element.scrollHeight + 2);
    const observer = new ResizeObserver(measure); observer.observe(element); measure();
    return () => observer.disconnect();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(null); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(null); avatar.current?.querySelector('button')?.focus({ preventScroll: true }); } };
    document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape); };
  }, [open]);
  useEffect(() => { if (open === 'menu') bubble.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => { setNavigationError(''); setOpen(null); }, [sessionId]);
  const rect = petBubbleRect(drag.position, view, height);
  const details = () => {
    if (!sessionId) return;
    try { openDetails(); setOpen(null); setNavigationError(''); }
    catch { setNavigationError('当前对话的面板还未就绪，请稍后再试。'); }
  };
  const close = () => { setOpen(null); avatar.current?.querySelector('button')?.focus({ preventScroll: true }); };
  return <div className="cg-pet-surface pet-overlay-root" data-motion={reduced ? 'reduce' : 'system'}><style>{petStyles}</style>
    <div ref={root} className={`pet-companion${drag.dragging ? ' is-dragging' : ''}${open ? ' is-open' : ''}`} style={{ right: drag.position.right, bottom: drag.position.bottom }}>
      {open && <div ref={bubble} className={`pet-companion-bubble${open === 'menu' ? ' pet-context-menu' : ''}`} style={{ left: rect.left, top: rect.top, width: rect.width, maxHeight: rect.maxHeight }} data-side={rect.side}
        role={open === 'menu' ? 'menu' : 'dialog'} aria-label={open === 'menu' ? '桌宠操作' : `${roles[role].name}今日状态`}
        onKeyDown={event => {
          if (open !== 'menu' || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=menuitem]'));
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          event.preventDefault(); items[next]?.focus();
        }}>
        <div className="pet-companion-bubble-head"><strong>{roles[role].name}</strong><button type="button" onClick={close} aria-label="收起桌宠对话">×</button></div>
        {open === 'menu' ? <div className="pet-menu-actions">
          <button role="menuitem" type="button" onClick={() => { setPetRole(role === 'bigfish' ? 'cuigengji' : 'bigfish'); close(); }}>切换为{roles[role === 'bigfish' ? 'cuigengji' : 'bigfish'].name}</button>
          <button role="menuitem" type="button" onClick={() => { resetPetPosition(); close(); }}>回到右下角</button>
          <button role="menuitem" type="button" onClick={() => setPetVisible(false)}>暂时隐藏</button>
        </div> : <>
          <p className="pet-companion-scope">{result ? result.title || '全部作品' : sessionId ? loading ? '正在读取作品…' : '进度未连接' : '尚未打开对话'}{result ? ` · ${dateLabel(result.date)}` : ''}</p>
          <p>{petMessage(role, mood, stats, Boolean(sessionId))}</p>
          <div className="pet-companion-stats" aria-label="今日写作数据"><span>正文<b>{result ? formatCount(stats.proseAdded) : '—'}</b>字</span><span>设定<b>{result ? formatCount(stats.settingAdded) : '—'}</b>字</span><span>规划<b>{result ? formatCount(stats.planningChanges) : '—'}</b>次</span></div>
          <div className="pet-companion-actions"><button type="button" onClick={() => setPetRole(role === 'bigfish' ? 'cuigengji' : 'bigfish')}>切换角色</button><button type="button" disabled={!sessionId} onClick={details}>查看详情</button></div>
          {error && <button className="pet-companion-retry" type="button" onClick={() => void refresh()}>进度未连接，点击重试</button>}
        </>}
        {navigationError && <p className="pet-error" role="alert">{navigationError}</p>}
      </div>}
      <div className="pet-companion-character" ref={avatar}>
        <PetAvatar role={role} mood={mood} floating onPointerDown={drag.onPointerDown}
          onClick={event => { if (!drag.acceptClick(event)) return; interact(); setOpen(value => value ? null : 'bubble'); }}
          onContextMenu={event => { event.preventDefault(); setOpen('menu'); }}/>
        <span className={`pet-companion-status pet-status-${mood}`} aria-label={moodLabels[mood]}/>
      </div>
    </div>
  </div>;
}

/** Rendering failures are contained in this small surface, never the host slot. */
export class PetBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? <div className="cg-pet-surface pet-recovery"><style>{petStyles}</style><span>桌宠暂时歇一会儿</span><button type="button" onClick={() => this.setState({ failed: false })}>恢复桌宠</button><button type="button" onClick={() => setPetVisible(false)}>隐藏</button></div> : this.props.children;
  }
}
export function PetCompanion(props: React.ComponentProps<typeof Companion>) {
  const { visible } = usePetPreferences();
  return visible ? <PetBoundary key={props.sessionId || 'no-session'}><Companion {...props}/></PetBoundary> : null;
}
export function PetOverlay({ useMounted, openPet, rpc, statusSource }: {
  useMounted: SnapshotSelectorHook<string | undefined>; openPet: () => void; rpc: PetRPC; statusSource?: PetStatusSource;
}) {
  const sessionId = useMounted(value => value);
  return createPortal(<NativeCompanion rpc={rpc} sessionId={sessionId} statusSource={statusSource} openDetails={openPet}><PetCompanion rpc={rpc} sessionId={sessionId} openDetails={openPet} statusSource={statusSource}/></NativeCompanion>, document.body);
}

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { SnapshotSelectorHook } from '@deepseek-ai/dsh-client-store';
import bigfishPetPoses from '../../assets/pets/bigfish-pet-poses.png';
import cuigengjiPetPoses from '../../assets/pets/cuigengji-pet-poses.png';
import { petStyles } from './style.ts';
import {quickStyles} from './quick-style.ts';
import {QuickSummary} from './QuickSummary.tsx';
import {Icon} from '../../shared/icons.tsx';
import { usePetActivity } from './activity.ts';
import { petBubbleRect, resetPetPosition, usePetDrag, usePetViewport } from './geometry.ts';
import { usePetPreferences, setPetRole, setPetVisible } from './preferences.ts';
import { usePetMood } from './mood.ts';
import { NativeCompanion } from './native.tsx';
import {useCompanionPresentation,UsageAsset,playCompanionSound} from './usage.tsx';
import { emptyStats, moodLabels, roles, type PetMood, type PetRole, type PetRPC, type PetStatusSource } from './model.ts';
export type { PetRole } from './model.ts';
function PetAvatar({ role, mood, onClick, floating = false, children,...props }: {
  role: PetRole; mood: PetMood; floating?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const asset = role === 'bigfish' ? bigfishPetPoses : cuigengjiPetPoses;
  return <button {...props} className={`pet-avatar pet-avatar-${role} pet-mood-${mood}`} type="button" onClick={onClick}
    aria-label={`${roles[role].name}，${moodLabels[mood]}，${floating ? '点击查看进度，拖动移动' : '点击打招呼'}`}
    title={floating ? '点击查看进度 · 拖动移动 · 右键更多操作' : '点一下和我打个招呼'}>
    {children||<span className="pet-avatar-art" style={{ backgroundImage: `url(${asset})` }} aria-hidden="true" />}
    {(mood === 'celebrate' || mood === 'reacting') && <span className="pet-sparkles" aria-hidden="true"><i>✦</i><i>✧</i><i>✦</i></span>}
  </button>;
}

function Companion({ rpc, sessionId, openDetails, openConversation,statusSource }: { rpc: PetRPC; sessionId?: string; openDetails: () => void; openConversation?:(id:string)=>void;statusSource?: PetStatusSource }) {
  const { role, reduced } = usePetPreferences();
  const { result, loading, error, refresh } = usePetActivity(rpc, sessionId);
  const { mood, interact } = usePetMood(result, loading, error, sessionId, statusSource);
  const stats = result?.stats || emptyStats;
  const [open, setOpen] = useState<'bubble' | 'menu' | null>(null);
  const [bubbleIndex,setBubbleIndex]=useState(0);
  const [writingOpen,setWritingOpen]=useState(false);
  const companion=useCompanionPresentation(rpc,bubbleIndex,sessionId,open!=='menu');
  const view=usePetViewport(),appearance=companion.value?.appearance,drag=usePetDrag(view,appearance?.snap as any,appearance?.scale||1,appearance?.snapZones);
  const lastNotice=useRef('');
  useEffect(()=>{
    const value = companion.value, notice = value?.event;
    if (!notice || lastNotice.current === notice.id || open === 'menu' || drag.dragging) return;
    lastNotice.current = notice.id;
    playCompanionSound(rpc, value?.sound);
    if (!notice.id.startsWith('touch:')) void rpc('usage.delivered', {id:notice.id}).catch(()=>{});
  },[rpc,companion.value?.event?.id,open,drag.dragging]);
  const [navigationError, setNavigationError] = useState('');
  const root = useRef<HTMLDivElement>(null), bubble = useRef<HTMLDivElement>(null), avatar = useRef<HTMLDivElement>(null);
  const [measured, setMeasured] = useState<{height:number;top:number|null}>({height:228,top:null});
  const bubbleTop = useRef<number|null>(null);
  const dismiss = () => setOpen(null);
  useLayoutEffect(() => {
    bubbleTop.current = null;
    if (!bubble.current || !open) { setMeasured(previous=>previous.top===null?previous:{...previous,top:null}); return; }
    const element = bubble.current;
    element.style.maxHeight = `${Math.max(120,view.bottom-view.top-16)}px`;
    const measure = () => {
      const height = element.getBoundingClientRect().height;
      // Hold the top edge while details unfold. Near a screen edge, scroll the
      // body instead of moving the close/disclosure buttons under the pointer.
      if (bubbleTop.current === null) bubbleTop.current = petBubbleRect(drag.position, view, height, appearance?.scale||1).top;
      const top = bubbleTop.current;
      element.style.maxHeight = `${Math.max(120,view.bottom-top-8)}px`;
      setMeasured(previous=>previous.height===height&&previous.top===top?previous:{height,top});
    };
    const observer = new ResizeObserver(measure); observer.observe(element); measure();
    return () => observer.disconnect();
  }, [open,view,drag.position.right,drag.position.bottom,appearance?.scale]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) dismiss(); };
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { dismiss(); avatar.current?.querySelector('button')?.focus({ preventScroll: true }); } };
    document.addEventListener('pointerdown', outside, true); document.addEventListener('keydown', escape);
    return () => { document.removeEventListener('pointerdown', outside, true); document.removeEventListener('keydown', escape); };
  }, [open]);
  useEffect(() => { if (open === 'menu') bubble.current?.querySelector<HTMLButtonElement>('[role=menuitem]')?.focus({ preventScroll: true }); }, [open]);
  useEffect(() => { setNavigationError(''); setOpen(null); }, [sessionId]);
  const rect = petBubbleRect(drag.position, view, measured.height,appearance?.scale||1);
  const top = measured.top ?? rect.top;
  const maxHeight = bubbleTop.current === null ? rect.maxHeight : Math.max(120, Math.min(rect.maxHeight, view.bottom - top - 8));
  const details = () => {
    if (!sessionId) return;
    try { openDetails(); dismiss(); setNavigationError(''); }
    catch { setNavigationError('当前对话的面板还未就绪，请稍后再试。'); }
  };
  const close = () => { dismiss();avatar.current?.querySelector('button')?.focus({ preventScroll: true }); };
  return <div className="cg-pet-surface pet-overlay-root" data-motion={reduced ? 'reduce' : 'system'}><style>{petStyles+quickStyles}</style>
    <div ref={root} className={`pet-companion${drag.dragging ? ' is-dragging' : ''}${open ? ' is-open' : ''}`} style={{ right: drag.position.right, bottom: drag.position.bottom }}>
      {open && <div ref={bubble} className={`pet-companion-bubble pet-quick-bubble${open === 'menu' ? ' pet-context-menu' : ''}`} style={{ left: rect.left, top, width: rect.width, maxHeight }} data-side={rect.side}
        role={open === 'menu' ? 'menu' : 'dialog'} aria-label={open === 'menu' ? '桌宠操作' : `${roles[role].name}今日状态`}
        onKeyDown={event => {
          if (open !== 'menu' || !['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
          const items = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('[role=menuitem]'));
          const index = items.indexOf(document.activeElement as HTMLButtonElement);
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
          event.preventDefault(); items[next]?.focus();
        }}>
        <div className="pet-companion-bubble-head"><strong><span className="pet-quick-mark"><Icon name="star"/></span>{roles[role].name}</strong><button type="button" onClick={close} aria-label="收起桌宠对话"><svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="m4 4 8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button></div>
        {open === 'menu' ? <div className="pet-menu-actions">
          <button role="menuitem" type="button" onClick={() => { setPetRole(role === 'bigfish' ? 'cuigengji' : 'bigfish'); close(); }}>切换为{roles[role === 'bigfish' ? 'cuigengji' : 'bigfish'].name}</button>
          <button role="menuitem" type="button" onClick={() => { resetPetPosition(); close(); }}>回到右下角</button>
          <button role="menuitem" type="button" onClick={() => setPetVisible(false)}>暂时隐藏</button>
        </div> : <><div className="pet-quick-scroll">
          <QuickSummary rpc={rpc} value={companion.value} result={result} stats={stats} sessionId={sessionId} nextBubble={()=>setBubbleIndex(n=>n+1)} writingOpen={writingOpen} setWritingOpen={setWritingOpen}/>
          {companion.value?.notification?.pending&&openConversation&&<button type="button" onClick={()=>{openConversation(companion.value!.notification!.sessionId);close();}}>回到待处理对话</button>}
          {error && <button className="pet-companion-retry" type="button" onClick={() => void refresh()}>进度未连接，点击重试</button>}
          {companion.error && <button className="pet-companion-retry" type="button" onClick={()=>void companion.request()}>用量暂未连接，点击重试</button>}
          {navigationError && <p className="pet-error" role="alert">{navigationError}</p>}
        </div><button type="button" className="pet-quick-records" disabled={!sessionId} onClick={details}><span>查看记录</span><svg aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="M4 12 12 4M5 4h7v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
        </>}
      </div>}
      <div className="pet-companion-character" ref={avatar}>
        <div style={{transform:`scale(${appearance?.scale||1}) scaleX(${Boolean(appearance?.flipped)!==Boolean(appearance?.autoFlip&&view.width-drag.position.right-112<12+56*((appearance?.scale||1)-1))?-1:1})`,transformOrigin:'center bottom'}}><PetAvatar role={role} mood={mood} floating onPointerDown={e=>{drag.onPointerDown(e);if(e.button===0)void companion.request('press');}} onPointerUp={()=>void companion.request('release')}
          onClick={event => { if (!drag.acceptClick(event)) return; interact();if(open){dismiss();if(open==='bubble'&&companion.value?.advanceOnClick)setBubbleIndex(n=>n+1);}else setOpen('bubble'); }}
          onContextMenu={event => { event.preventDefault();dismiss();setOpen('menu'); }}>{companion.value?.appearance.roleAssetId&&<UsageAsset rpc={rpc} id={companion.value.appearance.roleAssetId} style={{width:'100%',height:'100%',objectFit:'contain',pointerEvents:'none'}}/>}</PetAvatar>
        </div>
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
export function PetOverlay({ useMounted, openPet, openConversation,rpc, statusSource }: {
  useMounted: SnapshotSelectorHook<string | undefined>; openPet: () => void;openConversation?:(id:string)=>void; rpc: PetRPC; statusSource?: PetStatusSource;
}) {
  const sessionId = useMounted(value => value);
  return createPortal(<NativeCompanion rpc={rpc} sessionId={sessionId} statusSource={statusSource} openDetails={openPet} openConversation={openConversation}><PetCompanion rpc={rpc} sessionId={sessionId} openDetails={openPet} openConversation={openConversation} statusSource={statusSource}/></NativeCompanion>, document.body);
}

import {useEffect,useRef,useState,type HTMLAttributes,type PointerEvent,type KeyboardEvent} from 'react';
import {directorySnapshot,planDirectoryMove,type DirectoryDestination,type DirectoryMove} from '../../domain/directory/order.ts';
import type {DirectoryItem} from './DirectoryEntries.tsx';
import {useWorkbenchRefresh} from './refresh.tsx';

type DirectoryGroup={id:string;parentId?:string|null;deleted?:boolean};
interface DirectoryView {items:DirectoryItem[];groups:DirectoryGroup[]}
interface Options {
  scopeKey:string;items:DirectoryItem[];groups:DirectoryGroup[];disabled:boolean;
  move:(args:DirectoryMove)=>Promise<unknown>;read:()=>Promise<DirectoryView>;onMoved?:(groupId:string|null)=>void;
}
interface Gesture {
  pointerId:number;element:HTMLElement;source:DirectoryItem;active:boolean;
  startX:number;startY:number;x:number;y:number;items:DirectoryItem[];groups:Options['groups'];
  target:DirectoryDestination|null;
}
interface DragView {source:DirectoryItem;x:number;y:number;target:DirectoryDestination|null}
/** Match the manuscript directory: drag a row, preview its insertion point, then commit once. */
export function useDirectoryReorder(options:Options) {
  const {refresh}=useWorkbenchRefresh();
  const directoryRef=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|null>(null),frame=useRef(0);
  const suppress=useRef(false),suppressUntil=useRef(0),savingRef=useRef(false);
  const [drag,setDrag]=useState<DragView|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
  const [overlay,setOverlay]=useState<DirectoryView&{before:string;after:string}|null>(null);
  const items=overlay?.items??options.items,groups=overlay?.groups??options.groups;
  const signature=JSON.stringify(directorySnapshot(options.items,options.groups));
  const latest=useRef({...options,items,groups,signature});latest.current={...options,items,groups,signature};
  useEffect(()=>{if(overlay&&(signature===overlay.after||(!saving&&signature!==overlay.before)))setOverlay(null);},[signature,overlay,saving]);
  const clearGesture=()=>{const active=gesture.current;gesture.current=null;cancelAnimationFrame(frame.current);setDrag(null);if(active?.element.hasPointerCapture(active.pointerId))active.element.releasePointerCapture(active.pointerId);};
  useEffect(()=>{clearGesture();setOverlay(null);setError('');},[options.scopeKey]);
  useEffect(()=>{if(options.disabled)clearGesture();},[options.disabled]);
  useEffect(()=>{
    let timer:ReturnType<typeof setTimeout>;
    const release=()=>{clearTimeout(timer);timer=setTimeout(()=>{suppress.current=false;},0);};
    const escape=(event:globalThis.KeyboardEvent)=>{if(event.key==='Escape'&&gesture.current){if(gesture.current.active){event.preventDefault();event.stopPropagation();}clearGesture();}};
    const blur=()=>clearGesture();
    window.addEventListener('pointerup',release);window.addEventListener('pointercancel',release);window.addEventListener('keydown',escape,true);window.addEventListener('blur',blur);
    return()=>{window.removeEventListener('pointerup',release);window.removeEventListener('pointercancel',release);window.removeEventListener('keydown',escape,true);window.removeEventListener('blur',blur);clearTimeout(timer);cancelAnimationFrame(frame.current);gesture.current=null;};
  },[]);
  const locate=(current:Gesture):DirectoryDestination|null=>{
    const root=directoryRef.current,hit=document.elementFromPoint(current.x,current.y);
    if(!root||!hit||!root.contains(hit)||hit.closest('.menu'))return null;
    const section=hit.closest<HTMLElement>('[data-directory-group-id]');
    if(!section)return null;
    let groupId=section.dataset.directoryGroupId||null;
    const hierarchical=current.items.some(n=>'parentId' in n);
    const parentSection=hit.closest<HTMLElement>('[data-directory-node-parent-id]');
    let parentId=parentSection?.dataset.directoryNodeParentId||null;
    const row=hit.closest<HTMLElement>('[data-entry-id]');
    let beforeId:string|null=null;
    if(row){
      const target=current.items.find(item=>item.id===row.dataset.entryId);
      if(!target||target.id===current.source.id)return null;
      const bounds=row.getBoundingClientRect(),ratio=(current.y-bounds.top)/bounds.height;
      if(hierarchical&&ratio>.3&&ratio<.7&&current.x>bounds.left+36){parentId=target.id;groupId=target.groupId??null;}
      else{
        parentId=target.parentId??null;groupId=target.groupId??null;
        if(ratio<.5)beforeId=target.id;
        else{const peers=current.items.filter(item=>item.id!==current.source.id&&(item.groupId??null)===groupId&&(item.parentId??null)===parentId);beforeId=peers[peers.findIndex(item=>item.id===target.id)+1]?.id??null;}
      }
    }
    const destination={groupId,beforeId,...(hierarchical?{parentId}:{})};
    try{return planDirectoryMove(current.items,current.groups,current.source.id,destination).changed?destination:null;}catch{return null;}

  };
  const show=(current:Gesture)=>{current.target=locate(current);setDrag({source:current.source,x:current.x,y:current.y,target:current.target});};
  const autoScroll=()=>{
    const current=gesture.current,scroll=directoryRef.current?.closest<HTMLElement>('.workspace-sidebar-scroll');
    if(!current?.active||!scroll)return;
    const box=scroll.getBoundingClientRect();
    if(current.x>=box.left&&current.x<=box.right&&current.y>=box.top&&current.y<=box.bottom){
      const top=current.y-box.top,bottom=box.bottom-current.y,speed=top<44?-14*(1-top/44):bottom<44?14*(1-bottom/44):0;
      const before=scroll.scrollTop;scroll.scrollTop+=speed;if(before!==scroll.scrollTop)show(current);
    }
    frame.current=requestAnimationFrame(autoScroll);
  };
  const persist=async(current:Pick<Gesture,'source'|'items'|'groups'>,destination:DirectoryDestination)=>{
    if(savingRef.current||latest.current.disabled)return;
    const plan=planDirectoryMove(current.items,current.groups,current.source.id,destination);
    if(!plan.changed)return;
    const scope=latest.current.scopeKey;
    savingRef.current=true;setSaving(true);setError('');
    const before=directorySnapshot(current.items,current.groups),after=directorySnapshot(plan.items,current.groups);
    setOverlay({before:JSON.stringify(before),after:JSON.stringify(after),items:plan.items,groups:current.groups});
    let failure:unknown;
    try{
      try{await latest.current.move({nodeId:current.source.id,...destination,expectedDirectory:before,requestId:crypto.randomUUID()});}catch(error){failure=error;}
      if(scope!==latest.current.scopeKey)return;
      // A lost receipt may follow a successful commit. Read before deciding whether to retry.
      const fresh=await latest.current.read();
      if(scope!==latest.current.scopeKey)return;
      const actual=JSON.stringify(directorySnapshot(fresh.items,fresh.groups));
      setOverlay({...fresh,before:latest.current.signature,after:actual});
      if(failure&&actual!==JSON.stringify(after))setError(/目录.*变化/.test(failure instanceof Error?failure.message:'')||(failure as {code?:string})?.code==='CONFLICT'?'目录有新变化，已自动刷新，请重新拖动。':'顺序未能保存，目录已刷新，请重试。');
      else latest.current.onMoved?.(destination.groupId);
      refresh();
    }catch{if(scope===latest.current.scopeKey){setOverlay(null);setError('暂时无法确认目录顺序，请刷新后重试。');refresh();}}
    finally{savingRef.current=false;setSaving(false);}
  };
  const rowProps=(item:DirectoryItem):HTMLAttributes<HTMLDivElement>=>({
    onPointerDown:(event:PointerEvent<HTMLDivElement>)=>{
      suppress.current=false;suppressUntil.current=0;
      if(event.button!==0||!event.isPrimary||latest.current.disabled||savingRef.current||!latest.current.move||(event.target as HTMLElement).closest('input,textarea,select,[data-no-reorder]'))return;
      if(event.pointerType==='touch'&&!(event.target as HTMLElement).closest('.directory-grip'))return;
      const {items,groups}=latest.current;
      gesture.current={pointerId:event.pointerId,element:event.currentTarget,source:item,active:false,startX:event.clientX,startY:event.clientY,x:event.clientX,y:event.clientY,items,groups,target:null};
    },
    onPointerMove:(event:PointerEvent<HTMLDivElement>)=>{
      const current=gesture.current;if(!current||current.pointerId!==event.pointerId)return;
      current.x=event.clientX;current.y=event.clientY;
      if(!current.active&&Math.hypot(current.x-current.startX,current.y-current.startY)<10)return;
      event.preventDefault();
      if(!current.active){current.active=true;suppress.current=true;suppressUntil.current=Date.now()+500;current.element.setPointerCapture(event.pointerId);frame.current=requestAnimationFrame(autoScroll);}
      show(current);
    },
    onPointerUp:(event:PointerEvent<HTMLDivElement>)=>{
      const current=gesture.current;if(!current||current.pointerId!==event.pointerId)return;
      if(current.active){current.x=event.clientX;current.y=event.clientY;current.target=locate(current);event.preventDefault();}
      clearGesture();if(current.active&&current.target)void persist(current,current.target);
    },
    onPointerCancel:clearGesture,
    onLostPointerCapture:(event:PointerEvent<HTMLDivElement>)=>{if(gesture.current?.pointerId===event.pointerId)clearGesture();},
    onDragStart:event=>event.preventDefault(),
    onClickCapture:event=>{if(suppress.current||Date.now()<suppressUntil.current){event.preventDefault();event.stopPropagation();suppress.current=false;}},
    onKeyDown:(event:KeyboardEvent<HTMLDivElement>)=>{
      if(!event.altKey||!['ArrowUp','ArrowDown'].includes(event.key)||latest.current.disabled||savingRef.current)return;
      event.preventDefault();const {items,groups}=latest.current,peers=items.filter(peer=>(peer.groupId??null)===(item.groupId??null)&&(peer.parentId??null)===(item.parentId??null)),index=peers.findIndex(peer=>peer.id===item.id),up=event.key==='ArrowUp';
      if(up?index<=0:index>=peers.length-1)return;
      void persist({source:item,items,groups},{groupId:item.groupId??null,...('parentId' in item?{parentId:item.parentId??null}:{}),beforeId:up?peers[index-1].id:peers[index+2]?.id??null});
    },
  });
  return {items,directoryRef,drag,saving,error,rowProps,onClickCapture:undefined,onPointerDownCapture:undefined,enabled:Boolean(options.move)&&!options.disabled};
}
export type DirectoryReorder=ReturnType<typeof useDirectoryReorder>;

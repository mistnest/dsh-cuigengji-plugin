import {useEffect,useRef,useState,type HTMLAttributes,type PointerEvent,type MouseEvent} from 'react';
import {groupDescendants} from '../../domain/directory/groups.ts';
import type {GroupItem} from './groups.tsx';

interface Gesture {pointerId:number;element:HTMLElement;source:GroupItem;x:number;y:number;startX:number;startY:number;active:boolean;target:string|null|undefined}
/** Drag folders as a unit; children follow their parent ID, never individual copies. */
export function useGroupDrag({groups,disabled,scope,move}:{groups:GroupItem[];disabled:boolean;scope:string;move:(group:GroupItem,parentId:string|null)=>Promise<unknown>}) {
  const root=useRef<HTMLDivElement>(null),gesture=useRef<Gesture|null>(null),frame=useRef(0),suppressUntil=useRef(0),saving=useRef(false);
  const options=useRef({groups,disabled,move});options.current={groups,disabled,move};
  const [drag,setDrag]=useState<{id:string;target:string|null|undefined}|null>(null),[error,setError]=useState('');
  const clear=()=>{const current=gesture.current;gesture.current=null;cancelAnimationFrame(frame.current);setDrag(null);if(current?.element.hasPointerCapture(current.pointerId))current.element.releasePointerCapture(current.pointerId);};
  useEffect(()=>{clear();setError('');},[scope]);
  useEffect(()=>{if(disabled)clear();},[disabled]);
  useEffect(()=>{const cancel=(event:globalThis.KeyboardEvent)=>{if(event.key==='Escape'&&gesture.current){event.preventDefault();clear();}},blur=()=>clear();window.addEventListener('keydown',cancel);window.addEventListener('blur',blur);return()=>{window.removeEventListener('keydown',cancel);window.removeEventListener('blur',blur);cancelAnimationFrame(frame.current);gesture.current=null;};},[]);
  const locate=(current:Gesture)=>{
    const hit=document.elementFromPoint(current.x,current.y),target=hit?.closest<HTMLElement>('[data-group-parent-id]');
    if(!target||!root.current?.contains(target)||hit?.closest('.menu'))return undefined;
    const parentId=target.dataset.groupParentId||null;
    if(parentId&&(groupDescendants(options.current.groups,current.source.id).has(parentId)||!options.current.groups.some(g=>g.id===parentId)))return undefined;
    return (current.source.parentId??null)===parentId?undefined:parentId;
  };
  const show=(current:Gesture)=>{current.target=locate(current);setDrag({id:current.source.id,target:current.target});};
  const autoScroll=()=>{const current=gesture.current,scroll=root.current?.closest<HTMLElement>('.workspace-sidebar-scroll');if(!current?.active||!scroll)return;const box=scroll.getBoundingClientRect();if(current.x>=box.left&&current.x<=box.right&&current.y>=box.top&&current.y<=box.bottom){const top=current.y-box.top,bottom=box.bottom-current.y,before=scroll.scrollTop;scroll.scrollTop+=top<44?-12*(1-top/44):bottom<44?12*(1-bottom/44):0;if(before!==scroll.scrollTop)show(current);}frame.current=requestAnimationFrame(autoScroll);};
  const persist=async(current:Gesture)=>{if(current.target===undefined||saving.current||options.current.disabled)return;saving.current=true;setError('');try{await options.current.move(current.source,current.target);}catch(error){setError(error instanceof Error?error.message:'分组移动未保存，请重试。');}finally{saving.current=false;}};
  const rowProps=(group:GroupItem):HTMLAttributes<HTMLDivElement>=>({
    onPointerDown:(event:PointerEvent<HTMLDivElement>)=>{if(event.button!==0||!event.isPrimary||options.current.disabled||saving.current||(event.target as HTMLElement).closest('.menu,.tree-chevron,select'))return;if(event.pointerType==='touch'&&!(event.target as HTMLElement).closest('.tree-folder-grip'))return;suppressUntil.current=0;gesture.current={pointerId:event.pointerId,element:event.currentTarget,source:group,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,active:false,target:undefined};},
    onPointerMove:event=>{const current=gesture.current;if(!current||current.pointerId!==event.pointerId)return;current.x=event.clientX;current.y=event.clientY;if(!current.active&&Math.hypot(current.x-current.startX,current.y-current.startY)<10)return;event.preventDefault();if(!current.active){current.active=true;current.element.setPointerCapture(event.pointerId);frame.current=requestAnimationFrame(autoScroll);}suppressUntil.current=Date.now()+500;show(current);},
    onPointerUp:event=>{const current=gesture.current;if(!current||current.pointerId!==event.pointerId)return;if(current.active){current.x=event.clientX;current.y=event.clientY;current.target=locate(current);event.preventDefault();suppressUntil.current=Date.now()+500;}clear();if(current.active)void persist(current);},
    onPointerCancel:clear,onLostPointerCapture:event=>{if(gesture.current?.pointerId===event.pointerId)clear();},onDragStart:event=>event.preventDefault(),
  });
  return {root,drag,error,rowProps,onPointerDownCapture:()=>{suppressUntil.current=0;},onClickCapture:(event:MouseEvent<HTMLDivElement>)=>{if(Date.now()<suppressUntil.current){event.preventDefault();event.stopPropagation();}}};
}

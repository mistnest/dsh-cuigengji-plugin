import React,{useEffect,useRef,useState} from 'react';
import type {Point} from '../../contracts/planning.ts';
export const CARD_WIDTH=224, PORT_Y=60;
type Side='in'|'out';
interface Link {from:string;to:string;type?:string}
interface GraphNode {id:string;revision:number;position?:Point|null}
interface Options {nodes:GraphNode[];edges:Link[];fallback:Record<string,Point>;busy:boolean;acyclic?:boolean;onLayout:(points:Record<string,Point>)=>Promise<boolean|undefined>;onConnect:(from:string,to:string)=>Promise<boolean|undefined>}
interface Wire {id:string;side:Side;point:Point;target:string|null}
type Gesture={kind:'card';id:string;revision:number;pointer:number;x:number;y:number;left:number;top:number;start:Point;previous?:Point;moved:boolean;point:Point;persist:Options['onLayout']}|{kind:'wire';pointer:number;x:number;y:number;moved:boolean}|{kind:'pan';pointer:number;x:number;y:number;left:number;top:number};
export function curve(from:Point,to:Point){const reach=Math.max(60,Math.abs(to.x-from.x)*.45);return `M${from.x},${from.y} C${from.x+reach},${from.y} ${to.x-reach},${to.y} ${to.x},${to.y}`;}
export function canJoin(edges:Link[],from:string,to:string,acyclic=false){
  if(from===to||edges.some(e=>e.from===from&&e.to===to))return false;
  if(!acyclic)return true;
  const seen=new Set<string>(),pending=[to];
  while(pending.length){const id=pending.pop()!;if(id===from)return false;if(seen.has(id))continue;seen.add(id);for(const e of edges)if(e.from===id&&e.type!=='requires')pending.push(e.to);}
  return true;
}

export function GraphStatus({graph,busy}:{graph:ReturnType<typeof useGraph>;busy:boolean}){
  if(graph.failed)return <span className="graph-save-error" role="alert">布局未保存<button disabled={busy||graph.saving} onClick={graph.retry}>重试</button><button disabled={busy||graph.saving} onClick={graph.discard}>还原布局</button></span>;
  if(graph.saving)return <small role="status">正在保存…</small>;
  if(graph.wire)return <small role="status">连接到高亮的连接点 · Esc 取消</small>;
  return <small className="graph-hint">拖动卡片 · 拖动圆点连线</small>;
}
/** Shared pointer coordinates, drag threshold and save lifecycle for both story graphs. */
export function useGraph({nodes,edges,fallback,busy,acyclic,onLayout,onConnect}:Options){
  const scroll=useRef<HTMLDivElement>(null),surface=useRef<HTMLDivElement>(null);
  const [local,setLocal]=useState<Record<string,Point>>({}),[zoom,setZoom]=useState(1),[wire,setWire]=useState<Wire|null>(null),[selectedEdge,setSelectedEdge]=useState<string|null>(null);
  const [saving,setSaving]=useState(false),[failed,setFailed]=useState(false),[dragging,setDragging]=useState(false);
  const [awaiting,setAwaiting]=useState<Record<string,number>|null>(null);
  const [awaitingLink,setAwaitingLink]=useState<Link|null>(null);
  const pending=saving||awaiting!==null||awaitingLink!==null;
  const gesture=useRef<Gesture|null>(null),wireRef=useRef<Wire|null>(null),locked=useRef(false),suppress=useRef(false);
  const pointer=useRef<Point|null>(null),frame=useRef<number|null>(null),step=useRef<()=>void>(()=>{});
  const points=Object.fromEntries(nodes.map(n=>[n.id,local[n.id]||n.position||fallback[n.id]]));
  const updateWire=(value:Wire|null)=>{wireRef.current=value;setWire(value);};
  const endpoint=(id:string,side:Side):Point=>({x:points[id].x+(side==='out'?CARD_WIDTH:0),y:points[id].y+PORT_Y});
  const clientPoint=(x:number,y:number):Point=>{const rect=surface.current!.getBoundingClientRect();return{x:(x-rect.left)/zoom,y:(y-rect.top)/zoom};};
  const valid=(id:string,side:Side)=>{const current=wireRef.current;if(!current||current.side===side)return false;const [from,to]=current.side==='out'?[current.id,id]:[id,current.id];return canJoin(edges,from,to,acyclic);};
  const targetAt=(x:number,y:number)=>{
    const port=document.elementFromPoint(x,y)?.closest<HTMLElement>('[data-graph-port]');
    if(!port||!surface.current?.contains(port))return null;
    return valid(port.dataset.nodeId!,port.dataset.graphPort as Side)?port.dataset.nodeId!:null;
  };
  const cancel=()=>{
    const g=gesture.current;
    if(g?.kind==='card'){suppress.current=g.moved;setLocal(old=>{const next={...old};if(g.previous)next[g.id]=g.previous;else delete next[g.id];return next;});}
    gesture.current=null;pointer.current=null;setDragging(false);updateWire(null);setSelectedEdge(null);
  };
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,textarea,select,[contenteditable=true]'))return;if(e.key==='Escape')cancel();};window.addEventListener('keydown',key);window.addEventListener('blur',cancel);return()=>{window.removeEventListener('keydown',key);window.removeEventListener('blur',cancel);};},[]);
  useEffect(()=>{const ids=new Set(nodes.map(n=>n.id));setLocal(previous=>Object.fromEntries(Object.entries(previous).filter(([id,p])=>{const n=nodes.find(n=>n.id===id);return ids.has(id)&&((gesture.current?.kind==='card'&&gesture.current.id===id)||n?.position?.x!==p.x||n?.position?.y!==p.y);})));if(wireRef.current&&!ids.has(wireRef.current.id))updateWire(null);},[nodes]);
  // A successful RPC precedes the parent's index refresh. Do not start another
  // drag using that stale revision, or retain optimistic coordinates over newer edits.
  useEffect(()=>{
    if(awaiting&&Object.entries(awaiting).every(([id,revision])=>!nodes.some(n=>n.id===id)||nodes.some(n=>n.id===id&&n.revision>revision))){
      setLocal(old=>Object.fromEntries(Object.entries(old).filter(([id])=>!(id in awaiting))));
      setAwaiting(null);locked.current=false;
    }
  },[nodes,awaiting]);
  useEffect(()=>{if(awaitingLink&&edges.some(e=>e.from===awaitingLink.from&&e.to===awaitingLink.to)){setAwaitingLink(null);locked.current=false;}},[edges,awaitingLink]);
  useEffect(()=>()=>{if(frame.current!==null)cancelAnimationFrame(frame.current);},[]);
  const save=async(changes:Record<string,Point>,persist=onLayout,revisions=Object.fromEntries(nodes.filter(n=>n.id in changes).map(n=>[n.id,n.revision])))=>{
    if(locked.current||busy)return;
    locked.current=true;setSaving(true);setFailed(false);
    let succeeded=false;
    try {succeeded=await persist(changes)===true;if(succeeded)setAwaiting(revisions);else setFailed(true);}catch{setFailed(true);}finally{if(!succeeded)locked.current=false;setSaving(false);}
  };
  const connect=async(target:string)=>{
    const current=wireRef.current;if(!current||locked.current||busy)return;
    const [from,to]=current.side==='out'?[current.id,target]:[target,current.id];
    updateWire(null);gesture.current=null;locked.current=true;setSaving(true);
    let succeeded=false;
    try {succeeded=await onConnect(from,to)===true;if(succeeded)setAwaitingLink({from,to});}catch{/* The parent reports RPC errors without creating a phantom edge. */}finally{if(!succeeded)locked.current=false;setSaving(false);}
  };
  const portProps=(id:string,side:Side,name:string):React.ButtonHTMLAttributes<HTMLButtonElement>&{'data-graph-port':Side;'data-node-id':string}=>({
    'data-graph-port':side,'data-node-id':id,type:'button','aria-label':`${name}：${side==='out'?'输出':'输入'}连接点`,title:side==='out'?'拖到另一张卡片的输入点，或依次点击连接点':'接收来自另一张卡片的连线',disabled:busy||pending||failed,
    className:`graph-port port-${side} ${wire?(valid(id,side)?'port-valid':wire.id===id?'port-source':'port-unavailable'):''} ${wire?.target===id&&valid(id,side)?'port-target':''}`,
    onPointerDown:e=>{e.stopPropagation();if(e.button!==0||busy||locked.current)return;e.preventDefault();suppress.current=false;if(wireRef.current){if(valid(id,side)){void connect(id);return;}updateWire(null);return;}setSelectedEdge(null);updateWire({id,side,point:endpoint(id,side),target:null});gesture.current={kind:'wire',pointer:e.pointerId,x:e.clientX,y:e.clientY,moved:false};e.currentTarget.setPointerCapture(e.pointerId);},
    onClick:e=>{e.stopPropagation();if(e.detail!==0||busy||locked.current)return;if(wireRef.current){if(valid(id,side))void connect(id);else updateWire(null);}else{setSelectedEdge(null);updateWire({id,side,point:endpoint(id,side),target:null});}},
  });
  const cardProps=(id:string,open:()=>void):React.HTMLAttributes<HTMLElement>=>({
    onPointerDown:e=>{if(e.button!==0||busy||locked.current||failed||wireRef.current||(e.target as HTMLElement).closest('[data-graph-port]'))return;e.preventDefault();suppress.current=false;setSelectedEdge(null);const p=points[id];gesture.current={kind:'card',id,revision:nodes.find(n=>n.id===id)!.revision,pointer:e.pointerId,x:e.clientX,y:e.clientY,left:scroll.current!.scrollLeft,top:scroll.current!.scrollTop,start:p,previous:local[id],point:p,moved:false,persist:onLayout};e.currentTarget.setPointerCapture(e.pointerId);},
    onClickCapture:e=>{if(suppress.current){e.preventDefault();e.stopPropagation();suppress.current=false;}},
    onClick:e=>{if(!busy&&!locked.current&&!wireRef.current&&!(e.target as HTMLElement).closest('[data-graph-port]'))open();},
  });
  const updatePointer=(x:number,y:number)=>{
    const g=gesture.current;
    if(g?.kind==='pan'){scroll.current!.scrollLeft=g.left+g.x-x;scroll.current!.scrollTop=g.top+g.y-y;return;}
    if(g?.kind==='card'){
      if(!g.moved&&Math.hypot(x-g.x,y-g.y)<4)return;
      g.moved=true;suppress.current=true;setDragging(true);g.point={x:Math.max(32,g.start.x+(x-g.x+scroll.current!.scrollLeft-g.left)/zoom),y:Math.max(60,g.start.y+(y-g.y+scroll.current!.scrollTop-g.top)/zoom)};setLocal(old=>({...old,[g.id]:g.point}));return;
    }
    if(wireRef.current){if(g?.kind==='wire'&&Math.hypot(x-g.x,y-g.y)>=4)g.moved=true;updateWire({...wireRef.current,point:clientPoint(x,y),target:targetAt(x,y)});}
  };
  step.current=()=>{
    frame.current=null;const el=scroll.current,p=pointer.current,g=gesture.current;
    if(!el||!p||!g||g.kind==='pan'||!g.moved)return;
    const r=el.getBoundingClientRect(),speed=(v:number,min:number,max:number)=>v<min+36?-Math.min(12,(min+36-v)/3):v>max-36?Math.min(12,(v-max+36)/3):0;
    const left=el.scrollLeft,top=el.scrollTop;el.scrollLeft+=speed(p.x,r.left,r.right);el.scrollTop+=speed(p.y,r.top,r.bottom);
    if(left!==el.scrollLeft||top!==el.scrollTop)updatePointer(p.x,p.y);
    frame.current=requestAnimationFrame(()=>step.current());
  };
  const move=(e:React.PointerEvent)=>{
    if(gesture.current&&gesture.current.pointer!==e.pointerId)return;
    pointer.current={x:e.clientX,y:e.clientY};updatePointer(e.clientX,e.clientY);
    if(gesture.current&&frame.current===null)frame.current=requestAnimationFrame(()=>step.current());
  };
  const up=(e:React.PointerEvent)=>{
    const g=gesture.current;if(!g||g.pointer!==e.pointerId)return;gesture.current=null;pointer.current=null;setDragging(false);
    if(g.kind==='card'&&g.moved)void save({[g.id]:g.point},g.persist,{[g.id]:g.revision});
    if(g.kind==='wire'&&g.moved){const target=targetAt(e.clientX,e.clientY);if(target)void connect(target);else updateWire(null);}
  };
  const zoomTo=(next:number)=>{const el=scroll.current;if(!el||gesture.current)return;const clamped=Math.max(.35,Math.min(1.8,next));const x=(el.scrollLeft+el.clientWidth/2)/zoom,y=(el.scrollTop+el.clientHeight/2)/zoom;setZoom(clamped);requestAnimationFrame(()=>{el.scrollLeft=x*clamped-el.clientWidth/2;el.scrollTop=y*clamped-el.clientHeight/2;});};
  useEffect(()=>{
    const el=scroll.current;if(!el)return;
    const wheel=(e:WheelEvent)=>{
      if(e.defaultPrevented||!e.deltaY)return;
      const target=e.target instanceof Element?e.target:null;
      if(target?.closest('input,textarea,select,[contenteditable=true],[role=menu],.menu-panel,.graph-context-menu'))return;
      // Scrollable note/relationship text keeps its own wheel behavior.
      for(let node=target;node&&node!==el;node=node.parentElement){
        if(node.scrollHeight>node.clientHeight+1&&/^(auto|scroll)$/.test(getComputedStyle(node).overflowY))return;
      }
      e.preventDefault();zoomTo(zoom*(e.deltaY>0?.9:1.1));
    };
    el.addEventListener('wheel',wheel,{passive:false});return()=>el.removeEventListener('wheel',wheel);
  },[zoom]);
  const pan=(e:React.PointerEvent<HTMLDivElement>)=>{if(e.button!==0&&e.button!==1)return;if(e.button===0&&(e.target as HTMLElement).closest('.planning-card,[data-graph-drag],.relation-label,.edge-hit,button'))return;updateWire(null);setSelectedEdge(null);e.preventDefault();scroll.current?.focus({preventScroll:true});gesture.current={kind:'pan',pointer:e.pointerId,x:e.clientX,y:e.clientY,left:scroll.current!.scrollLeft,top:scroll.current!.scrollTop};e.currentTarget.setPointerCapture(e.pointerId);};
  const preview=wire&&points[wire.id]?curve(wire.side==='out'?endpoint(wire.id,'out'):wire.target?endpoint(wire.target,'out'):wire.point,wire.side==='in'?endpoint(wire.id,'in'):wire.target?endpoint(wire.target,'in'):wire.point):null;
  return{scroll,surface,points,zoom,zoomTo,wire,preview,selectedEdge,setSelectedEdge,portProps,cardProps,saving:pending,failed,dragging,
    scrollProps:{onPointerDown:pan,onPointerMove:move,onPointerUp:up,onPointerCancel:cancel,tabIndex:0,'aria-label':'画布：滚轮缩放，拖动空白处平移'},
    cancel,retry:()=>save(local),discard:()=>{setLocal({});setFailed(false);},arrange:(p:Record<string,Point>)=>{setLocal(p);void save(p);}};
}

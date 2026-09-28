import React,{useEffect,useRef,useState,useId} from 'react';
import {usePreference} from '../shared/state.js';
import {arrange} from './layout.js';
const statusNames={idea:'构想',selected:'准备采用',written:'已写入正文',dropped:'放弃'};
const edgeNames={next:'剧情推进',requires:'依赖铺垫',alternative:'备选分支'};
export function PlanningCanvas({nodes,childCounts={},edges,novelId,layer,seen,selected,onSelect,onEnter}) {
 const markerId=useId();
 const [positions,setPositions]=usePreference(`${novelId}:planning-layout:${layer||'root'}`,{}),[zoom,setZoom]=useState(1);const drag=useRef(null);
 const computed=arrange(nodes,edges);
 const nodeKey=nodes.map(n=>n.id).join('|');
 useEffect(()=>{setPositions(old=>{const next={...old};const occupied=new Set(Object.values(old).map(p=>`${p.x}:${p.y}`));for(const n of nodes)if(!next[n.id]){const point={...computed[n.id]};while(occupied.has(`${point.x}:${point.y}`))point.y+=170;next[n.id]=point;occupied.add(`${point.x}:${point.y}`);}return next;});},[nodeKey]);
 const point=(n,i)=>positions[n.id]||computed[n.id];
 const points=new Map(nodes.map((n,i)=>[n.id,point(n,i)]));
 const width=Math.max(800,...[...points.values()].map(p=>p.x+260)),height=Math.max(450,...[...points.values()].map(p=>p.y+155));
 const [dependencies,setDependencies]=useState(false);
 const scroll=useRef(null);
 return <><div className="row canvas-tools"><button onClick={()=>setZoom(z=>Math.max(.4,z-.1))}>−</button><span>{Math.round(zoom*100)}%</span><button onClick={()=>setZoom(z=>Math.min(1.6,z+.1))}>＋</button><button onClick={()=>setZoom(Math.min(1,(scroll.current?.clientWidth||800)/width))}>适应视图</button><details className="menu"><summary>视图</summary><div className="menu-panel"><button disabled={!selected} onClick={()=>{if(selected&&points.has(selected)){const p=points.get(selected);scroll.current?.scrollTo({left:Math.max(0,p.x*zoom-20),top:Math.max(0,p.y*zoom-20),behavior:'smooth'});}}}>定位选中</button><button onClick={()=>setPositions(arrange(nodes,edges))}>整理当前层</button><label className="row"><input type="checkbox" checked={dependencies} onChange={e=>setDependencies(e.target.checked)}/>显示依赖线</label></div></details></div><div className="planning-canvas-scroll" ref={scroll}><div style={{width:width*zoom,height:height*zoom}}><div className="planning-canvas" style={{width,height,transform:`scale(${zoom})`,transformOrigin:'top left'}}>
 <svg className="planning-lines" width={width} height={height} aria-label="规划连线"><defs><marker id={markerId} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0 L8 4 L0 8" fill="currentColor"/></marker></defs>{edges.filter(e=>points.has(e.from)&&points.has(e.to)&&(dependencies||e.type!=='requires')).map(e=>{const a=points.get(e.from),b=points.get(e.to);return <g key={e.id} opacity={selected&&e.from!==selected&&e.to!==selected?0.25:1}><path d={`M${a.x+220},${a.y+55} C${a.x+245},${a.y+55} ${b.x-25},${b.y+55} ${b.x},${b.y+55}`} fill="none" stroke="currentColor" strokeDasharray={e.type==='alternative'?'5 4':undefined} markerEnd={`url(#${markerId})`}/><text x={(a.x+220+b.x)/2} y={(a.y+b.y)/2+45}>{e.label||edgeNames[e.type]}</text></g>;})}</svg>
 {nodes.map((n,i)=>{const p=point(n,i);return <section key={n.id} className={`planning-card ${selected===n.id?'selected':''}`} style={{left:p.x,top:p.y}}><div className="drag-handle" onPointerDown={e=>{drag.current={id:n.id,x:e.clientX,y:e.clientY,start:p};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerMove={e=>{if(drag.current?.id===n.id){const d=drag.current;setPositions(old=>({...old,[n.id]:{x:Math.max(0,d.start.x+(e.clientX-d.x)/zoom),y:Math.max(0,d.start.y+(e.clientY-d.y)/zoom)}}));}}} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}}>⋮⋮ <span>{statusNames[n.status]}{n.lastSequence>seen?' · 有更新':''}</span></div><button className="planning-title" title={n.title} onClick={()=>onSelect(n.id)}>{n.title}</button><p title={n.summary}>{n.summary||'打开填写详细规划'}</p>{!!childCounts[n.id]&&<button onClick={()=>onEnter(n.id)}>子规划 · {childCounts[n.id]} →</button>}</section>;})}
 </div></div></div></>;
}

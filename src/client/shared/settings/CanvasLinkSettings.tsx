import React from 'react';
import {canvasLinkRoutes,type CanvasLinkStyle} from '../../../domain/canvas/link-style.ts';
import {routeJunctions} from '../../../domain/canvas/routing.ts';
import {SettingsRow} from './SettingsRow.tsx';
import {defaults,useWorkbenchPreferences} from './preferences-state.tsx';

const boxes=[{id:'a',x:12,y:130,width:100,height:90},{id:'b',x:480,y:16,width:100,height:90},{id:'c',x:480,y:260,width:100,height:90}];
const edges=[{id:'ab',from:'a',to:'b'},{id:'ac',from:'a',to:'c'}];
const choices=[
  {value:'organized',title:'整理连线',description:'圆角避让，分支与汇合更整齐。'},
  {value:'classic',title:'经典曲线',description:'独立的平滑曲线，接近早期样式。'},
] as const;
function Preview({style}:{style:CanvasLinkStyle}){
  const routes=canvasLinkRoutes(boxes,edges,'flow',style);
  return <svg viewBox="-20 -20 640 390" aria-hidden="true" focusable="false">
    <g fill="none" stroke="currentColor" strokeWidth={8} strokeLinecap="round" strokeLinejoin="round">{routes.map(route=><path key={route.id} d={route.path}/>)}</g>
    {routeJunctions(routes).map(row=><circle key={row.id} cx={row.point.x} cy={row.point.y} r={11} fill="currentColor"/>)}
    {boxes.map(box=><rect key={box.id} x={box.x} y={box.y} width={box.width} height={box.height} rx={12} fill="var(--cg-paper)" stroke="currentColor" strokeWidth={5}/>)}
  </svg>;
}
export function CanvasLinkSettings(){
  const {preferences,update}=useWorkbenchPreferences();
  const select=(value:CanvasLinkStyle)=>update({canvasLinkStyle:value});
  return <div className="settings-canvas-links">
    <SettingsRow title="画布连线样式" description="同时用于规划和设定，导出图片也会使用所选样式。" scope="此设备" reset={()=>select(defaults.canvasLinkStyle)}>{null}</SettingsRow>
    <div className="settings-link-options" role="radiogroup" aria-label="画布连线样式">{choices.map((choice,index)=><button key={choice.value} type="button" role="radio" aria-checked={preferences.canvasLinkStyle===choice.value} aria-label={choice.title} onClick={()=>select(choice.value)} onKeyDown={event=>{if(['ArrowLeft','ArrowUp','ArrowRight','ArrowDown'].includes(event.key)){event.preventDefault();const next=choices[(index+1)%choices.length];select(next.value);const group=event.currentTarget.parentElement;group?.querySelectorAll<HTMLButtonElement>('[role=radio]')[(index+1)%choices.length]?.focus();}}}>
      <Preview style={choice.value}/><strong>{choice.title}</strong><span>{choice.description}</span>
    </button>)}</div>
  </div>;
}

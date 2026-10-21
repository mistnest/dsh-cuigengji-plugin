import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {applyWithRPC} from '../../src/client/index.tsx';
import type {WorkbenchRPC} from '../../src/client/WorkbenchShell.tsx';

/** Exercise the real plugin registration in a narrow, clipping host panel. */
export function mountSidebarHost(rpc:WorkbenchRPC) {
  const registrations:{options:{name:string};Component:React.ComponentType<any>}[]=[];
  const source=(value:unknown)=>({getSnapshot:()=>value,subscribe:()=>()=>{}});
  applyWithRPC({
    effect:(fn:()=>void)=>fn(),sidebarRightTabs:{register:()=>()=>{}},
    sidebarRight:{mounted:source('production-preview')},workspaces:{list:source({phase:'ready',items:[]})},
    slots:{inject:(_:string,fn:()=>void)=>fn(),register:(options:any,Component:any)=>registrations.push({options,Component})},
  },rpc);
  const Tab=registrations.find(item=>item.options.name==='sidebar.right.pane.tab')!.Component;
  function Host() {
    const [visible,setVisible]=useState(true);
    return <>
      <style>{`
        .sidebar-fixture-chat {position:fixed;inset:0 460px 0 0;padding:20px;background:#edf0f6;font:14px system-ui;}
        .sidebar-fixture-chat textarea {position:absolute;left:20px;right:20px;bottom:20px;height:90px;resize:none;}
        .sidebar-fixture-panel {position:fixed;right:0;top:42px;bottom:0;width:min(460px,100vw);overflow:hidden;transform:translateZ(0);contain:paint;}
        .sidebar-fixture-panel[hidden] {display:none;}
        .sidebar-fixture-toggle {position:fixed;left:16px;top:8px;z-index:10;}
      `}</style>
      <div className="sidebar-fixture-chat"><p>隔离试用中的 DSH 聊天区</p><textarea aria-label="试用聊天输入"/></div>
      <button className="sidebar-fixture-toggle" onClick={()=>setVisible(value=>!value)}>{visible?'收起试用侧栏':'展开试用侧栏'}</button>
      <aside className="sidebar-fixture-panel" hidden={!visible}>
        <Tab sessionId="production-preview" useTabInfo={()=>({tab:{visible,navigation:{address:'dsh-resource://cuigengji/production-preview'}}})}/>
      </aside>
    </>;
  }
  createRoot(document.getElementById('root')!).render(<Host/>);
}

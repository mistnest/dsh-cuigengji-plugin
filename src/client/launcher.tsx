import React, {useEffect, useRef, useState} from 'react';
import type {SnapshotSelectorHook} from '@deepseek-ai/dsh-client-store';
import {styles} from './style.ts';

interface Workspace {workspaceId:string;title?:string;name?:string;cwd?:string;path?:string}
interface Props {
  wide:boolean;
  useNovelSession:SnapshotSelectorHook<string|undefined>;
  useNovelWorkspaces:SnapshotSelectorHook<{items:Workspace[];phase:string}>;
  useSessions:SnapshotSelectorHook<{byId:Record<string,{id:string;retainedBy:{mainView?:number}}>}>;
  openNovel:(id:string)=>void;
  revealConversation:()=>void;
  openWorkspace:(id:string,beforeOpen:(id:string)=>void)=>Promise<void>;
}
const launcherStyle=`
.cg-launcher {position:relative;width:100%;min-width:0;margin:4px 0;}
.cg-launcher-button {box-sizing:border-box;display:flex;align-items:center;gap:9px;width:100%;min-height:38px;border:1px solid transparent;border-radius:9px;padding:8px 10px;background:transparent;color:var(--dsw-alias-label-primary,#252936);font:500 13px/20px var(--dsw-font-family,system-ui,sans-serif);cursor:pointer;-webkit-app-region:no-drag;transition:background 120ms;}
.cg-launcher-button:hover {background:var(--dsw-alias-interactive-bg-hover,#4d6bfe10);}
.cg-launcher-button:focus-visible {outline:2px solid var(--dsw-focus-ring-color,#4d6bfe);outline-offset:-2px;}
.cg-launcher-button svg {flex:none;color:var(--dsw-alias-label-secondary,#6c7769);}
.cg-launcher-button[data-compact=true] {width:36px;min-height:36px;justify-content:center;padding:8px;}
.cg-launcher-hint {position:absolute;bottom:100%;left:0;z-index:100;width:220px;box-sizing:border-box;padding:12px;border:1px solid var(--dsw-alias-border-l1,#dde0e6);border-radius:10px;background:var(--dsw-alias-bg-base,#ffffff);color:var(--dsw-alias-label-primary,#252936);box-shadow:0 8px 24px #0002;font:13px/1.6 system-ui;}
.cuigengji.cg-launcher-dialog {height:fit-content;min-height:0;padding:24px;width:min(400px,calc(100vw - 32px));max-height:80dvh;border:1px solid var(--cg-line);border-radius:16px;background:var(--cg-paper);box-shadow:0 16px 60px #0003;}
.cg-launcher-dialog::backdrop {background:#0005;}
.cg-launcher-dialog h2 {font-size:18px;margin:0 0 8px;}
.cg-launcher-dialog .launcher-actions {display:flex;justify-content:flex-end;gap:8px;margin-top:20px;}
`;

export function BookIcon() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 5.5C9 3.5 5.5 3.5 3 4.5v14c2.5-1 6-1 9 1 3-2 6.5-2 9-1v-14c-2.5-1-6-1-9 1Z"/><path d="M12 5.5v14M6 8h3M15 8h3"/></svg>;
}

/** Root sidebar entry: independent of message count and the hidden blank-session header. */
export function Launcher({wide,useNovelSession,useNovelWorkspaces,useSessions,openNovel,revealConversation,openWorkspace}:Props) {
  const mounted=useNovelSession(value=>value), workspaces=useNovelWorkspaces(value=>value), sessions=useSessions(value=>value);
  const [choosing,setChoosing]=useState(false), [workspace,setWorkspace]=useState('');
  const [pending,setPending]=useState<string|null>(null), [busy,setBusy]=useState(false), [error,setError]=useState('');
  const dialog=useRef<HTMLDialogElement>(null), trigger=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(choosing)dialog.current?.showModal();},[choosing]);
  useEffect(()=>{
    if(!pending||!mounted)return;
    setPending(null);
    if(mounted!==pending)return;
    try {openNovel(mounted);} catch(e) {setError(e instanceof Error?e.message:String(e));}
  },[mounted,pending,openNovel]);
  const close=()=>{dialog.current?.close();setChoosing(false);trigger.current?.focus();};
  const open=()=>{
    setError('');
    try {
      if(mounted){openNovel(mounted);return;}
      const selected=Object.values(sessions.byId).find(s=>(s.retainedBy.mainView||0)>0)?.id;
      if(selected){setPending(selected);revealConversation();return;}
      setWorkspace(workspaces.items[0]?.workspaceId||'');setChoosing(true);
    } catch(e) {setError(e instanceof Error?e.message:String(e));}
  };
  const connect=async()=>{
    if(busy||!workspace)return;
    setBusy(true);setError('');
    try {await openWorkspace(workspace,id=>setPending(id));close();}
    catch(e){setPending(null);setError(e instanceof Error?e.message:String(e));}
    finally {setBusy(false);}
  };
  return <div className="cg-launcher"><style>{launcherStyle}</style>
    <button ref={trigger} className="cg-launcher-button" data-compact={!wide} type="button" title="催更姬 · 写作工作台" aria-label="打开催更姬" onClick={open}><BookIcon/>{wide&&<span>催更姬</span>}</button>
    {error&&!choosing&&<div className="cg-launcher-hint" role="alert">{error}</div>}
    {choosing&&<dialog ref={dialog} className="cuigengji cg-launcher-dialog" aria-label="打开写作工作台" onCancel={e=>{e.preventDefault();if(!busy)close();}}><style>{styles}</style>
      <h2>打开写作工作台</h2><p className="muted">选择一个 DSH 工作区即可开始，无需先发消息。</p>
      {workspaces.items.length?<label>工作区<select aria-label="工作区" value={workspace} disabled={busy} onChange={e=>setWorkspace(e.target.value)}>{workspaces.items.map(w=><option key={w.workspaceId} value={w.workspaceId}>{w.title||w.name||w.cwd||w.path||w.workspaceId}</option>)}</select></label>:<p>{workspaces.phase==='ready'?'请先在 DSH 左侧添加一个工作区，然后从这里进入。':'正在读取工作区…'}</p>}
      {error&&<p role="alert">{error}</p>}<div className="launcher-actions"><button onClick={close} disabled={busy}>取消</button><button className="primary" onClick={connect} disabled={busy||!workspace}>{busy?'正在打开…':'进入工作台'}</button></div>
    </dialog>}
  </div>;
}

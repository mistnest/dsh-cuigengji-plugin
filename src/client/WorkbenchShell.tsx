import {VariablesDialog} from './features/variables/index.tsx';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {PreferencesProvider, PreferencesDialog, AboutDialog, useWorkbenchPreferences} from './shared/preferences.tsx';
import { styles } from './style.ts';
import { DialogProvider, useDialog } from './dialog.tsx';
import { Memory } from './features/memory/index.tsx';
import { Manage } from './features/manage/index.tsx';
import { TransferPage } from './features/transfer/index.tsx';
import {Welcome} from './features/welcome/index.tsx';
import { Chapters } from './features/chapters/index.jsx';
import { Planning } from './features/planning/index.tsx';
import { Preset } from './features/preset/index.tsx';
import { SessionScope,LibraryScope } from './shared/state.js';
import { ResourceState } from './shared/ui.jsx';
import {WorkbenchHeader} from './shared/WorkbenchHeader.tsx';
import {RefreshProvider, useWorkbenchRefresh} from './shared/refresh.tsx';
import {notifyLibraryChanged, subscribeLibraryChanges,subscribeLibrarySwitches} from './shared/library-events.ts';
import {WorkbenchBoundary} from './shared/WorkbenchBoundary.tsx';
import {WritingRecords} from './features/pet/Records.tsx';
import type {RecordsNavigation} from './features/pet/records-navigation.ts';
import {SurfaceActivity,useSurfaceActivity} from './shared/surface-activity.ts';
import {guidanceStyle} from './shared/GuidanceToggle.tsx';


import {useWorkspacePreference,useWorkspaceResource,type FeatureCall,type FeatureRun} from './shared/workspace-state.ts';
import {useWorkbenchNavigation,type BookPage} from './shell/useWorkbenchNavigation.ts';
import type {BookSummary} from '../contracts/novels.ts';
export type WorkbenchRPC=(action:string,args:Record<string,unknown>,sessionId?:string)=>Promise<any>;
export interface WorkbenchProps {sessionId:string;rpc:WorkbenchRPC;recordsNavigation?:RecordsNavigation}
type Book=BookSummary;
interface Binding {novelId:string}

export function WorkbenchRoot(props:WorkbenchProps) {
  const [root,setRoot]=useState<string|null>(null);
  const [bootstrapError,setBootstrapError]=useState(''),[bootstrapAttempt,setBootstrapAttempt]=useState(0);
  useEffect(()=>{
    let live=true,settled=false;
    setRoot(null);setBootstrapError('');
    const timer=setTimeout(()=>{if(live&&!settled){settled=true;setBootstrapError('读取作品库超时，请重试。若仍无法打开，请确认催更姬插件已启用。');}},20_000);
    Promise.resolve().then(()=>props.rpc('settings.get',{},props.sessionId)).then(value=>{
      if(!live||settled)return;
      if(typeof value?.dataRoot!=='string'||!value.dataRoot.trim())throw new Error('未能取得作品库位置，请重试。');
      settled=true;clearTimeout(timer);setRoot(value.dataRoot);
    }).catch(error=>{
      if(!live||settled)return;
      settled=true;clearTimeout(timer);setBootstrapError(error instanceof Error?error.message:String(error));
    });
    const unsubscribe=subscribeLibrarySwitches(value=>{if(live){settled=true;clearTimeout(timer);setBootstrapError('');setRoot(value);}});
    return()=>{live=false;clearTimeout(timer);unsubscribe();};
  },[props.rpc,props.sessionId,bootstrapAttempt]);
  const rpc=useCallback<WorkbenchRPC>((action,args,sessionId)=>props.rpc(action,{...args,...(root?{__libraryRoot:root}:{})},sessionId),[props.rpc,root]);
  if(root===null)return <section className="cuigengji" aria-label="催更姬小说工作台"><style>{styles}</style>{bootstrapError?<div className="notice error" role="alert">{bootstrapError}<button onClick={()=>setBootstrapAttempt(value=>value+1)}>重试</button></div>:<p className="empty" role="status">正在读取作品库…</p>}</section>;
  return <LibraryScope.Provider key={root} value={root}><SessionScope.Provider value={props.sessionId}><RefreshProvider><PreferencesProvider><DialogProvider><WorkbenchContent {...props} rpc={rpc} /></DialogProvider></PreferencesProvider></RefreshProvider></SessionScope.Provider></LibraryScope.Provider>;
}

export function Workbench(props:WorkbenchProps) {
  return <WorkbenchBoundary key={props.sessionId}><WorkbenchRoot {...props}/></WorkbenchBoundary>;
}

function WorkbenchContent({ sessionId, rpc, recordsNavigation }:WorkbenchProps) {
  const hostActive=useSurfaceActivity();
  const {preferences}=useWorkbenchPreferences();
  const {refresh}=useWorkbenchRefresh();
  const [utility,setUtility]=useState<'settings'|'about'|'variables'|null>(null);
  const [settingsChild,setSettingsChild]=useState<'preset'|'data'|null>(null);
  const [viewedNovelId,setViewedNovelId]=useWorkspacePreference<string|null>('view-novel',null);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const base=useRef<HTMLDivElement>(null);
  const [recordsOpen,setRecordsOpen]=useState(false),[recordsScope,setRecordsScope]=useState<string|null>(null);
  const recordsReturnFocus=useRef<HTMLElement|null>(null);
  const recordsReturnSettings=useRef(false);
  const { ask, confirm, dismiss } = useDialog();
  const dismissDialog=useRef(dismiss);dismissDialog.current=dismiss;
  const call:FeatureCall = useCallback((action:string, args:Record<string,unknown> = {}) => rpc(action, args, sessionId), [rpc, sessionId]);
  const resource = useWorkspaceResource<[Book[],Binding|null]>(() => Promise.all([call('novel.list', {includeArchived:true}), call('binding.get')]), [call, tick]);
  const [library = [], binding = null] = resource.value || [];
  const guidance = useWorkspaceResource<{enabled:boolean}>(()=>call('guidance.get'),[call,tick]);
  const books=library.filter(book=>!book.archived), recycledCount=library.length-books.length;
  useEffect(()=>subscribeLibraryChanges(()=>setTick(value=>value+1)),[]);
  const novelId = books.some(n=>n.id===viewedNovelId)?viewedNovelId||undefined:binding?.novelId;
  const novel = books.find(n => n.id === novelId);
  const navigation=useWorkbenchNavigation(sessionId,novelId);
  const {tab,homeOpen,referenceReturn,openManagement,openTransfer,managementBack,transferVisit,transferInitial,manageInitial,jump}=navigation;
  const showHome=homeOpen||(!novelId&&!['data','manage'].includes(tab));
  const openRecords=useCallback((scope:string|null,fromSettings=false)=>{
    recordsReturnSettings.current=fromSettings;
    recordsReturnFocus.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    dismissDialog.current();setUtility(null);setRecordsScope(scope);setRecordsOpen(true);
  },[]);
  const closeRecords=()=>{setRecordsOpen(false);if(recordsReturnSettings.current){setUtility('settings');return;}requestAnimationFrame(()=>{
    const target=recordsReturnFocus.current?.isConnected&&!recordsReturnFocus.current.closest('[hidden]')?recordsReturnFocus.current:document.querySelector<HTMLElement>('.workbench-navigation button[aria-label="设置"]');
    target?.focus({preventScroll:true});
  });};
  useEffect(()=>{
    if(!recordsNavigation||!resource.value)return;
    const consume=()=>{if(recordsNavigation.consume(sessionId))openRecords(binding?.novelId||null);};
    const unsubscribe=recordsNavigation.subscribe(sessionId,consume);consume();return unsubscribe;
  },[recordsNavigation,sessionId,Boolean(resource.value),binding?.novelId,openRecords]);
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{document.querySelectorAll<HTMLDetailsElement>('.cuigengji details.menu[open]').forEach(menu=>{if(!menu.contains(event.target as Node))menu.open=false;});};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){document.querySelectorAll<HTMLDetailsElement>('.cuigengji details.menu[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary')?.focus();});}};
    const activate=(event:MouseEvent)=>{const target=event.target instanceof Element?event.target:null;const menu=target?.closest<HTMLDetailsElement>('details.menu');if(menu&&target?.closest('button'))menu.open=false;};
    document.addEventListener('click',activate);document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('click',activate);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[]);
  const running = useRef(false);
  const run:FeatureRun = async fn => {
    if (running.current) return;
    running.current = true;
    setBusy(true); setError('');
    try { await fn(); setTick(x => x + 1); return true; }
    catch (e) { setError(e instanceof Error?e.message:String(e)); return false; }
    finally { running.current = false; setBusy(false); }
  };
  const create = async () => { const title = await ask('作品名称'); if (title?.trim()) run(async () => { const n = await call('novel.create', { title }); setViewedNovelId(n.id);navigation.openBookPage(); }); };
  const openNovel=(id:string)=>{setSettingsChild(null);setViewedNovelId(id);navigation.openBookPage();};
  const toggleGuidance=()=>run(()=>call('guidance.set',{enabled:!guidance.value?.enabled}));
  const exportBook=(id:string)=>openTransfer({mode:'export',selection:{kind:'works',novelIds:[id]}});
  const recycleNovel=async (book:Book)=>{
    if(busy||!await confirm(`将《${book.title}》移入回收站？\n正文、章节历史、设定、规划和写作预设会完整保留，之后可以恢复。相关会话将解除作品绑定。`))return;
    await run(async()=>{await call('novel.archive',{novelId:book.id,expectedRevision:book.revision,requestId:crypto.randomUUID(),confirm:true});if(novelId===book.id){setViewedNovelId(null);navigation.goHome();}notifyLibraryChanged();});
  };
  const welcomeProps={books,busy,recycledCount,onOpen:openNovel,onCreate:create,onImport:()=>openTransfer({mode:'import',selection:{kind:'works'}}),onExport:exportBook,onManage:()=>openManagement('manage'),onRecycle:recycleNovel,onTrash:()=>openManagement('manage','recycle')};
  const childBack=settingsChild===tab?{onBack:()=>{managementBack.onBack();setSettingsChild(null);setUtility('settings');},backLabel:'返回设置'}:managementBack;
  const manageProps={call,novelId,novel,run,busy,tick,initialView:manageInitial,onTransfer:openTransfer,...childBack};
  useEffect(()=>{if(base.current)base.current.inert=recordsOpen;},[recordsOpen]);
  return <section className="cuigengji" data-motion={preferences.motion} style={{'--prose-size':`${preferences.fontSize}px`,'--prose-leading':preferences.leading} as React.CSSProperties} aria-label="催更姬小说工作台">
    <style>{styles}{guidanceStyle}</style>
    <SurfaceActivity.Provider value={hostActive&&!recordsOpen}><div className="workbench-base" ref={base} aria-hidden={recordsOpen||undefined}>
    <WorkbenchHeader home={showHome} novelTitle={novel?.title} tab={tab} showTabs={['chapters','plan','memory'].includes(tab)} busy={busy} refreshing={resource.loading} onHome={()=>{setSettingsChild(null);navigation.goHome();}} onTab={page=>{setSettingsChild(null);navigation.openBookPage(page as BookPage);}} onRefresh={refresh} onSettings={()=>setUtility('settings')} onAbout={()=>setUtility('about')}/>
    {error && <div className="notice error" role="alert">{error}<button onClick={()=>setError('')}>关闭提示</button></div>}

    <SurfaceActivity.Provider value={hostActive&&!recordsOpen&&!utility}><ResourceState resource={resource}>
      {homeOpen?<Welcome {...welcomeProps}/>:tab==='data'?<TransferPage key={transferVisit} {...{call,run,busy,novelId}} {...childBack} initial={transferInitial||undefined} onOpen={openNovel}/>:<>
      {!novelId ? (tab==='manage'?<Manage {...manageProps}/>:<Welcome {...welcomeProps}/>) : <div className="workbench-body" key={novelId}>
        {referenceReturn&&<div className="return-strip"><button onClick={()=>{navigation.backFromReference();}}>‹ 返回{({chapters:'正文',plan:'规划',memory:'设定'})[referenceReturn]||'上一页'}</button></div>}
        {tab==='chapters' && <Chapters {...{call,novelId,tick,run,busy}} onTransfer={openTransfer} onLocate={(kind:string,id:string)=>kind==='memory'?jump('memory','memory-selected',id):jump('plan','planning-selected',id)}/>}
        {tab==='memory' && <Memory {...{call,novelId,tick,run,busy}} novelTitle={novel?.title} onTransfer={openTransfer}/>}
        {tab==='plan' && <Planning {...{call,novelId,tick,run,busy}} novelTitle={novel?.title} onTransfer={openTransfer} onMemory={(id:string)=>jump('memory','memory-selected',id)} onChapter={(id:string)=>jump('chapters','chapter',id)}/>}
        {tab==='preset' && <Preset {...{call,novelId,run,busy}} {...childBack} onTransfer={openTransfer}/>}
        {tab==='manage' && <Manage {...manageProps}/>}
      </div>}
      </>}
    </ResourceState></SurfaceActivity.Provider>
    {utility==='settings'&&<PreferencesDialog onVariables={novelId?()=>setUtility('variables'):undefined} close={()=>setUtility(null)} call={call} guidance={{enabled:guidance.value?.enabled,disabled:busy||guidance.loading,onToggle:toggleGuidance}} onData={()=>{setUtility(null);setSettingsChild('data');openTransfer({mode:'export',selection:{kind:'workspace'}});}} novelTitle={novel?.title} onPreset={novelId?()=>{setUtility(null);setSettingsChild('preset');openManagement('preset');}:undefined} onRecords={()=>openRecords(novelId||null,true)}/>}
    {utility==='about'&&<AboutDialog close={()=>setUtility(null)}/>}
    {utility==='variables'&&novelId&&<VariablesDialog rpc={call} novelId={novelId} title={novel?.title} onClose={()=>setUtility('settings')}/>}
    </div></SurfaceActivity.Provider>
    {recordsOpen&&<WritingRecords rpc={rpc} sessionId={sessionId} novels={library} initialNovelId={recordsScope} onClose={closeRecords}/>}
  </section>;
}

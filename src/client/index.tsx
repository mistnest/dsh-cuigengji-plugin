// The workbench is the typed migration boundary; legacy JSX modules are intentionally
// consumed without declaration generation while they are migrated incrementally.
// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { styles } from './style.ts';
import { DialogProvider, useDialog } from './dialog.tsx';
import { LocaleContext, registerLocale } from './locale.js';
import { Memory } from './features/memory/index.jsx';
import { Context } from './features/context/index.jsx';
import { Manage } from './features/manage/index.jsx';
import { WorkDataPage } from './features/work-data/index.tsx';
import { Chapters } from './features/chapters/index.jsx';
import { Planning } from './features/planning/index.jsx';
import { Preset } from './features/preset/index.jsx';
import { SessionScope, usePreference, useResource } from './shared/state.js';
import { ResourceState } from './shared/ui.jsx';

const ID = 'dsh-cuigengji';
const RPC_ENDPOINT = 'cuigengji/dispatch';
const message = error => error?.message || String(error);
export const inject = ['connection', 'slots', 'sidebarRight', 'sidebarRightTabs', 'locale'];
export function apply(ctx) {
  const rpc = async (action, args, sessionId) => {
    const result = await ctx.connection.rpc.call('/api', RPC_ENDPOINT, { action, args, sessionId });
    if (!result.ok) throw Object.assign(new Error(result.error.message), { code: result.error.code });
    return result.value;
  };
  return applyWithRPC(ctx, rpc);
}

export function applyWithRPC(ctx, rpc) {
  const t = ctx.locale ? registerLocale(ctx) : key => ({ title: '催更姬', open: '打开小说目录、正文和设定' }[key]);
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: ID, kind: 'cuigengji', keepMounted: true,
    patterns: ['dsh-resource://cuigengji/**'], title: () => t('title'),
  }));
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions', id: ID, order: 40,
    inject: sessionId => ({ openNovel: () => ctx.sidebarRight.openResource(`dsh-resource://cuigengji/${encodeURIComponent(sessionId)}`) }),
  }, ({ openNovel }) => <button type="button" onClick={openNovel} title={t('open')}>{t('title')}</button>));
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab', key: ID,
  }, props => {
    const tab = props.useTabInfo();
    const address = tab.tab.navigation.address;
    const sessionId = decodeURIComponent(address.slice(address.lastIndexOf('/') + 1));
    return <LocaleContext.Provider value={ctx.locale}><Workbench key={sessionId} sessionId={sessionId} rpc={rpc} /></LocaleContext.Provider>;
  }));
}

export function Workbench(props) {
  return <SessionScope.Provider value={props.sessionId}><DialogProvider><WorkbenchContent {...props} /></DialogProvider></SessionScope.Provider>;
}

function WorkbenchContent({ sessionId, rpc }) {
  const [tab, setTab] = usePreference('page', 'chapters');
  const [returnTarget,setReturnTarget]=useState(null);
  const [referenceOpen,setReferenceOpen]=useState(false);
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const { ask } = useDialog();
  const call = useCallback((action, args = {}) => rpc(action, args, sessionId), [rpc, sessionId]);
  const resource = useResource(() => Promise.all([call('novel.list'), call('binding.get')]), [call, tick]);
  const [books = [], binding = null] = resource.value || [];
  const novelId = binding?.novelId, novel = books.find(n => n.id === novelId);
  useEffect(()=>{
    const outside=event=>{document.querySelectorAll('.cuigengji details.menu[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});};
    const escape=event=>{if(event.key==='Escape'){document.querySelectorAll('.cuigengji details.menu[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary')?.focus();});}};
    const activate=event=>{const menu=event.target.closest?.('details.menu');if(menu&&event.target.closest('button'))menu.open=false;};
    document.addEventListener('click',activate);document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('click',activate);document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[]);
  const running = useRef(false);
  const run = async fn => {
    if (running.current) return;
    running.current = true;
    setBusy(true); setError('');
    try { await fn(); setTick(x => x + 1); return true; }
    catch (e) { setError(message(e)); return false; }
    finally { running.current = false; setBusy(false); }
  };
  const create = async () => { const title = await ask('作品名称'); if (title?.trim()) run(async () => { const n = await call('novel.create', { title }); await call('binding.set', { novelId: n.id }); setTab('chapters'); }); };
  const openNovel=id=>run(async()=>{await call('binding.set',{novelId:id});setTab('chapters');setReturnTarget(null);});
  const jump=(page,key,id)=>{setReturnTarget(tab);try{localStorage.setItem(`cuigengji:ui:${sessionId}:${novelId}:${key}`,JSON.stringify(id));}catch{}setTab(page);};
  return <section className="cuigengji" aria-label="催更姬小说工作台">
    <style>{styles}</style>
    <header className="workbench-header">
      <div className="identity"><div className="row compact header-row">
        <select aria-label="绑定小说" className="book-picker grow" disabled={busy || !resource.value} value={novelId || ''} onChange={e => { if(e.target.value) openNovel(e.target.value); }}>
          <option value="">选择作品</option>{books.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
        </select>{novelId&&<button className={`reference-link ${referenceOpen?'active':''}`} onClick={()=>setReferenceOpen(v=>!v)}>{referenceOpen?'关闭参考':'AI 参考'}</button>}<details className="menu"><summary aria-label="作品操作">···</summary><div className="menu-panel"><button onClick={create} disabled={busy}>新建作品</button><button onClick={()=>setTab('manage')}>作品与备份</button><button onClick={()=>setTab('preset')}>写作预设</button><button onClick={resource.retry}>刷新作品</button></div></details>
      </div></div>
      {novelId && <nav aria-label="小说功能">{[['chapters','正文'],['plan','规划'],['memory','资料']].map(([id,label]) => <button key={id} aria-pressed={tab===id} className={tab===id?'selected':''} onClick={()=>{setReturnTarget(null);setReferenceOpen(false);setTab(id);}}>{label}</button>)}</nav>}

    </header>
    {error && <div className="notice error" role="alert">{error}<button onClick={()=>setError('')}>关闭提示</button></div>}
    <div className="row" style={{padding:'4px 16px'}}><button onClick={()=>setTab('data')} aria-pressed={tab==='data'}>工作数据 · 导入/导出</button></div>
    <ResourceState resource={resource}>
      {tab==='data'?<div className="page"><WorkDataPage {...{call,run,busy}}/></div>:<>
      {!novelId ? <div className="page">{tab==='manage'?<><button onClick={()=>setTab('chapters')}>‹ 返回作品选择</button><Manage {...{call,run,busy}} onOpen={openNovel}/></>:<div className="empty"><h2>从一本作品开始</h2><p>从上方选择作品，或创建一本。</p><div className="row"><button className="primary" onClick={create}>新建作品</button><button onClick={()=>setTab('manage')}>导入已有作品</button></div></div>}</div> : <div className="workbench-body" key={novelId}>{returnTarget&&<div className="return-strip"><button onClick={()=>{setTab(returnTarget);setReturnTarget(null);}}>‹ 返回{({plan:'规划',memory:'设定'})[returnTarget]||'上一页'}</button></div>}
        {tab==='chapters' && <Chapters {...{call,novelId,tick,run,busy}}/>}
        {tab==='memory' && <div className="page"><Memory {...{call,novelId,tick,run,busy}} onChapter={id=>jump('chapters','chapter',id)}/></div>}
        {tab==='plan' && <Planning {...{call,novelId,tick,run,busy}} onMemory={id=>jump('memory','memory-selected',id)} onChapter={id=>jump('chapters','chapter',id)}/>}
        {tab==='preset' && <Preset {...{call,novelId,run,busy}}/>}
        {tab==='context' && <div className="page"><Context {...{call,novelId,tick}} onNavigate={setTab}/></div>}
        {tab==='manage' && <div className="page"><Manage {...{call,novelId,novel,run,busy}} onOpen={openNovel}/></div>}
      </div>}
      </>}
    </ResourceState>
    {referenceOpen && novelId && <aside className="reference-drawer"><div className="reference-drawer-head"><strong>AI 参考</strong><button aria-label="关闭 AI 参考" onClick={()=>setReferenceOpen(false)}>关闭</button></div><Context {...{call,novelId,tick}} onNavigate={next=>{setReferenceOpen(false);setTab(next);}}/></aside>}
  </section>;
}

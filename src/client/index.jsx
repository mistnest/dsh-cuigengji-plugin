import React, { useCallback, useRef, useState } from 'react';
import { styles } from './style.js';
import { DialogProvider, useDialog } from './dialog.jsx';
import { LocaleContext, registerLocale, useText } from './locale.js';
import { Memory } from './memory/index.jsx';
import { Context } from './context/index.jsx';
import { Manage } from './manage/index.jsx';
import { Chapters } from './chapters/index.jsx';
import { Plan } from './plan/index.jsx';
import { Preset } from './preset/index.jsx';
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
  const [error, setError] = useState(''), [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const { ask } = useDialog();
  const call = useCallback((action, args = {}) => rpc(action, args, sessionId), [rpc, sessionId]);
  const resource = useResource(() => Promise.all([call('novel.list'), call('binding.get')]), [call, tick]);
  const [books = [], binding = null] = resource.value || [];
  const novelId = binding?.novelId, novel = books.find(n => n.id === novelId);
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
  return <section className="cuigengji" aria-label="催更姬小说工作台">
    <style>{styles}</style>
    <header className="workbench-header">
      <div className="identity"><span className="eyebrow">催更姬 · 写作工作台</span><div className="row compact">
        <select aria-label="绑定小说" className="book-picker grow" disabled={busy || !resource.value} value={novelId || ''} onChange={e => { if(e.target.value) run(async () => { await call('binding.set', { novelId:e.target.value }); setTab('chapters'); }); }}>
          <option value="">选择作品</option>{books.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
        </select><details className="menu"><summary aria-label="作品操作">···</summary><div className="menu-panel"><button onClick={create} disabled={busy}>新建作品</button><button disabled={!novelId} onClick={()=>setTab('preset')}>写作预设</button><button onClick={()=>setTab('manage')}>作品与备份</button><button onClick={resource.retry}>刷新作品</button></div></details>
      </div></div>
      {novelId && <nav aria-label="小说功能">{[['chapters','正文'],['memory','设定'],['plan','规划'],['context','资料']].map(([id,label]) => <button key={id} aria-pressed={tab===id} className={tab===id?'selected':''} onClick={()=>setTab(id)}>{label}</button>)}</nav>}
    </header>
    {error && <div className="notice error" role="alert">{error}<button onClick={()=>setError('')}>关闭提示</button></div>}
    <ResourceState resource={resource}>
      {!novelId ? <div className="page"><div className="empty"><h2>从一本作品开始</h2><p>在这里整理正文与设定，在左侧对话里和 Agent 讨论。</p><button className="primary" onClick={create}>新建作品</button><p className="muted">已有作品？从上方列表选择。旧项目可在“作品与备份”中导入。</p></div><Manage {...{call,run,busy}} /></div> : <div className="workbench-body" key={novelId}>
        {tab==='chapters' && <Chapters {...{call,novelId,tick,run,busy,binding}}/>}
        {tab==='memory' && <div className="page"><Memory {...{call,novelId,tick,run,busy}}/></div>}
        {tab==='plan' && <Plan {...{call,novelId,tick,run,busy}}/>}
        {tab==='preset' && <Preset {...{call,novelId,run,busy}}/>}
        {tab==='context' && <div className="page"><Context {...{call,novelId,tick}}/></div>}
        {tab==='manage' && <div className="page"><Manage {...{call,novelId,novel,run,busy}}/></div>}
      </div>}
    </ResourceState>
  </section>;
}

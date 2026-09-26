import React, { useCallback, useEffect, useState } from 'react';
import { styles } from './style.js';

const ID = 'dsh-cuigengji';
const array = value => Array.isArray(value) ? value : value?.items ?? [];
const message = error => error?.message || String(error);
const ask = (label, value = '') => window.prompt(label, value);
const confirm = label => window.confirm(label);
async function readChapter(call, novelId, chapterId) {
  const first = await call('chapter.get', {novelId, chapterId, maxChars:200000});
  let next = first.nextStart, content = first.content;
  while (next !== null) {
    const page = await call('chapter.get', {novelId,chapterId,start:next,maxChars:200000});
    if (page.revision !== first.revision) throw new Error('读取期间正文已变化，请重新读取。');
    content += page.content; next = page.nextStart;
  }
  return {...first,content};
}

export const inject = ['connection', 'slots', 'sidebarRight', 'sidebarRightTabs'];
export function apply(ctx) {
  const rpc = async (action, args, sessionId) => {
    const result = await ctx.connection.rpc.call('/cuigengji', 'dispatch', { action, args, sessionId });
    if (!result.ok) throw Object.assign(new Error(result.error.message), { code: result.error.code });
    return result.value;
  };
  return applyWithRPC(ctx, rpc);
}

export function applyWithRPC(ctx, rpc) {
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: ID, kind: 'cuigengji', keepMounted: true,
    patterns: ['dsh-resource://cuigengji/**'], title: () => '催更姬',
  }));
  ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
    name: 'conversation.session.header.actions', id: ID, order: 40,
    inject: sessionId => ({ openNovel: () => ctx.sidebarRight.openResource(`dsh-resource://cuigengji/${encodeURIComponent(sessionId)}`) }),
  }, ({ openNovel }) => <button type="button" onClick={openNovel} title="打开小说目录、正文和设定">催更姬</button>));
  ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
    name: 'sidebar.right.pane.tab', key: ID,
  }, props => {
    const tab = props.useTabInfo();
    const address = tab.tab.navigation.address;
    const sessionId = decodeURIComponent(address.slice(address.lastIndexOf('/') + 1));
    return <Workbench key={sessionId} sessionId={sessionId} rpc={rpc} />;
  }));
}

export function Workbench({ sessionId, rpc }) {
  const [novels, setNovels] = useState([]), [binding, setBinding] = useState(null);
  const [tab, setTab] = useState('chapters'), [error, setError] = useState('');
  const [busy, setBusy] = useState(false), [tick, setTick] = useState(0);
  const call = useCallback((action, args = {}) => rpc(action, args, sessionId), [rpc, sessionId]);
  const refresh = useCallback(async () => {
    const [books, bound] = await Promise.all([call('novel.list'), call('binding.get')]);
    setNovels(array(books)); setBinding(bound);
  }, [call]);
  useEffect(() => { refresh().catch(e => setError(message(e))); }, [refresh]);
  const run = async fn => {
    setBusy(true); setError('');
    try { await fn(); await refresh(); setTick(x => x + 1); }
    catch (e) { setError(message(e)); }
    finally { setBusy(false); }
  };
  const novelId = binding?.novelId;
  const novel = novels.find(n => n.id === novelId);
  return <section className="cuigengji" aria-label="催更姬小说工作台">
    <style>{styles}</style>
    <h2>{novel?.title || '催更姬'}</h2>
    <div className="row">
      <select aria-label="绑定小说" className="grow" disabled={busy} value={novelId || ''} onChange={e => e.target.value && run(() => call('binding.set', { novelId: e.target.value }))}>
        <option value="">选择本会话的小说</option>{novels.map(n => <option key={n.id} value={n.id}>{n.title}</option>)}
      </select>
      <button disabled={busy} onClick={() => { const title = ask('小说名称'); if (title?.trim()) run(async () => { const n = await call('novel.create', { title }); await call('binding.set', { novelId: n.id }); }); }}>新建小说</button>
      <button disabled={busy} onClick={() => run(async () => {})}>刷新</button>
    </div>
    {error && <div className="notice error" role="alert">{error}</div>}
    {busy && <p role="status" className="muted">正在保存…</p>}
    {!novelId ? <><p>绑定一本小说后，在 DSH 对话中讨论、写作和修改。不同会话可共同使用一本小说。</p><Manage {...{call,run,busy}} /></> : <>
      <nav aria-label="小说功能">{[['chapters','卷章正文'],['memory','世界与人物'],['plan','情节规划'],['context','参考资料'],['manage','小说管理']].map(([id,label]) => <button key={id} aria-selected={tab === id} onClick={() => setTab(id)}>{label}</button>)}</nav>
      <div key={novelId}>
        {tab === 'chapters' && <Chapters {...{call, novelId, tick, run, busy}} />}
        {tab === 'memory' && <Memory {...{call, novelId, tick, run, busy}} />}
        {tab === 'plan' && <Plan {...{call, novelId, tick, run, busy}} />}
        {tab === 'context' && <Context {...{call, novelId, tick}} />}
        {tab === 'manage' && <Manage {...{call, novelId, novel, run, busy}} />}
      </div>
    </>}
  </section>;
}

function Chapters({ call, novelId, tick, run, busy }) {
  const [chapters, setChapters] = useState([]), [volumes, setVolumes] = useState([]), [id, setId] = useState('');
  const [error, setError] = useState(''), [deleted, setDeleted] = useState(false);
  const refresh = useCallback(async () => {
    const [cs, vs] = await Promise.all([call('chapter.list', { novelId, includeDeleted: deleted }), call('volume.list', { novelId })]);
    setChapters(array(cs)); setVolumes(array(vs));
  }, [call, novelId, deleted]);
  useEffect(() => {
    let live = true;
    const load = () => live && refresh().catch(e => live && setError(message(e)));
    load(); const timer = setInterval(load, 5000);
    return () => { live = false; clearInterval(timer); };
  }, [refresh, tick]);
  return <>
    <div className="row">
      <button disabled={busy} onClick={() => { const title = ask('新卷名称'); if (title) run(() => call('volume.create', { novelId, title })); }}>新建卷</button>
      <button disabled={busy} onClick={() => { const title = ask('章节名称'); if (title) run(async () => { const ch = await call('chapter.create', { novelId, title, content: '' }); setId(ch.id); }); }}>新建章节</button>
      <label className="row"><input type="checkbox" checked={deleted} onChange={e => setDeleted(e.target.checked)} />显示已删除</label>
    </div>
    {error && <p role="alert">{error}</p>}
    {volumes.map(v => <div key={v.id} className="row"><strong className="grow">{v.title}</strong>
      <button disabled={busy} onClick={() => { const title = ask('卷名称', v.title); if (title) run(() => call('volume.update', { novelId, volumeId:v.id, title, expectedRevision:v.revision })); }}>改名</button>
      <button disabled={busy} onClick={() => { const order = ask('卷排序值（越小越靠前）',String(v.order)); if(order!==null)run(()=>call('volume.update',{novelId,volumeId:v.id,order:Number(order),expectedRevision:v.revision})); }}>排序</button>
      <button disabled={busy} onClick={() => { if (confirm(`删除卷“${v.title}”？卷内章节保留。`)) run(() => call('volume.delete', { novelId, volumeId:v.id, expectedRevision:v.revision, confirm:true,chapterPolicy:'detach' })); }}>删除卷</button>
    </div>)}
    <div className="list" aria-label="章节目录">{chapters.map(c => <button key={c.id} className={id === c.id ? 'selected' : ''} onClick={() => { setId(c.id); run(() => call('binding.set',{novelId,chapterId:c.id})); }}>{c.deleted ? '已删除 · ' : ''}{volumes.find(v => v.id === c.volumeId)?.title ? `${volumes.find(v => v.id === c.volumeId).title} / ` : ''}{c.title} <span className="muted">· 版本 {c.revision}</span></button>)}</div>
    {!chapters.length && <p className="muted">还没有章节。可以新建，或在对话中让 Agent 开始写作。</p>}
    {id && <ChapterEditor key={id} {...{call, novelId, tick, run, busy, volumes}} chapterId={id} latest={chapters.find(c => c.id === id)} />}
  </>;
}

function ChapterEditor({ call, novelId, chapterId, latest, tick, run, busy, volumes }) {
  const [base, setBase] = useState(null), [content, setContent] = useState(''), [title, setTitle] = useState('');
  const [volumeId, setVolumeId] = useState(''), [error, setError] = useState(''), [history, setHistory] = useState([]), [comparison, setComparison] = useState(null);
  const key = `cuigengji:draft:${novelId}:${chapterId}`;
  const dirty = base && (content !== base.content || title !== base.title || volumeId !== (base.volumeId || ''));
  const install = c => { setBase(c); setContent(c.content); setTitle(c.title); setVolumeId(c.volumeId || ''); };
  useEffect(() => {
    let live = true;
    readChapter(call, novelId, chapterId).then(c => {
      if (!live) return; install(c);
      try { const draft = JSON.parse(localStorage.getItem(key)); if (draft) { setBase(draft.base); setContent(draft.content); setTitle(draft.title); setVolumeId(draft.volumeId); } } catch {}
    }).catch(e => live && setError(message(e)));
    return () => { live = false; };
  }, [call, novelId, chapterId, key]);
  useEffect(() => {
    if (!base) return;
    try { if (dirty) localStorage.setItem(key, JSON.stringify({base,content,title,volumeId})); else localStorage.removeItem(key); } catch { setError('浏览器草稿保存失败，请及时保存正文。'); }
  }, [base, content, title, volumeId, dirty, key]);
  useEffect(() => {
    const warn = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  useEffect(() => { call('chapter.history', {novelId, chapterId,includeContent:true}).then(h => setHistory(array(h))).catch(e => setError(message(e))); }, [call, novelId, chapterId, tick]);
  if (!base) return <p role="status">{error || '读取正文…'}</p>;
  const conflict = latest && latest.revision !== base.revision;
  const reload = async () => { const c = await readChapter(call,novelId,chapterId); install(c); setComparison(null); };
  return <>
    <h3>编辑正文</h3>
    {error && <p role="alert">{error}</p>}
    {conflict && <div className="notice">其他会话已更新本章。你的草稿仍然保留；请读取最新版本进行比较，再决定合并内容。
      <button onClick={() => run(async () => setComparison(await readChapter(call,novelId,chapterId)))}>查看最新正文</button>
    </div>}
    <label>章节名<input disabled={busy} value={title} onChange={e => setTitle(e.target.value)} /></label>
    <label>所属卷<select disabled={busy} value={volumeId} onChange={e => setVolumeId(e.target.value)}><option value="">未分卷</option>{volumes.map(v => <option key={v.id} value={v.id}>{v.title}</option>)}</select></label>
    <label>正文<textarea disabled={busy} className="prose" value={content} onChange={e => setContent(e.target.value)} /></label>
    <p className="muted">{content.length} 字符 · 基准版本 {base.revision} · {dirty ? '草稿尚未写入小说' : '已保存'}</p>
    <div className="row">
      <button disabled={busy || !dirty || !!base.deleted} onClick={() => run(async () => { const c = await call('chapter.update', {novelId,chapterId,content,title,volumeId:volumeId || null,expectedRevision:base.revision,expectedHash:base.contentHash,reason:'作者手动编辑'}); install({...c,content}); })}>保存正文</button>
      <button disabled={busy} onClick={() => { if (!dirty || confirm('丢弃本地草稿，加载最新正文？')) run(reload); }}>重新读取</button>
      <button disabled={busy||dirty} onClick={()=>{const order=ask('章节排序值（越小越靠前）',String(base.order));if(order!==null)run(async()=>{await call('chapter.update',{novelId,chapterId,order:Number(order),expectedRevision:base.revision});await reload();});}}>章节排序</button>
      <button disabled={busy || !!base.deleted} onClick={() => { if (confirm('将本章移入已删除？可以通过历史版本恢复。')) run(async () => { await call('chapter.delete',{novelId,chapterId,expectedRevision:base.revision,confirm:true}); await reload(); }); }}>删除章节</button>
    </div>
    {comparison && <div><h3>版本比较</h3><div className="split"><div><strong>当前草稿</strong><pre>{content}</pre></div><div><strong>版本 {comparison.revision}</strong><pre>{comparison.content}</pre></div></div>
      {!comparison.deleted && comparison.revision === latest?.revision && <button disabled={busy} onClick={() => { if (confirm('保留当前草稿，以此版本作为合并基准？请先确认已手动合并所需内容。')) setBase(comparison); }}>已合并，更新保存基准</button>}
    </div>}
    <details><summary>修改历史（{history.length}）</summary>{history.map(h => <div className="row" key={h.revision}><span className="grow">版本 {h.revision} · {h.reason || h.updatedAt || h.createdAt || ''}</span>
      <button onClick={() => setComparison(h)}>比较</button>
      <button disabled={busy} onClick={() => { if (confirm(`恢复版本 ${h.revision}？当前草稿将被替换，已保存的历史仍保留。`)) run(async () => { await call('chapter.restore',{novelId,chapterId,targetRevision:h.revision,expectedRevision:base.revision}); await reload(); }); }}>恢复</button>
    </div>)}</details>
  </>;
}

function Memory({call, novelId, tick, run, busy}) {
  const [nodes,setNodes] = useState([]), [edges,setEdges] = useState([]), [query,setQuery] = useState(''), [type,setType] = useState('');
  const [node,setNode] = useState(null), [edge,setEdge] = useState(null), [error,setError] = useState('');
  const [view,setView] = useState('list');
  const load = useCallback(async () => {
    const [ns,es] = await Promise.all([call('graph.list',{novelId}),call('edge.list',{novelId})]);
    setNodes(array(ns)); setEdges(array(es));
  },[call,novelId]);
  useEffect(() => { load().catch(e => setError(message(e))); const timer=setInterval(() => load().catch(e=>setError(message(e))),5000); return ()=>clearInterval(timer); },[load,tick]);
  const select = n => run(async () => { setEdge(null); setNode(await call('graph.get',{novelId,nodeId:n.id})); });
  const visible = nodes.filter(n => (!type || n.type===type) && `${n.name} ${n.summary} ${(n.aliases||[]).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return <>
    <div className="row"><input className="grow" aria-label="搜索设定" placeholder="搜索名称、摘要或别名" value={query} onChange={e=>setQuery(e.target.value)}/>
      <select aria-label="节点类型" value={type} onChange={e=>setType(e.target.value)}><option value="">全部类型</option><option value="character_card">角色卡</option><option value="world_book">世界书</option><option value="world_entry">世界条目</option></select>
    </div>
    <div className="row"><button onClick={()=>setView(view==='list'?'graph':'list')}>{view==='list'?'查看关系图':'查看列表'}</button>
      <button disabled={busy} onClick={()=>{setEdge(null);setNode({type:type||'character_card',name:'',summary:'',content:'',factType:'fact',status:'active'});}}>新建节点</button>
      <button disabled={busy||nodes.length<2} onClick={()=>{setNode(null);setEdge({from:nodes[0]?.id,to:nodes[1]?.id,name:'',content:''});}}>新建关系</button>
    </div>
    {error&&<p role="alert">{error}</p>}
    {view==='graph'&&<Graph nodes={visible.slice(0,40)} edges={edges} select={select}/>} 
    {view==='graph'&&visible.length>40&&<p className="muted">图中显示前 40 个匹配节点；搜索可缩小范围。</p>}
    <div className="list">{visible.map(n=><button key={n.id} className={node?.id===n.id?'selected':''} onClick={()=>select(n)}>{n.name}{n.status==='stale'?' · 待核对':''}<div className="muted">{n.summary}</div></button>)}</div>
    {!nodes.length&&<p>还没有世界书或角色卡。新建节点，或让 Agent 从设定讨论中整理。</p>}
    {node&&<NodeEditor key={node.id||'new'} {...{call,novelId,run,busy}} initial={node} latest={nodes.find(n=>n.id===node.id)} saved={setNode}/>}
    <details><summary>关系（{edges.length}）</summary>{edges.map(e=><div className="row" key={e.id}><span className="grow">{nodes.find(n=>n.id===e.from)?.name} → {nodes.find(n=>n.id===e.to)?.name}：{e.name}</span>
      <button disabled={busy} onClick={()=>{setNode(null);setEdge(e);}}>编辑</button>
      <button disabled={busy} onClick={()=>{if(confirm('删除这条关系？'))run(()=>call('edge.delete',{novelId,edgeId:e.id,expectedRevision:e.revision,confirm:true}));}}>删除</button>
    </div>)}</details>
    {edge&&<EdgeEditor key={edge.id||'new'} {...{call,novelId,nodes,run,busy}} initial={edge} saved={setEdge}/>}
  </>;
}

function Graph({nodes,edges,select}) {
  const positions=new Map(nodes.map((n,i)=>[n.id,{x:230+175*Math.cos(2*Math.PI*i/Math.max(1,nodes.length)),y:150+105*Math.sin(2*Math.PI*i/Math.max(1,nodes.length))}]));
  return <svg viewBox="0 0 460 300" role="img" aria-label="世界书与角色关系图">
    {edges.filter(e=>positions.has(e.from)&&positions.has(e.to)).map(e=>{const a=positions.get(e.from),b=positions.get(e.to);return <line key={e.id} x1={a.x} y1={a.y} x2={b.x} y2={b.y}><title>{e.name}</title></line>;})}
    {nodes.map(n=>{const p=positions.get(n.id);return <g key={n.id} role="button" tabIndex={0} aria-label={n.name} onClick={()=>select(n)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();select(n);}}}><circle cx={p.x} cy={p.y} r="9"/><text x={p.x} y={p.y+24} textAnchor="middle">{n.name.length>10?n.name.slice(0,10)+'…':n.name}</text><title>{n.name}：{n.summary}</title></g>;})}
  </svg>;
}

function NodeEditor({call,novelId,run,busy,initial,latest,saved}) {
  const [draft,setDraft]=useState(initial), [sourceText,setSourceText]=useState(JSON.stringify(initial.sources||[],null,2));
  useEffect(()=>{setDraft(initial);setSourceText(JSON.stringify(initial.sources||[],null,2));},[initial]);
  const set=(key,value)=>setDraft(d=>({...d,[key]:value}));
  return <><h3>{draft.id?'编辑节点':'新建节点'}</h3>
    {latest&&latest.revision!==draft.revision&&<p className="notice">节点已被其他会话更新。保存将检查版本；请重新选择节点，读取最新资料后合并。</p>}
    <label>类型<select value={draft.type} onChange={e=>set('type',e.target.value)}><option value="character_card">角色卡</option><option value="world_book">世界书</option><option value="world_entry">世界条目</option></select></label>
    <label>名称<input value={draft.name} onChange={e=>set('name',e.target.value)}/></label>
    <label>摘要<textarea value={draft.summary||''} onChange={e=>set('summary',e.target.value)}/></label>
    <label>完整正文<textarea className="prose" value={draft.content||''} onChange={e=>set('content',e.target.value)}/></label>
    <div className="split"><label>性质<select value={draft.factType||'fact'} onChange={e=>set('factType',e.target.value)}>{[['fact','客观事实'],['belief','人物认知'],['misunderstanding','人物误解'],['unconfirmed','未确认'],['plan','未来计划']].map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
      <label>状态<select value={draft.status||'active'} onChange={e=>set('status',e.target.value)}><option value="active">有效</option><option value="stale">待核对</option><option value="unconfirmed">未确认</option><option value="retired">已失效</option></select></label></div>
    <label>别名（逗号分隔）<input value={(draft.aliases||[]).join(',')} onChange={e=>set('aliases',e.target.value.split(',').map(s=>s.trim()).filter(Boolean))}/></label>
    <details><summary>来源与信息边界</summary>
      <label>知情角色 ID（逗号分隔）<input value={(draft.knownBy||[]).join(',')} onChange={e=>set('knownBy',e.target.value.split(',').map(s=>s.trim()).filter(Boolean))}/></label>
      <label>故事时间<input value={draft.storyTime||''} onChange={e=>set('storyTime',e.target.value)}/></label>
      <label>来源章节与版本（JSON 数组）<textarea value={sourceText} onChange={e=>setSourceText(e.target.value)}/></label>
    </details>
    <div className="row"><button disabled={busy||!draft.name.trim()} onClick={()=>run(async()=>{const sources=JSON.parse(sourceText); const n=await call(draft.id?'graph.update':'graph.create',{...draft,novelId,nodeId:draft.id,expectedRevision:draft.revision,sources});saved(n);})}>保存节点</button>
      {draft.id&&<button disabled={busy} onClick={()=>{if(confirm(`删除“${draft.name}”及其连接关系？`))run(async()=>{await call('graph.delete',{novelId,nodeId:draft.id,expectedRevision:draft.revision,confirm:true});saved(null);});}}>删除节点</button>}
    </div>
  </>;
}

function EdgeEditor({call,novelId,nodes,run,busy,initial,saved}) {
  const [draft,setDraft]=useState(initial);
  return <><h3>编辑关系</h3>{[['from','起点'],['to','终点']].map(([key,label])=><label key={key}>{label}<select value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}>{nodes.map(n=><option key={n.id} value={n.id}>{n.name}</option>)}</select></label>)}
    <label>关系名称<input value={draft.name||''} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
    <label>说明<textarea value={draft.content||''} onChange={e=>setDraft({...draft,content:e.target.value})}/></label>
    <button disabled={busy||!draft.name.trim()} onClick={()=>run(async()=>saved(await call(draft.id?'edge.update':'edge.create',{...draft,novelId,edgeId:draft.id,expectedRevision:draft.revision})))}>保存关系</button>
  </>;
}

function Plan({call,novelId,tick,run,busy}) {
  const [plan,setPlan]=useState(null), [draft,setDraft]=useState(''), [error,setError]=useState('');
  useEffect(()=>{call('plan.get',{novelId}).then(p=>{setPlan(p);setDraft(p?.content||'');}).catch(e=>setError(message(e)));},[call,novelId]);
  const dirty=draft!==(plan?.content||'');
  return <><h3>作者的情节意图</h3><p className="muted">在对话中讨论大方向；确认后的规划会进入写作上下文。修改规划后需要重新确认。</p>
    {error&&<p role="alert">{error}</p>}
    <label>情节规划<textarea disabled={busy} className="prose" value={draft} onChange={e=>setDraft(e.target.value)}/></label>
    <p>{plan?.approved?'作者已确认':'尚未确认'}{plan?` · 版本 ${plan.revision}`:''}</p>
    <div className="row"><button disabled={busy||!draft.trim()||!dirty} onClick={()=>run(async()=>setPlan(await call('plan.set',{novelId,content:draft,expectedRevision:plan?.revision})))}>保存规划</button>
      <button disabled={busy||!plan||dirty||plan.approved} onClick={()=>run(async()=>setPlan(await call('plan.approve',{novelId,expectedRevision:plan.revision})))}>确认此版情节</button>
      <button disabled={busy} onClick={()=>{if(!dirty||confirm('丢弃未保存的规划，读取最新版本？'))run(async()=>{const p=await call('plan.get',{novelId});setPlan(p);setDraft(p?.content||'');});}}>读取最新</button>
    </div></>;
}

function Context({call,novelId,tick}) {
  const [value,setValue]=useState(null), [error,setError]=useState('');
  useEffect(()=>{call('context.get',{novelId}).then(setValue).catch(e=>setError(message(e)));},[call,novelId,tick]);
  return <><h3>写作参考资料</h3><p className="muted">这是按当前绑定章节组装的资料预览；Agent 还可以按需读取更多原文。</p>{error&&<p role="alert">{error}</p>}
    {value&&<><p>已使用 {value.usedChars} / {value.maxChars} 字符，省略 {value.omitted.length} 项。</p>
      {value.staleMemory.length>0&&<div className="notice">以下记忆的来源正文已修改，需要核对：{value.staleMemory.map(n=>n.name).join('、')}</div>}
      {value.items.map((item,i)=><details key={`${item.id}:${i}`}><summary>{item.title||item.kind} · 版本 {item.revision}{item.truncated?' · 已截断':''}</summary><pre>{item.content}</pre></details>)}
    </>}</>;
}

function Manage({call,novelId,novel,run,busy}) {
  const [preview,setPreview]=useState(null);
  return <><h3>小说管理</h3>{novelId&&<div className="row">
    <button disabled={busy} onClick={()=>{const title=ask('小说名称',novel?.title||'');if(title)run(async()=>{const n=await call('novel.get',{novelId});await call('novel.update',{novelId,title,expectedRevision:n.revision});});}}>重命名小说</button>
    <button disabled={busy} onClick={()=>run(async()=>{const data=await call('novel.export',{novelId});const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${novel?.title||'novel'}.cuigengji.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})}>导出含历史的备份</button>
    </div>}
    <label>导入 cuigengji 备份<input type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];setPreview(null);if(f)run(async()=>{const data=JSON.parse(await f.text());if(data.format!=='cuigengji'||!data.novel)throw new Error('不是 cuigengji 备份文件');setPreview(data);});}}/></label>
    {preview&&<div className="notice">{preview.novel.title} · {Object.keys(preview.novel.chapters||{}).length} 章 · {Object.keys(preview.novel.nodes||{}).length} 个设定节点
      <div className="row"><button disabled={busy} onClick={()=>run(async()=>{const n=await call('novel.import',{backup:preview});await call('binding.set',{novelId:n.id});setPreview(null);})}>确认导入</button></div>
    </div>}
    <p className="muted">同 ID 且内容不同的小说不会被导入覆盖。原作品和备份文件保留。</p>
  </>;
}

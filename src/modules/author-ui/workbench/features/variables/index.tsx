import React,{useEffect,useRef,useState} from 'react';
import {Modal} from '../../shared/Modal.tsx';
import type {PetRPC} from '../pet/model.ts';
import {usageStyles} from '../pet/UsageDashboard.tsx';
import {companionSettingsStyle} from '../pet/UsageSettings.tsx';
type Row=Record<string,any>;
function variableRows(data:Row){
  const rows:{path:string;name:string;value:any;depth:number}[]=[];
  const visit=(value:any,path:string,depth:number)=>{for(const [name,v] of Object.entries(value)){const p=path+'/'+name.replaceAll('~','~0').replaceAll('/','~1');rows.push({path:p,name,value:v,depth});if(v&&typeof v==='object'&&depth<24)visit(v,p,depth+1);}};
  visit(data,'',0);return rows;
}
export function VariablesDialog({rpc,novelId,title,onClose}:{rpc:PetRPC;novelId:string;title?:string;onClose:()=>void}){
  const [tab,setTab]=useState('state'),[scope,setScope]=useState('story'),[chapterId,setChapterId]=useState(''),[position,setPosition]=useState('end');
  const [config,setConfig]=useState<Row|null>(null),[snapshot,setSnapshot]=useState<Row|null>(null),[chapters,setChapters]=useState<Row[]>([]),[history,setHistory]=useState<Row[]>([]),[nextHistory,setNextHistory]=useState<number|null>(null),[resources,setResources]=useState<Row[]>([]);
  const [path,setPath]=useState('/新变量'),[value,setValue]=useState(''),[op,setOp]=useState('set'),[reason,setReason]=useState(''),[preview,setPreview]=useState<Row|null>(null),[updates,setUpdates]=useState(''),[imported,setImported]=useState<Row|null>(null),[globalAccepted,setGlobalAccepted]=useState(false);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[status,setStatus]=useState(''),[definitions,setDefinitions]=useState<Row[]>([]),[dirty,setDirty]=useState(false),[confirmClose,setConfirmClose]=useState(false),[historical,setHistorical]=useState<Row|null>(null);
  const sequence=useRef(0),alive=useRef(true);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;sequence.current++;};},[]);
  const call=(action:string,args:Row={})=>rpc(action,{novelId,...args});
  const load=async()=>{const [cfg,ch,res]=await Promise.all([call('variables.config'),call('chapter.list'),call('graph.list')]);if(!alive.current)return;setConfig(cfg);setDefinitions(cfg.definitions);setChapters(ch.filter((c:any)=>!c.deleted));setResources(res);setDirty(false);};
  const anchor=()=>{const ch=chapters.find(c=>c.id===chapterId);return ch?{kind:'chapter',chapterId,chapterRevision:ch.revision,position}:{kind:'initial'};};
  useEffect(()=>{void load().catch(e=>setError(e.message));},[rpc,novelId]);
  useEffect(()=>{
    if(!config)return;const seq=++sequence.current;setPreview(null);setSnapshot(null);
    void Promise.all([call('variables.read',{scope,anchor:anchor()}),call('variables.history',{scope,limit:30})]).then(([state,hist])=>{if(alive.current&&seq===sequence.current){setSnapshot(state);setHistory(hist.items);setNextHistory(hist.nextOffset);}}).catch(e=>{if(alive.current&&seq===sequence.current)setError(e.message);});
  },[rpc,novelId,chapterId,position,scope,chapters,config]);
  const work=async(fn:()=>Promise<void>)=>{setBusy(true);setError('');setStatus('');try{await fn();}catch(e:any){setError(e.message);}finally{if(alive.current)setBusy(false);}};
  const propose=(operations:any[])=>work(async()=>setPreview({...await call('variables.preview',{baseRevision:snapshot?.revision,anchor:anchor(),scope,operations}),operations,baseRevision:snapshot?.revision}));
  const patch=()=>{if(op==='remove'){void propose([{op,path}]);return;}let parsed:any;try{parsed=JSON.parse(value);}catch{setError('变量值请输入 JSON；文本需要双引号，例如 "筑基"');return;}void propose([{op,path,value:parsed}]);};
  const commit=()=>work(async()=>{await call('variables.patch',{baseRevision:preview!.baseRevision,anchor:preview!.anchor,scope:preview!.scope,operations:preview!.operations,reason,requestId:crypto.randomUUID()});setPreview(null);setValue('');await load();setStatus('已保存为新的状态快照');});
  const editDefinition=(i:number,patch:Row)=>{setDefinitions(rows=>rows.map((r,j)=>j===i?{...r,...patch}:r));setDirty(true);};
  const close=()=>dirty||value||preview?setConfirmClose(true):onClose();
  const location=chapterId?`${chapters.find(c=>c.id===chapterId)?.title} · ${position==='end'?'章末':'章首'}`:'初始状态';
  return <><style>{usageStyles+companionSettingsStyle+`.cuigengji .variable-path{font-family:monospace;max-width:290px;overflow-wrap:anywhere;white-space:normal}.cuigengji .variable-value{max-width:300px;overflow:hidden;text-overflow:ellipsis}`}</style>
    <Modal title="剧情变量" close={close} className="companion-settings"><div className="companion-form">
      <p className="companion-muted">{title||'当前作品'} · 记录等级、关系、物品等可变化状态；可选启用，设定与规划照常使用。</p>
      {error&&<p className="notice error" role="alert">{error}<button onClick={()=>void work(load)}>重新读取</button></p>}
      {!config?<p>正在读取变量…</p>:<>
        <label><input type="checkbox" role="switch" checked={config.enabled} disabled={busy||dirty} onChange={e=>{const enabled=e.target.checked,previous=config;setConfig({...config,enabled});void work(async()=>{try{await call('variables.configure',{baseRevision:previous.revision,enabled,requestId:crypto.randomUUID()});await load();}catch(error){setConfig(previous);throw error;}});}}/>在这本作品启用变量</label>
        <nav className="companion-tabs" aria-label="变量页面">{[['state','状态与变更'],['definitions','变量说明'],['history','变化轨迹'],['import','导入酒馆变量']].map(([id,label])=><button key={id} aria-pressed={tab===id} onClick={()=>setTab(id)}>{label}</button>)}</nav>
        {tab==='state'&&<>
          <div className="companion-grid"><label>作用范围<select aria-label="作用范围" value={scope} disabled={busy} onChange={e=>setScope(e.target.value)}><option value="story">作品剧情</option><option value="session">当前会话草稿</option></select></label><label>剧情位置<select aria-label="剧情位置" value={chapterId} disabled={busy} onChange={e=>setChapterId(e.target.value)}><option value="">初始状态</option>{chapters.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>{chapterId&&<label>章节位置<select aria-label="章节位置" value={position} disabled={busy} onChange={e=>setPosition(e.target.value)}><option value="start">章首</option><option value="end">章末</option></select></label>}</div>
          <p className="companion-muted">读取版本 {snapshot?.revision??'—'} · {location}。浏览与预览不会保存，确认后才生成新快照。</p>
          {snapshot?.stale?.length>0&&<p className="notice">有 {snapshot?.stale.length} 份状态的正文或上游已修改，旧快照保留，等待核对。</p>}
          <div className="usage-scroll"><table className="usage-table"><thead><tr><th>变量路径</th><th>当前值</th><th>操作</th></tr></thead><tbody>{variableRows(snapshot?.data||{}).map(row=><tr key={row.path}><td className="variable-path" style={{paddingLeft:13+row.depth*12}}>{row.path}</td><td className="variable-value" title={JSON.stringify(row.value)}>{JSON.stringify(row.value).slice(0,100)}</td><td><button aria-label={`编辑 ${row.path}`} onClick={()=>{setPath(row.path);setOp('set');setValue(JSON.stringify(row.value,null,2));setPreview(null);}}>编辑</button></td></tr>)}</tbody></table>{snapshot&&!Object.keys(snapshot.data).length&&<p className="companion-muted" style={{padding:12}}>还没有变量，可在下方添加，或让 AI 先和你整理需要记录的状态。</p>}</div>
          <section className="companion-section"><h4>修改变量</h4><div className="companion-grid"><label>路径（JSON Pointer）<input aria-label="路径（JSON Pointer）" value={path} onChange={e=>{setPath(e.target.value);setPreview(null);}} placeholder="/人物/主角/等级"/></label><label>操作<select aria-label="操作" value={op} onChange={e=>{setOp(e.target.value);setPreview(null);}}><option value="set">设置值</option><option value="inc">增加 / 减少数值</option><option value="remove">删除</option></select></label></div>
            {op!=='remove'&&<label>值（JSON）<textarea aria-label="值（JSON）" rows={5} value={value} onChange={e=>{setValue(e.target.value);setPreview(null);}} placeholder={'"筑基" 或 12 或 {"等级": 3}'}/></label>}
            <label>修改原因<input aria-label="修改原因" value={reason} onChange={e=>setReason(e.target.value)}/></label><button disabled={!config.enabled||busy||!snapshot} onClick={patch}>预览变更</button>
            <details><summary>解析 AI 的 JSON Patch / MVU 更新命令</summary><textarea rows={5} aria-label="待解析的变量更新" value={updates} onChange={e=>{setUpdates(e.target.value);setPreview(null);}}/><button disabled={!config.enabled||busy||!snapshot} onClick={()=>void work(async()=>{const parsed=await call('variables.parse',{text:updates});const result=await call('variables.preview',{baseRevision:snapshot?.revision,anchor:anchor(),scope,operations:parsed.operations});setPreview({...result,operations:parsed.operations,baseRevision:snapshot?.revision});})}>解析并预览</button></details>
          </section>
          {preview&&<section className="companion-section"><h4>确认这次变更 · {location}</h4>{preview.changes.map((c:any)=><div key={c.path} style={{overflowWrap:'anywhere'}}><strong>{c.path||'整个状态'}</strong><p className="companion-muted">之前：{JSON.stringify(c.before)??'不存在'}</p><p>之后：{JSON.stringify(c.after)??'删除'}</p></div>)}<button className="primary" disabled={busy} onClick={()=>void commit()}>确认保存状态</button><button onClick={()=>setPreview(null)}>取消预览</button></section>}
        </>}
        {tab==='definitions'&&<>
          <p className="companion-muted">说明和类型约束均可选，可关联人物或世界卡片。</p>
          {definitions.map((d,i)=><section key={i} className="companion-section"><div className="companion-grid"><label>名称<input aria-label="名称" value={d.name} onChange={e=>editDefinition(i,{name:e.target.value})}/></label><label>路径<input aria-label="路径" value={d.path} onChange={e=>editDefinition(i,{path:e.target.value})}/></label><label>类型<select aria-label="类型" value={d.type||''} onChange={e=>editDefinition(i,{type:e.target.value||undefined})}><option value="">不限制</option>{['string','number','boolean','object','array','null'].map(t=><option key={t}>{t}</option>)}</select></label><label>关联设定<select aria-label="关联设定" value={d.resourceId||''} onChange={e=>editDefinition(i,{resourceId:e.target.value||undefined})}><option value="">不关联</option>{resources.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label></div><label>用途说明<input aria-label="用途说明" value={d.description||''} onChange={e=>editDefinition(i,{description:e.target.value})}/></label><button onClick={()=>{setDefinitions(rows=>rows.filter((_,j)=>j!==i));setDirty(true);}}>删除说明</button></section>)}
          <button onClick={()=>{setDefinitions(rows=>[...rows,{name:'新变量',path:'/新变量',description:''}]);setDirty(true);}}>添加变量说明</button><button className="primary" disabled={busy||!dirty} onClick={()=>void work(async()=>{await call('variables.configure',{baseRevision:config.revision,definitions,requestId:crypto.randomUUID()});await load();setStatus('变量说明已保存');})}>保存说明</button>
        </>}
        {tab==='history'&&<>
          <label>查看轨迹<select aria-label="查看轨迹" value={scope} onChange={e=>setScope(e.target.value)}><option value="story">作品剧情</option><option value="session">当前会话草稿</option></select></label><p className="companion-muted">旧快照按需查看。准备恢复后仍需预览、确认，会生成新快照。</p>
          {!history.length&&<p className="companion-muted">这个范围还没有变化记录。</p>}
          {history.map(h=><section className="companion-section" key={h.id}><header><h4>版本 {h.revision}{h.stale?' · 待核对':''}</h4><small>{new Date(h.time).toLocaleString()}</small></header><p className="companion-muted">{h.anchor.kind==='chapter'?`${chapters.find(c=>c.id===h.anchor.chapterId)?.title||'章节'} · ${h.anchor.position==='end'?'章末':'章首'} · 正文 v${h.anchor.chapterRevision}`:'初始状态'} · {h.reason||'维护剧情状态'}</p><p style={{overflowWrap:'anywhere'}}>{h.paths.join('、')}</p><button disabled={busy} onClick={()=>void work(async()=>setHistorical({...await call('variables.read',{snapshotId:h.id,scope:h.scope}),commit:h}))}>查看历史快照</button></section>)}
          {nextHistory!==null&&<button disabled={busy} onClick={()=>void work(async()=>{const page=await call('variables.history',{scope,limit:30,offset:nextHistory});setHistory(rows=>[...rows,...page.items]);setNextHistory(page.nextOffset);})}>加载更早记录</button>}
        </>}
        {tab==='import'&&<>
          <p className="companion-muted">读取角色卡、世界书或预设 JSON 中的常见初始化。保留来源，不执行 JS / EJS 和状态栏脚本。</p><label>选择 JSON 文件<input aria-label="选择 JSON 文件" type="file" accept=".json" onChange={e=>void work(async()=>{const file=e.target.files?.[0];if(file){const input=JSON.parse((await file.text()).replace(/^\uFEFF/,''));setGlobalAccepted(false);setImported({input,...await call('variables.importPreview',{input})});}})}/></label>
          {imported&&<section className="companion-section"><h4>初始化预览</h4><p>作品状态 {imported.counts.story} 项 · 会话默认值 {imported.counts.local} 项</p>{imported.warnings.map((w:string)=><p className="companion-muted" key={w}>{w}</p>)}<pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{JSON.stringify({story:imported.story,local:imported.local},null,2)}</pre>{imported.hasGlobals&&<label><input type="checkbox" checked={globalAccepted} onChange={e=>setGlobalAccepted(e.target.checked)}/>将原全局变量转换为这本作品的状态</label>}<button disabled={busy||dirty||imported.hasGlobals&&!globalAccepted} onClick={()=>void work(async()=>{await call('variables.import',{input:imported.input,digest:imported.digest,baseRevision:config.revision,globalScope:globalAccepted?'story':undefined,requestId:crypto.randomUUID()});await load();setImported(null);setStatus('已导入，原来源随作品保存');})}>确认导入初始化</button></section>}
        </>}
        <footer className="companion-save"><small role="status">{busy?'处理中…':status||'此作品独立保存，其他作品不受影响。'}</small></footer>
      </>}
    </div></Modal>
    {historical&&<Modal title="历史变量快照" close={()=>setHistorical(null)}><div className="companion-form"><p>版本 {historical.commit.revision} · {historical.historical?'历史状态，来源已变化':'历史状态'}</p><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',maxHeight:'50vh',overflow:'auto'}}>{JSON.stringify(historical.data,null,2)}</pre><p className="companion-muted">准备恢复到：{location}。预览、确认后才会保存。</p><button onClick={()=>{setScope(historical.scope);setOp('set');setValue(JSON.stringify(historical.data,null,2));setPath('');setPreview(null);setTab('state');setHistorical(null);setStatus('历史值已放入编辑区，请预览后确认');}}>准备恢复到当前剧情位置</button></div></Modal>}
    {confirmClose&&<Modal title="保留未保存修改？" close={()=>setConfirmClose(false)}><p>编辑区或说明还有未保存内容。</p><div className="usage-toolbar"><button onClick={()=>setConfirmClose(false)}>继续编辑</button><button onClick={onClose}>放弃修改并关闭</button></div></Modal>}
  </>;
}

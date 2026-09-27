import React, { useState } from 'react';
import { useDraft, useResource } from '../shared/state.js';
import { ResourceState, ReadingText, SaveBar, saveShortcut } from '../shared/ui.jsx';
import { useDialog } from '../dialog.jsx';
export function Plan(props) {
  const resource=useResource(()=>props.call('plan.get',{novelId:props.novelId}).then(p=>p||{content:'',revision:0,approved:false}),[props.call,props.novelId]);
  return <ResourceState resource={resource}>{resource.value&&<PlanEditor {...props} initial={resource.value}/>}</ResourceState>;
}
function PlanEditor({call,novelId,run,busy,initial}) {
  const {value,base,change,accept,rebase,dirty,cacheError}=useDraft(`${novelId}:plan`,initial);
  const [editing,setEditing]=useState(dirty||!initial.revision),[remote,setRemote]=useState(null);
  const {confirm}=useDialog();
  const save=()=>{if(dirty&&!busy&&value.content.trim())run(async()=>accept(await call('plan.set',{novelId,content:value.content,expectedRevision:base.revision})));};
  const approve=()=>run(async()=>{const result=await call('plan.approve',{novelId,expectedRevision:base.revision});accept(result);setEditing(false);});
  return <div className="editor-shell" onKeyDown={e=>saveShortcut(e,save)}><header className="editor-heading"><span className="eyebrow">故事方向</span><h2>情节规划</h2><div className="row"><span className="status-badge">{dirty?'本地修改未保存':!base.revision?'尚无规划':base.approved?'已确认':'等待作者确认'}{base.revision?` · 第${base.revision}版`:''}</span><button onClick={()=>setEditing(!editing)}>{editing?'阅读预览':'编辑规划'}</button><button disabled={busy} onClick={()=>run(async()=>{const p=await call('plan.get',{novelId})||{content:'',revision:0,approved:false};if(dirty)setRemote(p);else accept(p);})}>读取最新</button></div></header>
    <div className="editor-scroll page"><p className="muted">保存提案后，由你确认这一版方向，Agent 才能写正文。修改并保存后需要重新确认。</p>
      {base.approvedAt&&<p className="muted">确认于 {new Date(base.approvedAt).toLocaleString()}</p>}
      {editing?<textarea className="prose manuscript" aria-label="情节规划" disabled={busy} value={value.content} onChange={e=>change(v=>({...v,content:e.target.value}))}/>:<ReadingText text={value.content||'先在对话中讨论故事方向，让 Agent 整理提案，也可以直接编辑规划。'}/>}
      {remote&&<div className="notice"><h3>服务端第{remote.revision}版</h3><ReadingText text={remote.content}/><button onClick={async()=>{if(await confirm('丢弃当前规划草稿，使用这一版？')){accept(remote);setRemote(null);}}}>使用服务端版本</button><button onClick={async()=>{if(await confirm('确认已合并需要的规划内容？将使用服务端版本作为新的保存基准。')){rebase(remote);setRemote(null);setEditing(true);}}}>已合并，更新保存基准</button><button onClick={()=>setRemote(null)}>保留草稿</button></div>}
    </div>
    {dirty?<SaveBar {...{dirty,busy}} error={cacheError} invalid={!value.content.trim()?'请填写规划内容后保存':null} onSave={save} label="保存规划"/>:<footer className="savebar"><span role="status">{base.approved?'这版规划已确认':'确认后用于写作'}</span><button className="primary" disabled={busy||!base.revision||base.approved} onClick={approve}>确认第{base.revision||1}版</button></footer>}
  </div>;
}

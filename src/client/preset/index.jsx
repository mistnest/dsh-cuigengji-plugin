import React, { useState } from 'react';
import { useDraft, useResource } from '../shared/state.js';
import { ResourceState, SaveBar } from '../shared/ui.jsx';
import { compilePreset, presetBlockReason } from '../../core/preset.js';
import { useDialog } from '../dialog.jsx';

export function Preset(props) {
  const resource=useResource(()=>props.call('preset.get',{novelId:props.novelId}).then(v=>v||{name:'写作预设',enabled:false,blocks:[],revision:0}),[props.call,props.novelId]);
  return <ResourceState resource={resource}>{resource.value&&<PresetEditor {...props} initial={resource.value}/>}</ResourceState>;
}
function PresetEditor({call,novelId,run,busy,initial}) {
  const {value,base,change,accept,dirty,cacheError}=useDraft(`${novelId}:preset`,initial);
  const [file,setFile]=useState(null),[orderId,setOrderId]=useState('');
  const {confirm}=useDialog();
  const update=(index,patch)=>change(v=>({...v,blocks:v.blocks.map((b,i)=>i===index?{...b,...patch}:b)}));
  const move=(index,delta)=>change(v=>{const blocks=[...v.blocks];[blocks[index],blocks[index+delta]]=[blocks[index+delta],blocks[index]];return {...v,blocks};});
  let preview='',invalid='';try{preview=compilePreset(value);}catch(e){invalid=e.message;}
  const save=()=>run(async()=>accept(await call('preset.set',{novelId,expectedRevision:base.revision,preset:value})));
  return <div className="page"><span className="eyebrow">作用于当前作品绑定的会话</span><h2>写作预设</h2>
    <p className="muted">保存后，下次组装 Agent 提示词时生效。不会改变已经发送的请求。此处管理一份当前作品预设，可导出后切换。</p>
    <label>导入酒馆 Chat Completion 预设<input type="file" disabled={busy} accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)run(async()=>{if(f.size>2_000_000)throw new Error('预设超过 2 MB');const data=JSON.parse((await f.text()).replace(/^\uFEFF/,''));setFile(data);const orders=Array.isArray(data.prompt_order)?data.prompt_order:[];setOrderId(String((orders.find(o=>o.character_id===100001)||orders[0])?.character_id??''));});}}/></label>
    {file&&<div className="card">{Array.isArray(file.prompt_order)&&file.prompt_order.length>0&&<label>提示词排列方案<select disabled={busy} value={orderId} onChange={e=>setOrderId(e.target.value)}>{file.prompt_order.map((o,i)=><option key={i} value={String(o.character_id)}>{o.character_id===100001?'酒馆通用排列':`方案 ${o.character_id}`}</option>)}</select></label>}
      <button disabled={busy} onClick={async()=>{if(!dirty||await confirm('用导入内容替换当前未保存的预设草稿？'))run(async()=>{const p=await call('preset.preview',{novelId,input:file,...(orderId?{orderId}:{})});change({...p,revision:base.revision});setFile(null);});}}>解析为预设草稿</button><button disabled={busy} onClick={()=>setFile(null)}>取消导入</button></div>}
    {(value.warnings||[]).map((w,i)=><p className="muted" key={i}>{w}</p>)}
    <label>预设名称<input disabled={busy} value={value.name} onChange={e=>change(v=>({...v,name:e.target.value}))}/></label>
    <label className="row"><input type="checkbox" disabled={busy} checked={value.enabled} onChange={e=>change(v=>({...v,enabled:e.target.checked}))}/>启用当前预设（保存后生效）</label>
    <div className="row"><button disabled={busy} onClick={()=>change(v=>({...v,blocks:[...v.blocks,{identifier:crypto.randomUUID(),name:'新提示词',content:'',role:'system',enabled:true}]}))}>新增提示词</button>
    <button disabled={busy} onClick={async()=>{if(!dirty||await confirm('丢弃预设草稿并读取已保存版本？'))run(async()=>accept(await call('preset.get',{novelId})||initial));}}>读取已保存版本</button>
    {value.raw&&<button onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(value.raw,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='original-tavern-preset.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>下载原始酒馆预设</button>}</div>
    {value.blocks.map((block,i)=>{const reason=presetBlockReason(block);return <details className="card" key={block.identifier}><summary>{i+1}. {block.name} · {block.enabled?'启用':'停用'}{reason?' · 需适配':''}</summary>
      {reason&&<p className="notice">{reason}</p>}
      <label className="row"><input type="checkbox" checked={block.enabled} disabled={busy||!!reason} onChange={e=>update(i,{enabled:e.target.checked})}/>启用条目</label>
      <label>条目名称<input disabled={busy} value={block.name} onChange={e=>update(i,{name:e.target.value})}/></label>
      <label>提示词内容<textarea className="prose" disabled={busy} value={block.content} onChange={e=>{const next={...block,content:e.target.value};update(i,{content:e.target.value,enabled:block.enabled&&!presetBlockReason(next)});}}/></label>
      <div className="row"><button disabled={busy||i===0} onClick={()=>move(i,-1)}>上移</button><button disabled={busy||i===value.blocks.length-1} onClick={()=>move(i,1)}>下移</button><button disabled={busy} onClick={()=>change(v=>({...v,blocks:v.blocks.filter((_,j)=>j!==i)}))}>移除条目</button></div>
    </details>;})}
    <details className="card"><summary>本次配置实际注入的文本 · {preview.length} 字符</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{preview||'预设未启用或没有启用的文本条目。'}</pre><p className="muted">这是预设部分；DSH 自身指令、写作说明和小说参考资料另行组装。</p></details>
    <SaveBar {...{dirty,busy}} error={cacheError} invalid={invalid||(!value.name.trim()?'请填写预设名称':'')} onSave={save} label="保存预设"/>
  </div>;
}

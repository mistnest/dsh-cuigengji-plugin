import React, { useState } from 'react';
import { useDraft, useResource, usePreference } from '../shared/state.js';
import { ResourceState, SaveBar } from '../shared/ui.jsx';
import { compilePreset, presetBlockReason } from '../../core/preset.js';
import { useDialog } from '../dialog.jsx';

export function Preset(props) {
  const resource=useResource(()=>props.call('preset.get',{novelId:props.novelId}).then(v=>v||{name:'写作预设',enabled:false,blocks:[],revision:0}),[props.call,props.novelId]);
  return <ResourceState resource={resource}>{resource.value&&<PresetEditor {...props} initial={resource.value}/>}</ResourceState>;
}
function PresetEditor({call,novelId,run,busy,initial}) {
  const {value,base,change,accept,dirty,cacheError}=useDraft(`${novelId}:preset`,initial);
  const [onlyUnsupported,setOnlyUnsupported]=useState(false);
  const [file,setFile]=useState(null),[orderId,setOrderId]=useState(''),[selected,setSelected]=usePreference(`${novelId}:preset-selected`,null);
  const {confirm}=useDialog();
  const update=(index,patch)=>change(v=>({...v,blocks:v.blocks.map((b,i)=>i===index?{...b,...patch}:b)}));
  const move=(index,delta)=>{setSelected(index+delta);change(v=>{const blocks=[...v.blocks];[blocks[index],blocks[index+delta]]=[blocks[index+delta],blocks[index]];return {...v,blocks};});};
  let preview='',invalid='';try{preview=compilePreset(value);}catch(e){invalid=e.message;}
  const save=()=>run(async()=>accept(await call('preset.set',{novelId,expectedRevision:base.revision,preset:value})));
  return <div className="page"><div className="row"><h2 className="grow">{value.name||'写作预设'}</h2><label className="row"><input type="checkbox" disabled={busy} checked={value.enabled} onChange={e=>change(v=>({...v,enabled:e.target.checked}))}/>启用</label></div>
    <p className="muted">修改保存后，从下一次请求开始生效。</p>
    <details className="section-fold"><summary>导入与预设设置</summary><label>导入酒馆 Chat Completion 预设<input type="file" disabled={busy} accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)run(async()=>{if(f.size>2_000_000)throw new Error('预设超过 2 MB');const data=JSON.parse((await f.text()).replace(/^\uFEFF/,''));setFile(data);const orders=Array.isArray(data.prompt_order)?data.prompt_order:[];setOrderId(String((orders.find(o=>o.character_id===100001)||orders[0])?.character_id??''));});}}/></label>
    {file&&<div className="card">{Array.isArray(file.prompt_order)&&file.prompt_order.length>0&&<label>提示词排列方案<select disabled={busy} value={orderId} onChange={e=>setOrderId(e.target.value)}>{file.prompt_order.map((o,i)=><option key={i} value={String(o.character_id)}>{o.character_id===100001?'酒馆通用排列':`方案 ${o.character_id}`}</option>)}</select></label>}
      <button disabled={busy} onClick={async()=>{if(!dirty||await confirm('用导入内容替换当前未保存的预设草稿？'))run(async()=>{const p=await call('preset.preview',{novelId,input:file,...(orderId?{orderId}:{})});change({...p,revision:base.revision});setFile(null);setOnlyUnsupported(false);setSelected(p.blocks.length?0:null);});}}>解析为预设草稿</button><button disabled={busy} onClick={()=>setFile(null)}>取消导入</button></div>}
    {!!value.warnings?.length&&<details><summary>兼容报告 · {value.warnings.length} 项</summary>{value.warnings.map((w,i)=><p key={i}>{w}</p>)}</details>}
    <label>预设名称<input disabled={busy} value={value.name} onChange={e=>change(v=>({...v,name:e.target.value}))}/></label>
    <div className="row">
    <button disabled={busy} onClick={async()=>{if(!dirty||await confirm('丢弃预设草稿并读取已保存版本？'))run(async()=>{accept(await call('preset.get',{novelId})||initial);setSelected(null);setOnlyUnsupported(false);});}}>读取已保存版本</button>
    {value.raw&&<button onClick={()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(value.raw,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='original-tavern-preset.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}}>下载原始文件（不含编辑）</button>}</div>
    </details><div className="row"><button disabled={busy} onClick={()=>{setOnlyUnsupported(false);setSelected(value.blocks.length);change(v=>({...v,blocks:[...v.blocks,{identifier:crypto.randomUUID(),name:'新提示词',content:'',role:'system',enabled:true}]}));}}>新增提示词</button><label className="row"><input type="checkbox" checked={onlyUnsupported} onChange={e=>{setOnlyUnsupported(e.target.checked);setSelected(null);}}/>只看待适配</label></div>{!value.enabled&&<p className="muted">整体停用，条目配置仍保留。</p>}{!value.blocks.length&&<p className="empty">新增提示词，或从预设设置中导入。</p>}<div className="preset-layout"><aside className={`preset-list ${selected!==null?'is-selected':''}`}>{value.blocks.map((block,i)=>onlyUnsupported&&!presetBlockReason(block)?null:<button className={selected===i?'selected':''} key={block.identifier} onClick={()=>setSelected(i)}>{i+1}. {block.name}<small> · {presetBlockReason(block)?'待适配':block.enabled?'启用':'停用'}</small></button>)}</aside><main className="preset-editor">{selected!==null&&<button onClick={()=>setSelected(null)}>‹ 条目列表</button>}
    {value.blocks.map((block,i)=>{if(i!==selected)return null;const reason=presetBlockReason(block);return <details open className="card" key={block.identifier}><summary>{i+1}. {block.name} · {block.enabled?'启用':'停用'}{reason?' · 需适配':''}</summary>
      {reason&&<p className="notice">{reason}</p>}
      <label className="row"><input type="checkbox" checked={block.enabled} disabled={busy||!!reason} onChange={e=>update(i,{enabled:e.target.checked})}/>启用条目</label>
      <label>条目名称<input disabled={busy} value={block.name} onChange={e=>update(i,{name:e.target.value})}/></label>
      <label>提示词内容<textarea className="prose" disabled={busy} value={block.content} onChange={e=>{const next={...block,content:e.target.value};update(i,{content:e.target.value,enabled:block.enabled&&!presetBlockReason(next)});}}/></label>
      <div className="row"><button disabled={busy||i===0} onClick={()=>move(i,-1)}>上移</button><button disabled={busy||i===value.blocks.length-1} onClick={()=>move(i,1)}>下移</button><button disabled={busy} onClick={()=>{change(v=>({...v,blocks:v.blocks.filter((_,j)=>j!==i)}));setSelected(value.blocks.length>1?Math.min(i,value.blocks.length-2):null);}}>移除条目</button></div>
    </details>;})}
    </main></div><details className="card"><summary>当前草稿的生效文本预览 · {preview.length} 字符</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{preview||'预设未启用或没有启用的文本条目。'}</pre><p className="muted">保存并启用后，写作助手可按需读取这些文本；不会自动加入每轮提示词。</p></details>
    {dirty&&<div className="sticky-actions"><SaveBar {...{dirty,busy}} error={cacheError} invalid={invalid||(!value.name.trim()?'请填写预设名称':'')} onSave={save} label="保存预设"/></div>}
  </div>;
}

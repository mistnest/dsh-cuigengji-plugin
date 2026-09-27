import React, { useState } from 'react';

async function readFile(file) {
  if (file.size > 20 * 1024 * 1024) throw new Error('文件超过 20 MB，请缩小文件后重试');
  if (/\.png$/i.test(file.name)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { pngBase64:btoa(binary), fileName:file.name };
  }
  try { return { json:JSON.parse((await file.text()).replace(/^\uFEFF/,'')), fileName:file.name }; }
  catch { throw new Error('JSON 无法解析，请选择酒馆导出的角色卡或世界书文件'); }
}

export function TavernImport({ call, novelId, run, busy }) {
  const [opened,setOpened] = useState(false), [preview,setPreview] = useState(null);
  const [input,setInput] = useState(null), [selected,setSelected] = useState([]), [result,setResult] = useState('');
  return <section className="card">
    <button disabled={busy} aria-expanded={opened} onClick={()=>setOpened(!opened)}>导入酒馆角色卡 / 世界书</button>
    {opened&&<>
      <p className="muted">角色卡支持 V1/V2 JSON、PNG；V3 支持通用文本字段。世界书支持 JSON，角色卡内嵌世界书也会列出。</p>
      <label>选择 JSON 或 PNG 文件<input type="file" accept=".json,.png,application/json,image/png" disabled={busy} onChange={e=>{
        const file=e.target.files?.[0]; e.target.value='';
        setPreview(null);setInput(null);setResult('');setSelected([]);
        if(file)run(async()=>{const value=await readFile(file);const p=await call('tavern.preview',{novelId,...value});setInput(value);setPreview(p);setSelected(p.nodes.map((_,i)=>i));});
      }}/></label>
      {preview&&<>
        <h3>导入预览 · {preview.nodes.length} 项</h3>
        {preview.warnings.map((warning,i)=><p className="muted" key={i}>{warning}</p>)}
        <p>已选 {selected.length} 项。导入到当前作品，已有同名资料保留；重复导入同一份文件会跳过已导入的条目。</p>
        <div className="row"><button disabled={busy} onClick={()=>setSelected(preview.nodes.map((_,i)=>i))}>全选</button><button disabled={busy} onClick={()=>setSelected([])}>全不选</button></div>
        <div style={{maxHeight:320,overflow:'auto'}}>{preview.nodes.map((node,i)=><div className="source-row" key={i}>
          <label className="row"><input type="checkbox" disabled={busy} checked={selected.includes(i)} onChange={e=>setSelected(v=>e.target.checked?[...v,i]:v.filter(n=>n!==i))}/><span>{node.name} · {{character_card:'角色卡',world_book:'世界书',world_entry:'世界条目'}[node.type]}{node.status==='retired'?' · 原文件已禁用':' · 导入后待确认'}</span></label>
          <details><summary>查看内容</summary><pre style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{node.content||'无正文'}</pre></details>
        </div>)}</div>
        <div className="row"><button className="primary" disabled={busy||!selected.length} onClick={()=>run(async()=>{
          const response=await call('tavern.import',{novelId,...input,selected,fingerprint:preview.fingerprint,confirm:true});
          setResult(`导入完成：新增 ${response.imported} 项，跳过 ${response.skipped} 项。请在设定列表核对资料，在“依据与信息边界”中标记有效后才会纳入自动参考。`);setPreview(null);setInput(null);
        })}>确认导入 {selected.length} 项</button><button disabled={busy} onClick={()=>{setPreview(null);setInput(null);}}>取消</button></div>
      </>}
      {result&&<p role="status">{result}</p>}
    </>}
  </section>;
}

import React, { useEffect, useRef, useState } from 'react';
import { useDialog } from '../dialog.jsx';
import { useDraft, useResource } from '../shared/state.js';
import { ResourceState, ReadingText, SaveBar, saveShortcut } from '../shared/ui.jsx';
const message = error => error?.message || String(error);
export function Manage({call,novelId,novel,run,busy}) {
  const [preview,setPreview]=useState(null);
  const [report,setReport]=useState(null);
  const [success,setSuccess]=useState('');
  const { ask } = useDialog();
  return <><span className="eyebrow">作品管理</span><h2>作品与备份</h2><p className="muted">完整备份包含正文、历史版本、人物与世界设定。</p>{novelId&&<div className="row">
    <button disabled={busy} onClick={async ()=>{const title=await ask('小说名称',novel?.title||'');if(title)run(async()=>{const n=await call('novel.get',{novelId});await call('novel.update',{novelId,title,expectedRevision:n.revision});});}}>重命名小说</button>
    <button disabled={busy} onClick={()=>run(async()=>{const data=await call('novel.export',{novelId});const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${novel?.title||'novel'}.cuigengji.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);})} className="primary">下载完整备份</button>
    </div>}
    <h3>从备份恢复</h3><p className="muted">选择本插件导出的 JSON 文件，检查内容后确认导入。</p><label>选择备份文件<input type="file" accept=".json,application/json" onChange={e=>{const f=e.target.files?.[0];setPreview(null);setReport(null);setSuccess('');if(f)run(async()=>{const data=JSON.parse(await f.text());if(data.format!=='cuigengji'||!data.novel)throw new Error('不是 cuigengji 备份文件');setPreview(data);});}}/></label>
    <h3>迁移旧项目</h3><p className="muted">选择包含章节正文的旧项目导出。先查看迁移报告，再确认导入。</p><label>选择旧项目 JSON<input type="file" accept=".json,application/json" disabled={busy} onChange={e=>{const f=e.target.files?.[0];setPreview(null);setReport(null);setSuccess('');if(f)run(async()=>{const result=await call('legacy.preview',{input:JSON.parse(await f.text())});setPreview(result.backup);setReport(result.report);});}}/></label>
    {success&&<p role="status" className="notice">{success}</p>}
    {report&&<div role="status" className="notice"><strong>迁移预览</strong><p>{report.volumes} 卷 · {report.chapters} 章 · {report.nodes} 个节点 · {report.edges} 条关系</p>{report.warnings.map((w,i)=><p key={i}>{w}</p>)}</div>}
    {preview&&<div className="notice">{preview.novel.title} · {Object.keys(preview.novel.chapters||{}).length} 章 · {Object.keys(preview.novel.nodes||{}).length} 个设定节点
      <div className="row"><button disabled={busy} onClick={()=>run(async()=>{const n=await call('novel.import',{backup:preview});await call('binding.set',{novelId:n.id});setPreview(null);setReport(null);setSuccess('导入成功，作品已绑定到当前会话。');})}>确认导入</button></div>
    </div>}
    <p className="muted">同 ID 且内容不同的小说不会被导入覆盖。原作品和备份文件保留。</p>
  </>;
}

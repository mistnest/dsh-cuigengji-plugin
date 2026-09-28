import React, {useEffect, useState} from 'react';

type Call = (action:string,args?:Record<string,unknown>)=>Promise<any>;
type Props = {call:Call;run:(fn:()=>Promise<void>)=>Promise<unknown>;busy:boolean};
export function WorkDataPage({call,run,busy}:Props) {
 const [status,setStatus]=useState<any>(null),[error,setError]=useState(''),[backup,setBackup]=useState<any>(null),[preview,setPreview]=useState<any>(null),[notice,setNotice]=useState('');
 useEffect(()=>{let active=true;call('workspace.status').then(v=>{if(active)setStatus(v);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[call]);
 const download=()=>run(async()=>{const data=await call('workspace.export');const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`cuigengji-workspace-${new Date().toISOString().slice(0,10)}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setNotice('已生成全库备份，请在下载列表确认文件已保存。');});
 const choose=(event:React.ChangeEvent<HTMLInputElement>)=>{const file=event.target.files?.[0];event.target.value='';setBackup(null);setPreview(null);setNotice('');if(!file)return;run(async()=>{const value=JSON.parse((await file.text()).replace(/^\uFEFF/,''));const result=await call('workspace.preview',{backup:value});setBackup(value);setPreview(result);});};
 return <><h2>小说工作数据</h2><p className="muted">作品保存在独立数据目录中。换电脑或迁移 DSH 时，请导出整个工作数据区。</p>
 {error&&<p role="alert">{error}</p>}{!status&&!error&&<p role="status">正在读取存储信息…</p>}
 {status&&<section className="section-fold"><strong>当前存储位置</strong><p style={{overflowWrap:'anywhere',userSelect:'text'}}>{status.dataRoot}</p><p>{status.novels} 部作品 · {status.chapters} 章正文 · {status.bindings} 个会话绑定</p><ul>{status.books.map((book:any)=><li key={book.id}>{book.title}{book.archived?'（已归档）':''}</li>)}</ul><details><summary>备份包含哪些内容</summary>{status.included.map((s:string)=><p key={s}>{s}</p>)}<p>不包含：{status.excluded.join('；')}。请先保存编辑中的草稿。</p></details></section>}
 <div className="row"><button className="primary" disabled={busy||!status} onClick={download}>导出全部工作数据</button><label>导入工作数据<input type="file" accept=".json,application/json" disabled={busy} onChange={choose}/></label></div>
 {preview&&<section className="section-fold"><h3>导入预览</h3><p>{preview.novels} 部作品 · {preview.chapters} 章 · {preview.files} 个日志/备份文件</p><p>新增：{preview.added.join('、')||'无'}；相同内容跳过：{preview.skipped.join('、')||'无'}</p>{preview.conflicts.length>0?<div role="alert"><p>以下内容有冲突，未导入。请保留双方备份后再核对。</p><ul>{preview.conflicts.map((s:string)=><li key={s}>{s}</li>)}</ul></div>:<p>导入会重新校验，并先备份当前数据；不会覆盖不同内容的同 ID 作品。</p>}<button disabled={busy||!preview.valid} onClick={()=>run(async()=>{const result=await call('workspace.import',{backup});setStatus(await call('workspace.status'));setPreview(null);setBackup(null);setNotice(`导入完成。导入前备份：${result.backupDir}`);})}>确认导入</button><button disabled={busy} onClick={()=>{setPreview(null);setBackup(null);}}>取消</button></section>}
 {notice&&<p role="status" style={{overflowWrap:'anywhere'}}>{notice}</p>}</>;
}

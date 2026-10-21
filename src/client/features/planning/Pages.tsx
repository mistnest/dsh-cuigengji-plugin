import React,{useState} from 'react';
import {Modal} from '../../shared/preferences.tsx';
import {Icon} from '../../shared/icons.tsx';
import {SidebarSection} from '../../shared/OrganizedWorkspace.tsx';
export interface PageIndex {id:string|null;name:string;summary:string;revision:number;nodeCount:number;decorationCount:number;groupCount?:number}
interface Props {pages:PageIndex[];value:string;busy:boolean;kind?:'planning'|'memory';change:(id:string)=>void;create:(name:string,summary:string)=>Promise<boolean|undefined>;update:(page:PageIndex,name:string,summary:string)=>Promise<boolean|undefined>;remove:(page:PageIndex)=>Promise<boolean|undefined>}
/** A page selects an independent canvas, never a mandatory parent folder. */
export function PlanningPages({pages,value,busy,kind='planning',change,create,update,remove}:Props){
  const [draft,setDraft]=useState<{page?:PageIndex;name:string;summary:string}|null>(null),[error,setError]=useState('');
  const current=pages.find(p=>(p.id||'')===value);
  const add=<button className="page-new" aria-label="新建画布" title="新建独立画布" disabled={busy} onClick={()=>{setError('');setDraft({name:'',summary:''});}}><Icon name="pagePlus"/><span>画布</span></button>;
  const settings=current?.id&&<button className="page-settings" aria-label="画布设置" title="重命名或管理当前画布" disabled={busy} onClick={()=>{setError('');setDraft({page:current,name:current.name,summary:current.summary});}}><Icon name="edit"/></button>;
  return <><SidebarSection title="画布" action={add}><div className="canvas-page-list" role="listbox" aria-label={kind==='planning'?'规划画布':'设定画布'}>{pages.map(p=><button type="button" className="canvas-page-row" role="option" aria-selected={(p.id||'')===value} data-page-id={p.id||''} key={p.id||'main'} disabled={busy} title={p.summary||p.name} onClick={()=>change(p.id||'')}><Icon name="folder"/><span>{p.name}</span><small>{p.nodeCount}</small></button>)}</div>{settings&&<div className="canvas-page-settings">{settings}</div>}</SidebarSection>
  {draft&&<Modal title={draft.page?'画布设置':'新建画布'} close={()=>setDraft(null)}><form className="editor-fields" onSubmit={async e=>{e.preventDefault();const ok=draft.page?await update(draft.page,draft.name,draft.summary):await create(draft.name,draft.summary);if(ok)setDraft(null);else setError('未保存，请核对提示后重试。');}}><label>画布名称<input autoFocus required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>用途摘要<textarea placeholder="这张画布整理什么，方便你和 AI 找到它" value={draft.summary} onChange={e=>setDraft({...draft,summary:e.target.value})}/></label>{error&&<p role="alert">{error}</p>}<div className="row"><button type="submit" className="primary" disabled={busy||!draft.name.trim()}>保存画布</button>{draft.page&&<button type="button" disabled={busy||draft.page.nodeCount>0||draft.page.decorationCount>0||!!draft.page.groupCount} title="只删除空画布；请先移动内容并解散文件夹" onClick={async()=>{if(await remove(draft.page!))setDraft(null);else setError('未删除，请核对画布是否仍有内容。');}}>删除空画布</button>}</div></form></Modal>}
  </>;
}

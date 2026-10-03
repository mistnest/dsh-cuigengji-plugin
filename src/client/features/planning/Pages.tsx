import React,{useState} from 'react';
import {Modal} from '../../shared/preferences.tsx';
import {FilterControl} from '../../shared/workspace.tsx';
export interface PageIndex {id:string|null;name:string;summary:string;revision:number;nodeCount:number;decorationCount:number}
interface Props {pages:PageIndex[];value:string;busy:boolean;change:(id:string)=>void;create:(name:string,summary:string)=>Promise<boolean|undefined>;update:(page:PageIndex,name:string,summary:string)=>Promise<boolean|undefined>;remove:(page:PageIndex)=>Promise<boolean|undefined>}
export function PlanningPages({pages,value,busy,change,create,update,remove}:Props){
  const [draft,setDraft]=useState<{page?:PageIndex;name:string;summary:string}|null>(null),[error,setError]=useState('');
  const current=pages.find(p=>(p.id||'')===value);
  return <><div className="planning-page-picker"><FilterControl label="规划页面" value={value} change={id=>{if(id==='__new'){setError('');setDraft({name:'',summary:''});}else if(id==='__settings'&&current){setError('');setDraft({page:current,name:current.name,summary:current.summary});}else change(id);}}>{pages.map(p=><option key={p.id||'main'} value={p.id||''}>{p.name}</option>)}<option value="__new" disabled={busy}>＋ 新建页面</option>{current?.id&&<option value="__settings">页面设置…</option>}</FilterControl></div>
  {draft&&<Modal title={draft.page?'页面设置':'新建规划页面'} close={()=>setDraft(null)}><form className="editor-fields" onSubmit={async e=>{e.preventDefault();const ok=draft.page?await update(draft.page,draft.name,draft.summary):await create(draft.name,draft.summary);if(ok)setDraft(null);else setError('未保存，请核对提示后重试。');}}><label>页面名称<input autoFocus required value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label><label>用途摘要<textarea placeholder="这页讨论哪段情节，方便你和 AI 找到它" value={draft.summary} onChange={e=>setDraft({...draft,summary:e.target.value})}/></label>{error&&<p role="alert">{error}</p>}<div className="row"><button type="submit" className="primary" disabled={busy||!draft.name.trim()}>保存页面</button>{draft.page&&<button type="button" disabled={busy||draft.page.nodeCount>0||draft.page.decorationCount>0} title="只删除空页面；有内容时请先移动情节并删除批注" onClick={async()=>{if(await remove(draft.page!))setDraft(null);else setError('未删除，请核对页面是否仍有内容。');}}>删除空页面</button>}</div></form></Modal>}
  </>;
}

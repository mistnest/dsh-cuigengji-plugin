import {DocumentTextarea} from './workspace.tsx';
import React, {useRef} from 'react';
import {useDraft} from './state.js';
import {useDialog} from '../dialog.tsx';
import {GroupSelect, type GroupItem} from './groups.tsx';

export interface DocumentDraft {title: string; summary: string; content: string; groupId: string | null}
interface Props {
  draftKey: string; label: string; initial: DocumentDraft; groups: GroupItem[];
  busy: boolean; context?: string; chapter?: boolean;
  close: () => void; createGroup: (name: string) => Promise<GroupItem | null>;
  save: (value: DocumentDraft, requestId: string) => Promise<boolean | undefined>;
}
/** Creation remains local until save. In particular, cancelling a continuation creates no node or edge. */
export function CreateDocument({draftKey,label,initial,groups,busy,context,chapter,close,createGroup,save}: Props) {
  const {value,change,accept,dirty,cacheError} = useDraft(draftKey,initial);
  const request = useRef({payload:'',id:''});
  const submit = async () => {
    const payload=JSON.stringify(value);
    if(request.current.payload!==payload)request.current={payload,id:crypto.randomUUID()};
    if(await save(value,request.current.id)){accept(initial);close();}
  };
  const {ask,confirm} = useDialog();
  const set = (field: keyof DocumentDraft, next: string | null) => change((old: DocumentDraft)=>({...old,[field]:next}));
  const cancel = async () => {if(!dirty || await confirm('取消新建并丢弃这份草稿？')) {accept(initial);close();}};
  return <section className="creation"><header className="creation-bar"><button disabled={busy} onClick={cancel}>‹ 取消</button><span className="grow">{label}</span><button className="primary" disabled={busy||!value.title.trim()} onClick={submit}>创建</button></header>
    <div className="creation-scroll"><div className="creation-document">{context&&<p className="creation-context">{context}</p>}<div className="creation-settings">
      {chapter?<label>所属卷<select value={value.groupId||''} onChange={e=>set('groupId',e.target.value||null)}><option value="">未分卷</option>{groups.map(g=><option value={g.id} key={g.id}>{g.name}</option>)}</select></label>:<GroupSelect groups={groups} value={value.groupId} onChange={id=>set('groupId',id)}/>}
      <button disabled={busy} onClick={async()=>{const name=await ask(chapter?'新卷名称':'新建分组名称');if(name?.trim()){const g=await createGroup(name);if(g)set('groupId',g.id);}}}>＋ {chapter?'新建卷':'新建分组'}</button></div>
      <fieldset className="editor-fields document-fields" disabled={busy}><label>标题<input autoFocus placeholder="写一个清晰的标题" value={value.title} onChange={e=>set('title',e.target.value)}/></label>
      {!chapter&&<label><span>摘要 <small>可选</small></span><DocumentTextarea placeholder="用几句话概括，方便之后查找" value={value.summary} onChange={e=>set('summary',e.target.value)}/></label>}
      <label><span>正文 <small>可选</small></span><DocumentTextarea className="prose" placeholder="从这里开始，自由记录内容…" value={value.content} onChange={e=>set('content',e.target.value)}/></label></fieldset>{cacheError&&<p role="alert">{cacheError}</p>}
    </div></div></section>;
}

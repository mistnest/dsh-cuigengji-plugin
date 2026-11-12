import React,{useEffect,useState} from 'react';
import {useDraft} from './state.js';
import {Modal} from './preferences.tsx';
import {mergeDocument} from './document-merge.ts';
import type {FeatureRun} from './workspace-state.ts';

type Document=Record<string,any>&{revision:number;deleted?:boolean};
interface Options {
  key:string;initial:Document;fresh?:Document|null;busy:boolean;run:FeatureRun;
  fields:readonly string[];load:()=>Promise<Document>;
  persist:(patch:Record<string,unknown>,remote:Document)=>Promise<Document>;
  saved?:(value:Document)=>void;
}
const labels:Record<string,string>={title:'标题',name:'名称',summary:'摘要',content:'正文',type:'类型',groupId:'分组',status:'讨论进展',scope:'范围',parentId:'所属阶段',threads:'故事线',chapterRefs:'正文引用',memoryRefs:'设定引用'};
export function useDocumentDraft(options:Options) {
  const draft=useDraft(options.key,options.initial);
  const {value,base,accept,dirty}=draft;
  const fresh=options.fresh||options.initial;
  const [conflict,setConflict]=useState<{local:Document;remote:Document;merged:Document;fields:string[]}|null>(null);
  useEffect(()=>{if(!options.busy&&!dirty&&fresh.revision>base.revision)accept(fresh);},[fresh,options.busy,dirty,base.revision]);
  const commit=async(local:Document,baseline:Document):Promise<Document|null>=>{
    let committed:Document|null=null;
    await options.run(async()=>{
      for(let attempt=0;attempt<2;attempt++){
        const remote=await options.load();
        if(remote.deleted)throw new Error('这条内容已经被删除，草稿仍保留；请返回核对。');
        const merged=mergeDocument(baseline,local,remote,options.fields);
        if(merged.conflicts.length){setConflict({local,remote,merged:merged.value,fields:merged.conflicts});return;}
        try {
          const result=Object.keys(merged.patch).length?await options.persist(merged.patch,remote):remote;
          accept(result);options.saved?.(result);committed=result;return;
        } catch(error) {
          if(attempt===1||!/(CONFLICT|版本.*变|已.*新版本)/.test(error instanceof Error?error.message:String(error)))throw error;
        }
      }
    });
    return committed;
  };
  const save=()=>options.busy?Promise.resolve(null):commit(value,base);
  const remoteChanged=Boolean(dirty&&fresh.revision>base.revision&&options.fields.some(key=>JSON.stringify(fresh[key])!==JSON.stringify(base[key])));
  return {...draft,save,remoteChanged,conflictDialog:conflict&&<ConflictDialog key={conflict.remote.revision} {...conflict} busy={options.busy} close={()=>setConflict(null)} save={choices=>{
    const next={...conflict.merged};for(const key of conflict.fields)next[key]=choices[key]==='local'?conflict.local[key]:conflict.remote[key];
    setConflict(null);void commit(next,conflict.remote);
  }}/>};
}
function ConflictDialog({local,remote,merged,fields,busy,close,save}:{local:Document;remote:Document;merged:Document;fields:string[];busy:boolean;close:()=>void;save:(choices:Record<string,string>)=>void}) {
  const [choices,setChoices]=useState<Record<string,string>>({});
  const show=(value:unknown)=>typeof value==='string'?value:JSON.stringify(value,null,2);
  return <Modal title="核对同时修改的内容" close={close} className="document-conflict-modal">
    <p className="muted">其他互不影响的修改已合并到待保存内容。下面这些位置被同时改动，请选择要保留的一版。</p>
    {fields.map(key=><fieldset className="conflict-field" key={key}><legend>{labels[key]||key}</legend><div className="split">{[['local','我的草稿',local],['remote','作品中的新版本',remote]].map(([choice,label,data])=><label key={choice as string}><span><input type="radio" aria-label={`${labels[key]||key}：${label}`} name={key} checked={choices[key]===choice} onChange={()=>setChoices({...choices,[key]:choice as string})}/>{label as string}</span><pre>{show((data as Document)[key])||'（空）'}</pre></label>)}</div></fieldset>)}
    <footer className="utility-footer"><button onClick={close} disabled={busy}>继续编辑草稿</button><button className="primary" disabled={busy||fields.some(key=>!choices[key])} onClick={()=>save(choices)}>合并并保存</button></footer>
  </Modal>;
}

import React,{useMemo,useState} from 'react';
import {highlightProseLine,type DiffPart,type ProseDiffChunk} from '../../domain/chapters/diff.ts';

function Parts({parts}:{parts:DiffPart[]}){return <>{parts.map((part,index)=>part.kind==='remove'?<del key={index}>{part.text}</del>:part.kind==='add'?<ins key={index}>{part.text}</ins>:<React.Fragment key={index}>{part.text}</React.Fragment>)}</>;}
export function ChangeRows({chunk}:{chunk:ProseDiffChunk}){
  const rows=useMemo(()=>Array.from({length:Math.max(chunk.before.length,chunk.after.length)},(_,index)=>{
    const before=chunk.before[index],after=chunk.after[index];
    const parts=before!==undefined&&after!==undefined?highlightProseLine(before,after):null;
    return {index,before,after,parts};
  }),[chunk]);
  const cell=(side:'before'|'after',row:typeof rows[number])=>{
    const text=row[side],number=(side==='before'?chunk.oldLine:chunk.newLine)+row.index,parts=row.parts?.[side];
    return <div className={`prose-diff-cell ${text===undefined?'is-blank':side==='before'?'is-removed':'is-added'}`}><span className="prose-diff-number" aria-hidden="true">{text===undefined?'':number}</span><div>{text===undefined?null:parts?<Parts parts={parts}/>:side==='before'?<del>{text||'\u00a0'}</del>:<ins>{text||'\u00a0'}</ins>}</div></div>;
  };
  return <><div className="prose-diff-side">{rows.map(row=><div className="prose-diff-row" key={row.index}>{cell('before',row)}{cell('after',row)}</div>)}</div><div className="prose-diff-inline"><small>− 改稿前</small>{rows.filter(row=>row.before!==undefined).map(row=><React.Fragment key={row.index}>{cell('before',row)}</React.Fragment>)}<small>＋ 修改后</small>{rows.filter(row=>row.after!==undefined).map(row=><React.Fragment key={row.index}>{cell('after',row)}</React.Fragment>)}</div></>;
}
export function UnchangedRows({chunk}:{chunk:ProseDiffChunk}){
  const [expanded,setExpanded]=useState(false),length=chunk.after.length;
  const rows=expanded||length<=8?chunk.after.map((_,index)=>index):[0,1,2,-1,length-3,length-2,length-1];
  return <div className="prose-diff-context">{rows.map(index=>index<0?<button type="button" className="prose-diff-expand" key="expand" onClick={()=>setExpanded(true)}>展开中间 {length-6} 行未修改的内容</button>:<div className="prose-diff-row" key={index}><div className="prose-diff-cell context-before"><span className="prose-diff-number" aria-hidden="true">{chunk.oldLine+index}</span><div>{chunk.before[index]||'\u00a0'}</div></div><div className="prose-diff-cell"><span className="prose-diff-number" aria-hidden="true">{chunk.newLine+index}</span><div>{chunk.after[index]||'\u00a0'}</div></div></div>)}</div>;
}

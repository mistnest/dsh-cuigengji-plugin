import type {Call} from './management-page.tsx';
interface EvidenceProps {call: Call; novelId: string; source: {chapterId: string; revision: number}; title?: string; onChapter?(id: string): void}
import React,{useState} from 'react';
import {useResource} from './state.ts';
import {ResourceState} from './ui.tsx';
export function ChapterEvidence({call,novelId,source,title,onChapter}: EvidenceProps) {
 const [open,setOpen]=useState(false);
 return <section className="source-row"><span>{title||'已删除或缺失章节'} · 引用版本{source.revision}</span><button type="button" onClick={()=>setOpen(!open)}>{open?'收起引用正文':'查看引用版本'}</button>{onChapter&&<button type="button" onClick={()=>onChapter(source.chapterId)}>打开当前正文</button>}{open&&<Version {...{call,novelId,source}}/>}</section>;
}
function Version({call,novelId,source}: EvidenceProps) {
 const resource=useResource(()=>call<{revision: number; content: string}[]>('chapter.history',{novelId,chapterId:source.chapterId,includeContent:true}).then(versions=>{const value=versions.find(v=>v.revision===source.revision);if(!value)throw new Error('引用版本不存在');return value;}),[call,novelId,source.chapterId,source.revision]);
 return <ResourceState resource={resource}>{resource.value&&<pre aria-label="引用的历史正文">{resource.value.content}</pre>}</ResourceState>;
}

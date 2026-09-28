import React,{useState} from 'react';
import {useResource} from './state.js';
import {ResourceState} from './ui.jsx';
export function ChapterEvidence({call,novelId,source,title,onChapter}) {
 const [open,setOpen]=useState(false);
 return <section className="source-row"><span>{title||'已删除或缺失章节'} · 引用版本{source.revision}</span><button onClick={()=>setOpen(!open)}>{open?'收起引用正文':'查看引用版本'}</button><button onClick={()=>onChapter?.(source.chapterId)}>打开当前正文</button>{open&&<Version {...{call,novelId,source}}/>}</section>;
}
function Version({call,novelId,source}) {
 const resource=useResource(()=>call('chapter.history',{novelId,chapterId:source.chapterId,includeContent:true}).then(versions=>{const value=versions.find(v=>v.revision===source.revision);if(!value)throw new Error('引用版本不存在');return value;}),[call,novelId,source.chapterId,source.revision]);
 return <ResourceState resource={resource}>{resource.value&&<pre aria-label="引用的历史正文">{resource.value.content}</pre>}</ResourceState>;
}

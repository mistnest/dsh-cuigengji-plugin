import React from 'react';
import { useResource } from '../shared/state.js';
import { ResourceState, ReadingText } from '../shared/ui.jsx';
import { renderHandoff } from '../../core/handoff-text.js';
export function Context({call,novelId,tick,onNavigate}) {
  const resource=useResource(()=>call('novel.handoff',{novelId}),[call,novelId,tick]);
  const value=resource.value;
  const current=value?.chapters.find(chapter=>chapter.id===value.binding?.chapterId);
  return <><div className="row"><h2 className="grow">项目接手信息</h2><button disabled={resource.loading} onClick={resource.retry}>刷新</button></div>
    <p className="muted">AI 接手时只收到项目索引，正文和资料由它按任务读取。</p>
    <ResourceState resource={resource}>{value&&<>
      <h3>{value.novel.title}</h3>
      <p>参考章节：{current?.title||(value.currentChapterStatus==='unavailable'?'原章节已不可用，请重新选择':'未指定')}</p>
      <p>当前任务：{value.binding?.goal||'以当前会话中的要求为准'}</p>
      <p className="muted">共 {value.chapterCount} 章 · 预设{value.available.preset?'已启用':'未启用'} · {value.available.planning} 条规划 · {value.available.memory} 条人物与世界资料</p>
      <p>取材顺序：正文 → 预设 → 规划 → 相关人物与世界资料。</p>
      <div className="row"><button onClick={()=>onNavigate('chapters')}>查看正文</button><button onClick={()=>onNavigate('preset')}>写作预设</button><button onClick={()=>onNavigate('plan')}>查看规划</button><button onClick={()=>onNavigate('memory')}>人物与世界</button></div>
      <details className="card"><summary>查看完整接手说明</summary><ReadingText text={renderHandoff(value)}/></details>
      <p className="muted">这里展示当前项目的接手说明，不代表 AI 已经读过正文，也不是上一轮读取记录。</p>
    </>}</ResourceState>
  </>;
}

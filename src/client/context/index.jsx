import React, { useEffect, useRef, useState } from 'react';
import { useDialog } from '../dialog.jsx';
import { useDraft, useResource } from '../shared/state.js';
import { ResourceState, ReadingText, SaveBar, saveShortcut } from '../shared/ui.jsx';
const message = error => error?.message || String(error);
export function Context({call,novelId,tick}) {
  const resource=useResource(()=>call('context.get',{novelId}),[call,novelId,tick]);
  const value=resource.value;
  const names={approved_plan:'已确认规划',chapter:'章节正文',character_card:'人物',world_book:'世界书',world_entry:'世界设定'};
  return <><span className="eyebrow">供 Agent 写作参考</span><h2>本轮写作参考</h2><p className="muted">根据当前参考章节选取的资料。Agent 也可以按需读取其他原文。</p><ResourceState resource={resource}>{value&&<>
    {value.staleMemory.length>0&&<div className="notice">需要核对：{value.staleMemory.map(n=>n.name).join('、')}。来源正文发生过修改。</div>}
    {!value.items.length&&<p className="empty">暂无参考资料。先选择参考章节，或补充规划和设定。</p>}
    {value.items.map((item,i)=><details className="card" key={`${item.id}:${i}`}><summary>{item.title||names[item.kind]||'参考资料'}<span className="muted"> · 版本{item.revision}{item.truncated?' · 仅选取部分':''}</span></summary><ReadingText text={item.content}/></details>)}
    <details><summary>选取详情</summary><p className="muted">已使用 {value.usedChars} / {value.maxChars} 字符；未纳入 {value.omitted.length} 项。</p>{value.omitted.map((item,i)=><p key={i}>{typeof item==='string'?item:item.title||item.name||'其他资料'} · 超出本次选取范围</p>)}</details>
  </>}</ResourceState></>;
}

import React from 'react';
import { useResource } from '../shared/state.js';
import { ResourceState, ReadingText } from '../shared/ui.jsx';
import { renderReference } from '../../core/context.js';
export function Context({call,novelId,tick}) {
  const resource=useResource(()=>call('context.get',{novelId}),[call,novelId,tick]);
  const value=resource.value;
  const names={approved_plan:'已确认规划',previous_chapter:'前文片段',current_chapter:'当前参考章节'};
  return <><span className="eyebrow">自动参考与按需查询</span><h2>写作参考</h2>
    <p className="muted">这里预览当前数据下的自动加载内容，不是上一轮模型实际请求的记录。</p>
    <button disabled={resource.loading} onClick={resource.retry}>刷新预览</button>
    <section className="card"><h3>通过工具按需查询</h3><p>人物卡、世界书与关系不会自动注入。Agent 根据场景搜索人物、地点和规则，再读取完整资料，检查状态、版本、来源与知情范围。</p><p className="muted">没有相关结果时应说明或询问；待确认与过期资料不能当成既定事实。</p></section>
    <ResourceState resource={resource}>{value&&<>
      <h3>当前自动加载内容</h3>
      {!value.items.length&&<p className="empty">暂无自动参考。请确认规划，或选择参考章节。</p>}
      {value.items.map((item,i)=><details className="card" key={`${item.id}:${i}`}><summary>{names[item.kind]||'资料'} · {item.title}<span className="muted"> · 版本{item.revision}{item.truncated?` · 仅含${item.position}片段`:''}</span></summary><ReadingText text={item.content}/></details>)}
      <p className="muted">自动参考内容共 {value.usedChars} 字符。插件不设字符上限、不截断：已确认规划、前面最多两章和当前参考章均完整加载。模型自身仍有上下文容量限制。</p>
      <details className="card"><summary>查看提供给模型的参考文本</summary><pre>{renderReference(value)}</pre></details>
    </>}</ResourceState>
  </>;
}

import React from 'react';
import { useResource } from '../shared/state.js';
import { ResourceState, ReadingText } from '../shared/ui.jsx';
import { renderReference } from '../../core/context.js';
export function Context({call,novelId,tick,onNavigate}) {
  const resource=useResource(()=>call('context.get',{novelId}),[call,novelId,tick]);
  const value=resource.value;
  const names={previous_chapter:'前文章节',current_chapter:'当前参考章节'};
  return <><div className="row"><h2 className="grow">AI 参考</h2><button disabled={resource.loading} onClick={resource.retry}>刷新</button></div>
    <p className="muted">这里预览当前数据下的自动加载内容，不是上一轮模型实际请求的记录。</p>

    <ResourceState resource={resource}>{value&&<>
      <h3>当前自动加载内容</h3>
      {!value.items.length&&<p className="empty">暂无自动参考。请选择参考章节。</p>}
      {value.items.map((item,i)=><details className="card" key={`${item.id}:${i}`}><summary>{names[item.kind]||'资料'} · {item.title}<span className="muted"> · 版本{item.revision}{item.truncated?` · 仅含${item.position}片段`:''}</span></summary><ReadingText text={item.content}/></details>)}
      {value.task&&<section className="section-fold"><h3>当前任务</h3><p>{value.task.goal||'以作者当前消息为准'}</p>{value.task.stage&&<p className="muted">阶段：{value.task.stage}</p>}</section>}
    <section className="section-fold"><h3>通过工具按需查询</h3><p>规划、人物卡、世界书与关系不会自动注入。需要时通过工具查询。</p><div className="row"><button onClick={()=>onNavigate('plan')}>查看规划</button><button onClick={()=>onNavigate('memory')}>查看人物与世界</button></div></section>
      <p className="muted">自动参考内容共 {value.usedChars} 字符。插件不设字符上限、不截断：前面最多两章和当前参考章均完整加载。模型自身仍有上下文容量限制。</p>
      <details className="card"><summary>查看提供给模型的参考文本</summary><pre>{renderReference(value)}</pre></details>
    </>}</ResourceState>
  </>;
}

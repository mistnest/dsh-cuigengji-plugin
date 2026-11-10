import React, {useEffect, useMemo, useState} from 'react';
import type {StoryContext, StoryContextItem, StoryContextOmission, StorySnapshot} from '../../../contracts/story.ts';
import {useWorkspacePreference} from '../../shared/workspace-state.ts';
import {chapterTitle} from './model.ts';
import type {StoryActions} from './useStoryWorkspace.ts';

type Props=StoryActions&{onChapter:(id?:string)=>void;onLoad:(chapterId:string,maxChars:number)=>Promise<StoryContext>};
const reasonNames:Record<StoryContextOmission['reason'],{label:string;note:string}>={'future':{label:'后续章节',note:'超出目标章的正文不会被读取。'},
  stale:{label:'来源已变化',note:'核对当前正文后才会重新进入上下文。'},deleted:{label:'已删除',note:'来源章节已不存在。'},
  budget:{label:'超出预算',note:'提高预算或减少其他材料后才能带入。'},unconfirmed:{label:'未确认设定',note:'设定尚未确认为当前事实。'}};
const kindNames:Record<StoryContextItem['kind'],string>={brief:'创作简报',outline:'章节蓝图',tracking:'已发生事实',manuscript:'正文',setting:'已确认设定',commitment:'后续义务',thread:'未完成线索',review:'审稿意见',unit:'剧情单元',style:'文风要求'};
const budgets=[4000,8000,12000,16000,24000];
export function ContextPreview({snapshot,onChapter,onLoad}:Props) {
  const [chapterId,setChapterId]=useWorkspacePreference(`${snapshot.novelId}:context-chapter`,'');
  const [budget,setBudget]=useWorkspacePreference(`${snapshot.novelId}:context-budget`,12000);
  const target=snapshot.chapters.find(chapter=>chapter.id===chapterId)||snapshot.chapters.at(-1)||null;
  const [state,setState]=useState<{value:StoryContext|null;error:string;loading:boolean}>({value:null,error:'',loading:false});
  const key=`${snapshot.novelId}:${target?.id||'none'}:${budget}:${snapshot.story.revision}`;
  useEffect(()=>{
    let live=true;setState(previous=>({...previous,loading:true,error:''}));
    // story.context.get is read-only; it never changes story.revision and never rebases author work.
    onLoad(target?.id||'',budget).then(value=>{if(live)setState({value,error:'',loading:false});})
      .catch(error=>{if(live)setState({value:null,error:error instanceof Error?error.message:String(error),loading:false});});
    return()=>{live=false;};
  },[key,onLoad,budget,target?.id]);
  const context=state.value;
  const groups=useMemo(()=>groupOmissions(context),[context]);
  const ratio=context&&context.maxChars?Math.min(1,context.usedChars/context.maxChars):0;
  return <section className="story-context" aria-label="AI 上下文预览">
    <div className="story-section-heading"><div><h2>AI 现在能看到什么</h2><p>按目标章和字数预算读取，只带入这一章及之前已确认的材料；这里只读取，不会改成正文或创作记录。</p></div></div>
    <div className="story-context-controls">
      <label className="story-inline-field">目标章节<select value={target?.id||''} onChange={event=>setChapterId(event.target.value)}>{snapshot.chapters.length?snapshot.chapters.map(chapter=><option key={chapter.id} value={chapter.id}>{chapter.title}</option>):<option value="">尚无章节</option>}</select></label>
      <label className="story-inline-field">字符预算<select value={budget} onChange={event=>setBudget(Number(event.target.value))}>{budgets.map(value=><option key={value} value={value}>{value.toLocaleString('zh-CN')}</option>)}</select></label>
      {target&&<button className="story-context-open" onClick={()=>onChapter(target.id)}>查看这一章正文 →</button>}
    </div>
    {state.loading&&!context?<p className="story-muted" role="status">正在读取上下文…</p>:state.error?<div className="story-alert story-error" role="alert"><p>{state.error}</p></div>:context?<>
      <div className="story-context-budget" role="group" aria-label="预算占用">
        <div className="story-context-bar" aria-hidden="true"><i style={{width:`${Math.round(ratio*100)}%`}}/></div>
        <p>{context.usedChars.toLocaleString('zh-CN')} / {context.maxChars.toLocaleString('zh-CN')} 字符{context.chapterId?` · 截至《${chapterTitle(snapshot,context.chapterId)}》`:''}{state.loading?' · 更新中…':''}</p>
        <ul className="story-context-legend"><li><i className="story-context-key tone-fact"/>正文与事实 {context.facts.length} 项</li><li><i className="story-context-key tone-plan"/>计划与义务 {context.plans.length} 项</li><li><i className="story-context-key tone-omitted"/>未带入 {context.omittedCount} 项</li></ul>
      </div>
      <div className="story-context-columns">
        {(['facts','plans'] as const).map(section=><div className="story-context-column" key={section}>
          <h3>{section==='facts'?'正文与事实':'计划与义务'}<span>{context[section].length} 项</span></h3>
          {context[section].length?context[section].map(item=><article className="story-context-item" key={`${section}:${item.kind}:${item.id}`}>
            <header><strong>{item.title}</strong><span className="story-badge">{kindNames[item.kind]}</span>{item.truncated&&<span className="story-badge story-tone-warning">已截断</span>}</header>
            {item.chapterId&&<button className="story-context-link" onClick={()=>onChapter(item.chapterId)}>{chapterTitle(snapshot,item.chapterId)}{item.revision!==undefined?` · v${item.revision}`:''} →</button>}
            <p>{item.content}</p>
          </article>):<p className="story-column-empty">这一类没有内容进入上下文。</p>}
        </div>)}
        <div className="story-context-column story-context-omitted">
          <h3>没有带入<small>{context.omittedCount} 项{context.omittedTruncated?'（列表已截断）':''}</small></h3>
          {groups.length?<>{groups.map(group=><details key={group.reason} open={group.reason!=='budget'}>
            <summary><strong>{reasonNames[group.reason].label}</strong><span>{group.items.length}{context.omittedTruncated&&group.items.length>=30?'+':''} 项</span></summary>
            <p className="story-muted">{reasonNames[group.reason].note}</p>
            <ul>{group.items.map(item=><li key={`${item.kind}:${item.id}`}>{itemLabel(snapshot,item)}</li>)}</ul>
          </details>)}</>:<p className="story-column-empty">{context.omittedCount>0?'省略清单本身超出元数据预算，只保留计数。':'全部材料都已带入。'}</p>}
        </div>
      </div>
    </>:null}
  </section>;
}
function itemLabel(snapshot:StorySnapshot,item:StoryContextOmission) {
  // Omissions carry only kind/id; removed records keep a readable chapter label instead.
  const fromChapter=(id?:string)=>id?chapterTitle(snapshot,id):'已移除的章节';
  switch(item.kind){
    case 'manuscript':case 'tracking':case 'commitment':return `《${fromChapter(item.id)}》`;
    case 'outline':case 'review':return `《${fromChapter(item.id)}》的一条${kindNames[item.kind]}`;
    case 'thread':return snapshot.story.threads[item.id]?`未完成线索：${snapshot.story.threads[item.id].title}`:'一条已移除的线索';
    case 'setting':return '未确认、待核对或已过期的设定一条';
    case 'brief':return '创作简报';
  }
}
function groupOmissions(context:StoryContext|null) {
  const groups=new Map<StoryContextOmission['reason'],StoryContextOmission[]>();
  for(const item of context?.omitted||[])groups.set(item.reason,[...(groups.get(item.reason)||[]),item]);
  const order:StoryContextOmission['reason'][]=['future','stale','deleted','unconfirmed','budget'];
  return order.filter(reason=>groups.has(reason)).map(reason=>({reason,items:groups.get(reason)!}));
}

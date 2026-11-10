import React, {useEffect, useMemo, useState} from 'react';
import type {DetectorCount, DetectorFinding, DetectorLayer, DetectorResult} from '../../../contracts/story.ts';
import {useWorkspacePreference} from '../../shared/workspace-state.ts';
import {Badge} from './shared.tsx';
import {chapterTitle} from './model.ts';
import type {StoryActions} from './useStoryWorkspace.ts';

type Props=StoryActions&{onChapter:(id?:string)=>void;onDetect:(channel:number)=>Promise<DetectorResult[]>};
/** English detector types are rendered as author-facing Chinese labels. */
const typeNames:Record<string,string>={'not-is-comparison':'是A不是B对比句式','voice-contrast':'声音反差腔','negation-parade':'否定排比','reverse-not-is':'反序对比','trailer-ending':'预告式收尾','trailer-summary':'章尾总结体','em-dash':'破折号打断','long-paragraph':'长段落','period-stutter':'碎句号','micro-action-tic':'微动作复读','negation-pair-tic':'否定对偶','cliche-density-tic':'套词密集','stock-reaction-tic':'套式反应','action-list-tic':'动作清单','abstract-summary-tic':'抽象总结','metaphor-density-tic':'比喻密集','reasoning-chain-tic':'解释链密集','system-notice-formality-tic':'公文腔','overcompressed-prose-tic':'过度精炼','low-connective-density-tic':'连接词偏少','quote-emphasis-tic':'引号强调','formulaic-parallelism':'工整并列'};
const layerNames:Record<DetectorLayer,{label:string;note:string}>={expression:{label:'表达',note:'句式与用词层面的机器感。'},narrative:{label:'用笔',note:'段落节奏与收尾方式。'},logic:{label:'逻辑',note:'叙述者替读者下判断的地方。'}};
const layerOrder:DetectorLayer[]=['expression','narrative','logic'];
const severityNames:Record<DetectorFinding['severity'],string>={blocking:'优先查看',advisory:'参考'};
const reviewNames:Record<DetectorFinding['review'],string>={mechanical:'句式规则',semantic:'语义候选'};
const typeLabel=(type:string)=>typeNames[type]||type;
/** DetectorCount carries no layer, so the rule table's layer is mapped from the shipped rule ids. */
const LAYER_BY_TYPE:Record<string,DetectorLayer>={
  'not-is-comparison':'expression','voice-contrast':'expression','negation-parade':'expression','reverse-not-is':'expression',
  'trailer-ending':'narrative','trailer-summary':'narrative','em-dash':'expression','long-paragraph':'narrative',
  'period-stutter':'expression','micro-action-tic':'narrative','negation-pair-tic':'expression','cliche-density-tic':'expression',
  'stock-reaction-tic':'narrative','action-list-tic':'narrative','abstract-summary-tic':'narrative','metaphor-density-tic':'expression',
  'reasoning-chain-tic':'logic','system-notice-formality-tic':'expression','overcompressed-prose-tic':'narrative',
  'low-connective-density-tic':'narrative','quote-emphasis-tic':'expression','formulaic-parallelism':'expression',
};
const layerOf=(type:string):DetectorLayer=>LAYER_BY_TYPE[type]||'expression';
/** A chapter's heat is its candidate density per thousand characters, never a quality score. */
const densityTone=(result:DetectorResult):number=>{
  if(result.totalChars<=0)return 0;
  if(result.blocking>0)return 3;
  if(result.perThousand>=8)return 3;
  if(result.perThousand>=4)return 2;
  return result.findings.length?1:0;
};
const toneNames=['未发现','少量','较多','密集'];
export function DetectBoard({snapshot,onChapter,onDetect}:Props) {
  const [channel,setChannel]=useWorkspacePreference(`${snapshot.novelId}:detect-channel`,0);
  const [state,setState]=useState<{value:DetectorResult[]|null;error:string;loading:boolean}>({value:null,error:'',loading:false});
  const [openId,setOpenId]=useState(''),[held,setHeld]=useState<DetectorResult[]>([]);
  // Mount and every manual rescan bump the channel; the scan is read-only and never writes prose.
  useEffect(()=>{
    let live=true;setState(previous=>({...previous,loading:true,error:''}));
    onDetect(channel).then(value=>{if(live)setState({value:Array.isArray(value)?value:[],error:'',loading:false});})
      .catch(error=>{if(live)setState({value:null,error:error instanceof Error?error.message:String(error),loading:false});});
    return()=>{live=false;};
  },[channel,onDetect]);
  useEffect(()=>{if(state.value)setHeld(state.value);},[state.value]);
  const results=state.value||held;
  const byId=useMemo(()=>new Map(results.map(result=>[result.chapterId,result])),[results]);
  const summary=useMemo(()=>summarize(results),[results]);
  const latest=results.reduce<DetectorResult|null>((last,result)=>!last||result.ranAt>last.ranAt?result:last,null);
  const written=snapshot.chapters.filter(chapter=>chapter.textCount>0);
  const open=results.find(result=>result.chapterId===openId)||null;
  const openChapter=open?snapshot.chapters.find(chapter=>chapter.id===open.chapterId):undefined;
  if(!written.length)return <section className="story-detect" aria-label="去 AI 味体检">
    <div className="story-section-heading"><div><h2>去 AI 味体检</h2><p>只读取已保存的正文，按句式和段落标出候选位置。</p></div></div>
    <div className="story-empty"><h3>还没有正文可以体检</h3><p>写下并保存至少一章正文后，这里会列出值得回看的位置。检测不会读取未保存的草稿。</p><button onClick={()=>onChapter()}>打开正文页 →</button></div>
    <Disclaimer/>
  </section>;
  return <section className="story-detect" aria-label="去 AI 味体检">
    <div className="story-section-heading"><div><h2>去 AI 味体检</h2><p>逐章列出可能读起来像机器的位置，按表达、用笔、逻辑三类汇总。命中只是候选位置，等你判断。</p></div>
      <div className="story-detect-toolbar">
        {state.loading&&results.length>0&&<span className="story-muted" role="status">正在重新扫描…</span>}
        <button className="story-detect-action" disabled={state.loading} onClick={()=>setChannel(previous=>previous+1)}>{state.loading?'正在扫描…':'重新扫描'}</button>
      </div></div>
    <Disclaimer/>
    {state.error?<div className="story-alert story-error" role="alert"><p>这次扫描没有完成：{state.error}</p><p>正文没有被改动，可以重试。</p><button disabled={state.loading} onClick={()=>setChannel(previous=>previous+1)}>重试扫描</button></div>
      :!results.length&&state.loading?<p className="story-muted" role="status">正在读取正文并扫描候选位置…</p>
      :!results.length?<p className="story-muted" role="status">整本扫描没有可读的正文，或扫描结果为空。可以重新扫描一次。</p>
      :<>
        <section className="story-detect-heat" aria-label="章节候选热力图">
          <div className="story-figure-heading"><div><h3>各章候选热度</h3><p>一格一章，颜色越深表示这一章候选越密集。没有正文的章节不参与扫描。</p></div>
            <ul className="story-legend" aria-label="热度图例"><li><i className="story-detect-key heat-0"/>未发现</li><li><i className="story-detect-key heat-1"/>少量</li><li><i className="story-detect-key heat-2"/>较多</li><li><i className="story-detect-key heat-3"/>密集</li></ul></div>
          <div className="story-detect-heat-scroll">
            <div className="story-detect-heat-grid">{snapshot.chapters.map((chapter,index)=>{
              const result=byId.get(chapter.id),tone=result?densityTone(result):-1,excluded=result?.excluded;
              return <button key={chapter.id} className="story-detect-heat-cell" data-heat={tone>=0?tone:undefined} aria-pressed={openId===chapter.id} title={result?`${chapter.title}：${result.findings.length} 条候选（${toneNames[tone]}）`:`${chapter.title}：没有可读正文，未参与扫描`} onClick={()=>setOpenId(openId===chapter.id?'':chapter.id)}>
                <span className="story-chapter-number">{index+1}</span>
                <span className="story-detect-heat-name">{chapter.title}</span>
                <span className="story-detect-heat-count">{result?(excluded?'已排除':result.findings.length?`${result.findings.length} 条`:'干净'):'无正文'}</span>
              </button>;})}</div>
          </div>
          <p className="story-muted">点一章展开这一章的候选；再次点击收起。</p>
        </section>
        <section className="story-detect-summary" aria-label="候选类别汇总">
          <div className="story-figure-heading"><div><h3>按类别汇总</h3><p>整本扫描共 {summary.total} 条候选 · {summary.blocking} 条优先查看 · {summary.advisory} 条参考{latest?` · 最近一次扫描 ${formatTime(latest.ranAt)}`:''}</p></div></div>
          <div className="story-detect-layers">{layerOrder.map(layer=>{
            const items=summary.byLayer[layer];
            return <section className="story-detect-layer" key={layer} aria-label={`${layerNames[layer].label}类候选`}>
              <header><h4>{layerNames[layer].label}<span>{items.reduce((sum,item)=>sum+item.count,0)} 条</span></h4><p>{layerNames[layer].note}</p></header>
              {items.length?<ul>{items.map(item=><li key={`${item.type}:${item.severity}`}>
                <span className="story-detect-type">{typeLabel(item.type)}</span>
                <Badge tone={item.severity==='blocking'?'error':'idle'}>{severityNames[item.severity]}</Badge>
                <span className="story-detect-type-count">{item.count} 条</span>
                {item.blockingCount>0&&item.severity!=='blocking'&&<small>其中 {item.blockingCount} 条优先查看</small>}
              </li>)}</ul>:<p className="story-column-empty">这一类没有命中。</p>}
            </section>;})}</div>
          {summary.unknown.length>0&&<p className="story-muted">另有 {summary.unknown.length} 类未收录别名的规则：{summary.unknown.map(item=>item.type).join('、')}</p>}
        </section>
      </>}
    {open&&<section className="story-detect-findings" aria-label="这一章的候选位置">
      <div className="story-figure-heading"><div><h3>{chapterTitle(snapshot,open.chapterId)}<span className="story-detect-meta"> · 正文 v{open.chapterRevision} · {open.totalChars.toLocaleString('zh-CN')} 字 · 每千字 {open.perThousand} 条</span></h3><p>{openChapter?.revision!==open.chapterRevision?'这一章的正文在扫描后已经变化，下面仍是旧正文的位置，请以重新扫描的结果为准。':open.excluded?'这一章是检测规则自身的来源正文，整本扫描会排除它；需要单独扫描才能查看。':open.clean?'这一章没有命中。零命中不代表故事质量通过。':'下面是这一章的候选位置，按正文顺序排列。'}</p></div>
        <div className="story-detect-toolbar"><button className="story-detect-action" onClick={()=>onChapter(open.chapterId)}>去正文页核对 →</button><button className="story-detect-link" onClick={()=>setOpenId('')}>收起</button></div></div>
      {open.findings.length?<ol className="story-detect-list">{open.findings.map((finding,index)=><li key={`${finding.type}:${finding.line}:${finding.column}:${index}`} className="story-detect-card" data-severity={finding.severity}>
        <div className="story-card-flags"><Badge tone={finding.severity==='blocking'?'error':'idle'}>{severityNames[finding.severity]}</Badge><Badge tone="brand">{layerNames[finding.layer]?.label||layerOf(finding.type)}</Badge><span className="story-detect-type">{typeLabel(finding.type)}</span><small className="story-muted">{reviewNames[finding.review]}</small></div>
        <button className="story-detect-locate" onClick={()=>onChapter(open.chapterId)}>第 {finding.line} 行{finding.column?` · 第 ${finding.column} 列`:''} →</button>
        <blockquote className="story-evidence"><span>原文摘录</span><p>{finding.excerpt||'（这一处没有可展示的原文摘录）'}</p></blockquote>
        <p className="story-card-copy"><strong>为什么命中</strong>{finding.message}</p>
      </li>)}</ol>:<p className="story-column-empty">这一章没有命中候选位置。</p>}
    </section>}
  </section>;
}
function Disclaimer() {
  return <div className="story-detect-disclaimer" role="note"><p><strong>命中只是候选，不是评分。</strong>检测按句式与段落规则标出可能读起来像机器的位置，是否算问题由你判断；读者不会因为零命中就满意，零命中也不能证明故事质量通过。本页只读，不改动任何正文。</p></div>;
}
function summarize(results:DetectorResult[]) {
  const byLayer:Record<DetectorLayer,DetectorCount[]>={expression:[],narrative:[],logic:[]};
  const totals=new Map<string,DetectorCount>();
  let total=0,blocking=0,advisory=0;
  // Counts come from the host; the board only merges per-chapter entries, never re-scans findings.
  for(const result of results){
    total+=result.findings.length;blocking+=result.blocking;advisory+=result.advisory;
    for(const item of result.counts){
      const key=`${item.type}:${item.severity}`;
      const merged=totals.get(key);
      if(merged){merged.count+=item.count;merged.blockingCount+=item.blockingCount;}
      else totals.set(key,{...item});
    }
  }
  const unknown:DetectorCount[]=[];
  for(const item of totals.values()){
    const layer=LAYER_BY_TYPE[item.type];
    if(!layer){unknown.push(item);continue;}
    byLayer[layer].push(item);
  }
  for(const layer of layerOrder)byLayer[layer].sort((a,b)=>(b.severity==='blocking'?1:0)-(a.severity==='blocking'?1:0)||b.count-a.count||a.type.localeCompare(b.type));
  return {byLayer,unknown,total,blocking,advisory};
}
function formatTime(value:string) {
  const date=new Date(value);
  return Number.isNaN(date.getTime())?'':`${date.getMonth()+1} 月 ${date.getDate()} 日 ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

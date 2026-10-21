import React,{useEffect,useRef,useState} from 'react';
import {DocumentBody,DocumentHeading} from '../../shared/DocumentPresentation.tsx';
import {useResource} from '../../shared/state.js';
import type {FeatureCall} from '../../shared/workspace-state.ts';
type Version=Record<string,any>&{revision:number;previousRevision:number|null;changedFields:string[];kind:string;content?:string};
const labels:Record<string,string>={name:'名称',summary:'摘要',content:'正文',type:'类型',groupId:'分组',storyTime:'适用阶段',status:'状态',factType:'事实属性',sources:'正文来源',aliases:'别名',knownBy:'知情人物',dependsOn:'依赖设定',deleted:'删除状态'};
const names:Record<string,string>={character_card:'角色卡',world_entry:'世界书',world_book:'世界书',active:'使用中',stale:'待核对',unconfirmed:'待讨论',retired:'已停用',fact:'事实',belief:'角色认知',misunderstanding:'误解',plan:'计划'};
export function SettingHistory({call,novelId,current,groups,busy,dirty,restore}:{call:FeatureCall;novelId:string;current:Record<string,any>;groups:{id:string;name:string}[];busy:boolean;dirty:boolean;restore:(revision:number)=>void}) {
  const resource=useResource(()=>call('graph.history',{novelId,nodeId:current.id}),[call,novelId,current.id,current.revision]);
  const [operations,setOperations]=useState(false),[selected,setSelected]=useState<number|null>(null),[result,setLoaded]=useState<Version|null>(null),[error,setError]=useState(''),[retry,setRetry]=useState(0),[comparison,setComparison]=useState('none'),[other,setOther]=useState<Version|null>(null),[compareError,setCompareError]=useState('');
  const versions=(resource.value||[]) as Version[],items=[...versions].reverse().filter(v=>operations||!['layout','organization'].includes(v.kind));
  const loaded=result?.revision===selected?result:null,currentContent=versions.filter(v=>!['layout','organization'].includes(v.kind)).at(-1)?.revision;
  const token=useRef(0);
  useEffect(()=>{if(selected===null){setLoaded(null);return;}const id=++token.current;setLoaded(null);setError('');call('graph.history',{novelId,nodeId:current.id,revision:selected,includeContent:true}).then(result=>{if(id===token.current)setLoaded(result[0]);}).catch(e=>{if(id===token.current)setError(e.message||String(e));});return()=>{token.current++;};},[call,novelId,current.id,selected,retry]);
  const previous=loaded?versions.filter(v=>v.revision<loaded.revision&&!['layout','organization'].includes(v.kind)).at(-1):null;
  useEffect(()=>{let live=true;setOther(null);setCompareError('');if(comparison!=='previous'||!previous)return;call('graph.history',{novelId,nodeId:current.id,revision:previous.revision,includeContent:true}).then(result=>{if(live)setOther(result[0]);}).catch(e=>{if(live)setCompareError(e.message||String(e));});return()=>{live=false;};},[call,novelId,current.id,selected,comparison,previous?.revision,retry]);
  const counterpart=comparison==='current'?current:other?.revision===previous?.revision?other:null;
  const value=(v:unknown,key:string)=>key==='groupId'?(groups.find(g=>g.id===v)?.name||(v?'已移除的分组':'根目录')):key==='deleted'?(v?'已删除':'正常'):typeof v==='string'?(names[v]||v):Array.isArray(v)?JSON.stringify(v,null,2):String(v??'');
  const same=(a:unknown,b:unknown)=>JSON.stringify(a??null)===JSON.stringify(b??null);
  const difference=loaded&&counterpart?Object.keys(labels).filter(key=>!same(loaded[key],counterpart[key])):[];
  const sameCurrent=loaded&&Object.keys(labels).every(key=>same(loaded[key],current[key]));
  return <section className="setting-history" aria-label="设定修改轨迹">
    <div className="history-intro"><div><strong>修改轨迹</strong><p>保留设定走过的每一步。查看旧版不会改变当前内容。</p></div><label><input type="checkbox" checked={operations} onChange={e=>setOperations(e.target.checked)}/>显示布局与分组操作</label></div>
    {resource.error&&<p role="alert">{resource.error}<button onClick={resource.retry}>重试</button></p>}
    {!resource.value&&resource.loading&&<p role="status">正在读取修改轨迹…</p>}
    <ol className="history-timeline">{items.map(v=><li key={v.revision} data-current={v.revision===currentContent} data-version={v.revision}>
      <button className="history-event" aria-label={`查看版本 v${v.revision}`} aria-expanded={selected===v.revision} onClick={()=>{setComparison('none');setSelected(selected===v.revision?null:v.revision);}}><span className="history-event-heading"><strong>{v.kind==='baseline'?'开始记录':v.kind==='layout'?'整理画布 · 内容未变':v.kind==='organization'?'调整分组':v.changedFields.map(k=>labels[k]||k).join('、')||'更新设定'}</strong><small>v{v.revision}{v.revision===currentContent?' · 当前内容':v.revision===current.revision?' · 当前':''}</small></span><span className="history-event-meta"><time>{v.timestamp?new Date(v.timestamp).toLocaleString('zh-CN'):''}</time><span>{v.actor?.kind==='agent'?'AI':v.reason==='启用设定历史'?'历史起点':'你'}</span></span>{v.reason&&!['更新设定','创建设定','调整设定位置'].includes(v.reason)&&<span className="history-reason">{v.reason}</span>}</button>
      {selected===v.revision&&<div className="history-version-panel">
        {error?<p role="alert">{error}<button onClick={()=>setRetry(n=>n+1)}>重试读取</button></p>:!loaded?<p role="status">正在读取 v{selected}…</p>:<>
          <div className="history-version-tools"><label>对照<select aria-label="历史版本对照" value={comparison} onChange={e=>setComparison(e.target.value)}><option value="none">查看此版全文</option><option value="previous" disabled={!previous}>与上一次内容修改比较</option><option value="current" disabled={selected===current.revision}>与当前版本比较</option></select></label><button className="history-close" onClick={()=>setSelected(null)}>收起</button></div>
          {comparison==='none'?<><DocumentHeading title={loaded.name} kind={names[loaded.type]||'设定'} group={value(loaded.groupId,'groupId')} summary={loaded.summary}/><DocumentBody text={loaded.content||''}/>{loaded.storyTime&&<p className="history-attribute">适用阶段 · {loaded.storyTime}</p>}</>:<>
            {compareError?<p role="alert">{compareError}<button onClick={()=>setRetry(n=>n+1)}>重试</button></p>:!counterpart?<p role="status">正在读取对照版本…</p>:<><div className="version-compare-head"><strong>{comparison==='previous'?`v${counterpart.revision} → v${loaded.revision}`:`v${loaded.revision} → 当前 v${counterpart.revision}`}</strong><span>{difference.length?`${difference.length} 项不同`:'内容一致'}</span></div>{difference.map(key=><section className="version-diff-field" key={key}><h4>{labels[key]}</h4><div className="version-diff-columns"><div><small>{comparison==='previous'?`此前 v${counterpart.revision}`:`选中 v${loaded.revision}`}</small><pre className="diff-before">{value(comparison==='previous'?counterpart[key]:loaded[key],key)||'（空）'}</pre></div><div><small>{comparison==='previous'?`本次 v${loaded.revision}`:`当前 v${counterpart.revision}`}</small><pre className="diff-after">{value(comparison==='previous'?loaded[key]:counterpart[key],key)||'（空）'}</pre></div></div></section>)}</>}
          </>}
          <footer className="history-restore"><span>{sameCurrent?'与当前内容一致':dirty?'先保存或处理当前草稿，再恢复旧版':'恢复后会保留原历史，并生成一个新版本。'}</span><button disabled={busy||dirty||Boolean(sameCurrent)} onClick={()=>restore(loaded.revision)}>恢复此版本</button></footer>
        </>}
      </div>}
    </li>)}</ol>
    {!items.length&&resource.value&&<p className="document-empty">暂时没有内容修改记录。</p>}
    {versions[0]?.reason==='启用设定历史'&&<p className="history-footnote">从启用历史记录时开始留档，更早未保存的版本无法回溯。</p>}
  </section>;
}

import React,{useMemo,useState} from 'react';
import {Modal} from '../../shared/preferences.tsx';
import {formatCount,emptyStats,type ActivityStats,type PetRPC,type RecordNovel} from './model.ts';
import {recordRange,recordBins,useWritingRecords,validDate,localDate,statFields,type RecordBin} from './records-data.ts';
import {recordsStyles} from './records-style.ts';

interface Props {
  rpc:PetRPC;sessionId:string;novels:{id:string;title:string;archived?:boolean}[];
  initialNovelId?:string|null;onClose:()=>void;
}
function Metrics({stats}:{stats?:ActivityStats}) {
  return <div className="records-metrics" aria-label="区间写作数据">{([
    ['proseAdded','正文新增','字'],['settingAdded','设定新增','字'],['planningChanges','规划推进','次'],['conversationInput','作者聊天','字'],
  ] as const).map(([key,label,unit])=><div key={key} className={`records-metric records-${key}`}><span>{label}</span><strong style={{'--record-digits':Math.max(1,(stats?formatCount(stats[key]):'—').length)} as React.CSSProperties}>{stats?formatCount(stats[key]):'—'}<small>{unit}</small></strong></div>)}</div>;
}
function BookTable({rows}:{rows:RecordNovel[]}) {
  return <div className="records-table" role="table" aria-label="作品写作明细"><div className="records-table-head" role="row"><span role="columnheader">作品</span><span role="columnheader">正文 / 字</span><span role="columnheader">设定 / 字</span><span role="columnheader">规划 / 次</span><span role="columnheader">聊天 / 字</span></div>{rows.map(n=><div role="row" key={n.novelId}><strong role="cell" title={n.title}>{n.title}{(n.archived||n.removed)&&<small>{n.removed?'已移除':'回收站'}</small>}</strong>{statFields.map(key=><span role="cell" key={key}>{formatCount(n.stats[key])}</span>)}</div>)}</div>;
}
function DailyChart({bins,selected,onSelect}:{bins:RecordBin[];selected:string|null;onSelect:(date:string)=>void}) {
  const max=Math.max(10,...bins.flatMap(bin=>[bin.prose,bin.settings,bin.chat]));
  const ceiling=Math.ceil(max/10**Math.floor(Math.log10(max)))*10**Math.floor(Math.log10(max));
  const step=Math.max(1,Math.ceil(bins.length/7));
  return <div className="records-chart" aria-label="正文、设定与作者聊天趋势">
    <div className="records-chart-scale" aria-hidden="true"><span>{formatCount(ceiling)}</span><span>{formatCount(Math.round(ceiling/2))}</span><span>0</span></div>
    <div className="records-chart-scroll"><div className="records-chart-bars" style={{gridTemplateColumns:`repeat(${Math.max(1,bins.length)},minmax(12px,1fr))`}}>
      {bins.map((bin,index)=><button type="button" key={bin.key} className={`records-chart-day${selected&&selected>=bin.from&&selected<=bin.to?' is-selected':''}`} aria-pressed={Boolean(selected&&selected>=bin.from&&selected<=bin.to)} aria-label={`${bin.key}：正文 ${bin.prose} 字，设定 ${bin.settings} 字，聊天 ${bin.chat} 字`} title={`${bin.key}\n正文 ${formatCount(bin.prose)} 字 · 设定 ${formatCount(bin.settings)} 字 · 聊天 ${formatCount(bin.chat)} 字`} onClick={()=>onSelect(bin.to)}>
        <span className="records-bar-pair" aria-hidden="true"><i className="records-bar-prose" style={{height:`${bin.prose/ceiling*100}%`,minHeight:bin.prose?3:0}}/><i className="records-bar-setting" style={{height:`${bin.settings/ceiling*100}%`,minHeight:bin.settings?3:0}}/><i className="records-bar-chat" style={{height:`${bin.chat/ceiling*100}%`,minHeight:bin.chat?3:0}}/></span>
        <span className="records-day-label" aria-hidden="true">{index%step===0||index===bins.length-1?bin.label:''}</span>
      </button>)}
    </div></div>
  </div>;
}
export function WritingRecords({rpc,sessionId,novels,initialNovelId,onClose}:Props) {
  const [scope,setScope]=useState(initialNovelId||''),[mode,setMode]=useState<'today'|'recent'|'month'|'custom'>('recent');
  const [range,setRange]=useState(()=>recordRange('recent')),[custom,setCustom]=useState(()=>recordRange('recent'));
  const [dateError,setDateError]=useState(''),[selected,setSelected]=useState<string|null>(null);
  const {result,loading,error,refresh}=useWritingRecords(rpc,sessionId,range.from,range.to,scope||null);
  const [known,setKnown]=useState<RecordNovel[]>([]);
  // Keep historical book choices available while a narrower filter loads.
  if(result&&result.novels.some(row=>!known.some(n=>n.novelId===row.novelId&&n.title===row.title&&n.removed===row.removed&&n.archived===row.archived)))setKnown(previous=>[...previous.filter(n=>!result.novels.some(row=>row.novelId===n.novelId)),...result.novels]);
  const choices=[...novels.map(n=>({novelId:n.id,title:n.title,archived:n.archived,removed:false})),...known.filter(n=>!novels.some(book=>book.id===n.novelId))];
  const bins=useMemo(()=>recordBins(range.from,range.to,result?.daily||[]),[range.from,range.to,result]);
  const day=selected?result?.daily.find(day=>day.date===selected):null;
  const detailStats=selected?day?.stats||emptyStats:result?.stats;
  const rows=selected?day?.novels||[]:result?.novels||[];
  const chooseMode=(next:typeof mode)=>{setMode(next);setDateError('');if(next!=='custom'){setRange(recordRange(next));setSelected(null);}else setCustom(range);};
  const applyRange=()=>{if(!validDate(custom.from)||!validDate(custom.to)||custom.from>custom.to){setDateError('开始日期不能晚于结束日期，请检查后重试。');return;}setRange(custom);setSelected(null);setDateError('');};
  return <><style>{recordsStyles}</style><Modal title="写作记录" close={onClose} className="writing-records-modal">
    <div className="records-document">
      <div className="records-heading"><div><span className="records-eyebrow">{range.from.replaceAll('-','.')} — {range.to.replaceAll('-','.')}</span><h3>故事，一天天写下来。</h3></div><div className="records-controls"><label>统计范围<select aria-label="统计范围" value={scope} onChange={event=>{setScope(event.target.value);setSelected(null);}}><option value="">全部作品</option>{choices.map(n=><option key={n.novelId} value={n.novelId}>{n.title}{n.removed?'（已移除）':n.archived?'（回收站）':''}</option>)}</select></label><button className="records-refresh" onClick={refresh} disabled={loading} aria-label="刷新写作记录">{loading?'读取中…':'刷新'}</button></div></div>
      <div className="records-range" role="group" aria-label="记录时间范围">{([['today','今天'],['recent','近30天'],['month','本月'],['custom','自选日期']] as const).map(([value,label])=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>chooseMode(value)}>{label}</button>)}</div>
      {mode==='custom'&&<div className="records-custom"><label>开始日期<input type="date" aria-label="开始日期" value={custom.from} max={localDate()} onChange={event=>setCustom({...custom,from:event.target.value})}/></label><span aria-hidden="true">—</span><label>结束日期<input type="date" aria-label="结束日期" value={custom.to} max={localDate()} onChange={event=>setCustom({...custom,to:event.target.value})}/></label><button type="button" onClick={applyRange}>应用</button></div>}
      {dateError&&<p className="notice error" role="alert">{dateError}</p>}
      {error&&<p className="notice error" role="alert">{error}{result?' 下方保留上次读取的记录。':''}<button onClick={refresh}>重试</button></p>}
      <Metrics stats={result?.stats}/>
      <section className="records-trend"><header><h4>新增字数 <small>按{bins[0]?.key.length===7?'月':'日'} · 字</small></h4><div className="records-legend"><span className="legend-prose">正文</span><span className="legend-setting">设定</span><span className="legend-chat">聊天</span></div></header>
        <DailyChart bins={bins} selected={selected} onSelect={setSelected}/>
        <div className="records-trend-foot"><small>{loading?'正在读取…':result?.activeDays?`这段时间写作了 ${result.activeDays} 天`:'这段时间还没有写作记录'}</small>{selected&&<button onClick={()=>setSelected(null)}>查看区间汇总</button>}</div>
      </section>
      <section className="records-books"><header><h4>{selected?`${selected} · 作品明细`:'区间作品明细'}</h4><label className="records-date-picker"><span>查看日期</span><select aria-label="查看日期" value={selected||''} onChange={event=>setSelected(event.target.value||null)}><option value="">整个区间</option>{selected&&!result?.daily.some(day=>day.date===selected)&&<option value={selected}>{selected}</option>}{result?.daily.map(day=><option key={day.date} value={day.date}>{day.date}</option>)}</select></label></header>
        <BookTable rows={rows}/>
        {!rows.length&&<p className="records-empty">{loading?'正在读取写作记录…':selected?'这一天还没有记录。':'这段时间还没有记录，从下一句话开始。'}</p>}
      </section>
      <details className="records-contributions"><summary>作者与 AI 的贡献 <small>{selected||'整个区间'}</small></summary><div className="records-table" role="table" aria-label="作者与 AI 的贡献"><div className="records-table-head" role="row"><span role="columnheader">贡献者</span><span role="columnheader">正文 / 字</span><span role="columnheader">设定 / 字</span><span role="columnheader">规划 / 次</span><span role="columnheader">聊天 / 字</span></div>{([['human','作者'],['agent','AI']] as const).map(([key,label])=><div role="row" key={key}><strong role="cell">{label}</strong>{statFields.map(field=><span role="cell" key={field}>{detailStats?formatCount(detailStats.byActor?.[key]?.[field]):'—'}</span>)}</div>)}</div></details>
    </div>
  </Modal></>;
}

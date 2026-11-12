import React, {useId, useState} from 'react';
import type {PetPresentation} from '../../../contracts/usage.ts';
import {dateLabel, formatCount, formatNetCount, type ActivityResult, type ActivityStats, type PetRPC} from './model.ts';
import {currencyEntries, usageMoney} from './usage-data.ts';
import {UsageBubble} from './usage.tsx';

const net = (n:number) => (n > 0 ? '+' : '') + formatNetCount(n);
export function QuickChevron() {
  return <svg className="pet-quick-chevron" aria-hidden="true" viewBox="0 0 16 16" fill="none"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}
function Reveal({open,id,children}:{open:boolean;id:string;children:React.ReactNode}) {
  return <div ref={element=>{if(element)element.inert=!open;}} className={'pet-quick-reveal'+(open?' is-open':'')} id={id} aria-hidden={!open}><div>{children}</div></div>;
}
function Amounts({values,empty}:{values:Record<string,string>;empty:string}) {
  const entries=currencyEntries(values);
  return <span className="pet-quick-amounts">{entries.length?entries.map(([currency,value])=>{const amount=usageMoney(value,currency);return <strong key={currency} style={{'--amount-chars':amount.length} as React.CSSProperties}>{amount}</strong>;}):<span className="pet-quick-unavailable">{empty}</span>}</span>;
}

/** Action headers stay outside animated detail content. */
export function QuickSummary({rpc,value,result,stats,sessionId,nextBubble,writingOpen,setWritingOpen}:{
  rpc:PetRPC;value:PetPresentation|null;result:ActivityResult|null;stats:ActivityStats;sessionId?:string;
  nextBubble:()=>void;writingOpen:boolean;setWritingOpen:(value:boolean)=>void;
}) {
  const summary=value?.summary;
  const [tokenOpen,setTokenOpen]=useState(false),[balanceOpen,setBalanceOpen]=useState(false),[customOpen,setCustomOpen]=useState(false);
  const tokenId=useId(),balanceId=useId(),writingId=useId(),customId=useId();
  const allUnpriced=!!summary?.calls&&summary.unpriced===summary.calls;
  const costs=summary?.costs||(summary&&!allUnpriced?{[summary.currency]:summary.cost}:{});
  const shownCosts=summary&&summary.calls===0?{[summary.currency]:'0'}:costs;
  const notification=value?.notification;
  const date=summary?.date||result?.date;
  return <div className="pet-quick-content">
    <div className="pet-quick-date"><span>{date?'今天 · '+dateLabel(date):'今天'}</span><span>{summary?.calls===undefined?'':formatCount(summary.calls)+' 次调用'}</span></div>
    <section className="pet-quick-tokens">
      <button type="button" className="pet-quick-disclosure pet-quick-token-toggle" aria-label="今日 Token 构成" aria-expanded={tokenOpen} aria-controls={tokenId} onClick={()=>setTokenOpen(!tokenOpen)}><span><span className="pet-quick-label">今日 Token</span><span className="pet-quick-token-line"><strong>{summary?formatCount(summary.tokens):'—'}</strong></span></span><QuickChevron/></button>
      <Reveal open={tokenOpen} id={tokenId}><dl className="pet-quick-breakdown">{[['未缓存输入',summary?.input],['缓存读取',summary?.cacheRead],...(summary?.cacheWrite?[['缓存写入',summary.cacheWrite]]:[]),['输出',summary?.output]].map(([label,count])=><div key={String(label)}><dt>{label}</dt><dd>{count===undefined?'—':formatCount(Number(count))}</dd></div>)}</dl></Reveal>
    </section>
    <div className="pet-quick-money">
      <div className="pet-quick-cost"><span className="pet-quick-label">今日花费 <small>估算</small></span><Amounts values={shownCosts||{}} empty={summary?'未定价':'—'}/></div>
      <button type="button" className="pet-quick-disclosure pet-quick-balance-toggle" aria-label="账户余额来源" aria-expanded={balanceOpen} aria-controls={balanceId} onClick={()=>setBalanceOpen(!balanceOpen)}><span><span className="pet-quick-label">账户余额</span><Amounts values={summary?.balanceTotals||{}} empty="未连接"/></span><QuickChevron/></button>
    </div>
    <Reveal open={balanceOpen} id={balanceId}><div className="pet-quick-accounts">{summary?.balances?.length?summary.balances.map(account=><div key={account.id}><span>{account.name}</span><strong>{account.balance===null?'未连接':usageMoney(account.balance,account.currency)}</strong>{account.error?<small>{account.balance===null?account.error:'余额暂未更新'}</small>:account.at?<small>{new Date(account.at).toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})} 查询</small>:null}</div>):<span>尚无余额数据</span>}{(summary?.balanceCount||0)>(summary?.balances?.length||0)&&<span>另有 {summary!.balanceCount!-(summary!.balances?.length||0)} 个账户</span>}</div></Reveal>
    {!!summary?.unpriced&&<p className="pet-quick-pricing-note">{formatCount(summary.unpriced)} 次调用未定价</p>}
    <section className="pet-quick-writing" aria-label="今日写作数据">
      <button className="pet-quick-disclosure pet-quick-writing-head" type="button" onClick={()=>setWritingOpen(!writingOpen)} aria-expanded={writingOpen} aria-controls={writingId}><span>今日写作</span><span className="pet-companion-scope" title={result?.title||undefined}>{result?.title||(!sessionId?'打开一个对话':'全部作品')}</span><QuickChevron/></button>
      <div className="pet-quick-writing-grid">
        <div><span className="pet-quick-label" title="今天新增减去删减的正文；修改旧稿也计入今天。">正文净增</span><strong>{result?net(stats.proseAdded):'—'} <small>字</small></strong></div>
        <div><span className="pet-quick-label">设定</span><strong>{result?formatCount(stats.settingAdded):'—'} <small>字</small></strong></div>
      </div>
      <Reveal open={writingOpen} id={writingId}><div className="pet-quick-writing-grid pet-quick-writing-extra"><div><span className="pet-quick-label">规划修改</span><strong>{result?formatCount(stats.planningChanges):'—'} <small>次</small></strong></div><div><span className="pet-quick-label">作者聊天</span><strong>{result?formatCount(stats.conversationInput):'—'} <small>字</small></strong></div></div></Reveal>
    </section>
    {notification?.text&&<p className="pet-quick-notice">{notification.text}</p>}
    {value?.customContent&&<section className="pet-quick-custom"><button type="button" className="pet-quick-disclosure" aria-expanded={customOpen} aria-controls={customId} onClick={()=>setCustomOpen(!customOpen)}><span>{value.bubbleName||'自定义气泡'}</span><QuickChevron/></button><Reveal open={customOpen} id={customId}><UsageBubble rpc={rpc} value={value}/><button type="button" onClick={nextBubble}>换个气泡</button></Reveal></section>}
  </div>;
}

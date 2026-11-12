import type {UsageRecord} from '../../../contracts/usage.ts';

export interface UsageSummary {tokens:number;input:number;output:number;cacheRead:number;cacheWrite:number;calls:number;partial:number;unpriced:number;costs:Record<string,string>}
export interface UsageReport {
  from:string;to:string;total:UsageSummary;models:(UsageSummary&{provider:string|null;model:string|null})[];
  daily:(UsageSummary&{date:string})[];hourly?:(UsageSummary&{hour:number})[];
  records:UsageRecord[];count:number;offset:number;nextOffset:number|null;
  balances:any[];sourceChoices:{id:string;name:string}[];error?:string;
}
export interface UsageBin {key:string;label:string;tokens:number;calls:number;costs:Record<string,string>}
const decimals=1_000_000_000n;
const decimal=(value:string)=>{const [whole,fraction='']=value.split('.');return BigInt(whole)*decimals+BigInt(fraction.padEnd(9,'0'));};
export const sumUsageMoney=(left:string,right:string)=>{const value=decimal(left)+decimal(right);return `${value/decimals}.${(value%decimals).toString().padStart(9,'0')}`;};
export const usageNumber=(value:number)=>Number(value||0).toLocaleString('zh-CN');
export const currencySymbol=(currency:string)=>({CNY:'¥',USD:'US$',EUR:'€',JPY:'JP¥',GBP:'£'}[currency]||currency);
export const usageAmount=(value:string|number)=>Number(value).toLocaleString('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2});
export const usageMoney=(value:string|number,currency='CNY')=>`${currencySymbol(currency)} ${usageAmount(value)}`;
export const currencyEntries=<T>(values:Record<string,T>)=>Object.entries(values).sort(([left],[right])=>left==='CNY'?-1:right==='CNY'?1:left.localeCompare(right));
export const compactTokens=(value:number)=>value>=10000?(value/10000).toFixed(value>=1000000?0:1)+'万':usageNumber(value);

/** Calendar dates are grouped in UTC to avoid local daylight-saving gaps.
 * Request hours already use the same local timezone as the persisted day. */
export function usageBins(report:Pick<UsageReport,'from'|'to'|'daily'|'hourly'>):UsageBin[]{
  if(report.from===report.to&&report.hourly)return report.hourly.map(row=>({key:String(row.hour),label:String(row.hour).padStart(2,'0')+':00',tokens:row.tokens,calls:row.calls,costs:row.costs}));
  const start=Date.parse(report.from+'T00:00:00Z'),end=Date.parse(report.to+'T00:00:00Z'),days=Math.round((end-start)/86400000)+1,step=Math.max(1,Math.ceil(days/18));
  const bins:UsageBin[]=Array.from({length:Math.ceil(days/step)},(_,i)=>{
    const date=new Date(start+i*step*86400000).toISOString().slice(0,10);
    return {key:date,label:Number(date.slice(5,7))+'/'+Number(date.slice(8)),tokens:0,calls:0,costs:{}};
  });
  for(const day of report.daily){const index=Math.floor((Date.parse(day.date+'T00:00:00Z')-start)/86400000/step),bin=bins[index];if(!bin)continue;bin.tokens+=day.tokens;bin.calls+=day.calls;for(const [currency,cost] of Object.entries(day.costs))bin.costs[currency]=sumUsageMoney(bin.costs[currency]||'0',cost);}
  return bins;
}

import {createHash} from 'node:crypto';
import type {PriceRule,TokenCounts,UsageRecord,UsageRow} from '../../contracts/usage.ts';
import {usageError} from './settings.ts';
import {peakPrice,priceCalendarYear,defaultPriceSchedule,priceScheduleIssue} from './calendar.ts';
export {peakPrice} from './calendar.ts';
const scale=1_000_000_000n;
export function money(value:string|number):bigint {
  const s=String(value);if(!/^\d+(?:\.\d{1,9})?$/.test(s)||s.length>30)usageError('金额格式无效，最多九位小数');
  const [a,b='']=s.split('.');return BigInt(a)*scale+BigInt(b.padEnd(9,'0'));
}
export const moneyText=(value:bigint)=>`${value<0n?'-':''}${(value<0n?-value:value)/scale}.${((value<0n?-value:value)%scale).toString().padStart(9,'0')}`;
export const priceDigest=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0,24);
const rules:PriceRule[]=[...['deepseek-flash','deepseek-v4-flash','deepseek-v4-flash-vision-exp'].map(model=>({id:'builtin:'+model,provider:'deepseek',model,currency:'CNY',input:'1',output:'4',cacheRead:'0.02',peak:{input:'2',output:'8',cacheRead:'0.04'},revision:20261101,source:'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/'})),{id:'builtin:deepseek-v4-pro',provider:'deepseek',model:'deepseek-v4-pro',currency:'CNY',input:'4.5',output:'13.5',cacheRead:'0.15',peak:{input:'9',output:'27',cacheRead:'0.30'},revision:20261101,source:'https://api-docs.deepseek.com/zh-cn/quick_start/pricing/'}];
const key=(value:string|null|undefined)=>String(value||'').trim().toLowerCase();
export const priceProvider=(value:string|null|undefined)=>['deepseek','deepseek-official','deepseek-account'].includes(key(value))?'deepseek':key(value);
export const builtinPrices=()=>structuredClone(rules.map(rule=>({...rule,schedule:defaultPriceSchedule()})));
export function validatePrice(rule:PriceRule){if(!rule.id||typeof rule.provider!=='string'||!rule.provider.trim()||typeof rule.model!=='string'||!rule.model.trim()||!/^[A-Z]{3}$/.test(rule.currency)||rule.effectiveFrom!==undefined&&(!Number.isSafeInteger(rule.effectiveFrom)||rule.effectiveFrom<0))usageError('价格需要明确的厂商、模型和币种');for(const price of [rule,rule.peak].filter(Boolean) as any[]){for(const key of ['input','output','cacheRead'])money(price[key]);if(price.cacheWrite!==undefined)money(price.cacheWrite);}if(rule.schedule){const issue=priceScheduleIssue(rule.schedule);if(issue)usageError(issue);}}
export function charge(record:UsageRecord,prices:PriceRule[],frozen?:UsageRow|null):UsageRecord {
  const applicable=(p:PriceRule)=>key(p.model)===key(record.model)&&(!p.effectiveFrom||p.effectiveFrom<=record.time);
  // Prefer a route-specific override, then an override for DSH's official
  // DeepSeek route aliases. A recognized DeepSeek model can still use the
  // official reference price when a gateway has its own provider identifier.
  const frozenRule=frozen&&applicable(frozen as PriceRule)?frozen as PriceRule:undefined;
  const rule=frozenRule
    ||prices.find(p=>applicable(p)&&key(p.provider)===key(record.provider))
    ||prices.find(p=>applicable(p)&&priceProvider(p.provider)===priceProvider(record.provider))
    ||prices.find(p=>applicable(p)&&key(p.provider)==='*')
    ||rules.find(applicable);
  const unpriced=(pricingIssue:string)=>({...record,price:null,cost:null,pricingIssue});
  if(!record.tokens)return unpriced('missing_usage');
  if(!record.model)return unpriced('missing_model');
  if(!rule)return unpriced('unknown_price');
  const peak=!!rule.peak&&(frozenRule&&frozen?.period?frozen.period==='peak':peakPrice(record.time,rule.schedule)),p=peak?rule.peak!:rule,t=record.tokens;
  const known=t.input+t.output+(t.cacheRead||0)+(t.cacheWrite||0);
  if(t.total!==undefined&&t.total!==known)return unpriced('incomplete_usage');
  if((t.cacheWrite||0)>0&&p.cacheWrite===undefined)return unpriced('cache_write_price');
  const numerator=BigInt(t.input)*money(p.input)+BigInt(t.output)*money(p.output)+BigInt(t.cacheRead||0)*money(p.cacheRead)+BigInt(t.cacheWrite||0)*money(p.cacheWrite||'0');
  const {id:ruleId,...rate}=structuredClone(rule);
  const snapshot={...rate,period:rule.peak?peak?'peak':'off-peak':'fixed',calendarYearCovered:rule.peak?frozen?.calendarYearCovered??priceCalendarYear:undefined,usageEstimated:record.partial,referencePrice:frozenRule?!!frozen?.referencePrice:rules.includes(rule)&&priceProvider(rule.provider)!==priceProvider(record.provider)};
  return {...record,pricingIssue:undefined,price:{...snapshot,id:priceDigest(snapshot)},cost:moneyText((numerator+500000n)/1000000n),currency:rule.currency};
}
export function totalTokens(tokens:TokenCounts|null){return tokens?.total??(tokens?(tokens.input+tokens.output+(tokens.cacheRead||0)+(tokens.cacheWrite||0)):0);}

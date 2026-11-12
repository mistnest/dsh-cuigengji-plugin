import {createHash} from 'node:crypto';
import type {UsageCursor,UsageRecord,TokenCounts} from '../../contracts/usage.ts';
import {usageDay} from './settings.ts';
const count=(n:unknown):n is number=>Number.isSafeInteger(n)&&Number(n)>=0;
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
export const cursorKey=(source:string,session:string)=>hash(`${source}:${session}`);
function sample(data:any){
  if(data?.usage)return data.usage;
  const stream=Array.isArray(data?.stream)?data.stream:data?.stream?.chunks;
  if(Array.isArray(stream))for(let i=stream.length-1;i>=0;i--){const chunk=stream[i]?.chunk??stream[i];if(chunk?.type==='usage')return chunk.usage;}
  return null;
}
export function normalizeTokens(value:any):TokenCounts|null{
  if(!value||!count(value.inputTokens)||!count(value.outputTokens))return null;
  const result:TokenCounts={input:value.inputTokens,output:value.outputTokens};
  for(const [key,field] of [['cacheRead','cacheReadTokens'],['cacheWrite','cacheWriteTokens'],['reasoning','reasoningTokens'],['total','totalTokens']] as const){if(value[field]!==undefined){if(!count(value[field]))return null;result[key]=value[field];}}
  if((result.reasoning||0)>result.output)return null;
  const known=result.input+result.output+(result.cacheRead||0)+(result.cacheWrite||0);
  if(!Number.isSafeInteger(known)||result.total!==undefined&&(result.total<known||result.cacheRead!==undefined&&result.cacheWrite!==undefined&&result.total!==known))return null;
  return result;
}
/** Follows DSH's replacement slot until llm/retry-started advances the attempt. */
export function usageEvent(source:string,sessionId:string,event:any,previous?:UsageCursor){
  const seq=event?.seq;if(!count(seq)||previous&&seq<=previous.seq)return null;
  const d=event.data||{},cursor:UsageCursor={...(previous||{turn:0,step:0,attempt:0}),seq};
  if(event.type==='session/title')cursor.title=typeof d.title==='string'?d.title.slice(0,160):cursor.title;
  if(event.type==='step/start'||event.type==='turn/start'){
    if(count(d.turn)&&count(d.step??0)&&(cursor.turn!==d.turn||event.type==='step/start'&&cursor.step!==d.step)){cursor.turn=d.turn;cursor.step=d.step??0;cursor.attempt=0;delete cursor.day;delete cursor.id;delete cursor.provider;delete cursor.model;}
  }
  if(event.type==='llm/retry-started'&&d.turn===cursor.turn&&d.step===cursor.step){cursor.attempt++;delete cursor.id;delete cursor.day;delete cursor.provider;delete cursor.model;}
  let record:UsageRecord|undefined;
  if(['assistant/message','assistant/attempt'].includes(event.type)){
    if(!count(d.turn)||!count(d.step))return {cursor};
    if(cursor.turn!==d.turn||cursor.step!==d.step){cursor.turn=d.turn;cursor.step=d.step;cursor.attempt=0;delete cursor.id;delete cursor.day;delete cursor.provider;delete cursor.model;}
    const route=d.message?.source||d.source||{};
    if(typeof route.provider==='string'&&route.provider)cursor.provider=route.provider;
    if(typeof route.model==='string'&&route.model)cursor.model=route.model;
    const time=Number.isFinite(event.time)?event.time:Date.now(),tokens=normalizeTokens(sample(d));
    cursor.id??=source!=='dsh'&&typeof d.usageIdentity==='string'?hash(`${source}:${sessionId}:${d.usageIdentity}`):hash(`${source}:${sessionId}:${d.turn}:${d.step}:${cursor.attempt}`);cursor.day??=usageDay(time);
    record={id:cursor.id,source,sessionId,turn:d.turn,step:d.step,attempt:cursor.attempt,time,provider:cursor.provider||null,model:cursor.model||null,tokens,partial:!tokens||tokens.total===undefined&&(tokens.cacheRead===undefined||tokens.cacheWrite===undefined)};
  }
  return {cursor,record};
}

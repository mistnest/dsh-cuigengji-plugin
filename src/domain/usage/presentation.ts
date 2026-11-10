import {join} from 'node:path';
import type {UsageMeta,UsageRow,PetPresentation,BubbleModule,CompanionEvent} from '../../contracts/usage.ts';
import {peakStatus} from './calendar.ts';
import {money,moneyText} from './pricing.ts';
import {defaultCompanionSettings} from './settings.ts';
export {peakStatus} from './calendar.ts';
const number=(n:number)=>Number(n||0).toLocaleString('zh-CN');

/** Shared semantic payload for Web and native WPF. No novel text or credentials. */
export function compilePresentation(meta:UsageMeta,report:UsageRow,args:UsageRow,sequence:number,root:string):PetPresentation{
  const settings=meta.settings,currency=settings.currency,now=Date.now();
  const converted=Number(report.total.reportCosts?.[currency]??report.total.costs[currency]??0);
  const events=meta.events.filter(e=>!e.resolved&&settings.events[e.kind]?.on&&(e.pending||settings.events[e.kind].ttl===0||now-e.time<settings.events[e.kind].ttl*1000)).sort((a,b)=>Number(b.pending)-Number(a.pending)||b.time-a.time);
  const notification=events[0],touch=['press','release'].includes(args.kind)&&settings.events[args.kind as 'press'|'release'].on;
  const event:CompanionEvent|undefined=touch?{id:'touch:'+sequence,kind:args.kind as 'press'|'release',sessionId:args.sessionId||'',time:now,text:'',pending:false}:notification;
  const select=(id:string,count:number,weights?:number[])=>args.select?args.select(id,`${meta.configRevision||0}:${event?.id||''}:${args.index||0}`,count,weights):Math.max(0,Number(args.index)||0)%Math.max(1,count);
  const entries=settings.bubbles;let entry=entries.find(e=>e.id===(event&&settings.events[event.kind]?.entry));
  if(!entry&&entries.length){
    const stages=new Map<string,typeof entries>();for(const e of entries){const key=e.group?'group:'+e.group:e.id;stages.set(key,[...(stages.get(key)||[]),e]);}
    const stage=[...stages.values()][Math.max(0,Number(args.index)||0)%stages.size],candidates=settings.bubbleMode==='sequence'?stage:entries;
    entry=candidates[select('entries',candidates.length,candidates.map(e=>e.weight))];
  }
  const enabled=report.balances.filter((b:any)=>b.enabled),firstBalance=enabled.find((b:any)=>b.snapshot?.balance!==undefined&&b.currency===currency),quota=enabled.find((b:any)=>b.quota||b.snapshot?.windows?.length);
  const amount=(value:any,unit=currency)=>value==null?'—':Number(value).toFixed(2)+' '+unit;
  const quotaText=(b:any)=>b?.quota?Math.max(0,b.quota.total-b.quota.used).toLocaleString('zh-CN'):b?.snapshot?.windows?.map((w:any)=>`${w.label} ${Number(w.percent).toFixed(1)}%`).join(' · ')||'尚未配置';
  const period=peakStatus(now),turn=report.turn||{};
  const metrics:Record<string,string>={
    tokens:number(report.total.tokens),input:number(report.total.input),output:number(report.total.output),cacheRead:number(report.total.cacheRead),cost:report.total.calls>0&&report.total.unpriced===report.total.calls?'尚未定价':amount(converted),
    balance:firstBalance?amount(firstBalance.snapshot.balance):'尚不可用',bonus:amount(firstBalance?.snapshot.bonus),recharge:amount(firstBalance?.snapshot.recharge),quota:quotaText(quota),
    calls:number(report.total.calls),prose:number(args.prose),settings:number(args.setting),session:turn.title||'当前对话',turnTokens:number(turn.tokens),turnCost:Object.entries(turn.costs||{}).map(([c,v])=>amount(v,c)).join(' + ')||'尚未定价',peak:period.label,peakCountdown:period.countdown,
  };
  for(const b of enabled){metrics['balance:'+b.id]=amount(b.snapshot?.balance,b.currency);metrics['bonus:'+b.id]=amount(b.snapshot?.bonus,b.currency);metrics['recharge:'+b.id]=amount(b.snapshot?.recharge,b.currency);metrics['quota:'+b.id]=quotaText(b);metrics['observed:'+b.id]=b.observed?.source?.startsWith('balance')?amount(b.observed.amount,b.currency):'尚不可用';}
  const balanceTotals:Record<string,string>={},balances=enabled.map((b:any)=>{
    const raw=b.snapshot?.balance,value=raw==null?null:String(raw),valid=value!==null&&/^-?\d+(?:\.\d{1,9})?$/.test(value)&&value.length<=30;
    if(valid){const signed=(v:string)=>v.startsWith('-')?-money(v.slice(1)):money(v);balanceTotals[b.currency]=moneyText(signed(balanceTotals[b.currency]||'0')+signed(value!));}
    return {id:b.id,name:String(b.name||b.id).slice(0,120),currency:b.currency,balance:valid?value:null,at:Number.isFinite(b.snapshot?.at)?b.snapshot.at:null,error:b.snapshot?.error?String(b.snapshot.error).slice(0,160):null};
  });
  const asset=(id:string)=>meta.assets.find(a=>a.id===id);
  const segment=(m:BubbleModule)=>{
    const value=['randomText','randomImage'].includes(m.kind)&&m.choices?.length?m.choices[select(m.id,m.choices.length,m.choiceWeights)]:m.value;
    if(['image','randomImage'].includes(m.kind)){const a=asset(value);return a?{kind:'image' as const,assetId:a.id,path:join(root,'assets',a.file),mime:a.mime}:{kind:'text' as const,text:'图片已移除'};}
    if(m.kind==='link')return {kind:'link' as const,text:m.label||value,url:value,style:m.style};
    return {kind:'text' as const,text:m.kind==='metric'?(m.label||'')+(metrics[value]||'—'):value.replace(/\{\{([\w:-]+)\}\}|\{(cost|session|tokens)\}/g,(_,a,b)=>metrics[a||b]||'—'),style:m.style};
  };
  const lines=entry?.lines.map(line=>({segments:line.map(segment)}))||[];let budget=4000;
  for(const line of lines)for(const part of line.segments)if(part.text){part.text=part.text.slice(0,Math.max(0,budget));budget-=part.text.length;}
  const soundId=event&&settings.events[event.kind].sound||'',soundGroup=meta.assets.filter(a=>a.kind==='audio'&&soundId.startsWith('group:')&&a.group===soundId.slice(6));
  const soundAsset=soundGroup.length?soundGroup[select('sounds',soundGroup.length)]:asset(soundId),custom=asset(settings.customRole||'');
  // Keep legacy wire fields inert for clients that still read them.
  return {lines,event,notification,showBubble:false,ttl:0,advanceOnClick:settings.advanceOnClick!==false,
    customContent:!!entry&&JSON.stringify(entry.lines)!==JSON.stringify(defaultCompanionSettings().bubbles[0].lines),bubbleName:entry?.name,
    summary:{tokens:report.total.tokens,cost:converted.toFixed(4),currency,unpriced:report.total.unpriced,date:report.to,calls:report.total.calls,input:report.total.input,output:report.total.output,cacheRead:report.total.cacheRead,cacheWrite:report.total.cacheWrite,costs:report.total.costs,balanceTotals,balanceCount:balances.length,balances:balances.slice(0,8)},
    appearance:{scale:settings.scale,flipped:settings.flipped,snap:settings.snap,snapZones:settings.snapZones||(settings.snap==='custom'?{unit:'percent',left:12,right:12,top:0,bottom:12}:undefined),autoFlip:settings.autoFlip,rolePath:custom?join(root,'assets',custom.file):undefined,roleMime:custom?.mime,roleAssetId:custom?.id},
    sound:soundAsset?.kind==='audio'&&event&&!event.deliveredAt?{id:event.id,assetId:soundAsset.id,path:join(root,'assets',soundAsset.file),volume:settings.volume*(settings.events[event.kind].volume??1)}:undefined,revision:meta.revision};
}

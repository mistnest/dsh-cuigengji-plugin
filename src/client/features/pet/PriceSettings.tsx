import React,{useId,useState} from 'react';
import type {PriceRule,PriceSchedule} from '../../../contracts/usage.ts';
import {defaultPriceSchedule,priceScheduleIssue} from '../../../domain/usage/calendar.ts';
import {priceSettingsStyles} from './usage-style.ts';

export interface PricingModel {provider:string|null;model:string|null}
interface Props {
  prices:PriceRule[];builtins:PriceRule[];models:PricingModel[];rates:Record<string,string>;
  onChange:(prices:PriceRule[])=>void;onRate:(currency:string,rate:string)=>void;
  initialModel?:PricingModel;
}
type Choice={key:string;price:PriceRule;custom:boolean};
const normalized=(value:string|null|undefined)=>(value||'').trim().toLowerCase();
const identity=(provider:string|null,model:string|null)=>JSON.stringify([normalized(provider),normalized(model)]);
const providerFamily=(provider:string|null)=>['deepseek','deepseek-official','deepseek-account'].includes(normalized(provider))?'deepseek':normalized(provider);
const columns=[['input','未缓存输入'],['cacheRead','缓存读取'],['output','输出'],['cacheWrite','缓存写入']] as const;
const currencyNames:Record<string,string>={CNY:'人民币 CNY',USD:'美元 USD',EUR:'欧元 EUR',JPY:'日元 JPY',GBP:'英镑 GBP'};
const newPrice=(model='',provider='*'):PriceRule=>({id:crypto.randomUUID(),provider,model,currency:'CNY',input:'',output:'',cacheRead:'0',revision:0});

export function PriceSettings({prices,builtins,models,rates,onChange,onRate,initialModel}:Props){
  const [selected,setSelected]=useState<string|null>(null),providerList=useId();
  const builtin=(model:string)=>builtins.find(p=>normalized(p.model)===normalized(model));
  const customFor=(provider:string,model:string)=>prices.find(p=>identity(p.provider,p.model)===identity(provider,model))||prices.find(p=>normalized(p.model)===normalized(model)&&providerFamily(p.provider)===providerFamily(provider))||prices.find(p=>normalized(p.model)===normalized(model)&&normalized(p.provider)==='*');
  const choices:Choice[]=prices.map(price=>({key:'custom:'+price.id,price,custom:true}));
  const addChoice=(provider:string,model:string,reference?:PriceRule)=>{
    if(customFor(provider,model)||choices.some(c=>identity(c.price.provider,c.price.model)===identity(provider,model)))return;
    choices.push({key:identity(provider,model),price:reference?{...structuredClone(reference),provider}:newPrice(model,provider),custom:false});
  };
  for(const rule of builtins)if(!['deepseek-v4-flash','deepseek-v4-flash-vision-exp'].includes(rule.model))addChoice(rule.provider,rule.model,rule);
  for(const model of models)if(model.model)addChoice(model.provider||'*',model.model,builtin(model.model));
  const applicable=initialModel?.model?customFor(initialModel.provider||'*',initialModel.model):undefined;
  const initial=applicable?choices.find(c=>c.custom&&c.price.id===applicable.id):initialModel?choices.find(c=>identity(c.price.provider,c.price.model)===identity(initialModel.provider||'*',initialModel.model)):undefined;
  const choice=choices.find(c=>c.key===selected)||initial||choices[0];
  if(!choice)return null;
  const price=choice.price,reference=builtin(price.model),schedule=price.schedule||defaultPriceSchedule();
  const update=(patch:Partial<PriceRule>)=>{
    const next={...price,...patch,id:choice.custom?price.id:crypto.randomUUID(),revision:0};
    onChange(choice.custom?prices.map(p=>p.id===price.id?next:p):[...prices,next]);
    setSelected('custom:'+next.id);
  };
  const updateSchedule=(patch:Partial<PriceSchedule>)=>update({schedule:{...schedule,...patch}});
  const scheduleError=price.peak?priceScheduleIssue(schedule):'';
  const offset=schedule.utcOffsetMinutes,timezone=offset===480?'北京时间 · UTC+8':offset===0?'UTC · UTC+0':`UTC ${offset<0?'-':'+'}${Math.abs(offset/60)}`;
  const remove=()=>{onChange(prices.filter(p=>p.id!==price.id));setSelected(identity(price.provider,price.model));};
  return <div className="usage-price-editor">
    <style>{priceSettingsStyles}</style>
    <div className="usage-model-picker"><label>选择模型<select aria-label="选择定价模型" value={choice.key} onChange={event=>setSelected(event.target.value)}>{choices.map(c=><option key={c.key} value={c.key}>{c.price.model||'新模型'} · {c.price.provider==='*'?'所有厂商':c.price.provider}</option>)}</select></label><button type="button" onClick={()=>{const next=newPrice();onChange([...prices,next]);setSelected('custom:'+next.id);}}>＋ 添加模型</button></div>
    <section className="usage-price-form" aria-label={`模型价格 ${price.model||'新模型'}`}>
      <header className="usage-price-heading"><div><h4>{price.model||'新模型'}</h4><small>{choice.custom?'自定义价格':reference?'官方预置':'待设置单价'}</small></div><div className="usage-price-actions">{reference&&choice.custom&&<button type="button" className="usage-text-button" onClick={remove}>恢复官方默认</button>}{choice.custom&&<button type="button" className="usage-text-button" onClick={remove}>删除价格</button>}</div></header>
      <div className="usage-route-fields"><label>厂商标识<input aria-label="厂商标识" list={providerList} value={price.provider} onChange={event=>update({provider:event.target.value})}/><datalist id={providerList}><option value="*">所有厂商</option>{[...new Set(['deepseek',...models.map(m=>m.provider).filter(Boolean)])].map(provider=><option value={provider!} key={provider}/>)}</datalist></label><label>模型名称<input aria-label="定价模型名称" value={price.model} onChange={event=>update({model:event.target.value})}/></label><label>币种<select aria-label="计价币种" value={price.currency} onChange={event=>update({currency:event.target.value})}>{[...new Set([...Object.keys(currencyNames),price.currency])].map(currency=><option key={currency} value={currency}>{currencyNames[currency]||currency}</option>)}</select></label></div>
      {price.currency!=='CNY'&&<label className="usage-exchange">{`1 ${price.currency} 折合人民币`}<input aria-label={`1 ${price.currency} 折合人民币`} type="number" min="0" step="any" value={rates[price.currency]||''} placeholder="可选" onChange={event=>onRate(price.currency,event.target.value)}/></label>}
      <div className="usage-price-mode"><label><input type="checkbox" aria-label="按峰谷时段计价" checked={!!price.peak} onChange={event=>update({peak:event.target.checked?{input:price.input,output:price.output,cacheRead:price.cacheRead,cacheWrite:price.cacheWrite}:undefined,schedule:event.target.checked?schedule:undefined})}/>按峰谷时段计价</label><span>单价单位：{price.currency} / 百万 Token</span></div>
      <div className="usage-rate-table" role="group" aria-label="模型单价">
        <div className={`usage-rate-row usage-rate-head${price.peak?'':' is-fixed'}`}><span>项目</span><span>{price.peak?'谷价':'单价'}</span>{price.peak&&<span>峰价</span>}</div>
        {columns.map(([key,label])=><div className={`usage-rate-row${price.peak?'':' is-fixed'}`} key={key}><span>{label}{key==='cacheWrite'&&<small>可选</small>}</span>{([price,...(price.peak?[price.peak]:[])]).map((value,index)=><input key={index} aria-label={`${price.peak?(index?'峰价 ':'谷价 '):''}${label}单价`} type="number" min="0" step="any" value={value[key]??''} placeholder={key==='cacheWrite'?'未配置':'0.00'} onChange={event=>{const amount=key==='cacheWrite'&&!event.target.value?undefined:event.target.value;if(index)update({peak:{...price.peak!,[key]:amount}});else update({[key]:amount});}}/>)}</div>)}
      </div>
      {reference?.source&&<div className="usage-price-source"><span>{choice.custom?'参考官方价格':'DeepSeek 官方价格'}</span><a href={reference.source} target="_blank" rel="noreferrer">查看来源 ↗</a></div>}
    </section>
    {price.peak&&<section className="usage-price-schedule" aria-label="峰谷时段设置">
      <header className="usage-price-heading"><h4>峰价时段</h4><label className="usage-zone"><select aria-label="计价时区" value={offset} onChange={event=>updateSchedule({utcOffsetMinutes:Number(event.target.value)})}>{[...new Set([480,0,offset])].map(value=><option key={value} value={value}>{value===offset?timezone:value===480?'北京时间 · UTC+8':'UTC · UTC+0'}</option>)}</select></label></header>
      <div className="usage-weekdays" role="group" aria-label="峰价适用日">{[1,2,3,4,5,6,0].map((day,index)=><button type="button" key={day} aria-label={`周${'一二三四五六日'[index]}适用峰价`} aria-pressed={schedule.weekdays.includes(day)} onClick={()=>updateSchedule({weekdays:schedule.weekdays.includes(day)?schedule.weekdays.filter(d=>d!==day):[...schedule.weekdays,day]})}>{'一二三四五六日'[index]}</button>)}</div>
      <label className="usage-holiday"><input type="checkbox" aria-label="中国法定节假日全天按谷价" checked={schedule.excludeChinaHolidays} onChange={event=>updateSchedule({excludeChinaHolidays:event.target.checked})}/>中国法定节假日全天按谷价</label>
      <div className="usage-time-windows">{schedule.windows.map((window,index)=><div className="usage-window-row" key={index}><span>时段 {index+1}</span><input type="time" aria-label={`峰价时段 ${index+1} 开始`} value={window.start} onChange={event=>updateSchedule({windows:schedule.windows.map((w,i)=>i===index?{...w,start:event.target.value}:w)})}/><span aria-hidden="true">—</span><input type="time" aria-label={`峰价时段 ${index+1} 结束`} value={window.end} onChange={event=>updateSchedule({windows:schedule.windows.map((w,i)=>i===index?{...w,end:event.target.value}:w)})}/><button type="button" aria-label={`删除峰价时段 ${index+1}`} onClick={()=>updateSchedule({windows:schedule.windows.filter((_,i)=>i!==index)})}>×</button></div>)}</div>
      <div className="usage-schedule-foot"><button type="button" className="usage-text-button" disabled={schedule.windows.length>=6} onClick={()=>updateSchedule({windows:[...schedule.windows,{start:'18:00',end:'20:00'}]})}>＋ 添加时段</button><span>其余时间按谷价计算</span></div>
      {scheduleError&&<p className="notice error" role="alert">{scheduleError}</p>}
    </section>}
  </div>;
}

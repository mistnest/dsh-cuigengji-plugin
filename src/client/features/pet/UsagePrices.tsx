import React,{useEffect,useState} from 'react';
import type {PetRPC} from './model.ts';
import type {CompanionSettings,PriceRule} from '../../../contracts/usage.ts';
import {PriceSettings,type PricingModel} from './PriceSettings.tsx';
import {defaultPriceSchedule,priceScheduleIssue} from '../../../domain/usage/calendar.ts';

interface PriceConfiguration {revision:number;settings:CompanionSettings;prices:PriceRule[];builtinPrices:PriceRule[];observedModels:PricingModel[]}
export function UsagePrices({rpc,initialModel,onClose,onSaved}:{rpc:PetRPC;initialModel?:PricingModel;onClose:()=>void;onSaved:()=>void}){
  const [config,setConfig]=useState<PriceConfiguration|null>(null),[dirty,setDirty]=useState(false),[ratesDirty,setRatesDirty]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState(''),[busy,setBusy]=useState(false),[reload,setReload]=useState(0);
  useEffect(()=>{let active=true;void rpc('usage.config',{}).then(value=>{if(active){setConfig(value);setDirty(false);setRatesDirty(false);setError('');setStatus('');}}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[rpc,reload]);
  const save=async()=>{if(!config)return;setBusy(true);setError('');setStatus('');try{
    const result=await rpc('usage.configure',{expectedRevision:config.revision,prices:config.prices,...(ratesDirty?{settings:config.settings}:{})});
    setConfig({...config,revision:result.revision});setDirty(false);setRatesDirty(false);setStatus('已保存');onSaved();
  }catch(e:any){setError(e.message);}finally{setBusy(false);}};
  const invalidSchedule=config?.prices.some(price=>price.peak&&priceScheduleIssue(price.schedule||defaultPriceSchedule()));
  return <section aria-label="模型定价">
    <div className="usage-pricing-top"><button type="button" disabled={busy} onClick={onClose}>← 返回报表</button><h4>模型定价</h4></div>
    {error&&<p className="notice error" role="alert">{error}<button type="button" disabled={busy} onClick={()=>setReload(n=>n+1)}>重新读取配置</button></p>}
    {!config?<p className="usage-empty">正在读取模型价格…</p>:<>
      <fieldset className="usage-price-fields" disabled={busy}>
        <PriceSettings prices={config.prices} builtins={config.builtinPrices} models={config.observedModels||[]} rates={config.settings.exchangeRates} initialModel={initialModel} onChange={prices=>{setConfig({...config,prices});setDirty(true);setStatus('');}} onRate={(currency,rate)=>{const rates={...config.settings.exchangeRates};if(rate)rates[currency]=rate;else delete rates[currency];setConfig({...config,settings:{...config.settings,exchangeRates:rates}});setDirty(true);setRatesDirty(true);setStatus('');}}/>
      </fieldset>
      <div className="usage-pricing-save"><button type="button" disabled={busy||!dirty||invalidSchedule} onClick={()=>void save()}>{busy?'保存中…':'保存定价'}</button><span role="status" aria-live="polite">{status}</span></div>
    </>}
  </section>;
}

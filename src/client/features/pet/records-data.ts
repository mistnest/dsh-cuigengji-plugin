import {useEffect,useState} from 'react';
import type {PetRPC,WritingRecordResult,ActivityStats} from './model.ts';

export function localDate(date=new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function recordRange(mode:'today'|'recent'|'month',now=new Date()) {
  const to=localDate(now),start=new Date(now);
  if(mode==='recent')start.setDate(start.getDate()-29);
  if(mode==='month')start.setDate(1);
  return {from:localDate(start),to};
}
export const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().slice(0,10)===value;

/** History has its own request lifetime, separate from the pet's today feed.
 * Late responses after filter changes and unmounts cannot replace current data. */
export function useWritingRecords(rpc:PetRPC,sessionId:string,from:string,to:string,novelId:string|null) {
  const key=JSON.stringify([sessionId,from,to,novelId]);
  const [version,refresh]=useState(0);
  const [state,setState]=useState<{key:string;result:WritingRecordResult|null;loading:boolean;error:string}>({key,result:null,loading:true,error:''});
  useEffect(()=>{
    let active=true,timer:ReturnType<typeof setTimeout>;
    setState(previous=>({key,result:previous.key===key?previous.result:null,loading:true,error:''}));
    const timeout=new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(Error('读取写作记录超时，请重试。')),20_000);});
    Promise.race([rpc('activity.stats',{from,to,...(novelId?{novelId}:{})},sessionId),timeout]).then((value:WritingRecordResult)=>{
      if(!value||value.from!==from||value.to!==to||value.novelId!==novelId||!Array.isArray(value.daily)||!Array.isArray(value.novels)||!value.stats)throw Error('写作记录的数据格式不正确，请重试。');
      if(active)setState({key,result:value,loading:false,error:''});
    }).catch(error=>{if(active)setState(previous=>({...previous,key,loading:false,error:error instanceof Error?error.message:String(error)}));}).finally(()=>clearTimeout(timer));
    return()=>{active=false;clearTimeout(timer);};
  },[rpc,key,version]);
  return {...(state.key===key?state:{key,result:null,loading:true,error:''}),refresh:()=>refresh(value=>value+1)};
}

export interface RecordBin {key:string;label:string;from:string;to:string;prose:number;settings:number;chat:number}
/** Long ranges use calendar months, including empty months between records. */
export function recordBins(from:string,to:string,daily:WritingRecordResult['daily']):RecordBin[] {
  const span=Math.round((Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000)+1;
  const monthly=span>120,map=new Map<string,RecordBin>();
  if(!monthly) {
    for(let index=0;index<span;index++){
      const date=new Date(Date.parse(from+'T12:00:00Z')+index*86400000).toISOString().slice(0,10);
      map.set(date,{key:date,label:`${Number(date.slice(5,7))}/${Number(date.slice(8))}`,from:date,to:date,prose:0,settings:0,chat:0});
    }
  } else {
    let year=Number(from.slice(0,4)),month=Number(from.slice(5,7));
    const last=to.slice(0,7);
    while(`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}`<=last){
      const key=`${String(year).padStart(4,'0')}-${String(month).padStart(2,'0')}`;
      map.set(key,{key,label:key.slice(2),from:key+'-01',to:key+'-01',prose:0,settings:0,chat:0});
      if(++month>12){month=1;year++;}
    }
  }
  for(const day of daily){const bin=map.get(monthly?day.date.slice(0,7):day.date);if(bin){bin.to=day.date;bin.prose+=day.stats.proseAdded;bin.settings+=day.stats.settingAdded;bin.chat+=day.stats.conversationInput||0;}}
  return [...map.values()];
}
export const statFields=['proseAdded','settingAdded','planningChanges','conversationInput'] as const satisfies readonly (keyof ActivityStats)[];

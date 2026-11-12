import React,{useCallback,useEffect,useRef,useState} from 'react';
import type {PetRPC} from './model.ts';
import type {PetPresentation} from '../../../contracts/usage.ts';

const assets=new Map<string,string>();
export function UsageAsset({rpc,id,kind='image',...props}:{rpc:PetRPC;id:string;kind?:'image'|'audio'}&React.HTMLAttributes<HTMLImageElement>){
  const [url,setUrl]=useState(assets.get(id)||'');
  useEffect(()=>{let alive=true;if(assets.has(id)){setUrl(assets.get(id)!);return;}setUrl('');void rpc('usage.asset',{action:'read',id}).then(a=>{const value=`data:${a.mime};base64,${a.data}`;assets.set(id,value);if(alive)setUrl(value);}).catch(()=>{});return()=>{alive=false;};},[rpc,id]);
  return url?kind==='audio'?<audio controls src={url}/>:<img {...props} src={url} alt={props['aria-label']||'桌宠素材'}/>:null;
}
const played=new Set<string>();
export function playCompanionSound(rpc:PetRPC,sound:PetPresentation['sound']){
  if(!sound||played.has(sound.id))return;played.add(sound.id);
  void rpc('usage.asset',{action:'read',id:sound.assetId}).then(a=>{const audio=new Audio(`data:${a.mime};base64,${a.data}`);audio.volume=sound.volume;return audio.play();}).catch(()=>{/* Web autoplay can require a preceding user gesture. */});
}
export function useCompanionPresentation(rpc:PetRPC,index:number,sessionId?:string,presentTouches=true){
  const [value,setValue]=useState<PetPresentation|null>(null),[error,setError]=useState('');
  const latest=useRef({index,sessionId,presentTouches});latest.current={index,sessionId,presentTouches};
  const mounted=useRef(true),sequence=useRef(0);
  const request=useCallback(async(kind?:string)=>{const seq=++sequence.current,sent=latest.current;try{const result=await rpc('usage.presentation',{index:sent.index,sessionId:sent.sessionId,kind},sent.sessionId);if(mounted.current&&sent.sessionId===latest.current.sessionId){if(kind&&latest.current.presentTouches&&result.event?.id?.startsWith('touch:'))playCompanionSound(rpc,result.sound);if(seq===sequence.current){setValue(result);setError('');}}}catch{if(mounted.current&&seq===sequence.current)setError('用量暂未连接');}},[rpc]);
  useEffect(()=>{mounted.current=true;const timer=setInterval(()=>void request(),4000);return()=>{mounted.current=false;clearInterval(timer);};},[request]);
  useEffect(()=>{void request();},[request,index,sessionId]);
  return {value,error,request};
}
export function UsageBubble({rpc,value}:{rpc:PetRPC;value:PetPresentation|null}){
  if(!value)return null;
  return <div className="pet-usage-bubble" aria-label="用量与提醒">{value.lines.map((line,i)=><div key={i} style={{margin:'5px 0'}}>{line.segments.map((s,j)=>s.kind==='image'?<UsageAsset rpc={rpc} id={s.assetId!} key={j} style={{maxWidth:'100%',maxHeight:140,objectFit:'contain'}}/>:s.kind==='link'?<a key={j} href={s.url} target="_blank" rel="noreferrer" style={textStyle(s.style)}>{s.text}</a>:<span key={j} style={textStyle(s.style)}>{s.text}</span>)}</div>)}{value.summary.unpriced>0&&<small>{value.summary.unpriced} 次请求未定价，估算不含这部分费用。</small>}</div>;
}
function textStyle(s?:Record<string,any>):React.CSSProperties{return s?{fontSize:s.size,fontFamily:s.font,color:s.color,fontWeight:s.bold?600:undefined,fontStyle:s.italic?'italic':undefined,textDecoration:s.underline?'underline':undefined,background:s.gradient?`linear-gradient(110deg,${s.background||'#fff'},${s.gradient})`:s.background}:{};}

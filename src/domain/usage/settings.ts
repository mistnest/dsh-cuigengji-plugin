import type {CompanionSettings,PetEventKind,UsageMeta} from '../../contracts/usage.ts';
export const usageError=(message:string,code='INVALID_INPUT'):never=>{throw Object.assign(new Error(message),{code});};
export const usageDay=(time=Date.now())=>{const d=new Date(time);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
export const isUsageDay=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!isNaN(Date.parse(value+'T12:00:00Z'))&&new Date(value+'T12:00:00Z').toISOString().startsWith(value);
export const eventKinds:PetEventKind[]=['press','release','complete','question','approval','balance','budget'];
export function defaultCompanionSettings():CompanionSettings {
  return {enabled:true,currency:'CNY',exchangeRates:{CNY:'1',USD:'7'},dailyBudget:'0',lowBalance:'0',volume:.45,scale:1,flipped:false,snap:'none',bubbleMode:'sequence',advanceOnClick:true,moduleLibrary:[],
    bubbles:[{id:'progress',name:'写作与用量',weight:1,lines:[[{id:'intro',kind:'text',value:'今天也在陪你写故事。'}],[{id:'tokens',kind:'metric',value:'tokens',label:'今日 Token '}],[{id:'cost',kind:'metric',value:'cost',label:'模型估算 '}],[{id:'balance',kind:'metric',value:'balance',label:'账户余额 '}]]}],
    events:Object.fromEntries(eventKinds.map(kind=>[kind,{on:!['press','release'].includes(kind),bubble:false,ttl:['question','approval'].includes(kind)?0:6}])) as CompanionSettings['events']};
}
export function emptyUsage():UsageMeta{return {version:1,revision:0,settings:defaultCompanionSettings(),prices:[],sources:[{id:'deepseek',name:'DeepSeek',template:'deepseek',enabled:true,keyRef:'DEEPSEEK_API_KEY',provider:'deepseek',currency:'CNY'}],days:[],cursors:{},summaries:{},balances:{},balanceBooks:{},events:[],assets:[],imported:[]};}
export function validateCompanionSettings(settings:CompanionSettings){
  if(!settings||typeof settings.enabled!=='boolean'||!['CNY','USD','EUR','JPY','GBP'].includes(settings.currency))usageError('请选择有效的统计币种');
  if(!Number.isFinite(settings.volume)||settings.volume<0||settings.volume>1||!Number.isFinite(settings.scale)||settings.scale<.5||settings.scale>2)usageError('音量或桌宠大小无效');
  if(typeof settings.flipped!=='boolean'||!['none','edges','corners','custom'].includes(settings.snap)||!['sequence','weighted'].includes(settings.bubbleMode)||settings.autoFlip!==undefined&&typeof settings.autoFlip!=='boolean')usageError('桌宠外观或气泡模式无效');
  if(settings.snapZones){const z=settings.snapZones;if(!['percent','px'].includes(z.unit)||[z.left,z.right,z.top,z.bottom].some(v=>!Number.isFinite(v)||v<0||v>(z.unit==='percent'?50:2000)))usageError('吸附区域应为 0—50% 或 0—2000 像素；0 表示关闭该侧');}
  for(const value of [settings.dailyBudget,settings.lowBalance,...Object.values(settings.exchangeRates||{})])if(!/^\d+(?:\.\d{1,9})?$/.test(String(value))||String(value).length>30)usageError('金额和汇率须为非负数，最多九位小数');
  if(!settings.exchangeRates?.[settings.currency]||Object.values(settings.exchangeRates).some(v=>Number(v)<=0))usageError('汇率必须大于零，并包含显示币种');
  if(!Array.isArray(settings.bubbles)||settings.bubbles.length>60)usageError('气泡配置过多');
  const ids=new Set<string>();for(const entry of settings.bubbles){
    if(!entry.id||ids.has(entry.id)||typeof entry.name!=='string'||entry.group!==undefined&&(typeof entry.group!=='string'||entry.group.length>80)||!Number.isFinite(entry.weight)||entry.weight<0||!Array.isArray(entry.lines)||entry.lines.length>6)usageError('气泡配置无效');ids.add(entry.id);
    for(const line of entry.lines){if(!Array.isArray(line)||line.length>6)usageError('每行最多六个模块');for(const module of line){
      if(!module||typeof module.id!=='string'||!['text','metric','link','randomText','image','randomImage'].includes(module.kind)||typeof module.value!=='string'||module.value.length>4000)usageError('气泡模块无效');
      if(module.choices&&(!Array.isArray(module.choices)||module.choices.some((v:string)=>typeof v!=='string'||v.length>4000)))usageError('随机内容无效');
      if(module.choiceWeights&&(!Array.isArray(module.choiceWeights)||module.choiceWeights.length!==module.choices?.length||module.choiceWeights.some(v=>!Number.isFinite(v)||v<0)))usageError('随机内容权重无效');
      if(module.kind==='link'&&!/^https?:\/\//i.test(module.value))usageError('气泡链接需要 http 或 https 地址');
      const s=module.style;if(s&&(s.size!==undefined&&(!Number.isFinite(s.size)||s.size<9||s.size>40)||s.font!==undefined&&(typeof s.font!=='string'||s.font.length>100)||['color','background','gradient'].some(k=>(s as any)[k]&&!/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test((s as any)[k]))))usageError('气泡文字样式无效');
    }if(line.some(m=>['image','randomImage'].includes(m.kind))&&line.length!==1)usageError('图片模块需要独占一行');}
  }
  if(settings.moduleLibrary){if(!Array.isArray(settings.moduleLibrary)||settings.moduleLibrary.length>60)usageError('常用模块最多六十项');const check={...settings,moduleLibrary:undefined,bubbles:settings.moduleLibrary.map(m=>({id:m.id,name:m.label||m.value||'模块',weight:1,lines:[[m]]}))};validateCompanionSettings(check);}
  for(const kind of eventKinds){const e=settings.events?.[kind];if(!e||typeof e.on!=='boolean'||typeof e.bubble!=='boolean'||!Number.isFinite(e.ttl)||e.ttl<0||e.ttl>3600||e.volume!==undefined&&(!Number.isFinite(e.volume)||e.volume<0||e.volume>1))usageError('提醒配置无效');}
}

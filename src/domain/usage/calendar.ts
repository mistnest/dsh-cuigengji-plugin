import type {PriceSchedule} from '../../contracts/usage.ts';
// DeepSeek defaults to Beijing time, excluding weekends and Chinese public holidays.
// Shared by charging, the companion and the price editor; no host dependencies.
export const priceCalendarYear=2026;
const holidays=new Set('2026-01-01 2026-01-02 2026-01-03 2026-02-15 2026-02-16 2026-02-17 2026-02-18 2026-02-19 2026-02-20 2026-02-21 2026-02-22 2026-02-23 2026-04-04 2026-04-05 2026-04-06 2026-05-01 2026-05-02 2026-05-03 2026-05-04 2026-05-05 2026-06-19 2026-06-20 2026-06-21 2026-09-25 2026-09-26 2026-09-27 2026-10-01 2026-10-02 2026-10-03 2026-10-04 2026-10-05 2026-10-06 2026-10-07'.split(' '));
export const defaultPriceSchedule=():PriceSchedule=>({utcOffsetMinutes:480,weekdays:[1,2,3,4,5],excludeChinaHolidays:true,windows:[{start:'09:00',end:'12:00'},{start:'14:00',end:'18:00'}]});
const validTime=(time:string)=>typeof time==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(time);
const minute=(time:string)=>Number(time.slice(0,2))*60+Number(time.slice(3));
export function priceScheduleIssue(s:PriceSchedule):string {
  if(!s||!Number.isInteger(s.utcOffsetMinutes)||s.utcOffsetMinutes < -720||s.utcOffsetMinutes > 840||typeof s.excludeChinaHolidays!=='boolean')return '请选择有效的计价时区。';
  if(!Array.isArray(s.weekdays)||!s.weekdays.length||s.weekdays.length>7||s.weekdays.some(day=>!Number.isInteger(day)||day<0||day>6)||new Set(s.weekdays).size!==s.weekdays.length)return '请至少选择一个峰价适用日。';
  if(!Array.isArray(s.windows)||!s.windows.length||s.windows.length>6)return '请设置一至六个峰价时段。';
  if(s.windows.some(w=>!w||!validTime(w.start)||!validTime(w.end)||w.start===w.end))return '请填写不同的开始、结束时间。';
  const slots=new Set<number>();
  for(const day of s.weekdays)for(const window of s.windows){const start=minute(window.start),end=minute(window.end);for(let m=start;m<(end>start?end:end+1440);m++){const slot=(day*1440+m)%10080;if(slots.has(slot))return '峰价时段有重叠，请调整后保存。';slots.add(slot);}}
  return '';
}
export function peakPrice(time:number,schedule:PriceSchedule=defaultPriceSchedule()){
  const d=new Date(time+schedule.utcOffsetMinutes*60000),date=d.toISOString().slice(0,10),day=d.getUTCDay(),now=d.getUTCHours()*60+d.getUTCMinutes();
  if(schedule.excludeChinaHolidays&&holidays.has(date))return false;
  const previous=new Date(d.getTime()-86400000),previousAllowed=schedule.weekdays.includes(previous.getUTCDay())&&(!schedule.excludeChinaHolidays||!holidays.has(previous.toISOString().slice(0,10)));
  return schedule.windows.some(w=>{const start=minute(w.start),end=minute(w.end);return start<end?schedule.weekdays.includes(day)&&now>=start&&now<end:schedule.weekdays.includes(day)&&now>=start||previousAllowed&&now<end;});
}
export function peakStatus(time=Date.now()){
  const peak=peakPrice(time),date=new Date(time+8*3600000);let next:number|null=null;
  for(let day=0;day<=12&&next===null;day++)for(const hour of [0,9,12,14,18]){
    const candidate=Date.UTC(date.getUTCFullYear(),date.getUTCMonth(),date.getUTCDate()+day,hour-8);
    if(candidate>time&&peakPrice(candidate)!==peak){next=candidate;break;}
  }
  const minutes=next===null?0:Math.max(0,Math.ceil((next-time)/60000));
  return {peak,label:peak?'高峰时段':'空闲时段',nextChangeAt:next,countdown:next===null?'待更新日历':`${Math.floor(minutes/60)}小时${minutes%60}分后${peak?'转空闲':'转高峰'}`,calendarNote:date.getUTCFullYear()===priceCalendarYear?'':'节假日规则待更新，按工作日估算'};
}

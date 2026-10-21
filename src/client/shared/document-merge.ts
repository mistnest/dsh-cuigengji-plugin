/** Merge only editor-owned fields; layout and server metadata always come from remote. */
const same=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function edit(base:string,next:string) {
  const a=Array.from(base),b=Array.from(next);let start=0,end=a.length,tail=b.length;
  while(start<end&&start<tail&&a[start]===b[start])start++;
  while(end>start&&tail>start&&a[end-1]===b[tail-1]){end--;tail--;}
  return {start,end,text:b.slice(start,tail)};
}
function mergeText(base:string,local:string,remote:string):string|null {
  const a=edit(base,local),b=edit(base,remote);
  // Touching edits may express incompatible intent, especially two insertions.
  if(!(a.end<b.start||b.end<a.start))return null;
  const chars=Array.from(base);
  for(const change of [a,b].sort((x,y)=>y.start-x.start))chars.splice(change.start,change.end-change.start,...change.text);
  return chars.join('');
}
export function mergeDocument<T extends Record<string,any>>(base:T,local:T,remote:T,fields:readonly string[]) {
  const value={...remote},conflicts:string[]=[];
  for(const key of fields){
    if(same(local[key],base[key]))continue;
    if(same(remote[key],base[key])||same(remote[key],local[key])){value[key as keyof T]=local[key];continue;}
    const merged=typeof base[key]==='string'&&typeof local[key]==='string'&&typeof remote[key]==='string'?mergeText(base[key],local[key],remote[key]):null;
    if(merged!==null)value[key as keyof T]=merged as T[keyof T];
    else {conflicts.push(key);value[key as keyof T]=local[key];}
  }
  const patch=Object.fromEntries(fields.filter(key=>!same(value[key],remote[key])).map(key=>[key,value[key]]));
  return {value,patch,conflicts};
}

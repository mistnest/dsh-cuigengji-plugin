type Version={revision:number;timestamp?:string;reason?:string;actor?:{kind?:string;sessionId?:string|null}};
/** Group presentation only. Every source revision remains independently restorable. */
export function groupHistory<T extends Version>(versions:T[]):T[][]{
  const groups:T[][]=[];
  for(const version of [...versions].reverse()){
    const group=groups.at(-1),previous=group?.at(-1);
    if(previous&&version.actor?.kind==='human'&&previous.actor?.kind==='human'&&version.reason==='作者自动保存'&&previous.reason==='作者自动保存'&&version.actor?.sessionId===previous.actor?.sessionId&&Date.parse(previous.timestamp||'')-Date.parse(version.timestamp||'')<180000)group!.push(version);
    else groups.push([version]);
  }
  return groups;
}

/** Offsets refer to the textarea's LF-normalized UTF-16 value. */
export function manuscriptLineStarts(text:string):number[]{
  const starts=[0];
  for(let at=0;at<text.length;at++)if(text[at]==='\n')starts.push(at+1);
  return starts;
}
export function manuscriptLineAt(starts:number[],offset:number):number{
  let low=0,high=starts.length;
  while(low<high){const mid=(low+high)>>>1;if(starts[mid]<=offset)low=mid+1;else high=mid;}
  return Math.max(1,low);
}
export function manuscriptLineRange(text:string,line:number):{start:number;end:number}|null{
  const starts=manuscriptLineStarts(text);
  if(!Number.isInteger(line)||line<1||line>starts.length)return null;
  return {start:starts[line-1],end:line<starts.length?starts[line]-1:text.length};
}

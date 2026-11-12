export type DiffPart = {kind:'same'|'remove'|'add'; text:string};
export type ProseDiffChunk = {kind:'same'|'change'; before:string[]; after:string[]; oldLine:number; newLine:number; change:number|null};
type Run = {kind:DiffPart['kind']; values:string[]};
const normalize = (text:string) => text.replace(/\r\n?/g,'\n');

/** Patience anchors keep distant unchanged passages aligned. Small gaps use LCS;
 * a completely rewritten large gap stays a replacement instead of blocking UI. */
function sequence(before:string[],after:string[],limit=1_000_000,anchors=true):Run[] {
  const runs:Run[]=[];
  let budget=limit;
  const emit=(kind:Run['kind'],values:string[])=>{
    if(!values.length)return;
    const last=runs.at(-1);
    if(last?.kind===kind)for(const value of values)last.values.push(value);
    else runs.push({kind,values:[...values]});
  };
  const visit=(a:number,b:number,c:number,d:number,depth=0)=>{
    let prefix=a;
    while(a<b&&c<d&&before[a]===after[c]){a++;c++;}
    emit('same',before.slice(prefix,a));
    const end=b;
    while(a<b&&c<d&&before[b-1]===after[d-1]){b--;d--;}
    if(a===b)emit('add',after.slice(c,d));
    else if(c===d)emit('remove',before.slice(a,b));
    else if((b-a+1)*(d-c+1)<=Math.min(budget,250_000)){
      const width=d-c+1,matrix=new Uint32Array((b-a+1)*width);
      budget-=matrix.length;
      for(let i=b-a-1;i>=0;i--)for(let j=d-c-1;j>=0;j--)
        matrix[i*width+j]=before[a+i]===after[c+j]?matrix[(i+1)*width+j+1]+1:Math.max(matrix[(i+1)*width+j],matrix[i*width+j+1]);
      let i=0,j=0;
      while(a+i<b||c+j<d){
        if(a+i<b&&c+j<d&&before[a+i]===after[c+j]){emit('same',[before[a+i]]);i++;j++;}
        else if(a+i<b&&(c+j===d||matrix[(i+1)*width+j]>=matrix[i*width+j+1]))emit('remove',[before[a+i++]]);
        else emit('add',[after[c+j++]]);
      }
    }else{
      const unique=(values:string[],start:number,end:number)=>{
        const map=new Map<string,number>();
        for(let i=start;i<end;i++)map.set(values[i],map.has(values[i])?-1:i);
        return map;
      };
      const pairs:{a:number;b:number;previous:number}[]=[],tails:number[]=[];
      if(anchors&&depth<24){
        const left=unique(before,a,b),right=unique(after,c,d);
        for(const [text,index] of left){
          const other=right.get(text);
          if(index<0||other===undefined||other<0)continue;
          let low=0,high=tails.length;
          while(low<high){const mid=(low+high)>>>1;if(pairs[tails[mid]].b<other)low=mid+1;else high=mid;}
          pairs.push({a:index,b:other,previous:low?tails[low-1]:-1});tails[low]=pairs.length-1;
        }
      }
      const selected:{a:number;b:number}[]=[];
      for(let at=tails.at(-1)??-1;at>=0;at=pairs[at].previous)selected.push(pairs[at]);
      if(!selected.length){emit('remove',before.slice(a,b));emit('add',after.slice(c,d));}
      else{
        for(const pair of selected.reverse()){visit(a,pair.a,c,pair.b,depth+1);emit('same',[before[pair.a]]);a=pair.a+1;c=pair.b+1;}
        visit(a,b,c,d,depth+1);
      }
    }
    emit('same',before.slice(b,end));
  };
  visit(0,before.length,0,after.length);
  return runs;
}

export function diffProse(before:string,after:string):ProseDiffChunk[] {
  const lines=(text:string)=>text===''?[]:normalize(text).split('\n');
  const runs=sequence(lines(before),lines(after)),chunks:ProseDiffChunk[]=[];
  let oldLine=1,newLine=1,change=0;
  for(const run of runs){
    const same=run.kind==='same';
    let chunk=chunks.at(-1);
    if(same||chunk?.kind!=='change'){
      chunk={kind:same?'same':'change',before:[],after:[],oldLine,newLine,change:same?null:change++};chunks.push(chunk);
    }
    if(run.kind!=='add'){for(const value of run.values)chunk!.before.push(value);oldLine+=run.values.length;}
    if(run.kind!=='remove'){for(const value of run.values)chunk!.after.push(value);newLine+=run.values.length;}
  }
  return chunks;
}

/** Code points avoid highlighting half an emoji. Work is bounded for long lines. */
export function highlightProseLine(before:string,after:string):{before:DiffPart[];after:DiffPart[]} {
  const runs=sequence([...before],[...after],80_000,false);
  return {
    before:runs.filter(run=>run.kind!=='add').map(run=>({kind:run.kind,text:run.values.join('')})),
    after:runs.filter(run=>run.kind!=='remove').map(run=>({kind:run.kind,text:run.values.join('')})),
  };
}

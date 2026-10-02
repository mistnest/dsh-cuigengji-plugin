import { persistDraft, restoreDraft } from '../../shared/drafts.js';

export interface Chapter {
  id: string; revision: number; contentHash: string; deleted: boolean;
  title: string; content: string; volumeId: string | null; order: number;
  [key: string]: any;
}
const fields = ['content','title','volumeId','order'] as const;
const same = (a: Chapter, b: Chapter) => fields.every(key => a[key] === b[key]);
function edit(base: string, text: string) {
  let start=0,end=base.length,tail=text.length;
  while(start<end&&start<tail&&base[start]===text[start]) start++;
  while(end>start&&tail>start&&base[end-1]===text[tail-1]) {end--;tail--;}
  return {start,end,text:text.slice(start,tail)};
}
/** Conservative three-way merge: overlapping edits always remain for human review. */
export function mergeText(base: string, local: string, remote: string): string | null {
  if(local===remote||remote===base)return local;
  if(local===base)return remote;
  const a=edit(base,local),b=edit(base,remote);
  if(!(a.end<b.start||b.end<a.start))return null;
  let result=base;
  for(const patch of [a,b].sort((x,y)=>y.start-x.start))result=result.slice(0,patch.start)+patch.text+result.slice(patch.end);
  return result;
}
export function mergeChapter(base: Chapter, local: Chapter, remote: Chapter): Chapter | null {
  if(remote.deleted&&!same(base,local))return null;
  const value={...remote};
  for(const key of fields){
    if(key==='content'){
      const merged=mergeText(base.content,local.content,remote.content);
      if(merged===null)return null;value.content=merged;
    }else if(local[key]===base[key])value[key]=remote[key] as never;
    else if(remote[key]===base[key]||remote[key]===local[key])value[key]=local[key] as never;
    else return null;
  }
  return value;
}
type Phase='saved'|'waiting'|'saving'|'error'|'conflict';
type State={base:Chapter;value:Chapter;phase:Phase;error:string;cacheError:string;notice:string;remote:Chapter|null};
type Storage=Pick<globalThis.Storage,'getItem'|'setItem'|'removeItem'>;
type Options={key:string;initial:Chapter;storage:Storage;read:()=>Promise<Chapter>;write:(value:Chapter,base:Chapter,requestId:string)=>Promise<Partial<Chapter>>;onSaved:()=>void;delay?:number};

/** One serialized save queue per chapter. It survives tab switches and keeps drafts durable. */
export class ChapterSync {
  state: State;
  private listeners=new Set<()=>void>();
  private timer:ReturnType<typeof setTimeout>|undefined;
  private saving=false;
  private reading=false;
  private composing=false;
  private touched=0;
  private pendingRemote:Chapter|null=null;
  private pending:{value:Chapter;base:Chapter;requestId:string}|null=null;
  private retries=0;
  options:Options;
  constructor(options:Options){
    this.options=options;
    const restored=restoreDraft(options.storage,options.key,options.initial);
    this.state={...restored,phase:same(restored.base,restored.value)?'saved':'waiting',error:'',cacheError:'',notice:'',remote:null};
  }
  get dirty(){return !same(this.state.base,this.state.value);}
  snapshot=()=>this.state;
  subscribe=(listener:()=>void)=>{this.listeners.add(listener);return()=>{this.listeners.delete(listener);};};
  private publish(patch:Partial<State>){
    this.state={...this.state,...patch};
    try{persistDraft(this.options.storage,this.options.key,{base:this.state.base,value:this.state.value});this.state.cacheError='';}
    catch{this.state.cacheError='本地草稿缓存失败，请保持此页面打开并重试保存。';}
    this.listeners.forEach(fn=>fn());
  }
  private schedule(delay=this.options.delay??1500){
    clearTimeout(this.timer);
    if(!this.composing&&this.state.phase!=='conflict')this.timer=setTimeout(()=>void this.flush(),delay);
  }
  change=(next:Chapter|((old:Chapter)=>Chapter))=>{
    this.touched=Date.now();this.retries=0;
    this.publish({value:typeof next==='function'?next(this.state.value):next,notice:'',phase:this.state.remote?'conflict':this.saving?'saving':'waiting'});
    this.schedule();
  };
  composition=(active:boolean)=>{this.composing=active;if(active)clearTimeout(this.timer);else this.schedule();};
  accept=(value:Chapter)=>{
    if(this.saving)return;
    this.pending=null;this.pendingRemote=null;this.retries=0;
    this.publish({base:value,value,remote:null,phase:'saved',error:'',notice:''});
  };
  rebase=(remote:Chapter)=>{
    if(this.saving||remote.deleted)return;
    this.pending=null;
    const value={...remote,...Object.fromEntries(fields.map(key=>[key,this.state.value[key]]))};
    this.publish({base:remote,value,remote:null,phase:'waiting',error:'',notice:''});this.schedule();
  };
  private reconcile(remote:Chapter){
    if(remote.revision<=this.state.base.revision)return;
    const value=mergeChapter(this.state.base,this.state.value,remote);
    if(!value){this.publish({remote,phase:'conflict',error:'',notice:''});return;}
    const dirty=!same(value,remote);
    this.publish({base:remote,value,remote:null,phase:dirty?'waiting':'saved',error:'',notice:dirty?'已合并双方不同位置的修改':'已同步最新正文'});
    if(dirty)this.schedule();
  }
  refresh=async()=>{
    if(this.reading||this.saving||this.pending)return;
    this.reading=true;
    try{
      const remote=await this.options.read();
      if(this.saving||this.pending)return;
      if(this.composing||Date.now()-this.touched<(this.options.delay??1500)){this.pendingRemote=remote;this.schedule();}
      else this.reconcile(remote);
    }catch{/* The directory reports read failures; retain the complete local draft. */}
    finally{this.reading=false;}
  };
  flush=async()=>{
    clearTimeout(this.timer);
    if(this.saving||this.composing||this.state.remote)return;
    if(this.pendingRemote){const remote=this.pendingRemote;this.pendingRemote=null;this.reconcile(remote);if(this.state.remote)return;}
    if(!this.dirty&&!this.pending){this.publish({phase:'saved'});return;}
    if(this.state.base.deleted||!this.state.value.title.trim())return;
    this.saving=true;
    const request=this.pending??{value:{...this.state.value},base:this.state.base,requestId:crypto.randomUUID()};
    this.pending=request;this.publish({phase:'saving',error:''});
    try{
      const result=await this.options.write(request.value,request.base,request.requestId);
      const base={...request.value,...result} as Chapter;
      // Preserve keystrokes entered while the submitted snapshot was in flight.
      const value={...base,...Object.fromEntries(fields.map(key=>[key,this.state.value[key]]))};
      this.pending=null;this.retries=0;
      this.publish({base,value,phase:same(base,value)?'saved':'waiting',error:'',notice:''});
      this.options.onSaved();
    }catch(error:any){
      if(error?.code==='CONFLICT'||/版本已变化/.test(error?.message||'')){
        this.pending=null;
        try{this.reconcile(await this.options.read());}
        catch{this.publish({phase:'error',error:'无法读取最新正文，草稿已保留。请重试。'});}
      }else{this.publish({phase:'error',error:'自动保存失败，草稿已保留。请重试。'});this.retries++;}
    }finally{
      this.saving=false;
      if(this.state.phase==='waiting')this.schedule();
      else if(this.state.phase==='error'&&this.retries>0&&this.retries<=2)this.schedule(2000*this.retries);
    }
  };
  dispose(){clearTimeout(this.timer);this.listeners.clear();}
}

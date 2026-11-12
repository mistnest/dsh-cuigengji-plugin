import {readdir,open,stat} from 'node:fs/promises';
import {homedir} from 'node:os';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import type {UsageRow} from '../../contracts/usage.ts';
// Read counts only. No message text, tool arguments, tokens or credentials are
// copied to the ledger. The caller persists offsets after idempotent ingestion.
export async function scanCodex(directory?:string,previous:UsageRow={}){
  const home=resolve(process.env.CODEX_HOME||join(homedir(),'.codex'));
  const roots=directory?[resolve(directory)]:[join(home,'sessions'),join(home,'archived_sessions')],sessions:{id:string;events:any[]}[]=[],files:UsageRow={...previous};
  const walk=async(dir:string,depth=0):Promise<string[]>=>{if(depth>6)return [];let rows;try{rows=await readdir(dir,{withFileTypes:true});}catch(e:any){if(e.code==='ENOENT'&&!directory)return [];throw e;}const result:string[]=[];for(const row of rows){if(row.isSymbolicLink())continue;if(row.isDirectory())result.push(...await walk(join(dir,row.name),depth+1));else if(row.isFile()&&row.name.endsWith('.jsonl'))result.push(join(dir,row.name));}return result;};
  for(const path of (await Promise.all(roots.map(root=>walk(root)))).flat()){
    const info=await stat(path),key=createHash('sha256').update(path).digest('hex'),old=previous[key]||{},state:UsageRow=info.size<(old.offset||0)?{}:{...old};
    if(state.offset===info.size)continue;
    const start=state.offset||0,size=Math.min(8*1024*1024,info.size-start),file=await open(path,'r');let buffer=Buffer.alloc(size);try{await file.read(buffer,0,size,start);}finally{await file.close();}
    const end=buffer.lastIndexOf(10);if(end<0)continue;buffer=buffer.subarray(0,end+1);const events:any[]=[];let offset=start;
    for(const raw of buffer.toString('utf8').split('\n').slice(0,-1)){
      const lineOffset=offset;offset+=Buffer.byteLength(raw+'\n');let value:any;try{value=JSON.parse(raw);}catch{continue;}
      if(value.type==='session_meta'){state.id=value.payload?.id||key;}
      if(value.type==='turn_context'&&typeof value.payload?.model==='string')state.model=value.payload.model;
      if(value.type!=='event_msg'||value.payload?.type!=='token_count')continue;
      if(value.payload.rate_limits)state.windows={at:Date.parse(value.timestamp)||Date.now(),items:codexWindows(value.payload.rate_limits)};
      const counts=value.payload.info?.total_token_usage;if(!counts)continue;const last=state.total||{},delta=(name:string)=>Math.max(0,(Number(counts[name])||0)-(Number(last[name])||0));
      const input=delta('input_tokens'),cached=delta('cached_input_tokens'),output=delta('output_tokens'),reasoning=delta('reasoning_output_tokens');state.total=counts;
      if(!input&&!output)continue;
      // Byte offsets are only cursors within one file. A content identity keeps
      // moved archived logs from billing the same cumulative sample twice.
      const sampleId=createHash('sha256').update(JSON.stringify([state.id||key,value.timestamp,counts])).digest('hex');
      events.push({seq:lineOffset,time:Date.parse(value.timestamp)||Date.now(),type:'assistant/message',data:{turn:lineOffset,step:0,usageIdentity:sampleId,message:{source:{provider:'openai',model:state.model||''}},usage:{inputTokens:Math.max(0,input-cached),cacheReadTokens:Math.min(input,cached),cacheWriteTokens:0,outputTokens:output,reasoningTokens:Math.min(output,reasoning),totalTokens:input+output}}});
    }
    state.offset=offset;files[key]=state;sessions.push({id:state.id||key,events});
  }
  return {sessions,files};
}
export function codexWindows(value:any){
  const rows:UsageRow[]=[];
  for(const [key,label] of [['primary','短期窗口'],['secondary','长期窗口']]){
    const raw=value?.[key];if(!raw)continue;const percent=Number(raw.used_percent??raw.usedPercent);if(!Number.isFinite(percent))continue;
    const minutes=Number(raw.window_minutes??raw.windowMinutes),reset=raw.resets_at??raw.reset_at??raw.resetAt;
    rows.push({key,label:minutes===300?'5 小时':minutes===10080?'每周':label,percent:Math.max(0,Math.min(100,percent)),resetAt:typeof reset==='number'?new Date(reset<1e12?reset*1000:reset).toISOString():reset||null});
  }return rows;
}

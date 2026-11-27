#!/usr/bin/env node
import {openReaderConnection} from './reader-connection.ts';
import {basename,dirname,resolve} from 'node:path';
import {watch} from 'node:fs';
import {z} from 'zod';
import {grantWrites} from '../../collaboration/grants/writes.ts';
import {Server} from '@modelcontextprotocol/sdk/server/index.js';
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js';
import {CallToolRequestSchema,ListToolsRequestSchema} from '@modelcontextprotocol/sdk/types.js';
import {type QueryCapability,type ReaderModule,QUERY_CAPABILITIES,queryAllowed,queryInputSchema} from '../../workspace/queries/catalog.ts';
import {errorInfo, fail} from '../../../platform/errors.ts';

const option=process.argv.indexOf('--connection');
const connection=option>=0?process.argv[option+1]:process.env.CUIGENGJI_MCP_CONNECTION;
if(process.argv.includes('--help')){
  process.stderr.write('催更姬外部 MCP\n用法：cuigengji-mcp --connection <连接配置文件>\n也可设置 CUIGENGJI_MCP_CONNECTION。使用 MCP 连接管理提供的连接文件。\n');
  process.exit(0);
}
if(!connection)throw new Error('请提供 --connection <文件> 或 CUIGENGJI_MCP_CONNECTION');
const {request} = openReaderConnection(resolve(connection));
const nameFor=(action: string)=>'cuigengji_'+action.replaceAll('.','_');
const server=new Server({name:'cuigengji-reader',version:'1.0.0'},{capabilities:{tools:{listChanged:true}}});
let defaultReader: Promise<string> | undefined;
const clientName=()=>{const value=server.getClientVersion();return [value?.name,value?.version].filter(Boolean).join(' ')||'MCP client';};
async function readerId(signal: AbortSignal){
  if(!defaultReader)defaultReader=request('/reader/open',{client:clientName(),label:'默认阅读会话'},signal).then(value=>value.readerSessionId).catch(error=>{defaultReader=undefined;throw error;});
  return defaultReader;
}
function queryTool(capability: QueryCapability, modules: readonly ReaderModule[], extra: Record<string, unknown>){
  const input=queryInputSchema(capability, modules);
  return {name:nameFor(capability.id),description:capability.description,inputSchema:{
    ...input,properties:{...input.properties,...extra},
  },annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true,openWorldHint:false}};
}
server.setRequestHandler(ListToolsRequestSchema,async()=>{
  const profile=await request('/capabilities');
  const sessionProperty={type:'string',description:'可选：reader.open 返回的阅读会话 ID；客户端共享 MCP 进程时，不同写作任务各自使用独立会话。省略沿用本连接的默认阅读会话。'};
  return {tools:[
    {name:'cuigengji_reader_open',description:'创建独立的外部会话，返回 readerSessionId；不会绑定或改动 DSH 会话。新任务用它取得新的预设快照。',inputSchema:{type:'object',additionalProperties:false,properties:{label:{type:'string',maxLength:100}}},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:false}},
    {name:'cuigengji_reader_status',description:'查看本阅读会话和已采用的预设版本，不返回凭据。',inputSchema:{type:'object',additionalProperties:false,properties:{readerSessionId:sessionProperty}},annotations:{readOnlyHint:true,destructiveHint:false,idempotentHint:true}},
    ...QUERY_CAPABILITIES.filter(capability=>profile.modules.length && queryAllowed(capability,profile.modules))
      .map(capability=>queryTool(capability,profile.modules,{readerSessionId:sessionProperty})),
    ...grantWrites.filter(command=>profile.writableModules?.includes(command.module)).map(command=>{
      const {$schema,...inputSchema}=z.toJSONSchema(command.input.extend({readerSessionId:z.string().optional()}));
      return {name:nameFor(command.action),description:command.description,inputSchema,annotations:{readOnlyHint:false,idempotentHint:true,openWorldHint:false}};
    }),
  ]};
});
server.setRequestHandler(CallToolRequestSchema,async(requestMessage,extra)=>{
  try{
    const input=requestMessage.params.arguments??{};
    if(!input||typeof input!=='object'||Array.isArray(input))fail('INVALID_INPUT','工具参数须为对象');
    const tool=requestMessage.params.name;
    const {readerSessionId,...args}=input;let value;
    if(requestMessage.params.name==='cuigengji_reader_open'){
      if(Object.keys(args).some(key=>key!=='label')||args.label!==undefined&&(typeof args.label!=='string'||args.label.length>100))fail('INVALID_INPUT','请只提供可选的任务 label');
      value=await request('/reader/open',{client:clientName(),label:args.label},extra.signal);
    }else{
      const id=readerSessionId||await readerId(extra.signal);
      if(requestMessage.params.name==='cuigengji_reader_status'){
        if(Object.keys(args).length)fail('INVALID_INPUT','状态查询只接受 readerSessionId');value=await request('/reader/status',{readerSessionId:id},extra.signal);
      }else{
        const capability=QUERY_CAPABILITIES.find(capability=>nameFor(capability.id)===requestMessage.params.name);
        const command=grantWrites.find(c=>nameFor(c.action)===tool);
        if(!capability&&!command)fail('READ_ONLY','这个连接未开放该工具');
        value=await request(command?'/write':'/query',{readerSessionId:id,action:(command?.action??capability?.id),args},extra.signal);
      }
    }
    return {content:[{type:'text',text:JSON.stringify(value)}]};
  }catch(error){const diagnostic=errorInfo(error);return {isError:true,content:[{type:'text',text:diagnostic.message}],structuredContent:{error:diagnostic}};}
});
await server.connect(new StdioServerTransport());
// Descriptors are atomically replaced. Watch the directory to survive renames.
try{
  const file=resolve(connection);
  let timer:ReturnType<typeof setTimeout>;
  const watcher=watch(dirname(file),{persistent:false},(_,name)=>{
    if(name&&String(name)!==basename(file))return;
    clearTimeout(timer);
    timer=setTimeout(()=>void server.sendToolListChanged().catch(()=>{}),80);
  });
  watcher.on('error',()=>watcher.close());
  server.onclose=()=>{clearTimeout(timer);watcher.close();};
}catch{/* A missing descriptor is also reported when the next request is made. */}

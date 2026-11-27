import {randomBytes,randomUUID,createHash} from 'node:crypto';
import {readFile,writeFile,mkdir,rename,appendFile,unlink} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {AtomicStore} from '../../../platform/files/atomic-store.ts';
import {parseJsonFile} from '../../../platform/files/json-file.ts';
import {QUERY_CAPABILITIES,READER_MODULES,queryAllowed,type ReaderModule} from '../../workspace/queries/catalog.ts';
import type {QueryReader} from '../../workspace/queries/guidance.ts';
import {errorInfo} from '../../../platform/errors.ts';
import type {CollaborationLibraries} from '../workspace-access.ts';
import {grantLevels,parseLevels} from './permissions.ts';
import {grantWrites} from './writes.ts';
import type {WorkspaceDispatcher} from '../../workspace/operations/command.ts';
export type GrantLibraries=CollaborationLibraries & {readonly current:{store:WorkspaceDispatcher}};

// Keep the legacy task marker readable so old credentials stay disabled without changing stored grants.
interface Profile {id:string;name:string;revision:number;enabled:boolean;modules:ReaderModule[];writableModules?:ReaderModule[];novelIds?:string[]|null;libraryRoot:string;tokenHash:string;createdAt:string;task?:true}
export interface AuthorizedReader {
  invoke(operation: 'capabilities' | 'open' | 'status' | 'query' | 'write', body: Record<string, unknown>): Promise<unknown>;
}
export type AuthorizeReader = (token: string) => Promise<AuthorizedReader>;
export interface ReaderTransport {listen(): Promise<string>; close(): Promise<void>}
interface Config {format:'cuigengji-external';version:1;profiles:Record<string,Profile>;creations?:Record<string,{id:string;signature:string}>}
interface Reader extends QueryReader {profileId:string;libraryRoot:string;label:string;client:string;createdAt:string}
export interface ExternalOptions {root:string;connectorPath:string;command?:string;environment?:Record<string,string>}
function fail(code:string,message:string):never{throw Object.assign(new Error(message),{code});}
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
const uuid=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const empty=():Config=>({format:'cuigengji-external',version:1,profiles:{}});
const validModules=(value:unknown):value is ReaderModule[]=>Array.isArray(value)&&value.length<=READER_MODULES.length&&new Set(value).size===value.length&&value.every(id=>READER_MODULES.includes(id));
const validBooks=(value:unknown):value is string[]=>Array.isArray(value)&&value.length>0&&new Set(value).size===value.length&&value.every(id=>typeof id==='string'&&id.length>0&&id.length<=512);
function validate(value:unknown):asserts value is Config{
  const config=value as Config;
  if(config?.format!=='cuigengji-external'||config.version!==1||!config.profiles||typeof config.profiles!=='object'||Array.isArray(config.profiles))fail('EXTERNAL_CONFIG_INVALID','外部连接配置无效');
  if(config.creations!==undefined&&(!config.creations||typeof config.creations!=='object'||Array.isArray(config.creations)||Object.entries(config.creations).some(([key,v])=>!v||!/^[a-f0-9]{64}$/.test(key)||!uuid(v.id)||!/^[a-f0-9]{64}$/.test(v.signature))))fail('EXTERNAL_CONFIG_INVALID','连接创建记录无效');
  for(const p of Object.values(config.profiles))if(p?.writableModules!==undefined&&(!validModules(p.writableModules)||!validModules(p.modules)||p.writableModules.some(m=>!p.modules.includes(m))||p.task))fail('EXTERNAL_CONFIG_INVALID','外部连接写权限无效');
  for(const [id,p] of Object.entries(config.profiles))if(!uuid(id)||p.id!==id||typeof p.name!=='string'||!p.name.trim()||typeof p.enabled!=='boolean'||!Number.isSafeInteger(p.revision)||p.revision<1||!validModules(p.modules)||(p.novelIds!=null&&!validBooks(p.novelIds))||typeof p.libraryRoot!=='string'||!/^[a-f0-9]{64}$/.test(p.tokenHash)||(p.task!==undefined&&p.task!==true))fail('EXTERNAL_CONFIG_INVALID','外部连接条目无效');
}
async function saveJson(path:string,value:unknown){await mkdir(resolve(path,'..'),{recursive:true,mode:0o700});const stage=path+'.'+randomUUID()+'.tmp';try{await writeFile(stage,JSON.stringify(value,null,2),{flag:'wx',mode:0o600});await rename(stage,path);}finally{await unlink(stage).catch(error=>{if(error.code!=='ENOENT')throw error;});}}

/** Author-issued, library-pinned grants. This HTTP endpoint is only
 * a local bridge for the standard stdio MCP adapter, never a host credential. */
export class ExternalAccess {
  readonly libraries:GrantLibraries;
  readonly options:ExternalOptions;
  readonly config:AtomicStore<Config>;
  private readonly transport: ReaderTransport;
  private starting?:Promise<void>;
  private endpoint='';
  private readers=new Map<string,Reader>();
  private queues=new Map<string,Promise<unknown>>();
  private closed=false;
  constructor(libraries: GrantLibraries, options: ExternalOptions, transport: (authorize: AuthorizeReader) => ReaderTransport) {
    this.libraries = libraries;
    this.options = options;
    this.config = new AtomicStore(options.root, empty, validate);
    this.transport = transport(token => this.authorize(token));
  }
  private async configured<T>(work:(config:Config)=>Promise<T>){const release=await this.config.acquire();try{return await work(await this.config.load());}finally{await release();}}
  private connectionFile(id:string){return join(this.options.root,'connections',id+'.json');}
  private readerFile(id:string){return join(this.options.root,'sessions',id+'.json');}
  private async writeConnection(profile:Profile,token?:string){
    const file=this.connectionFile(profile.id);
    let previous:any;
    if(!token){try{previous=parseJsonFile(await readFile(file,'utf8'),file);}catch(error:any){if(error.code==='ENOENT')return;throw error;}}
    await saveJson(file,{format:'cuigengji-mcp-connection',version:1,profileId:profile.id,endpoint:this.endpoint,token:token||previous.token,readOnly:!profile.writableModules?.length});
  }
  async start(){
    if(this.closed)fail('EXTERNAL_CLOSED','外部连接服务已关闭');
    if(this.starting)return this.starting;
    this.starting=(async()=>{
      try{await readFile(this.config.file);}catch(error:any){if(error.code==='ENOENT')return;throw error;}
      const enabled=await this.configured(async config=>Object.values(config.profiles).some(p=>p.enabled&&!p.task));
      if(!enabled)return;
      await this.listen();
      await this.configured(async config=>{for(const profile of Object.values(config.profiles).filter(p=>p.enabled&&!p.task))await this.writeConnection(profile);});
    })();
    try{await this.starting;}finally{this.starting=undefined;}
  }
  private async listen(){ this.endpoint = await this.transport.listen(); }
  private presentation(profile:Profile){
    const file=this.connectionFile(profile.id),environment=this.options.environment||{};
    // Keep the full connection identity within DSH's 32-character namespace limit.
    const suffix=Buffer.from(profile.id.replaceAll('-',''),'hex').toString('base64url');
    const serverName='cg_read_'+suffix;
    const server={
      command:this.options.command||process.execPath,
      args:[this.options.connectorPath,'--connection',file],
      ...(Object.keys(environment).length?{env:environment}:{}),
    };
    return {
      id:profile.id,name:profile.name,revision:profile.revision,enabled:profile.enabled,
      active:profile.enabled&&resolve(profile.libraryRoot)===resolve(this.libraries.current.store.root),
      modules:profile.modules,permissions:grantLevels(profile.modules,profile.writableModules),novelIds:profile.novelIds??null,libraryRoot:profile.libraryRoot,createdAt:profile.createdAt,connectionFile:file,
      serverName,clientConfig:{mcpServers:{[serverName]:server}},
    };
  }
  async status(){return this.configured(async config=>{
    const profiles=Object.values(config.profiles).filter(p=>!p.task);
    return {mode:profiles.some(p=>p.enabled&&p.writableModules?.length)?'read-write':'read-only',libraryRoot:this.libraries.current.store.root,modules:READER_MODULES,profiles:profiles.map(p=>this.presentation(p))};
  });}
  private async checkBooks(novelIds:unknown,libraryRoot:string){
    if(resolve(libraryRoot)!==resolve(this.libraries.current.store.root))fail('LIBRARY_CHANGED','请切回此连接所属的作品库，再调整作品范围');
    if(novelIds===null)return;
    if(!validBooks(novelIds))return fail('INVALID_INPUT','请选择至少一部作品，或明确选择整个作品库');
    const result=await this.libraries.current.queries.query('novel.list',{limit:1},{id:'connection-manager',presets:{}},[],{novelIds});
    if(result.total!==novelIds.length)fail('NOT_FOUND','所选作品已移除或不属于当前作品库，请刷新作品列表');
  }
  async create(args:any,issuer='author'){
    if(typeof args.name!=='string'||!args.name.trim()||args.name.length>100)fail('INVALID_INPUT','请填写连接名称（最多 100 字符）');
    if(args.permissions!==undefined&&args.modules!==undefined)fail('INVALID_INPUT','permissions 和旧版 modules 只能提供一项');
    if(args.permissions!==undefined&&args.novelIds===undefined)fail('INVALID_INPUT','请提供 novelIds；只有选择整个库时才传 null');
    const access=args.permissions!==undefined?parseLevels(args.permissions,grantLevels([])):{modules:args.modules??[...READER_MODULES],writableModules:[]};
    if(!validModules(access.modules))fail('INVALID_INPUT','查询模块无效');
    return this.configured(async config=>{
      const libraryRoot=resolve(this.libraries.current.store.root);
      const request=typeof args.requestId==='string'&&args.requestId.trim()?hash(JSON.stringify([issuer,libraryRoot,args.requestId])):null;
      const signature=hash(JSON.stringify([args.name.trim(),args.novelIds??null,access]));
      const receipt=request&&config.creations?.[request];
      if(receipt){
        if(receipt.signature!==signature)fail('REQUEST_ID_REUSED','相同创建请求号已经用于另一份授权');
        const existing=config.profiles[receipt.id];
        if(!existing)fail('NOT_FOUND','这条连接已删除；请重新发起创建请求');
        return this.presentation(existing);
      }
      if(Object.values(config.profiles).filter(p=>p.enabled&&!p.task).length>=32)fail('EXTERNAL_LIMIT','最多同时启用 32 个外部连接');
      await this.checkBooks(args.novelIds??null,libraryRoot);
      const token=randomBytes(32).toString('hex'),profile:Profile={id:randomUUID(),name:args.name.trim(),revision:1,enabled:true,...access,novelIds:args.novelIds??null,libraryRoot,tokenHash:hash(token),createdAt:new Date().toISOString()};
      await this.listen();await this.writeConnection(profile,token);config.profiles[profile.id]=profile;
      if(request)(config.creations??={})[request]={id:profile.id,signature};
      await this.config.save(config);
      return this.presentation(profile);
    });
  }
  async update(args:any){return this.configured(async config=>{
    const profile=uuid(args.id)&&config.profiles[args.id];if(!profile||profile.task)fail('NOT_FOUND','外部连接不存在');
    if(profile.revision!==args.expectedRevision)fail('CONFLICT','连接配置已更新，请刷新后重试');
    if(args.modules!==undefined&&!validModules(args.modules))fail('INVALID_INPUT','查询模块无效');
    if(args.enabled!==undefined&&typeof args.enabled!=='boolean')fail('INVALID_INPUT','enabled 必须是布尔值');
    if(args.name!==undefined&&(typeof args.name!=='string'||!args.name.trim()||args.name.length>100))fail('INVALID_INPUT','连接名称无效');
    if(args.novelIds!==undefined){await this.checkBooks(args.novelIds,profile.libraryRoot);profile.novelIds=args.novelIds;}
    if(args.permissions!==undefined&&args.modules!==undefined)fail('INVALID_INPUT','permissions 和旧版 modules 只能提供一项');
    if(args.permissions!==undefined)Object.assign(profile,parseLevels(args.permissions,grantLevels(profile.modules,profile.writableModules)));
    if(args.modules!==undefined){profile.modules=[...args.modules];profile.writableModules=profile.writableModules?.filter(m=>profile.modules.includes(m));}
    if(args.enabled!==undefined)profile.enabled=args.enabled;if(args.name!==undefined)profile.name=args.name.trim();profile.revision++;
    if(profile.enabled)await this.listen();
    await this.writeConnection(profile);await this.config.save(config);return this.presentation(profile);
  });}
  async revoke(args:any){return this.configured(async config=>{
    const profile=uuid(args.id)&&config.profiles[args.id];if(!profile||profile.task)fail('NOT_FOUND','外部连接不存在');
    if(profile.revision!==args.expectedRevision)fail('CONFLICT','连接配置已更新，请刷新后重试');
    delete config.profiles[profile.id];await this.config.save(config);await unlink(this.connectionFile(profile.id)).catch(error=>{if(error.code!=='ENOENT')throw error;});return {id:profile.id,revoked:true};
  });}
  async records(args:any={}){
    if(!uuid(args.id))fail('INVALID_INPUT','请选择一个连接');
    await this.configured(async config=>{const profile=config.profiles[args.id];if(!profile||profile.task)fail('NOT_FOUND','连接不存在');});
    const path=join(this.options.root,'audit',args.id+'.jsonl');
    const text=await readFile(path,'utf8').catch(error=>{if(error.code==='ENOENT')return '';throw error;});
    return {items:text.trim().split('\n').filter(Boolean).slice(-Math.min(200,Math.max(1,args.limit||50))).map(line=>JSON.parse(line)).reverse()};
  }
  private async authorize(token: string): Promise<AuthorizedReader> {
    if (!/^[a-f0-9]{64}$/.test(token)) fail('UNAUTHORIZED','需要有效的外部连接');
    const profile = await this.configured(async config => {
      const match = Object.values(config.profiles).find(p => !p.task && p.enabled && p.tokenHash === hash(token));
      if (!match) fail('UNAUTHORIZED','外部连接已撤销或停用');
      return structuredClone(match);
    });
    return {invoke: async (operation, body) => {
      const mode=profile.writableModules?.length?'read-write':'read-only';
      if (operation === 'capabilities') return {mode,name:profile.name,modules:profile.modules,writableModules:profile.writableModules??[],profileId:profile.id};
      if (operation === 'open') return this.open(profile, body);
      if (operation === 'query') return this.query(profile, body);
      if (operation === 'write') return this.write(profile,body);
      if (operation !== 'status') fail('READ_ONLY','此连接未开放该入口');
      const reader = await this.reader(profile, body.readerSessionId);
      return {readerSessionId:reader.id, label:reader.label, client:reader.client, mode, modules:profile.modules,permissions:grantLevels(profile.modules,profile.writableModules),
        presets:Object.fromEntries(Object.entries(reader.presets).filter(([id])=>profile.modules.includes('guidance')&&(!profile.novelIds||profile.novelIds.includes(id))).map(([id,p])=>[id,{revision:p.revision,name:p.name,enabled:p.enabled}]))};
    }};
  }
  private async reader(profile:Profile,id:unknown){
    if(!uuid(id))fail('READER_REQUIRED','请先创建外部阅读会话');
    let reader=this.readers.get(id);
    if(!reader){const path=this.readerFile(id);const saved=await readFile(path,'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});if(!saved)fail('READER_REQUIRED','阅读会话不存在，请重新建立连接');reader=parseJsonFile(saved,path) as Reader;this.readers.set(id,reader);}
    if(reader.id!==id||reader.profileId!==profile.id||reader.libraryRoot!==profile.libraryRoot||!reader.presets||typeof reader.presets!=='object'||Array.isArray(reader.presets))fail('UNAUTHORIZED','阅读会话不属于此连接');
    reader.save=()=>{const {save,...stored}=reader!;return saveJson(this.readerFile(reader!.id),stored);};return reader;
  }
  private async open(profile:Profile,args:any){
    const reader:Reader={id:randomUUID(),profileId:profile.id,libraryRoot:profile.libraryRoot,label:typeof args.label==='string'?args.label.slice(0,100):'独立阅读会话',client:typeof args.client==='string'?args.client.slice(0,160):'MCP client',createdAt:new Date().toISOString(),presets:{}};
    await saveJson(this.readerFile(reader.id),reader);this.readers.set(reader.id,reader);return {readerSessionId:reader.id,mode:profile.writableModules?.length?'read-write':'read-only',modules:profile.modules,libraryRoot:profile.libraryRoot,presetPolicy:'本阅读会话首次读取时固定预设，新任务可 reader.open 创建独立会话'};
  }
  private async withReader<T>(id:string,work:()=>Promise<T>){const previous=this.queues.get(id)||Promise.resolve(),pending=previous.catch(()=>{}).then(work);this.queues.set(id,pending);try{return await pending;}finally{if(this.queues.get(id)===pending)this.queues.delete(id);}}
  private async log(profile:Profile,readerId:string|undefined,action:string,args:any,result:any,error:any,started:number){
    const identifier=(value:unknown)=>typeof value==='string'?value.slice(0,512):undefined;
    const resources = action==='context.readMany' && Array.isArray(result?.items) ? result.items.map((item: {kind:string;id:string;revision?:number;start?:number;end?:number;ok:boolean;error?:{code:string}}) => ({
      kind:item.kind,id:item.id,revision:item.revision,start:item.start,end:item.end,ok:item.ok,code:item.error?.code,
    })) : undefined;
    const metadata={...(resources?{resources}:{}),time:new Date().toISOString(),actor:'external-agent',profileId:profile.id,...(readerId?{readerSessionId:readerId}:{}),action:action.slice(0,120),novelId:identifier(args.novelId),resourceId:identifier(args.chapterId)||identifier(args.nodeId)||identifier(args.edgeId),revision:result?.revision??result?.node?.revision??result?.sequence,start:result?.start,end:result?.end,returnedChars:typeof result?.content==='string'?result.content.length:undefined,items:Array.isArray(result?.items)?result.items.length:undefined,ok:!error,...(error?{code:errorInfo(error).code}:{}),durationMs:Date.now()-started};
    const dir=join(this.options.root,'audit');await mkdir(dir,{recursive:true,mode:0o700});await appendFile(join(dir,profile.id+'.jsonl'),JSON.stringify(metadata)+'\n',{mode:0o600});
  }
  private async query(profile:Profile,body:any){
    const action=typeof body.action==='string'?body.action:'',args=body.args&&typeof body.args==='object'&&!Array.isArray(body.args)?body.args:{};
    const started=Date.now();let result:any,error:any,reader:Reader|undefined;
    try{
      const capability=QUERY_CAPABILITIES.find(value=>value.id===action);
      if(!capability)fail('READ_ONLY','当前查询入口仅接受已开放的查阅工具');
      if(!profile.modules.length||!queryAllowed(capability,profile.modules))fail('CAPABILITY_DENIED','此连接未开放该查询模块');
      if(!uuid(body.readerSessionId))fail('READER_REQUIRED','请先创建外部阅读会话');
      result=await this.withReader(body.readerSessionId,()=>this.libraries.use(async()=>{
        reader=await this.reader(profile,body.readerSessionId);
        if(resolve(this.libraries.current.store.root)!==resolve(profile.libraryRoot))fail('LIBRARY_CHANGED','DSH 已切换作品库；此连接仍只授权原作品库，请切回或为新作品库创建连接');
        const status=await this.libraries.current.maintenance.status();if(status.status!=='ready')fail('READ_ONLY_NOT_READY','请先在 DSH 中完成作品库检查');
        return this.libraries.current.queries.query(action,args,reader!,profile.modules,{novelIds:profile.novelIds,writableModules:profile.writableModules});
      }));
      await this.configured(async config=>{const current=config.profiles[profile.id];if(!current?.enabled||current.tokenHash!==profile.tokenHash||current.revision!==profile.revision)fail('CAPABILITY_CHANGED','查询期间连接权限已变化，请重新查询');});
      return result;
    }catch(failure){error=failure;throw failure;}finally{await this.log(profile,reader?.id,action,args,result,error,started);}
  }
  private async write(profile:Profile,body:Record<string,unknown>){
    const action=typeof body.action==='string'?body.action:'',started=Date.now();
    let result:unknown,error:unknown,readerId:string|undefined;
    try{
      result=await this.libraries.use(()=>this.configured(async config=>{
        // Serialize the permission decision and the actual commit with edits/revocation.
        const live=config.profiles[profile.id];
        if(!live?.enabled||live.tokenHash!==profile.tokenHash)fail('UNAUTHORIZED','连接已停用或撤销');
        const command=grantWrites.find(c=>c.action===action);
        if(!command||!live.writableModules?.includes(command.module))return fail('READ_ONLY','此连接未开放这项写入');
        if(resolve(live.libraryRoot)!==resolve(this.libraries.current.store.root))fail('LIBRARY_CHANGED','请切回此连接所属作品库');
        const parsed=command.input.safeParse(body.args);
        if(!parsed.success)return fail('INVALID_INPUT',parsed.error.issues.map(i=>i.path.join('.')+' '+i.message).join('；'));
        const args=parsed.data;
        if(live.novelIds&&!live.novelIds.includes(args.novelId))fail('CAPABILITY_DENIED','这部作品未授权给此连接');
        readerId=(await this.reader(live,body.readerSessionId)).id;
        await this.libraries.current.maintenance.ensureReady();
        return this.libraries.current.store.dispatch(action,{...args,requestId:hash(JSON.stringify([live.id,args.novelId,args.requestId]))},{kind:'agent',sessionId:'external:'+live.id});
      }));
      return result;
    }catch(cause){error=cause;throw cause;}finally{await this.log(profile,readerId,action,body.args??{},result,error,started);}
  }
  async close() {
    this.closed = true;
    await this.transport.close();
    this.readers.clear();
  }
}

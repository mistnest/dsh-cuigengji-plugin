import type {} from '@deepseek-ai/dsh-skill';
import {manageConnections} from './modules/access/dsh/connections.ts';
import type {Context} from '@deepseek-ai/cordis';
import type {Row} from './modules/workspace/operations/record-reader.ts';
import { homedir } from 'node:os';
import { join, relative } from 'node:path';
import z from '@deepseek-ai/schemastery';
import { MemoryBridge } from './modules/access/mcp/client.ts';
import { registerSkills } from './modules/access/guidance/skills.ts';
import { registerTools } from './modules/access/dsh/tools.ts';
import { registerPrompt } from './modules/access/guidance/prompt.ts';
import { readGuidance } from './modules/access/guidance/read.ts';
import { createSessionPolicy } from './modules/access/dsh/session-policy.ts';
import { registerRpcRoute } from './modules/access/rpc/route.ts';
import {LibraryService} from './composition/library-runtime.ts';
import {registerConversationActivity} from './modules/access/dsh/conversation-activity.ts';
import {DesktopPet} from './modules/author-ui/desktop/desktop.ts';
import {UsageService} from './modules/usage/reports/service.ts';
import {registerUsage} from './modules/access/dsh/usage.ts';
import {createExternalAccess} from './composition/external-reader.ts';
import {fileURLToPath} from 'node:url';

export const name = 'cuigengji';
export const inject = ['tools', 'systemPrompt', 'skills', 'connection'];
export const Config = z.object({
  dataRoot: z.string().default('').volatile(),
  recentLibraries: z.array(z.string()).default([]).volatile(),
  usageRoot: z.string().default('').volatile(),
  externalRoot: z.string().default('').volatile(),
});
function defaultDataRoot() {
  if (process.platform === 'win32') return join(process.env.LOCALAPPDATA || homedir(), 'cuigengji');
  return join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'cuigengji');
}

interface PluginConfig {dataRoot?: string; recentLibraries?: string[]; usageRoot?: string; externalRoot?: string}
type Observable<T> = T | {get(): T};
type RuntimeConfig = {[K in keyof PluginConfig]: Observable<PluginConfig[K]>};
interface ConfigEntry {options: {name?: string}; moduleNamespace?: {apply?: unknown}}
interface ConfigEditor {
  entries(): ConfigEntry[];
  edit(entry: ConfigEntry, update: (current: PluginConfig) => PluginConfig): Promise<void>;
}
function configured<T>(value: Observable<T> | undefined) {
  if (value && typeof value === 'object' && 'get' in value) return (value as {get(): T}).get();
  return value as T | undefined;
}

export async function apply(ctx: Context, config: RuntimeConfig = {}) {
  const recentLibraries=configured(config.recentLibraries)||[];
  const root = configured(config.dataRoot) || process.env.CUIGENGJI_DATA_ROOT || recentLibraries[0] || defaultDataRoot();
  // Cordis injection is a flat service list. Optional capabilities are read
  // through get(), which permits an absent service without blocking startup.
  const configEditor=ctx.get?.('configEditor') as ConfigEditor | undefined;
  const editConfig=async (change: (current: PluginConfig) => PluginConfig)=>{
    if (!configEditor) throw new Error("宿主配置服务不可用");
    const matches=configEditor.entries().filter(entry=>entry.options.name==='dsh-cuigengji-plugin'||entry.moduleNamespace?.apply===apply);
    if(matches.length!==1)throw new Error('无法唯一定位催更姬插件配置，未切换作品库');
    await configEditor.edit(matches[0],change);
  };
  const libraries=new LibraryService(root,{recent:recentLibraries,persist:configEditor?async(dataRoot,recentLibraries)=>{
    await editConfig(current=>({...current,dataRoot,recentLibraries}));
  }:undefined});
  const store=libraries.proxy('store'),maintenance=libraries.proxy('maintenance');
  const audit = (sessionId: string | undefined, value: Row) => store.appendSessionAudit(sessionId, value);
  const sessionPolicy = createSessionPolicy({ store, audit, ready: () => maintenance.ensureReady() });
  const externalRoot=configured(config.externalRoot)||process.env.CUIGENGJI_EXTERNAL_ROOT||join(process.env.DSH_HOME||join(homedir(),'.dsh'),'cuigengji','external');
  const dispatch=(action: string,args: Row,actor: Row)=>libraries.use(async()=>{
    if(action.startsWith('external.')){
      if(action==='external.create')await maintenance.ensureReady();
      return manageConnections(external,action,args,actor.sessionId);
    }
    return sessionPolicy.dispatch(action,args,actor);
  });
  const guidanceDispatch = (action: string, args: Row, actor: Row) => libraries.use(async()=>{
    return action === 'guidance.read'
      ? readGuidance({ store, actor, resolveBinding: sessionPolicy.resolveBinding, section: args?.section, novelId: args?.novelId })
      : sessionPolicy.dispatch(action, args, actor);
  });
  const memory = new MemoryBridge(store,{dispatch: guidanceDispatch,resolveNovel:(...args: Parameters<typeof sessionPolicy.resolveNovel>)=>libraries.use(()=>sessionPolicy.resolveNovel(...args)),resolveBinding:(...args: Parameters<typeof sessionPolicy.resolveBinding>)=>libraries.use(()=>sessionPolicy.resolveBinding(...args))});
  // The client bundle can mount during native installation, while backup and
  // migration are still running. Publish the route before the first await;
  // ordinary actions already wait for ensureReady() inside the RPC/policy.
  const workData=libraries.proxy('workData');
  const usageRoot=configured(config.usageRoot)||process.env.CUIGENGJI_USAGE_ROOT||join(process.env.DSH_HOME||join(homedir(),'.dsh'),'cuigengji','usage');
  const usage=new UsageService(usageRoot,ctx);
  const external=createExternalAccess(libraries,{root:externalRoot,connectorPath:fileURLToPath(new URL('./modules/access/mcp/external-server.ts',import.meta.url)),environment:process.versions["electron"]||process.env.ELECTRON_RUN_AS_NODE==='1'?{ELECTRON_RUN_AS_NODE:'1'}:{}});
  ctx.effect(()=>()=>external.close());
  let pet=new DesktopPet(store.root,dispatch,{usage});
  const desktopPet={sync:(args: Row)=>pet.sync(args)};
  libraries.configure({busy:sessionPolicy.isWriting,changed:async()=>{
    await Promise.all([...memory.sessions.keys()].map(id=>memory.disconnect(id)));
    await pet.close();pet=new DesktopPet(store.root,dispatch,{usage});
    sessionPolicy.clearFocusCache();
  }});
  ctx.effect(()=>()=>pet.close());
  registerRpcRoute(ctx,{dispatch,get dataRoot(){return store.root;},workData,transfer:libraries.proxy('transfer'),maintenance,desktopPet,libraries,usage,external});
  registerUsage(ctx,usage);
  const opened=await maintenance.start();
  await memory.start();
  await external.start().catch(error=>ctx.logger?.warn?.('cuigengji external reader: '+error.message));
  ctx.effect(() => () => memory.close());
  ctx.provide('cuigengji',{store,dispatch,memory,maintenance,libraries,external});
  registerConversationActivity(ctx,libraries);
  registerSkills(ctx);
  registerPrompt(ctx, {
    store,
    resolveBinding: sessionPolicy.resolveBinding,
    readPromptState: sessionPolicy.readPromptState,
    use:<T>(fn: () => Promise<T>)=>libraries.use(fn),
  });

  registerTools(ctx, {libraries, dispatch, guidanceDispatch, maintenance});
  sessionPolicy.register(ctx, memory);
  // A real ConfigEditor waits for the host loader to settle. Waiting for that
  // edit inside apply would block the loader that is activating this plugin.
  if (opened.status === 'ready' && configEditor && !recentLibraries.some(path => relative(path, opened.dataRoot) === '')) {
    void editConfig(current => {
      if (libraries.current.store.root !== opened.dataRoot) return current;
      const recent = [...new Set([opened.dataRoot, ...(current.recentLibraries || [])])].slice(0, 8);
      return {...current, recentLibraries: recent};
    }).catch(error => ctx.logger?.warn?.('无法记录最近的作品库目录：' + (error instanceof Error ? error.message : String(error))));
  }
}

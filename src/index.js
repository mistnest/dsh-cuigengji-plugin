import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { MemoryBridge } from './adapters/mcp/client.js';
import { registerSkills } from './adapters/dsh/skills.js';
import { planningArgsSchema } from './adapters/dsh/planning-schema.js';
import { memoryDshArgsSchema } from './adapters/dsh/memory-schema.js';
import {presetArgsSchema} from './adapters/dsh/preset-schema.js';
import {variablesArgsSchema} from './adapters/dsh/variables-schema.js';
import { storyArgsSchema } from './adapters/dsh/story-schema.js';
import { registerPrompt } from './adapters/dsh/prompt.js';
import { readGuidance, GUIDANCE_SECTIONS } from './adapters/dsh/guidance.js';
import { createSessionPolicy } from './application/bindings/session.js';
import { TOOL_ACTIONS as allowed, isReadAction } from './contracts/actions.js';
import { registerRpcRoute } from './adapters/dsh/rpc.js';
import {LibraryService} from './application/libraries/service.ts';
import {registerConversationActivity} from './adapters/dsh/conversation-activity.ts';
import {DesktopPet} from './application/pet/desktop.ts';
import {UsageService} from './application/usage/service.ts';
import {registerUsage} from './adapters/dsh/usage.ts';

export const name = 'cuigengji';
export const inject = ['tools', 'systemPrompt', 'skills', 'connection'];
export const Config = z.object({
  dataRoot: z.string().default('').volatile(),
  recentLibraries: z.array(z.string()).default([]).volatile(),
  usageRoot: z.string().default('').volatile(),
});
const descriptions = {
  cuigengji_project: '管理作品库和卷、章、正文。所有会话包括 DSH 原生子 Agent 使用同一套作品选择规则：novel.list 查看作品，novel.focus {novelId} 记住本会话当前作品，或在单次操作显式提供 novelId；互不切换其他会话的焦点。novel.create {title,description?,requestId} 创建空白作品，不改变焦点。novel.handoff 返回作品索引和有限目录，不含正文。chapter.get 按 start/maxChars 读取。修改需 expectedRevision，chapter.update 的 content/append/patch:{oldText,newText} 三选一。删除 confirm:true；非空卷还需 chapterPolicy:detach/delete。',
  cuigengji_memory: '查找、补充、纠正和删除当前作品的设定。先 graph.list {query?,type?,groupId?} 定位原卡，再 graph.get {nodeId} 读当前 content/revision。已有对象用 graph.update {nodeId,expectedRevision,patch:{oldText,newText},summary?,requestId} 局部替换，newText:"" 删除卡内描述；整卡重写用 content，与 patch 二选一。作者授权的编辑可删冗余、替换旧设定和重组段落，受影响的摘要一起改，只有独立新对象才 graph.create。更新返回 changed/changedFields；false 为未变化，不增版本；保存后核验结果再报告。删整卡用 graph.delete {nodeId,expectedRevision,confirm:true,requestId}，批量用 graph.remove 的 members；软删除及相连边有历史可追溯，retired 仍可检索，不代替删除。删除一条关系用 edge.delete；创建或修改关系时可用 kind 标注类型（family/alliance/hostile/location/membership/other，空为未分类），关系名称仍是自由文本。文件夹 graph.groups 返回完整 path；graph.group.create/update/delete 管理嵌套目录，删夹时内容上移。graph.move {groupId,members:[{id,expectedRevision}]} 调整归属，graph.arrange 整理指定卡片。旧库可 graph.workspace.ensure 无损归夹。人物 character_card，规则/地点/组织 world_entry；核对 status/factType/sources/knownBy，规划用 memoryRefs 引用原卡。普通读取只用当前设定；作者要求追溯时才 graph.history，历史全文须 revision/includeContent:true，graph.restore 生成新当前版本。每次修改用最新 expectedRevision 和 requestId，冲突重读实际差异。界面浏览不自动填入聊天。',
  cuigengji_plan: '与作者在共享工作台讨论剧情。节点是事件、选择或阶段，不是章节。用 planning.pages/list/search 定位，planning.get {nodeId,resourceOffset?} 返回全文、前后邻居、子情节及有限关联资源摘要（resources:items/total/nextOffset），图谱全文按需 graph.get。具体推演时核对相关当前人物、地点和规则；没关联可按名字检索后补 memoryRefs，不强制每轮重查或拦截保存。node.parentId 表示阶段包含的子情节，原阶段摘要就是收纳概括，不另建重复详情页；因果和选择用 edge，包含不能代替连线。独立用途可开 page，同一讨论更新原页。groupId 自由归类到嵌套文件夹，便签记录台词和未决问题；新收纳用真实节点层级或文件夹，不另维护 frame.members。修改用 planning.apply {requestId,operations:[{op,id?,expectedRevision?,ref?,value}],reason} 原子提交；读取所得 ID/revision，不编造引用。新增可 planning.layout 自动安放，mode:missing 保留已有布局，作者要求整理才 all。written 只代表已完整落实且有 chapterRefs 正文版本证据，未采用方案可长期 idea；规划不自动改人物事实。',
  cuigengji_context: 'binding.get 查看本会话当前作品。正常写作使用自动注入的有效预设，按需用 preset.read 读取本会话沿用的预设。作者要求导入/修改预设时：preset.get {identifier?} 读最新保存的可编辑结构和 revision（含停用条目，无导入原件）；preset.preview {input,fileName?,orderId?} 只预览；preset.import {input,policy:append/replace,expectedRevision,requestId,fileName?,orderId?,enabled?} 导入目标作品预设，追加保留原开关，首次导入或替换默认停用；preset.update {expectedRevision,requestId,name?,enabled?,operations?} 修改，operations 用 op:create/update/delete/move、identifier 定位条目，update 的 content/patch:{oldText,newText} 二选一，move 的 before 为目标标识或 null（末尾）。保留其他条目和元数据，冲突重读。临时写法不自动保存为预设。context.get 按需读取正文参考。',
  cuigengji_story: '读取和维护原生小说创作工作台。story.get 返回简报、卷、剧情单元、故事线、章节蓝图、已发生事实追踪、伏笔/下章承诺/长期期待/约束、证据审稿、章节节奏、文风对照与对标书副本，以及版本诊断；story.context.get 按章节和字符预算返回分离的 plans/facts，不读后续正文。story.apply 使用已读 story.revision、requestId、operations 原子更新；追踪和审稿绑定当前正文版本；unit.upsert/storyline.upsert 维护卷内剧情单元与故事线，章节不因单元归属改变；reference.upsert/reference.remove 维护项目内对标书副本。story.reference.import 读取本机拆文库文件夹并保存为本书对标副本，原文件只读。story.detect / story.detect.get 对已保存正文做只读的 AI 味句式检测，返回带行号的候选与分类计数，不评分、不改正文。方法与完整操作字段通过 cuigengji_guidance 的 story 或 story-operations 按需读取。此工具维护创作资料，不改正文或会话焦点。',
  cuigengji_variables: '可选的作品剧情变量。先 variables.config/list；未启用不强制使用。variables.read {chapterId?,chapterRevision?,position:start/end,path?,scope:story/session} 按剧情位置读取，缺省是最新有效状态；写早期情节必须明确 chapterId，不能偷用后文状态。list 只摘要，历史用 history，渲染酒馆取值宏用 render {text,chapterId?}，均不修改。parse {text} 将 JSON Patch/MVU 常见命令转换为 operations，需再 preview 核对。patch {baseRevision,requestId,anchor:{kind:initial}或{kind:chapter,chapterId,chapterRevision,position:start/end,label?},scope?,operations,reason} 提交；同一请求重试复用 requestId，互不相交路径可自动合并，同路径冲突重读请作者决策。restore 生成新快照；修改旧章后 stale 待核对，不删除旧状态。工具不会执行任意 JS/EJS，也不会把浏览内容自动塞入会话。',
};
function defaultDataRoot() {
  if (process.platform === 'win32') return join(process.env.LOCALAPPDATA || homedir(), 'cuigengji');
  return join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'cuigengji');
}

export async function apply(ctx, config = {}) {
  const configured=value=>value?.get?value.get():value;
  const root = configured(config.dataRoot) || process.env.CUIGENGJI_DATA_ROOT || defaultDataRoot();
  // Cordis injection is a flat service list. Optional capabilities are read
  // through get(), which permits an absent service without blocking startup.
  const configEditor=ctx.get?.('configEditor');
  const libraries=new LibraryService(root,{recent:configured(config.recentLibraries)||[],persist:configEditor?async(dataRoot,recentLibraries)=>{
    const matches=configEditor.entries().filter(entry=>entry.options.name==='dsh-cuigengji-plugin'||entry.moduleNamespace?.apply===apply);
    if(matches.length!==1)throw new Error('无法唯一定位催更姬插件配置，未切换作品库');
    await configEditor.edit(matches[0],current=>({...current,dataRoot,recentLibraries}));
  }:undefined});
  const store=libraries.proxy('store'),maintenance=libraries.proxy('maintenance');
  const audit = async (sessionId, value) => {
    const file = createHash('sha256').update(sessionId || 'human').digest('hex') + '.jsonl';
    const release = await store.acquire();
    try {await store.transaction.recover(); await mkdir(join(store.root,'audit'), {recursive:true,mode:0o700}); await appendFile(join(store.root,'audit',file), JSON.stringify({time:new Date().toISOString(),...value})+'\n', {mode:0o600});}
    finally {await release();}
  };
  const sessionPolicy = createSessionPolicy({ store, audit, ready: () => maintenance.ensureReady() });
  const dispatch=(...args)=>libraries.use(()=>sessionPolicy.dispatch(...args));
  const guidanceDispatch = (action, args, actor) => libraries.use(()=>action === 'guidance.read'
    ? readGuidance({ store, actor, resolveBinding: sessionPolicy.resolveBinding, section: args?.section, novelId: args?.novelId })
    : sessionPolicy.dispatch(action, args, actor));
  const memory = new MemoryBridge(store,{dispatch: guidanceDispatch,resolveNovel:(...args)=>libraries.use(()=>sessionPolicy.resolveNovel(...args)),resolveBinding:(...args)=>libraries.use(()=>sessionPolicy.resolveBinding(...args))});
  // The client bundle can mount during native installation, while backup and
  // migration are still running. Publish the route before the first await;
  // ordinary actions already wait for ensureReady() inside the RPC/policy.
  const workData=libraries.proxy('workData');
  const usageRoot=configured(config.usageRoot)||process.env.CUIGENGJI_USAGE_ROOT||join(process.env.DSH_HOME||join(homedir(),'.dsh'),'cuigengji','usage');
  const usage=new UsageService(usageRoot,ctx);
  let pet=new DesktopPet(store.root,dispatch,{usage});
  const desktopPet={sync:args=>pet.sync(args)};
  libraries.configure({busy:sessionPolicy.isWriting,changed:async()=>{
    await Promise.all([...memory.sessions.keys()].map(id=>memory.disconnect(id)));
    await pet.close();pet=new DesktopPet(store.root,dispatch,{usage});
    sessionPolicy.clearFocusCache();
  }});
  ctx.effect(()=>()=>pet.close());
  registerRpcRoute(ctx,{dispatch,get dataRoot(){return store.root;},workData,transfer:libraries.proxy('transfer'),maintenance,desktopPet,libraries,usage});
  registerUsage(ctx,usage);
  await maintenance.start();
  await memory.start();
  ctx.effect(() => () => memory.close());
  ctx.provide('cuigengji',{store,dispatch,memory,maintenance,libraries});
  registerConversationActivity(ctx,libraries);
  registerSkills(ctx);
  registerPrompt(ctx, { store, resolveBinding: sessionPolicy.resolveBinding, use:fn=>libraries.use(fn) });

  for (const [toolName, actions] of Object.entries(allowed)) {
    ctx.tools.register(defineTool({
      name:toolName, description:descriptions[toolName],
      parameters:{action:{type:'string',enum:actions,required:true},args:toolName==='cuigengji_story'?storyArgsSchema:toolName==='cuigengji_variables'?variablesArgsSchema:toolName==='cuigengji_plan'?planningArgsSchema:toolName==='cuigengji_memory'?memoryDshArgsSchema:toolName==='cuigengji_context'?presetArgsSchema:{type:'object',additionalProperties:true,description:'操作参数：实体ID、文本、版本等。默认使用本会话当前作品；也可显式提供 novelId，不改变当前作品。主会话与子 Agent 规则相同。'}},
      output:{schema:{type:'string'},render:(_args,value)=>[{type:'text',text:value}]},
      execute:async ({action,args},exec)=>libraries.use(async()=>{
        if (!exec.agent?.id) throw new Error('小说工具需要 DSH 会话');
        exec.signal?.throwIfAborted();
        const actor={kind:'agent',sessionId:String(exec.agent.id)};
        const input={...(args || {})};
        delete input.sessionId; delete input.actor;
        if (!isReadAction(action)) input.requestId ??= String(exec.callId);
        const result=toolName==='cuigengji_memory'
          ? await memory.call(actor.sessionId,action,input,{signal:exec.signal})
          : await dispatch(action,input,actor);
        return JSON.stringify(result);
      }),
    }));
  }
  ctx.tools.register(defineTool({
    name: 'cuigengji_guidance',
    description: '按需读取催更姬写作指引，使用 {section,args?}，与内容工具的 {action,args} 不同。关闭持续指引后仍可用：core 是基础规则，project/write/plan/memory/revise 是对应规范，story 是创作路由，story-long/story-short/story-outline/story-tracking/story-review/story-deslop 分别为长篇、短篇、章蓝图、追踪、审稿、精修，story-operations 是原生操作字段，variables 是可选剧情变量规范，preset 是当前作品预设，all 返回全部规则与预设。未选作品仍返回基础规则，并注明预设不可用；参考文件相对返回的 resourceBase 读取。',
    parameters: {
      section: { type: 'string', enum: GUIDANCE_SECTIONS, required: true },
      args: { type: 'object', additionalProperties: true, description: '可选 novelId；不传则使用本会话当前作品。' },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    execute: async ({ section, args }, exec) => libraries.use(async()=>{
      exec.signal?.throwIfAborted();
      if (!exec.agent?.id) throw new Error('写作指引需要 DSH 会话');
      const result = await memory.call(String(exec.agent.id), 'guidance.read', { ...(args || {}), section }, { signal: exec.signal });
      return JSON.stringify(result);
    }),
  }));
  ctx.tools.register(defineTool({
    name: 'cuigengji_maintenance',
    description: '查询催更姬插件升级、数据迁移和完整性校验结果。这个工具不要求绑定小说；更新后先调用 status，再用 verify 核对实际加载版本、数据目录和记录数量。迁移由插件启动阶段自动完成，Agent 不应直接改小说文件。',
    parameters: {
      action: { type: 'string', enum: ['status', 'verify'], required: true },
      args: { type: 'object', additionalProperties: true, description: 'verify 可选 expectedVersion、expectedDataRoot、expectedNovelIds（原作品ID数组）。' },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    execute: async ({ action, args }, exec) => libraries.use(async()=>{
      exec.signal?.throwIfAborted();
      if (!['status','verify'].includes(action)) throw new Error('无效的维护操作');
      const result = action === 'status' ? await maintenance.status() : await maintenance.verify(args || {});
      return JSON.stringify(result);
    }),
  }));
  sessionPolicy.register(ctx, memory);
}

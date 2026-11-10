import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { MemoryBridge } from './adapters/mcp/client.js';
import { registerSkills } from './adapters/dsh/skills.js';
import { planningArgsSchema } from './adapters/dsh/planning-schema.js';
import { memoryArgsSchema } from './adapters/dsh/memory-schema.js';
import { storyArgsSchema } from './adapters/dsh/story-schema.js';
import { registerPrompt } from './adapters/dsh/prompt.js';
import { readGuidance, GUIDANCE_SECTIONS } from './adapters/dsh/guidance.js';
import { createSessionPolicy } from './application/bindings/session.js';
import { TOOL_ACTIONS as allowed, isReadAction } from './contracts/actions.js';
import { registerRpcRoute } from './adapters/dsh/rpc.js';
import {LibraryService} from './application/libraries/service.ts';
import {registerConversationActivity} from './adapters/dsh/conversation-activity.ts';
import {DesktopPet} from './application/pet/desktop.ts';

export const name = 'cuigengji';
export const inject = ['tools', 'systemPrompt', 'skills', 'connection'];
export const Config = z.object({
  dataRoot: z.string().default('').volatile(),
  recentLibraries: z.array(z.string()).default([]).volatile(),
});
const descriptions = {
  cuigengji_story: '读取和维护原生小说创作工作台。story.get 返回简报、卷、剧情单元、故事线、章节蓝图、已发生事实追踪、伏笔/下章承诺/长期期待/约束、证据审稿、章节节奏、文风对照与对标书副本，以及版本诊断；story.context.get 按章节和字符预算返回分离的 plans/facts，不读后续正文。story.apply 使用已读 story.revision、requestId、operations 原子更新；追踪和审稿绑定当前正文版本；unit.upsert/storyline.upsert 维护卷内剧情单元与故事线，章节不因单元归属改变；reference.upsert/reference.remove 维护项目内对标书副本。story.reference.import 读取本机拆文库文件夹并保存为本书对标副本，原文件只读。story.detect / story.detect.get 对已保存正文做只读的 AI 味句式检测，返回带行号的候选与分类计数，不评分、不改正文。方法与完整操作字段通过 cuigengji_guidance 的 story 或 story-operations 按需读取。此工具维护创作资料，不改正文或会话焦点。',
  cuigengji_project: '管理作品库和卷、章、正文。所有会话包括 DSH 原生子 Agent 使用同一套作品选择规则：novel.list 查看作品，novel.focus {novelId} 记住本会话当前作品，或在单次操作显式提供 novelId；互不切换其他会话的焦点。novel.create {title,description?,requestId} 创建空白作品，不改变焦点。novel.handoff 返回作品索引和有限目录，不含正文。chapter.get 按 start/maxChars 读取。修改需 expectedRevision，chapter.update 的 content/append/patch:{oldText,newText} 三选一。删除 confirm:true；非空卷还需 chapterPolicy:detach/delete。',
  cuigengji_memory: '检索和维护当前作品的资源库。graph.groups 返回嵌套文件夹和路径，graph.list {query?,type?,groupId?} 搜索当前摘要，graph.get {nodeId} 按需读全文。文件夹就是界面画布范围，人物只有一份原卡，规划用 memoryRefs 引用；根目录可直接放卡片。graph.group.create/update/delete 管理嵌套文件夹，parentId 为父文件夹，删除时内容上移保留。graph.move {groupId,members:[{id,expectedRevision}]} 改归类不改正文、关系或坐标；graph.arrange 可整理指定 members。旧库首次整理可 graph.workspace.ensure 将旧设定页无损收进文件夹，旧 page API 保留兼容。edge.list {nodeId} 查真实关系，edge.create {from,to,name?,content?} 只记录有依据的关系。人物 character_card，规则/地点/组织 world_entry；检查 status/factType/sources/knownBy，规划意图不能写成已发生事实。每次修改用 requestId 和 expectedRevision，冲突重读合并。普通检索只读当前版本，作者要求追溯时才 graph.history，指定 revision 和 includeContent:true 才读某版全文；graph.restore 生成新当前版本。图谱浏览不会自动填入聊天。',
  cuigengji_plan: '与作者在共享工作台讨论剧情。节点是事件、选择或阶段，不是章节。用 planning.pages/list/search 定位，planning.get {nodeId,resourceOffset?} 返回全文、前后邻居、子情节及有限关联资源摘要（resources:items/total/nextOffset），图谱全文按需 graph.get。具体推演时核对相关当前人物、地点和规则；没关联可按名字检索后补 memoryRefs，不强制每轮重查或拦截保存。node.parentId 表示阶段包含的子情节，原阶段摘要就是收纳概括，不另建重复详情页；因果和选择用 edge，包含不能代替连线。独立用途可开 page，同一讨论更新原页。groupId 自由归类到嵌套文件夹，便签记录台词和未决问题；新收纳用真实节点层级或文件夹，不另维护 frame.members。修改用 planning.apply {requestId,operations:[{op,id?,expectedRevision?,ref?,value}],reason} 原子提交；读取所得 ID/revision，不编造引用。新增可 planning.layout 自动安放，mode:missing 保留已有布局，作者要求整理才 all。written 只代表已完整落实且有 chapterRefs 正文版本证据，未采用方案可长期 idea；规划不自动改人物事实。',
  cuigengji_context: 'binding.get 查看本会话记住的当前作品；未选择时返回 null，不限制普通聊天。开启当前会话写作指引时，当前作品启用的预设随系统提示词提供；关闭时或显式查其他作品时，用 preset.read {novelId?} 核对目标作品的有效文本及 revision，不返回原始导入文件。context.get 按需读取目标作品的正文参考；人物、规划和世界设定先检索摘要，再读取相关全文。',
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
  let pet=new DesktopPet(store.root,dispatch);
  const desktopPet={sync:args=>pet.sync(args)};
  libraries.configure({busy:sessionPolicy.isWriting,changed:async()=>{
    await Promise.all([...memory.sessions.keys()].map(id=>memory.disconnect(id)));
    await pet.close();pet=new DesktopPet(store.root,dispatch);
    sessionPolicy.clearFocusCache();
  }});
  ctx.effect(()=>()=>pet.close());
  registerRpcRoute(ctx,{dispatch,get dataRoot(){return store.root;},workData,transfer:libraries.proxy('transfer'),maintenance,desktopPet,libraries});
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
      parameters:{action:{type:'string',enum:actions,required:true},args:toolName==='cuigengji_story'?storyArgsSchema:toolName==='cuigengji_plan'?planningArgsSchema:toolName==='cuigengji_memory'?memoryArgsSchema:{type:'object',additionalProperties:true,description:'操作参数：实体ID、文本、版本等。默认使用本会话当前作品；也可显式提供 novelId，不改变当前作品。主会话与子 Agent 规则相同。'}},
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
    description: '按 section 读取一种写作方法，args 可指定 novelId。story 是创作路由；story-long/story-short/story-outline/story-tracking/story-review/story-deslop 分别为长篇、短篇、章蓝图、追踪、审稿、精修；story-operations 是原生操作字段。原有 core/project/write/plan/memory/revise/preset 仍可使用。all 只返回入口规则和预设，阶段参考按需取；未选作品可读通用规则。',
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

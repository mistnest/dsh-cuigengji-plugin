import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { Store } from './application/store.js';
import { MemoryBridge } from './adapters/mcp/client.js';
import { registerSkills } from './adapters/dsh/skills.js';
import { registerPrompt } from './adapters/dsh/prompt.js';
import { createSessionPolicy } from './application/bindings/session.js';
import { TOOL_ACTIONS as allowed, isReadAction } from './contracts/actions.js';
import { registerRpcRoute } from './adapters/dsh/rpc.js';
import { WorkData } from './application/backup/workspace.js';

export const name = 'cuigengji';
export const inject = ['tools', 'systemPrompt', 'skills', 'connection'];
export const Config = z.object({
  dataRoot: z.string().default(''),
});
const descriptions = {
  cuigengji_project: '接手本会话绑定的小说并读取或修改卷、章、正文。novel.handoff 只返回作品索引、当前章节/任务、章节目录摘要和资料入口，不返回正文；需要正文时用 chapter.get。读操作返回 revision；修改必须提供 expectedRevision。chapter.update 用 content、append 或 patch:{oldText,newText} 三选一。删除需 confirm:true；非空卷还需 chapterPolicy:detach/delete。chapter.get 支持 start/maxChars。',
  cuigengji_memory: '通过本地 stdio MCP 检索与维护本会话小说图谱。先用 graph.groups 查看人物/世界资料分组，再用 graph.list 的 query/type/groupId 搜索名称、别名和摘要；groupId:null 筛选未分组。列表不返回正文，命中后用 graph.get 读取详情，edge.list 用 nodeId 查关系。edge.create 的 from/to 是端点，name/content 可省略，空关系只显示连线，不编造说明。补充已有资料优先 graph.update；分组支持 graph.group.create/update/delete 和 graph.move 批量移动，删除分组保留条目。检查 status/factType/sources/knownBy，未确认或过期内容不当作既定事实。资料分 character_card 与 world_entry；graph.get/update/delete 必须用 nodeId，edge.get/update/delete 必须用 edgeId。修改需 expectedRevision，删除 confirm:true。',
  cuigengji_plan: '与作者讨论情节推进的多页共享流程图。先 planning.pages 按名称和用途摘要选页，独立新情节用 planning.page.create 新建页面；planning.list/search 携带 pageId（主线为 null）。文字批注与背景框通过 planning.decorations 读取、planning.apply 的 decoration.create/update/delete 修改，批注不当作正文事实。先 planning.search/list 定位当前情节，再 planning.get 读取该节点正文与 flow.previous/next 的前后情节摘要；沿已有路线修改，不把每轮讨论保存成孤立备忘录。补充同一情节用 planning.apply 的 node.update。推进下一步优先 planning.continue {nodeId,expectedRevision,requestId,value:{title,summary,content}}，原子创建后续节点和普通箭头，继承页面与分组。备选走向用同一起点发出多条普通箭头；标题/摘要说明各路线差别，未决定用 status:idea，不擅自改成 selected。planning.apply 支持一次创建多个节点与连线：node.create {ref,value}，edge.create {value:{from,to}}；ref 可被后续操作引用。边界调整和断线用 edge.update/delete，更新带 expectedRevision，删除带 confirm:true。独立故事线才创建孤立节点。planning.groups/group.create/update/delete 管理分组；planning.history/revert 可回顾和撤销事务。节点保留标题、摘要、自由正文；规划不代表已发生事实。',
  cuigengji_context: '读取会话任务信息、按需参考预览和已启用预设的有效文本。Agent 接手作品优先调用 cuigengji_project 的 novel.handoff；已启用写作预设随系统提示词提供，正文、规划和设定按任务读取。preset.read 只返回作者启用且可用的预设文本，不返回原始导入文件。',
};
function defaultDataRoot() {
  if (process.platform === 'win32') return join(process.env.LOCALAPPDATA || homedir(), 'cuigengji');
  return join(process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share'), 'cuigengji');
}

export async function apply(ctx, config = {}) {
  const root = config.dataRoot || process.env.CUIGENGJI_DATA_ROOT || defaultDataRoot();
  const store = new Store(root);
  const auditRoot = join(root, 'audit');
  await mkdir(auditRoot, { recursive:true, mode:0o700 });
  const audit = async (sessionId, value) => {
    const file = createHash('sha256').update(sessionId || 'human').digest('hex') + '.jsonl';
    await appendFile(join(auditRoot,file), JSON.stringify({time:new Date().toISOString(),...value})+'\n', {mode:0o600});
  };
  const sessionPolicy = createSessionPolicy({ store, audit });
  const { dispatch } = sessionPolicy;
  const memory = new MemoryBridge(store,{dispatch});
  await memory.start();
  ctx.effect(() => () => memory.close());
  ctx.provide('cuigengji',{store,dispatch,memory});
  registerSkills(ctx);
  registerPrompt(ctx, { store, audit, resolveBinding: sessionPolicy.resolveBinding });

  for (const [toolName, actions] of Object.entries(allowed)) {
    ctx.tools.register(defineTool({
      name:toolName, description:descriptions[toolName],
      parameters:{action:{type:'string',enum:actions,required:true},args:{type:'object',additionalProperties:true,description:'操作参数：实体ID、文本、版本等。省略小说ID，使用本会话绑定。'}},
      output:{schema:{type:'string'},render:(_args,value)=>[{type:'text',text:value}]},
      execute:async ({action,args},exec)=>{
        if (!exec.agent?.id) throw new Error('小说工具需要 DSH 会话');
        exec.signal?.throwIfAborted();
        const actor={kind:'agent',sessionId:String(exec.agent.id)};
        const input={...(args || {})};
        delete input.sessionId; delete input.actor;
        if (!isReadAction(action)) input.requestId ??= String(exec.callId);
        return JSON.stringify(toolName==='cuigengji_memory'
          ? await memory.call(actor.sessionId,action,input,{signal:exec.signal})
          : await dispatch(action,input,actor));
      },
    }));
  }
  sessionPolicy.register(ctx, memory);
  registerRpcRoute(ctx, { dispatch, dataRoot: store.root, workData: new WorkData(store) });
}

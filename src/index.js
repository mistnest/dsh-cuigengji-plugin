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
  cuigengji_memory: '通过本地 stdio MCP 检索与维护本会话小说图谱。先用 graph.groups 查看人物/世界资料分组，再用 graph.list 的 query/type/groupId 搜索名称、别名和摘要；groupId:null 筛选未分组。列表不返回正文，命中后用 graph.get 读取详情，edge.list 用 nodeId 查关系。补充已有资料优先 graph.update；分组支持 graph.group.create/update/delete 和 graph.move 批量移动，删除分组保留条目。检查 status/factType/sources/knownBy，未确认或过期内容不当作既定事实。资料分 character_card 与 world_entry；graph.get/update/delete 必须用 nodeId，edge.get/update/delete 必须用 edgeId。修改需 expectedRevision，删除 confirm:true。',
  cuigengji_plan: '作者与 AI 共用自由规划流程图。先用 planning.search/list 查询标题、摘要和分组，planning.get 按需读取单个节点正文、关系及邻居摘要；正文不在列表中。已有想法优先 node.update，同一章不必拆成多个节点。独立新节点用 node.create，存在剧情顺序、依赖或备选关系时在同一 planning.apply 批次建立 edge.create，无意义的连接不补。planning.groups 查看分组；planning.group.create/update/delete 管理分组，删除分组保留节点；node.update 设置 groupId 或 position。planning.history/changes 与 planning.revert 可查看和撤销事务。planning.apply 提供 requestId、reason、operations：node.create {ref,value:{title,summary,content,groupId}}，node.update {id,expectedRevision,value}，node.delete {id,expectedRevision,confirm:true,childPolicy:detach/subtree}，edge.create/update/delete 与 group.create/update/delete 同样支持事务。标题和摘要用于检索，正文按需读取；改正文时检查摘要。规划是意图，不是已发生事实。',
  cuigengji_context: '读取会话任务信息、按需参考预览和已启用预设的有效文本。Agent 接手作品优先调用 cuigengji_project 的 novel.handoff；正文、预设、规划和设定分别按任务读取。preset.read 只返回作者启用且可用的预设文本，不返回原始导入文件。',
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

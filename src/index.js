import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { Store } from './core/store.js';
import { MemoryBridge } from './mcp/client.js';
import { registerSkills } from './assistant/skills.js';
import { registerPrompt } from './assistant/prompt.js';
import { createSessionPolicy } from './assistant/session.js';
import { TOOL_ACTIONS as allowed, isReadAction } from './core/actions.js';
import { registerRpcRoute } from './transport/rpc.js';

export const name = 'cuigengji';
export const inject = ['tools', 'systemPrompt', 'skills', 'connection'];
export const Config = z.object({
  dataRoot: z.string().default(''),
});
const descriptions = {
  cuigengji_project: '接手本会话绑定的小说并读取或修改卷、章、正文。novel.handoff 只返回作品索引、当前章节/任务、章节目录摘要和资料入口，不返回正文；需要正文时用 chapter.get。读操作返回 revision；修改必须提供 expectedRevision。chapter.update 用 content、append 或 patch:{oldText,newText} 三选一。删除需 confirm:true；非空卷还需 chapterPolicy:detach/delete。chapter.get 支持 start/maxChars。',
  cuigengji_memory: '通过本地 stdio MCP 检索与维护本会话小说图谱。先用 graph.list 的 query 搜索名称、别名、摘要和正文关键词，再用 graph.get 读详情；edge.list 用 nodeId 查关系。检查 status/factType/sources/knownBy，未确认或过期内容不当作既定事实。资料仅分人物 character_card 与世界设定 world_entry，正文细分类由作者自己书写；字段 name/summary/content。world_book 仅兼容旧数据，不创建新容器；graph.get/update/delete 必须用 nodeId，edge.get/update/delete 必须用 edgeId（不要用 id）。关系创建使用 from/to 节点ID和 name。修改需 expectedRevision，删除 confirm:true。sources:[{chapterId,revision}] 记录依据，knownBy/factType 区分知情与事实。',
  cuigengji_plan: '作者与 AI 共用故事规划板。planning.list/search 用 parentId/query/status/thread 和 offset/limit 查询摘要；planning.get 用 nodeId 读全文及邻接。planning.history/changes 读取事务。planning.apply 提供 requestId、reason、operations：node.create {ref,value}，node.update {id,expectedRevision,value}，node.delete {id,expectedRevision,confirm:true,childPolicy:detach/subtree}，edge.create {value:{from,to,type:next/requires/alternative,label}}，edge.delete {id,expectedRevision,confirm:true}。节点字段 title/summary/content/scope(long/phase/near/unspecified)/status(idea/selected/written/dropped)/parentId/threads/ chapterRefs[{chapterId,revision}]/memoryRefs。临时 ref 可用于同批连线。删除子树时同时传入 planning.list 返回的 expectedSequence，避免删除范围在确认后发生变化。planning.revert 用 requestId、transactionId 安全撤销。规划不自动注入，不限制正文写入；写成正文需关联章节。',
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
  registerRpcRoute(ctx, { dispatch, dataRoot: root });
}

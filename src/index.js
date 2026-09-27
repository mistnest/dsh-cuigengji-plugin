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
  cuigengji_project: '读取和修改本会话小说的卷、章、正文。读操作返回 revision；修改必须提供 expectedRevision。chapter.update 用 content、append 或 patch:{oldText,newText} 三选一。删除需 confirm:true；非空卷还需 chapterPolicy:detach/delete。chapter.get 支持 start/maxChars。',
  cuigengji_memory: '通过本地 stdio MCP 检索与维护本会话小说图谱。先用 graph.list 的 query 搜索名称、别名、摘要和正文关键词，再用 graph.get 读详情；edge.list 用 nodeId 查关系。检查 status/factType/sources/knownBy，未确认或过期内容不当作既定事实。节点 type 为 world_book/world_entry/character_card，字段 name/summary/content；graph.get/update/delete 必须用 nodeId，edge.get/update/delete 必须用 edgeId（不要用 id）。关系创建使用 from/to 节点ID和 name。修改需 expectedRevision，删除 confirm:true。sources:[{chapterId,revision}] 记录依据，knownBy/factType 区分知情与事实。',
  cuigengji_plan: '读取或保存小说情节提案，plan.set 使用 content 和 expectedRevision（首次为0）。作者通过面板确认规划，Agent 无权自我批准。',
  cuigengji_context: '读取会话绑定及完整自动参考及按需指定的设定和来源，用于写作、修订、换场景恢复。',
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

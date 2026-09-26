import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdir, appendFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import z from '@deepseek-ai/schemastery';
import { defineTool } from '@deepseek-ai/dsh-tools';
import { Store } from './core/store.js';
import { MemoryBridge } from './mcp/client.js';
import { registerSkills, persona } from './assistant/skills.js';

export const name = 'cuigengji';
export const inject = ['tools', 'systemPrompt', 'skills'];
export const Config = z.object({
  dataRoot: z.string().default(''),
  contextChars: z.natural().min(2000).max(60000).default(16000),
});
const allowed = {
  cuigengji_project: ['novel.get','volume.list','volume.create','volume.update','volume.delete','chapter.list','chapter.search','chapter.create','chapter.get','chapter.update','chapter.delete','chapter.history','chapter.restore'],
  cuigengji_memory: ['graph.list','graph.get','graph.create','graph.update','graph.delete','edge.list','edge.get','edge.create','edge.update','edge.delete'],
  cuigengji_plan: ['plan.get','plan.set'],
  cuigengji_context: ['context.get','binding.get'],
};
const descriptions = {
  cuigengji_project: '读取和修改本会话小说的卷、章、正文。读操作返回 revision；修改必须提供 expectedRevision。chapter.update 用 content、append 或 patch:{oldText,newText} 三选一。删除需 confirm:true；非空卷还需 chapterPolicy:detach/delete。chapter.get 支持 start/maxChars。',
  cuigengji_memory: '通过本地 stdio MCP 检索与维护本会话小说图谱。节点 type 为 world_book/world_entry/character_card，字段 name/summary/content；关系 from/to/name。修改需 expectedRevision，删除 confirm:true。sources:[{chapterId,revision}] 记录依据，knownBy/factType 区分知情与事实。',
  cuigengji_plan: '读取或保存小说情节提案，plan.set 使用 content 和 expectedRevision（首次为0）。作者通过面板确认规划，Agent 无权自我批准。',
  cuigengji_context: '读取会话绑定及按预算选出的小说上下文和来源，用于写作、修订、换场景恢复。',
};
const readAction = action => /\.(get|list|history|search)$/.test(action);
function failure(error) { return { ok:false, error:{code:error.code || 'CUIGENGJI_ERROR',message:error.message || String(error),details:{}} }; }

export async function apply(ctx, config = {}) {
  const root = config.dataRoot || process.env.CUIGENGJI_DATA_ROOT || join(homedir(), '.local', 'share', 'cuigengji');
  const store = new Store(root);
  const active = new Set();
  const bound = new Set();
  const contextChars = config.contextChars || 16000;
  const auditRoot = join(root, 'audit');
  await mkdir(auditRoot, { recursive:true, mode:0o700 });
  const audit = async (sessionId, value) => {
    const file = createHash('sha256').update(sessionId || 'human').digest('hex') + '.jsonl';
    await appendFile(join(auditRoot,file), JSON.stringify({time:new Date().toISOString(),...value})+'\n', {mode:0o600});
  };
  async function dispatch(action,args={},actor={kind:'agent'}) {
    if (action === 'binding.set' && active.has(actor.sessionId)) throw new Error('会话正在运行，请停止后切换小说或章节');
    if (actor.kind === 'agent') {
      const binding = await store.dispatch('binding.get',{},actor);
      if (!binding) throw new Error('请先在催更姬面板绑定小说');
      if (args.novelId && args.novelId !== binding.novelId) throw new Error('不能访问另一部小说');
      args = {...args, novelId:binding.novelId};
      if (['chapter.create','chapter.update'].includes(action) && (args.content || args.append || args.patch)) {
        const plan = await store.dispatch('plan.get',{},actor);
        if (!plan?.approved) throw new Error('请先在催更姬面板确认情节规划后写入正文');
      }
    }
    const result = await store.dispatch(action,args,actor);
    if (action === 'binding.set') bound.add(actor.sessionId);
    if (!readAction(action)) await audit(actor.sessionId,{action,actor:actor.kind,entityId:result?.id,revision:result?.revision,reason:args.reason || ''});
    return result;
  }
  const memory = new MemoryBridge(store,{dispatch});
  await memory.start();
  ctx.effect(() => () => memory.close());
  ctx.provide('cuigengji',{store,dispatch,memory});
  registerSkills(ctx);

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
        if (!readAction(action)) input.requestId ??= String(exec.callId);
        return JSON.stringify(toolName==='cuigengji_memory'
          ? await memory.call(actor.sessionId,action,input,{signal:exec.signal})
          : await dispatch(action,input,actor));
      },
    }));
  }
  ctx.on('agent/pre-step',async ({agent},next)=>{
    const sessionId=String(agent.id);
    const binding=await store.dispatch('binding.get',{}, {sessionId,kind:'human'});
    if(binding) {bound.add(sessionId);active.add(sessionId);}
    return next();
  });
  ctx.on('system-prompt/assemble',async (assembly,context,next)=>{
    const result=await next();
    if(!context.agent?.id) return result;
    const actor={kind:'agent',sessionId:String(context.agent.id)};
    const binding=await store.dispatch('binding.get',{},actor);
    if(!binding) return result;
    bound.add(actor.sessionId);
    const material=await store.dispatch('context.get',{maxChars:contextChars},actor);
    result.sections.push({name:'cuigengji:writing',text:persona,interpolate:false});
    result.contexts.push({name:'cuigengji:novel',text:JSON.stringify(material)});
    await audit(actor.sessionId,{action:'context.assembled',binding,skillVersion:'0.1.0',context:material});
    return result;
  });
  ctx.on('agent/status',({agent,status})=>{
    if(status==='running') active.add(String(agent.id));
    else active.delete(String(agent.id));
  });
  ctx.tools.guard(exec => {
    if (!exec.agent || !bound.has(String(exec.agent.id))) return;
    const n=exec.name;
    if (/subagent|spawn_agent|fork_agent|delegate/.test(n)) return '催更姬使用当前单 Agent，请直接完成写作任务';
    if (/^(bash|shell|pwsh|write|edit|apply_patch|run_code|exec|terminal)(_|$)/.test(n)) return '小说会话使用 cuigengji 工具维护正文和记忆，避免绕过版本记录';
  });
  ctx.inject(['connection'], c => {
    c.connection.rpc.handle('/cuigengji',async (endpoint,payload,signal)=>{
      try {
        signal.throwIfAborted();
        if(endpoint !== 'dispatch' || !payload || typeof payload.action !== 'string') throw new Error('无效的催更姬请求');
        const {action,args={},sessionId}=payload;
        if(!['novel.list','novel.create','novel.import'].includes(action) && !sessionId) throw new Error('请选择一个 DSH 会话');
        if(action==='settings.get') return {ok:true,value:{contextChars,dataRoot:root,dshVersion:'0.1.7-rc.2'}};
        return {ok:true,value:await dispatch(action,args,{kind:'human',sessionId})};
      } catch(error) {return failure(error);}
    });
  });
}

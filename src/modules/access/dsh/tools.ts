import type {Context} from '@deepseek-ai/cordis';
import {randomUUID} from 'node:crypto';
import type {Row} from '../../workspace/operations/record-reader.ts';
import type {LibraryAccess} from '../../library/roots/service.ts';
import type {UpgradeCoordinator} from '../../library/upgrade/upgrade.ts';
type Dispatch = (action: string, args: Row, actor: Row) => Promise<unknown>;
interface ToolServices {
  libraries: Pick<LibraryAccess<unknown>, 'use'>;
  dispatch: Dispatch;
  guidanceDispatch: (action: string, args: Row, actor: Row) => Promise<unknown>;
  maintenance: Pick<UpgradeCoordinator, 'status' | 'verify'>;
}
import {defineTool, type ParameterPropertySpec} from '@deepseek-ai/dsh-tools';
import {TOOL_ACTIONS, isReadAction} from '../catalog/actions.ts';
import {prepareImageToolResult, renderImageToolResult} from './image-schema.ts';
import {projectArgsSchema, projectToolDescription} from './project-schema.ts';
import {memoryDshArgsSchema, memoryToolDescription} from './memory-schema.ts';
import {planningArgsSchema, planningToolDescription} from './planning-schema.ts';
import {presetArgsSchema, presetToolDescription} from './preset-schema.ts';
import {variablesArgsSchema, variablesToolDescription} from './variables-schema.ts';
import {connectionsArgs,connectionsDescription} from './connections.ts';

const toolDefinitions = {
  cuigengji_connections:{description:connectionsDescription,args:connectionsArgs},
  cuigengji_project: {description:projectToolDescription, args:projectArgsSchema()},
  cuigengji_memory: {description:memoryToolDescription, args:memoryDshArgsSchema},
  cuigengji_plan: {description:planningToolDescription, args:planningArgsSchema},
  cuigengji_context: {description:presetToolDescription, args:presetArgsSchema},
  cuigengji_variables: {description:variablesToolDescription, args:variablesArgsSchema},
};

export function registerTools(ctx: Context, {libraries, dispatch, guidanceDispatch, maintenance}: ToolServices) {
  for (const [toolName, actions] of Object.entries(TOOL_ACTIONS)) {
    const definition = toolDefinitions[toolName as keyof typeof toolDefinitions];
    ctx.tools.register(defineTool({
      name:toolName, description:definition.description,
      parameters:{action:{type:'string',enum:[...actions],required:true},args:definition.args as ParameterPropertySpec & {type: "object"; additionalProperties: true}},
      output:{schema:{type:'string'},render:(_args,value)=>renderImageToolResult(value)},
      execute:async ({action,args},exec)=>libraries.use(async()=>{
        if (!exec.agent?.id) throw new Error('小说工具需要 DSH 会话');
        exec.signal?.throwIfAborted();
        const actor={kind:'agent',sessionId:String(exec.agent.id)};
        const input: Row={...(args || {})};
        delete input.sessionId; delete input.actor;
        if (!isReadAction(action)) input.requestId ??= exec.callId==null ? randomUUID() : String(exec.callId);
        const result=await dispatch(action,input,actor);
        return JSON.stringify(await prepareImageToolResult(ctx,result));
      }),
    }));
  }
  ctx.tools.register(defineTool({
    name: 'cuigengji_guidance',
    description: '按需读取催更姬写作指引，使用 {section,args?}，与内容工具的 {action,args} 不同。关闭持续指引后仍可用：core 是基础规则，project/write/plan/memory/revise 是对应规范，variables 是可选剧情变量规范，preset 是当前作品预设，all 返回全部规则与预设。未选作品仍返回基础规则，并注明预设不可用；参考文件相对返回的 resourceBase 读取。',
    parameters: {
      section: { type: 'string', enum: ['core','project','write','plan','memory','revise','variables','preset','all'], required: true },
      args: { type: 'object', additionalProperties: true, description: '可选 novelId；不传则使用本会话当前作品。' },
    },
    output: { schema: { type: 'string' }, render: (_args, value) => [{ type: 'text', text: value }] },
    execute: async ({ section, args }, exec) => libraries.use(async()=>{
      exec.signal?.throwIfAborted();
      if (!exec.agent?.id) throw new Error('写作指引需要 DSH 会话');
      const result = await guidanceDispatch('guidance.read', { ...(args || {}), section }, {kind:'agent',sessionId:String(exec.agent.id)});
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
}

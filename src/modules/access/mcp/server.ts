import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MEMORY_ACTIONS, toolName } from './actions.ts';
import {actionCapability} from '../catalog/capabilities.ts';
import { memoryArgsSchema, memoryActionDescription } from '../dsh/memory-schema.ts';
import {variablesJsonSchema,variableActionDescription} from '../dsh/variables-schema.ts';
import {presetJsonSchema,presetActionDescription,readItemsSchema} from '../dsh/preset-schema.ts';
import {imageArgsSchema,imageActionDescription} from '../dsh/image-schema.ts';

const legacyContracts: Record<string, {inputSchema: unknown; describe: (action: string) => string}> = {
  settings: {inputSchema:memoryArgsSchema, describe:memoryActionDescription},
  assets: {inputSchema:imageArgsSchema, describe:imageActionDescription},
  creativeMemory:{inputSchema:presetJsonSchema, describe:presetActionDescription},
  preset: {inputSchema:presetJsonSchema, describe:presetActionDescription},
  variables: {inputSchema:variablesJsonSchema, describe:variableActionDescription},
  guidance: {
    inputSchema:{type:'object',additionalProperties:true,properties:{section:{type:'string',enum:['core','project','write','plan','memory','revise','variables','preset','all']},novelId:{type:'string'}}},
    describe:()=> '按需读取催更姬的写作指引模块，填写 section。基础规则不要求绑定作品；preset/all 会附带目标作品的有效预设，未选作品时注明预设不可用，规则仍可读取。参考文件相对返回的 resourceBase。',
  },
};

// This process owns no project files. Its capability is one session-bound token.
const endpoint = process.env.CUIGENGJI_MEMORY_ENDPOINT;
const token = process.env.CUIGENGJI_MEMORY_TOKEN;
if (!endpoint || !token) throw new Error('缺少 cuigengji 宿主连接信息');
const address = new URL(endpoint);
if (address.protocol !== 'http:' || address.hostname !== '127.0.0.1') {
  throw new Error('记忆服务必须为本机 loopback 地址');
}

const server = new Server({ name: 'cuigengji-memory', version: '0.1.0' }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: MEMORY_ACTIONS.map(action => {
    const {describe = memoryActionDescription, inputSchema = {type:'object',additionalProperties:true}}
      = legacyContracts[actionCapability(action)?.module ?? ''] ?? {};
    if (action==='context.readMany') return {name:toolName(action),description:presetActionDescription(action),
      inputSchema:{type:'object',properties:{novelId:{type:'string'},items:readItemsSchema},required:['items'],additionalProperties:false}};
    return {name:toolName(action), description:describe(action), inputSchema};
  }),
}));
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const action = MEMORY_ACTIONS.find(item => toolName(item) === request.params.name);
  if (!action) return { isError: true, content: [{ type: 'text', text: '未知记忆工具' }] };
  try {
    const response = await fetch(address, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action, args: request.params.arguments ?? {} }),
      signal: AbortSignal.any([extra.signal, AbortSignal.timeout(30_000)]),
    });
    const body = await response.json();
    if (!response.ok) return { isError: true, content: [{ type: 'text', text: body.error ?? '记忆操作失败' }],
      ...(body.diagnostic ? {structuredContent:{error:body.diagnostic}} : {}) };
    if(body.result?.format==='cuigengji-image'){const {data,...metadata}=body.result;return {content:[{type:'text',text:JSON.stringify(metadata)},{type:'image',data,mimeType:metadata.mimeType}]};}
    return { content: [{ type: 'text', text: JSON.stringify(body.result ?? null) }] };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error instanceof Error ? error.message : String(error) }] };
  }
});
await server.connect(new StdioServerTransport());

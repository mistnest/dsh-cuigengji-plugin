import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MEMORY_ACTIONS, toolName } from './actions.js';

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
  tools: MEMORY_ACTIONS.map(action => ({
    name: toolName(action),
    description: `当前小说记忆操作 ${action}。小说由会话绑定；修改须携带读取到的版本。`,
    inputSchema: { type: 'object', additionalProperties: true },
  })),
}));
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  const action = MEMORY_ACTIONS.find(item => toolName(item) === request.params.name);
  if (!action) return { isError: true, content: [{ type: 'text', text: '未知记忆工具' }] };
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ action, args: request.params.arguments ?? {} }),
      signal: AbortSignal.any([extra.signal, AbortSignal.timeout(30_000)]),
    });
    const body = await response.json();
    if (!response.ok) return { isError: true, content: [{ type: 'text', text: body.error ?? '记忆操作失败' }] };
    return { content: [{ type: 'text', text: JSON.stringify(body.result ?? null) }] };
  } catch (error) {
    return { isError: true, content: [{ type: 'text', text: error.message }] };
  }
});
await server.connect(new StdioServerTransport());

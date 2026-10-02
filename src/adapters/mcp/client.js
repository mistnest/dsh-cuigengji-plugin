import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { assertMemoryAction, toolName } from './actions.js';

const MAX_BODY_BYTES = 1024 * 1024;

export function memoryRuntime(options = {}, runtime = process) {
  const command = options.nodeCommand ?? runtime.env.CUIGENGJI_DSH_NODE ?? runtime.execPath;
  const env = {};
  if (runtime.env.NODE_OPTIONS) env.NODE_OPTIONS = runtime.env.NODE_OPTIONS;
  // Desktop hosts use the Electron executable as Node. The SDK's default
  // environment omits this switch, which otherwise launches a second GUI.
  if (runtime.versions.electron || runtime.env.ELECTRON_RUN_AS_NODE === '1') {
    env.ELECTRON_RUN_AS_NODE = '1';
  }
  return { command, env };
}

export class MemoryBridge {
  constructor(store, options = {}) {
    this.store = store;
    this.dispatch = options.dispatch ?? ((action, args, actor) => store.dispatch(action, args, actor));
    this.resolveNovel = options.resolveNovel;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    const runtime = memoryRuntime(options);
    this.nodeCommand = runtime.command;
    this.runtimeEnv = runtime.env;
    this.sessions = new Map();
    this.tokens = new Map();
    this.closed = false;
  }

  async start() {
    if (this.closed) throw new Error('记忆服务已关闭');
    if (this.starting) return this.starting;
    this.starting = (async () => {
      this.server = http.createServer((request, response) => { void this.handle(request, response); });
      this.server.requestTimeout = this.timeoutMs;
      await new Promise((resolve, reject) => {
        this.server.once('error', reject);
        this.server.listen(0, '127.0.0.1', resolve);
      });
      this.endpoint = `http://127.0.0.1:${this.server.address().port}/memory`;
      return this;
    })();
    return this.starting;
  }

  async handle(request, response) {
    const reply = (status, data) => {
      if (response.destroyed) return;
      response.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify(data));
    };
    try {
      if (request.method !== 'POST' || request.url !== '/memory') return reply(404, { error: '未知接口' });
      const sessionId = this.tokens.get((request.headers.authorization ?? '').replace(/^Bearer /, ''));
      if (!sessionId) return reply(401, { error: '会话凭据失效' });
      let size = 0;
      const chunks = [];
      for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) return reply(413, { error: '记忆请求过大' });
        chunks.push(chunk);
      }
      const { action, args = {} } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      assertMemoryAction(action);
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('参数必须是对象');
      const actor = { kind: 'agent', sessionId };
      const novelId = await this.boundNovel(sessionId);
      if (!novelId) throw new Error('当前会话尚未绑定小说');
      if (args.novelId && args.novelId !== novelId) throw new Error('不能访问其他小说');
      // Never forward model-supplied session/actor identities.
      const { sessionId: _session, actor: _actor, ...safeArgs } = args;
      const result = await this.dispatch(action, { ...safeArgs, novelId }, actor);
      reply(200, { result });
    } catch (error) {
      reply(400, { error: error.message });
    }
  }

  async boundNovel(sessionId) {
    if (this.resolveNovel) return this.resolveNovel(sessionId);
    const binding = await this.store.dispatch('binding.get', {}, { kind: 'agent', sessionId });
    return binding?.novelId;
  }

  async connection(sessionId) {
    if (!sessionId || typeof sessionId !== 'string') throw new Error('缺少会话 ID');
    await this.start();
    const existing = this.sessions.get(sessionId);
    if (existing) return existing.pending ?? existing;
    const entry = { pending: null };
    entry.pending = this.connect(sessionId, entry);
    this.sessions.set(sessionId, entry);
    try { return await entry.pending; }
    catch (error) {
      if (this.sessions.get(sessionId) === entry) this.sessions.delete(sessionId);
      throw error;
    }
  }

  async connect(sessionId, entry) {
    const token = randomBytes(32).toString('hex');
    this.tokens.set(token, sessionId);
    const env = { ...this.runtimeEnv, CUIGENGJI_MEMORY_ENDPOINT: this.endpoint, CUIGENGJI_MEMORY_TOKEN: token };
    const transport = new StdioClientTransport({
      command: this.nodeCommand,
      args: [fileURLToPath(new URL('./server.js', import.meta.url))],
      env,
      stderr: 'pipe',
    });
    const client = new Client({ name: 'cuigengji-host', version: '0.1.0' });
    // Keep child diagnostics out of model output; drain to avoid pipe backpressure.
    transport.stderr?.on('data', () => {});
    client.onclose = () => {
      this.tokens.delete(token);
      // A reconnect may have replaced this entry. Never tear down the new
      // connection when an older MCP child exits asynchronously.
      if (this.sessions.get(sessionId) === entry) this.sessions.delete(sessionId);
    };
    try {
      await client.connect(transport);
      return { client, transport, token };
    } catch (error) {
      this.tokens.delete(token);
      await transport.close().catch(() => {});
      throw error;
    }
  }

  async call(sessionId, action, args = {}, { signal } = {}) {
    assertMemoryAction(action);
    if (signal?.aborted) throw signal.reason ?? new Error('已取消');
    const { client } = await this.connection(sessionId);
    const result = await client.callTool({ name: toolName(action), arguments: args }, undefined, {
      timeout: this.timeoutMs, signal,
    });
    const output = result.content?.find(item => item.type === 'text')?.text;
    if (result.isError) throw new Error(output ?? '记忆工具失败');
    return JSON.parse(output ?? 'null');
  }

  async disconnect(sessionId) {
    const entry = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    if (!entry) return;
    const connection = await (entry.pending ?? entry).catch(() => null);
    if (!connection) return;
    this.tokens.delete(connection.token);
    await connection.client.close();
  }

  async close() {
    this.closed = true;
    await Promise.allSettled([...this.sessions.keys()].map(sessionId => this.disconnect(sessionId)));
    this.tokens.clear();
    if (this.server) {
      this.server.closeAllConnections();
      await new Promise(resolve => this.server.close(resolve));
    }
  }
}

export class MemoryClient {
  constructor(bridge, sessionId) { this.bridge = bridge; this.sessionId = sessionId; }
  call(action, args, options) { return this.bridge.call(this.sessionId, action, args, options); }
  close() { return this.bridge.disconnect(this.sessionId); }
}

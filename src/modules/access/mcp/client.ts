import type {CallToolResult} from '@modelcontextprotocol/sdk/types.js';
import type {AddressInfo} from 'node:net';
import type {WorkspaceDispatcher} from '../../workspace/operations/command.ts';
import type {Row} from '../../workspace/operations/record-reader.ts';
import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { assertMemoryAction, toolName } from './actions.ts';
import { errorInfo } from '../../../platform/errors.ts';

const MAX_BODY_BYTES = 1024 * 1024;
// Presets archive up to 2M characters of import metadata, which can exceed
// 1 MiB on the wire. Keep the existing cap for other memory operations.
const MAX_PRESET_BODY_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BODY_BYTES = 24 * 1024 * 1024;

type Options = {
  nodeCommand?: string;
  timeoutMs?: number;
  dispatch?: (action:string,args:Row,actor:Row)=>Promise<unknown>;
  resolveNovel?: (sessionId: string, novelId?: string) => Promise<string>;
  resolveBinding?: (sessionId: string) => Promise<Row | null>;
};
type Connection = {client: Client; transport: StdioClientTransport; token: string};
type Runtime = Pick<NodeJS.Process, 'env' | 'versions' | 'execPath'>;

export function memoryRuntime(options: Pick<Options, 'nodeCommand'> = {}, runtime: Runtime = process) {
  const command = options.nodeCommand ?? runtime.env.CUIGENGJI_DSH_NODE ?? runtime.execPath;
  const env: Record<string, string> = {};
  if (runtime.env.NODE_OPTIONS) env.NODE_OPTIONS = runtime.env.NODE_OPTIONS;
  // Desktop hosts use the Electron executable as Node. The SDK's default
  // environment omits this switch, which otherwise launches a second GUI.
  if (runtime.versions.electron || runtime.env.ELECTRON_RUN_AS_NODE === '1') {
    env.ELECTRON_RUN_AS_NODE = '1';
  }
  return { command, env };
}

export class MemoryBridge {
  readonly store: WorkspaceDispatcher;
  readonly dispatch: (action:string,args:Row,actor:Row)=>Promise<unknown>;
  readonly resolveNovel?: Options['resolveNovel'];
  readonly resolveBinding?: Options['resolveBinding'];
  readonly timeoutMs: number;
  readonly nodeCommand: string;
  readonly runtimeEnv: Record<string, string>;
  readonly sessions = new Map<string, Promise<Connection>>();
  readonly tokens = new Map<string, string>();
  private closed = false;
  private starting?: Promise<this>;
  private server?: http.Server;
  private endpoint = '';

  constructor(store: WorkspaceDispatcher, options: Options = {}) {
    this.store = store;
    this.dispatch = options.dispatch ?? ((action, args, actor) => store.dispatch(action, args, actor));
    this.resolveNovel = options.resolveNovel;
    this.resolveBinding = options.resolveBinding;
    this.timeoutMs = options.timeoutMs ?? 30_000;
    const runtime = memoryRuntime(options);
    this.nodeCommand = runtime.command;
    this.runtimeEnv = runtime.env;
  }

  async start(): Promise<this> {
    if (this.closed) throw new Error('记忆服务已关闭');
    if (this.starting) return this.starting;
    this.starting = (async () => {
      const server = this.server = http.createServer((request, response) => { void this.handle(request, response); });
      server.requestTimeout = this.timeoutMs;
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      this.endpoint = `http://127.0.0.1:${(server.address() as AddressInfo).port}/memory`;
      return this;
    })();
    return this.starting;
  }

  async handle(request: http.IncomingMessage, response: http.ServerResponse) {
    const reply = (status: number, data: unknown) => {
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
        if (size > MAX_IMAGE_BODY_BYTES) return reply(413, { error: '记忆请求过大' });
        chunks.push(chunk);
      }
      const { action, args = {} } = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      assertMemoryAction(action);
      if(size>(action.startsWith('image.')?MAX_IMAGE_BODY_BYTES:(action.startsWith('preset.')||action.startsWith('creativeMemory.'))?MAX_PRESET_BODY_BYTES:MAX_BODY_BYTES))return reply(413,{error:'请求内容过大，请分段提交'});
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('参数必须是对象');
      const actor = { kind: 'agent', sessionId };
      const onDemandGuidance = action === 'guidance.read';
      const novelId = onDemandGuidance
        ? await this.boundNovelOptional(sessionId, args.novelId)
        : await this.boundNovel(sessionId, args.novelId);
      if (!onDemandGuidance && !novelId) throw new Error('当前会话尚未绑定小说');
      if (args.novelId && novelId && args.novelId !== novelId) throw new Error('不能访问其他小说');
      // Never forward model-supplied session/actor identities.
      const { sessionId: _session, actor: _actor, ...safeArgs } = args;
      const result = await this.dispatch(action, { ...safeArgs, ...(novelId ? {novelId} : {}) }, actor);
      reply(200, { result });
    } catch (error) {
      reply(400, { error: error instanceof Error ? error.message : String(error), diagnostic: errorInfo(error) });
    }
  }

  async boundNovel(sessionId: string, requested?: string) {
    if (this.resolveNovel) return this.resolveNovel(sessionId, requested);
    const binding = await this.store.dispatch('binding.get', {}, { kind: 'agent', sessionId });
    if (requested && binding?.novelId !== requested) throw new Error('不能访问其他小说');
    return binding?.novelId;
  }

  async boundNovelOptional(sessionId: string, requested?: string) {
    if (requested) return this.boundNovel(sessionId, requested);
    if (this.resolveBinding) {
      const binding = await this.resolveBinding(sessionId);
      return binding?.activeNovelId || binding?.novelId || null;
    }
    const binding = await this.store.dispatch('binding.get', {}, { kind: 'agent', sessionId });
    return binding?.activeNovelId || binding?.novelId || null;
  }

  async connection(sessionId: string): Promise<Connection> {
    if (!sessionId || typeof sessionId !== 'string') throw new Error('缺少会话 ID');
    await this.start();
    const existing = this.sessions.get(sessionId);
    if (existing) return existing;
    const entry = this.connect(sessionId, () => this.sessions.get(sessionId) === entry);
    this.sessions.set(sessionId, entry);
    try { return await entry; }
    catch (error) {
      if (this.sessions.get(sessionId) === entry) this.sessions.delete(sessionId);
      throw error;
    }
  }

  private async connect(sessionId: string, isCurrent: () => boolean): Promise<Connection> {
    const token = randomBytes(32).toString('hex');
    this.tokens.set(token, sessionId);
    const env = { ...this.runtimeEnv, CUIGENGJI_MEMORY_ENDPOINT: this.endpoint, CUIGENGJI_MEMORY_TOKEN: token };
    const transport = new StdioClientTransport({
      command: this.nodeCommand,
      args: [fileURLToPath(new URL('./server.ts', import.meta.url))],
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
      if (isCurrent()) this.sessions.delete(sessionId);
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

  async call(sessionId: string, action: string, args: Row = {}, { signal }: {signal?: AbortSignal} = {}) {
    assertMemoryAction(action);
    if (signal?.aborted) throw signal.reason ?? new Error('已取消');
    const { client } = await this.connection(sessionId);
    const result = await client.callTool({ name: toolName(action), arguments: args }, undefined, {
      timeout: this.timeoutMs, signal,
    }) as CallToolResult;
    const output = result.content?.find(item => item.type === 'text')?.text;
    if (result.isError) {
      const diagnostic = result.structuredContent?.error as {code?: string; details?: unknown} | undefined;
      throw Object.assign(new Error(output ?? '记忆工具失败'), diagnostic && typeof diagnostic.code === 'string'
        ? {code:diagnostic.code, details:diagnostic.details || {}} : {});
    }
    const value=JSON.parse(output ?? 'null'),image=result.content?.find(item=>item.type==='image');
    return value?.format==='cuigengji-image'&&image?{...value,data:image.data,mimeType:image.mimeType}:value;
  }

  async disconnect(sessionId: string) {
    const entry = this.sessions.get(sessionId);
    this.sessions.delete(sessionId);
    if (!entry) return;
    const connection = await entry.catch(() => null);
    if (!connection) return;
    this.tokens.delete(connection.token);
    await connection.client.close();
  }

  async close() {
    this.closed = true;
    await Promise.allSettled([...this.sessions.keys()].map(sessionId => this.disconnect(sessionId)));
    this.tokens.clear();
    const server = this.server;
    if (server) {
      server.closeAllConnections();
      await new Promise<void>(resolve => server.close(() => resolve()));
    }
  }
}

export class MemoryClient {
  readonly bridge: MemoryBridge;
  readonly sessionId: string;
  constructor(bridge: MemoryBridge, sessionId: string) { this.bridge = bridge; this.sessionId = sessionId; }
  call(action: string, args: Row, options?: {signal?: AbortSignal}) { return this.bridge.call(this.sessionId, action, args, options); }
  close() { return this.bridge.disconnect(this.sessionId); }
}

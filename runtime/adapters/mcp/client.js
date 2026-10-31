import http from "node:http";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { assertMemoryAction, toolName } from "./actions.js";
import { errorInfo } from "../../contracts/errors.js";
const MAX_BODY_BYTES = 1024 * 1024;
function memoryRuntime(options = {}, runtime = process) {
  const command = options.nodeCommand ?? runtime.env.CUIGENGJI_DSH_NODE ?? runtime.execPath;
  const env = {};
  if (runtime.env.NODE_OPTIONS) env.NODE_OPTIONS = runtime.env.NODE_OPTIONS;
  if (runtime.versions.electron || runtime.env.ELECTRON_RUN_AS_NODE === "1") {
    env.ELECTRON_RUN_AS_NODE = "1";
  }
  return { command, env };
}
class MemoryBridge {
  constructor(store, options = {}) {
    this.store = store;
    this.dispatch = options.dispatch ?? ((action, args, actor) => store.dispatch(action, args, actor));
    this.resolveNovel = options.resolveNovel;
    this.resolveBinding = options.resolveBinding;
    this.timeoutMs = options.timeoutMs ?? 3e4;
    const runtime = memoryRuntime(options);
    this.nodeCommand = runtime.command;
    this.runtimeEnv = runtime.env;
    this.sessions = /* @__PURE__ */ new Map();
    this.tokens = /* @__PURE__ */ new Map();
    this.closed = false;
  }
  async start() {
    if (this.closed) throw new Error("\u8BB0\u5FC6\u670D\u52A1\u5DF2\u5173\u95ED");
    if (this.starting) return this.starting;
    this.starting = (async () => {
      this.server = http.createServer((request, response) => {
        void this.handle(request, response);
      });
      this.server.requestTimeout = this.timeoutMs;
      await new Promise((resolve, reject) => {
        this.server.once("error", reject);
        this.server.listen(0, "127.0.0.1", resolve);
      });
      this.endpoint = `http://127.0.0.1:${this.server.address().port}/memory`;
      return this;
    })();
    return this.starting;
  }
  async handle(request, response) {
    const reply = (status, data) => {
      if (response.destroyed) return;
      response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify(data));
    };
    try {
      if (request.method !== "POST" || request.url !== "/memory") return reply(404, { error: "\u672A\u77E5\u63A5\u53E3" });
      const sessionId = this.tokens.get((request.headers.authorization ?? "").replace(/^Bearer /, ""));
      if (!sessionId) return reply(401, { error: "\u4F1A\u8BDD\u51ED\u636E\u5931\u6548" });
      let size = 0;
      const chunks = [];
      for await (const chunk of request) {
        size += chunk.length;
        if (size > MAX_BODY_BYTES) return reply(413, { error: "\u8BB0\u5FC6\u8BF7\u6C42\u8FC7\u5927" });
        chunks.push(chunk);
      }
      const { action, args = {} } = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      assertMemoryAction(action);
      if (!args || typeof args !== "object" || Array.isArray(args)) throw new Error("\u53C2\u6570\u5FC5\u987B\u662F\u5BF9\u8C61");
      const actor = { kind: "agent", sessionId };
      const onDemandGuidance = action === "guidance.read";
      const novelId = onDemandGuidance ? await this.boundNovelOptional(sessionId, args.novelId) : await this.boundNovel(sessionId, args.novelId);
      if (!onDemandGuidance && !novelId) throw new Error("\u5F53\u524D\u4F1A\u8BDD\u5C1A\u672A\u7ED1\u5B9A\u5C0F\u8BF4");
      if (args.novelId && novelId && args.novelId !== novelId) throw new Error("\u4E0D\u80FD\u8BBF\u95EE\u5176\u4ED6\u5C0F\u8BF4");
      const { sessionId: _session, actor: _actor, ...safeArgs } = args;
      const result = await this.dispatch(action, { ...safeArgs, ...novelId ? { novelId } : {} }, actor);
      reply(200, { result });
    } catch (error) {
      reply(400, { error: error.message, diagnostic: errorInfo(error) });
    }
  }
  async boundNovel(sessionId, requested) {
    if (this.resolveNovel) return this.resolveNovel(sessionId, requested);
    const binding = await this.store.dispatch("binding.get", {}, { kind: "agent", sessionId });
    if (requested && binding?.novelId !== requested) throw new Error("\u4E0D\u80FD\u8BBF\u95EE\u5176\u4ED6\u5C0F\u8BF4");
    return binding?.novelId;
  }
  async boundNovelOptional(sessionId, requested) {
    if (requested) return this.boundNovel(sessionId, requested);
    if (this.resolveBinding) {
      const binding2 = await this.resolveBinding(sessionId);
      return binding2?.activeNovelId || binding2?.novelId || null;
    }
    const binding = await this.store.dispatch("binding.get", {}, { kind: "agent", sessionId });
    return binding?.activeNovelId || binding?.novelId || null;
  }
  async connection(sessionId) {
    if (!sessionId || typeof sessionId !== "string") throw new Error("\u7F3A\u5C11\u4F1A\u8BDD ID");
    await this.start();
    const existing = this.sessions.get(sessionId);
    if (existing) return existing.pending ?? existing;
    const entry = { pending: null };
    entry.pending = this.connect(sessionId, entry);
    this.sessions.set(sessionId, entry);
    try {
      return await entry.pending;
    } catch (error) {
      if (this.sessions.get(sessionId) === entry) this.sessions.delete(sessionId);
      throw error;
    }
  }
  async connect(sessionId, entry) {
    const token = randomBytes(32).toString("hex");
    this.tokens.set(token, sessionId);
    const env = { ...this.runtimeEnv, CUIGENGJI_MEMORY_ENDPOINT: this.endpoint, CUIGENGJI_MEMORY_TOKEN: token };
    const transport = new StdioClientTransport({
      command: this.nodeCommand,
      args: [fileURLToPath(new URL("./server.js", import.meta.url))],
      env,
      stderr: "pipe"
    });
    const client = new Client({ name: "cuigengji-host", version: "0.1.0" });
    transport.stderr?.on("data", () => {
    });
    client.onclose = () => {
      this.tokens.delete(token);
      if (this.sessions.get(sessionId) === entry) this.sessions.delete(sessionId);
    };
    try {
      await client.connect(transport);
      return { client, transport, token };
    } catch (error) {
      this.tokens.delete(token);
      await transport.close().catch(() => {
      });
      throw error;
    }
  }
  async call(sessionId, action, args = {}, { signal } = {}) {
    assertMemoryAction(action);
    if (signal?.aborted) throw signal.reason ?? new Error("\u5DF2\u53D6\u6D88");
    const { client } = await this.connection(sessionId);
    const result = await client.callTool({ name: toolName(action), arguments: args }, void 0, {
      timeout: this.timeoutMs,
      signal
    });
    const output = result.content?.find((item) => item.type === "text")?.text;
    if (result.isError) {
      const diagnostic = result.structuredContent?.error;
      throw Object.assign(new Error(output ?? "\u8BB0\u5FC6\u5DE5\u5177\u5931\u8D25"), diagnostic && typeof diagnostic.code === "string" ? { code: diagnostic.code, details: diagnostic.details || {} } : {});
    }
    return JSON.parse(output ?? "null");
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
    await Promise.allSettled([...this.sessions.keys()].map((sessionId) => this.disconnect(sessionId)));
    this.tokens.clear();
    if (this.server) {
      this.server.closeAllConnections();
      await new Promise((resolve) => this.server.close(resolve));
    }
  }
}
class MemoryClient {
  constructor(bridge, sessionId) {
    this.bridge = bridge;
    this.sessionId = sessionId;
  }
  call(action, args, options) {
    return this.bridge.call(this.sessionId, action, args, options);
  }
  close() {
    return this.bridge.disconnect(this.sessionId);
  }
}
export {
  MemoryBridge,
  MemoryClient,
  memoryRuntime
};

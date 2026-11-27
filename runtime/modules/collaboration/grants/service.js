import { randomBytes, randomUUID, createHash } from "node:crypto";
import { readFile, writeFile, mkdir, rename, appendFile, unlink } from "node:fs/promises";
import { join, resolve } from "node:path";
import { AtomicStore } from "../../../platform/files/atomic-store.js";
import { parseJsonFile } from "../../../platform/files/json-file.js";
import { QUERY_CAPABILITIES, READER_MODULES, queryAllowed } from "../../workspace/queries/catalog.js";
import { errorInfo } from "../../../platform/errors.js";
import { grantLevels, parseLevels } from "./permissions.js";
import { grantWrites } from "./writes.js";
function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}
const hash = (value) => createHash("sha256").update(value).digest("hex");
const uuid = (value) => typeof value === "string" && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const empty = () => ({ format: "cuigengji-external", version: 1, profiles: {} });
const validModules = (value) => Array.isArray(value) && value.length <= READER_MODULES.length && new Set(value).size === value.length && value.every((id) => READER_MODULES.includes(id));
const validBooks = (value) => Array.isArray(value) && value.length > 0 && new Set(value).size === value.length && value.every((id) => typeof id === "string" && id.length > 0 && id.length <= 512);
function validate(value) {
  const config = value;
  if (config?.format !== "cuigengji-external" || config.version !== 1 || !config.profiles || typeof config.profiles !== "object" || Array.isArray(config.profiles)) fail("EXTERNAL_CONFIG_INVALID", "\u5916\u90E8\u8FDE\u63A5\u914D\u7F6E\u65E0\u6548");
  if (config.creations !== void 0 && (!config.creations || typeof config.creations !== "object" || Array.isArray(config.creations) || Object.entries(config.creations).some(([key, v]) => !v || !/^[a-f0-9]{64}$/.test(key) || !uuid(v.id) || !/^[a-f0-9]{64}$/.test(v.signature)))) fail("EXTERNAL_CONFIG_INVALID", "\u8FDE\u63A5\u521B\u5EFA\u8BB0\u5F55\u65E0\u6548");
  for (const p of Object.values(config.profiles)) if (p?.writableModules !== void 0 && (!validModules(p.writableModules) || !validModules(p.modules) || p.writableModules.some((m) => !p.modules.includes(m)) || p.task)) fail("EXTERNAL_CONFIG_INVALID", "\u5916\u90E8\u8FDE\u63A5\u5199\u6743\u9650\u65E0\u6548");
  for (const [id, p] of Object.entries(config.profiles)) if (!uuid(id) || p.id !== id || typeof p.name !== "string" || !p.name.trim() || typeof p.enabled !== "boolean" || !Number.isSafeInteger(p.revision) || p.revision < 1 || !validModules(p.modules) || p.novelIds != null && !validBooks(p.novelIds) || typeof p.libraryRoot !== "string" || !/^[a-f0-9]{64}$/.test(p.tokenHash) || p.task !== void 0 && p.task !== true) fail("EXTERNAL_CONFIG_INVALID", "\u5916\u90E8\u8FDE\u63A5\u6761\u76EE\u65E0\u6548");
}
async function saveJson(path, value) {
  await mkdir(resolve(path, ".."), { recursive: true, mode: 448 });
  const stage = path + "." + randomUUID() + ".tmp";
  try {
    await writeFile(stage, JSON.stringify(value, null, 2), { flag: "wx", mode: 384 });
    await rename(stage, path);
  } finally {
    await unlink(stage).catch((error) => {
      if (error.code !== "ENOENT") throw error;
    });
  }
}
class ExternalAccess {
  libraries;
  options;
  config;
  transport;
  starting;
  endpoint = "";
  readers = /* @__PURE__ */ new Map();
  queues = /* @__PURE__ */ new Map();
  closed = false;
  constructor(libraries, options, transport) {
    this.libraries = libraries;
    this.options = options;
    this.config = new AtomicStore(options.root, empty, validate);
    this.transport = transport((token) => this.authorize(token));
  }
  async configured(work) {
    const release = await this.config.acquire();
    try {
      return await work(await this.config.load());
    } finally {
      await release();
    }
  }
  connectionFile(id) {
    return join(this.options.root, "connections", id + ".json");
  }
  readerFile(id) {
    return join(this.options.root, "sessions", id + ".json");
  }
  async writeConnection(profile, token) {
    const file = this.connectionFile(profile.id);
    let previous;
    if (!token) {
      try {
        previous = parseJsonFile(await readFile(file, "utf8"), file);
      } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
      }
    }
    await saveJson(file, { format: "cuigengji-mcp-connection", version: 1, profileId: profile.id, endpoint: this.endpoint, token: token || previous.token, readOnly: !profile.writableModules?.length });
  }
  async start() {
    if (this.closed) fail("EXTERNAL_CLOSED", "\u5916\u90E8\u8FDE\u63A5\u670D\u52A1\u5DF2\u5173\u95ED");
    if (this.starting) return this.starting;
    this.starting = (async () => {
      try {
        await readFile(this.config.file);
      } catch (error) {
        if (error.code === "ENOENT") return;
        throw error;
      }
      const enabled = await this.configured(async (config) => Object.values(config.profiles).some((p) => p.enabled && !p.task));
      if (!enabled) return;
      await this.listen();
      await this.configured(async (config) => {
        for (const profile of Object.values(config.profiles).filter((p) => p.enabled && !p.task)) await this.writeConnection(profile);
      });
    })();
    try {
      await this.starting;
    } finally {
      this.starting = void 0;
    }
  }
  async listen() {
    this.endpoint = await this.transport.listen();
  }
  presentation(profile) {
    const file = this.connectionFile(profile.id), environment = this.options.environment || {};
    const suffix = Buffer.from(profile.id.replaceAll("-", ""), "hex").toString("base64url");
    const serverName = "cg_read_" + suffix;
    const server = {
      command: this.options.command || process.execPath,
      args: [this.options.connectorPath, "--connection", file],
      ...Object.keys(environment).length ? { env: environment } : {}
    };
    return {
      id: profile.id,
      name: profile.name,
      revision: profile.revision,
      enabled: profile.enabled,
      active: profile.enabled && resolve(profile.libraryRoot) === resolve(this.libraries.current.store.root),
      modules: profile.modules,
      permissions: grantLevels(profile.modules, profile.writableModules),
      novelIds: profile.novelIds ?? null,
      libraryRoot: profile.libraryRoot,
      createdAt: profile.createdAt,
      connectionFile: file,
      serverName,
      clientConfig: { mcpServers: { [serverName]: server } }
    };
  }
  async status() {
    return this.configured(async (config) => {
      const profiles = Object.values(config.profiles).filter((p) => !p.task);
      return { mode: profiles.some((p) => p.enabled && p.writableModules?.length) ? "read-write" : "read-only", libraryRoot: this.libraries.current.store.root, modules: READER_MODULES, profiles: profiles.map((p) => this.presentation(p)) };
    });
  }
  async checkBooks(novelIds, libraryRoot) {
    if (resolve(libraryRoot) !== resolve(this.libraries.current.store.root)) fail("LIBRARY_CHANGED", "\u8BF7\u5207\u56DE\u6B64\u8FDE\u63A5\u6240\u5C5E\u7684\u4F5C\u54C1\u5E93\uFF0C\u518D\u8C03\u6574\u4F5C\u54C1\u8303\u56F4");
    if (novelIds === null) return;
    if (!validBooks(novelIds)) return fail("INVALID_INPUT", "\u8BF7\u9009\u62E9\u81F3\u5C11\u4E00\u90E8\u4F5C\u54C1\uFF0C\u6216\u660E\u786E\u9009\u62E9\u6574\u4E2A\u4F5C\u54C1\u5E93");
    const result = await this.libraries.current.queries.query("novel.list", { limit: 1 }, { id: "connection-manager", presets: {} }, [], { novelIds });
    if (result.total !== novelIds.length) fail("NOT_FOUND", "\u6240\u9009\u4F5C\u54C1\u5DF2\u79FB\u9664\u6216\u4E0D\u5C5E\u4E8E\u5F53\u524D\u4F5C\u54C1\u5E93\uFF0C\u8BF7\u5237\u65B0\u4F5C\u54C1\u5217\u8868");
  }
  async create(args, issuer = "author") {
    if (typeof args.name !== "string" || !args.name.trim() || args.name.length > 100) fail("INVALID_INPUT", "\u8BF7\u586B\u5199\u8FDE\u63A5\u540D\u79F0\uFF08\u6700\u591A 100 \u5B57\u7B26\uFF09");
    if (args.permissions !== void 0 && args.modules !== void 0) fail("INVALID_INPUT", "permissions \u548C\u65E7\u7248 modules \u53EA\u80FD\u63D0\u4F9B\u4E00\u9879");
    if (args.permissions !== void 0 && args.novelIds === void 0) fail("INVALID_INPUT", "\u8BF7\u63D0\u4F9B novelIds\uFF1B\u53EA\u6709\u9009\u62E9\u6574\u4E2A\u5E93\u65F6\u624D\u4F20 null");
    const access = args.permissions !== void 0 ? parseLevels(args.permissions, grantLevels([])) : { modules: args.modules ?? [...READER_MODULES], writableModules: [] };
    if (!validModules(access.modules)) fail("INVALID_INPUT", "\u67E5\u8BE2\u6A21\u5757\u65E0\u6548");
    return this.configured(async (config) => {
      const libraryRoot = resolve(this.libraries.current.store.root);
      const request = typeof args.requestId === "string" && args.requestId.trim() ? hash(JSON.stringify([issuer, libraryRoot, args.requestId])) : null;
      const signature = hash(JSON.stringify([args.name.trim(), args.novelIds ?? null, access]));
      const receipt = request && config.creations?.[request];
      if (receipt) {
        if (receipt.signature !== signature) fail("REQUEST_ID_REUSED", "\u76F8\u540C\u521B\u5EFA\u8BF7\u6C42\u53F7\u5DF2\u7ECF\u7528\u4E8E\u53E6\u4E00\u4EFD\u6388\u6743");
        const existing = config.profiles[receipt.id];
        if (!existing) fail("NOT_FOUND", "\u8FD9\u6761\u8FDE\u63A5\u5DF2\u5220\u9664\uFF1B\u8BF7\u91CD\u65B0\u53D1\u8D77\u521B\u5EFA\u8BF7\u6C42");
        return this.presentation(existing);
      }
      if (Object.values(config.profiles).filter((p) => p.enabled && !p.task).length >= 32) fail("EXTERNAL_LIMIT", "\u6700\u591A\u540C\u65F6\u542F\u7528 32 \u4E2A\u5916\u90E8\u8FDE\u63A5");
      await this.checkBooks(args.novelIds ?? null, libraryRoot);
      const token = randomBytes(32).toString("hex"), profile = { id: randomUUID(), name: args.name.trim(), revision: 1, enabled: true, ...access, novelIds: args.novelIds ?? null, libraryRoot, tokenHash: hash(token), createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      await this.listen();
      await this.writeConnection(profile, token);
      config.profiles[profile.id] = profile;
      if (request) (config.creations ??= {})[request] = { id: profile.id, signature };
      await this.config.save(config);
      return this.presentation(profile);
    });
  }
  async update(args) {
    return this.configured(async (config) => {
      const profile = uuid(args.id) && config.profiles[args.id];
      if (!profile || profile.task) fail("NOT_FOUND", "\u5916\u90E8\u8FDE\u63A5\u4E0D\u5B58\u5728");
      if (profile.revision !== args.expectedRevision) fail("CONFLICT", "\u8FDE\u63A5\u914D\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");
      if (args.modules !== void 0 && !validModules(args.modules)) fail("INVALID_INPUT", "\u67E5\u8BE2\u6A21\u5757\u65E0\u6548");
      if (args.enabled !== void 0 && typeof args.enabled !== "boolean") fail("INVALID_INPUT", "enabled \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
      if (args.name !== void 0 && (typeof args.name !== "string" || !args.name.trim() || args.name.length > 100)) fail("INVALID_INPUT", "\u8FDE\u63A5\u540D\u79F0\u65E0\u6548");
      if (args.novelIds !== void 0) {
        await this.checkBooks(args.novelIds, profile.libraryRoot);
        profile.novelIds = args.novelIds;
      }
      if (args.permissions !== void 0 && args.modules !== void 0) fail("INVALID_INPUT", "permissions \u548C\u65E7\u7248 modules \u53EA\u80FD\u63D0\u4F9B\u4E00\u9879");
      if (args.permissions !== void 0) Object.assign(profile, parseLevels(args.permissions, grantLevels(profile.modules, profile.writableModules)));
      if (args.modules !== void 0) {
        profile.modules = [...args.modules];
        profile.writableModules = profile.writableModules?.filter((m) => profile.modules.includes(m));
      }
      if (args.enabled !== void 0) profile.enabled = args.enabled;
      if (args.name !== void 0) profile.name = args.name.trim();
      profile.revision++;
      if (profile.enabled) await this.listen();
      await this.writeConnection(profile);
      await this.config.save(config);
      return this.presentation(profile);
    });
  }
  async revoke(args) {
    return this.configured(async (config) => {
      const profile = uuid(args.id) && config.profiles[args.id];
      if (!profile || profile.task) fail("NOT_FOUND", "\u5916\u90E8\u8FDE\u63A5\u4E0D\u5B58\u5728");
      if (profile.revision !== args.expectedRevision) fail("CONFLICT", "\u8FDE\u63A5\u914D\u7F6E\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u5237\u65B0\u540E\u91CD\u8BD5");
      delete config.profiles[profile.id];
      await this.config.save(config);
      await unlink(this.connectionFile(profile.id)).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
      return { id: profile.id, revoked: true };
    });
  }
  async records(args = {}) {
    if (!uuid(args.id)) fail("INVALID_INPUT", "\u8BF7\u9009\u62E9\u4E00\u4E2A\u8FDE\u63A5");
    await this.configured(async (config) => {
      const profile = config.profiles[args.id];
      if (!profile || profile.task) fail("NOT_FOUND", "\u8FDE\u63A5\u4E0D\u5B58\u5728");
    });
    const path = join(this.options.root, "audit", args.id + ".jsonl");
    const text = await readFile(path, "utf8").catch((error) => {
      if (error.code === "ENOENT") return "";
      throw error;
    });
    return { items: text.trim().split("\n").filter(Boolean).slice(-Math.min(200, Math.max(1, args.limit || 50))).map((line) => JSON.parse(line)).reverse() };
  }
  async authorize(token) {
    if (!/^[a-f0-9]{64}$/.test(token)) fail("UNAUTHORIZED", "\u9700\u8981\u6709\u6548\u7684\u5916\u90E8\u8FDE\u63A5");
    const profile = await this.configured(async (config) => {
      const match = Object.values(config.profiles).find((p) => !p.task && p.enabled && p.tokenHash === hash(token));
      if (!match) fail("UNAUTHORIZED", "\u5916\u90E8\u8FDE\u63A5\u5DF2\u64A4\u9500\u6216\u505C\u7528");
      return structuredClone(match);
    });
    return { invoke: async (operation, body) => {
      const mode = profile.writableModules?.length ? "read-write" : "read-only";
      if (operation === "capabilities") return { mode, name: profile.name, modules: profile.modules, writableModules: profile.writableModules ?? [], profileId: profile.id };
      if (operation === "open") return this.open(profile, body);
      if (operation === "query") return this.query(profile, body);
      if (operation === "write") return this.write(profile, body);
      if (operation !== "status") fail("READ_ONLY", "\u6B64\u8FDE\u63A5\u672A\u5F00\u653E\u8BE5\u5165\u53E3");
      const reader = await this.reader(profile, body.readerSessionId);
      return {
        readerSessionId: reader.id,
        label: reader.label,
        client: reader.client,
        mode,
        modules: profile.modules,
        permissions: grantLevels(profile.modules, profile.writableModules),
        presets: Object.fromEntries(Object.entries(reader.presets).filter(([id]) => profile.modules.includes("guidance") && (!profile.novelIds || profile.novelIds.includes(id))).map(([id, p]) => [id, { revision: p.revision, name: p.name, enabled: p.enabled }]))
      };
    } };
  }
  async reader(profile, id) {
    if (!uuid(id)) fail("READER_REQUIRED", "\u8BF7\u5148\u521B\u5EFA\u5916\u90E8\u9605\u8BFB\u4F1A\u8BDD");
    let reader = this.readers.get(id);
    if (!reader) {
      const path = this.readerFile(id);
      const saved = await readFile(path, "utf8").catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (!saved) fail("READER_REQUIRED", "\u9605\u8BFB\u4F1A\u8BDD\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u5EFA\u7ACB\u8FDE\u63A5");
      reader = parseJsonFile(saved, path);
      this.readers.set(id, reader);
    }
    if (reader.id !== id || reader.profileId !== profile.id || reader.libraryRoot !== profile.libraryRoot || !reader.presets || typeof reader.presets !== "object" || Array.isArray(reader.presets)) fail("UNAUTHORIZED", "\u9605\u8BFB\u4F1A\u8BDD\u4E0D\u5C5E\u4E8E\u6B64\u8FDE\u63A5");
    reader.save = () => {
      const { save, ...stored } = reader;
      return saveJson(this.readerFile(reader.id), stored);
    };
    return reader;
  }
  async open(profile, args) {
    const reader = { id: randomUUID(), profileId: profile.id, libraryRoot: profile.libraryRoot, label: typeof args.label === "string" ? args.label.slice(0, 100) : "\u72EC\u7ACB\u9605\u8BFB\u4F1A\u8BDD", client: typeof args.client === "string" ? args.client.slice(0, 160) : "MCP client", createdAt: (/* @__PURE__ */ new Date()).toISOString(), presets: {} };
    await saveJson(this.readerFile(reader.id), reader);
    this.readers.set(reader.id, reader);
    return { readerSessionId: reader.id, mode: profile.writableModules?.length ? "read-write" : "read-only", modules: profile.modules, libraryRoot: profile.libraryRoot, presetPolicy: "\u672C\u9605\u8BFB\u4F1A\u8BDD\u9996\u6B21\u8BFB\u53D6\u65F6\u56FA\u5B9A\u9884\u8BBE\uFF0C\u65B0\u4EFB\u52A1\u53EF reader.open \u521B\u5EFA\u72EC\u7ACB\u4F1A\u8BDD" };
  }
  async withReader(id, work) {
    const previous = this.queues.get(id) || Promise.resolve(), pending = previous.catch(() => {
    }).then(work);
    this.queues.set(id, pending);
    try {
      return await pending;
    } finally {
      if (this.queues.get(id) === pending) this.queues.delete(id);
    }
  }
  async log(profile, readerId, action, args, result, error, started) {
    const identifier = (value) => typeof value === "string" ? value.slice(0, 512) : void 0;
    const resources = action === "context.readMany" && Array.isArray(result?.items) ? result.items.map((item) => ({
      kind: item.kind,
      id: item.id,
      revision: item.revision,
      start: item.start,
      end: item.end,
      ok: item.ok,
      code: item.error?.code
    })) : void 0;
    const metadata = { ...resources ? { resources } : {}, time: (/* @__PURE__ */ new Date()).toISOString(), actor: "external-agent", profileId: profile.id, ...readerId ? { readerSessionId: readerId } : {}, action: action.slice(0, 120), novelId: identifier(args.novelId), resourceId: identifier(args.chapterId) || identifier(args.nodeId) || identifier(args.edgeId), revision: result?.revision ?? result?.node?.revision ?? result?.sequence, start: result?.start, end: result?.end, returnedChars: typeof result?.content === "string" ? result.content.length : void 0, items: Array.isArray(result?.items) ? result.items.length : void 0, ok: !error, ...error ? { code: errorInfo(error).code } : {}, durationMs: Date.now() - started };
    const dir = join(this.options.root, "audit");
    await mkdir(dir, { recursive: true, mode: 448 });
    await appendFile(join(dir, profile.id + ".jsonl"), JSON.stringify(metadata) + "\n", { mode: 384 });
  }
  async query(profile, body) {
    const action = typeof body.action === "string" ? body.action : "", args = body.args && typeof body.args === "object" && !Array.isArray(body.args) ? body.args : {};
    const started = Date.now();
    let result, error, reader;
    try {
      const capability = QUERY_CAPABILITIES.find((value) => value.id === action);
      if (!capability) fail("READ_ONLY", "\u5F53\u524D\u67E5\u8BE2\u5165\u53E3\u4EC5\u63A5\u53D7\u5DF2\u5F00\u653E\u7684\u67E5\u9605\u5DE5\u5177");
      if (!profile.modules.length || !queryAllowed(capability, profile.modules)) fail("CAPABILITY_DENIED", "\u6B64\u8FDE\u63A5\u672A\u5F00\u653E\u8BE5\u67E5\u8BE2\u6A21\u5757");
      if (!uuid(body.readerSessionId)) fail("READER_REQUIRED", "\u8BF7\u5148\u521B\u5EFA\u5916\u90E8\u9605\u8BFB\u4F1A\u8BDD");
      result = await this.withReader(body.readerSessionId, () => this.libraries.use(async () => {
        reader = await this.reader(profile, body.readerSessionId);
        if (resolve(this.libraries.current.store.root) !== resolve(profile.libraryRoot)) fail("LIBRARY_CHANGED", "DSH \u5DF2\u5207\u6362\u4F5C\u54C1\u5E93\uFF1B\u6B64\u8FDE\u63A5\u4ECD\u53EA\u6388\u6743\u539F\u4F5C\u54C1\u5E93\uFF0C\u8BF7\u5207\u56DE\u6216\u4E3A\u65B0\u4F5C\u54C1\u5E93\u521B\u5EFA\u8FDE\u63A5");
        const status = await this.libraries.current.maintenance.status();
        if (status.status !== "ready") fail("READ_ONLY_NOT_READY", "\u8BF7\u5148\u5728 DSH \u4E2D\u5B8C\u6210\u4F5C\u54C1\u5E93\u68C0\u67E5");
        return this.libraries.current.queries.query(action, args, reader, profile.modules, { novelIds: profile.novelIds, writableModules: profile.writableModules });
      }));
      await this.configured(async (config) => {
        const current = config.profiles[profile.id];
        if (!current?.enabled || current.tokenHash !== profile.tokenHash || current.revision !== profile.revision) fail("CAPABILITY_CHANGED", "\u67E5\u8BE2\u671F\u95F4\u8FDE\u63A5\u6743\u9650\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u67E5\u8BE2");
      });
      return result;
    } catch (failure) {
      error = failure;
      throw failure;
    } finally {
      await this.log(profile, reader?.id, action, args, result, error, started);
    }
  }
  async write(profile, body) {
    const action = typeof body.action === "string" ? body.action : "", started = Date.now();
    let result, error, readerId;
    try {
      result = await this.libraries.use(() => this.configured(async (config) => {
        const live = config.profiles[profile.id];
        if (!live?.enabled || live.tokenHash !== profile.tokenHash) fail("UNAUTHORIZED", "\u8FDE\u63A5\u5DF2\u505C\u7528\u6216\u64A4\u9500");
        const command = grantWrites.find((c) => c.action === action);
        if (!command || !live.writableModules?.includes(command.module)) return fail("READ_ONLY", "\u6B64\u8FDE\u63A5\u672A\u5F00\u653E\u8FD9\u9879\u5199\u5165");
        if (resolve(live.libraryRoot) !== resolve(this.libraries.current.store.root)) fail("LIBRARY_CHANGED", "\u8BF7\u5207\u56DE\u6B64\u8FDE\u63A5\u6240\u5C5E\u4F5C\u54C1\u5E93");
        const parsed = command.input.safeParse(body.args);
        if (!parsed.success) return fail("INVALID_INPUT", parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("\uFF1B"));
        const args = parsed.data;
        if (live.novelIds && !live.novelIds.includes(args.novelId)) fail("CAPABILITY_DENIED", "\u8FD9\u90E8\u4F5C\u54C1\u672A\u6388\u6743\u7ED9\u6B64\u8FDE\u63A5");
        readerId = (await this.reader(live, body.readerSessionId)).id;
        await this.libraries.current.maintenance.ensureReady();
        return this.libraries.current.store.dispatch(action, { ...args, requestId: hash(JSON.stringify([live.id, args.novelId, args.requestId])) }, { kind: "agent", sessionId: "external:" + live.id });
      }));
      return result;
    } catch (cause) {
      error = cause;
      throw cause;
    } finally {
      await this.log(profile, readerId, action, body.args ?? {}, result, error, started);
    }
  }
  async close() {
    this.closed = true;
    await this.transport.close();
    this.readers.clear();
  }
}
export {
  ExternalAccess
};

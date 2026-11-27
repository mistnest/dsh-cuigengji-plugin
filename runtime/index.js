import { manageConnections } from "./modules/access/dsh/connections.js";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import z from "@deepseek-ai/schemastery";
import { MemoryBridge } from "./modules/access/mcp/client.js";
import { registerSkills } from "./modules/access/guidance/skills.js";
import { registerTools } from "./modules/access/dsh/tools.js";
import { registerPrompt } from "./modules/access/guidance/prompt.js";
import { readGuidance } from "./modules/access/guidance/read.js";
import { createSessionPolicy } from "./modules/access/dsh/session-policy.js";
import { registerRpcRoute } from "./modules/access/rpc/route.js";
import { LibraryService } from "./composition/library-runtime.js";
import { registerConversationActivity } from "./modules/access/dsh/conversation-activity.js";
import { DesktopPet } from "./modules/author-ui/desktop/desktop.js";
import { UsageService } from "./modules/usage/reports/service.js";
import { registerUsage } from "./modules/access/dsh/usage.js";
import { createExternalAccess } from "./composition/external-reader.js";
import { fileURLToPath } from "node:url";
const name = "cuigengji";
const inject = ["tools", "systemPrompt", "skills", "connection"];
const Config = z.object({
  dataRoot: z.string().default("").volatile(),
  recentLibraries: z.array(z.string()).default([]).volatile(),
  usageRoot: z.string().default("").volatile(),
  externalRoot: z.string().default("").volatile()
});
function defaultDataRoot() {
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA || homedir(), "cuigengji");
  return join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "cuigengji");
}
function configured(value) {
  if (value && typeof value === "object" && "get" in value) return value.get();
  return value;
}
async function apply(ctx, config = {}) {
  const recentLibraries = configured(config.recentLibraries) || [];
  const root = configured(config.dataRoot) || process.env.CUIGENGJI_DATA_ROOT || recentLibraries[0] || defaultDataRoot();
  const configEditor = ctx.get?.("configEditor");
  const editConfig = async (change) => {
    if (!configEditor) throw new Error("\u5BBF\u4E3B\u914D\u7F6E\u670D\u52A1\u4E0D\u53EF\u7528");
    const matches = configEditor.entries().filter((entry) => entry.options.name === "dsh-cuigengji-plugin" || entry.moduleNamespace?.apply === apply);
    if (matches.length !== 1) throw new Error("\u65E0\u6CD5\u552F\u4E00\u5B9A\u4F4D\u50AC\u66F4\u59EC\u63D2\u4EF6\u914D\u7F6E\uFF0C\u672A\u5207\u6362\u4F5C\u54C1\u5E93");
    await configEditor.edit(matches[0], change);
  };
  const libraries = new LibraryService(root, { recent: recentLibraries, persist: configEditor ? async (dataRoot, recentLibraries2) => {
    await editConfig((current) => ({ ...current, dataRoot, recentLibraries: recentLibraries2 }));
  } : void 0 });
  const store = libraries.proxy("store"), maintenance = libraries.proxy("maintenance");
  const audit = (sessionId, value) => store.appendSessionAudit(sessionId, value);
  const sessionPolicy = createSessionPolicy({ store, audit, ready: () => maintenance.ensureReady() });
  const externalRoot = configured(config.externalRoot) || process.env.CUIGENGJI_EXTERNAL_ROOT || join(process.env.DSH_HOME || join(homedir(), ".dsh"), "cuigengji", "external");
  const dispatch = (action, args, actor) => libraries.use(async () => {
    if (action.startsWith("external.")) {
      if (action === "external.create") await maintenance.ensureReady();
      return manageConnections(external, action, args, actor.sessionId);
    }
    return sessionPolicy.dispatch(action, args, actor);
  });
  const guidanceDispatch = (action, args, actor) => libraries.use(async () => {
    return action === "guidance.read" ? readGuidance({ store, actor, resolveBinding: sessionPolicy.resolveBinding, section: args?.section, novelId: args?.novelId }) : sessionPolicy.dispatch(action, args, actor);
  });
  const memory = new MemoryBridge(store, { dispatch: guidanceDispatch, resolveNovel: (...args) => libraries.use(() => sessionPolicy.resolveNovel(...args)), resolveBinding: (...args) => libraries.use(() => sessionPolicy.resolveBinding(...args)) });
  const workData = libraries.proxy("workData");
  const usageRoot = configured(config.usageRoot) || process.env.CUIGENGJI_USAGE_ROOT || join(process.env.DSH_HOME || join(homedir(), ".dsh"), "cuigengji", "usage");
  const usage = new UsageService(usageRoot, ctx);
  const external = createExternalAccess(libraries, { root: externalRoot, connectorPath: fileURLToPath(new URL("./modules/access/mcp/external-server.js", import.meta.url)), environment: process.versions["electron"] || process.env.ELECTRON_RUN_AS_NODE === "1" ? { ELECTRON_RUN_AS_NODE: "1" } : {} });
  ctx.effect(() => () => external.close());
  let pet = new DesktopPet(store.root, dispatch, { usage });
  const desktopPet = { sync: (args) => pet.sync(args) };
  libraries.configure({ busy: sessionPolicy.isWriting, changed: async () => {
    await Promise.all([...memory.sessions.keys()].map((id) => memory.disconnect(id)));
    await pet.close();
    pet = new DesktopPet(store.root, dispatch, { usage });
    sessionPolicy.clearFocusCache();
  } });
  ctx.effect(() => () => pet.close());
  registerRpcRoute(ctx, { dispatch, get dataRoot() {
    return store.root;
  }, workData, transfer: libraries.proxy("transfer"), maintenance, desktopPet, libraries, usage, external });
  registerUsage(ctx, usage);
  const opened = await maintenance.start();
  await memory.start();
  await external.start().catch((error) => ctx.logger?.warn?.("cuigengji external reader: " + error.message));
  ctx.effect(() => () => memory.close());
  ctx.provide("cuigengji", { store, dispatch, memory, maintenance, libraries, external });
  registerConversationActivity(ctx, libraries);
  registerSkills(ctx);
  registerPrompt(ctx, {
    store,
    resolveBinding: sessionPolicy.resolveBinding,
    readPromptState: sessionPolicy.readPromptState,
    use: (fn) => libraries.use(fn)
  });
  registerTools(ctx, { libraries, dispatch, guidanceDispatch, maintenance });
  sessionPolicy.register(ctx, memory);
  if (opened.status === "ready" && configEditor && !recentLibraries.some((path) => relative(path, opened.dataRoot) === "")) {
    void editConfig((current) => {
      if (libraries.current.store.root !== opened.dataRoot) return current;
      const recent = [.../* @__PURE__ */ new Set([opened.dataRoot, ...current.recentLibraries || []])].slice(0, 8);
      return { ...current, recentLibraries: recent };
    }).catch((error) => ctx.logger?.warn?.("\u65E0\u6CD5\u8BB0\u5F55\u6700\u8FD1\u7684\u4F5C\u54C1\u5E93\u76EE\u5F55\uFF1A" + (error instanceof Error ? error.message : String(error))));
  }
}
export {
  Config,
  apply,
  inject,
  name
};

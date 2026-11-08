import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, appendFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { MemoryBridge } from "./adapters/mcp/client.js";
import { registerSkills } from "./adapters/dsh/skills.js";
import { planningArgsSchema } from "./adapters/dsh/planning-schema.js";
import { memoryArgsSchema } from "./adapters/dsh/memory-schema.js";
import { storyArgsSchema } from "./adapters/dsh/story-schema.js";
import { registerPrompt } from "./adapters/dsh/prompt.js";
import { readGuidance, GUIDANCE_SECTIONS } from "./adapters/dsh/guidance.js";
import { createSessionPolicy } from "./application/bindings/session.js";
import { TOOL_ACTIONS as allowed, isReadAction } from "./contracts/actions.js";
import { registerRpcRoute } from "./adapters/dsh/rpc.js";
import { LibraryService } from "./application/libraries/service.js";
import { registerConversationActivity } from "./adapters/dsh/conversation-activity.js";
import { DesktopPet } from "./application/pet/desktop.js";
const name = "cuigengji";
const inject = ["tools", "systemPrompt", "skills", "connection"];
const Config = z.object({
  dataRoot: z.string().default("").volatile(),
  recentLibraries: z.array(z.string()).default([]).volatile()
});
const descriptions = {
  cuigengji_story: "\u8BFB\u53D6\u548C\u7EF4\u62A4\u539F\u751F\u5C0F\u8BF4\u521B\u4F5C\u5DE5\u4F5C\u53F0\u3002story.get \u8FD4\u56DE\u7B80\u62A5\u3001\u7AE0\u8282\u84DD\u56FE\u3001\u5DF2\u53D1\u751F\u4E8B\u5B9E\u8FFD\u8E2A\u3001\u4F0F\u7B14/\u4E0B\u7AE0\u627F\u8BFA/\u957F\u671F\u671F\u5F85/\u7EA6\u675F\u3001\u8BC1\u636E\u5BA1\u7A3F\u53CA\u7248\u672C\u8BCA\u65AD\uFF1Bstory.context.get \u6309\u7AE0\u8282\u548C\u5B57\u7B26\u9884\u7B97\u8FD4\u56DE\u5206\u79BB\u7684 plans/facts\uFF0C\u4E0D\u8BFB\u540E\u7EED\u6B63\u6587\u3002story.apply \u4F7F\u7528\u5DF2\u8BFB story.revision\u3001requestId\u3001operations \u539F\u5B50\u66F4\u65B0\uFF1B\u8FFD\u8E2A\u548C\u5BA1\u7A3F\u7ED1\u5B9A\u5F53\u524D\u6B63\u6587\u7248\u672C\u3002\u65B9\u6CD5\u4E0E\u5B8C\u6574\u64CD\u4F5C\u5B57\u6BB5\u901A\u8FC7 cuigengji_guidance \u7684 story \u6216 story-operations \u6309\u9700\u8BFB\u53D6\u3002\u6B64\u5DE5\u5177\u7EF4\u62A4\u521B\u4F5C\u8D44\u6599\uFF0C\u4E0D\u6539\u6B63\u6587\u6216\u4F1A\u8BDD\u7126\u70B9\u3002",
  cuigengji_project: "\u7BA1\u7406\u4F5C\u54C1\u5E93\u548C\u5377\u3001\u7AE0\u3001\u6B63\u6587\u3002\u6240\u6709\u4F1A\u8BDD\u5305\u62EC DSH \u539F\u751F\u5B50 Agent \u4F7F\u7528\u540C\u4E00\u5957\u4F5C\u54C1\u9009\u62E9\u89C4\u5219\uFF1Anovel.list \u67E5\u770B\u4F5C\u54C1\uFF0Cnovel.focus {novelId} \u8BB0\u4F4F\u672C\u4F1A\u8BDD\u5F53\u524D\u4F5C\u54C1\uFF0C\u6216\u5728\u5355\u6B21\u64CD\u4F5C\u663E\u5F0F\u63D0\u4F9B novelId\uFF1B\u4E92\u4E0D\u5207\u6362\u5176\u4ED6\u4F1A\u8BDD\u7684\u7126\u70B9\u3002novel.create {title,description?,requestId} \u521B\u5EFA\u7A7A\u767D\u4F5C\u54C1\uFF0C\u4E0D\u6539\u53D8\u7126\u70B9\u3002novel.handoff \u8FD4\u56DE\u4F5C\u54C1\u7D22\u5F15\u548C\u6709\u9650\u76EE\u5F55\uFF0C\u4E0D\u542B\u6B63\u6587\u3002chapter.get \u6309 start/maxChars \u8BFB\u53D6\u3002\u4FEE\u6539\u9700 expectedRevision\uFF0Cchapter.update \u7684 content/append/patch:{oldText,newText} \u4E09\u9009\u4E00\u3002\u5220\u9664 confirm:true\uFF1B\u975E\u7A7A\u5377\u8FD8\u9700 chapterPolicy:detach/delete\u3002",
  cuigengji_memory: "\u68C0\u7D22\u548C\u7EF4\u62A4\u5F53\u524D\u4F5C\u54C1\u7684\u8D44\u6E90\u5E93\u3002graph.groups \u8FD4\u56DE\u5D4C\u5957\u6587\u4EF6\u5939\u548C\u8DEF\u5F84\uFF0Cgraph.list {query?,type?,groupId?} \u641C\u7D22\u5F53\u524D\u6458\u8981\uFF0Cgraph.get {nodeId} \u6309\u9700\u8BFB\u5168\u6587\u3002\u6587\u4EF6\u5939\u5C31\u662F\u754C\u9762\u753B\u5E03\u8303\u56F4\uFF0C\u4EBA\u7269\u53EA\u6709\u4E00\u4EFD\u539F\u5361\uFF0C\u89C4\u5212\u7528 memoryRefs \u5F15\u7528\uFF1B\u6839\u76EE\u5F55\u53EF\u76F4\u63A5\u653E\u5361\u7247\u3002graph.group.create/update/delete \u7BA1\u7406\u5D4C\u5957\u6587\u4EF6\u5939\uFF0CparentId \u4E3A\u7236\u6587\u4EF6\u5939\uFF0C\u5220\u9664\u65F6\u5185\u5BB9\u4E0A\u79FB\u4FDD\u7559\u3002graph.move {groupId,members:[{id,expectedRevision}]} \u6539\u5F52\u7C7B\u4E0D\u6539\u6B63\u6587\u3001\u5173\u7CFB\u6216\u5750\u6807\uFF1Bgraph.arrange \u53EF\u6574\u7406\u6307\u5B9A members\u3002\u65E7\u5E93\u9996\u6B21\u6574\u7406\u53EF graph.workspace.ensure \u5C06\u65E7\u8BBE\u5B9A\u9875\u65E0\u635F\u6536\u8FDB\u6587\u4EF6\u5939\uFF0C\u65E7 page API \u4FDD\u7559\u517C\u5BB9\u3002edge.list {nodeId} \u67E5\u771F\u5B9E\u5173\u7CFB\uFF0Cedge.create {from,to,name?,content?} \u53EA\u8BB0\u5F55\u6709\u4F9D\u636E\u7684\u5173\u7CFB\u3002\u4EBA\u7269 character_card\uFF0C\u89C4\u5219/\u5730\u70B9/\u7EC4\u7EC7 world_entry\uFF1B\u68C0\u67E5 status/factType/sources/knownBy\uFF0C\u89C4\u5212\u610F\u56FE\u4E0D\u80FD\u5199\u6210\u5DF2\u53D1\u751F\u4E8B\u5B9E\u3002\u6BCF\u6B21\u4FEE\u6539\u7528 requestId \u548C expectedRevision\uFF0C\u51B2\u7A81\u91CD\u8BFB\u5408\u5E76\u3002\u666E\u901A\u68C0\u7D22\u53EA\u8BFB\u5F53\u524D\u7248\u672C\uFF0C\u4F5C\u8005\u8981\u6C42\u8FFD\u6EAF\u65F6\u624D graph.history\uFF0C\u6307\u5B9A revision \u548C includeContent:true \u624D\u8BFB\u67D0\u7248\u5168\u6587\uFF1Bgraph.restore \u751F\u6210\u65B0\u5F53\u524D\u7248\u672C\u3002\u56FE\u8C31\u6D4F\u89C8\u4E0D\u4F1A\u81EA\u52A8\u586B\u5165\u804A\u5929\u3002",
  cuigengji_plan: "\u4E0E\u4F5C\u8005\u5728\u5171\u4EAB\u5DE5\u4F5C\u53F0\u8BA8\u8BBA\u5267\u60C5\u3002\u8282\u70B9\u662F\u4E8B\u4EF6\u3001\u9009\u62E9\u6216\u9636\u6BB5\uFF0C\u4E0D\u662F\u7AE0\u8282\u3002\u7528 planning.pages/list/search \u5B9A\u4F4D\uFF0Cplanning.get {nodeId,resourceOffset?} \u8FD4\u56DE\u5168\u6587\u3001\u524D\u540E\u90BB\u5C45\u3001\u5B50\u60C5\u8282\u53CA\u6709\u9650\u5173\u8054\u8D44\u6E90\u6458\u8981\uFF08resources:items/total/nextOffset\uFF09\uFF0C\u56FE\u8C31\u5168\u6587\u6309\u9700 graph.get\u3002\u5177\u4F53\u63A8\u6F14\u65F6\u6838\u5BF9\u76F8\u5173\u5F53\u524D\u4EBA\u7269\u3001\u5730\u70B9\u548C\u89C4\u5219\uFF1B\u6CA1\u5173\u8054\u53EF\u6309\u540D\u5B57\u68C0\u7D22\u540E\u8865 memoryRefs\uFF0C\u4E0D\u5F3A\u5236\u6BCF\u8F6E\u91CD\u67E5\u6216\u62E6\u622A\u4FDD\u5B58\u3002node.parentId \u8868\u793A\u9636\u6BB5\u5305\u542B\u7684\u5B50\u60C5\u8282\uFF0C\u539F\u9636\u6BB5\u6458\u8981\u5C31\u662F\u6536\u7EB3\u6982\u62EC\uFF0C\u4E0D\u53E6\u5EFA\u91CD\u590D\u8BE6\u60C5\u9875\uFF1B\u56E0\u679C\u548C\u9009\u62E9\u7528 edge\uFF0C\u5305\u542B\u4E0D\u80FD\u4EE3\u66FF\u8FDE\u7EBF\u3002\u72EC\u7ACB\u7528\u9014\u53EF\u5F00 page\uFF0C\u540C\u4E00\u8BA8\u8BBA\u66F4\u65B0\u539F\u9875\u3002groupId \u81EA\u7531\u5F52\u7C7B\u5230\u5D4C\u5957\u6587\u4EF6\u5939\uFF0C\u4FBF\u7B7E\u8BB0\u5F55\u53F0\u8BCD\u548C\u672A\u51B3\u95EE\u9898\uFF1B\u65B0\u6536\u7EB3\u7528\u771F\u5B9E\u8282\u70B9\u5C42\u7EA7\u6216\u6587\u4EF6\u5939\uFF0C\u4E0D\u53E6\u7EF4\u62A4 frame.members\u3002\u4FEE\u6539\u7528 planning.apply {requestId,operations:[{op,id?,expectedRevision?,ref?,value}],reason} \u539F\u5B50\u63D0\u4EA4\uFF1B\u8BFB\u53D6\u6240\u5F97 ID/revision\uFF0C\u4E0D\u7F16\u9020\u5F15\u7528\u3002\u65B0\u589E\u53EF planning.layout \u81EA\u52A8\u5B89\u653E\uFF0Cmode:missing \u4FDD\u7559\u5DF2\u6709\u5E03\u5C40\uFF0C\u4F5C\u8005\u8981\u6C42\u6574\u7406\u624D all\u3002written \u53EA\u4EE3\u8868\u5DF2\u5B8C\u6574\u843D\u5B9E\u4E14\u6709 chapterRefs \u6B63\u6587\u7248\u672C\u8BC1\u636E\uFF0C\u672A\u91C7\u7528\u65B9\u6848\u53EF\u957F\u671F idea\uFF1B\u89C4\u5212\u4E0D\u81EA\u52A8\u6539\u4EBA\u7269\u4E8B\u5B9E\u3002",
  cuigengji_context: "binding.get \u67E5\u770B\u672C\u4F1A\u8BDD\u8BB0\u4F4F\u7684\u5F53\u524D\u4F5C\u54C1\uFF1B\u672A\u9009\u62E9\u65F6\u8FD4\u56DE null\uFF0C\u4E0D\u9650\u5236\u666E\u901A\u804A\u5929\u3002\u5F00\u542F\u5F53\u524D\u4F1A\u8BDD\u5199\u4F5C\u6307\u5F15\u65F6\uFF0C\u5F53\u524D\u4F5C\u54C1\u542F\u7528\u7684\u9884\u8BBE\u968F\u7CFB\u7EDF\u63D0\u793A\u8BCD\u63D0\u4F9B\uFF1B\u5173\u95ED\u65F6\u6216\u663E\u5F0F\u67E5\u5176\u4ED6\u4F5C\u54C1\u65F6\uFF0C\u7528 preset.read {novelId?} \u6838\u5BF9\u76EE\u6807\u4F5C\u54C1\u7684\u6709\u6548\u6587\u672C\u53CA revision\uFF0C\u4E0D\u8FD4\u56DE\u539F\u59CB\u5BFC\u5165\u6587\u4EF6\u3002context.get \u6309\u9700\u8BFB\u53D6\u76EE\u6807\u4F5C\u54C1\u7684\u6B63\u6587\u53C2\u8003\uFF1B\u4EBA\u7269\u3001\u89C4\u5212\u548C\u4E16\u754C\u8BBE\u5B9A\u5148\u68C0\u7D22\u6458\u8981\uFF0C\u518D\u8BFB\u53D6\u76F8\u5173\u5168\u6587\u3002"
};
function defaultDataRoot() {
  if (process.platform === "win32") return join(process.env.LOCALAPPDATA || homedir(), "cuigengji");
  return join(process.env.XDG_DATA_HOME || join(homedir(), ".local", "share"), "cuigengji");
}
async function apply(ctx, config = {}) {
  const configured = (value) => value?.get ? value.get() : value;
  const root = configured(config.dataRoot) || process.env.CUIGENGJI_DATA_ROOT || defaultDataRoot();
  const configEditor = ctx.get?.("configEditor");
  const libraries = new LibraryService(root, { recent: configured(config.recentLibraries) || [], persist: configEditor ? async (dataRoot, recentLibraries) => {
    const matches = configEditor.entries().filter((entry) => entry.options.name === "dsh-cuigengji-plugin" || entry.moduleNamespace?.apply === apply);
    if (matches.length !== 1) throw new Error("\u65E0\u6CD5\u552F\u4E00\u5B9A\u4F4D\u50AC\u66F4\u59EC\u63D2\u4EF6\u914D\u7F6E\uFF0C\u672A\u5207\u6362\u4F5C\u54C1\u5E93");
    await configEditor.edit(matches[0], (current) => ({ ...current, dataRoot, recentLibraries }));
  } : void 0 });
  const store = libraries.proxy("store"), maintenance = libraries.proxy("maintenance");
  const audit = async (sessionId, value) => {
    const file = createHash("sha256").update(sessionId || "human").digest("hex") + ".jsonl";
    const release = await store.acquire();
    try {
      await store.transaction.recover();
      await mkdir(join(store.root, "audit"), { recursive: true, mode: 448 });
      await appendFile(join(store.root, "audit", file), JSON.stringify({ time: (/* @__PURE__ */ new Date()).toISOString(), ...value }) + "\n", { mode: 384 });
    } finally {
      await release();
    }
  };
  const sessionPolicy = createSessionPolicy({ store, audit, ready: () => maintenance.ensureReady() });
  const dispatch = (...args) => libraries.use(() => sessionPolicy.dispatch(...args));
  const guidanceDispatch = (action, args, actor) => libraries.use(() => action === "guidance.read" ? readGuidance({ store, actor, resolveBinding: sessionPolicy.resolveBinding, section: args?.section, novelId: args?.novelId }) : sessionPolicy.dispatch(action, args, actor));
  const memory = new MemoryBridge(store, { dispatch: guidanceDispatch, resolveNovel: (...args) => libraries.use(() => sessionPolicy.resolveNovel(...args)), resolveBinding: (...args) => libraries.use(() => sessionPolicy.resolveBinding(...args)) });
  const workData = libraries.proxy("workData");
  let pet = new DesktopPet(store.root, dispatch);
  const desktopPet = { sync: (args) => pet.sync(args) };
  libraries.configure({ busy: sessionPolicy.isWriting, changed: async () => {
    await Promise.all([...memory.sessions.keys()].map((id) => memory.disconnect(id)));
    await pet.close();
    pet = new DesktopPet(store.root, dispatch);
    sessionPolicy.clearFocusCache();
  } });
  ctx.effect(() => () => pet.close());
  registerRpcRoute(ctx, { dispatch, get dataRoot() {
    return store.root;
  }, workData, transfer: libraries.proxy("transfer"), maintenance, desktopPet, libraries });
  await maintenance.start();
  await memory.start();
  ctx.effect(() => () => memory.close());
  ctx.provide("cuigengji", { store, dispatch, memory, maintenance, libraries });
  registerConversationActivity(ctx, libraries);
  registerSkills(ctx);
  registerPrompt(ctx, { store, resolveBinding: sessionPolicy.resolveBinding, use: (fn) => libraries.use(fn) });
  for (const [toolName, actions] of Object.entries(allowed)) {
    ctx.tools.register(defineTool({
      name: toolName,
      description: descriptions[toolName],
      parameters: { action: { type: "string", enum: actions, required: true }, args: toolName === "cuigengji_story" ? storyArgsSchema : toolName === "cuigengji_plan" ? planningArgsSchema : toolName === "cuigengji_memory" ? memoryArgsSchema : { type: "object", additionalProperties: true, description: "\u64CD\u4F5C\u53C2\u6570\uFF1A\u5B9E\u4F53ID\u3001\u6587\u672C\u3001\u7248\u672C\u7B49\u3002\u9ED8\u8BA4\u4F7F\u7528\u672C\u4F1A\u8BDD\u5F53\u524D\u4F5C\u54C1\uFF1B\u4E5F\u53EF\u663E\u5F0F\u63D0\u4F9B novelId\uFF0C\u4E0D\u6539\u53D8\u5F53\u524D\u4F5C\u54C1\u3002\u4E3B\u4F1A\u8BDD\u4E0E\u5B50 Agent \u89C4\u5219\u76F8\u540C\u3002" } },
      output: { schema: { type: "string" }, render: (_args, value) => [{ type: "text", text: value }] },
      execute: async ({ action, args }, exec) => libraries.use(async () => {
        if (!exec.agent?.id) throw new Error("\u5C0F\u8BF4\u5DE5\u5177\u9700\u8981 DSH \u4F1A\u8BDD");
        exec.signal?.throwIfAborted();
        const actor = { kind: "agent", sessionId: String(exec.agent.id) };
        const input = { ...args || {} };
        delete input.sessionId;
        delete input.actor;
        if (!isReadAction(action)) input.requestId ??= String(exec.callId);
        const result = toolName === "cuigengji_memory" ? await memory.call(actor.sessionId, action, input, { signal: exec.signal }) : await dispatch(action, input, actor);
        return JSON.stringify(result);
      })
    }));
  }
  ctx.tools.register(defineTool({
    name: "cuigengji_guidance",
    description: "\u6309 section \u8BFB\u53D6\u4E00\u79CD\u5199\u4F5C\u65B9\u6CD5\uFF0Cargs \u53EF\u6307\u5B9A novelId\u3002story \u662F\u521B\u4F5C\u8DEF\u7531\uFF1Bstory-long/story-short/story-outline/story-tracking/story-review/story-deslop \u5206\u522B\u4E3A\u957F\u7BC7\u3001\u77ED\u7BC7\u3001\u7AE0\u84DD\u56FE\u3001\u8FFD\u8E2A\u3001\u5BA1\u7A3F\u3001\u7CBE\u4FEE\uFF1Bstory-operations \u662F\u539F\u751F\u64CD\u4F5C\u5B57\u6BB5\u3002\u539F\u6709 core/project/write/plan/memory/revise/preset \u4ECD\u53EF\u4F7F\u7528\u3002all \u53EA\u8FD4\u56DE\u5165\u53E3\u89C4\u5219\u548C\u9884\u8BBE\uFF0C\u9636\u6BB5\u53C2\u8003\u6309\u9700\u53D6\uFF1B\u672A\u9009\u4F5C\u54C1\u53EF\u8BFB\u901A\u7528\u89C4\u5219\u3002",
    parameters: {
      section: { type: "string", enum: GUIDANCE_SECTIONS, required: true },
      args: { type: "object", additionalProperties: true, description: "\u53EF\u9009 novelId\uFF1B\u4E0D\u4F20\u5219\u4F7F\u7528\u672C\u4F1A\u8BDD\u5F53\u524D\u4F5C\u54C1\u3002" }
    },
    output: { schema: { type: "string" }, render: (_args, value) => [{ type: "text", text: value }] },
    execute: async ({ section, args }, exec) => libraries.use(async () => {
      exec.signal?.throwIfAborted();
      if (!exec.agent?.id) throw new Error("\u5199\u4F5C\u6307\u5F15\u9700\u8981 DSH \u4F1A\u8BDD");
      const result = await memory.call(String(exec.agent.id), "guidance.read", { ...args || {}, section }, { signal: exec.signal });
      return JSON.stringify(result);
    })
  }));
  ctx.tools.register(defineTool({
    name: "cuigengji_maintenance",
    description: "\u67E5\u8BE2\u50AC\u66F4\u59EC\u63D2\u4EF6\u5347\u7EA7\u3001\u6570\u636E\u8FC1\u79FB\u548C\u5B8C\u6574\u6027\u6821\u9A8C\u7ED3\u679C\u3002\u8FD9\u4E2A\u5DE5\u5177\u4E0D\u8981\u6C42\u7ED1\u5B9A\u5C0F\u8BF4\uFF1B\u66F4\u65B0\u540E\u5148\u8C03\u7528 status\uFF0C\u518D\u7528 verify \u6838\u5BF9\u5B9E\u9645\u52A0\u8F7D\u7248\u672C\u3001\u6570\u636E\u76EE\u5F55\u548C\u8BB0\u5F55\u6570\u91CF\u3002\u8FC1\u79FB\u7531\u63D2\u4EF6\u542F\u52A8\u9636\u6BB5\u81EA\u52A8\u5B8C\u6210\uFF0CAgent \u4E0D\u5E94\u76F4\u63A5\u6539\u5C0F\u8BF4\u6587\u4EF6\u3002",
    parameters: {
      action: { type: "string", enum: ["status", "verify"], required: true },
      args: { type: "object", additionalProperties: true, description: "verify \u53EF\u9009 expectedVersion\u3001expectedDataRoot\u3001expectedNovelIds\uFF08\u539F\u4F5C\u54C1ID\u6570\u7EC4\uFF09\u3002" }
    },
    output: { schema: { type: "string" }, render: (_args, value) => [{ type: "text", text: value }] },
    execute: async ({ action, args }, exec) => libraries.use(async () => {
      exec.signal?.throwIfAborted();
      if (!["status", "verify"].includes(action)) throw new Error("\u65E0\u6548\u7684\u7EF4\u62A4\u64CD\u4F5C");
      const result = action === "status" ? await maintenance.status() : await maintenance.verify(args || {});
      return JSON.stringify(result);
    })
  }));
  sessionPolicy.register(ctx, memory);
}
export {
  Config,
  apply,
  inject,
  name
};

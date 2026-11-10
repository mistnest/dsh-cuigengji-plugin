import { homedir } from "node:os";
import { join } from "node:path";
import { mkdir, appendFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import { MemoryBridge } from "./adapters/mcp/client.js";
import { registerSkills } from "./adapters/dsh/skills.js";
import { planningArgsSchema } from "./adapters/dsh/planning-schema.js";
import { memoryDshArgsSchema } from "./adapters/dsh/memory-schema.js";
import { presetArgsSchema } from "./adapters/dsh/preset-schema.js";
import { variablesArgsSchema } from "./adapters/dsh/variables-schema.js";
import { registerPrompt } from "./adapters/dsh/prompt.js";
import { readGuidance } from "./adapters/dsh/guidance.js";
import { createSessionPolicy } from "./application/bindings/session.js";
import { TOOL_ACTIONS as allowed, isReadAction } from "./contracts/actions.js";
import { registerRpcRoute } from "./adapters/dsh/rpc.js";
import { LibraryService } from "./application/libraries/service.js";
import { registerConversationActivity } from "./adapters/dsh/conversation-activity.js";
import { DesktopPet } from "./application/pet/desktop.js";
import { UsageService } from "./application/usage/service.js";
import { registerUsage } from "./adapters/dsh/usage.js";
const name = "cuigengji";
const inject = ["tools", "systemPrompt", "skills", "connection"];
const Config = z.object({
  dataRoot: z.string().default("").volatile(),
  recentLibraries: z.array(z.string()).default([]).volatile(),
  usageRoot: z.string().default("").volatile()
});
const descriptions = {
  cuigengji_project: "\u7BA1\u7406\u4F5C\u54C1\u5E93\u548C\u5377\u3001\u7AE0\u3001\u6B63\u6587\u3002\u6240\u6709\u4F1A\u8BDD\u5305\u62EC DSH \u539F\u751F\u5B50 Agent \u4F7F\u7528\u540C\u4E00\u5957\u4F5C\u54C1\u9009\u62E9\u89C4\u5219\uFF1Anovel.list \u67E5\u770B\u4F5C\u54C1\uFF0Cnovel.focus {novelId} \u8BB0\u4F4F\u672C\u4F1A\u8BDD\u5F53\u524D\u4F5C\u54C1\uFF0C\u6216\u5728\u5355\u6B21\u64CD\u4F5C\u663E\u5F0F\u63D0\u4F9B novelId\uFF1B\u4E92\u4E0D\u5207\u6362\u5176\u4ED6\u4F1A\u8BDD\u7684\u7126\u70B9\u3002novel.create {title,description?,requestId} \u521B\u5EFA\u7A7A\u767D\u4F5C\u54C1\uFF0C\u4E0D\u6539\u53D8\u7126\u70B9\u3002novel.handoff \u8FD4\u56DE\u4F5C\u54C1\u7D22\u5F15\u548C\u6709\u9650\u76EE\u5F55\uFF0C\u4E0D\u542B\u6B63\u6587\u3002chapter.get \u6309 start/maxChars \u8BFB\u53D6\u3002\u4FEE\u6539\u9700 expectedRevision\uFF0Cchapter.update \u7684 content/append/patch:{oldText,newText} \u4E09\u9009\u4E00\u3002\u5220\u9664 confirm:true\uFF1B\u975E\u7A7A\u5377\u8FD8\u9700 chapterPolicy:detach/delete\u3002",
  cuigengji_memory: '\u67E5\u627E\u3001\u8865\u5145\u3001\u7EA0\u6B63\u548C\u5220\u9664\u5F53\u524D\u4F5C\u54C1\u7684\u8BBE\u5B9A\u3002\u5148 graph.list {query?,type?,groupId?} \u5B9A\u4F4D\u539F\u5361\uFF0C\u518D graph.get {nodeId} \u8BFB\u5F53\u524D content/revision\u3002\u5DF2\u6709\u5BF9\u8C61\u7528 graph.update {nodeId,expectedRevision,patch:{oldText,newText},summary?,requestId} \u5C40\u90E8\u66FF\u6362\uFF0CnewText:"" \u5220\u9664\u5361\u5185\u63CF\u8FF0\uFF1B\u6574\u5361\u91CD\u5199\u7528 content\uFF0C\u4E0E patch \u4E8C\u9009\u4E00\u3002\u4F5C\u8005\u6388\u6743\u7684\u7F16\u8F91\u53EF\u5220\u5197\u4F59\u3001\u66FF\u6362\u65E7\u8BBE\u5B9A\u548C\u91CD\u7EC4\u6BB5\u843D\uFF0C\u53D7\u5F71\u54CD\u7684\u6458\u8981\u4E00\u8D77\u6539\uFF0C\u53EA\u6709\u72EC\u7ACB\u65B0\u5BF9\u8C61\u624D graph.create\u3002\u66F4\u65B0\u8FD4\u56DE changed/changedFields\uFF1Bfalse \u4E3A\u672A\u53D8\u5316\uFF0C\u4E0D\u589E\u7248\u672C\uFF1B\u4FDD\u5B58\u540E\u6838\u9A8C\u7ED3\u679C\u518D\u62A5\u544A\u3002\u5220\u6574\u5361\u7528 graph.delete {nodeId,expectedRevision,confirm:true,requestId}\uFF0C\u6279\u91CF\u7528 graph.remove \u7684 members\uFF1B\u8F6F\u5220\u9664\u53CA\u76F8\u8FDE\u8FB9\u6709\u5386\u53F2\u53EF\u8FFD\u6EAF\uFF0Cretired \u4ECD\u53EF\u68C0\u7D22\uFF0C\u4E0D\u4EE3\u66FF\u5220\u9664\u3002\u5220\u9664\u4E00\u6761\u5173\u7CFB\u7528 edge.delete\u3002\u6587\u4EF6\u5939 graph.groups \u8FD4\u56DE\u5B8C\u6574 path\uFF1Bgraph.group.create/update/delete \u7BA1\u7406\u5D4C\u5957\u76EE\u5F55\uFF0C\u5220\u5939\u65F6\u5185\u5BB9\u4E0A\u79FB\u3002graph.move {groupId,members:[{id,expectedRevision}]} \u8C03\u6574\u5F52\u5C5E\uFF0Cgraph.arrange \u6574\u7406\u6307\u5B9A\u5361\u7247\u3002\u65E7\u5E93\u53EF graph.workspace.ensure \u65E0\u635F\u5F52\u5939\u3002\u4EBA\u7269 character_card\uFF0C\u89C4\u5219/\u5730\u70B9/\u7EC4\u7EC7 world_entry\uFF1B\u6838\u5BF9 status/factType/sources/knownBy\uFF0C\u89C4\u5212\u7528 memoryRefs \u5F15\u7528\u539F\u5361\u3002\u666E\u901A\u8BFB\u53D6\u53EA\u7528\u5F53\u524D\u8BBE\u5B9A\uFF1B\u4F5C\u8005\u8981\u6C42\u8FFD\u6EAF\u65F6\u624D graph.history\uFF0C\u5386\u53F2\u5168\u6587\u987B revision/includeContent:true\uFF0Cgraph.restore \u751F\u6210\u65B0\u5F53\u524D\u7248\u672C\u3002\u6BCF\u6B21\u4FEE\u6539\u7528\u6700\u65B0 expectedRevision \u548C requestId\uFF0C\u51B2\u7A81\u91CD\u8BFB\u5B9E\u9645\u5DEE\u5F02\u3002\u754C\u9762\u6D4F\u89C8\u4E0D\u81EA\u52A8\u586B\u5165\u804A\u5929\u3002',
  cuigengji_plan: "\u4E0E\u4F5C\u8005\u5728\u5171\u4EAB\u5DE5\u4F5C\u53F0\u8BA8\u8BBA\u5267\u60C5\u3002\u8282\u70B9\u662F\u4E8B\u4EF6\u3001\u9009\u62E9\u6216\u9636\u6BB5\uFF0C\u4E0D\u662F\u7AE0\u8282\u3002\u7528 planning.pages/list/search \u5B9A\u4F4D\uFF0Cplanning.get {nodeId,resourceOffset?} \u8FD4\u56DE\u5168\u6587\u3001\u524D\u540E\u90BB\u5C45\u3001\u5B50\u60C5\u8282\u53CA\u6709\u9650\u5173\u8054\u8D44\u6E90\u6458\u8981\uFF08resources:items/total/nextOffset\uFF09\uFF0C\u56FE\u8C31\u5168\u6587\u6309\u9700 graph.get\u3002\u5177\u4F53\u63A8\u6F14\u65F6\u6838\u5BF9\u76F8\u5173\u5F53\u524D\u4EBA\u7269\u3001\u5730\u70B9\u548C\u89C4\u5219\uFF1B\u6CA1\u5173\u8054\u53EF\u6309\u540D\u5B57\u68C0\u7D22\u540E\u8865 memoryRefs\uFF0C\u4E0D\u5F3A\u5236\u6BCF\u8F6E\u91CD\u67E5\u6216\u62E6\u622A\u4FDD\u5B58\u3002node.parentId \u8868\u793A\u9636\u6BB5\u5305\u542B\u7684\u5B50\u60C5\u8282\uFF0C\u539F\u9636\u6BB5\u6458\u8981\u5C31\u662F\u6536\u7EB3\u6982\u62EC\uFF0C\u4E0D\u53E6\u5EFA\u91CD\u590D\u8BE6\u60C5\u9875\uFF1B\u56E0\u679C\u548C\u9009\u62E9\u7528 edge\uFF0C\u5305\u542B\u4E0D\u80FD\u4EE3\u66FF\u8FDE\u7EBF\u3002\u72EC\u7ACB\u7528\u9014\u53EF\u5F00 page\uFF0C\u540C\u4E00\u8BA8\u8BBA\u66F4\u65B0\u539F\u9875\u3002groupId \u81EA\u7531\u5F52\u7C7B\u5230\u5D4C\u5957\u6587\u4EF6\u5939\uFF0C\u4FBF\u7B7E\u8BB0\u5F55\u53F0\u8BCD\u548C\u672A\u51B3\u95EE\u9898\uFF1B\u65B0\u6536\u7EB3\u7528\u771F\u5B9E\u8282\u70B9\u5C42\u7EA7\u6216\u6587\u4EF6\u5939\uFF0C\u4E0D\u53E6\u7EF4\u62A4 frame.members\u3002\u4FEE\u6539\u7528 planning.apply {requestId,operations:[{op,id?,expectedRevision?,ref?,value}],reason} \u539F\u5B50\u63D0\u4EA4\uFF1B\u8BFB\u53D6\u6240\u5F97 ID/revision\uFF0C\u4E0D\u7F16\u9020\u5F15\u7528\u3002\u65B0\u589E\u53EF planning.layout \u81EA\u52A8\u5B89\u653E\uFF0Cmode:missing \u4FDD\u7559\u5DF2\u6709\u5E03\u5C40\uFF0C\u4F5C\u8005\u8981\u6C42\u6574\u7406\u624D all\u3002written \u53EA\u4EE3\u8868\u5DF2\u5B8C\u6574\u843D\u5B9E\u4E14\u6709 chapterRefs \u6B63\u6587\u7248\u672C\u8BC1\u636E\uFF0C\u672A\u91C7\u7528\u65B9\u6848\u53EF\u957F\u671F idea\uFF1B\u89C4\u5212\u4E0D\u81EA\u52A8\u6539\u4EBA\u7269\u4E8B\u5B9E\u3002",
  cuigengji_context: "binding.get \u67E5\u770B\u672C\u4F1A\u8BDD\u5F53\u524D\u4F5C\u54C1\u3002\u6B63\u5E38\u5199\u4F5C\u4F7F\u7528\u81EA\u52A8\u6CE8\u5165\u7684\u6709\u6548\u9884\u8BBE\uFF0C\u6309\u9700\u7528 preset.read \u8BFB\u53D6\u672C\u4F1A\u8BDD\u6CBF\u7528\u7684\u9884\u8BBE\u3002\u4F5C\u8005\u8981\u6C42\u5BFC\u5165/\u4FEE\u6539\u9884\u8BBE\u65F6\uFF1Apreset.get {identifier?} \u8BFB\u6700\u65B0\u4FDD\u5B58\u7684\u53EF\u7F16\u8F91\u7ED3\u6784\u548C revision\uFF08\u542B\u505C\u7528\u6761\u76EE\uFF0C\u65E0\u5BFC\u5165\u539F\u4EF6\uFF09\uFF1Bpreset.preview {input,fileName?,orderId?} \u53EA\u9884\u89C8\uFF1Bpreset.import {input,policy:append/replace,expectedRevision,requestId,fileName?,orderId?,enabled?} \u5BFC\u5165\u76EE\u6807\u4F5C\u54C1\u9884\u8BBE\uFF0C\u8FFD\u52A0\u4FDD\u7559\u539F\u5F00\u5173\uFF0C\u9996\u6B21\u5BFC\u5165\u6216\u66FF\u6362\u9ED8\u8BA4\u505C\u7528\uFF1Bpreset.update {expectedRevision,requestId,name?,enabled?,operations?} \u4FEE\u6539\uFF0Coperations \u7528 op:create/update/delete/move\u3001identifier \u5B9A\u4F4D\u6761\u76EE\uFF0Cupdate \u7684 content/patch:{oldText,newText} \u4E8C\u9009\u4E00\uFF0Cmove \u7684 before \u4E3A\u76EE\u6807\u6807\u8BC6\u6216 null\uFF08\u672B\u5C3E\uFF09\u3002\u4FDD\u7559\u5176\u4ED6\u6761\u76EE\u548C\u5143\u6570\u636E\uFF0C\u51B2\u7A81\u91CD\u8BFB\u3002\u4E34\u65F6\u5199\u6CD5\u4E0D\u81EA\u52A8\u4FDD\u5B58\u4E3A\u9884\u8BBE\u3002context.get \u6309\u9700\u8BFB\u53D6\u6B63\u6587\u53C2\u8003\u3002",
  cuigengji_variables: "\u53EF\u9009\u7684\u4F5C\u54C1\u5267\u60C5\u53D8\u91CF\u3002\u5148 variables.config/list\uFF1B\u672A\u542F\u7528\u4E0D\u5F3A\u5236\u4F7F\u7528\u3002variables.read {chapterId?,chapterRevision?,position:start/end,path?,scope:story/session} \u6309\u5267\u60C5\u4F4D\u7F6E\u8BFB\u53D6\uFF0C\u7F3A\u7701\u662F\u6700\u65B0\u6709\u6548\u72B6\u6001\uFF1B\u5199\u65E9\u671F\u60C5\u8282\u5FC5\u987B\u660E\u786E chapterId\uFF0C\u4E0D\u80FD\u5077\u7528\u540E\u6587\u72B6\u6001\u3002list \u53EA\u6458\u8981\uFF0C\u5386\u53F2\u7528 history\uFF0C\u6E32\u67D3\u9152\u9986\u53D6\u503C\u5B8F\u7528 render {text,chapterId?}\uFF0C\u5747\u4E0D\u4FEE\u6539\u3002parse {text} \u5C06 JSON Patch/MVU \u5E38\u89C1\u547D\u4EE4\u8F6C\u6362\u4E3A operations\uFF0C\u9700\u518D preview \u6838\u5BF9\u3002patch {baseRevision,requestId,anchor:{kind:initial}\u6216{kind:chapter,chapterId,chapterRevision,position:start/end,label?},scope?,operations,reason} \u63D0\u4EA4\uFF1B\u540C\u4E00\u8BF7\u6C42\u91CD\u8BD5\u590D\u7528 requestId\uFF0C\u4E92\u4E0D\u76F8\u4EA4\u8DEF\u5F84\u53EF\u81EA\u52A8\u5408\u5E76\uFF0C\u540C\u8DEF\u5F84\u51B2\u7A81\u91CD\u8BFB\u8BF7\u4F5C\u8005\u51B3\u7B56\u3002restore \u751F\u6210\u65B0\u5FEB\u7167\uFF1B\u4FEE\u6539\u65E7\u7AE0\u540E stale \u5F85\u6838\u5BF9\uFF0C\u4E0D\u5220\u9664\u65E7\u72B6\u6001\u3002\u5DE5\u5177\u4E0D\u4F1A\u6267\u884C\u4EFB\u610F JS/EJS\uFF0C\u4E5F\u4E0D\u4F1A\u628A\u6D4F\u89C8\u5185\u5BB9\u81EA\u52A8\u585E\u5165\u4F1A\u8BDD\u3002"
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
  const usageRoot = configured(config.usageRoot) || process.env.CUIGENGJI_USAGE_ROOT || join(process.env.DSH_HOME || join(homedir(), ".dsh"), "cuigengji", "usage");
  const usage = new UsageService(usageRoot, ctx);
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
  }, workData, transfer: libraries.proxy("transfer"), maintenance, desktopPet, libraries, usage });
  registerUsage(ctx, usage);
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
      parameters: { action: { type: "string", enum: actions, required: true }, args: toolName === "cuigengji_variables" ? variablesArgsSchema : toolName === "cuigengji_plan" ? planningArgsSchema : toolName === "cuigengji_memory" ? memoryDshArgsSchema : toolName === "cuigengji_context" ? presetArgsSchema : { type: "object", additionalProperties: true, description: "\u64CD\u4F5C\u53C2\u6570\uFF1A\u5B9E\u4F53ID\u3001\u6587\u672C\u3001\u7248\u672C\u7B49\u3002\u9ED8\u8BA4\u4F7F\u7528\u672C\u4F1A\u8BDD\u5F53\u524D\u4F5C\u54C1\uFF1B\u4E5F\u53EF\u663E\u5F0F\u63D0\u4F9B novelId\uFF0C\u4E0D\u6539\u53D8\u5F53\u524D\u4F5C\u54C1\u3002\u4E3B\u4F1A\u8BDD\u4E0E\u5B50 Agent \u89C4\u5219\u76F8\u540C\u3002" } },
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
    description: "\u6309\u9700\u8BFB\u53D6\u50AC\u66F4\u59EC\u5199\u4F5C\u6307\u5F15\uFF0C\u4F7F\u7528 {section,args?}\uFF0C\u4E0E\u5185\u5BB9\u5DE5\u5177\u7684 {action,args} \u4E0D\u540C\u3002\u5173\u95ED\u6301\u7EED\u6307\u5F15\u540E\u4ECD\u53EF\u7528\uFF1Acore \u662F\u57FA\u7840\u89C4\u5219\uFF0Cproject/write/plan/memory/revise \u662F\u5BF9\u5E94\u89C4\u8303\uFF0Cvariables \u662F\u53EF\u9009\u5267\u60C5\u53D8\u91CF\u89C4\u8303\uFF0Cpreset \u662F\u5F53\u524D\u4F5C\u54C1\u9884\u8BBE\uFF0Call \u8FD4\u56DE\u5168\u90E8\u89C4\u5219\u4E0E\u9884\u8BBE\u3002\u672A\u9009\u4F5C\u54C1\u4ECD\u8FD4\u56DE\u57FA\u7840\u89C4\u5219\uFF0C\u5E76\u6CE8\u660E\u9884\u8BBE\u4E0D\u53EF\u7528\uFF1B\u53C2\u8003\u6587\u4EF6\u76F8\u5BF9\u8FD4\u56DE\u7684 resourceBase \u8BFB\u53D6\u3002",
    parameters: {
      section: { type: "string", enum: ["core", "project", "write", "plan", "memory", "revise", "variables", "preset", "all"], required: true },
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

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { persona } from "./skills.js";
const body = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").trim();
const skillPath = (name) => fileURLToPath(new URL(`../../../skills/${name}/SKILL.md`, import.meta.url));
const skill = (name) => body(readFileSync(skillPath(name), "utf8"));
const module = (id, title) => ({ id, title, content: skill(`cuigengji-${id}`), resourceBase: { kind: "directory", path: fileURLToPath(new URL(`../../../skills/cuigengji-${id}/`, import.meta.url)) } });
const modules = Object.freeze({
  core: { id: "core", title: "\u50AC\u66F4\u59EC\u6838\u5FC3\u89C4\u5219", content: persona },
  project: module("project", "\u4F5C\u54C1\u63A5\u624B\u4E0E\u8BFB\u53D6\u8FB9\u754C"),
  write: module("write", "\u6B63\u6587\u5199\u4F5C\u89C4\u5219"),
  plan: module("plan", "\u89C4\u5212\u4E0E\u5171\u4EAB\u753B\u5E03\u89C4\u5219"),
  memory: module("memory", "\u4EBA\u7269\u4E0E\u4E16\u754C\u8BBE\u5B9A\u89C4\u5219"),
  variables: module("variables", "\u53EF\u9009\u5267\u60C5\u53D8\u91CF\u4E0E\u72B6\u6001\u7EF4\u62A4"),
  revise: module("revise", "\u5BA1\u9605\u4E0E\u4FEE\u8BA2\u89C4\u5219")
});
const sections = /* @__PURE__ */ new Set([...Object.keys(modules), "preset", "all"]);
async function readGuidance({ store, actor, resolveBinding, section = "all", novelId }) {
  if (typeof section !== "string" || !sections.has(section)) throw new Error(`\u672A\u77E5\u5199\u4F5C\u6307\u5F15\u6A21\u5757\uFF1A${section}`);
  const binding = await (resolveBinding ? resolveBinding(actor.sessionId) : store.dispatch("binding.get", {}, actor));
  const target = novelId || binding?.activeNovelId || binding?.novelId || null;
  const selected = section === "all" ? Object.values(modules) : section === "preset" ? [] : [modules[section]];
  let preset = null;
  if (section === "preset" || section === "all") {
    if (target) preset = await store.dispatch("preset.read", { novelId: target }, actor);
    else preset = { enabled: false, name: "", revision: 0, content: "", unavailable: true, reason: "\u5F53\u524D\u4F1A\u8BDD\u5C1A\u672A\u9009\u62E9\u4F5C\u54C1" };
  }
  return {
    section,
    novelId: target,
    modules: selected,
    ...preset ? { preset } : {},
    usage: "\u8FD9\u662F\u6309\u9700\u8D44\u6599\u3002\u53C2\u8003\u6587\u4EF6\u76F8\u5BF9\u5404\u6A21\u5757\u7684 resourceBase \u8BFB\u53D6\uFF1B\u4F5C\u54C1\u9009\u62E9\u3001\u5E76\u884C\u7F16\u8F91\u4E0E\u91CD\u8BD5\u89C4\u5219\u6309\u9700\u8BFB project\uFF0C\u5DF2\u8BFB\u53EF\u590D\u7528\u3002\u4E0D\u4EE3\u8868\u628A\u672A\u786E\u8BA4\u63D0\u6848\u5199\u5165\u6B63\u6587\u6216\u8BBE\u5B9A\u3002"
  };
}
export {
  readGuidance
};

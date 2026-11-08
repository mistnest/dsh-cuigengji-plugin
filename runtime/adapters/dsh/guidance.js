import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { persona } from "./skills.js";
const body = (text) => text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/, "").trim();
const skillRoot = (name) => new URL(`../../../skills/cuigengji-${name}/`, import.meta.url);
const entry = (id, title) => ({ id, title, name: id, file: "SKILL.md" });
const reference = (id, title, file) => ({ id, title, name: "story", file: `references/${file}.md` });
const modules = Object.freeze({
  core: { id: "core", title: "\u50AC\u66F4\u59EC\u6838\u5FC3\u89C4\u5219", content: persona },
  project: entry("project", "\u4F5C\u54C1\u63A5\u624B\u4E0E\u8BFB\u53D6\u8FB9\u754C"),
  write: entry("write", "\u6B63\u6587\u5199\u4F5C\u89C4\u5219"),
  plan: entry("plan", "\u89C4\u5212\u4E0E\u5171\u4EAB\u753B\u5E03\u89C4\u5219"),
  memory: entry("memory", "\u4EBA\u7269\u4E0E\u4E16\u754C\u8BBE\u5B9A\u89C4\u5219"),
  revise: entry("revise", "\u5BA1\u9605\u4E0E\u4FEE\u8BA2\u89C4\u5219"),
  story: entry("story", "\u957F\u77ED\u7BC7\u521B\u4F5C\u6D41\u7A0B\u4E0E\u8FDE\u7EED\u6027")
});
const references = Object.freeze({
  "story-long": reference("story-long", "\u957F\u7BC7\u5F00\u4E66\u4E0E\u6EDA\u52A8\u89C4\u5212", "long-form"),
  "story-short": reference("story-short", "\u77ED\u7BC7\u6784\u601D\u4E0E\u5206\u6279\u6210\u7A3F", "short-form"),
  "story-outline": reference("story-outline", "\u7AE0\u8282\u84DD\u56FE\u4E0E\u8BFB\u8005\u5951\u7EA6", "outline"),
  "story-tracking": reference("story-tracking", "\u9010\u7AE0\u4E8B\u5B9E\u4E0E\u8FDE\u7EED\u6027\u8FFD\u8E2A", "tracking"),
  "story-review": reference("story-review", "\u5E26\u8BC1\u636E\u7684\u5BA1\u7A3F\u4E0E\u6574\u6539", "review"),
  "story-deslop": reference("story-deslop", "\u8868\u8FBE\u3001\u7528\u7B14\u4E0E\u56E0\u679C\u7CBE\u4FEE", "deslop"),
  "story-operations": reference("story-operations", "\u521B\u4F5C\u5DE5\u4F5C\u53F0\u64CD\u4F5C\u5B57\u6BB5", "operations")
});
const GUIDANCE_SECTIONS = Object.freeze([...Object.keys(modules), ...Object.keys(references), "preset", "all"]);
const sections = new Set(GUIDANCE_SECTIONS);
function materialize(spec) {
  if (spec.content !== void 0) return spec;
  const base = skillRoot(spec.name);
  return {
    id: spec.id,
    title: spec.title,
    content: body(readFileSync(new URL(spec.file, base), "utf8")),
    resourceBase: { kind: "directory", path: fileURLToPath(base) }
  };
}
async function readGuidance({ store, actor, resolveBinding, section = "all", novelId }) {
  if (typeof section !== "string" || !sections.has(section)) throw new Error(`\u672A\u77E5\u5199\u4F5C\u6307\u5F15\u6A21\u5757\uFF1A${section}`);
  const binding = await (resolveBinding ? resolveBinding(actor.sessionId) : store.dispatch("binding.get", {}, actor));
  const target = novelId || binding?.activeNovelId || binding?.novelId || null;
  const selected = section === "all" ? Object.values(modules) : section === "preset" ? [] : [modules[section] || references[section]];
  let preset = null;
  if (section === "preset" || section === "all") {
    preset = target ? await store.dispatch("preset.read", { novelId: target }, actor) : { enabled: false, name: "", revision: 0, content: "", unavailable: true, reason: "\u5F53\u524D\u4F1A\u8BDD\u5C1A\u672A\u9009\u62E9\u4F5C\u54C1" };
  }
  return {
    section,
    novelId: target,
    modules: selected.map(materialize),
    ...preset ? { preset } : {},
    availableMethods: Object.values(references).map(({ id, title }) => ({ section: id, title })),
    usage: "\u8FD9\u662F\u6309\u9700\u8D44\u6599\u3002all \u4EC5\u52A0\u8F7D\u5165\u53E3\u89C4\u5219\u548C\u9884\u8BBE\uFF1B\u9636\u6BB5\u65B9\u6CD5\u7528 availableMethods \u7684 section \u5355\u72EC\u8BFB\u53D6\u3002\u53C2\u8003\u6587\u4EF6\u76F8\u5BF9 resourceBase \u8BFB\u53D6\u3002\u4E0D\u636E\u6B64\u6269\u5927\u4F5C\u8005\u6388\u6743\uFF0C\u4E5F\u4E0D\u628A\u89C4\u5212\u63D0\u6848\u5199\u6210\u6B63\u6587\u4E8B\u5B9E\u3002"
  };
}
export {
  GUIDANCE_SECTIONS,
  readGuidance
};

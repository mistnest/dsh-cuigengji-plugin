import { previewTavern } from "../../infrastructure/migrations/tavern.js";
import { convertLegacyExport } from "../../infrastructure/migrations/legacy.js";
import { importPreset, presetImportOrders, validatePreset } from "../../domain/preset/index.js";
import { catalog, fail, hash, newNovel } from "./model.js";
import { readPackage } from "./packages.js";
const MAX_TRANSFER_BYTES = 64 * 1024 * 1024;
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const labels = { works: "\u50AC\u66F4\u59EC\u4F5C\u54C1\u5907\u4EFD", chapters: "\u50AC\u66F4\u59EC\u6B63\u6587\u6570\u636E\u5305", memory: "\u50AC\u66F4\u59EC\u8BBE\u5B9A\u6570\u636E\u5305", planning: "\u50AC\u66F4\u59EC\u89C4\u5212\u6570\u636E\u5305", preset: "\u50AC\u66F4\u59EC\u5199\u4F5C\u9884\u8BBE", workspace: "\u50AC\u66F4\u59EC\u5B8C\u6574\u5DE5\u4F5C\u5E93" };
const fileTitle = (name) => name.replace(/^.*[\\/]/, "").replace(/\.(json|png|md|txt)$/i, "").slice(0, 200) || "\u5BFC\u5165\u5185\u5BB9";
function recognize(file, options = {}) {
  if (!object(options) || options.intent !== void 0 && options.intent !== "preset") fail("\u5BFC\u5165\u610F\u56FE\u65E0\u6548");
  const value = recognizeFile(file, options);
  if (options.intent === "preset") {
    if (!["preset", "works", "workspace"].includes(value.kind)) fail("\u8FD9\u4E2A\u6587\u4EF6\u4E0D\u662F\u5199\u4F5C\u9884\u8BBE\uFF1B\u89D2\u8272\u5361\u548C\u4E16\u754C\u4E66\u8BF7\u4ECE\u8BBE\u5B9A\u9875\u9762\u5BFC\u5165\uFF0C\u6B63\u6587\u8BF7\u4ECE\u6B63\u6587\u5165\u53E3\u5BFC\u5165\u3002");
    if (!value.projects.some((n) => n.preset)) fail("\u6587\u4EF6\u4E2D\u6CA1\u6709\u5199\u4F5C\u9884\u8BBE\uFF0C\u8BF7\u9009\u62E9\u63D0\u793A\u8BCD\u6587\u4EF6\u6216\u542B\u9884\u8BBE\u7684\u4F5C\u54C1\u5907\u4EFD\u3002");
  }
  return value;
}
function recognizeFile(file, options) {
  if (!file || typeof file.name !== "string" || file.name.length > 512) fail("\u8BF7\u9009\u62E9\u6709\u6548\u7684\u6587\u4EF6");
  let raw;
  if (file.pngBase64 !== void 0) {
    if (options.intent === "preset") fail("\u89D2\u8272\u5361\u56FE\u7247\u4E0D\u80FD\u4F5C\u4E3A\u5199\u4F5C\u9884\u8BBE\uFF0C\u8BF7\u4ECE\u8BBE\u5B9A\u9875\u9762\u5BFC\u5165\u3002");
    const result = previewTavern({ pngBase64: file.pngBase64, fileName: file.name });
    return tavern(result);
  }
  if (file.json !== void 0) raw = file.json;
  else if (typeof file.text === "string") {
    if (Buffer.byteLength(file.text) > MAX_TRANSFER_BYTES) fail("\u6587\u4EF6\u8D85\u8FC7 64 MB\uFF0C\u8BF7\u62C6\u5206\u540E\u5BFC\u5165");
    if (/\.(txt|md)$/i.test(file.name)) {
      if (options.intent !== "preset") return manuscript(file);
      const content = file.text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
      if (!content.trim()) fail("\u9884\u8BBE\u6587\u4EF6\u4E3A\u7A7A");
      return promptPreset({ name: fileTitle(file.name), content }, options);
    }
    try {
      raw = JSON.parse(file.text.replace(/^\uFEFF/, ""));
    } catch {
      fail("\u6587\u4EF6\u4E0D\u662F\u6709\u6548 JSON\uFF1B\u6B63\u6587\u8BF7\u9009\u62E9 TXT \u6216 Markdown \u6587\u4EF6");
    }
  } else fail("\u6587\u4EF6\u6CA1\u6709\u53EF\u8BFB\u53D6\u7684\u5185\u5BB9");
  if (!object(raw) || Buffer.byteLength(JSON.stringify(raw)) > MAX_TRANSFER_BYTES) fail("\u8BF7\u9009\u62E9\u6709\u6548 JSON \u6587\u4EF6\uFF0C\u6700\u5927 64 MB");
  const fingerprint = hash(JSON.stringify(raw));
  const base = { fingerprint, orders: [], warnings: [], restorable: false };
  if (raw.format === "cuigengji-package") {
    const payload = readPackage(raw);
    return { ...base, label: labels[payload.kind], kind: payload.kind, projects: payload.projects, warnings: payload.warnings, restorable: payload.kind === "works" };
  }
  if (raw.format === "cuigengji-workspace") {
    const payload = raw.payload;
    if (!object(payload) || !object(payload.state) || !object(payload.state.novels)) fail("\u5DE5\u4F5C\u5E93\u7ED3\u6784\u65E0\u6548");
    return { ...base, label: labels.workspace, kind: "workspace", projects: Object.values(payload.state.novels), restorable: true, workspace: raw };
  }
  if (raw.format === "cuigengji") {
    if (![1, 2].includes(Number(raw.schemaVersion)) || !object(raw.novel)) fail("\u4E0D\u652F\u6301\u7684\u4F5C\u54C1\u5907\u4EFD\u7248\u672C");
    return { ...base, label: labels.works, kind: "works", projects: [raw.novel], restorable: true };
  }
  if (raw.spec || raw.entries || raw.character_book) return tavern(previewTavern({ json: raw, fileName: file.name }));
  if (raw.prompts || object(raw.data) && raw.data.prompts || typeof raw.content === "string" || typeof raw.system_prompt === "string" || Array.isArray(raw.blocks)) {
    return promptPreset(raw, options, fileTitle(file.name));
  }
  if (typeof raw.description === "string" && typeof raw.name === "string") return tavern(previewTavern({ json: raw, fileName: file.name }));
  if (raw.project || raw.workspace || raw.chapters) {
    const { backup, report } = convertLegacyExport(raw);
    return { ...base, label: "\u65E7\u7248\u5C0F\u8BF4\u9879\u76EE", kind: "works", projects: [backup.novel], warnings: report.warnings, restorable: true };
  }
  fail("\u672A\u8BC6\u522B\u5230\u5C0F\u8BF4\u5185\u5BB9\u3002\u652F\u6301\u50AC\u66F4\u59EC\u6570\u636E\u5305\u3001\u9152\u9986\u89D2\u8272\u5361\uFF0F\u4E16\u754C\u4E66\uFF0F\u9884\u8BBE\uFF0C\u4EE5\u53CA TXT\u3001Markdown \u6B63\u6587\u3002");
}
function promptPreset(raw, options, title) {
  const fingerprint = hash(JSON.stringify(raw));
  const orders = Array.isArray(raw.blocks) ? [] : presetImportOrders(raw);
  const selected = options.orderId ?? String((orders.find((o) => String(o.character_id) === "100001") || orders[0])?.character_id ?? "");
  const value = Array.isArray(raw.blocks) ? { ...validatePreset(raw), enabled: false } : importPreset(raw, selected || void 0);
  const n = newNovel(title || String(raw.name), `import-${fingerprint}`);
  n.preset = { ...value, revision: 1 };
  return {
    fingerprint,
    label: "\u63D0\u793A\u8BCD\u9884\u8BBE",
    kind: "preset",
    restorable: false,
    projects: [n],
    warnings: value.warnings || [],
    orderId: selected,
    orders: orders.map((o) => ({ id: String(o.character_id), name: String(o.character_id) === "100001" ? "\u9152\u9986\u901A\u7528\u6392\u5217" : `\u6392\u5217\u65B9\u6848 ${o.character_id}` }))
  };
}
function tavern(preview) {
  const n = newNovel(preview.nodes[0]?.name || "\u5BFC\u5165\u7684\u8BBE\u5B9A", `import-${preview.fingerprint}`);
  for (const value of preview.nodes) {
    const id = `tavern-${preview.fingerprint}-${value.sourceIndex}`;
    n.nodes[id] = {
      ...value,
      id,
      revision: 1,
      deleted: false,
      groupId: null,
      tavern: { fingerprint: preview.fingerprint, format: preview.format, index: value.sourceIndex }
    };
  }
  n.tavernSources = { [preview.fingerprint]: { format: preview.format, raw: preview.raw } };
  return { fingerprint: preview.fingerprint, label: preview.format === "world_info" ? "\u9152\u9986\u4E16\u754C\u4E66" : "\u9152\u9986\u89D2\u8272\u5361", kind: "memory", restorable: false, projects: [n], warnings: preview.warnings, orders: [] };
}
function manuscript(file) {
  const trimBlankLines = (value) => value.replace(/^(?:[ \t]*\n)+|(?:\n[ \t]*)+$/g, "");
  const text = file.text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  if (!text.trim()) fail("\u6B63\u6587\u6587\u4EF6\u4E3A\u7A7A");
  const fingerprint = hash(text), n = newNovel(fileTitle(file.name), `import-${fingerprint}`);
  const md = /\.md$/i.test(file.name);
  const lines = text.split("\n"), headings = [];
  let fence = false;
  for (let at = 0; at < lines.length; at++) {
    if (md && /^\s*(```|~~~)/.test(lines[at])) fence = !fence;
    if (fence) continue;
    const match = md ? /^##\s+(.+?)\s*#*\s*$/.exec(lines[at]) : /^\s*(第[零〇一二三四五六七八九十百千万两\d]+[章节回](?:\s*[:：、.．-]?\s*[^\n]{0,100}))\s*$/.exec(lines[at]);
    if (match) headings.push({ at, title: match[1].trim() });
  }
  const sections = [];
  if (headings.length) {
    const prefix = lines.slice(0, headings[0].at).join("\n").trim();
    const bookHeading = md ? /^# [^\n]+$/.test(prefix) : prefix === n.title;
    if (prefix && !bookHeading) sections.push({ title: "\u524D\u8A00", content: prefix });
    headings.forEach((h, i) => sections.push({ title: h.title, content: trimBlankLines(lines.slice(h.at + 1, headings[i + 1]?.at ?? lines.length).join("\n")) }));
  } else sections.push({ title: n.title, content: trimBlankLines(text) });
  sections.forEach((section, i) => {
    const id = `text-${fingerprint}-${i}`, timestamp = (/* @__PURE__ */ new Date()).toISOString(), contentHash = hash(section.content);
    n.chapters[id] = {
      id,
      revision: 1,
      title: section.title,
      content: section.content,
      contentHash,
      order: i,
      volumeId: null,
      deleted: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      versions: [{ revision: 1, ...section, contentHash, order: i, volumeId: null, deleted: false, timestamp, actor: { kind: "human", sessionId: null }, reason: "\u6B63\u6587\u6587\u4EF6\u5BFC\u5165" }]
    };
  });
  return { fingerprint, label: md ? "Markdown \u6B63\u6587" : "TXT \u6B63\u6587", kind: "chapters", restorable: false, projects: [n], orders: [], warnings: headings.length ? ["\u5DF2\u6309\u7AE0\u8282\u6807\u9898\u62C6\u5206\uFF0C\u8BF7\u5728\u4E0B\u65B9\u6838\u5BF9\u76EE\u5F55\u3002"] : [] };
}
function inspection(value) {
  const { projects, workspace, ...result } = value;
  return { ...result, catalog: catalog(projects) };
}
export {
  MAX_TRANSFER_BYTES,
  inspection,
  recognize
};

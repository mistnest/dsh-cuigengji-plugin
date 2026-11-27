import { presetMarkdown } from "../presets/markdown.js";
import { cas, fail, hash, text, touch } from "../operations/records.js";
function memoryText(novel) {
  if (typeof novel.creativeMemory === "string") return novel.creativeMemory;
  if (!novel.preset?.enabled) return "";
  return presetMarkdown(novel.preset.blocks);
}
function sections(content) {
  if (!content.trim()) return [];
  const result = [];
  let fence = "";
  for (const line of content.matchAll(/^.*$/gm)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line[0]);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = "";
      continue;
    }
    if (marker) {
      fence = marker[1];
      continue;
    }
    const heading = /^ {0,3}#{1,6}[ \t]+(.+?)\s*$/.exec(line[0]);
    if (!heading) continue;
    if (result.length) result[result.length - 1].end = line.index;
    else if (content.slice(0, line.index).trim()) result.push({ title: "\u5F00\u5934", start: 0, end: line.index });
    result.push({ title: heading[1].replace(/[ \t]+#+\s*$/, ""), start: line.index, end: content.length });
  }
  return result.length ? result : [{ title: "\u521B\u4F5C\u8BB0\u5FC6", start: 0, end: content.length }];
}
function memoryRead(novel, args = {}) {
  const content = memoryText(novel);
  const revision = novel.creativeMemoryRevision ?? (typeof novel.creativeMemory === "string" ? 0 : novel.preset?.revision ?? 0);
  const meta = { novelId: novel.id, revision, contentHash: hash(content) };
  if (args.expectedHash !== void 0 && args.expectedHash !== meta.contentHash) fail("CONFLICT", "\u521B\u4F5C\u8BB0\u5FC6\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u67E5\u770B\u76EE\u5F55");
  if (args.full === true) return { ...meta, content, legacy: typeof novel.creativeMemory !== "string" && Boolean(novel.preset?.enabled) };
  const entries = sections(content);
  if (args.section !== void 0) {
    const part = entries[args.section];
    if (!Number.isSafeInteger(args.section) || !part) fail("NOT_FOUND", "\u8FD9\u4E00\u6BB5\u521B\u4F5C\u8BB0\u5FC6\u4E0D\u5B58\u5728\uFF0C\u8BF7\u91CD\u65B0\u67E5\u770B\u76EE\u5F55");
    return { ...meta, title: part.title, content: content.slice(part.start, part.end) };
  }
  const query = text(args.query ?? "", "query", true).toLowerCase().trim();
  return { ...meta, headings: entries.flatMap((part, section) => !query || content.slice(part.start, part.end).toLowerCase().includes(query) ? [{ section, title: part.title }] : []) };
}
function memoryUpdate(novel, args) {
  const current = memoryText(novel);
  const { revision, contentHash } = memoryRead(novel, { full: true });
  if (typeof args.expectedHash !== "string") fail("REVISION_REQUIRED", "\u8BF7\u5148\u8BFB\u53D6\u521B\u4F5C\u8BB0\u5FC6\uFF0C\u63D0\u4F9B expectedRevision \u548C expectedHash");
  cas({ revision, contentHash }, args);
  text(args.requestId, "requestId");
  if ([args.content, args.append, args.patch].filter((value) => value !== void 0).length !== 1)
    fail("INVALID_INPUT", "\u8BF7\u9009\u62E9 content\u3001append \u6216 patch \u4E2D\u7684\u4E00\u9879");
  let next;
  if (args.patch !== void 0) {
    const old = text(args.patch?.oldText, "patch.oldText");
    const replacement = text(args.patch?.newText, "patch.newText", true);
    const at = current.indexOf(old);
    if (at < 0 || current.indexOf(old, at + 1) >= 0) fail("CONFLICT", "\u5F85\u66FF\u6362\u539F\u6587\u672A\u552F\u4E00\u547D\u4E2D\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6\u8BE5\u6BB5");
    next = current.slice(0, at) + replacement + current.slice(at + old.length);
  } else if (args.append !== void 0) {
    const addition = text(args.append, "append");
    next = current ? current + (current.endsWith("\n\n") ? "" : current.endsWith("\n") ? "\n" : "\n\n") + addition : addition;
  } else next = text(args.content, "content", true);
  const changed = next !== current || typeof novel.creativeMemory !== "string" && Boolean(novel.preset);
  if (changed) {
    novel.creativeMemory = next;
    novel.creativeMemoryRevision = revision + 1;
    touch(novel);
  }
  return { novelId: novel.id, changed, revision: changed ? revision + 1 : revision, contentHash: hash(next) };
}
export {
  memoryRead,
  memoryText,
  memoryUpdate
};

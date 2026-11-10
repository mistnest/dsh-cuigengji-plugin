import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";
const LIMIT = 12e4;
const truncate = (text, limit = LIMIT) => text.length > limit ? `${text.slice(0, limit)}
\u2026` : text;
const read = (path) => {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
};
const isDir = (path) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};
const mdFiles = (dir, recursive = false) => {
  if (!isDir(dir)) return [];
  const result = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (recursive) result.push(...mdFiles(full, true));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) result.push(full);
  }
  return result;
};
const natural = (a, b) => a.localeCompare(b, "zh-CN", { numeric: true });
const decodeTitle = (raw, fallback) => {
  const heading = /^\s*#\s+(.+)$/m.exec(raw);
  const title = (heading?.[1] || fallback).replace(/[_*`]/g, "").trim();
  return title.slice(0, 300) || fallback;
};
const field = (raw, names) => {
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?(?:${names.join("|")})(?:\\*\\*)?[\uFF1A:]\\s*([^\\n]+)`);
  const match = pattern.exec(raw);
  return match ? match[1].replace(/[。；;]\s*$/, "").trim().slice(0, 60) : "";
};
const wordCount = (raw) => {
  const match = /(?:字数|本章字数)[：:]\s*([0-9][0-9,，]*)/.exec(raw);
  if (!match) return null;
  const value = Number(match[1].replace(/[,，]/g, ""));
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
};
const summaryOf = (raw) => {
  const lines = raw.split(/\r?\n/);
  const body = lines.filter((line) => {
    const text = line.trim();
    if (!text) return false;
    if (/^#{1,6}\s/.test(text)) return false;
    if (/^(?:[-*]\s*)?(?:\*\*)?(?:基调|角色定位|本章角色|字数|本章字数|情节点|章节|标题)(?:\*\*)?[：:]/.test(text)) return false;
    if (/^---$/.test(text)) return false;
    return true;
  }).join("\n");
  return truncate(body.trim(), 4e3);
};
const parseChapter = (file, index) => {
  const raw = read(file), fallback = basename(file).replace(/\.md$/i, "").replace(/_摘要$/, "");
  return {
    index,
    title: decodeTitle(raw, fallback),
    summary: summaryOf(raw),
    tone: field(raw, ["\u57FA\u8C03"]),
    role: field(raw, ["\u89D2\u8272\u5B9A\u4F4D", "\u672C\u7AE0\u89D2\u8272"]),
    wordCount: wordCount(raw)
  };
};
function bookRoot(input) {
  const path = resolve(input);
  if (!isDir(path)) return path;
  if (existsSync(join(path, "\u7AE0\u8282")) || existsSync(join(path, "\u62C6\u6587\u62A5\u544A.md")) || existsSync(join(path, "_meta.json"))) return path;
  const nested = join(path, "\u62C6\u6587\u5E93");
  const candidates = isDir(nested) ? [nested] : [];
  for (const base of [path, nested]) {
    if (!isDir(base)) continue;
    for (const entry of readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
      const child = join(base, entry.name);
      if (existsSync(join(child, "\u7AE0\u8282")) || existsSync(join(child, "\u62C6\u6587\u62A5\u544A.md")) || existsSync(join(child, "_meta.json"))) candidates.push(child);
    }
  }
  const unique = [...new Set(candidates)];
  if (unique.length === 1) return unique[0];
  if (!unique.length) throw Object.assign(new Error("\u6CA1\u6709\u627E\u5230\u62C6\u6587\u5E93\u4E66\u7C4D\uFF1A\u76EE\u5F55\u4E0B\u7F3A\u5C11 \u7AE0\u8282/ \u6216 \u62C6\u6587\u62A5\u544A.md"), { code: "REFERENCE_NOT_FOUND" });
  throw Object.assign(new Error(`\u627E\u5230\u591A\u672C\u5019\u9009\u4E66\uFF0C\u8BF7\u76F4\u63A5\u6307\u5411\u5176\u4E2D\u4E00\u672C\uFF1A${unique.slice(0, 5).map((item) => basename(item)).join("\u3001")}`), { code: "REFERENCE_AMBIGUOUS" });
}
function metaTitle(root) {
  try {
    const meta = JSON.parse(read(join(root, "_meta.json")) || "{}");
    const title = meta.title || meta.bookName || meta["\u4E66\u540D"];
    return typeof title === "string" && title.trim() ? title.trim().slice(0, 300) : "";
  } catch {
    return "";
  }
}
function parseReferenceFolder(input) {
  const root = bookRoot(input);
  if (!isDir(root)) throw Object.assign(new Error("\u62C6\u6587\u5E93\u8DEF\u5F84\u5FC5\u987B\u662F\u6587\u4EF6\u5939"), { code: "REFERENCE_NOT_FOUND" });
  const title = metaTitle(root) || basename(root).replace(/[_*`]/g, "").trim() || "\u672A\u547D\u540D\u5BF9\u6807\u4E66";
  const chapterFiles = mdFiles(join(root, "\u7AE0\u8282")).sort((a, b) => natural(a, b));
  const chapters = chapterFiles.map(parseChapter);
  const report = [read(join(root, "\u62C6\u6587\u62A5\u544A.md")), read(join(root, "\u5FEB\u901F\u9884\u89C8.md"))].filter(Boolean).join("\n\n");
  const style = read(join(root, "\u6587\u98CE.md"));
  const rhythm = read(join(root, "\u5267\u60C5", "\u8282\u594F.md"));
  const emotion = read(join(root, "\u5267\u60C5", "\u60C5\u7EEA\u6A21\u5757.md"));
  const id = "ref-" + createHash("sha1").update(`${root}
${title}`).digest("hex").slice(0, 16);
  return {
    id,
    title,
    source: root.slice(0, 1e3),
    importedAt: (/* @__PURE__ */ new Date()).toISOString(),
    report: truncate(report),
    style: truncate(style),
    rhythm: truncate(rhythm),
    emotion: truncate(emotion),
    chapters,
    counts: { chapters: chapters.length, characters: mdFiles(join(root, "\u89D2\u8272"), true).length, settings: mdFiles(join(root, "\u8BBE\u5B9A"), true).length }
  };
}
function referenceStatus(reference) {
  return {
    chapters: reference.chapters.length,
    characters: reference.counts.characters,
    settings: reference.counts.settings,
    hasReport: Boolean(reference.report),
    hasStyle: Boolean(reference.style),
    hasRhythm: Boolean(reference.rhythm),
    hasEmotion: Boolean(reference.emotion)
  };
}
export {
  parseReferenceFolder,
  referenceStatus
};

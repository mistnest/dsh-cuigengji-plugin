// Imports an Oh Story style analysis folder (拆文库/{书名}) into a project
// reference copy (对标). Parsing is deterministic and read-only; the caller
// decides whether to store the result through story.apply.
import {createHash} from 'node:crypto';
import {existsSync, readFileSync, readdirSync, statSync} from 'node:fs';
import {basename, join, resolve} from 'node:path';
import type {StoryReference, StoryReferenceChapter} from '../../../contracts/story.ts';

const LIMIT = 120000;
const truncate = (text: string, limit = LIMIT) => text.length > limit ? `${text.slice(0, limit)}\n…` : text;
const read = (path: string) => { try { return readFileSync(path, 'utf8'); } catch { return ''; } };
const isDir = (path: string) => { try { return statSync(path).isDirectory(); } catch { return false; } };
const mdFiles = (dir: string, recursive = false): string[] => {
  if (!isDir(dir)) return [];
  const result: string[] = [];
  for (const entry of readdirSync(dir, {withFileTypes: true})) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) { if (recursive) result.push(...mdFiles(full, true)); continue; }
    if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) result.push(full);
  }
  return result;
};
const natural = (a: string, b: string) => a.localeCompare(b, 'zh-CN', {numeric: true});
const decodeTitle = (raw: string, fallback: string) => {
  const heading = /^\s*#\s+(.+)$/m.exec(raw);
  const title = (heading?.[1] || fallback).replace(/[_*`]/g, '').trim();
  return title.slice(0, 300) || fallback;
};
const field = (raw: string, names: string[]) => {
  const pattern = new RegExp(`(?:^|\\n)\\s*(?:[-*]\\s*)?(?:\\*\\*)?(?:${names.join('|')})(?:\\*\\*)?[：:]\\s*([^\\n]+)`);
  const match = pattern.exec(raw);
  return match ? match[1].replace(/[。；;]\s*$/, '').trim().slice(0, 60) : '';
};
const wordCount = (raw: string) => {
  const match = /(?:字数|本章字数)[：:]\s*([0-9][0-9,，]*)/.exec(raw);
  if (!match) return null;
  const value = Number(match[1].replace(/[,，]/g, ''));
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
};
const summaryOf = (raw: string) => {
  const lines = raw.split(/\r?\n/);
  const body = lines.filter(line => {
    const text = line.trim();
    if (!text) return false;
    if (/^#{1,6}\s/.test(text)) return false;
    if (/^(?:[-*]\s*)?(?:\*\*)?(?:基调|角色定位|本章角色|字数|本章字数|情节点|章节|标题)(?:\*\*)?[：:]/.test(text)) return false;
    if (/^---$/.test(text)) return false;
    return true;
  }).join('\n');
  return truncate(body.trim(), 4000);
};
const parseChapter = (file: string, index: number): StoryReferenceChapter => {
  const raw = read(file), fallback = basename(file).replace(/\.md$/i, '').replace(/_摘要$/, '');
  return {index, title: decodeTitle(raw, fallback), summary: summaryOf(raw),
    tone: field(raw, ['基调']), role: field(raw, ['角色定位', '本章角色']), wordCount: wordCount(raw)};
};
/** The folder may be the book itself, a 拆文库 directory containing one book,
 * or a directory containing exactly one project folder. */
function bookRoot(input: string) {
  const path = resolve(input);
  if (!isDir(path)) return path;
  if (existsSync(join(path, '章节')) || existsSync(join(path, '拆文报告.md')) || existsSync(join(path, '_meta.json'))) return path;
  const nested = join(path, '拆文库');
  const candidates = isDir(nested) ? [nested] : [];
  for (const base of [path, nested]) {
    if (!isDir(base)) continue;
    for (const entry of readdirSync(base, {withFileTypes: true})) {
      if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
      const child = join(base, entry.name);
      if (existsSync(join(child, '章节')) || existsSync(join(child, '拆文报告.md')) || existsSync(join(child, '_meta.json'))) candidates.push(child);
    }
  }
  const unique = [...new Set(candidates)];
  if (unique.length === 1) return unique[0];
  if (!unique.length) throw Object.assign(new Error('没有找到拆文库书籍：目录下缺少 章节/ 或 拆文报告.md'), {code: 'REFERENCE_NOT_FOUND'});
  throw Object.assign(new Error(`找到多本候选书，请直接指向其中一本：${unique.slice(0, 5).map(item => basename(item)).join('、')}`), {code: 'REFERENCE_AMBIGUOUS'});
}
function metaTitle(root: string) {
  try {
    const meta = JSON.parse(read(join(root, '_meta.json')) || '{}');
    const title = meta.title || meta.bookName || meta['书名'];
    return typeof title === 'string' && title.trim() ? title.trim().slice(0, 300) : '';
  } catch { return ''; }
}
export function parseReferenceFolder(input: string): StoryReference {
  const root = bookRoot(input);
  if (!isDir(root)) throw Object.assign(new Error('拆文库路径必须是文件夹'), {code: 'REFERENCE_NOT_FOUND'});
  const title = metaTitle(root) || basename(root).replace(/[_*`]/g, '').trim() || '未命名对标书';
  const chapterFiles = mdFiles(join(root, '章节')).sort((a, b) => natural(a, b));
  const chapters = chapterFiles.map(parseChapter);
  const report = [read(join(root, '拆文报告.md')), read(join(root, '快速预览.md'))].filter(Boolean).join('\n\n');
  const style = read(join(root, '文风.md'));
  const rhythm = read(join(root, '剧情', '节奏.md'));
  const emotion = read(join(root, '剧情', '情绪模块.md'));
  const id = 'ref-' + createHash('sha1').update(`${root}\n${title}`).digest('hex').slice(0, 16);
  return {id, title, source: root.slice(0, 1000), importedAt: new Date().toISOString(),
    report: truncate(report), style: truncate(style), rhythm: truncate(rhythm), emotion: truncate(emotion), chapters,
    counts: {chapters: chapters.length, characters: mdFiles(join(root, '角色'), true).length, settings: mdFiles(join(root, '设定'), true).length}};
}
export function referenceStatus(reference: StoryReference) {
  return {chapters: reference.chapters.length, characters: reference.counts.characters, settings: reference.counts.settings,
    hasReport: Boolean(reference.report), hasStyle: Boolean(reference.style), hasRhythm: Boolean(reference.rhythm), hasEmotion: Boolean(reference.emotion)};
}

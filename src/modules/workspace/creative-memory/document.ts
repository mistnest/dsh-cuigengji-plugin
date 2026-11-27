import type {Row} from '../operations/record-reader.ts';
import {presetMarkdown} from '../presets/markdown.ts';
import {cas, fail, hash, text, touch} from '../operations/records.ts';

// Before the first explicit save, old books expose only their effective entries.
export function memoryText(novel: Row): string {
  if (typeof novel.creativeMemory === 'string') return novel.creativeMemory;
  if (!novel.preset?.enabled) return '';
  return presetMarkdown(novel.preset.blocks);
}

interface Section {title: string; start: number; end: number}

function sections(content: string): Section[] {
  if (!content.trim()) return [];
  const result: Section[] = [];
  let fence = '';
  for (const line of content.matchAll(/^.*$/gm)) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line[0]);
    if (fence) {
      if (marker && marker[1][0] === fence[0] && marker[1].length >= fence.length && !marker[2].trim()) fence = '';
      continue;
    }
    if (marker) {fence = marker[1]; continue;}
    const heading = /^ {0,3}#{1,6}[ \t]+(.+?)\s*$/.exec(line[0]);
    if (!heading) continue;
    if (result.length) result[result.length - 1].end = line.index;
    else if (content.slice(0, line.index).trim()) result.push({title:'开头', start:0, end:line.index});
    result.push({title:heading[1].replace(/[ \t]+#+\s*$/, ''), start:line.index, end:content.length});
  }
  return result.length ? result : [{title:'创作记忆', start:0, end:content.length}];
}

export function memoryRead(novel: Row, args: Row = {}) {
  const content = memoryText(novel);
  const revision = novel.creativeMemoryRevision ?? (typeof novel.creativeMemory === 'string' ? 0 : novel.preset?.revision ?? 0);
  const meta = {novelId:novel.id, revision, contentHash:hash(content)};
  if (args.expectedHash !== undefined && args.expectedHash !== meta.contentHash) fail('CONFLICT', '创作记忆已更新，请重新查看目录');
  if (args.full === true) return {...meta, content, legacy:typeof novel.creativeMemory !== 'string' && Boolean(novel.preset?.enabled)};
  const entries = sections(content);
  if (args.section !== undefined) {
    const part = entries[args.section];
    if (!Number.isSafeInteger(args.section) || !part) fail('NOT_FOUND', '这一段创作记忆不存在，请重新查看目录');
    return {...meta, title:part.title, content:content.slice(part.start, part.end)};
  }
  const query = text(args.query ?? '', 'query', true).toLowerCase().trim();
  return {...meta, headings:entries.flatMap((part, section) =>
    !query || content.slice(part.start, part.end).toLowerCase().includes(query) ? [{section, title:part.title}] : [])};
}

export function memoryUpdate(novel: Row, args: Row) {
  const current = memoryText(novel);
  const {revision, contentHash} = memoryRead(novel, {full:true});
  if (typeof args.expectedHash !== 'string') fail('REVISION_REQUIRED', '请先读取创作记忆，提供 expectedRevision 和 expectedHash');
  cas({revision, contentHash}, args);
  text(args.requestId, 'requestId');
  if ([args.content, args.append, args.patch].filter(value => value !== undefined).length !== 1)
    fail('INVALID_INPUT', '请选择 content、append 或 patch 中的一项');
  let next: string;
  if (args.patch !== undefined) {
    const old = text(args.patch?.oldText, 'patch.oldText');
    const replacement = text(args.patch?.newText, 'patch.newText', true);
    const at = current.indexOf(old);
    if (at < 0 || current.indexOf(old, at + 1) >= 0) fail('CONFLICT', '待替换原文未唯一命中，请重新读取该段');
    next = current.slice(0, at) + replacement + current.slice(at + old.length);
  } else if (args.append !== undefined) {
    const addition = text(args.append, 'append');
    next = current ? current + (current.endsWith('\n\n') ? '' : current.endsWith('\n') ? '\n' : '\n\n') + addition : addition;
  } else next = text(args.content, 'content', true);
  const changed = next !== current || (typeof novel.creativeMemory !== 'string' && Boolean(novel.preset));
  if (changed) {
    novel.creativeMemory = next;
    novel.creativeMemoryRevision = revision + 1;
    touch(novel as {revision:number;updatedAt:string});
  }
  return {novelId:novel.id, changed, revision:changed ? revision + 1 : revision, contentHash:hash(next)};
}

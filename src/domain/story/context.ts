import type {StoryContext, StoryContextItem, StoryContextOmission, StoryNovel} from '../../contracts/story.ts';
import {chapter, fail, orderedChapters, own, readStory, sourceStale} from './model.ts';
import {chapterCounts} from '../chapters/metadata.ts';

type Reason = StoryContextOmission['reason'];
const briefLabels = {premise: '故事前提', readerPromise: '读者承诺', protagonistGoal: '主角目标', coreConflict: '核心冲突', ending: '规划结局（尚未发生）', style: '写作风格'} as const;
const safeSlice = (text: string, length: number) => text.slice(0, length).replace(/[\ud800-\udbff]$/, '');

/** This budget includes JSON structure, escaped strings, source IDs and omission
 * metadata. It is intentionally independent of the legacy full-prose context. */
export function storyContext(novel: StoryNovel, args: {chapterId?: unknown; maxChars?: unknown}): StoryContext {
  const maxChars = args.maxChars ?? 12000;
  if (!Number.isSafeInteger(maxChars) || (maxChars as number) < 1000 || (maxChars as number) > 24000) fail('INVALID_INPUT', 'maxChars 需要在 1000–24000 之间，默认 12000');
  const budget = maxChars as number, story = readStory(novel), chapters = orderedChapters(novel);
  const current = args.chapterId === undefined ? null : chapter(novel, args.chapterId, 'INVALID_INPUT', true);
  const ranks = new Map(chapters.map((item, index) => [item.id, index]));
  const boundary = current ? ranks.get(current.id)! : chapters.length - 1;
  const result: StoryContext = {novelId: novel.id, chapterId: current?.id ?? null, revision: story.revision, maxChars: budget, usedChars: budget,
    truncated: false, plans: [], facts: [], omitted: [], omittedCount: 0, omittedTruncated: false};
  const size = () => JSON.stringify(result).length;
  const omissionBudget = Math.floor(budget * 0.12);
  const omitted = (kind: StoryContextItem['kind'], id: string, reason: Reason) => {
    result.omittedCount++;
    const entry = {kind, id, reason};
    if (result.omitted.length < 30 && JSON.stringify([...result.omitted, entry]).length <= omissionBudget && size() + JSON.stringify(entry).length + 64 < budget) result.omitted.push(entry);
    else result.omittedTruncated = true;
    result.truncated = true;
  };
  // Leave room for explicit omissions even when the first manuscript is long.
  const reserve = Math.min(omissionBudget, 500) + 64;
  const add = (section: 'plans' | 'facts', item: StoryContextItem) => {
    if (!item.content) return;
    const list = result[section], sectionLimit = section === 'plans' ? Math.floor(budget * 0.42) : budget;
    const room = Math.min(budget - size() - reserve, sectionLimit - JSON.stringify(list).length);
    const shell = {...item, title: safeSlice(item.title, 200), content: ''};
    if (room <= JSON.stringify(shell).length + 8 || list.length >= 80) {omitted(item.kind, item.id, 'budget'); return;}
    let entry = {...shell, content: item.content};
    if (JSON.stringify(entry).length > room) {
      let low = 0, high = Math.min(item.content.length, room);
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (JSON.stringify({...shell, content: safeSlice(item.content, mid), truncated: true}).length <= room) low = mid;
        else high = mid - 1;
      }
      entry = {...shell, content: safeSlice(item.content, low), truncated: true};
      if (!entry.content) {omitted(item.kind, item.id, 'budget'); return;}
    }
    list.push(entry);
    if (entry.truncated) result.truncated = true;
  };
  const sourceReason = (id: string, version: number): Reason | null => {
    if (!own(novel.chapters, id) || novel.chapters[id].deleted) return 'deleted';
    if ((ranks.get(id) ?? Infinity) > boundary) return 'future';
    return sourceStale(novel, id, version) ? 'stale' : null;
  };
  const allowed = (kind: StoryContextItem['kind'], id: string, chapterId: string, version: number) => {
    const reason = sourceReason(chapterId, version);
    if (reason) {omitted(kind, id, reason); return false;}
    return true;
  };
  const brief = Object.entries(briefLabels).flatMap(([key, label]) => story.brief[key as keyof typeof briefLabels] ? [`${label}：${story.brief[key as keyof typeof briefLabels]}`] : []).join('\n');
  if (current && own(story.outlines, current.id)) {
    const outline = story.outlines[current.id];
    add('plans', {kind: 'outline', id: current.id, chapterId: current.id, revision: story.revision, title: current.title + ' · 细纲（计划）',
      content: `本章意图：${outline.intent}\n情节点：\n${outline.beats.map((beat, index) => `${index + 1}. ${beat}`).join('\n')}\n章尾钩子：${outline.endingHook}`, truncated: false});
  }
  // The target chapter's own prose outranks every derived summary: continuing
  // from the real tail is what keeps a small budget useful.
  const prose = chapters.filter((item, index) => index <= boundary && chapterCounts(item as {content: string}).textCount > 0).slice(-3).reverse();
  const selected = new Set(prose.map(item => item.id));
  for (const item of prose) {
    const body = item.content || '', tail = body.slice(-6000);
    add('facts', {kind: 'manuscript', id: item.id, chapterId: item.id, revision: item.revision, title: item.title + (tail.length < body.length ? ' · 正文末段' : ' · 正文'), content: tail, truncated: tail.length < body.length});
  }
  const currentUnit = current ? Object.values(story.units).find(unit => unit.chapterIds.includes(current.id)) : undefined;
  if (currentUnit) add('plans', {kind: 'unit', id: currentUnit.id, title: currentUnit.title + ' · 剧情单元（计划）', truncated: false,
    content: `单元承诺：${currentUnit.promise}\n因果入口：${currentUnit.causeEntry}\n核心阻碍：${currentUnit.blocker}\n关键选择：${currentUnit.choice}\n兑现与归属：${currentUnit.payoff}\n下一单元钩子：${currentUnit.hook}`});
  const profile = story.style;
  if (profile.viewpoint || profile.tense || profile.diction || profile.avoid) {
    add('plans', {kind: 'style', id: novel.id, title: '文风要求（表达层）', truncated: false,
      content: [['视角', profile.viewpoint], ['时态', profile.tense], ['用词', profile.diction], ['避免', profile.avoid]].filter(([, text]) => text).map(([label, text]) => `${label}：${text}`).join('\n')});
  }
  // A project copy of an analyzed reference book is a style/rhythm hint, not a
  // story fact. Include only the compact text fields, never its chapter plot.
  const reference = Object.values(story.references)[0];
  if (reference) {
    add('plans', {kind: 'reference', id: reference.id, title: `对标书：${reference.title}（参考风格，不是本书事实）`, truncated: false,
      content: [reference.style, reference.rhythm, reference.emotion].filter(Boolean).join('\n\n')});
  }
  const tracking = Object.values(story.tracking).sort((a, b) => (ranks.get(b.chapterId) ?? Infinity) - (ranks.get(a.chapterId) ?? Infinity));  for (const item of tracking) {
    if (!allowed('tracking', item.chapterId, item.chapterId, item.chapterRevision)) continue;
    const title = novel.chapters[item.chapterId].title;
    add('facts', {kind: 'tracking', id: item.chapterId, chapterId: item.chapterId, revision: item.chapterRevision, title: title + ' · 已发生事实',
      content: `${item.summary}${item.storyTime ? '\n故事时间：' + item.storyTime : ''}${item.location ? '\n地点：' + item.location : ''}${item.activeCharacterIds.length ? '\n活跃角色 ID：' + item.activeCharacterIds.join('、') : ''}`, truncated: false});
    if (item.commitments.length || item.risks.length) add('plans', {kind: 'commitment', id: item.chapterId, chapterId: item.chapterId, revision: item.chapterRevision, title: title + ' · 后续义务与风险（未视为已完成）',
      content: [...item.commitments.map(text => '待履行：' + text), ...item.risks.map(text => '待核对：' + text)].join('\n'), truncated: false});
  }
  for (const [index, item] of chapters.entries()) if (!selected.has(item.id) && chapterCounts(item as {content: string}).textCount > 0) omitted('manuscript', item.id, index > boundary ? 'future' : 'budget');
  for (const item of Object.values(story.threads)) {
    if (!['open', 'progressing'].includes(item.status)) continue;
    if (item.sourceChapterId !== undefined && !allowed('thread', item.id, item.sourceChapterId, item.sourceRevision!)) continue;
    add('plans', {kind: 'thread', id: item.id, ...(item.sourceChapterId ? {chapterId: item.sourceChapterId, revision: item.sourceRevision} : {}), title: item.title + ' · 未完成线索',
      content: `${item.kind} / ${item.status}\n${item.detail}${item.dueChapterId ? '\n到期章节 ID：' + item.dueChapterId : ''}`, truncated: false});
  }
  for (const item of Object.values(story.reviews)) {
    if (item.status !== 'open') continue;
    if (!allowed('review', item.id, item.chapterId, item.chapterRevision)) continue;
    add('plans', {kind: 'review', id: item.id, chapterId: item.chapterId, revision: item.chapterRevision, title: item.severity + ' · 待整改审稿意见',
      content: `位置：${item.location}\n证据：${item.evidence}\n问题：${item.issue}\n建议：${item.suggestion}`, truncated: false});
  }
  const validSetting = (id: string, seen = new Set<string>()): boolean => {
    if (seen.has(id)) return true;
    if (!own(novel.nodes, id)) return false;
    seen.add(id); const item = novel.nodes[id];
    return !item.deleted && item.status === 'active' && item.factType === 'fact' && !(item.sources || []).some(ref => sourceReason(ref.chapterId, ref.revision)) && (item.dependsOn || []).every(ref => validSetting(ref, seen));
  };
  for (const item of Object.values(novel.nodes)) {
    if (item.deleted || !item.summary) continue;
    if (!validSetting(item.id)) {
      const reason = (item.sources || []).map(ref => sourceReason(ref.chapterId, ref.revision)).find(Boolean) || (item.status === 'stale' ? 'stale' : 'unconfirmed');
      omitted('setting', item.id, reason); continue;
    }
    add('facts', {kind: 'setting', id: item.id, title: item.name + ' · 已确认设定', content: item.summary, truncated: false});
  }
  // The brief is the last plan because it is usually the largest and remains
  // fully readable through story.get when a small budget excludes it.
  add('plans', {kind: 'brief', id: novel.id, revision: story.revision, title: '创作简报（计划，不是正文事实）', content: brief, truncated: false});
  // Updating the character count can change its own number of digits.
  for (let i = 0; i < 4 && result.usedChars !== size(); i++) result.usedChars = size();
  if (result.usedChars > budget) fail('INVALID_INPUT', '上下文来源元数据超过预算，请增加 maxChars');
  return result;
}

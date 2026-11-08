import {randomUUID} from 'node:crypto';
import type {StoryNovel, StoryState} from '../../contracts/story.ts';
import {copy, defaultStory, fail, own, readStory, validateStory} from './model.ts';

/** Partial chapter packages carry only their own workflow records. A package of
 * settings, planning or presets must not leak the work's unrelated story data. */
export function chapterStory(source: StoryNovel, chapterIds: Set<string>, nodeIds: Set<string>): {story?: StoryState; detached: number} {
  if (source.story === undefined) return {detached: 0};
  const original = readStory(source), story = defaultStory();
  story.mode = original.mode; story.revision = 1;
  let detached = 0;
  for (const item of Object.values(original.outlines)) if (chapterIds.has(item.chapterId)) story.outlines[item.chapterId] = copy(item);
  for (const item of Object.values(original.tracking)) if (chapterIds.has(item.chapterId)) {
    const activeCharacterIds = item.activeCharacterIds.filter(id => nodeIds.has(id));
    detached += item.activeCharacterIds.length - activeCharacterIds.length;
    story.tracking[item.chapterId] = {...copy(item), activeCharacterIds};
  }
  for (const item of Object.values(original.reviews)) if (chapterIds.has(item.chapterId)) story.reviews[item.id] = copy(item);
  for (const item of Object.values(original.threads)) if (item.sourceChapterId && chapterIds.has(item.sourceChapterId)) {
    const next = copy(item);
    if (next.dueChapterId && !chapterIds.has(next.dueChapterId)) {delete next.dueChapterId; detached++;}
    story.threads[item.id] = next;
  }
  return Object.values(story.outlines).length || Object.values(story.tracking).length || Object.values(story.threads).length || Object.values(story.reviews).length ? {story, detached} : {detached};
}

/** Copies preserve manuscript revision bindings while replacing every identity.
 * An existing target retains its own brief, mode and stage. */
export function copyStory(source: StoryNovel, target: StoryNovel, chapterIds: Map<string, string>, nodeIds: Map<string, string>, initializeConfiguration: boolean) {
  if (source.story === undefined) return;
  const original = readStory(source), hadStory = target.story !== undefined, result = hadStory ? readStory(target) : defaultStory();
  if (initializeConfiguration && !hadStory) {result.mode = original.mode; result.stage = original.stage; result.brief = copy(original.brief);}
  const mapped = (map: Map<string, string>, id: string, label: string) => map.get(id) ?? fail('INVALID_TRANSFER', `故事流程${label}引用未包含在复制范围：${id}`);
  for (const item of Object.values(original.outlines)) {
    const chapterId = mapped(chapterIds, item.chapterId, '细纲'); result.outlines[chapterId] = {...copy(item), chapterId};
  }
  for (const item of Object.values(original.tracking)) {
    const chapterId = mapped(chapterIds, item.chapterId, '追踪');
    result.tracking[chapterId] = {...copy(item), chapterId, activeCharacterIds: item.activeCharacterIds.map(id => mapped(nodeIds, id, '角色'))};
  }
  for (const item of Object.values(original.threads)) {
    const id = randomUUID();
    result.threads[id] = {...copy(item), id,
      ...(item.sourceChapterId ? {sourceChapterId: mapped(chapterIds, item.sourceChapterId, '来源')} : {}),
      ...(item.dueChapterId ? {dueChapterId: mapped(chapterIds, item.dueChapterId, '到期章节')} : {})};
  }
  for (const item of Object.values(original.reviews)) {
    const id = randomUUID(); result.reviews[id] = {...copy(item), id, chapterId: mapped(chapterIds, item.chapterId, '审稿')};
  }
  if (result.revision === Number.MAX_SAFE_INTEGER) fail('INVALID_TRANSFER', '目标故事流程版本号已达上限');
  result.revision++; validateStory(result, target, 'INVALID_TRANSFER');
  target.story = result;
}

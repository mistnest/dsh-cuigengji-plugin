import { randomUUID } from "node:crypto";
import { copy, defaultStory, fail, readStory, validateStory } from "./model.js";
function chapterStory(source, chapterIds, nodeIds) {
  if (source.story === void 0) return { detached: 0 };
  const original = readStory(source), story = defaultStory();
  story.mode = original.mode;
  story.revision = 1;
  let detached = 0;
  for (const item of Object.values(original.outlines)) if (chapterIds.has(item.chapterId)) story.outlines[item.chapterId] = copy(item);
  for (const item of Object.values(original.tracking)) if (chapterIds.has(item.chapterId)) {
    const activeCharacterIds = item.activeCharacterIds.filter((id) => nodeIds.has(id));
    detached += item.activeCharacterIds.length - activeCharacterIds.length;
    story.tracking[item.chapterId] = { ...copy(item), activeCharacterIds };
  }
  for (const item of Object.values(original.reviews)) if (chapterIds.has(item.chapterId)) story.reviews[item.id] = copy(item);
  for (const item of Object.values(original.threads)) if (item.sourceChapterId && chapterIds.has(item.sourceChapterId)) {
    const next = copy(item);
    if (next.dueChapterId && !chapterIds.has(next.dueChapterId)) {
      delete next.dueChapterId;
      detached++;
    }
    story.threads[item.id] = next;
  }
  return Object.values(story.outlines).length || Object.values(story.tracking).length || Object.values(story.threads).length || Object.values(story.reviews).length ? { story, detached } : { detached };
}
function copyStory(source, target, chapterIds, nodeIds, initializeConfiguration) {
  if (source.story === void 0) return;
  const original = readStory(source), hadStory = target.story !== void 0, result = hadStory ? readStory(target) : defaultStory();
  if (initializeConfiguration && !hadStory) {
    result.mode = original.mode;
    result.stage = original.stage;
    result.brief = copy(original.brief);
  }
  const mapped = (map, id, label) => map.get(id) ?? fail("INVALID_TRANSFER", `\u6545\u4E8B\u6D41\u7A0B${label}\u5F15\u7528\u672A\u5305\u542B\u5728\u590D\u5236\u8303\u56F4\uFF1A${id}`);
  for (const item of Object.values(original.outlines)) {
    const chapterId = mapped(chapterIds, item.chapterId, "\u7EC6\u7EB2");
    result.outlines[chapterId] = { ...copy(item), chapterId };
  }
  for (const item of Object.values(original.tracking)) {
    const chapterId = mapped(chapterIds, item.chapterId, "\u8FFD\u8E2A");
    result.tracking[chapterId] = { ...copy(item), chapterId, activeCharacterIds: item.activeCharacterIds.map((id) => mapped(nodeIds, id, "\u89D2\u8272")) };
  }
  for (const item of Object.values(original.threads)) {
    const id = randomUUID();
    result.threads[id] = {
      ...copy(item),
      id,
      ...item.sourceChapterId ? { sourceChapterId: mapped(chapterIds, item.sourceChapterId, "\u6765\u6E90") } : {},
      ...item.dueChapterId ? { dueChapterId: mapped(chapterIds, item.dueChapterId, "\u5230\u671F\u7AE0\u8282") } : {}
    };
  }
  for (const item of Object.values(original.reviews)) {
    const id = randomUUID();
    result.reviews[id] = { ...copy(item), id, chapterId: mapped(chapterIds, item.chapterId, "\u5BA1\u7A3F") };
  }
  if (result.revision === Number.MAX_SAFE_INTEGER) fail("INVALID_TRANSFER", "\u76EE\u6807\u6545\u4E8B\u6D41\u7A0B\u7248\u672C\u53F7\u5DF2\u8FBE\u4E0A\u9650");
  result.revision++;
  validateStory(result, target, "INVALID_TRANSFER");
  target.story = result;
}
export {
  chapterStory,
  copyStory
};

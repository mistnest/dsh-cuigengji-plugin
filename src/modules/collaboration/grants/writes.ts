import { z } from 'zod';
import { id, revision } from '../../../platform/tools/query-fields.ts';
import type { ReaderModule } from '../../workspace/queries/reader-modules.ts';

// External connections receive only these content commands. Each schema is also
// used for MCP discovery; metadata, actor identity and the target book are server-owned.
const text = z.string(),
  opt = text.optional(),
  patch = z.strictObject({ oldText: text.min(1), newText: text });
const common = { novelId: id, requestId: id, reason: opt };
const setting = {
  name: opt,
  summary: opt,
  content: opt,
  storyTime: opt,
  aliases: z.array(text).optional(),
  status: z.enum(['active', 'stale', 'unconfirmed', 'retired']).optional(),
  factType: z.enum(['fact', 'belief', 'misunderstanding', 'unconfirmed', 'plan']).optional(),
  knownBy: z.array(text).optional(),
  dependsOn: z.array(id).optional(),
  sources: z.array(z.strictObject({ chapterId: id, revision })).optional(),
};
const cardEdit = z.strictObject({ ...setting, nodeId: id, expectedRevision: revision, patch: patch.optional() });
const planFields = z.strictObject({
  title: opt,
  summary: opt,
  content: opt,
  status: z.enum(['idea', 'selected', 'written', 'dropped']).optional(),
  pageId: id.nullable().optional(),
  parentId: id.nullable().optional(),
  chapterRefs: z.array(id).optional(),
  memoryRefs: z.array(id).optional(),
});
function command(action: string, module: ReaderModule, description: string, fields: z.ZodRawShape) {
  return { action, module, description, input: z.strictObject({ ...common, ...fields }) };
}
export const grantWrites = [
  command('chapter.create', 'manuscript', '新建正文，填标题、正文及 requestId。', {
    title: text.min(1),
    content: opt,
    volumeId: id.optional(),
  }),
  command(
    'chapter.update',
    'manuscript',
    '修改已保存章节。先读取 revision，用 content、append 或精确 patch 更新。',
    { chapterId: id, expectedRevision: revision, title: opt, content: opt, append: opt, patch: patch.optional() },
  ),
  command('graph.create', 'settings', '新建人物或世界设定卡。', {
    ...setting,
    name: text.min(1),
    type: z.enum(['character_card', 'world_entry']),
  }),
  command('graph.update', 'settings', '用当前版本修改原卡，局部修改可用 patch。', cardEdit.shape),
  command('graph.updateMany', 'settings', '一次提交多张设定卡的修改。任一版本冲突会取消整批。', {
    updates: z.array(cardEdit).min(1).max(20),
  }),
  command('planning.apply', 'planning', '新建或修改情节卡。修改时逐卡提供 expectedRevision。', {
    operations: z
      .array(
        z.discriminatedUnion('op', [
          z.strictObject({
            op: z.literal('node.create'),
            ref: id.optional(),
            value: planFields.extend({ title: text.min(1) }),
          }),
          z.strictObject({ op: z.literal('node.update'), id, expectedRevision: revision, value: planFields }),
        ]),
      )
      .min(1)
      .max(100),
  }),
  command('creativeMemory.update', 'guidance', '根据已读版本和 contentHash 修改本书创作记忆。', {
    expectedRevision: z.number().int().nonnegative(),
    expectedHash: id,
    content: opt,
    append: opt,
    patch: patch.optional(),
  }),
];

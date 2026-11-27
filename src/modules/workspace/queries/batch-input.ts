import { z } from 'zod';
import { id, revision } from '../../../platform/tools/query-fields.ts';
import { queryFail } from './common.ts';
import type { ReaderModule } from './reader-modules.ts';

export const batchKinds = { chapter: 'manuscript', setting: 'settings', planning: 'planning' } as const;
const kinds = ['chapter', 'setting', 'planning'] as const;
export function readItemsFor(modules?: readonly ReaderModule[]) {
  const allowed = kinds.filter((kind) => !modules || modules.includes(batchKinds[kind]));
  return z
    .array(
      z
        .object({
          kind: z.enum(allowed),
          id,
          expectedRevision: revision.optional(),
          start: z.number().int().min(0).optional(),
          maxChars: z.number().int().min(1).max(48000).optional(),
        })
        .strict(),
    )
    .min(1)
    .max(12);
}
export const batchItems = readItemsFor();
export type ReadItem = z.infer<typeof batchItems>[number];

export function parseReadItems(input: unknown): ReadItem[] {
  const parsed = batchItems.safeParse(input);
  if (!parsed.success)
    return queryFail(
      'INVALID_INPUT',
      parsed.error.issues.map((issue) => `items.${issue.path.join('.')}：${issue.message}`).join('；'),
    );
  return parsed.data;
}

export function authorizeReadItems(items: ReadItem[], modules: readonly ReaderModule[]) {
  for (const item of items) {
    if (!modules.includes(batchKinds[item.kind]))
      queryFail('CAPABILITY_DENIED', '本次请求包含未授权类别的资料');
  }
}

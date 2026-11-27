import {z} from 'zod';
import {defineOperations, readerQuery, write} from '../../../platform/tools/definition.ts';
import {novel, query} from '../../../platform/tools/query-fields.ts';

export const creativeMemoryOperations = defineOperations('creativeMemory', [
  readerQuery('creativeMemory.read', 'guidance', '查看本书创作记忆的标题。query 搜索，section 读对应段，full 读全文。可用 expectedHash 固定版本。', {
    ...novel, query, section:z.number().int().nonnegative().optional(), full:z.boolean().optional(), expectedHash:z.string().optional(),
  }),
  write('creativeMemory.update'),
], 'cuigengji_context');

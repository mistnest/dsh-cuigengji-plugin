import {defineOperations, read, readerQuery} from '../../../platform/tools/definition.ts';
import {novel} from '../../../platform/tools/query-fields.ts';
import {batchItems} from './batch-input.ts';

export const contextOperations = defineOperations('context', [
  read('context.get'),
  readerQuery('context.readMany','workspace','同一作品内按给定顺序读取 1–12 个已知章节、设定或规划 ID。items 每项含 kind、id，可带 start、maxChars 和 expectedRevision。返回原文、状态、版本与 nextStart，按工具授权访问。',{...novel,items:batchItems}),
], 'cuigengji_context');

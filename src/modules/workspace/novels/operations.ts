import {z} from 'zod';
import {defineOperations, read, write, readerQuery} from '../../../platform/tools/definition.ts';
import {novel, page, query} from '../../../platform/tools/query-fields.ts';

export const novelOperations = [
  ...defineOperations('workspace', [
    readerQuery('novel.list','workspace','按书名查询已保存作品，取得 novelId；不会改变任何 DSH 会话的作品焦点。',{query,...page}),
    write('novel.focus',{panel:false}),
    write('novel.create'),
    readerQuery('novel.get','workspace','读取作品基本信息和正文、设定、规划数量，不读取整本正文。',novel),
    readerQuery('novel.handoff','manuscript','读取作品概要和有限章节目录；完整目录用 chapter.list。',{...novel,chapterLimit:z.number().int().min(0).max(30).optional()}),
  ], 'cuigengji_project'),
  ...defineOperations('workspace', [
    write('novel.import'),
    write('novel.export'),
    write('novel.update'),
    write('novel.archive'),
    write('novel.restore',{tier:'advanced'}),
    write('novel.purge'),
  ]),
];

export const bindingOperations = [
  ...defineOperations('workspace', [
    read('binding.get'),
  ], 'cuigengji_context'),
  ...defineOperations('workspace', [
    write('binding.set'),
  ]),
];

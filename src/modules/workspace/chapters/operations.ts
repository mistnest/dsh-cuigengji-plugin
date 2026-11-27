import {z} from 'zod';
import {defineOperations, read, write, readerQuery} from '../../../platform/tools/definition.ts';
import {id, novel, page, query, optionalId, revision} from '../../../platform/tools/query-fields.ts';

export const manuscriptOperations = [
  ...defineOperations('manuscript', [
    readerQuery('volume.list','manuscript','读取卷目录及顺序。',novel),
    write('volume.create'),
    write('volume.update'),
    write('volume.delete'),
    readerQuery('chapter.list','manuscript','按卷和章节顺序读取目录，支持标题检索和分页；不返回正文。',{...novel,volumeId:optionalId,query,...page}),
    readerQuery('chapter.search','manuscript','在当前已保存正文中按原文检索，返回章节 ID、版本、命中偏移和片段；不检索回收站。',{...novel,query:z.string().min(1).max(2000),chapterId:id.optional(),...page}),
    write('chapter.create'),
    readerQuery('chapter.get','manuscript','读取当前章节全文或片段。沿 nextStart 续读时带上 expectedRevision；版本变化会拒绝拼接。offsetUnit 为 UTF-16。',{...novel,chapterId:id,start:z.number().int().min(0).optional(),maxChars:z.number().int().min(1).max(200000).optional(),expectedRevision:revision.optional()}),
    write('chapter.update'),
    write('chapter.delete'),
    read('chapter.history',{tier:'advanced'}),
    write('chapter.restore',{tier:'advanced'}),
  ], 'cuigengji_project'),
  ...defineOperations('manuscript', [
    write('chapter.move'),
    read('chapter.find'),
    write('chapter.replace'),
  ]),
];

import {z} from 'zod';
import {defineOperations, read, write, readerQuery} from '../../../platform/tools/definition.ts';
import {id, novel, page, query, optionalId, revision} from '../../../platform/tools/query-fields.ts';

export const planningOperations = [
  ...defineOperations('planning', [
    readerQuery('planning.pages','planning','列出规划画布，query 按画布名称和摘要检索；主线 pageId 为 null。',{...novel,query}),
    write('planning.page.create'),
    write('planning.page.update'),
    write('planning.page.delete'),
    read('planning.decorations'),
    readerQuery('planning.list','planning','查询当前规划节点摘要，保留 idea/selected/written/dropped；规划是意图，不自动等于已发生事实。',{...novel,query,pageId:optionalId,groupId:optionalId,parentId:optionalId,status:z.enum(['idea','selected','written','dropped']).optional(),...page}),
    readerQuery('planning.search','planning','按规划节点标题和摘要检索，可限定画布和目录。',{...novel,query:z.string().min(1).max(2000),pageId:optionalId,groupId:optionalId,status:z.enum(['idea','selected','written','dropped']).optional(),...page}),
    readerQuery('planning.get','planning','读取规划节点正文、状态、父子结构、前后邻居和关联设定摘要。关联设定全文用 graph.get 按需读取。',{...novel,nodeId:id,expectedRevision:revision.optional(),resourceOffset:z.number().int().min(0).optional()}),
    read('planning.node.history',{tier:'advanced'}),
    write('planning.node.restore',{tier:'advanced'}),
    write('planning.continue'),
    readerQuery('planning.groups','planning','读取规划画布的文件夹和路径。',{...novel,pageId:optionalId}),
    write('planning.group.create'),
    write('planning.group.update'),
    write('planning.group.delete'),
    read('planning.changes',{tier:'advanced'}),
    read('planning.history',{tier:'advanced'}),
    write('planning.apply'),
    write('planning.layout',{tier:'advanced'}),
    write('planning.revert',{tier:'advanced'}),
  ], 'cuigengji_plan'),
  ...defineOperations('planning', [
    write('planning.directory.move'),
    read('planning.layout.get'),
  ]),
];

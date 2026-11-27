import {z} from 'zod';
import {defineOperations, read, write, readerQuery} from '../../../platform/tools/definition.ts';
import {id, novel, page, query, optionalId, revision} from '../../../platform/tools/query-fields.ts';

export const settingOperations = [
  ...defineOperations('settings', [
    write('graph.workspace.ensure',{tier:'compatibility'}),
    read('graph.pages',{tier:'compatibility'}),
    write('graph.page.create',{tier:'compatibility'}),
    write('graph.page.update',{tier:'compatibility'}),
    write('graph.page.delete',{tier:'compatibility'}),
    readerQuery('graph.list','settings','按名称、别名、摘要或当前正文检索人物与世界设定，只返回当前摘要和状态。groupId 包含子夹，null 只查根目录。',{...novel,query,type:z.enum(['character_card','world_entry','world_book']).optional(),groupId:optionalId,...page}),
    readerQuery('graph.get','settings','读取当前完整设定及来源、状态、事实类型、知情范围和版本；stale/unconfirmed 不等于已确认正文事实。',{...novel,nodeId:id,expectedRevision:revision.optional()}),
    read('graph.history',{tier:'advanced'}),
    write('graph.restore',{tier:'advanced'}),
    readerQuery('graph.groups','settings','读取设定文件夹及完整路径。',novel),
    write('graph.group.create'),
    write('graph.group.update'),
    write('graph.group.delete'),
    write('graph.move'),
    write('graph.layout',{tier:'advanced'}),
    write('graph.arrange',{tier:'advanced'}),
    write('graph.continue'),
    write('graph.duplicate',{tier:'advanced'}),
    write('graph.remove',{tier:'advanced'}),
    write('graph.create'),
    write('graph.update'),
    write('graph.updateMany'),
    write('graph.delete'),
    readerQuery('edge.list','settings','读取人物、组织、规则等对象之间的直接关系，nodeId 可限制到一个对象。',{...novel,nodeId:id.optional(),...page}),
    readerQuery('edge.get','settings','读取一条当前关系的完整说明、状态、来源及版本。',{...novel,edgeId:id}),
    write('edge.create'),
    write('edge.update'),
    write('edge.delete'),
    write('edge.disconnect'),
  ], 'cuigengji_memory'),
  ...defineOperations('settings', [
    read('settings.get'),
    write('graph.directory.move'),
    read('graph.layout.get'),
  ]),
];

export const tavernOperations = defineOperations('tavern', [
  write('tavern.preview'),
  write('tavern.import'),
]);

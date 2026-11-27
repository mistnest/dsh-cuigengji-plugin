import {z} from 'zod';
import {defineOperations, read, write, readerQuery} from '../../../platform/tools/definition.ts';
import {id} from '../../../platform/tools/query-fields.ts';

export const guidanceOperations = [
  ...defineOperations('guidance', [
    read('guidance.get'),
    write('guidance.set'),
  ]),
  ...defineOperations('guidance', [
    readerQuery('guidance.read','guidance','按当前连接的授权读取外部写作指引；section=preset/all 可带 novelId。',{novelId:id.optional(),section:z.enum(['core','project','write','plan','memory','preset','all']).optional()},{loadAction:null,panel:false}),
  ], 'cuigengji_guidance'),
];

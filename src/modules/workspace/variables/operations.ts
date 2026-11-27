import {defineOperations, read, write} from '../../../platform/tools/definition.ts';

export const variableOperations = [
  ...defineOperations('variables', [
    read('variables.config'),
    read('variables.list'),
    read('variables.read'),
    read('variables.history',{tier:'advanced'}),
    read('variables.render'),
    read('variables.parse'),
    read('variables.preview'),
    write('variables.patch'),
    write('variables.restore',{tier:'advanced'}),
  ], 'cuigengji_variables'),
  ...defineOperations('variables', [
    write('variables.configure'),
    read('variables.importPreview'),
    write('variables.import'),
  ]),
];

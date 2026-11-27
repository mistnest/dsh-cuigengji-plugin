import {defineOperations, read, write, readerQuery} from '../../../platform/tools/definition.ts';
import {novel} from '../../../platform/tools/query-fields.ts';

export const presetOperations = [
  ...defineOperations('preset', [
    readerQuery('preset.read','guidance','读取这个外部阅读会话首次采用的启用预设；后续沿用该版本，新阅读会话采用新配置。',novel,{loadAction:'preset.get',tool:'cuigengji_guidance'}),
    read('preset.get'),
    read('preset.preview'),
    write('preset.import'),
    write('preset.update'),
  ], 'cuigengji_context'),
  ...defineOperations('preset', [
    write('preset.set'),
  ]),
];

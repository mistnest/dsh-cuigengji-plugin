import {defineOperations, write} from '../../../platform/tools/definition.ts';

export const legacyOperations = defineOperations('legacy', [
  write('legacy.preview'),
]);

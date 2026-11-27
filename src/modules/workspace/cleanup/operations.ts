import {defineOperations, read, write} from '../../../platform/tools/definition.ts';

export const cleanupOperations = defineOperations('cleanup', [
  read('cleanup.preview'),
  write('cleanup.apply'),
]);

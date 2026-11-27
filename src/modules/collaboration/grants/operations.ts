import {defineOperations, read, write} from '../../../platform/tools/definition.ts';

export const externalOperations = defineOperations('external', [
  read('external.status'),
  write('external.create'),
  write('external.update'),
  write('external.revoke'),
  read('external.records'),
], 'cuigengji_connections');

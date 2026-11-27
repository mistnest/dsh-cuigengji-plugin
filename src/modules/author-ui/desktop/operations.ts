import {defineOperations, write} from '../../../platform/tools/definition.ts';

export const petOperations = defineOperations('pet', [
  write('pet.desktop'),
]);

import {defineOperations, read, write} from '../../../platform/tools/definition.ts';



export const usageOperations = defineOperations('usage', [
  write('usage.config'),
  write('usage.configure'),
  write('usage.report'),
  write('usage.refresh'),
  write('usage.presentation'),
  write('usage.probe'),
  write('usage.asset'),
  write('usage.reconcile'),
  write('usage.ack'),
  write('usage.delivered'),
  write('usage.export'),
  write('usage.importPreview'),
  write('usage.import'),
]);

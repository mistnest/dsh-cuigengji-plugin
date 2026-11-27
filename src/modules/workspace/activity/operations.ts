import {defineOperations, read} from '../../../platform/tools/definition.ts';

export const activityOperations = defineOperations('activity', [
  read('activity.today'),
  read('activity.stats'),
]);

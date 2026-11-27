import {activityOperations} from '../activity/operations.ts';
import {legacyOperations} from '../transfer/legacy-operations.ts';
import {cleanupOperations} from '../cleanup/operations.ts';
import {transferOperations} from '../transfer/operations.ts';
import {novelOperations, bindingOperations} from '../novels/operations.ts';
import {manuscriptOperations} from '../chapters/operations.ts';
import {settingOperations, tavernOperations} from '../settings/operations.ts';
import {imageOperations} from '../cards/operations.ts';
import {planningOperations} from '../planning/operations.ts';
import {contextOperations} from '../queries/operations.ts';
import {creativeMemoryOperations} from '../creative-memory/operations.ts';
import {presetOperations} from '../presets/operations.ts';
import {variableOperations} from '../variables/operations.ts';
import {guidanceOperations} from '../queries/guidance-operations.ts';

export const workspaceOperations = Object.freeze([
  ...novelOperations,
  ...manuscriptOperations,
  ...settingOperations,
  ...imageOperations,
  ...planningOperations,
  ...contextOperations,
  ...bindingOperations,
  ...presetOperations,
  ...creativeMemoryOperations,
  ...variableOperations,
  ...guidanceOperations,
  ...tavernOperations,
  ...activityOperations,
  ...transferOperations,
  ...cleanupOperations,
  ...legacyOperations,
]);

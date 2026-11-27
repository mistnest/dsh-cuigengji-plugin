import { activityOperations } from "../activity/operations.js";
import { legacyOperations } from "../transfer/legacy-operations.js";
import { cleanupOperations } from "../cleanup/operations.js";
import { transferOperations } from "../transfer/operations.js";
import { novelOperations, bindingOperations } from "../novels/operations.js";
import { manuscriptOperations } from "../chapters/operations.js";
import { settingOperations, tavernOperations } from "../settings/operations.js";
import { imageOperations } from "../cards/operations.js";
import { planningOperations } from "../planning/operations.js";
import { contextOperations } from "../queries/operations.js";
import { creativeMemoryOperations } from "../creative-memory/operations.js";
import { presetOperations } from "../presets/operations.js";
import { variableOperations } from "../variables/operations.js";
import { guidanceOperations } from "../queries/guidance-operations.js";
const workspaceOperations = Object.freeze([
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
  ...legacyOperations
]);
export {
  workspaceOperations
};

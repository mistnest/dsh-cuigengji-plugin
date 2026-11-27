import { workspaceOperations } from "../../workspace/operations/catalog.js";
import { petOperations } from "../../author-ui/desktop/operations.js";
import { usageOperations } from "../../usage/reports/operations.js";
import { libraryOperations, workspaceDataOperations, maintenanceOperations } from "../../library/roots/operations.js";
import { externalOperations } from "../../collaboration/grants/operations.js";
const OPERATIONS = Object.freeze([
  ...workspaceOperations,
  ...petOperations,
  ...usageOperations,
  ...libraryOperations,
  ...workspaceDataOperations,
  ...maintenanceOperations,
  ...externalOperations
]);
export {
  OPERATIONS
};

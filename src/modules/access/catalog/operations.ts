import {workspaceOperations} from '../../workspace/operations/catalog.ts';
import {petOperations} from '../../author-ui/desktop/operations.ts';
import {usageOperations} from '../../usage/reports/operations.ts';
import {libraryOperations, workspaceDataOperations, maintenanceOperations} from '../../library/roots/operations.ts';
import {externalOperations} from '../../collaboration/grants/operations.ts';

export const OPERATIONS = Object.freeze([
  ...workspaceOperations,
  ...petOperations,
  ...usageOperations,
  ...libraryOperations,
  ...workspaceDataOperations,
  ...maintenanceOperations,
  ...externalOperations,
]);

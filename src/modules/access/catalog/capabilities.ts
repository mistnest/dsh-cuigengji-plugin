import {OPERATIONS} from './operations.ts';
import {grantWrites} from '../../collaboration/grants/writes.ts';

export interface ActionCapability {
  id: string;
  module: string;
  effect: 'read' | 'write';
  tier: 'common' | 'advanced' | 'compatibility';
  dshTool?: string;
  panel: boolean;
  external: boolean;
}

export const ACTION_CAPABILITIES: readonly ActionCapability[] = Object.freeze(
  OPERATIONS.map(({query, ...operation}) => ({...operation, external:operation.effect === 'read'
    ? Boolean(query) : grantWrites.some(command=>command.action===operation.id)})),
);
const byId = new Map(ACTION_CAPABILITIES.map(operation => [operation.id, operation]));
export const actionCapability = (id: string) => byId.get(id);

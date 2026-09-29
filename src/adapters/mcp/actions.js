import { MEMORY_ACTIONS } from '../../contracts/actions.js';
export { MEMORY_ACTIONS };

export const toolName = action => `memory_${action.replaceAll('.', '_')}`;

export function assertMemoryAction(action) {
  if (!MEMORY_ACTIONS.includes(action)) throw new Error(`不允许的记忆操作：${action}`);
}

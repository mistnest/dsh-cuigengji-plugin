import { MEMORY_ACTIONS } from '../catalog/actions.ts';
export { MEMORY_ACTIONS };

export const toolName = (action: string) => `memory_${action.replaceAll('.', '_')}`;

export function assertMemoryAction(action: string) {
  if (!MEMORY_ACTIONS.includes(action)) throw new Error(`不允许的记忆操作：${action}`);
}

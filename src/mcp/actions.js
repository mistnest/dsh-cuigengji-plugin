export const MEMORY_ACTIONS = Object.freeze([
  'graph.list', 'graph.get', 'graph.create', 'graph.update', 'graph.delete',
  'edge.list', 'edge.create', 'edge.update', 'edge.delete', 'context.get',
]);

export const toolName = action => `memory_${action.replaceAll('.', '_')}`;

export function assertMemoryAction(action) {
  if (!MEMORY_ACTIONS.includes(action)) throw new Error(`不允许的记忆操作：${action}`);
}

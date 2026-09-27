// Shared capability contract. Actor policy remains in the host and Store.
export const isReadAction = action => /\.(get|list|history|search)$/.test(action);
export const changesProse = (action, args) => ['chapter.restore', 'chapter.delete'].includes(action)
  || (action === 'volume.delete' && args.chapterPolicy === 'delete')
  || (['chapter.create', 'chapter.update'].includes(action)
    && ['content', 'append', 'patch'].some(key => args[key] !== undefined));
export const TOOL_ACTIONS = Object.freeze({
  cuigengji_project: Object.freeze(['novel.get','volume.list','volume.create','volume.update','volume.delete','chapter.list','chapter.search','chapter.create','chapter.get','chapter.update','chapter.delete','chapter.history','chapter.restore']),
  cuigengji_memory: Object.freeze(['graph.list','graph.get','graph.create','graph.update','graph.delete','edge.list','edge.get','edge.create','edge.update','edge.delete']),
  cuigengji_plan: Object.freeze(['plan.get','plan.set']),
  cuigengji_context: Object.freeze(['context.get','binding.get']),
});
export const MEMORY_ACTIONS = Object.freeze([...TOOL_ACTIONS.cuigengji_memory, 'context.get']);
export const HUMAN_ACTIONS = Object.freeze([...new Set([
  ...Object.values(TOOL_ACTIONS).flat(), 'novel.list','novel.create','novel.import',
  'novel.export','novel.update','novel.archive','binding.set','plan.approve','settings.get','legacy.preview','tavern.preview','tavern.import',
  'preset.get','preset.preview','preset.set',
])]);

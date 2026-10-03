// Shared capability contract. Actor policy remains in the host and Store.
export const isReadAction = action => /\.(get|read|list|groups|pages|decorations|history|search|changes|handoff)$/.test(action);
export const changesProse = (action, args) => ['chapter.restore', 'chapter.delete'].includes(action)
  || (action === 'volume.delete' && args.chapterPolicy === 'delete')
  || (['chapter.create', 'chapter.update'].includes(action)
    && ['content', 'append', 'patch'].some(key => args[key] !== undefined));
export const TOOL_ACTIONS = Object.freeze({
  cuigengji_project: Object.freeze(['novel.get','novel.handoff','volume.list','volume.create','volume.update','volume.delete','chapter.list','chapter.search','chapter.create','chapter.get','chapter.update','chapter.delete','chapter.history','chapter.restore']),
  cuigengji_memory: Object.freeze(['graph.list','graph.get','graph.groups','graph.group.create','graph.group.update','graph.group.delete','graph.move','graph.layout','graph.continue','graph.duplicate','graph.remove','graph.create','graph.update','graph.delete','edge.list','edge.get','edge.create','edge.update','edge.delete','edge.disconnect']),
  cuigengji_plan: Object.freeze(['planning.pages','planning.page.create','planning.page.update','planning.page.delete','planning.decorations','planning.list','planning.search','planning.get','planning.continue','planning.groups','planning.group.create','planning.group.update','planning.group.delete','planning.changes','planning.history','planning.apply','planning.revert']),
  cuigengji_context: Object.freeze(['context.get','binding.get','preset.read']),
});
export const MEMORY_ACTIONS = Object.freeze([...TOOL_ACTIONS.cuigengji_memory, 'context.get']);
export const HUMAN_ACTIONS = Object.freeze([...new Set([
  ...Object.values(TOOL_ACTIONS).flat(), 'novel.list','novel.create','novel.import',
  'novel.export','novel.update','novel.archive','binding.set','settings.get','legacy.preview','tavern.preview','tavern.import',
  'preset.get','preset.preview','preset.set',
  'workspace.status','workspace.export','workspace.preview','workspace.import',
])]);

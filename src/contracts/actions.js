// Shared capability contract. Actor policy remains in the host and Store.
export const isReadAction = action => /\.(get|read|list|groups|pages|decorations|history|search|find|changes|handoff|access|task|tasks|overview|today|stats)$/.test(action);
export const changesProse = (action, args) => ['chapter.restore', 'chapter.delete', 'chapter.replace'].includes(action)
  || (action === 'volume.delete' && args.chapterPolicy === 'delete')
  || (['chapter.create', 'chapter.update'].includes(action)
    && ['content', 'append', 'patch'].some(key => args[key] !== undefined));
export const TOOL_ACTIONS = Object.freeze({
  cuigengji_project: Object.freeze(['novel.list','novel.focus','novel.create','novel.get','novel.handoff','volume.list','volume.create','volume.update','volume.delete','chapter.list','chapter.search','chapter.create','chapter.get','chapter.update','chapter.delete','chapter.history','chapter.restore']),
  cuigengji_memory: Object.freeze(['graph.workspace.ensure','graph.pages','graph.page.create','graph.page.update','graph.page.delete','graph.list','graph.get','graph.history','graph.restore','graph.groups','graph.group.create','graph.group.update','graph.group.delete','graph.move','graph.layout','graph.arrange','graph.continue','graph.duplicate','graph.remove','graph.create','graph.update','graph.delete','edge.list','edge.get','edge.create','edge.update','edge.delete','edge.disconnect']),
  cuigengji_plan: Object.freeze(['planning.pages','planning.page.create','planning.page.update','planning.page.delete','planning.decorations','planning.list','planning.search','planning.get','planning.continue','planning.groups','planning.group.create','planning.group.update','planning.group.delete','planning.changes','planning.history','planning.apply','planning.layout','planning.revert']),
  cuigengji_context: Object.freeze(['context.get','binding.get','preset.read']),
  cuigengji_story: Object.freeze(['story.get','story.apply','story.context.get','story.detect','story.detect.get','story.reference.import']),
});
export const MEMORY_ACTIONS = Object.freeze([...TOOL_ACTIONS.cuigengji_memory, 'context.get', 'guidance.read']);
export const HUMAN_ACTIONS = Object.freeze([...new Set([
  ...Object.values(TOOL_ACTIONS).flat().filter(action=>action!=='novel.focus'), 'novel.list','novel.create','novel.import',
  'activity.today','activity.stats','pet.desktop','guidance.get','guidance.set',
  'novel.export','novel.update','novel.archive','novel.restore','novel.purge','binding.set','settings.get','legacy.preview','tavern.preview','tavern.import',
  'preset.get','preset.preview','preset.set',
  'chapter.move','chapter.find','chapter.replace',
  'graph.directory.move','planning.directory.move',
  'planning.layout.get','graph.layout.get',
  'library.status','library.pick','library.inspect','library.change',
  'workspace.status','workspace.export','workspace.preview','workspace.import',
  'transfer.catalog','transfer.inspect','transfer.preview','transfer.import','transfer.exportPreview','transfer.export',
  'maintenance.status','maintenance.verify',
])]);

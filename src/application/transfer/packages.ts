import {ensurePlanning} from '../../domain/planning/model.ts';
import {previewTavern} from '../../infrastructure/migrations/tavern.js';
import type {Novel, Selection, PackagePayload, DataPackage, MemoryNode, MemoryEdge} from '../../contracts/transfer.ts';
import {active, copy, fail, hash, checkSelection, own} from './model.ts';
import {portableNovel} from '../../domain/collaboration/legacy.ts';
import {directoryKey} from '../../domain/directory/order.ts';
import {groupDescendants,groupTrail} from '../../domain/directory/groups.ts';
import {readStory} from '../../domain/story/model.ts';
import {chapterStory} from '../../domain/story/transfer.ts';

export interface Slice {projects: Novel[]; warnings: string[]; dependencies: {kind: string; title: string}[]}
const pick = <T>(map: Record<string, T>, ids: Set<string>) => Object.fromEntries([...ids].map(id => [id, copy(map[id])]));
const required = <T>(map: Record<string, T>, ids: (string | null)[], label: string) => {for (const id of ids) if (id !== null && !own(map, id)) fail(`${label}已不存在，请重新选择`);};

/** Pure selection and reference closure. No filesystem names enter the format. */
export function selectProjects(source: Novel[], selection: Selection): Slice {
  checkSelection(selection);
  if (selection.kind === 'workspace') fail('完整工作库不能作为局部内容选择');
  if (selection.kind === 'works') {
    const ids = selection.novelIds ?? source.map(n => n.id);
    if (!ids.length) fail('请至少选择一部作品');
    const state = {novels:Object.fromEntries(source.map(n => [n.id,n]))};
    const projects = ids.map(id => portableNovel(state as any, source.find(n => n.id === id) ?? fail('所选作品已不存在')));
    return {projects, warnings: [], dependencies: []};
  }
  const original = source.find(n => n.id === selection.novelId) ?? fail('请选择一部作品');
  const n = copy(original), board = ensurePlanning(n);
  const chapters = new Set<string>(), nodes = new Set<string>(), beats = new Set<string>();
  const pages = new Set<string | null>(), decorations = new Set<string>();
  if (selection.kind === 'chapters') {
    if (selection.chapterIds !== undefined) {required(n.chapters, selection.chapterIds, '章节'); for (const id of selection.chapterIds) if (!n.chapters[id].deleted) chapters.add(id);}
    if (selection.volumeIds !== undefined) {required(n.volumes, selection.volumeIds, '卷'); for (const c of active(n.chapters)) if (c.volumeId && selection.volumeIds.includes(c.volumeId)) chapters.add(c.id);}
    if (selection.chapterIds === undefined && selection.volumeIds === undefined) for (const c of active(n.chapters)) chapters.add(c.id);
  } else if (selection.kind === 'memory') {
    if(selection.pageIds!==undefined){required(n.memoryPages||{},selection.pageIds,'设定画布');for(const m of active(n.nodes))if(selection.pageIds.includes(m.pageId??null))nodes.add(m.id);}
    if (selection.nodeIds !== undefined) {required(n.nodes, selection.nodeIds, '设定'); for (const id of selection.nodeIds) if (!n.nodes[id].deleted) nodes.add(id);}
    if (selection.groupIds !== undefined) {required(n.memoryGroups || {}, selection.groupIds, '设定分组');const ids=new Set<string|null>(selection.groupIds.flatMap(id=>id?[...groupDescendants(Object.values(n.memoryGroups||{}),id)]:[null])); for (const m of active(n.nodes)) if (ids.has(m.groupId ?? null)) nodes.add(m.id);}
    if (selection.nodeIds === undefined && selection.groupIds === undefined&&selection.pageIds===undefined) for (const m of active(n.nodes)) nodes.add(m.id);
    if (selection.memoryType) for (const id of nodes) if (selection.memoryType === 'world_entry' ? n.nodes[id].type === 'character_card' : n.nodes[id].type !== 'character_card') nodes.delete(id);
  } else if (selection.kind === 'planning') {
    const ids = selection.pageIds ?? [...(n.transferScope?.mainPage === false ? [] : [null]), ...active(board.pages).map(p => p.id)];
    if (n.transferScope?.mainPage === false && ids.includes(null)) fail('这个数据包没有包含主线规划，请重新选择');
    required(board.pages || {}, ids, '规划页');
    for (const id of ids) {if (id !== null && board.pages[id].deleted) fail('所选规划页已删除'); pages.add(id);}
    for (const b of active(board.nodes)) if (pages.has(b.pageId ?? null)) beats.add(b.id);
    for (const d of active(board.decorations)) if (pages.has(d.pageId ?? null)) decorations.add(d.id);
  } else if (!n.preset) fail('这部作品还没有写作预设');
  if (selection.kind === 'chapters' && !chapters.size || selection.kind === 'memory' && !nodes.size && !selection.pageIds?.length && !selection.groupIds?.length || selection.kind === 'planning' && !pages.size) fail('请至少选择一项内容');
  const initialChapters = new Set(chapters), initialNodes = new Set(nodes);
  if (selection.includeDependencies) {
    if (selection.kind === 'chapters' && n.story !== undefined) for (const item of Object.values(readStory(n).tracking)) if (chapters.has(item.chapterId)) for (const id of item.activeCharacterIds) nodes.add(id);
    for (const id of beats) {for (const ref of board.nodes[id].chapterRefs) chapters.add(ref.chapterId); for (const ref of board.nodes[id].memoryRefs) nodes.add(ref);}
    // Dependencies may be cyclic. Iterate a finite set to closure, retaining all evidence versions.
    let changed = true;
    while (changed) {
      const before = nodes.size + chapters.size;
      const relations = active(n.edges).filter(e => nodes.has(e.from) && nodes.has(e.to));
      for (const m of [...[...nodes].map(id => n.nodes[id]), ...relations]) {
        for (const ref of m.sources) chapters.add(ref.chapterId);
        for (const id of m.dependsOn) nodes.add(id);
        for (const id of m.knownBy) if (own(n.nodes, id)) nodes.add(id);
      }
      changed = before !== nodes.size + chapters.size;
    }
  }
  const warnings: string[] = [], dependencies: Slice['dependencies'] = [];
  for (const id of chapters) if (!initialChapters.has(id)) dependencies.push({kind: '正文', title: n.chapters[id].title});
  for (const id of nodes) if (!initialNodes.has(id)) dependencies.push({kind: '设定', title: n.nodes[id].name});
  const result: Novel = {...copy(n), volumes: {}, chapters: pick(n.chapters, chapters), nodes: pick(n.nodes, nodes), edges: {}, memoryGroups: {},memoryPages:{},plan: null};
  delete result.planning; delete result.preset; delete result.tavernSources; delete result.collaboration; delete result.collaborationProgress; delete result.story;
  delete result.variables;
  if(n.variables?.enabled)warnings.push('局部数据包不携带整本书的剧情变量和会话草稿；含取值宏的文本保留原文，可在目标作品初始化变量。完整作品备份会保留变量轨迹。');
  const volumes = new Set<string>();
  for (const ch of Object.values(result.chapters)) {
    if (ch.volumeId) volumes.add(ch.volumeId);
    for (const v of ch.versions) if (v.volumeId && own(n.volumes, v.volumeId)) volumes.add(v.volumeId);
  }
  result.volumes = pick(n.volumes, volumes);
  const relations = active(n.edges).filter(e => nodes.has(e.from) && nodes.has(e.to));
  result.edges = Object.fromEntries(relations.map(e => [e.id, copy(e)]));
  let detached = 0;
  for (const m of [...Object.values(result.nodes), ...Object.values(result.edges)] as (MemoryNode | MemoryEdge)[]) {
    const missing = m.sources.filter(s => !chapters.has(s.chapterId)).length + m.dependsOn.filter(id => !nodes.has(id)).length + m.knownBy.filter(id => own(n.nodes, id) && !nodes.has(id)).length;
    m.sources = m.sources.filter(s => chapters.has(s.chapterId)); m.dependsOn = m.dependsOn.filter(id => nodes.has(id));
    m.knownBy = m.knownBy.filter(id => !own(n.nodes, id) || nodes.has(id));
    if (missing) {detached += missing; m.status = 'unconfirmed'; m.factType = 'unconfirmed';}
    if ('groupId' in m && m.groupId && n.memoryGroups?.[m.groupId]) result.memoryGroups![m.groupId] = copy(n.memoryGroups[m.groupId]);
  }
  // A selected setting includes its own history, but never references to
  // evidence/settings outside the chosen package. Keep surviving group names
  // so old snapshots remain readable after a copy remaps all IDs.
  for (const m of Object.values(result.nodes)) for (const v of m.versions || []) {
    const missing = v.sources.some(ref => !chapters.has(ref.chapterId)) || v.dependsOn.some(id => !nodes.has(id)) || v.knownBy.some(id => own(n.nodes, id) && !nodes.has(id));
    v.sources = v.sources.filter(ref => chapters.has(ref.chapterId));
    v.dependsOn = v.dependsOn.filter(id => nodes.has(id));
    v.knownBy = v.knownBy.filter(id => !own(n.nodes, id) || nodes.has(id));
    if (v.groupId && n.memoryGroups?.[v.groupId]) result.memoryGroups![v.groupId] = copy(n.memoryGroups[v.groupId]);
    else v.groupId = null;
    if (missing) {v.status = 'unconfirmed'; v.factType = 'unconfirmed';}
  }
  // Keep an original Tavern source only when every entry in that original is included.
  // Imported fragments cannot secretly carry unselected characters or world entries.
  const retainedSources = new Set<string>();
  for (const [fingerprint, original] of Object.entries(n.tavernSources || {})) {
    const members = Object.values(result.nodes).filter(m => m.tavern?.fingerprint === fingerprint);
    if (!members.length) continue;
    let complete = false;
    try {complete = previewTavern({json: original.raw}).nodes.every(entry => members.some(m => m.tavern?.index === entry.sourceIndex));} catch { /* Old opaque sources stay only in complete work backups. */ }
    if (complete) {result.tavernSources ??= {}; result.tavernSources[fingerprint] = copy(original); retainedSources.add(fingerprint);}
  }
  for (const m of Object.values(result.nodes)) if (m.tavern && !retainedSources.has(m.tavern.fingerprint)) delete m.tavern;
  if (selection.kind === 'memory') for (const id of selection.groupIds || []) if (id) for(const child of groupDescendants(Object.values(n.memoryGroups||{}),id)) if(n.memoryGroups?.[child])result.memoryGroups![child]=copy(n.memoryGroups[child]);
  if(selection.kind==='memory'&&selection.nodeIds===undefined&&selection.groupIds===undefined&&selection.pageIds===undefined)result.memoryGroups=copy(n.memoryGroups||{});
  if(selection.kind==='memory'&&selection.pageIds)for(const id of selection.pageIds)if(id&&n.memoryPages?.[id])result.memoryPages![id]=copy(n.memoryPages[id]);
  if(selection.kind==='memory'&&selection.pageIds)for(const group of Object.values(n.memoryGroups||{}))if(selection.pageIds.includes(group.pageId??null))result.memoryGroups![group.id]=copy(group);
  // A partial package carries the complete parent path of each retained group.
  for(const group of Object.values(result.memoryGroups||{}))for(const ancestor of groupTrail(Object.values(n.memoryGroups||{}),group.id))result.memoryGroups![ancestor.id]=copy(ancestor);
  for(const item of [...Object.values(result.nodes),...Object.values(result.memoryGroups||{}),...Object.values(result.nodes).flatMap(m=>m.versions||[])])if(item.pageId&&n.memoryPages?.[item.pageId as string])result.memoryPages![item.pageId as string]=copy(n.memoryPages[item.pageId as string]);
  if(result.memoryPageFolders)result.memoryPageFolders=Object.fromEntries(Object.entries(result.memoryPageFolders).filter(([,groupId])=>own(result.memoryGroups!,groupId)));
  if (selection.kind === 'planning') {
    result.transferScope = {mainPage: pages.has(null)};
    result.planning = {formatVersion: 2, sequence: 0, transactions: [], nodes: pick(board.nodes, beats), edges: {},
      pages: pick(board.pages || {}, new Set([...pages].filter((id): id is string => id !== null))), groups: Object.fromEntries(Object.values(board.groups).filter(g=>!g.deleted&&pages.has(g.pageId??null)).map(g=>[g.id,copy(g)])), decorations: pick(board.decorations || {}, decorations)};
    for (const e of active(board.edges)) if (beats.has(e.from) && beats.has(e.to)) result.planning.edges[e.id] = copy(e);
    for (const b of Object.values(result.planning.nodes)) {
      const before = b.chapterRefs.length + b.memoryRefs.length;
      b.chapterRefs = b.chapterRefs.filter(ref => chapters.has(ref.chapterId)); b.memoryRefs = b.memoryRefs.filter(id => nodes.has(id));
      detached += before - b.chapterRefs.length - b.memoryRefs.length;
      if (b.status === 'written' && !b.chapterRefs.length) {b.status = 'selected'; warnings.push(`“${b.title}”未携带正文证据，导入时改为“准备采用”。`);}
      if (b.parentId && !beats.has(b.parentId)) b.parentId = null;
      if (b.groupId && board.groups[b.groupId]) result.planning.groups[b.groupId] = copy(board.groups[b.groupId]);
      delete b.lastSequence;
    }
    for(const group of Object.values(result.planning.groups))for(const ancestor of groupTrail(Object.values(board.groups),group.id))result.planning.groups[ancestor.id]=copy(ancestor);
  }
  if (selection.kind === 'preset') result.preset = copy(n.preset!);
  if(result.directoryOrder){
    result.directoryOrder=Object.fromEntries(Object.entries(result.directoryOrder).flatMap(([key,order])=>{
      if(key==='graph'||key.startsWith('graph:'))return [[key,order.filter(id=>own(result.nodes,id))]];
      const pageId=key.slice('planning:'.length)||null;
      if(!result.planning||(pageId&&!own(result.planning.pages,pageId))||(!pageId&&result.transferScope?.mainPage===false))return [];
      return [[directoryKey('planning',pageId),order.filter(id=>own(result.planning!.nodes,id))]];
    }));
  }
  if (selection.kind === 'chapters') {
    const partial = chapterStory(n, chapters, nodes);
    if (partial.story) result.story = partial.story;
    detached += partial.detached;
  }
  if (detached) warnings.push(`未携带的 ${detached} 项正文或设定引用会移除；相关设定需重新确认。`);
  return {projects: [result], warnings, dependencies};
}

export function dataPackage(slice: Slice, kind: PackagePayload['kind']): DataPackage {
  const payload: PackagePayload = {kind, projects: slice.projects, warnings: slice.warnings};
  return {format: 'cuigengji-package', version: 1, exportedAt: new Date().toISOString(), sha256: hash(JSON.stringify(payload)), payload};
}
export function readPackage(value: unknown): PackagePayload {
  const pkg = value as DataPackage;
  if (!pkg || pkg.format !== 'cuigengji-package' || pkg.version !== 1 || !pkg.payload || !Array.isArray(pkg.payload.projects) || !pkg.payload.projects.length || pkg.payload.projects.length > 200 || !['works', 'chapters', 'memory', 'planning', 'preset'].includes(pkg.payload.kind) || !Array.isArray(pkg.payload.warnings) || pkg.payload.warnings.some(v => typeof v !== 'string')) fail('不支持的数据包格式');
  if (pkg.sha256 !== hash(JSON.stringify(pkg.payload))) fail('数据包校验失败：文件不完整或已被修改');
  if (new Set(pkg.payload.projects.map(n => n.id)).size !== pkg.payload.projects.length) fail('数据包有重复的作品 ID');
  return copy(pkg.payload);
}

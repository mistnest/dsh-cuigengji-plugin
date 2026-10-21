import {randomUUID} from 'node:crypto';
import {ensurePlanning} from '../../domain/planning/model.ts';
import {validatePreset} from '../../domain/preset/index.js';
import type {Collection, PlanningEntity, Change} from '../../contracts/planning.ts';
import type {Novel, PresetData, ImportOptions} from '../../contracts/transfer.ts';
import {copy, newNovel, own} from './model.ts';
import {directoryKey,orderedDirectory} from '../../domain/directory/order.ts';

const idMap = (map: object = {}): Map<string,string> => new Map(Object.keys(map).map(id => [id, randomUUID() as string]));
const remap = (map: Map<string, string>, id: string | null | undefined) => id ? map.get(id) ?? null : null;
const maxOrder = (items: {order: number}[]) => items.reduce((max, item) => Math.max(max, item.order), -1);
function uniqueName(name: string, items: {name: string}[]) {
  const names = new Set(items.map(i => i.name));
  if (!names.has(name)) return name;
  let candidate = name + ' · 导入', index = 2;
  while (names.has(candidate)) candidate = `${name} · 导入 ${index++}`;
  return candidate;
}

/** Share/copy never aliases source IDs or treats imported settings as confirmed facts.
 * Version numbers remain meaningful inside the copied chapters and their references. */
export function copyInto(source: Novel, target: Novel, options: ImportOptions): void {
  const n = copy(source), time = new Date().toISOString();
  const volumeIds = idMap(n.volumes), chapterIds = idMap(n.chapters), nodeIds = idMap(n.nodes), edgeIds = idMap(n.edges), groupIds = idMap(n.memoryGroups);
  const memoryPageIds=idMap(n.memoryPages);
  if(Object.keys(n.memoryPages||{}).length){target.memoryPages??={};for(const p of Object.values(n.memoryPages!)){const id=memoryPageIds.get(p.id)!;target.memoryPages[id]={...copy(p),id,name:uniqueName(p.name,Object.values(target.memoryPages)),updatedAt:time};}}
  let volumeOrder = maxOrder(Object.values(target.volumes)) + 1;
  for (const v of Object.values(n.volumes).sort((a, b) => a.order - b.order)) {
    const id = volumeIds.get(v.id)!;
    target.volumes[id] = {...copy(v), id, order: volumeOrder++, updatedAt: time};
  }
  const nextOrders = new Map<string | null, number>();
  for (const c of Object.values(n.chapters).sort((a, b) => a.order - b.order)) {
    const id = chapterIds.get(c.id)!, volumeId = remap(volumeIds, c.volumeId);
    const order = nextOrders.get(volumeId) ?? maxOrder(Object.values(target.chapters).filter(ch => ch.volumeId === volumeId)) + 1;
    nextOrders.set(volumeId, order + 1);
    target.chapters[id] = {...copy(c), id, volumeId, order, updatedAt: time,
      versions: c.versions.map(v => ({...copy(v), volumeId: remap(volumeIds, v.volumeId), order, actor: {kind: 'human', sessionId: null}}))};
  }
  const groups = Object.values(n.memoryGroups || {});
  if (groups.length) target.memoryGroups ??= {};
  for (const g of groups) {const id = groupIds.get(g.id)!,parentId=remap(groupIds,g.parentId),pageId=remap(memoryPageIds,g.pageId); target.memoryGroups![id] = {...copy(g), id, parentId,pageId,name: uniqueName(g.name, Object.values(target.memoryGroups!).filter(other=>(other.parentId??null)===parentId&&(other.pageId??null)===pageId)), updatedAt: time};}
  const references = (m: {sources: {chapterId: string; revision: number}[]; dependsOn: string[]; knownBy: string[]}) => ({
    sources: m.sources.flatMap(ref => {const chapterId = chapterIds.get(ref.chapterId); return chapterId ? [{...ref, chapterId}] : [];}),
    dependsOn: m.dependsOn.flatMap(id => {const mapped = nodeIds.get(id); return mapped ? [mapped] : [];}), knownBy: m.knownBy.map(id => nodeIds.get(id) ?? id)});
  for (const m of Object.values(n.nodes)) {
    const id = nodeIds.get(m.id)!;
    target.nodes[id] = {...copy(m), id, groupId: remap(groupIds, m.groupId),pageId:remap(memoryPageIds,m.pageId), ...references(m),
      status: m.status === 'retired' ? 'retired' : 'unconfirmed', factType: 'unconfirmed', updatedAt: time};
    if (m.versions) target.nodes[id].versions = m.versions.map((v, index) => ({...copy(v), ...references(v),
      groupId: remap(groupIds, v.groupId||(v.pageId?n.memoryPageFolders?.[String(v.pageId)]:null)),pageId:remap(memoryPageIds,v.pageId as string|null|undefined), actor: {kind: 'human', sessionId: null},
      ...(index === m.versions!.length - 1 ? {status: target.nodes[id].status, factType: target.nodes[id].factType} : {})}));
  }
  for (const e of Object.values(n.edges)) {
    const id = edgeIds.get(e.id)!;
    target.edges[id] = {...copy(e), id, from: nodeIds.get(e.from)!, to: nodeIds.get(e.to)!, ...references(e),
      status: e.status === 'retired' ? 'retired' : 'unconfirmed', factType: 'unconfirmed', updatedAt: time};
  }
  for(const [key,order] of Object.entries(n.directoryOrder||{}))if(key==='graph'||key.startsWith('graph:')){
    const oldPage=key==='graph'?null:key.slice('graph:'.length),newPage=remap(memoryPageIds,oldPage),newKey=directoryKey('graph',newPage);
    const copied=new Set<string>(nodeIds.values());
    const previous=orderedDirectory(Object.values(target.nodes).filter(node=>!copied.has(node.id)&&(node.pageId??null)===newPage),target.directoryOrder?.[newKey]).map(node=>node.id);
    target.directoryOrder={...target.directoryOrder,[newKey]:[...previous,...orderedDirectory(Object.values(n.nodes).filter(node=>(node.pageId??null)===oldPage),order).map(node=>nodeIds.get(node.id)!)]};
  }
  if (n.tavernSources) {target.tavernSources ??= {}; for (const [id, value] of Object.entries(n.tavernSources)) if (!own(target.tavernSources, id)) target.tavernSources[id] = copy(value);}
  if (n.preset) mergePreset(target, n.preset, options.presetPolicy || 'append');
  if (n.planning || n.plan) {
    const board = ensurePlanning(n), draft = ensurePlanning(target);
    draft.pages ??= {}; draft.decorations ??= {};
    const ids = {nodes: idMap(board.nodes), edges: idMap(board.edges), groups: idMap(board.groups), pages: idMap(board.pages), decorations: idMap(board.decorations)};
    const mainPage = randomUUID();
    const changes: Change[] = [];
    const stamp = {lastSequence: draft.sequence + 1, updatedAt: time, actor: {kind: 'human', sessionId: null}};
    const put = (collection: Collection, value: PlanningEntity) => {
      (draft[collection] as Record<string, PlanningEntity>)[value.id] = value;
      changes.push({collection, id: value.id, before: null, after: copy(value)});
    };
    if (n.transferScope?.mainPage ?? true)
      put('pages', {id: mainPage, revision: 1, name: uniqueName(`${source.title} · 主线规划`, Object.values(draft.pages)), summary: '导入的独立规划页', deleted: false, ...stamp});
    for (const p of Object.values(board.pages || {})) put('pages', {...copy(p), id: ids.pages.get(p.id)!, name: uniqueName(p.name, Object.values(draft.pages)), ...stamp});
    for (const g of Object.values(board.groups)) {const parentId=remap(ids.groups,g.parentId);put('groups', {...copy(g), id: ids.groups.get(g.id)!, parentId,pageId:remap(ids.pages,g.pageId)??mainPage,name: uniqueName(g.name, Object.values(draft.groups).filter(other=>(other.parentId??null)===parentId)), ...stamp});}
    for (const b of Object.values(board.nodes)) put('nodes', {...copy(b), id: ids.nodes.get(b.id)!,
      parentId: remap(ids.nodes, b.parentId), groupId: remap(ids.groups, b.groupId), pageId: remap(ids.pages, b.pageId) ?? mainPage,
      chapterRefs: b.chapterRefs.map(ref => ({...ref, chapterId: chapterIds.get(ref.chapterId)!})),
      memoryRefs: b.memoryRefs.map(id => nodeIds.get(id)!), ...stamp});
    for (const e of Object.values(board.edges)) put('edges', {...copy(e), id: ids.edges.get(e.id)!, from: ids.nodes.get(e.from)!, to: ids.nodes.get(e.to)!, ...stamp});
    for (const d of Object.values(board.decorations || {})) put('decorations', {...copy(d), id: ids.decorations.get(d.id)!, pageId: remap(ids.pages, d.pageId) ?? mainPage,groupId:remap(ids.groups,d.groupId),
      ...(d.members!==undefined?{members:d.members.flatMap(id=>{const mapped=ids.nodes.get(id)??ids.decorations.get(id);return mapped?[mapped]:[];})}:{}),...stamp});
    for(const [key,order] of Object.entries(n.directoryOrder||{}))if(key.startsWith('planning:')){
      const oldPage=key.slice('planning:'.length),newPage=oldPage?ids.pages.get(oldPage):mainPage;
      if(newPage)target.directoryOrder={...target.directoryOrder,[directoryKey('planning',newPage)]:order.flatMap(id=>{const mapped=ids.nodes.get(id);return mapped?[mapped]:[];})};
    }
    draft.sequence++;
    draft.transactions.push({id: randomUUID(), sequence: draft.sequence, ...stamp, reason: `导入“${source.title}”的规划`, changes});
  }
  target.revision++; target.updatedAt = time;
}
function mergePreset(target: Novel, preset: PresetData, policy: 'append' | 'replace') {
  const previous = target.preset, value = copy(preset), used = new Set(policy === 'append' ? previous?.blocks.map(b => b.identifier) : []);
  for (const b of value.blocks) {if (used.has(b.identifier)) b.identifier = randomUUID(); used.add(b.identifier);}
  target.preset = {...value, id: previous?.id || randomUUID(), name: policy === 'append' && previous ? previous.name : value.name,
    blocks: policy === 'append' && previous ? [...copy(previous.blocks), ...value.blocks] : value.blocks,
    enabled: false, revision: (previous?.revision || 0) + 1, updatedAt: new Date().toISOString(),
    ...(policy === 'append' && previous?.raw !== undefined ? {raw: {previous: previous.raw, imported: value.raw ?? null}} : {})};
  validatePreset(target.preset);
}
export function copyWork(source: Novel, options: ImportOptions): Novel {
  const result = newNovel(options.title?.trim() || source.title);
  result.description = source.description || '';
  copyInto(source, result, options);
  return result;
}

import {readableFileName, validManagedFileName, managedFileKey, shortFileId, pageKey, type Row, type PlanningIndex} from './project-layout.ts';
import {groupTrail,type GroupBranch} from '../../domain/directory/groups.ts';

/** Paths describe presentation only. References and history always keep entity IDs. */
export const validManagedPath = (value: unknown): value is string => {
  if (typeof value !== 'string' || value.length > 600 || value.includes('\\')) return false;
  const parts = value.split('/');
  return validManagedFileName(parts.at(-1)) && parts.slice(0, -1).every(part =>
    !!part && part.length <= 80 && !/[<>:"/\\|?*\u0000-\u001f\u007f]/.test(part) && !/[ .]$/.test(part) && !/^\./.test(part) && !/^(con|prn|aux|nul|com[1-9¹²³]|lpt[1-9¹²³])(?:\.|$)/i.test(part));
};
const folder = (label: string | undefined, id: string, fallback: string) => {
  const stem = readableFileName(label, id, fallback).replace(/--[a-f0-9]{8}\.json$/, '');
  return Array.from(stem).slice(0, 34).join('').replace(/[ .]+$/, '') + '--' + shortFileId(id);
};
const directory = (path: string) => path.slice(0, path.lastIndexOf('/') + 1);
function groupDirectory(groups:Record<string,Row>|undefined,id:string|null|undefined):string {
  if(!id)return '';
  const trail=groupTrail(Object.values(groups||{}) as GroupBranch[],id);
  const parts=trail.map(group=>folder(group.name,group.id,'未命名分组'));
  if(!parts.length)return folder(undefined,id,'未命名分组');
  // Extremely deep logical trees must not make a save fail on path length.
  // The index retains the complete hierarchy; only the physical middle is shortened.
  return parts.join('/').length<=340?parts.join('/'):[parts[0],`更多层级--${shortFileId(id)}`,...parts.slice(-2)].join('/');
}

function paths(rows: Record<string, Row>, previous: Record<string, Row>, occupied: string[], destination: (row: Row) => string, title: (row: Row) => string) {
  const used = new Set([...occupied, ...Object.values(previous).map(row => row.file).filter(Boolean)].map(managedFileKey));
  const claimed = new Set<string>(), result: Record<string, string> = {};
  for (const [id, row] of Object.entries(rows)) {
    const dir = destination(row) + '/', old = previous[id]?.file;
    if (validManagedPath(old) && directory(old) === dir && previous[id]?.treeTitle === title(row) && !claimed.has(managedFileKey(old))) {
      result[id] = old; claimed.add(managedFileKey(old)); continue;
    }
    const leaf = readableFileName(title(row), id), suffix = leaf.match(/--[a-f0-9]{8}\.json$/)![0];
    let candidate = dir + leaf, number = 2;
    while (used.has(managedFileKey(candidate))) {
      const ending = `（${number++}）` + suffix;
      let stem = '';
      for (const char of leaf.slice(0,-suffix.length)) {if(stem.length+char.length+ending.length>120)break;stem+=char;}
      candidate = dir + stem + ending;
    }
    if (!validManagedPath(candidate)) throw Object.assign(new Error('内容目录路径无效'), {code:'INVALID_PATH'});
    result[id] = candidate; used.add(managedFileKey(candidate)); claimed.add(managedFileKey(candidate));
  }
  return result;
}

export function treeChapterFiles(novel: Row, previous: Record<string, Row> = {}, occupied: string[] = []) {
  return paths(novel.chapters || {}, Object.fromEntries(Object.entries(previous).map(([id, row]) => [id, {...row, treeTitle: row.metadata?.title}])), occupied,
    row => (row.deleted ? '回收站/' : '') + (row.volumeId ? folder(novel.volumes?.[row.volumeId]?.title || novel.volumes?.[row.volumeId]?.name, row.volumeId, '未命名卷') : '未分卷'), row => row.title);
}
export function treeSettingFiles(novel: Row, previous: Record<string, Row> = {}, occupied: string[] = []) {
  return paths(novel.nodes || {}, Object.fromEntries(Object.entries(previous).map(([id, row]) => [id, {...row, treeTitle: row.name}])), occupied,
    row => [row.pageId?folder(novel.memoryPages?.[row.pageId]?.name,row.pageId,'未命名画布'):'设定总览--main',row.deleted?'回收站':'',groupDirectory(novel.memoryGroups,row.groupId)].filter(Boolean).join('/'), row => row.name);
}
export function treePlanningFiles(board: Row, previous?: PlanningIndex | null, occupied: string[] = []) {
  const pageIds = new Set<string | null>([null, ...Object.keys(board.pages || {})]);
  for (const value of [...Object.values(board.nodes || {}), ...Object.values(board.decorations || {})] as Row[]) pageIds.add(value.pageId ?? null);
  const pageDirectories = Object.fromEntries([...pageIds].map(id => [id ?? '~main', id ? folder(board.pages?.[id]?.name, id, '未命名页面') : '主线总览--main']));
  const pageRows = Object.fromEntries([...pageIds].map(id=>[pageKey(id),{pageId:id}]));
  const oldPages = Object.fromEntries(Object.entries(previous?.pageFiles||{}).map(([id,file])=>[id,{file,treeTitle:'画布'}]));
  const pageFiles = paths(pageRows,oldPages,occupied,row=>pageDirectories[row.pageId??'~main'],()=> '画布');
  const nodeDirectory = (row: Row) => [pageDirectories[row.pageId ?? '~main'],row.deleted?'回收站':'',groupDirectory(board.groups,row.groupId)].filter(Boolean).join('/');
  const nodePrevious = Object.fromEntries(Object.entries(previous?.nodes || {}).map(([id, row]) => [id, {...row, file:previous?.nodeFiles?.[id], treeTitle:row.title}]));
  const decorationPrevious = Object.fromEntries(Object.entries(previous?.decorations || {}).map(([id, row]) => [id, {...row, file:previous?.decorationFiles?.[id], treeTitle:row.title || (row.kind === 'frame' ? '讨论框' : '文字批注')}]));
  const nodeFiles=paths(board.nodes || {},nodePrevious,[...occupied,...Object.values(pageFiles)],nodeDirectory,row=>row.title);
  return {pageFiles,nodeFiles,
    decorationFiles:paths(board.decorations || {}, decorationPrevious, [...occupied,...Object.values(pageFiles),...Object.values(nodeFiles)],nodeDirectory,row => row.title || (row.kind === 'frame' ? '讨论框' : '文字批注'))};
}

export const pageManifest = (page: Row) => ({pageId:page.pageId, nodeIds:Object.keys(page.nodes), edges:page.edges, decorationIds:Object.keys(page.decorations)});

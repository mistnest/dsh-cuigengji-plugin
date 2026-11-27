import type {Row} from '../operations/record-reader.ts';
import {compilePreset} from './index.ts';
import {variableAction} from '../variables/index.ts';

export type ReadSessionPreset = (novel: Row, args: Row, actor: Row, chapterId?: string) => Promise<unknown>;
export interface PresetSnapshot {enabled:boolean; name:string; revision:number; content:string}
interface SnapshotIO {
  loadSnapshot(novelId:string, sessionId?:string):Promise<{preset?:Row; snapshot?:PresetSnapshot; capturePath?:string}>;
  saveSnapshot(path:string, snapshot:PresetSnapshot):Promise<void>;
}

/** The caller holds the project transaction lock while capturing this snapshot. */
export async function readSessionPreset(novel: Row, args: Row, actor: Row, chapterId: string | undefined, {loadSnapshot, saveSnapshot}: SnapshotIO) {
  const sessionId = actor.kind === 'agent' ? actor.sessionId : undefined;
  const {preset, snapshot, capturePath} = await loadSnapshot(novel.id, sessionId);
  const effective = snapshot ?? {
    enabled: Boolean(preset?.enabled),
    name: preset?.name || '',
    revision: preset?.revision || 0,
    content: compilePreset(preset),
  };
  const rendered = novel.variables?.enabled ? variableAction(novel, 'variables.render', {
    text: effective.content,
    ...(chapterId ? {chapterId, chapterRevision:args.chapterRevision, position:args.position || 'start'} : {}),
  }, actor) : null;
  // Dispatch holds the store lock. Capture the template only after a
  // successful read, and resolve its variables against current story state.
  if (capturePath) await saveSnapshot(capturePath, effective);
  return rendered ? {...effective, content:rendered.content,
    variableSnapshot:{id:rendered.snapshotId, revision:rendered.revision}, warnings:rendered.warnings} : effective;
}

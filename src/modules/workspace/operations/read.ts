import type {WorkspaceRecordReader, Row} from './record-reader.ts';
import {sharedPlanRefs} from '../novels/legacy/legacy.ts';
import {activityRange, localDay, tracksActivity, tracksProse} from '../activity/activity.ts';
import {hash as digest, own} from './records.ts';
import {loadBookOperation} from './load.ts';

/** Select logical records for one operation. File paths belong to the library. */
export async function loadActionRecords(read: WorkspaceRecordReader, action: string, args: Row, actor: Row) {
  const {state} = read;
  if (action === 'activity.stats' || action === 'activity.today') await read.manuscriptCounts(args.novelId);
  if (action === 'activity.stats') {
    const {from,to}=activityRange(args);
    await read.activity(read.activityYears.filter(year=>year>=from.slice(0,4)&&year<=to.slice(0,4)));
    return state;
  }
  if(action==='activity.today'||tracksActivity(action))await read.activity([localDay().slice(0,4)].filter(year=>read.activityYears.includes(year)));
  if(action==='activity.today')return state;
  if (typeof args.requestId === 'string') {
    const key = digest(args.requestId), previous = await read.receipt(key);
    if (previous !== undefined) {
      const cachedNovelId = args.novelId || state.bindings[digest(actor.sessionId || '')]?.novelId || previous.novelId;
      if (state.novels[cachedNovelId]?.archived && !(actor.kind === 'human' && ['novel.get', 'novel.export', 'novel.archive', 'novel.restore', 'novel.purge'].includes(action))) throw Object.assign(new Error('作品已在回收站，请先恢复作品'), {code: 'NOVEL_RECYCLED'});
      return state;
    }
  }
  if(action.startsWith('cleanup.')&&args.scope==='novel-trash')return read.full();
  if(action==='activity.input'){
    if(!Number.isSafeInteger(args.time)||args.time<0||!Number.isFinite(new Date(args.time).getTime()))throw Object.assign(new Error('聊天消息时间无效'),{code:'INVALID_INPUT'});
    const year=localDay(new Date(args.time)).slice(0,4);await read.activity(read.activityYears.includes(year)?[year]:[]);return state;
  }
  if (['guidance.get','guidance.set','novel.list','novel.create','novel.focus','binding.get'].includes(action)) return state;
  const binding = state.bindings[digest(actor.sessionId || '')];
  const id = action === 'novel.import' ? args.backup?.novel?.id : args.novelId || binding?.novelId;
  if (!id || !own(state.novels, id)) return state;
  const book = await read.book(id), novel = state.novels[id];
  if(action.startsWith('cleanup.')){
    await book.full();await read.allReceipts();
    for(const ref of sharedPlanRefs(novel))if(own(state.novels,ref.sourceNovelId)){
      const source=await read.book(ref.sourceNovelId);
      await source.section('collaboration');
    }
    return state;
  }
  if(tracksProse(action))await book.chapterIndex();
  if (novel.archived && !(actor.kind === 'human' && ['novel.get', 'novel.export', 'novel.archive', 'novel.restore', 'novel.purge'].includes(action))) throw Object.assign(new Error('作品已在回收站，请先恢复作品'), {code: 'NOVEL_RECYCLED'});
  if (action === 'novel.purge') {
    await book.full(); await read.allReceipts();
    for (const [targetId,row] of Object.entries(state.novels)) if (targetId !== id && row.hasCollaboration) {
      const targetBook=await read.book(targetId);
      await targetBook.section('collaboration');
    }
    return state;
  }
  if (action === 'novel.import' || action === 'novel.export') {
    await book.full();
    if (action === 'novel.export') for (const ref of sharedPlanRefs(novel)) if (own(state.novels,ref.sourceNovelId)) {
      const sourceBook=await read.book(ref.sourceNovelId);
      await sourceBook.section('collaboration');
    }
    return state;
  }
  await loadBookOperation(novel, action, args, binding, book);
  return state;
}

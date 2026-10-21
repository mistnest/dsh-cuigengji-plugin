import { countManuscript } from '../domain/manuscript.ts';

type Row = Record<string, any>;

export interface ActivityBucket {
  conversationInput: number;
  proseAdded: number;
  settingAdded: number;
  planningChanges: number;
  chaptersTouched: number;
  settingsTouched: number;
  byActor: Record<'human' | 'agent', Omit<ActivityBucket, 'byActor'>>;
}

export interface ActivityDay {
  date: string;
  updatedAt: string;
  novels: Record<string, ActivityBucket>;
  titles?: Record<string, string>;
}

export interface ActivityState {
  format: 'cuigengji-activity';
  version: 1;
  daily: Record<string, ActivityDay>;
}

const emptyBucket = (): ActivityBucket => ({
  conversationInput: 0,
  proseAdded: 0,
  settingAdded: 0,
  planningChanges: 0,
  chaptersTouched: 0,
  settingsTouched: 0,
  byActor: {
    human: { conversationInput: 0, proseAdded: 0, settingAdded: 0, planningChanges: 0, chaptersTouched: 0, settingsTouched: 0 },
    agent: { conversationInput: 0, proseAdded: 0, settingAdded: 0, planningChanges: 0, chaptersTouched: 0, settingsTouched: 0 },
  },
});

export const emptyActivity = (): ActivityState => ({ format: 'cuigengji-activity', version: 1, daily: {} });

export function normalizeActivity(value: unknown): ActivityState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return emptyActivity();
  const source = value as Row;
  const result = emptyActivity();
  if (source.format !== result.format || source.version !== result.version || !source.daily || typeof source.daily !== 'object' || Array.isArray(source.daily)) return result;
  for (const [date, day] of Object.entries(source.daily as Row)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day || typeof day !== 'object' || Array.isArray(day)) continue;
    const normalized: ActivityDay = { date, updatedAt: typeof (day as Row).updatedAt === 'string' ? (day as Row).updatedAt : new Date().toISOString(), novels: {}, titles: {} };
    for (const [novelId, bucket] of Object.entries(((day as Row).novels || {}) as Row)) {
      if (!bucket || typeof bucket !== 'object' || Array.isArray(bucket)) continue;
      normalized.novels[novelId] = normalizeBucket(bucket as Row);
      if (typeof (day as Row).titles?.[novelId] === 'string') normalized.titles![novelId] = (day as Row).titles[novelId];
    }
    result.daily[date] = normalized;
  }
  return result;
}

function normalizeBucket(value: Row): ActivityBucket {
  const number = (key: string) => Number.isSafeInteger(value[key]) && value[key] >= 0 ? value[key] : 0;
  const bucket = emptyBucket();
  for (const key of ['conversationInput', 'proseAdded', 'settingAdded', 'planningChanges', 'chaptersTouched', 'settingsTouched'] as const) bucket[key] = number(key);
  for (const actor of ['human', 'agent'] as const) {
    const row = value.byActor?.[actor];
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    for (const key of ['conversationInput', 'proseAdded', 'settingAdded', 'planningChanges', 'chaptersTouched', 'settingsTouched'] as const) bucket.byActor[actor][key] = Number.isSafeInteger(row[key]) && row[key] >= 0 ? row[key] : 0;
  }
  return bucket;
}

export function localDay(date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const values = Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function insertedCount(before: unknown, after: unknown): number {
  const left = Array.from(typeof before === 'string' ? before.replace(/\s/gu, '') : '');
  const right = Array.from(typeof after === 'string' ? after.replace(/\s/gu, '') : '');
  let start = 0;
  while (start < left.length && start < right.length && left[start] === right[start]) start++;
  let leftEnd = left.length, rightEnd = right.length;
  while (leftEnd > start && rightEnd > start && left[leftEnd - 1] === right[rightEnd - 1]) { leftEnd--; rightEnd--; }
  const n = leftEnd - start, m = rightEnd - start;
  if (!n || !m) return m;
  // A common-prefix/suffix estimate counts all unchanged text between two
  // distant edits. Myers' shortest edit path keeps those characters out of
  // ordinary revision counts, with a fixed work budget for wholesale rewrites.
  const limit = Math.min(n + m, 1024), offset = limit + 1;
  const path = new Int32Array(limit * 2 + 3).fill(-1);
  path[offset + 1] = 0;
  let work = 0;
  for (let d = 0; d <= limit; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || k !== d && path[offset + k - 1] < path[offset + k + 1] ? path[offset + k + 1] : path[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && left[start + x] === right[start + y]) {
        x++; y++;
        if (++work > 2_000_000) return m;
      }
      path[offset + k] = x;
      if (x >= n && y >= m) return (d + m - n) / 2;
      if (++work > 2_000_000) return m;
    }
  }
  return m;
}

function bucketFor(state: Row, day: string, novelId: string): ActivityBucket {
  state.activity = normalizeActivity(state.activity);
  const current = state.activity as ActivityState;
  current.daily[day] ??= { date: day, updatedAt: new Date().toISOString(), novels: {} };
  current.daily[day].novels[novelId] ??= emptyBucket();
  current.daily[day].titles ??= {};
  current.daily[day].titles![novelId] = state.novels[novelId]?.title || '作品库讨论';
  current.daily[day].updatedAt = new Date().toISOString();
  return current.daily[day].novels[novelId];
}

function add(bucket: ActivityBucket, actor: 'human' | 'agent', key: keyof Omit<ActivityBucket, 'byActor'>, amount: number) {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const value = Math.max(0, Math.floor(amount));
  bucket[key] += value;
  bucket.byActor[actor][key] += value;
}

const writingActions = new Set(['chapter.create', 'chapter.update', 'chapter.replace', 'graph.create', 'graph.update', 'graph.continue',
  'planning.apply', 'planning.page.create', 'planning.page.update', 'planning.group.create', 'planning.group.update', 'planning.continue']);

export const tracksActivity = (action: string): boolean => writingActions.has(action);

// Geometry and version bookkeeping are not writing. Compare the actual planning
// content so moving a card, auto layout and no-op saves cannot inflate progress.
function planningContent(board: Row | undefined): string {
  const ignored = new Set(['revision', 'createdAt', 'updatedAt', 'lastSequence', 'actor', 'position', 'width', 'height', 'color', 'collapsed', 'fontSize', 'fontFamily', 'moveContents', 'members', 'layoutPending']);
  const collections = ['nodes', 'edges', 'groups', 'pages', 'decorations'];
  return JSON.stringify(collections.map(key => Object.entries(board?.[key] || {}).sort(([a], [b]) => a.localeCompare(b))
    .filter(([, value]) => !(value as Row).deleted)
    .map(([id, value]) => [id, Object.fromEntries(Object.entries(value as Row).filter(([field]) => !ignored.has(field)).sort(([a], [b]) => a.localeCompare(b)))])));
}

/** Record only successful, persisted mutations. This intentionally ignores imports,
 * layout changes and deletes so the desktop pet reflects writing activity rather
 * than maintenance noise. */
export function recordActivity(state: Row, action: string, args: Row, actor: Row, beforeNovel: Row | null, result: unknown) {
  if (!tracksActivity(action)) return;
  const novelId = typeof args.novelId === 'string' ? args.novelId : null;
  if (!novelId || !state.novels?.[novelId] || state.novels[novelId].archived) return;
  const afterNovel = state.novels[novelId] as Row;
  const actorKey: 'human' | 'agent' = actor.kind === 'human' ? 'human' : 'agent';
  const delta: Partial<Omit<ActivityBucket, 'byActor'>> = {};
  const actionNode = (id: string | undefined) => id && afterNovel.nodes?.[id];
  if (action === 'chapter.create') {
    const amount = countManuscript(args.content || '');
    if (amount) { delta.proseAdded = amount; delta.chaptersTouched = 1; }
  } else if (action === 'chapter.update') {
    const before = beforeNovel?.chapters?.[args.chapterId];
    const after = afterNovel.chapters?.[args.chapterId];
    if (before && after && before.content !== after.content) {
      delta.proseAdded = insertedCount(before.content, after.content);
      delta.chaptersTouched = 1;
    }
  } else if (action === 'chapter.replace') {
    for (const after of Object.values(afterNovel.chapters || {}) as Row[]) {
      const before = beforeNovel?.chapters?.[after.id];
      if (before && before.content !== after.content) {
        delta.proseAdded = (delta.proseAdded || 0) + insertedCount(before.content, after.content);
        delta.chaptersTouched = (delta.chaptersTouched || 0) + 1;
      }
    }
  } else if (action === 'graph.create') {
    delta.settingAdded = countManuscript(args.content || '');
    delta.settingsTouched = 1;
  } else if (action === 'graph.update') {
    const before = beforeNovel?.nodes?.[args.nodeId];
    const after = actionNode(args.nodeId);
    if (before && after && ['name', 'summary', 'content', 'storyTime', 'status', 'factType', 'aliases', 'knownBy'].some(key => JSON.stringify(before[key]) !== JSON.stringify(after[key]))) {
      delta.settingAdded = insertedCount(before.content, after.content);
      delta.settingsTouched = 1;
    }
  } else if (action === 'graph.continue') {
    delta.settingAdded = countManuscript(args.value?.content || '');
    delta.settingsTouched = 1;
  } else if (action.startsWith('planning.')) {
    const operations = Array.isArray(args.operations) ? args.operations : [];
    if (action === 'planning.apply' && operations.every((op: Row) => String(op.op || op.action).endsWith('.delete'))) return;
    if (planningContent(beforeNovel?.planning) !== planningContent(afterNovel.planning)) delta.planningChanges = 1;
  }
  if (!Object.values(delta).some(value => value > 0)) return;
  const bucket = bucketFor(state, localDay(), novelId);
  for (const [key, amount] of Object.entries(delta)) add(bucket, actorKey, key as keyof typeof delta, amount);
  void result;
}

function sumBuckets(buckets: ActivityBucket[]): ActivityBucket {
  const total = emptyBucket();
  for (const bucket of buckets) for (const key of ['conversationInput', 'proseAdded', 'settingAdded', 'planningChanges', 'chaptersTouched', 'settingsTouched'] as const) {
    total[key] += bucket[key];
    total.byActor.human[key] += bucket.byActor.human[key];
    total.byActor.agent[key] += bucket.byActor.agent[key];
  }
  return total;
}

export function todayActivity(state: Row, novelId?: string | null) {
  const date = localDay();
  const result = rangeActivity(state, {from:date,to:date,novelId});
  return {date,novelId:result.novelId,title:result.title,stats:result.stats,novels:result.novels};
}

export function activityRange(args: Row = {}) {
  const valid = (value: unknown): value is string => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith('0000') && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && new Date(`${value}T12:00:00Z`).toISOString().slice(0,10) === value;
  const to = args.to ?? localDay();
  const date = new Date(`${to}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate()-29);
  const from = args.from ?? (Number.isFinite(date.getTime()) ? date.toISOString().slice(0,10) : '');
  if (!valid(from) || !valid(to) || from > to || args.novelId !== undefined && args.novelId !== null && (typeof args.novelId !== 'string' || !args.novelId)) throw Object.assign(new Error('请选择有效的起止日期和作品范围'),{code:'INVALID_INPUT'});
  return {from,to};
}

/** Sparse daily records keep long ranges bounded by actual writing days. */
export function rangeActivity(state: Row, args: Row = {}) {
  const {from,to} = activityRange(args), novelId = args.novelId || null;
  const activity = normalizeActivity(state.activity);
  const days = Object.values(activity.daily).filter(day=>day.date>=from&&day.date<=to).sort((a,b)=>a.date.localeCompare(b.date));
  const title = (id:string) => id === LIBRARY_DISCUSSION ? '作品库讨论' : state.novels?.[id]?.title || [...days].reverse().find(day=>day.titles?.[id])?.titles?.[id] || '已移除作品';
  const row = (id:string,stats:ActivityBucket)=>({novelId:id,title:title(id),archived:Boolean(state.novels?.[id]?.archived),removed:id!==LIBRARY_DISCUSSION&&!Object.hasOwn(state.novels||{},id),stats});
  const daily = days.map(day=>{
    const entries=Object.entries(day.novels).filter(([id])=>!novelId||id===novelId).map(([id,bucket])=>row(id,bucket));
    return {date:day.date,stats:sumBuckets(entries.map(entry=>entry.stats)),novels:entries};
  }).filter(day=>day.novels.length>0);
  const ids = [...new Set(daily.flatMap(day=>day.novels.map(novel=>novel.novelId)))];
  const novels = ids.map(id=>row(id,sumBuckets(daily.flatMap(day=>day.novels.filter(novel=>novel.novelId===id).map(novel=>novel.stats)))));
  return {from,to,novelId,title:novelId?title(novelId):null,stats:sumBuckets(novels.map(novel=>novel.stats)),novels,daily,activeDays:daily.length};
}

/** Backup restore merges disjoint days and identical/superset counters without
 * duplicating saves. Divergent same-day histories must be resolved explicitly. */
export function mergeActivity(local:unknown,incoming:unknown) {
  const result=normalizeActivity(local), other=normalizeActivity(incoming), conflicts:string[]=[];
  const values=(bucket:ActivityBucket)=>[bucket.conversationInput,bucket.proseAdded,bucket.settingAdded,bucket.planningChanges,bucket.chaptersTouched,bucket.settingsTouched,...Object.values(bucket.byActor).flatMap(row=>Object.values(row))];
  for(const [date,day] of Object.entries(other.daily)) {
    const target=result.daily[date];
    if(!target){result.daily[date]=day;continue;}
    for(const [id,bucket] of Object.entries(day.novels)) {
      const previous=target.novels[id];
      if(!previous){target.novels[id]=bucket;continue;}
      const a=values(previous),b=values(bucket);
      if(b.every((n,i)=>n>=a[i]))target.novels[id]=bucket;
      else if(!a.every((n,i)=>n>=b[i]))conflicts.push(`${date} · ${day.titles?.[id]||target.titles?.[id]||id}`);
    }
    target.titles={...day.titles,...target.titles};
    if(day.updatedAt>target.updatedAt)target.updatedAt=day.updatedAt;
  }
  return {activity:result,conflicts};
}

export const LIBRARY_DISCUSSION = '__cuigengji_library_discussion__';
/** Count accepted human messages, separately from words saved into a work. */
export function recordConversationInput(state:Row,args:Row,actor:Row) {
  if(actor.kind !== 'activity') throw Object.assign(new Error('聊天字数由 DSH 消息事件统计'),{code:'HUMAN_REQUIRED'});
  if(!Number.isSafeInteger(args.count)||args.count<=0||!Number.isSafeInteger(args.time)||args.time<0)throw Object.assign(new Error('聊天字数或时间无效'),{code:'INVALID_INPUT'});
  const binding=state.bindings[args.sessionKey], target=binding?.activeNovelId||binding?.novelId;
  if(!args.inWorkspace && !(state.guidance?.[args.sessionKey] ?? Boolean(target)))return {recorded:false};
  const novelId=target&&state.novels[target]&&!state.novels[target].archived?target:LIBRARY_DISCUSSION;
  const bucket=bucketFor(state,localDay(new Date(args.time)),novelId);
  add(bucket,'human','conversationInput',args.count);
  return {recorded:true,novelId,count:args.count};
}

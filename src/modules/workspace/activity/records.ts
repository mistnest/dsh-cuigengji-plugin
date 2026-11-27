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

export const emptyBucket = (): ActivityBucket => ({
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
  const number = (key: string) => Number.isSafeInteger(value[key]) && (key === 'proseAdded' || value[key] >= 0) ? value[key] : 0;
  const bucket = emptyBucket();
  for (const key of ['conversationInput', 'proseAdded', 'settingAdded', 'planningChanges', 'chaptersTouched', 'settingsTouched'] as const) bucket[key] = number(key);
  for (const actor of ['human', 'agent'] as const) {
    const row = value.byActor?.[actor];
    if (!row || typeof row !== 'object' || Array.isArray(row)) continue;
    for (const key of ['conversationInput', 'proseAdded', 'settingAdded', 'planningChanges', 'chaptersTouched', 'settingsTouched'] as const) bucket.byActor[actor][key] = Number.isSafeInteger(row[key]) && (key === 'proseAdded' || row[key] >= 0) ? row[key] : 0;
  }
  return bucket;
}

/** Backup restore merges disjoint days and identical/superset counters without
 * duplicating saves. Divergent same-day histories must be resolved explicitly. */
export function mergeActivity(local:unknown,incoming:unknown) {
  const result=normalizeActivity(local), other=normalizeActivity(incoming), conflicts:string[]=[];
  const values=(bucket:ActivityBucket)=>[bucket.conversationInput,bucket.settingAdded,bucket.planningChanges,bucket.chaptersTouched,bucket.settingsTouched,...Object.values(bucket.byActor).flatMap(({proseAdded,...row})=>Object.values(row))];
  const sameProse=(a:ActivityBucket,b:ActivityBucket)=>a.proseAdded===b.proseAdded&&a.byActor.human.proseAdded===b.byActor.human.proseAdded&&a.byActor.agent.proseAdded===b.byActor.agent.proseAdded;
  for(const [date,day] of Object.entries(other.daily)) {
    const target=result.daily[date];
    if(!target){result.daily[date]=day;continue;}
    for(const [id,bucket] of Object.entries(day.novels)) {
      const previous=target.novels[id];
      if(!previous){target.novels[id]=bucket;continue;}
      const a=values(previous),b=values(bucket);
      const incoming=b.every((n,i)=>n>=a[i]),existing=a.every((n,i)=>n>=b[i]),same=sameProse(previous,bucket);
      // A newer chapter-operation count can accompany a smaller (or negative)
      // net value. Equal/divergent histories never silently take the maximum.
      if(incoming&&(same||bucket.chaptersTouched>previous.chaptersTouched))target.novels[id]=bucket;
      else if(!(existing&&(same||previous.chaptersTouched>bucket.chaptersTouched)))conflicts.push(`${date} · ${day.titles?.[id]||target.titles?.[id]||id}`);
    }
    target.titles={...day.titles,...target.titles};
    if(day.updatedAt>target.updatedAt)target.updatedAt=day.updatedAt;
  }
  return {activity:result,conflicts};
}

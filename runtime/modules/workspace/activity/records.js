const emptyBucket = () => ({
  conversationInput: 0,
  proseAdded: 0,
  settingAdded: 0,
  planningChanges: 0,
  chaptersTouched: 0,
  settingsTouched: 0,
  byActor: {
    human: { conversationInput: 0, proseAdded: 0, settingAdded: 0, planningChanges: 0, chaptersTouched: 0, settingsTouched: 0 },
    agent: { conversationInput: 0, proseAdded: 0, settingAdded: 0, planningChanges: 0, chaptersTouched: 0, settingsTouched: 0 }
  }
});
const emptyActivity = () => ({ format: "cuigengji-activity", version: 1, daily: {} });
function normalizeActivity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return emptyActivity();
  const source = value;
  const result = emptyActivity();
  if (source.format !== result.format || source.version !== result.version || !source.daily || typeof source.daily !== "object" || Array.isArray(source.daily)) return result;
  for (const [date, day] of Object.entries(source.daily)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !day || typeof day !== "object" || Array.isArray(day)) continue;
    const normalized = { date, updatedAt: typeof day.updatedAt === "string" ? day.updatedAt : (/* @__PURE__ */ new Date()).toISOString(), novels: {}, titles: {} };
    for (const [novelId, bucket] of Object.entries(day.novels || {})) {
      if (!bucket || typeof bucket !== "object" || Array.isArray(bucket)) continue;
      normalized.novels[novelId] = normalizeBucket(bucket);
      if (typeof day.titles?.[novelId] === "string") normalized.titles[novelId] = day.titles[novelId];
    }
    result.daily[date] = normalized;
  }
  return result;
}
function normalizeBucket(value) {
  const number = (key) => Number.isSafeInteger(value[key]) && (key === "proseAdded" || value[key] >= 0) ? value[key] : 0;
  const bucket = emptyBucket();
  for (const key of ["conversationInput", "proseAdded", "settingAdded", "planningChanges", "chaptersTouched", "settingsTouched"]) bucket[key] = number(key);
  for (const actor of ["human", "agent"]) {
    const row = value.byActor?.[actor];
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    for (const key of ["conversationInput", "proseAdded", "settingAdded", "planningChanges", "chaptersTouched", "settingsTouched"]) bucket.byActor[actor][key] = Number.isSafeInteger(row[key]) && (key === "proseAdded" || row[key] >= 0) ? row[key] : 0;
  }
  return bucket;
}
function mergeActivity(local, incoming) {
  const result = normalizeActivity(local), other = normalizeActivity(incoming), conflicts = [];
  const values = (bucket) => [bucket.conversationInput, bucket.settingAdded, bucket.planningChanges, bucket.chaptersTouched, bucket.settingsTouched, ...Object.values(bucket.byActor).flatMap(({ proseAdded, ...row }) => Object.values(row))];
  const sameProse = (a, b) => a.proseAdded === b.proseAdded && a.byActor.human.proseAdded === b.byActor.human.proseAdded && a.byActor.agent.proseAdded === b.byActor.agent.proseAdded;
  for (const [date, day] of Object.entries(other.daily)) {
    const target = result.daily[date];
    if (!target) {
      result.daily[date] = day;
      continue;
    }
    for (const [id, bucket] of Object.entries(day.novels)) {
      const previous = target.novels[id];
      if (!previous) {
        target.novels[id] = bucket;
        continue;
      }
      const a = values(previous), b = values(bucket);
      const incoming2 = b.every((n, i) => n >= a[i]), existing = a.every((n, i) => n >= b[i]), same = sameProse(previous, bucket);
      if (incoming2 && (same || bucket.chaptersTouched > previous.chaptersTouched)) target.novels[id] = bucket;
      else if (!(existing && (same || previous.chaptersTouched > bucket.chaptersTouched))) conflicts.push(`${date} \xB7 ${day.titles?.[id] || target.titles?.[id] || id}`);
    }
    target.titles = { ...day.titles, ...target.titles };
    if (day.updatedAt > target.updatedAt) target.updatedAt = day.updatedAt;
  }
  return { activity: result, conflicts };
}
export {
  emptyActivity,
  emptyBucket,
  mergeActivity,
  normalizeActivity
};

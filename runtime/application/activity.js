import { countManuscript } from "../domain/manuscript.js";
import { manuscriptProgress } from "./manuscript-progress.js";
import { localDay } from "../domain/activity/date.js";
import { localDay as localDay2 } from "../domain/activity/date.js";
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
function insertedCount(before, after) {
  const left = Array.from(typeof before === "string" ? before.replace(/\s/gu, "") : "");
  const right = Array.from(typeof after === "string" ? after.replace(/\s/gu, "") : "");
  let start = 0;
  while (start < left.length && start < right.length && left[start] === right[start]) start++;
  let leftEnd = left.length, rightEnd = right.length;
  while (leftEnd > start && rightEnd > start && left[leftEnd - 1] === right[rightEnd - 1]) {
    leftEnd--;
    rightEnd--;
  }
  const n = leftEnd - start, m = rightEnd - start;
  if (!n || !m) return m;
  const limit = Math.min(n + m, 1024), offset = limit + 1;
  const path = new Int32Array(limit * 2 + 3).fill(-1);
  path[offset + 1] = 0;
  let work = 0;
  for (let d = 0; d <= limit; d++) {
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || k !== d && path[offset + k - 1] < path[offset + k + 1] ? path[offset + k + 1] : path[offset + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && left[start + x] === right[start + y]) {
        x++;
        y++;
        if (++work > 2e6) return m;
      }
      path[offset + k] = x;
      if (x >= n && y >= m) return (d + m - n) / 2;
      if (++work > 2e6) return m;
    }
  }
  return m;
}
function bucketFor(state, day, novelId) {
  state.activity = normalizeActivity(state.activity);
  const current = state.activity;
  current.daily[day] ??= { date: day, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), novels: {} };
  current.daily[day].novels[novelId] ??= emptyBucket();
  current.daily[day].titles ??= {};
  current.daily[day].titles[novelId] = state.novels[novelId]?.title || "\u4F5C\u54C1\u5E93\u8BA8\u8BBA";
  current.daily[day].updatedAt = (/* @__PURE__ */ new Date()).toISOString();
  return current.daily[day].novels[novelId];
}
function add(bucket, actor, key, amount) {
  if (!Number.isFinite(amount) || amount === 0 || key !== "proseAdded" && amount < 0) return;
  const value = Math.trunc(amount);
  bucket[key] += value;
  bucket.byActor[actor][key] += value;
}
const proseActions = /* @__PURE__ */ new Set(["chapter.create", "chapter.update", "chapter.replace", "chapter.delete", "chapter.restore", "volume.delete", "novel.archive", "novel.restore", "novel.purge"]);
const tracksProse = (action) => proseActions.has(action);
const writingActions = /* @__PURE__ */ new Set([
  ...proseActions,
  "graph.create",
  "graph.update",
  "graph.continue",
  "planning.apply",
  "planning.page.create",
  "planning.page.update",
  "planning.group.create",
  "planning.group.update",
  "planning.continue"
]);
const tracksActivity = (action) => writingActions.has(action);
function planningContent(board) {
  const ignored = /* @__PURE__ */ new Set(["revision", "createdAt", "updatedAt", "lastSequence", "actor", "position", "width", "height", "color", "collapsed", "fontSize", "fontFamily", "moveContents", "members", "layoutPending"]);
  const collections = ["nodes", "edges", "groups", "pages", "decorations"];
  return JSON.stringify(collections.map((key) => Object.entries(board?.[key] || {}).sort(([a], [b]) => a.localeCompare(b)).filter(([, value]) => !value.deleted).map(([id, value]) => [id, Object.fromEntries(Object.entries(value).filter(([field]) => !ignored.has(field)).sort(([a], [b]) => a.localeCompare(b)))])));
}
function recordActivity(state, action, args, actor, beforeNovel, result, beforeProse) {
  if (!tracksActivity(action)) return;
  const novelId = typeof args.novelId === "string" ? args.novelId : null;
  if (!novelId || !tracksProse(action) && (!state.novels?.[novelId] || state.novels[novelId].archived)) return;
  const afterNovel = state.novels[novelId];
  const actorKey = actor.kind === "human" ? "human" : "agent";
  const delta = {};
  if (tracksProse(action)) {
    const previous = beforeProse ?? manuscriptProgress({ novels: beforeNovel ? { [novelId]: beforeNovel } : {} }, novelId).words;
    delta.proseAdded = manuscriptProgress(state, novelId).words - previous;
  }
  const actionNode = (id) => id && afterNovel.nodes?.[id];
  if (action === "chapter.create") {
    if (countManuscript(args.content || "")) delta.chaptersTouched = 1;
  } else if (action === "chapter.update") {
    const before = beforeNovel?.chapters?.[args.chapterId];
    const after = afterNovel.chapters?.[args.chapterId];
    if (before && after && before.content !== after.content) {
      delta.chaptersTouched = 1;
    }
  } else if (action === "chapter.replace") {
    for (const after of Object.values(afterNovel.chapters || {})) {
      const before = beforeNovel?.chapters?.[after.id];
      if (before && before.content !== after.content) {
        delta.chaptersTouched = (delta.chaptersTouched || 0) + 1;
      }
    }
  } else if (tracksProse(action)) {
    const previous = beforeNovel?.chapters || {};
    delta.chaptersTouched = Object.values(previous).filter((before) => {
      const after = afterNovel?.chapters?.[before.id];
      return after && (!before.deleted || !after.deleted) && (before.content !== after.content || before.deleted !== after.deleted || Boolean(beforeNovel?.archived) !== Boolean(afterNovel?.archived));
    }).length;
  } else if (action === "graph.create") {
    delta.settingAdded = countManuscript(args.content || "");
    delta.settingsTouched = 1;
  } else if (action === "graph.update") {
    const before = beforeNovel?.nodes?.[args.nodeId];
    const after = actionNode(args.nodeId);
    if (before && after && ["name", "summary", "content", "storyTime", "status", "factType", "aliases", "knownBy"].some((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]))) {
      delta.settingAdded = insertedCount(before.content, after.content);
      delta.settingsTouched = 1;
    }
  } else if (action === "graph.continue") {
    delta.settingAdded = countManuscript(args.value?.content || "");
    delta.settingsTouched = 1;
  } else if (action.startsWith("planning.")) {
    const operations = Array.isArray(args.operations) ? args.operations : [];
    if (action === "planning.apply" && operations.every((op) => String(op.op || op.action).endsWith(".delete"))) return;
    if (planningContent(beforeNovel?.planning) !== planningContent(afterNovel.planning)) delta.planningChanges = 1;
  }
  if (!Object.values(delta).some((value) => value !== 0)) return;
  const bucket = bucketFor(state, localDay(), novelId);
  for (const [key, amount] of Object.entries(delta)) add(bucket, actorKey, key, amount);
  void result;
}
function sumBuckets(buckets) {
  const total = emptyBucket();
  for (const bucket of buckets) for (const key of ["conversationInput", "proseAdded", "settingAdded", "planningChanges", "chaptersTouched", "settingsTouched"]) {
    total[key] += bucket[key];
    total.byActor.human[key] += bucket.byActor.human[key];
    total.byActor.agent[key] += bucket.byActor.agent[key];
  }
  return total;
}
function todayActivity(state, novelId) {
  const date = localDay();
  const result = rangeActivity(state, { from: date, to: date, novelId });
  return { date, novelId: result.novelId, title: result.title, stats: result.stats, novels: result.novels, manuscript: result.manuscript };
}
function activityRange(args = {}) {
  const valid = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !value.startsWith("0000") && Number.isFinite(Date.parse(`${value}T12:00:00Z`)) && (/* @__PURE__ */ new Date(`${value}T12:00:00Z`)).toISOString().slice(0, 10) === value;
  const to = args.to ?? localDay();
  const date = /* @__PURE__ */ new Date(`${to}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 29);
  const from = args.from ?? (Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : "");
  if (!valid(from) || !valid(to) || from > to || args.novelId !== void 0 && args.novelId !== null && (typeof args.novelId !== "string" || !args.novelId)) throw Object.assign(new Error("\u8BF7\u9009\u62E9\u6709\u6548\u7684\u8D77\u6B62\u65E5\u671F\u548C\u4F5C\u54C1\u8303\u56F4"), { code: "INVALID_INPUT" });
  return { from, to };
}
function rangeActivity(state, args = {}) {
  const { from, to } = activityRange(args), novelId = args.novelId || null;
  const activity = normalizeActivity(state.activity);
  const days = Object.values(activity.daily).filter((day) => day.date >= from && day.date <= to).sort((a, b) => a.date.localeCompare(b.date));
  const title = (id) => id === LIBRARY_DISCUSSION ? "\u4F5C\u54C1\u5E93\u8BA8\u8BBA" : state.novels?.[id]?.title || [...days].reverse().find((day) => day.titles?.[id])?.titles?.[id] || "\u5DF2\u79FB\u9664\u4F5C\u54C1";
  const row = (id, stats) => ({ novelId: id, title: title(id), archived: Boolean(state.novels?.[id]?.archived), removed: id !== LIBRARY_DISCUSSION && !Object.hasOwn(state.novels || {}, id), stats });
  const daily = days.map((day) => {
    const entries = Object.entries(day.novels).filter(([id]) => !novelId || id === novelId).map(([id, bucket]) => row(id, bucket));
    return { date: day.date, stats: sumBuckets(entries.map((entry) => entry.stats)), novels: entries };
  }).filter((day) => day.novels.length > 0);
  const ids = [...new Set(daily.flatMap((day) => day.novels.map((novel) => novel.novelId)))];
  const novels = ids.map((id) => row(id, sumBuckets(daily.flatMap((day) => day.novels.filter((novel) => novel.novelId === id).map((novel) => novel.stats)))));
  return { from, to, novelId, title: novelId ? title(novelId) : null, stats: sumBuckets(novels.map((novel) => novel.stats)), novels, daily, activeDays: daily.length, manuscript: manuscriptProgress(state, novelId) };
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
const LIBRARY_DISCUSSION = "__cuigengji_library_discussion__";
function recordConversationInput(state, args, actor) {
  if (actor.kind !== "activity") throw Object.assign(new Error("\u804A\u5929\u5B57\u6570\u7531 DSH \u6D88\u606F\u4E8B\u4EF6\u7EDF\u8BA1"), { code: "HUMAN_REQUIRED" });
  if (!Number.isSafeInteger(args.count) || args.count <= 0 || !Number.isSafeInteger(args.time) || args.time < 0) throw Object.assign(new Error("\u804A\u5929\u5B57\u6570\u6216\u65F6\u95F4\u65E0\u6548"), { code: "INVALID_INPUT" });
  const binding = state.bindings[args.sessionKey], target = binding?.activeNovelId || binding?.novelId;
  if (!args.inWorkspace && !(state.guidance?.[args.sessionKey] ?? true)) return { recorded: false };
  const novelId = target && state.novels[target] && !state.novels[target].archived ? target : LIBRARY_DISCUSSION;
  const bucket = bucketFor(state, localDay(new Date(args.time)), novelId);
  add(bucket, "human", "conversationInput", args.count);
  return { recorded: true, novelId, count: args.count };
}
export {
  LIBRARY_DISCUSSION,
  activityRange,
  emptyActivity,
  localDay2 as localDay,
  mergeActivity,
  normalizeActivity,
  rangeActivity,
  recordActivity,
  recordConversationInput,
  todayActivity,
  tracksActivity,
  tracksProse
};

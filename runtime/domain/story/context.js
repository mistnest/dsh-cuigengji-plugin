import { chapter, fail, orderedChapters, own, readStory, sourceStale } from "./model.js";
import { chapterCounts } from "../chapters/metadata.js";
const briefLabels = { premise: "\u6545\u4E8B\u524D\u63D0", readerPromise: "\u8BFB\u8005\u627F\u8BFA", protagonistGoal: "\u4E3B\u89D2\u76EE\u6807", coreConflict: "\u6838\u5FC3\u51B2\u7A81", ending: "\u89C4\u5212\u7ED3\u5C40\uFF08\u5C1A\u672A\u53D1\u751F\uFF09", style: "\u5199\u4F5C\u98CE\u683C" };
const safeSlice = (text, length) => text.slice(0, length).replace(/[\ud800-\udbff]$/, "");
function storyContext(novel, args) {
  const maxChars = args.maxChars ?? 12e3;
  if (!Number.isSafeInteger(maxChars) || maxChars < 1e3 || maxChars > 24e3) fail("INVALID_INPUT", "maxChars \u9700\u8981\u5728 1000\u201324000 \u4E4B\u95F4\uFF0C\u9ED8\u8BA4 12000");
  const budget = maxChars, story = readStory(novel), chapters = orderedChapters(novel);
  const current = args.chapterId === void 0 ? null : chapter(novel, args.chapterId, "INVALID_INPUT", true);
  const ranks = new Map(chapters.map((item, index) => [item.id, index]));
  const boundary = current ? ranks.get(current.id) : chapters.length - 1;
  const result = {
    novelId: novel.id,
    chapterId: current?.id ?? null,
    revision: story.revision,
    maxChars: budget,
    usedChars: budget,
    truncated: false,
    plans: [],
    facts: [],
    omitted: [],
    omittedCount: 0,
    omittedTruncated: false
  };
  const size = () => JSON.stringify(result).length;
  const omissionBudget = Math.floor(budget * 0.12);
  const omitted = (kind, id, reason) => {
    result.omittedCount++;
    const entry = { kind, id, reason };
    if (result.omitted.length < 30 && JSON.stringify([...result.omitted, entry]).length <= omissionBudget && size() + JSON.stringify(entry).length + 64 < budget) result.omitted.push(entry);
    else result.omittedTruncated = true;
    result.truncated = true;
  };
  const reserve = Math.min(omissionBudget, 500) + 64;
  const add = (section, item) => {
    if (!item.content) return;
    const list = result[section], sectionLimit = section === "plans" ? Math.floor(budget * 0.42) : budget;
    const room = Math.min(budget - size() - reserve, sectionLimit - JSON.stringify(list).length);
    const shell = { ...item, title: safeSlice(item.title, 200), content: "" };
    if (room <= JSON.stringify(shell).length + 8 || list.length >= 80) {
      omitted(item.kind, item.id, "budget");
      return;
    }
    let entry = { ...shell, content: item.content };
    if (JSON.stringify(entry).length > room) {
      let low = 0, high = Math.min(item.content.length, room);
      while (low < high) {
        const mid = Math.ceil((low + high) / 2);
        if (JSON.stringify({ ...shell, content: safeSlice(item.content, mid), truncated: true }).length <= room) low = mid;
        else high = mid - 1;
      }
      entry = { ...shell, content: safeSlice(item.content, low), truncated: true };
      if (!entry.content) {
        omitted(item.kind, item.id, "budget");
        return;
      }
    }
    list.push(entry);
    if (entry.truncated) result.truncated = true;
  };
  const sourceReason = (id, version) => {
    if (!own(novel.chapters, id) || novel.chapters[id].deleted) return "deleted";
    if ((ranks.get(id) ?? Infinity) > boundary) return "future";
    return sourceStale(novel, id, version) ? "stale" : null;
  };
  const allowed = (kind, id, chapterId, version) => {
    const reason = sourceReason(chapterId, version);
    if (reason) {
      omitted(kind, id, reason);
      return false;
    }
    return true;
  };
  const brief = Object.entries(briefLabels).flatMap(([key, label]) => story.brief[key] ? [`${label}\uFF1A${story.brief[key]}`] : []).join("\n");
  if (current && own(story.outlines, current.id)) {
    const outline = story.outlines[current.id];
    add("plans", {
      kind: "outline",
      id: current.id,
      chapterId: current.id,
      revision: story.revision,
      title: current.title + " \xB7 \u7EC6\u7EB2\uFF08\u8BA1\u5212\uFF09",
      content: `\u672C\u7AE0\u610F\u56FE\uFF1A${outline.intent}
\u60C5\u8282\u70B9\uFF1A
${outline.beats.map((beat, index) => `${index + 1}. ${beat}`).join("\n")}
\u7AE0\u5C3E\u94A9\u5B50\uFF1A${outline.endingHook}`,
      truncated: false
    });
  }
  const prose = chapters.filter((item, index) => index <= boundary && chapterCounts(item).textCount > 0).slice(-3).reverse();
  const selected = new Set(prose.map((item) => item.id));
  for (const item of prose) {
    const body = item.content || "", tail = body.slice(-6e3);
    add("facts", { kind: "manuscript", id: item.id, chapterId: item.id, revision: item.revision, title: item.title + (tail.length < body.length ? " \xB7 \u6B63\u6587\u672B\u6BB5" : " \xB7 \u6B63\u6587"), content: tail, truncated: tail.length < body.length });
  }
  const currentUnit = current ? Object.values(story.units).find((unit) => unit.chapterIds.includes(current.id)) : void 0;
  if (currentUnit) add("plans", {
    kind: "unit",
    id: currentUnit.id,
    title: currentUnit.title + " \xB7 \u5267\u60C5\u5355\u5143\uFF08\u8BA1\u5212\uFF09",
    truncated: false,
    content: `\u5355\u5143\u627F\u8BFA\uFF1A${currentUnit.promise}
\u56E0\u679C\u5165\u53E3\uFF1A${currentUnit.causeEntry}
\u6838\u5FC3\u963B\u788D\uFF1A${currentUnit.blocker}
\u5173\u952E\u9009\u62E9\uFF1A${currentUnit.choice}
\u5151\u73B0\u4E0E\u5F52\u5C5E\uFF1A${currentUnit.payoff}
\u4E0B\u4E00\u5355\u5143\u94A9\u5B50\uFF1A${currentUnit.hook}`
  });
  const profile = story.style;
  if (profile.viewpoint || profile.tense || profile.diction || profile.avoid) {
    add("plans", {
      kind: "style",
      id: novel.id,
      title: "\u6587\u98CE\u8981\u6C42\uFF08\u8868\u8FBE\u5C42\uFF09",
      truncated: false,
      content: [["\u89C6\u89D2", profile.viewpoint], ["\u65F6\u6001", profile.tense], ["\u7528\u8BCD", profile.diction], ["\u907F\u514D", profile.avoid]].filter(([, text]) => text).map(([label, text]) => `${label}\uFF1A${text}`).join("\n")
    });
  }
  const tracking = Object.values(story.tracking).sort((a, b) => (ranks.get(b.chapterId) ?? Infinity) - (ranks.get(a.chapterId) ?? Infinity));
  for (const item of tracking) {
    if (!allowed("tracking", item.chapterId, item.chapterId, item.chapterRevision)) continue;
    const title = novel.chapters[item.chapterId].title;
    add("facts", {
      kind: "tracking",
      id: item.chapterId,
      chapterId: item.chapterId,
      revision: item.chapterRevision,
      title: title + " \xB7 \u5DF2\u53D1\u751F\u4E8B\u5B9E",
      content: `${item.summary}${item.storyTime ? "\n\u6545\u4E8B\u65F6\u95F4\uFF1A" + item.storyTime : ""}${item.location ? "\n\u5730\u70B9\uFF1A" + item.location : ""}${item.activeCharacterIds.length ? "\n\u6D3B\u8DC3\u89D2\u8272 ID\uFF1A" + item.activeCharacterIds.join("\u3001") : ""}`,
      truncated: false
    });
    if (item.commitments.length || item.risks.length) add("plans", {
      kind: "commitment",
      id: item.chapterId,
      chapterId: item.chapterId,
      revision: item.chapterRevision,
      title: title + " \xB7 \u540E\u7EED\u4E49\u52A1\u4E0E\u98CE\u9669\uFF08\u672A\u89C6\u4E3A\u5DF2\u5B8C\u6210\uFF09",
      content: [...item.commitments.map((text) => "\u5F85\u5C65\u884C\uFF1A" + text), ...item.risks.map((text) => "\u5F85\u6838\u5BF9\uFF1A" + text)].join("\n"),
      truncated: false
    });
  }
  for (const [index, item] of chapters.entries()) if (!selected.has(item.id) && chapterCounts(item).textCount > 0) omitted("manuscript", item.id, index > boundary ? "future" : "budget");
  for (const item of Object.values(story.threads)) {
    if (!["open", "progressing"].includes(item.status)) continue;
    if (item.sourceChapterId !== void 0 && !allowed("thread", item.id, item.sourceChapterId, item.sourceRevision)) continue;
    add("plans", {
      kind: "thread",
      id: item.id,
      ...item.sourceChapterId ? { chapterId: item.sourceChapterId, revision: item.sourceRevision } : {},
      title: item.title + " \xB7 \u672A\u5B8C\u6210\u7EBF\u7D22",
      content: `${item.kind} / ${item.status}
${item.detail}${item.dueChapterId ? "\n\u5230\u671F\u7AE0\u8282 ID\uFF1A" + item.dueChapterId : ""}`,
      truncated: false
    });
  }
  for (const item of Object.values(story.reviews)) {
    if (item.status !== "open") continue;
    if (!allowed("review", item.id, item.chapterId, item.chapterRevision)) continue;
    add("plans", {
      kind: "review",
      id: item.id,
      chapterId: item.chapterId,
      revision: item.chapterRevision,
      title: item.severity + " \xB7 \u5F85\u6574\u6539\u5BA1\u7A3F\u610F\u89C1",
      content: `\u4F4D\u7F6E\uFF1A${item.location}
\u8BC1\u636E\uFF1A${item.evidence}
\u95EE\u9898\uFF1A${item.issue}
\u5EFA\u8BAE\uFF1A${item.suggestion}`,
      truncated: false
    });
  }
  const validSetting = (id, seen = /* @__PURE__ */ new Set()) => {
    if (seen.has(id)) return true;
    if (!own(novel.nodes, id)) return false;
    seen.add(id);
    const item = novel.nodes[id];
    return !item.deleted && item.status === "active" && item.factType === "fact" && !(item.sources || []).some((ref) => sourceReason(ref.chapterId, ref.revision)) && (item.dependsOn || []).every((ref) => validSetting(ref, seen));
  };
  for (const item of Object.values(novel.nodes)) {
    if (item.deleted || !item.summary) continue;
    if (!validSetting(item.id)) {
      const reason = (item.sources || []).map((ref) => sourceReason(ref.chapterId, ref.revision)).find(Boolean) || (item.status === "stale" ? "stale" : "unconfirmed");
      omitted("setting", item.id, reason);
      continue;
    }
    add("facts", { kind: "setting", id: item.id, title: item.name + " \xB7 \u5DF2\u786E\u8BA4\u8BBE\u5B9A", content: item.summary, truncated: false });
  }
  add("plans", { kind: "brief", id: novel.id, revision: story.revision, title: "\u521B\u4F5C\u7B80\u62A5\uFF08\u8BA1\u5212\uFF0C\u4E0D\u662F\u6B63\u6587\u4E8B\u5B9E\uFF09", content: brief, truncated: false });
  for (let i = 0; i < 4 && result.usedChars !== size(); i++) result.usedChars = size();
  if (result.usedChars > budget) fail("INVALID_INPUT", "\u4E0A\u4E0B\u6587\u6765\u6E90\u5143\u6570\u636E\u8D85\u8FC7\u9884\u7B97\uFF0C\u8BF7\u589E\u52A0 maxChars");
  return result;
}
export {
  storyContext
};

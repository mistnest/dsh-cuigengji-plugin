import { join } from "node:path";
import { peakStatus } from "./calendar.js";
import { money, moneyText } from "./pricing.js";
import { defaultCompanionSettings } from "./settings.js";
import { peakStatus as peakStatus2 } from "./calendar.js";
const number = (n) => Number(n || 0).toLocaleString("zh-CN");
function compilePresentation(meta, report, args, sequence, root) {
  const settings = meta.settings, currency = settings.currency, now = Date.now();
  const converted = Number(report.total.reportCosts?.[currency] ?? report.total.costs[currency] ?? 0);
  const events = meta.events.filter((e) => !e.resolved && settings.events[e.kind]?.on && (e.pending || settings.events[e.kind].ttl === 0 || now - e.time < settings.events[e.kind].ttl * 1e3)).sort((a, b) => Number(b.pending) - Number(a.pending) || b.time - a.time);
  const notification = events[0], touch = ["press", "release"].includes(args.kind) && settings.events[args.kind].on;
  const event = touch ? { id: "touch:" + sequence, kind: args.kind, sessionId: args.sessionId || "", time: now, text: "", pending: false } : notification;
  const select = (id, count, weights) => args.select ? args.select(id, `${meta.configRevision || 0}:${event?.id || ""}:${args.index || 0}`, count, weights) : Math.max(0, Number(args.index) || 0) % Math.max(1, count);
  const entries = settings.bubbles;
  let entry = entries.find((e) => e.id === (event && settings.events[event.kind]?.entry));
  if (!entry && entries.length) {
    const stages = /* @__PURE__ */ new Map();
    for (const e of entries) {
      const key = e.group ? "group:" + e.group : e.id;
      stages.set(key, [...stages.get(key) || [], e]);
    }
    const stage = [...stages.values()][Math.max(0, Number(args.index) || 0) % stages.size], candidates = settings.bubbleMode === "sequence" ? stage : entries;
    entry = candidates[select("entries", candidates.length, candidates.map((e) => e.weight))];
  }
  const enabled = report.balances.filter((b) => b.enabled), firstBalance = enabled.find((b) => b.snapshot?.balance !== void 0 && b.currency === currency), quota = enabled.find((b) => b.quota || b.snapshot?.windows?.length);
  const amount = (value, unit = currency) => value == null ? "\u2014" : Number(value).toFixed(2) + " " + unit;
  const quotaText = (b) => b?.quota ? Math.max(0, b.quota.total - b.quota.used).toLocaleString("zh-CN") : b?.snapshot?.windows?.map((w) => `${w.label} ${Number(w.percent).toFixed(1)}%`).join(" \xB7 ") || "\u5C1A\u672A\u914D\u7F6E";
  const period = peakStatus(now), turn = report.turn || {};
  const metrics = {
    tokens: number(report.total.tokens),
    input: number(report.total.input),
    output: number(report.total.output),
    cacheRead: number(report.total.cacheRead),
    cost: report.total.calls > 0 && report.total.unpriced === report.total.calls ? "\u5C1A\u672A\u5B9A\u4EF7" : amount(converted),
    balance: firstBalance ? amount(firstBalance.snapshot.balance) : "\u5C1A\u4E0D\u53EF\u7528",
    bonus: amount(firstBalance?.snapshot.bonus),
    recharge: amount(firstBalance?.snapshot.recharge),
    quota: quotaText(quota),
    calls: number(report.total.calls),
    prose: number(args.prose),
    settings: number(args.setting),
    session: turn.title || "\u5F53\u524D\u5BF9\u8BDD",
    turnTokens: number(turn.tokens),
    turnCost: Object.entries(turn.costs || {}).map(([c, v]) => amount(v, c)).join(" + ") || "\u5C1A\u672A\u5B9A\u4EF7",
    peak: period.label,
    peakCountdown: period.countdown
  };
  for (const b of enabled) {
    metrics["balance:" + b.id] = amount(b.snapshot?.balance, b.currency);
    metrics["bonus:" + b.id] = amount(b.snapshot?.bonus, b.currency);
    metrics["recharge:" + b.id] = amount(b.snapshot?.recharge, b.currency);
    metrics["quota:" + b.id] = quotaText(b);
    metrics["observed:" + b.id] = b.observed?.source?.startsWith("balance") ? amount(b.observed.amount, b.currency) : "\u5C1A\u4E0D\u53EF\u7528";
  }
  const balanceTotals = {}, balances = enabled.map((b) => {
    const raw = b.snapshot?.balance, value = raw == null ? null : String(raw), valid = value !== null && /^-?\d+(?:\.\d{1,9})?$/.test(value) && value.length <= 30;
    if (valid) {
      const signed = (v) => v.startsWith("-") ? -money(v.slice(1)) : money(v);
      balanceTotals[b.currency] = moneyText(signed(balanceTotals[b.currency] || "0") + signed(value));
    }
    return { id: b.id, name: String(b.name || b.id).slice(0, 120), currency: b.currency, balance: valid ? value : null, at: Number.isFinite(b.snapshot?.at) ? b.snapshot.at : null, error: b.snapshot?.error ? String(b.snapshot.error).slice(0, 160) : null };
  });
  const asset = (id) => meta.assets.find((a) => a.id === id);
  const segment = (m) => {
    const value = ["randomText", "randomImage"].includes(m.kind) && m.choices?.length ? m.choices[select(m.id, m.choices.length, m.choiceWeights)] : m.value;
    if (["image", "randomImage"].includes(m.kind)) {
      const a = asset(value);
      return a ? { kind: "image", assetId: a.id, path: join(root, "assets", a.file), mime: a.mime } : { kind: "text", text: "\u56FE\u7247\u5DF2\u79FB\u9664" };
    }
    if (m.kind === "link") return { kind: "link", text: m.label || value, url: value, style: m.style };
    return { kind: "text", text: m.kind === "metric" ? (m.label || "") + (metrics[value] || "\u2014") : value.replace(/\{\{([\w:-]+)\}\}|\{(cost|session|tokens)\}/g, (_, a, b) => metrics[a || b] || "\u2014"), style: m.style };
  };
  const lines = entry?.lines.map((line) => ({ segments: line.map(segment) })) || [];
  let budget = 4e3;
  for (const line of lines) for (const part of line.segments) if (part.text) {
    part.text = part.text.slice(0, Math.max(0, budget));
    budget -= part.text.length;
  }
  const soundId = event && settings.events[event.kind].sound || "", soundGroup = meta.assets.filter((a) => a.kind === "audio" && soundId.startsWith("group:") && a.group === soundId.slice(6));
  const soundAsset = soundGroup.length ? soundGroup[select("sounds", soundGroup.length)] : asset(soundId), custom = asset(settings.customRole || "");
  return {
    lines,
    event,
    notification,
    showBubble: false,
    ttl: 0,
    advanceOnClick: settings.advanceOnClick !== false,
    customContent: !!entry && JSON.stringify(entry.lines) !== JSON.stringify(defaultCompanionSettings().bubbles[0].lines),
    bubbleName: entry?.name,
    summary: { tokens: report.total.tokens, cost: converted.toFixed(4), currency, unpriced: report.total.unpriced, date: report.to, calls: report.total.calls, input: report.total.input, output: report.total.output, cacheRead: report.total.cacheRead, cacheWrite: report.total.cacheWrite, costs: report.total.costs, balanceTotals, balanceCount: balances.length, balances: balances.slice(0, 8) },
    appearance: { scale: settings.scale, flipped: settings.flipped, snap: settings.snap, snapZones: settings.snapZones || (settings.snap === "custom" ? { unit: "percent", left: 12, right: 12, top: 0, bottom: 12 } : void 0), autoFlip: settings.autoFlip, rolePath: custom ? join(root, "assets", custom.file) : void 0, roleMime: custom?.mime, roleAssetId: custom?.id },
    sound: soundAsset?.kind === "audio" && event && !event.deliveredAt ? { id: event.id, assetId: soundAsset.id, path: join(root, "assets", soundAsset.file), volume: settings.volume * (settings.events[event.kind].volume ?? 1) } : void 0,
    revision: meta.revision
  };
}
export {
  compilePresentation,
  peakStatus2 as peakStatus
};

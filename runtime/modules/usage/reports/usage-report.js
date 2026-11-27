import { daySummary } from "../ledger/balance.js";
import { addCost, addRecord, emptyTotals, summarize } from "../ledger/totals.js";
import { isUsageDay, usageDay, usageError } from "../pricing/settings.js";
function combine(totals, row) {
  for (const key of ["tokens", "input", "output", "cacheRead", "cacheWrite", "calls", "partial", "unpriced"]) {
    totals[key] += row[key] || 0;
  }
  for (const [currency, amount] of Object.entries(row.costs || {})) addCost(totals.costs, currency, amount);
}
function currentQuota(source, meta) {
  const limit = source.limit;
  if (!limit) return null;
  let used = limit.used;
  if (limit.automatic) {
    const today = usageDay();
    const period = limit.reset === "day" ? today : limit.reset === "month" ? today.slice(0, 7) : "";
    const baseline = !limit.period || limit.period === period ? limit.used - (limit.baseline || 0) : 0;
    const consumed = meta.days.filter((day) => day.startsWith(period)).reduce((tokens, day) => tokens + (meta.summaries[day]?.sources?.[source.id]?.tokens || 0), 0);
    used = Math.max(0, baseline + consumed);
  }
  return { ...limit, used, percent: Math.min(100, used / limit.total * 100) };
}
async function readUsageReport(meta, load, args) {
  const allDays = [...meta.days].sort();
  const from = (args.all ? allDays[0] : args.from) || usageDay();
  const to = (args.all ? allDays.at(-1) : args.to) || usageDay();
  if (!isUsageDay(from) || !isUsageDay(to) || from > to) usageError("\u8BF7\u9009\u62E9\u6709\u6548\u7684\u65E5\u671F\u8303\u56F4");
  const days = meta.days.filter((day) => day >= from && day <= to);
  const matches = (row) => (!args.source || row.source === args.source) && (!args.model || String(row.model || "").toLowerCase().includes(String(args.model).toLowerCase()));
  const daily = [];
  const total = emptyTotals();
  const models = /* @__PURE__ */ new Map();
  for (const date of days) {
    let summary = meta.summaries[date];
    if (args.source || args.model) {
      const day = await load(date);
      summary = summarize(Object.fromEntries(Object.entries(day.records).filter(([, row]) => matches(row))));
    }
    daily.push({ date, ...summary });
    combine(total, summary || {});
    for (const [currency, cost] of Object.entries(summary?.reportCosts || {})) addCost(total.reportCosts, currency, cost);
    for (const [key, row] of Object.entries(summary?.models || {})) {
      const item = models.get(key) ?? { ...emptyTotals(), provider: row.provider, model: row.model };
      combine(item, row);
      models.set(key, item);
    }
  }
  const limit = Math.min(200, Math.max(1, Math.floor(Number(args.limit) || 50)));
  const offset = Math.max(0, Math.floor(Number(args.offset) || 0));
  const records = [];
  if (args.details) {
    for (const day of [...days].reverse()) records.push(...Object.values((await load(day)).records).filter(matches));
    records.sort((a, b) => b.time - a.time || a.id.localeCompare(b.id));
  }
  const hourly = args.hourly && from === to ? Array.from({ length: 12 }, (_, i) => ({ hour: i * 2, ...emptyTotals() })) : void 0;
  if (hourly) {
    for (const row of Object.values((await load(from)).records).filter(matches)) {
      addRecord(hourly[Math.floor(new Date(row.time).getHours() / 2)], row);
    }
  }
  const balances = meta.sources.map((source) => {
    const { id, name, enabled, currency } = source;
    const ledger = meta.balanceBooks[id] || {};
    return {
      id,
      name,
      enabled,
      currency,
      snapshot: meta.balances[id] || null,
      observed: daySummary(ledger, to),
      quota: currentQuota(source, meta),
      accounts: ledger.accounting || null
    };
  });
  const sources = /* @__PURE__ */ new Set([...meta.sources.map((source) => source.id), ...Object.values(meta.summaries).flatMap((day) => Object.keys(day.sources || {}))]);
  const sourceChoices = Array.from(sources, (id) => ({ id, name: meta.sources.find((source) => source.id === id)?.name || id }));
  return {
    from,
    to,
    total,
    models: [...models.values()],
    daily,
    hourly,
    records: records.slice(offset, offset + limit),
    count: records.length,
    offset,
    nextOffset: records.length > offset + limit ? offset + limit : null,
    balances,
    sourceChoices
  };
}
export {
  readUsageReport
};

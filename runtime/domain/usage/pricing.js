import { createHash } from "node:crypto";
import { usageError } from "./settings.js";
import { peakPrice, priceCalendarYear, defaultPriceSchedule, priceScheduleIssue } from "./calendar.js";
import { peakPrice as peakPrice2 } from "./calendar.js";
const scale = 1000000000n;
function money(value) {
  const s = String(value);
  if (!/^\d+(?:\.\d{1,9})?$/.test(s) || s.length > 30) usageError("\u91D1\u989D\u683C\u5F0F\u65E0\u6548\uFF0C\u6700\u591A\u4E5D\u4F4D\u5C0F\u6570");
  const [a, b = ""] = s.split(".");
  return BigInt(a) * scale + BigInt(b.padEnd(9, "0"));
}
const moneyText = (value) => `${value < 0n ? "-" : ""}${(value < 0n ? -value : value) / scale}.${((value < 0n ? -value : value) % scale).toString().padStart(9, "0")}`;
const priceDigest = (value) => createHash("sha256").update(JSON.stringify(value)).digest("hex").slice(0, 24);
const rules = [...["deepseek-flash", "deepseek-v4-flash", "deepseek-v4-flash-vision-exp"].map((model) => ({ id: "builtin:" + model, provider: "deepseek", model, currency: "CNY", input: "1", output: "4", cacheRead: "0.02", peak: { input: "2", output: "8", cacheRead: "0.04" }, revision: 20261101, source: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing/" })), { id: "builtin:deepseek-v4-pro", provider: "deepseek", model: "deepseek-v4-pro", currency: "CNY", input: "4.5", output: "13.5", cacheRead: "0.15", peak: { input: "9", output: "27", cacheRead: "0.30" }, revision: 20261101, source: "https://api-docs.deepseek.com/zh-cn/quick_start/pricing/" }];
const key = (value) => String(value || "").trim().toLowerCase();
const priceProvider = (value) => ["deepseek", "deepseek-official", "deepseek-account"].includes(key(value)) ? "deepseek" : key(value);
const builtinPrices = () => structuredClone(rules.map((rule) => ({ ...rule, schedule: defaultPriceSchedule() })));
function validatePrice(rule) {
  if (!rule.id || typeof rule.provider !== "string" || !rule.provider.trim() || typeof rule.model !== "string" || !rule.model.trim() || !/^[A-Z]{3}$/.test(rule.currency) || rule.effectiveFrom !== void 0 && (!Number.isSafeInteger(rule.effectiveFrom) || rule.effectiveFrom < 0)) usageError("\u4EF7\u683C\u9700\u8981\u660E\u786E\u7684\u5382\u5546\u3001\u6A21\u578B\u548C\u5E01\u79CD");
  for (const price of [rule, rule.peak].filter(Boolean)) {
    for (const key2 of ["input", "output", "cacheRead"]) money(price[key2]);
    if (price.cacheWrite !== void 0) money(price.cacheWrite);
  }
  if (rule.schedule) {
    const issue = priceScheduleIssue(rule.schedule);
    if (issue) usageError(issue);
  }
}
function charge(record, prices, frozen) {
  const applicable = (p2) => key(p2.model) === key(record.model) && (!p2.effectiveFrom || p2.effectiveFrom <= record.time);
  const frozenRule = frozen && applicable(frozen) ? frozen : void 0;
  const rule = frozenRule || prices.find((p2) => applicable(p2) && key(p2.provider) === key(record.provider)) || prices.find((p2) => applicable(p2) && priceProvider(p2.provider) === priceProvider(record.provider)) || prices.find((p2) => applicable(p2) && key(p2.provider) === "*") || rules.find(applicable);
  const unpriced = (pricingIssue) => ({ ...record, price: null, cost: null, pricingIssue });
  if (!record.tokens) return unpriced("missing_usage");
  if (!record.model) return unpriced("missing_model");
  if (!rule) return unpriced("unknown_price");
  const peak = !!rule.peak && (frozenRule && frozen?.period ? frozen.period === "peak" : peakPrice(record.time, rule.schedule)), p = peak ? rule.peak : rule, t = record.tokens;
  const known = t.input + t.output + (t.cacheRead || 0) + (t.cacheWrite || 0);
  if (t.total !== void 0 && t.total !== known) return unpriced("incomplete_usage");
  if ((t.cacheWrite || 0) > 0 && p.cacheWrite === void 0) return unpriced("cache_write_price");
  const numerator = BigInt(t.input) * money(p.input) + BigInt(t.output) * money(p.output) + BigInt(t.cacheRead || 0) * money(p.cacheRead) + BigInt(t.cacheWrite || 0) * money(p.cacheWrite || "0");
  const { id: ruleId, ...rate } = structuredClone(rule);
  const snapshot = { ...rate, period: rule.peak ? peak ? "peak" : "off-peak" : "fixed", calendarYearCovered: rule.peak ? frozen?.calendarYearCovered ?? priceCalendarYear : void 0, usageEstimated: record.partial, referencePrice: frozenRule ? !!frozen?.referencePrice : rules.includes(rule) && priceProvider(rule.provider) !== priceProvider(record.provider) };
  return { ...record, pricingIssue: void 0, price: { ...snapshot, id: priceDigest(snapshot) }, cost: moneyText((numerator + 500000n) / 1000000n), currency: rule.currency };
}
function totalTokens(tokens) {
  return tokens?.total ?? (tokens ? tokens.input + tokens.output + (tokens.cacheRead || 0) + (tokens.cacheWrite || 0) : 0);
}
export {
  builtinPrices,
  charge,
  money,
  moneyText,
  peakPrice2 as peakPrice,
  priceDigest,
  priceProvider,
  totalTokens,
  validatePrice
};

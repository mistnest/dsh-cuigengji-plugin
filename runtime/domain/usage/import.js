import { createHash } from "node:crypto";
import { normalizeTokens } from "./events.js";
import { moneyText, money, priceDigest, validatePrice } from "./pricing.js";
import { usageError, usageDay, isUsageDay, validateCompanionSettings } from "./settings.js";
import { validateSource } from "../../adapters/usage/providers.js";
import { companionAsset } from "./assets.js";
const hash = (v) => createHash("sha256").update(v).digest("hex");
const plain = (v) => !!v && typeof v === "object" && !Array.isArray(v);
const safeKey = (v) => typeof v === "string" && /^[\w:.-]{1,200}$/.test(v) && !["__proto__", "constructor", "prototype"].includes(v);
const text = (v, max = 512) => typeof v === "string" && v.length <= max && !/[\x00-\x1f]/.test(v);
const whole = (v) => Number.isSafeInteger(v) && v >= 0;
const currency = (v) => typeof v === "string" && /^[A-Z]{3}$/.test(v);
function tree(value, depth = 0) {
  if (depth > 40) usageError("\u5907\u4EFD\u5D4C\u5957\u8FC7\u6DF1");
  if (typeof value === "number" && !Number.isFinite(value)) usageError("\u5907\u4EFD\u5305\u542B\u65E0\u6548\u6570\u503C");
  if (value && typeof value === "object") for (const [k, v] of Object.entries(value)) {
    if (["__proto__", "constructor", "prototype"].includes(k)) usageError("\u5907\u4EFD\u5305\u542B\u4FDD\u7559\u5B57\u6BB5");
    tree(v, depth + 1);
  }
}
function validateBooks(books) {
  if (!plain(books)) usageError("\u4F59\u989D\u5386\u53F2\u5FC5\u987B\u662F\u8D26\u6237\u7D22\u5F15");
  for (const [id, ledger] of Object.entries(books)) {
    if (!safeKey(id) || !plain(ledger)) usageError("\u4F59\u989D\u5386\u53F2\u6765\u6E90\u65E0\u6548");
    const accounting = ledger.accounting;
    if (accounting) {
      if (accounting.version !== 1 || !plain(accounting.books) || accounting.active != null && typeof accounting.active !== "string") usageError("\u4F59\u989D\u8D26\u6237\u8F68\u8FF9\u65E0\u6548");
      for (const book of Object.values(accounting.books)) {
        if (!plain(book) || !plain(book.days) || !currency(book.currency)) usageError("\u4F59\u989D\u8D26\u6237\u683C\u5F0F\u65E0\u6548");
        for (const [day, row] of Object.entries(book.days)) {
          if (!isUsageDay(day) || !plain(row)) usageError("\u4F59\u989D\u5386\u53F2\u65E5\u671F\u65E0\u6548");
          for (const [key, v] of Object.entries(row)) if (/Units$/.test(key) && !Number.isSafeInteger(v)) usageError("\u4F59\u989D\u5386\u53F2\u91D1\u989D\u65E0\u6548");
        }
      }
    }
    if (ledger.history !== void 0 && !plain(ledger.history) || ledger.events !== void 0 && !Array.isArray(ledger.events)) usageError("\u4F59\u989D\u5386\u53F2\u683C\u5F0F\u65E0\u6548");
  }
}
function readUsageImport(input) {
  if (!plain(input) || JSON.stringify(input).length > 64 * 1024 * 1024) usageError("\u8D26\u672C\u6587\u4EF6\u65E0\u6548\u6216\u8D85\u8FC7 64 MB");
  tree(input);
  const records = [], warnings = [];
  let description = "\u50AC\u66F4\u59EC\u8D26\u672C\u5907\u4EFD", native;
  if (input.kind === "cuigengji-usage") {
    if (input.version !== 1 || !Array.isArray(input.pages) || !plain(input.meta) || !Array.isArray(input.assets)) usageError("\u50AC\u66F4\u59EC\u5907\u4EFD\u7684\u7248\u672C\u6216\u7ED3\u6784\u65E0\u6548");
    const meta = input.meta, ids = /* @__PURE__ */ new Set();
    validateCompanionSettings(meta.settings);
    if (!Array.isArray(meta.sources) || meta.sources.length > 60 || !Array.isArray(meta.prices) || meta.prices.length > 300 || input.assets.length > 1e3) usageError("\u5907\u4EFD\u7684\u6765\u6E90\u3001\u4EF7\u683C\u6216\u7D20\u6750\u8FC7\u591A");
    const sources = meta.sources.map((s) => {
      validateSource(s);
      if (ids.has(s.id)) usageError("\u5907\u4EFD\u7684\u6570\u636E\u6E90\u91CD\u590D");
      ids.add(s.id);
      return s;
    });
    for (const p of meta.prices) validatePrice(p);
    validateBooks(meta.balanceBooks || {});
    const assets = input.assets.map((a) => companionAsset(a).asset);
    if (new Set(assets.map((a) => a.id)).size !== assets.length) usageError("\u5907\u4EFD\u7D20\u6750\u6807\u8BC6\u91CD\u590D");
    const assetIds = new Set(assets.map((a) => a.id));
    if (meta.settings.customRole && !assetIds.has(meta.settings.customRole)) usageError("\u5907\u4EFD\u7F3A\u5C11\u6B63\u5728\u4F7F\u7528\u7684\u89D2\u8272\u7D20\u6750");
    for (const e of Object.values(meta.settings.events)) if (e.sound && !e.sound.startsWith("group:") && !assetIds.has(e.sound)) usageError("\u5907\u4EFD\u7F3A\u5C11\u6B63\u5728\u4F7F\u7528\u7684\u97F3\u6548");
    const recordIds = /* @__PURE__ */ new Set(), days = /* @__PURE__ */ new Set();
    for (const page of input.pages) {
      if (!isUsageDay(page?.day) || days.has(page.day) || !plain(page.records)) usageError("\u5907\u4EFD\u7684\u65E5\u671F\u6216\u660E\u7EC6\u683C\u5F0F\u65E0\u6548");
      days.add(page.day);
      for (const [id, r] of Object.entries(page.records)) {
        if (!plain(r) || !safeKey(r.id) || id !== r.id || recordIds.has(id) || !whole(r.time) || !Number.isFinite(new Date(r.time).getTime()) || usageDay(r.time) !== page.day || !safeKey(r.source) || !text(r.sessionId) || !r.sessionId || ![r.turn, r.step, r.attempt].every(whole) || typeof r.partial !== "boolean" || r.provider !== null && !text(r.provider, 200) || r.model !== null && !text(r.model, 200)) usageError("\u5907\u4EFD\u5B58\u5728\u65E0\u6548\u7684\u8BF7\u6C42\u3001\u6A21\u578B\u6216\u65F6\u95F4");
        recordIds.add(id);
        const tokens = r.tokens && normalizeTokens({ inputTokens: r.tokens.input, outputTokens: r.tokens.output, cacheReadTokens: r.tokens.cacheRead, cacheWriteTokens: r.tokens.cacheWrite, reasoningTokens: r.tokens.reasoning, totalTokens: r.tokens.total });
        if (r.tokens && !tokens) usageError("\u5907\u4EFD\u5B58\u5728\u65E0\u6548 Token \u8BA1\u6570");
        if (r.cost != null) {
          money(r.cost);
          if (!currency(r.currency)) usageError("\u5907\u4EFD\u8D39\u7528\u7F3A\u5C11\u5E01\u79CD");
        }
        if (r.price) validatePrice(r.price);
        if (r.reportCost != null) {
          money(r.reportCost);
          if (!currency(r.reportCurrency) || !r.exchangeRate || money(r.exchangeRate) <= 0n) usageError("\u5907\u4EFD\u6298\u7B97\u91D1\u989D\u65E0\u6548");
        }
        records.push({ ...r, tokens: tokens || null, origin: "backup" });
      }
    }
    native = { sources, settings: meta.settings, prices: meta.prices, balanceBooks: meta.balanceBooks || {}, assets: input.assets };
    warnings.push("\u6309\u8BF7\u6C42 ID \u53BB\u91CD\uFF0C\u5408\u5E76\u7528\u91CF\u660E\u7EC6\u3002\u76F8\u540C\u6765\u6E90\u7684\u73B0\u6709\u4F59\u989D\u5386\u53F2\u4FDD\u7559\uFF1B\u7F3A\u5C11\u7684\u6765\u6E90\u4E0E\u5386\u53F2\u8D26\u6237\u4F1A\u590D\u5236\u5BFC\u5165\u3002\u9ED8\u8BA4\u4FDD\u7559\u5F53\u524D\u6C14\u6CE1\u548C\u4EF7\u683C\u914D\u7F6E\u3002");
  } else if (Array.isArray(input.events) || input.accounting || input.history) {
    description = "\u5C0F\u9CB8\u9C7C\u8BB0\u8D26\u6570\u636E\uFF08\u590D\u5236\u5BFC\u5165\uFF09";
    let index = 0;
    for (const e of input.events || []) {
      const time = Number(e.ts), count = Number(e.tokens);
      if (!whole(time) || !Number.isFinite(new Date(time).getTime()) || !whole(count)) usageError("\u65E7\u8D26\u672C\u5305\u542B\u65E0\u6548\u65F6\u95F4\u6216 Token");
      records.push({ id: "whale:" + hash(JSON.stringify([time, e.model, e.cost, count, index++])), source: "whale-import", sessionId: "whale", turn: index, step: 0, attempt: 0, time, provider: null, model: String(e.model || "\u672A\u77E5").slice(0, 200), tokens: { input: 0, output: 0, total: count }, partial: true, cost: e.cost == null ? null : moneyText(money(String(e.cost))), currency: "CNY", origin: "whale" });
    }
    if (input.accounting || input.history) validateBooks({ legacy: { accounting: input.accounting, history: input.history || {} } });
    warnings.push("\u65E7\u8BB0\u5F55\u4EC5\u6709\u603B Token\uFF0C\u65E0\u6CD5\u8FD8\u539F\u8F93\u5165/\u8F93\u51FA\u548C\u7F13\u5B58\u62C6\u5206\uFF1B\u4FDD\u7559\u539F\u8D39\u7528\uFF0C\u4E0D\u91CD\u7B97\u3002\u4E0E DSH \u81EA\u52A8\u56DE\u586B\u7684\u6570\u636E\u53EF\u80FD\u8986\u76D6\u76F8\u540C\u65F6\u6BB5\uFF0C\u4E24\u79CD\u6765\u6E90\u5206\u522B\u4FDD\u7559\uFF0C\u8BF7\u6309\u6765\u6E90\u67E5\u770B\u3002");
    if (input.accounting || input.history) warnings.push("\u4F59\u989D\u5386\u53F2\u4F5C\u4E3A\u72EC\u7ACB\u5386\u53F2\u8D26\u6237\u4FDD\u5B58\uFF0C\u4E0D\u53C2\u4E0E\u5F53\u524D\u8D26\u6237\u4F59\u989D\u76F8\u51CF\u3002");
  } else usageError("\u6682\u4E0D\u8BC6\u522B\u6B64\u6587\u4EF6\uFF0C\u8BF7\u9009\u62E9\u50AC\u66F4\u59EC\u5B8C\u6574\u5907\u4EFD\u6216\u5C0F\u9CB8\u9C7C .dshw-usage.json");
  if (records.length > 2e5) usageError("\u5355\u6B21\u6700\u591A\u5BFC\u5165\u4E8C\u5341\u4E07\u6761\uFF0C\u8BF7\u5206\u6279\u5BFC\u5165");
  return { records, warnings, description, digest: priceDigest(input), native };
}
export {
  readUsageImport
};

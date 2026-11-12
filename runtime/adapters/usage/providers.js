import { createHash } from "node:crypto";
import { providerTemplates } from "./templates.js";
import { usageError } from "../../domain/usage/settings.js";
const templates = providerTemplates;
const sourceTemplates = () => Object.entries(templates).map(([id, t]) => ({ id, ...structuredClone(t) }));
function field(data, path) {
  if (typeof path !== "string" || !path) return void 0;
  const keys = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  return keys.reduce((value, key) => ["__proto__", "constructor", "prototype"].includes(key) ? void 0 : value?.[key], data);
}
const finite = (value) => value !== null && value !== "" && Number.isFinite(Number(value)) ? Number(value) : void 0;
function endpoint(value, base, key) {
  const url = new URL(value.replaceAll("{base}", base.replace(/\/$/, "")).replaceAll("{key}", encodeURIComponent(key)));
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) usageError("\u63A5\u53E3\u5FC5\u987B\u662F HTTP(S) \u5730\u5740\uFF0C\u4E0D\u80FD\u5E26\u8D26\u53F7\u5BC6\u7801");
  return url;
}
function headers(auth, key) {
  const value = auth.replaceAll("{key}", key), result = { Accept: "application/json" };
  if (value.includes(":")) for (const item of value.split(";")) {
    const index = item.indexOf(":");
    if (index > 0) result[item.slice(0, index).trim()] = item.slice(index + 1).trim();
  }
  else if (value) result.Authorization = value;
  return result;
}
function validateSource(source) {
  if (!source || !/^[\w-]{1,80}$/.test(source.id) || ["__proto__", "constructor", "prototype"].includes(source.id) || typeof source.name !== "string" || !source.name.trim() || source.name.length > 200 || !Object.hasOwn(templates, source.template) || !["CNY", "USD", "EUR", "JPY", "GBP"].includes(source.currency) || typeof source.enabled !== "boolean" || typeof source.keyRef !== "string" || source.keyRef && !/^[A-Za-z_][A-Za-z0-9_]*$/.test(source.keyRef)) usageError("\u6570\u636E\u6E90\u540D\u79F0\u3001\u6A21\u677F\u3001\u5E01\u79CD\u6216\u51ED\u636E\u5F15\u7528\u65E0\u6548");
  if (source.limit && (!Number.isFinite(source.limit.total) || source.limit.total <= 0 || !Number.isFinite(source.limit.used) || source.limit.used < 0 || typeof source.limit.automatic !== "boolean" || !["none", "day", "month"].includes(source.limit.reset) || source.limit.baseline !== void 0 && (!Number.isFinite(source.limit.baseline) || source.limit.baseline < 0))) usageError("\u8D44\u6E90\u989D\u5EA6\u9700\u8981\u6709\u6548\u7684\u603B\u91CF\u3001\u5DF2\u7528\u91CF\u4E0E\u5468\u671F");
  for (const v of [source.lowBalance, source.dailyBudget]) if (v !== void 0 && (!/^\d+(?:\.\d{1,9})?$/.test(v) || v.length > 30)) usageError("\u6765\u6E90\u7684\u9884\u7B97\u4E0E\u4F59\u989D\u63D0\u9192\u7EBF\u5FC5\u987B\u4E3A\u975E\u8D1F\u91D1\u989D");
  if (source.provider !== void 0 && (typeof source.provider !== "string" || source.provider.length > 120) || source.models !== void 0 && (!Array.isArray(source.models) || source.models.some((m) => typeof m !== "string" || m.length > 200))) usageError("\u7528\u91CF\u6765\u6E90\u5339\u914D\u6761\u4EF6\u65E0\u6548");
  for (const config of [source.balance, source.balance?.usage, source.quota]) if (config?.url) {
    endpoint(config.url, source.baseUrl || "https://example.invalid", "");
    if (config.auth && (/\r|\n/.test(config.auth) || !config.auth.includes("{key}"))) usageError("\u8BA4\u8BC1\u683C\u5F0F\u8BF7\u4F7F\u7528 {key}\uFF0C\u5BC6\u94A5\u53EA\u5B58 DSH \u51ED\u636E\u5E93");
  }
}
class ProviderReader {
  ctx;
  fetcher;
  constructor(ctx, fetcher = fetch) {
    this.ctx = ctx;
    this.fetcher = fetcher;
  }
  async request(config, source, key) {
    const response = await this.fetcher(endpoint(config.url, source.baseUrl || "", key), { headers: headers(config.auth || "", key), signal: AbortSignal.timeout(1e4), redirect: "error" });
    if (!response.ok) usageError(`\u63A5\u53E3\u8FD4\u56DE HTTP ${response.status}`, "PROVIDER_FAILED");
    const text = await response.text();
    if (text.length > 2e6) usageError("\u63A5\u53E3\u54CD\u5E94\u8FC7\u5927", "PROVIDER_FAILED");
    try {
      return JSON.parse(text);
    } catch {
      usageError("\u63A5\u53E3\u6CA1\u6709\u8FD4\u56DE JSON", "PROVIDER_FAILED");
    }
  }
  async read(source, probe = false) {
    const tpl = templates[source.template] || {}, metadata = { version: "0.6.0", locale: "zh-CN", timezoneOffsetSeconds: -(/* @__PURE__ */ new Date()).getTimezoneOffset() * 60 };
    const credential = source.keyRef ? await this.ctx.get?.("credentials")?.resolve(source.keyRef) : null;
    const key = typeof credential === "string" ? credential : credential?.value || "";
    const account = this.ctx.get?.("deepseekAccount");
    if (!key && source.template === "deepseek" && account && source.keyRef === "DEEPSEEK_API_KEY") {
      const state = await account.getState();
      if (state?.status === "credential-stored") {
        const [identity, wallets] = await Promise.all([account.getProfile(metadata), account.getBalance(metadata)]);
        if (wallets?.status !== "ready") usageError("DSH \u8D26\u53F7\u4F59\u989D\u6682\u4E0D\u53EF\u7528", "PROVIDER_FAILED");
        const main = (wallets.value || []).filter((w) => w.currency === source.currency), bonus = (wallets.bonusWallets || []).filter((w) => w.currency === source.currency);
        if (!main.length && !bonus.length) usageError("\u8D26\u53F7\u672A\u8FD4\u56DE\u6240\u9009\u5E01\u79CD\u4F59\u989D", "PROVIDER_FAILED");
        const sum = (list) => list.reduce((v, w) => v + Number(w.balance), 0), recharge = sum(main), gift = sum(bonus);
        if (!Number.isFinite(recharge + gift)) usageError("\u8D26\u53F7\u4F59\u989D\u683C\u5F0F\u65E0\u6548", "PROVIDER_FAILED");
        return { balance: recharge + gift, recharge, bonus: gift, currency: source.currency, scope: identity?.status === "ready" && identity.value.id ? createHash("sha256").update(String(identity.value.id)).digest("hex") : null, kind: "balance", at: Date.now() };
      }
    }
    if (source.keyRef && !key) usageError("\u672A\u914D\u7F6E\u51ED\u636E\uFF0C\u8BF7\u5728 DSH \u51ED\u636E\u7BA1\u7406\u4E2D\u8BBE\u7F6E " + source.keyRef, "CREDENTIAL_REQUIRED");
    if (probe) {
      const url = tpl.probeUrl || source.quota?.url || tpl.quota?.url || source.balance?.url || tpl.balance?.url;
      if (!url) usageError("\u6B64\u6765\u6E90\u6CA1\u6709\u8FDE\u901A\u6027\u63A5\u53E3");
      await this.request({ url, auth: source.balance?.auth ?? tpl.balance?.auth ?? "Bearer {key}" }, source, key || "");
      return { ok: true, at: Date.now() };
    }
    const scope = createHash("sha256").update(source.id + ":" + String(key || "local")).digest("hex");
    const quota = source.quota || tpl.quota;
    if (quota?.url) {
      const data2 = await this.request(quota, source, key || "");
      return { kind: "quota", windows: parseQuota(data2, quota.json || {}), currency: source.currency, scope, at: Date.now() };
    }
    const config = { ...tpl.balance, ...source.balance };
    if (!config.url) return { kind: "unsupported", note: tpl.apiNote || "\u6B64\u6765\u6E90\u6CA1\u6709\u4F59\u989D\u63A5\u53E3\uFF0C\u53EF\u4F7F\u7528\u672C\u5730 Token \u548C\u8D44\u6E90\u989D\u5EA6", at: Date.now() };
    const data = await this.request(config, source, key || ""), map = config.json || {}, scale = finite(map.scale) ?? 1;
    if (source.template === "deepseek" && Array.isArray(data.balance_infos)) {
      const wallet = data.balance_infos.find((w) => w.currency === source.currency);
      if (!wallet || finite(wallet.total_balance) === void 0) usageError("\u63A5\u53E3\u672A\u8FD4\u56DE\u6240\u9009\u5E01\u79CD\u4F59\u989D", "PROVIDER_FAILED");
      return { balance: Number(wallet.total_balance), recharge: finite(wallet.topped_up_balance) ?? null, bonus: finite(wallet.granted_balance) ?? null, currency: source.currency, scope, kind: "balance", at: Date.now() };
    }
    let balance = finite(field(data, map.remaining));
    if (balance === void 0) {
      const total = finite(field(data, map.total));
      let used = finite(field(data, map.used));
      if (used !== void 0) used *= scale;
      if (config.usage?.url) {
        const usage = await this.request(config.usage, source, key || "");
        used = (finite(field(usage, config.usage.json?.used)) ?? NaN) * (finite(config.usage.json?.scale) ?? 1);
      }
      if (total !== void 0 && used !== void 0) balance = total * scale - used;
      else if (total !== void 0 && !config.usage) balance = total * scale;
    } else balance *= scale;
    if (balance === void 0 || !Number.isFinite(balance)) usageError("\u4F59\u989D\u5B57\u6BB5\u6CA1\u6709\u5339\u914D\u5230\u6709\u6548\u6570\u5B57\uFF0C\u8BF7\u6838\u5BF9\u5B57\u6BB5\u8DEF\u5F84", "PROVIDER_FAILED");
    return { balance, currency: source.currency, scope, kind: "balance", at: Date.now() };
  }
}
function parseQuota(data, map) {
  const windows = [];
  const read = (spec, root = data) => {
    if (spec.pick) {
      const list = field(data, spec.pick.list);
      root = Array.isArray(list) ? list.find((row) => (!spec.pick.types || spec.pick.types.includes(row.type)) && (spec.pick.unit === void 0 || row.unit === spec.pick.unit)) : null;
    }
    const remain = finite(field(root, spec.remain)), total = finite(field(root, spec.total));
    const percent = finite(field(root, spec.percent)) ?? (finite(field(root, spec.remainPct)) !== void 0 ? 100 - Number(field(root, spec.remainPct)) : remain !== void 0 && total !== void 0 && total > 0 ? (1 - remain / total) * 100 : void 0);
    if (percent !== void 0) windows.push({ key: spec.key || "rolling", label: spec.label || "\u5F53\u524D\u7A97\u53E3", percent: Math.max(0, Math.min(100, percent)), remain, total, resetAt: field(root, spec.resetAt || spec.resetAtMs) ?? null });
  };
  if (map.windows) for (const spec of map.windows) read(spec);
  else {
    read(map);
    if (map.weeklyRemainPct) read({ key: "weekly", label: "\u5468", remainPct: map.weeklyRemainPct });
  }
  if (!windows.length) usageError("\u989D\u5EA6\u63A5\u53E3\u672A\u8FD4\u56DE\u53EF\u8BC6\u522B\u7684\u7A97\u53E3", "PROVIDER_FAILED");
  return windows;
}
export {
  ProviderReader,
  field,
  parseQuota,
  sourceTemplates,
  validateSource
};

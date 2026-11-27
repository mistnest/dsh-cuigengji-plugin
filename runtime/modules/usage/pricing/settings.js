const usageError = (message, code = "INVALID_INPUT") => {
  throw Object.assign(new Error(message), { code });
};
const usageDay = (time = Date.now()) => {
  const d = new Date(time);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const isUsageDay = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !isNaN(Date.parse(value + "T12:00:00Z")) && (/* @__PURE__ */ new Date(value + "T12:00:00Z")).toISOString().startsWith(value);
const eventKinds = ["press", "release", "complete", "question", "approval", "balance", "budget"];
function defaultCompanionSettings() {
  return {
    enabled: true,
    currency: "CNY",
    exchangeRates: { CNY: "1", USD: "7" },
    dailyBudget: "0",
    lowBalance: "0",
    volume: 0.45,
    scale: 1,
    flipped: false,
    snap: "none",
    bubbleMode: "sequence",
    advanceOnClick: true,
    moduleLibrary: [],
    bubbles: [{ id: "progress", name: "\u5199\u4F5C\u4E0E\u7528\u91CF", weight: 1, lines: [[{ id: "intro", kind: "text", value: "\u4ECA\u5929\u4E5F\u5728\u966A\u4F60\u5199\u6545\u4E8B\u3002" }], [{ id: "tokens", kind: "metric", value: "tokens", label: "\u4ECA\u65E5 Token " }], [{ id: "cost", kind: "metric", value: "cost", label: "\u6A21\u578B\u4F30\u7B97 " }], [{ id: "balance", kind: "metric", value: "balance", label: "\u8D26\u6237\u4F59\u989D " }]] }],
    events: Object.fromEntries(eventKinds.map((kind) => [kind, { on: !["press", "release"].includes(kind), bubble: false, ttl: ["question", "approval"].includes(kind) ? 0 : 6 }]))
  };
}
function emptyUsage() {
  return { version: 1, revision: 0, settings: defaultCompanionSettings(), prices: [], sources: [{ id: "deepseek", name: "DeepSeek", template: "deepseek", enabled: true, keyRef: "DEEPSEEK_API_KEY", provider: "deepseek", currency: "CNY" }], days: [], cursors: {}, summaries: {}, balances: {}, balanceBooks: {}, events: [], assets: [], imported: [] };
}
function validateCompanionSettings(settings) {
  if (!settings || typeof settings.enabled !== "boolean" || !["CNY", "USD", "EUR", "JPY", "GBP"].includes(settings.currency)) usageError("\u8BF7\u9009\u62E9\u6709\u6548\u7684\u7EDF\u8BA1\u5E01\u79CD");
  if (!Number.isFinite(settings.volume) || settings.volume < 0 || settings.volume > 1 || !Number.isFinite(settings.scale) || settings.scale < 0.5 || settings.scale > 2) usageError("\u97F3\u91CF\u6216\u684C\u5BA0\u5927\u5C0F\u65E0\u6548");
  if (typeof settings.flipped !== "boolean" || !["none", "edges", "corners", "custom"].includes(settings.snap) || !["sequence", "weighted"].includes(settings.bubbleMode) || settings.autoFlip !== void 0 && typeof settings.autoFlip !== "boolean") usageError("\u684C\u5BA0\u5916\u89C2\u6216\u6C14\u6CE1\u6A21\u5F0F\u65E0\u6548");
  if (settings.snapZones) {
    const z = settings.snapZones;
    if (!["percent", "px"].includes(z.unit) || [z.left, z.right, z.top, z.bottom].some((v) => !Number.isFinite(v) || v < 0 || v > (z.unit === "percent" ? 50 : 2e3))) usageError("\u5438\u9644\u533A\u57DF\u5E94\u4E3A 0\u201450% \u6216 0\u20142000 \u50CF\u7D20\uFF1B0 \u8868\u793A\u5173\u95ED\u8BE5\u4FA7");
  }
  for (const value of [settings.dailyBudget, settings.lowBalance, ...Object.values(settings.exchangeRates || {})]) if (!/^\d+(?:\.\d{1,9})?$/.test(String(value)) || String(value).length > 30) usageError("\u91D1\u989D\u548C\u6C47\u7387\u987B\u4E3A\u975E\u8D1F\u6570\uFF0C\u6700\u591A\u4E5D\u4F4D\u5C0F\u6570");
  if (!settings.exchangeRates?.[settings.currency] || Object.values(settings.exchangeRates).some((v) => Number(v) <= 0)) usageError("\u6C47\u7387\u5FC5\u987B\u5927\u4E8E\u96F6\uFF0C\u5E76\u5305\u542B\u663E\u793A\u5E01\u79CD");
  if (!Array.isArray(settings.bubbles) || settings.bubbles.length > 60) usageError("\u6C14\u6CE1\u914D\u7F6E\u8FC7\u591A");
  const ids = /* @__PURE__ */ new Set();
  for (const entry of settings.bubbles) {
    if (!entry.id || ids.has(entry.id) || typeof entry.name !== "string" || entry.group !== void 0 && (typeof entry.group !== "string" || entry.group.length > 80) || !Number.isFinite(entry.weight) || entry.weight < 0 || !Array.isArray(entry.lines) || entry.lines.length > 6) usageError("\u6C14\u6CE1\u914D\u7F6E\u65E0\u6548");
    ids.add(entry.id);
    for (const line of entry.lines) {
      if (!Array.isArray(line) || line.length > 6) usageError("\u6BCF\u884C\u6700\u591A\u516D\u4E2A\u6A21\u5757");
      for (const module of line) {
        if (!module || typeof module.id !== "string" || !["text", "metric", "link", "randomText", "image", "randomImage"].includes(module.kind) || typeof module.value !== "string" || module.value.length > 4e3) usageError("\u6C14\u6CE1\u6A21\u5757\u65E0\u6548");
        if (module.choices && (!Array.isArray(module.choices) || module.choices.some((v) => typeof v !== "string" || v.length > 4e3))) usageError("\u968F\u673A\u5185\u5BB9\u65E0\u6548");
        if (module.choiceWeights && (!Array.isArray(module.choiceWeights) || module.choiceWeights.length !== module.choices?.length || module.choiceWeights.some((v) => !Number.isFinite(v) || v < 0))) usageError("\u968F\u673A\u5185\u5BB9\u6743\u91CD\u65E0\u6548");
        if (module.kind === "link" && !/^https?:\/\//i.test(module.value)) usageError("\u6C14\u6CE1\u94FE\u63A5\u9700\u8981 http \u6216 https \u5730\u5740");
        const s = module.style;
        if (s && (s.size !== void 0 && (!Number.isFinite(s.size) || s.size < 9 || s.size > 40) || s.font !== void 0 && (typeof s.font !== "string" || s.font.length > 100) || ["color", "background", "gradient"].some((k) => s[k] && !/^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(s[k])))) usageError("\u6C14\u6CE1\u6587\u5B57\u6837\u5F0F\u65E0\u6548");
      }
      if (line.some((m) => ["image", "randomImage"].includes(m.kind)) && line.length !== 1) usageError("\u56FE\u7247\u6A21\u5757\u9700\u8981\u72EC\u5360\u4E00\u884C");
    }
  }
  if (settings.moduleLibrary) {
    if (!Array.isArray(settings.moduleLibrary) || settings.moduleLibrary.length > 60) usageError("\u5E38\u7528\u6A21\u5757\u6700\u591A\u516D\u5341\u9879");
    const check = { ...settings, moduleLibrary: void 0, bubbles: settings.moduleLibrary.map((m) => ({ id: m.id, name: m.label || m.value || "\u6A21\u5757", weight: 1, lines: [[m]] })) };
    validateCompanionSettings(check);
  }
  for (const kind of eventKinds) {
    const e = settings.events?.[kind];
    if (!e || typeof e.on !== "boolean" || typeof e.bubble !== "boolean" || !Number.isFinite(e.ttl) || e.ttl < 0 || e.ttl > 3600 || e.volume !== void 0 && (!Number.isFinite(e.volume) || e.volume < 0 || e.volume > 1)) usageError("\u63D0\u9192\u914D\u7F6E\u65E0\u6548");
  }
}
export {
  defaultCompanionSettings,
  emptyUsage,
  eventKinds,
  isUsageDay,
  usageDay,
  usageError,
  validateCompanionSettings
};

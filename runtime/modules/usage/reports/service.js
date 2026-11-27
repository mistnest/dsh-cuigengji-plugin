import { createHash } from "node:crypto";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { UsageStore } from "../ledger/store.js";
import { usageDay, usageError, validateCompanionSettings } from "../pricing/settings.js";
import { usageEvent, cursorKey } from "../ledger/events.js";
import { money, validatePrice, builtinPrices, priceProvider } from "../pricing/pricing.js";
import { observeBalance, reconcileBalance } from "../ledger/balance.js";
import { ProviderReader, sourceTemplates, validateSource } from "../providers/providers.js";
import { pricedRecord, pricingVersion, repairPrices } from "../ledger/record-pricing.js";
import { summarize } from "../ledger/totals.js";
import { readUsageReport } from "./usage-report.js";
import { compilePresentation } from "./presentation.js";
import { scanCodex } from "../providers/codex.js";
import { readUsageImport } from "../ledger/import.js";
import { companionAsset } from "./assets.js";
import { builtinUsageAssets } from "./builtins.js";
const hash = (v) => createHash("sha256").update(v).digest("hex");
const clone = (v) => structuredClone(v);
const allAssets = (meta) => [...meta.assets, ...builtinUsageAssets.map((a) => a.asset).filter((a) => !meta.assets.some((row) => row.id === a.id))];
function notify(meta, event) {
  if (meta.events.some((e) => e.id === event.id)) return false;
  meta.events.push(event);
  meta.events = meta.events.filter((e) => e.pending && !e.resolved || e.time > Date.now() - 7 * 864e5).slice(-300);
  return true;
}
class UsageService {
  store;
  reader;
  highPending = [];
  lowPending = [];
  activeQueue = null;
  drainWaiters = [];
  inflight = /* @__PURE__ */ new Map();
  retry = /* @__PURE__ */ new Map();
  timer;
  closed = false;
  error = "";
  sequence = 0;
  listeners = /* @__PURE__ */ new Set();
  pendingSessions = /* @__PURE__ */ new Set();
  pendingHydrated = false;
  pricingReady;
  scheduledRefresh;
  constructor(root, ctx = {}, options = {}) {
    this.store = new UsageStore(root);
    this.reader = new ProviderReader(ctx, options.fetch);
  }
  syncPendingSessions(meta) {
    this.pendingSessions.clear();
    for (const e of meta.events) if (e.pending && !e.resolved && e.sessionId) this.pendingSessions.add(e.sessionId);
    this.pendingHydrated = true;
  }
  hasPendingNotification(sessionId) {
    return !this.pendingHydrated || this.pendingSessions.has(sessionId);
  }
  ensurePrices() {
    return this.pricingReady ??= (async () => {
      const needed = await this.store.run((meta) => {
        this.syncPendingSessions(meta);
        return meta.pricingVersion !== pricingVersion(meta);
      });
      if (needed) await this.enqueue(() => this.store.run(async (meta, load) => {
        this.syncPendingSessions(meta);
        if (meta.pricingVersion !== pricingVersion(meta)) await repairPrices(meta, load);
      }, true));
    })().catch((error) => {
      this.pricingReady = void 0;
      throw error;
    });
  }
  pumpQueue() {
    if (this.activeQueue) return;
    const loop = async () => {
      while (this.highPending.length || this.lowPending.length) {
        const next = this.highPending.shift() || this.lowPending.shift();
        await next.run();
      }
    };
    this.activeQueue = loop().finally(() => {
      this.activeQueue = null;
      if (this.highPending.length || this.lowPending.length) {
        this.pumpQueue();
        return;
      }
      const waiters = this.drainWaiters.splice(0);
      for (const resolve of waiters) resolve();
    });
  }
  enqueue(fn, options = {}) {
    return new Promise((resolve, reject) => {
      let shouldNotify = options.notify !== false;
      const entry = {
        background: Boolean(options.background),
        run: async () => {
          try {
            const value = await fn((changed = true) => {
              shouldNotify = changed;
            });
            if (shouldNotify) for (const listener of this.listeners) try {
              listener();
            } catch {
            }
            resolve(value);
          } catch (e) {
            this.error = e.message || "\u7EDF\u8BA1\u670D\u52A1\u6682\u4E0D\u53EF\u7528";
            reject(e);
          }
        }
      };
      if (entry.background) this.lowPending.push(entry);
      else this.highPending.push(entry);
      this.pumpQueue();
    });
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  async flush() {
    if (!this.activeQueue && !this.highPending.length && !this.lowPending.length) return;
    await new Promise((resolve) => this.drainWaiters.push(resolve));
  }
  observerErrors = /* @__PURE__ */ new Map();
  observerError(id, message) {
    if (message) this.observerErrors.set(id, message);
    else this.observerErrors.delete(id);
  }
  get statusError() {
    return this.error || [...new Set(this.observerErrors.values())].join("\uFF1B");
  }
  start() {
    if (this.timer || this.closed) return;
    const tick = () => {
      this.scheduledRefresh = this.refresh().then(() => {
      }, (error) => {
        this.error = error.message;
      }).finally(() => {
        if (!this.closed) {
          this.timer = setTimeout(tick, 6e4);
          this.timer.unref?.();
        }
      });
    };
    this.timer = setTimeout(tick, 2e3);
    this.timer.unref?.();
  }
  async close() {
    this.closed = true;
    clearTimeout(this.timer);
    await this.scheduledRefresh;
    await Promise.allSettled([...this.inflight.values()]);
    await this.flush();
  }
  async ingest(sessionId, events, source = "dsh", inherited = 0, live = false, options = {}) {
    if (!events.length) return;
    await this.ensurePrices();
    return this.enqueue((notifyListeners) => this.store.run(async (meta, load, controls) => {
      this.syncPendingSessions(meta);
      const key = cursorKey(source, sessionId), previousCursor = meta.cursors[key], previousTitle = meta.turns?.[key]?.title;
      let cursor = previousCursor, notificationChanged = false;
      const touchedDays = /* @__PURE__ */ new Set(), summarizedInline = /* @__PURE__ */ new Set();
      for (const event of events) {
        if (event.seq < inherited) continue;
        const fold = usageEvent(source, sessionId, event, cursor);
        if (!fold) {
          if (live && this.foldNotification(meta, sessionId, event)) notificationChanged = true;
          continue;
        }
        cursor = fold.cursor;
        if (fold.record && meta.settings.enabled) {
          const day = cursor.day, page = await load(day), old = page.records[fold.record.id];
          let record = fold.record;
          if (old) {
            record.time = old.time;
            if (!record.tokens && old.tokens) record = { ...record, tokens: old.tokens, partial: old.partial };
          }
          record.source = old?.source || (source === "dsh" ? meta.sources.find((s) => s.enabled && s.template !== "codex" && !!s.provider && priceProvider(s.provider) === priceProvider(record.provider) && (!s.models?.length || s.models.includes(record.model || "")))?.id || source : source);
          record = pricedRecord(meta, record, old);
          const currency = record.reportCurrency;
          page.records[record.id] = record;
          if (!meta.days.includes(day)) meta.days.push(day);
          touchedDays.add(day);
          summarizedInline.delete(day);
          const turns = meta.turns ??= {}, turn = turns[key];
          if (!turn || turn.turn !== record.turn) turns[key] = { turn: record.turn, title: cursor.title, records: {} };
          turns[key].records[record.id] = record;
          turns[key].title = cursor.title;
          const budget = money(meta.settings.dailyBudget);
          if (live && budget > 0n && day === usageDay()) {
            const cost = Object.values(page.records).reduce((n, r) => n + (r.reportCurrency === currency && r.reportCost ? money(r.reportCost) : 0n), 0n);
            if (cost >= budget && notify(meta, { id: "budget:" + day, kind: "budget", sessionId, time: event.time || Date.now(), text: "\u4ECA\u65E5\u6A21\u578B\u4F30\u7B97\u5DF2\u8FBE\u5230\u9884\u7B97 " + meta.settings.dailyBudget + " " + currency, pending: false })) notificationChanged = true;
          }
          const selected = meta.sources.find((s) => s.id === record.source), sourceBudget = money(selected?.dailyBudget || "0");
          if (live && selected && sourceBudget > 0n && day === usageDay()) {
            meta.summaries[day] = summarize(page.records);
            summarizedInline.add(day);
            const spent = money(meta.summaries[day]?.sources?.[selected.id]?.costs?.[selected.currency] || "0");
            if (spent >= sourceBudget && notify(meta, { id: "budget:" + selected.id + ":" + day, kind: "budget", sessionId, time: event.time || Date.now(), text: selected.name + " \u4ECA\u65E5\u6A21\u578B\u4F30\u7B97\u5DF2\u8FBE\u5230\u9884\u7B97 " + selected.dailyBudget + " " + selected.currency, pending: false })) notificationChanged = true;
          }
        }
        if (live && this.foldNotification(meta, sessionId, event)) notificationChanged = true;
      }
      for (const day of touchedDays) if (!summarizedInline.has(day)) meta.summaries[day] = summarize((await load(day)).records);
      const cursorChanged = cursor !== previousCursor && JSON.stringify(cursor) !== JSON.stringify(previousCursor);
      if (cursor) {
        meta.cursors[key] = cursor;
        if (meta.turns?.[key]) meta.turns[key].title = cursor.title;
      }
      const titleChanged = meta.turns?.[key]?.title !== previousTitle;
      this.syncPendingSessions(meta);
      if (!touchedDays.size && !cursorChanged && !notificationChanged) {
        controls.cancelWrite();
        notifyListeners(false);
        this.error = "";
        return;
      }
      if (touchedDays.size) meta.days.sort();
      notifyListeners(touchedDays.size > 0 || notificationChanged || titleChanged);
      this.error = "";
    }, true), { background: Boolean(options.background) && !live });
  }
  foldNotification(meta, sessionId, event) {
    const type = event.type, d = event.data || {}, time = event.time || Date.now();
    let changed = false;
    if (type === "turn/start" || type === "user/message" || type === "approval/decided" || type === "user-questions/resolved" || type === "turn/end" && ["aborted", "error", "blocked"].includes(d.reason?.kind || d.reason)) {
      for (const e of meta.events) if (e.sessionId === sessionId && e.pending && (type !== "approval/decided" || e.kind === "approval" && (!d.id || e.requestId === d.id))) {
        e.resolved = true;
        e.pending = false;
        changed = true;
      }
    }
    const kind = type === "turn/end" && (!d.reason || d.reason === "completed" || d.reason?.kind === "completed") ? "complete" : type === "approval/asked" ? "approval" : type === "user-questions/asked" ? "question" : null;
    if (kind && notify(meta, { id: hash(sessionId + ":" + event.seq + ":" + kind), kind, sessionId, time, ...kind === "approval" && typeof d.id === "string" ? { requestId: d.id } : {}, text: kind === "complete" ? "\u8FD9\u4E00\u8F6E\u5DF2\u5B8C\u6210\u3002" : kind === "approval" ? "\u6709\u4E00\u9879\u64CD\u4F5C\u7B49\u4F60\u786E\u8BA4\u3002" : "AI \u6709\u95EE\u9898\u60F3\u8BF7\u4F60\u51B3\u5B9A\u3002", pending: kind !== "complete" })) changed = true;
    return changed;
  }
  async configuration() {
    await this.ensurePrices();
    return this.store.run((meta) => ({ revision: meta.configRevision || 0, settings: clone(meta.settings), sources: clone(meta.sources), prices: clone(meta.prices), builtinPrices: builtinPrices(), observedModels: [...new Map(Object.values(meta.summaries).flatMap((s) => Object.entries(s.models || {}))).values()].map((m) => ({ provider: m.provider, model: m.model })), templates: sourceTemplates(), assets: clone(allAssets(meta)), error: this.statusError, root: this.store.root }));
  }
  async configure(args) {
    await this.ensurePrices();
    return this.enqueue(() => this.store.run(async (meta, load) => {
      if (args.expectedRevision !== (meta.configRevision || 0)) usageError("\u914D\u7F6E\u5DF2\u5728\u5176\u4ED6\u7A97\u53E3\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6\u540E\u518D\u4FDD\u5B58", "CONFLICT");
      if (args.settings) {
        validateCompanionSettings(args.settings);
        meta.settings = clone(args.settings);
      }
      if (args.sources) {
        if (!Array.isArray(args.sources) || args.sources.length > 60) usageError("\u6570\u636E\u6E90\u8FC7\u591A");
        const ids = /* @__PURE__ */ new Set();
        for (const s of args.sources) {
          validateSource(s);
          if (ids.has(s.id)) usageError("\u6570\u636E\u6E90 ID \u91CD\u590D");
          ids.add(s.id);
          const before = meta.sources.find((old) => old.id === s.id);
          if (s.limit) {
            const period = s.limit.reset === "day" ? usageDay() : s.limit.reset === "month" ? usageDay().slice(0, 7) : "";
            const changed = !before?.limit || ["total", "used", "reset", "automatic"].some((k) => before.limit[k] !== s.limit[k]);
            if (changed) {
              s.limit.baseline = meta.days.filter((d) => !period || d.startsWith(period)).reduce((n, d) => n + (meta.summaries[d]?.sources?.[s.id]?.tokens || 0), 0);
              s.limit.period = period;
            }
          }
        }
        meta.sources = clone(args.sources);
      }
      if (args.prices) {
        if (!Array.isArray(args.prices) || args.prices.length > 300) usageError("\u4EF7\u683C\u89C4\u5219\u8FC7\u591A");
        const ids = /* @__PURE__ */ new Set(), routes = /* @__PURE__ */ new Set();
        for (const p of args.prices) {
          validatePrice(p);
          const route = JSON.stringify([p.provider.trim().toLowerCase(), p.model.trim().toLowerCase(), p.effectiveFrom || 0]);
          if (ids.has(p.id) || routes.has(route)) usageError("\u540C\u4E00\u5382\u5546\u3001\u6A21\u578B\u548C\u751F\u6548\u65F6\u95F4\u7684\u4EF7\u683C\u91CD\u590D");
          ids.add(p.id);
          routes.add(route);
        }
        meta.prices = clone(args.prices).map((p) => ({ ...p, revision: (meta.configRevision || 0) + 1 }));
      }
      meta.configRevision = (meta.configRevision || 0) + 1;
      if (args.prices) await repairPrices(meta, load);
      this.retry.clear();
      return { revision: meta.configRevision };
    }, true));
  }
  async report(args = {}) {
    await this.ensurePrices();
    return this.store.run(async (meta, load) => {
      const report = await readUsageReport(meta, load, args);
      return { ...report, error: this.statusError, revision: meta.revision };
    });
  }
  async refresh(force = false, id) {
    const sources = await this.store.run((m) => m.sources.filter((s) => s.enabled && (!id || s.id === id)));
    return Promise.all(sources.map((source) => {
      if (this.inflight.has(source.id)) return this.inflight.get(source.id);
      if (!force && (this.retry.get(source.id) || 0) > Date.now()) return Promise.resolve(null);
      const task = (async () => {
        try {
          if (source.template === "codex") {
            const previous = await this.store.run((m) => m.codexFiles?.[source.id] || {}), scan = await scanCodex(source.codexRoot, previous);
            for (const session of scan.sessions) {
              if (this.closed) break;
              await this.ingest(session.id, session.events, source.id, 0, false, { background: true });
            }
            await this.enqueue(() => this.store.run((m) => {
              (m.codexFiles ??= {})[source.id] = scan.files;
              const latest = Object.values(scan.files).map((f) => f.windows).filter((w) => w?.items?.length).sort((a, b) => b.at - a.at)[0];
              m.balances[source.id] = { kind: "codex", at: Date.now(), sessions: Object.keys(scan.files).length, windows: latest?.items || [], windowsAt: latest?.at };
            }, true), { background: !force });
            this.retry.set(source.id, Date.now() + 6e4);
            return { sessions: scan.sessions.length };
          }
          const snapshot = await this.reader.read(source);
          await this.enqueue(() => this.store.run((meta) => {
            if (!meta.sources.some((s) => s.enabled && JSON.stringify(s) === JSON.stringify(source))) return;
            meta.balances[source.id] = { ...snapshot, error: null };
            if (snapshot.balance !== void 0 && snapshot.scope) {
              const ledger = meta.balanceBooks[source.id] ??= {};
              observeBalance(ledger, snapshot);
            }
            const threshold = source.lowBalance ?? meta.settings.lowBalance;
            if (snapshot.balance !== void 0 && snapshot.balance < Number(threshold) && Number(threshold) > 0) notify(meta, { id: `low:${source.id}:${usageDay()}`, kind: "balance", sessionId: "", time: Date.now(), text: source.name + " \u4F59\u989D\u4F4E\u4E8E " + threshold + " " + source.currency + "\u3002", pending: false });
            this.syncPendingSessions(meta);
          }, true), { background: !force });
          this.retry.set(source.id, Date.now() + 6e4);
          return snapshot;
        } catch (e) {
          const message = e.code === "PROVIDER_FAILED" || e.code === "CREDENTIAL_REQUIRED" || e.code === "INVALID_INPUT" ? e.message : "\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u4E0E\u63A5\u53E3\u914D\u7F6E";
          await this.enqueue(() => this.store.run((m) => {
            if (m.sources.some((s) => s.id === source.id)) m.balances[source.id] = { ...m.balances[source.id], error: message, attemptAt: Date.now() };
          }, true), { background: !force });
          this.retry.set(source.id, Date.now() + 12e4);
          return { error: message };
        }
      })().finally(() => this.inflight.delete(source.id));
      this.inflight.set(source.id, task);
      return task;
    }));
  }
  selections = /* @__PURE__ */ new Map();
  choose(id, cycle, count, weights) {
    const old = this.selections.get(id);
    if (old?.cycle === cycle) return old.index;
    let indices = Array.from({ length: count }, (_, i) => i).filter((i) => !weights || weights[i] > 0);
    if (indices.length > 1 && old) indices = indices.filter((i) => i !== old.index);
    if (!indices.length) indices = [0];
    let pick = Math.random() * indices.reduce((n, i) => n + (weights?.[i] ?? 1), 0), index = indices.find((i) => (pick -= weights?.[i] ?? 1) < 0) ?? indices[0];
    if (this.selections.size > 500) this.selections.clear();
    this.selections.set(id, { cycle, index });
    return index;
  }
  builtinFiles;
  prepareBuiltins() {
    return this.builtinFiles ??= (async () => {
      await mkdir(join(this.store.root, "assets"), { recursive: true, mode: 448 });
      for (const a of builtinUsageAssets) try {
        await writeFile(join(this.store.root, "assets", a.asset.file), a.data, { flag: "wx", mode: 384 });
      } catch (e) {
        if (e.code !== "EEXIST") throw e;
      }
    })().catch((e) => {
      this.builtinFiles = void 0;
      throw e;
    });
  }
  async presentation(args = {}) {
    await this.prepareBuiltins();
    await this.ensurePrices();
    return this.store.run(async (meta, load) => {
      this.syncPendingSessions(meta);
      const reportResult = await readUsageReport(meta, load, {});
      const report = { ...reportResult, error: this.statusError, revision: meta.revision };
      const turn = meta.turns?.[cursorKey("dsh", args.sessionId || "")];
      return compilePresentation({ ...meta, assets: allAssets(meta) }, { ...report, turn: turn ? { ...summarize(turn.records), title: turn.title } : {} }, { ...args, select: (id, cycle, count, weights) => this.choose((args.sessionId || "") + ":" + id, cycle, count, weights) }, ++this.sequence, this.store.root);
    });
  }
  async asset(args) {
    if (args.action === "read") return this.store.run(async (m) => {
      const a = allAssets(m).find((a2) => a2.id === args.id);
      if (!a) return usageError("\u7D20\u6750\u4E0D\u5B58\u5728", "NOT_FOUND");
      const builtin = builtinUsageAssets.find((row) => row.asset.id === a.id);
      return { ...a, data: (builtin?.data || await readFile(join(this.store.root, "assets", a.file))).toString("base64") };
    });
    return this.enqueue(() => this.store.run(async (meta) => {
      if (args.expectedRevision !== (meta.configRevision || 0)) usageError("\u7D20\u6750\u5E93\u5DF2\u53D8\u5316\uFF0C\u8BF7\u5237\u65B0", "CONFLICT");
      if (args.action === "delete") {
        if (builtinUsageAssets.some((a2) => a2.asset.id === args.id)) usageError("\u5185\u7F6E\u97F3\u6548\u4FDD\u7559\uFF0C\u53EF\u5728\u63D0\u9192\u8BBE\u7F6E\u4E2D\u5173\u95ED");
        const a = meta.assets.find((a2) => a2.id === args.id);
        if (!a) return usageError("\u7D20\u6750\u4E0D\u5B58\u5728");
        if (JSON.stringify(meta.settings).includes(a.id)) usageError("\u6B64\u7D20\u6750\u6B63\u5728\u4F7F\u7528\uFF0C\u8BF7\u5148\u79FB\u9664\u6C14\u6CE1\u3001\u89D2\u8272\u6216\u97F3\u6548\u5F15\u7528");
        meta.assets = meta.assets.filter((item) => item.id !== args.id);
      } else {
        const { asset, data } = companionAsset(args);
        await mkdir(join(this.store.root, "assets"), { recursive: true, mode: 448 });
        await writeFile(join(this.store.root, "assets", asset.file), data, { mode: 384 });
        if (!meta.assets.some((a) => a.id === asset.id)) meta.assets.push(asset);
      }
      meta.configRevision = (meta.configRevision || 0) + 1;
      return { revision: meta.configRevision, assets: clone(meta.assets) };
    }, true));
  }
  async dispatch(action, args = {}) {
    await this.ensurePrices();
    if (action === "usage.config") return this.configuration();
    if (action === "usage.configure") return this.configure(args);
    if (action === "usage.report") return this.report(args);
    if (action === "usage.refresh") return this.refresh(true, args.id);
    if (action === "usage.presentation") return this.presentation(args);
    if (action === "usage.asset") return this.asset(args);
    if (action === "usage.probe") {
      const source = await this.store.run((m) => m.sources.find((s) => s.id === args.id));
      if (!source) usageError("\u6765\u6E90\u4E0D\u5B58\u5728");
      return this.reader.read(source, true);
    }
    if (action === "usage.reconcile") return this.enqueue(() => this.store.run((m) => {
      const ledger = m.balanceBooks[args.id];
      if (!ledger) usageError("\u6B64\u6765\u6E90\u6CA1\u6709\u4F59\u989D\u8BB0\u5F55");
      return reconcileBalance(ledger, args);
    }, true));
    if (action === "usage.ack" || action === "usage.delivered") return this.enqueue(() => this.store.run((m) => {
      const e = m.events.find((e2) => e2.id === args.id);
      if (e) {
        if (action === "usage.ack") {
          e.resolved = true;
          e.pending = false;
        } else e.deliveredAt ??= Date.now();
      }
      this.syncPendingSessions(m);
      return { ok: true };
    }, true));
    if (action === "usage.export") return this.store.run(async (m, load) => ({ kind: "cuigengji-usage", version: 1, meta: m, pages: await Promise.all(m.days.map(async (day) => ({ day, ...await load(day) }))), assets: await Promise.all(allAssets(m).map(async (a) => ({ ...a, data: (builtinUsageAssets.find((row) => row.asset.id === a.id)?.data || await readFile(join(this.store.root, "assets", a.file))).toString("base64") }))) }));
    if (action === "usage.importPreview" || action === "usage.import") {
      const input = readUsageImport(args.input);
      return this.enqueue(() => this.store.run(async (meta, load) => {
        let duplicates = 0;
        for (const r of input.records) if ((await load(usageDay(r.time))).records[r.id]) duplicates++;
        if (action === "usage.importPreview") return { ...input, records: void 0, native: void 0, count: input.records.length - duplicates, duplicates };
        if (args.expectedDigest !== input.digest) usageError("\u5BFC\u5165\u5185\u5BB9\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u9884\u89C8", "CONFLICT");
        for (const r of input.records) {
          const day = usageDay(r.time), page = await load(day);
          if (!page.records[r.id]) page.records[r.id] = r;
          if (!meta.days.includes(day)) meta.days.push(day);
        }
        for (const day of new Set(input.records.map((r) => usageDay(r.time)))) meta.summaries[day] = summarize((await load(day)).records);
        if (input.native) {
          const backup = input.native;
          for (const source of backup.sources) {
            if (!meta.sources.some((s) => s.id === source.id)) {
              meta.sources.push({ ...clone(source), enabled: false });
              if (backup.balanceBooks[source.id]) meta.balanceBooks[source.id] = clone(backup.balanceBooks[source.id]);
            }
          }
          for (const a of backup.assets) {
            const { asset, data } = companionAsset(a);
            await mkdir(join(this.store.root, "assets"), { recursive: true, mode: 448 });
            await writeFile(join(this.store.root, "assets", asset.file), data, { mode: 384 });
            if (!meta.assets.some((row) => row.id === asset.id)) meta.assets.push(asset);
          }
          if (args.restoreConfiguration) {
            meta.settings = clone(backup.settings);
            meta.prices = clone(backup.prices);
            meta.sources = clone(backup.sources);
          }
          for (const [id, book] of Object.entries(backup.balanceBooks)) if (!meta.balanceBooks[id]) meta.balanceBooks[id] = clone(book);
          meta.configRevision = (meta.configRevision || 0) + 1;
        }
        const legacyId = "whale-" + input.digest;
        if (args.input.accounting || args.input.history) {
          meta.balanceBooks[legacyId] = { accounting: clone(args.input.accounting), history: clone(args.input.history || {}), events: [] };
          if (!meta.sources.some((s) => s.id === legacyId)) meta.sources.push({ id: legacyId, name: "\u5C0F\u9CB8\u9C7C\u5386\u53F2\u8D26\u672C", template: "custom", enabled: false, keyRef: "", currency: "CNY" });
        }
        meta.days.sort();
        await repairPrices(meta, load);
        if (!meta.imported.includes(input.digest)) meta.imported.push(input.digest);
        return { count: input.records.length - duplicates, duplicates };
      }, action === "usage.import"));
    }
    usageError("\u65E0\u6548\u7684\u8BB0\u8D26\u64CD\u4F5C");
  }
  async cursor(sessionId, source = "dsh") {
    return this.store.run((m) => {
      this.syncPendingSessions(m);
      return m.cursors[cursorKey(source, sessionId)]?.seq ?? -1;
    });
  }
  async notification(event) {
    return this.enqueue(() => this.store.run((m) => {
      notify(m, event);
      this.syncPendingSessions(m);
    }, true));
  }
  async resolveNotification(id) {
    return this.enqueue(() => this.store.run((m) => {
      const e = m.events.find((e2) => e2.id === id);
      if (e) {
        e.pending = false;
        e.resolved = true;
      }
      this.syncPendingSessions(m);
    }, true));
  }
}
export {
  UsageService
};

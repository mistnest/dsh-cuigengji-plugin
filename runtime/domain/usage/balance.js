const ACCOUNTING_VERSION = 1;
const SCALE = 1e8;
function moneyUnits(value) {
  const n = Number(value);
  const units = Math.round(n * SCALE);
  if (!Number.isFinite(n) || !Number.isSafeInteger(units)) throw new Error("\u91D1\u989D\u65E0\u6548\u6216\u8D85\u51FA\u53EF\u8BB0\u8D26\u8303\u56F4");
  return units;
}
function preciseMoney(value) {
  return moneyUnits(value) / SCALE;
}
function addMoney(a, b) {
  return sumMoney([a, b]);
}
function sumMoney(values) {
  let units = 0;
  for (const value of values) units += moneyUnits(value);
  if (!Number.isSafeInteger(units)) throw new Error("\u91D1\u989D\u5408\u8BA1\u8D85\u51FA\u53EF\u8BB0\u8D26\u8303\u56F4");
  return units / SCALE;
}
function beijingDay(time = Date.now()) {
  const d = new Date(Number(time) + 8 * 36e5);
  if (!Number.isFinite(d.getTime())) throw new Error("\u65E0\u6548\u7684\u89C2\u6D4B\u65F6\u95F4");
  return d.toISOString().slice(0, 10);
}
function dayOffset(day, offset) {
  return beijingDay(Date.parse(day + "T00:00:00+08:00") + offset * 864e5);
}
const PARTIAL_GAP_MS = 10 * 60 * 1e3;
function partialDayOf(day, row, now) {
  try {
    const start = Date.parse(String(day) + "T00:00:00+08:00");
    if (!Number.isFinite(start)) return true;
    const end = start + 864e5;
    const first = Number(row && row.firstAt);
    const last = Number(row && row.lastAt);
    if (!Number.isFinite(first) || !Number.isFinite(last)) return true;
    const beforeGap = first - start;
    const afterGap = Number(now) >= end ? end - last : 0;
    return beforeGap > PARTIAL_GAP_MS || afterGap > PARTIAL_GAP_MS;
  } catch (err) {
    return true;
  }
}
function partialDayInfo(day, row, now = Date.now()) {
  const start = Date.parse(String(day) + "T00:00:00+08:00");
  const partialDay = partialDayOf(day, row, now);
  const first = Number(row && row.firstAt);
  const last = Number(row && row.lastAt);
  return {
    partialDay,
    // 给界面用：从几点才开始有观测（缺口在起点）/ 那天几点之后就没再观测（缺口在末尾）
    observedFromMs: Number.isFinite(first) ? first : null,
    observedToMs: Number.isFinite(last) ? last : null,
    leadingGapMs: Number.isFinite(first) && Number.isFinite(start) ? Math.max(0, first - start) : null,
    trailingGapMs: Number.isFinite(last) && Number.isFinite(start) && now >= start + 864e5 ? Math.max(0, start + 864e5 - last) : 0
  };
}
function currentBook(ledger) {
  const a = ledger.accounting;
  return a && a.version === ACCOUNTING_VERSION && a.books && a.books[a.active];
}
function booksOf(ledger) {
  const a = ledger.accounting;
  if (!a || a.version !== ACCOUNTING_VERSION || !a.books) return [];
  const out = [];
  for (const scope of Object.keys(a.books)) {
    const book = a.books[scope];
    if (!book || !book.days) continue;
    out.push({ scope, book, active: scope === a.active, lastAt: Number(book.lastAt) || 0 });
  }
  return out;
}
function bookBreakdown(ledger, day) {
  const rows = [];
  for (const { scope, book, active, lastAt } of booksOf(ledger)) {
    const row = book.days[day];
    if (!row) continue;
    rows.push({
      scope,
      currency: book.currency,
      active,
      lastAt,
      amount: preciseMoney(observedAmount(row)),
      firstObservedAt: row.firstAt,
      lastObservedAt: row.lastAt,
      needsReview: row.creditUnits > (row.correction ? row.correction.creditUnits : 0)
    });
  }
  return rows.sort((a, b) => a.active === b.active ? b.lastAt - a.lastAt : a.active ? -1 : 1);
}
function accountingDays(ledger) {
  const set = /* @__PURE__ */ new Set();
  for (const { book } of booksOf(ledger)) for (const d of Object.keys(book.days || {})) set.add(d);
  return Array.from(set).sort();
}
function observedAmount(day) {
  const c = day.correction;
  return (c ? c.amountUnits + day.debitUnits - c.debitUnits : day.debitUnits) / SCALE;
}
function revisionOf(ledger, day) {
  return [
    ledger.accounting.active,
    day.day,
    day.firstAt,
    day.lastUnits,
    day.debitUnits,
    day.creditUnits,
    day.revision || 0
  ].join(":");
}
function balanceSummary(ledger, day = beijingDay()) {
  const book = currentBook(ledger);
  const row = book && book.days && book.days[day];
  if (!row) return null;
  const correction = row.correction;
  const needsReview = row.creditUnits > (correction ? correction.creditUnits : 0);
  const source = needsReview ? "balance-needs-review" : correction ? "balance-corrected" : "balance-observed";
  return {
    day,
    amount: preciseMoney(observedAmount(row)),
    currency: book.currency,
    source,
    label: needsReview ? "\u5DF2\u89C2\u6D4B\u6D88\u8D39 \xB7 \u5F85\u6838\u5BF9\u4F59\u989D\u8C03\u6574" : correction ? "\u5DF2\u6821\u6B63\u6D88\u8D39" : "\u5DF2\u89C2\u6D4B\u6D88\u8D39",
    firstObservedAt: row.firstAt,
    lastObservedAt: row.lastAt,
    openingBalance: row.openingUnits / SCALE,
    currentBalance: row.lastUnits / SCALE,
    observedDecrease: row.debitUnits / SCALE,
    observedIncrease: row.creditUnits / SCALE,
    needsReview,
    revision: revisionOf(ledger, row),
    ...partialDayInfo(day, row),
    credits: correction ? correction.creditsUnits / SCALE : null,
    otherDebits: correction ? correction.otherDebitsUnits / SCALE : null,
    correctedAt: correction ? correction.at : null
  };
}
function observeBalance(ledger, snapshot) {
  const at = Number(snapshot.at ?? Date.now());
  const day = beijingDay(at);
  const units = moneyUnits(snapshot.balance);
  const currency = String(snapshot.currency || "CNY").toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("\u4F59\u989D\u5E01\u79CD\u65E0\u6548");
  const scope = String(snapshot.scope || "default");
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(scope)) throw new Error("\u8D26\u6237\u6807\u8BC6\u65E0\u6548");
  const context = scope + "-" + currency;
  let a = ledger.accounting;
  if (!a || a.version !== ACCOUNTING_VERSION) {
    a = ledger.accounting = {
      version: ACCOUNTING_VERSION,
      active: context,
      books: {},
      migratedAt: at,
      legacyHistory: { ...ledger.history || {} }
    };
  }
  a.books ||= {};
  let book = a.books[context];
  if (!book) book = a.books[context] = { currency, days: {} };
  if (book.lastAt != null && at <= book.lastAt) return balanceSummary(ledger, ledger.date);
  a.active = context;
  let row = book.days[day];
  if (!row) {
    row = book.days[day] = {
      day,
      firstAt: at,
      lastAt: at,
      openingUnits: units,
      lastUnits: units,
      debitUnits: 0,
      creditUnits: 0,
      revision: 0,
      correction: null
    };
  } else {
    const delta = row.lastUnits - units;
    if (delta > 0) row.debitUnits += delta;
    if (delta < 0) row.creditUnits -= delta;
    row.lastUnits = units;
    row.lastAt = at;
  }
  book.lastAt = at;
  ledger.date = day;
  ledger.dayStart = row.openingUnits / SCALE;
  ledger.lastBalance = row.lastUnits / SCALE;
  const summary = balanceSummary(ledger, day);
  ledger.todayUsage = summary.amount;
  ledger.history ||= {};
  ledger.history[day] = summary.amount;
  return summary;
}
function adjustmentUnits(value, required = false) {
  if (value === "" || value === null || value === void 0) {
    if (required) throw new Error("\u8BF7\u586B\u5199\u672C\u7EDF\u8BA1\u533A\u95F4\u7684\u7D2F\u8BA1\u5230\u8D26\u91D1\u989D\uFF0C\u672A\u5145\u503C\u8BF7\u586B 0");
    return 0;
  }
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,8})?$/.test(String(value))) {
    throw new Error("\u91D1\u989D\u987B\u4E3A\u975E\u8D1F\u6570\uFF0C\u6700\u591A\u4FDD\u7559 8 \u4F4D\u5C0F\u6570");
  }
  const units = moneyUnits(value);
  if (units < 0) throw new Error("\u91D1\u989D\u4E0D\u80FD\u4E3A\u8D1F\u6570");
  return units;
}
function reconcileBalance(ledger, input, now = Date.now()) {
  const day = String(input.day || "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("\u8BF7\u9009\u62E9\u6709\u6548\u7684\u8BB0\u8D26\u65E5\u671F");
  const book = currentBook(ledger);
  const row = book && book.days && book.days[day];
  if (!row) throw new Error("\u8FD9\u4E00\u5929\u6CA1\u6709\u4F59\u989D\u89C2\u6D4B\u8BB0\u5F55\uFF0C\u65E0\u6CD5\u6821\u6B63");
  if (input.revision !== revisionOf(ledger, row)) {
    const err = new Error("\u4F59\u989D\u6216\u6821\u6B63\u8BB0\u5F55\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u65B0\u6253\u5F00\u6821\u6B63\u7A97\u53E3\u540E\u6838\u5BF9\u91D1\u989D");
    err.status = 409;
    throw err;
  }
  if (input.action !== "reset" && input.confirmed !== true) throw new Error("\u8BF7\u5148\u786E\u8BA4\u5DF2\u6838\u5BF9\u672C\u7EDF\u8BA1\u533A\u95F4\u7684\u5168\u90E8\u4F59\u989D\u8C03\u6574");
  let correction = null;
  if (input.action !== "reset") {
    const creditsUnits = adjustmentUnits(input.credits, true);
    const otherDebitsUnits = adjustmentUnits(input.otherDebits);
    const amountUnits = row.openingUnits + creditsUnits - otherDebitsUnits - row.lastUnits;
    if (!Number.isSafeInteger(amountUnits) || amountUnits < 0) {
      throw new Error("\u6821\u6B63\u540E\u6D88\u8D39\u4E3A\u8D1F\u6216\u8D85\u51FA\u8303\u56F4\uFF0C\u8BF7\u6838\u5BF9\u7EDF\u8BA1\u8D77\u70B9\u4E0E\u7D2F\u8BA1\u5230\u8D26\u91D1\u989D");
    }
    correction = {
      at: Number(now),
      creditsUnits,
      otherDebitsUnits,
      amountUnits,
      debitUnits: row.debitUnits,
      creditUnits: row.creditUnits
    };
  }
  row.correctionLog ||= [];
  row.correctionLog.push({ at: Number(now), previous: row.correction, next: correction });
  if (row.correctionLog.length > 50) row.correctionLog.splice(0, row.correctionLog.length - 50);
  row.correction = correction;
  row.revision = (row.revision || 0) + 1;
  const summary = balanceSummary(ledger, day);
  ledger.history ||= {};
  ledger.history[day] = summary.amount;
  if (ledger.date === day) ledger.todayUsage = summary.amount;
  return summary;
}
function eventEstimate(ledger, day) {
  return sumMoney((Array.isArray(ledger.events) ? ledger.events : []).filter((e) => e.day === day).map((e) => Number(e.cost) || 0));
}
function daySummary(ledger, day) {
  const observed = balanceSummary(ledger, day);
  const estimate = eventEstimate(ledger, day);
  const books = bookBreakdown(ledger, day);
  const others = books.filter((b) => !b.active);
  const otherSame = others.filter((b) => !observed || b.currency === observed.currency);
  const common = { eventEstimate: estimate, eventCurrency: "CNY", bookBreakdown: books, bookCount: books.length };
  if (observed) {
    if (!otherSame.length) return { ...observed, ...common };
    const other = sumMoney(otherSame.map((b) => b.amount));
    const tail = others.length > otherSame.length ? "\uFF08\u53E6\u6709\u5176\u5B83\u5E01\u79CD " + (others.length - otherSame.length) + " \u672C\uFF09" : "";
    return {
      ...observed,
      ...common,
      otherBookAmount: other,
      historyHint: "\u53E6\u6709 " + otherSame.length + " \u4E2A\u5386\u53F2\u8BB0\u8D26\u672C\uFF08\u6362\u8FC7 API key\uFF09\xB7 " + other.toFixed(2) + tail
    };
  }
  const fromOther = others[0];
  if (fromOther) {
    return {
      day,
      amount: fromOther.amount,
      currency: fromOther.currency,
      source: "balance-observed-other-account",
      label: "\u5DF2\u89C2\u6D4B\u6D88\u8D39 \xB7 \u5386\u53F2\u8D26\u6237",
      firstObservedAt: fromOther.firstObservedAt,
      lastObservedAt: fromOther.lastObservedAt,
      needsReview: fromOther.needsReview,
      ...common,
      ...partialDayInfo(day, { firstAt: fromOther.firstObservedAt, lastAt: fromOther.lastObservedAt })
    };
  }
  const history = ledger.accounting ? ledger.accounting.legacyHistory : ledger.history;
  const h = history && history[day];
  const hasHistory = typeof h === "number" && Number.isFinite(h);
  return {
    day,
    amount: hasHistory ? preciseMoney(h) : estimate,
    currency: "CNY",
    source: hasHistory ? "legacy" : "events",
    label: hasHistory ? "\u65E7\u7248\u8BB0\u5F55 \xB7 \u672A\u6821\u6B63" : "\u672C\u5730\u4F30\u7B97",
    partialDay: true,
    ...common
  };
}
export {
  ACCOUNTING_VERSION,
  accountingDays,
  addMoney,
  balanceSummary,
  beijingDay,
  bookBreakdown,
  dayOffset,
  daySummary,
  eventEstimate,
  moneyUnits,
  observeBalance,
  partialDayInfo,
  preciseMoney,
  reconcileBalance,
  sumMoney
};

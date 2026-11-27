import { money, moneyText, totalTokens } from "../pricing/pricing.js";
function emptyTotals() {
  return {
    tokens: 0,
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    calls: 0,
    partial: 0,
    unpriced: 0,
    costs: {},
    reportCosts: {}
  };
}
function addCost(costs, currency, amount) {
  costs[currency] = moneyText(money(costs[currency] || "0") + money(amount));
}
function addRecord(totals, record) {
  totals.calls++;
  totals.tokens += totalTokens(record.tokens);
  totals.input += record.tokens?.input || 0;
  totals.output += record.tokens?.output || 0;
  totals.cacheRead += record.tokens?.cacheRead || 0;
  totals.cacheWrite += record.tokens?.cacheWrite || 0;
  totals.partial += Number(record.partial);
  totals.unpriced += Number(record.cost == null);
  if (record.cost != null && record.currency) addCost(totals.costs, record.currency, record.cost);
  if (record.reportCost != null && record.reportCurrency) addCost(totals.reportCosts, record.reportCurrency, record.reportCost);
}
function summarize(records) {
  const totals = { ...emptyTotals(), models: {}, sources: {} };
  for (const record of Object.values(records)) {
    const { provider, model, source } = record;
    const route = JSON.stringify([provider, model]);
    const modelTotals = totals.models[route] ??= { ...emptyTotals(), provider, model };
    const sourceTotals = totals.sources[source] ??= emptyTotals();
    addRecord(totals, record);
    addRecord(modelTotals, record);
    addRecord(sourceTotals, record);
  }
  return totals;
}
export {
  addCost,
  addRecord,
  emptyTotals,
  summarize
};

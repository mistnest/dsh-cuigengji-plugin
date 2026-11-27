import {money, moneyText, totalTokens} from '../pricing/pricing.ts';
import type {UsageRecord} from '../types.ts';

export function emptyTotals() {
  return {tokens: 0, input: 0, output: 0, cacheRead: 0, cacheWrite: 0, calls: 0, partial: 0, unpriced: 0,
    costs: {} as Record<string, string>, reportCosts: {} as Record<string, string>};
}
export type UsageTotals = ReturnType<typeof emptyTotals>;
type ModelTotals = UsageTotals & Pick<UsageRecord, 'provider' | 'model'>;

export function addCost(costs: Record<string, string>, currency: string, amount: string) {
  costs[currency] = moneyText(money(costs[currency] || '0') + money(amount));
}

export function addRecord(totals: UsageTotals, record: UsageRecord) {
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

export function summarize(records: Record<string, UsageRecord>) {
  const totals = {...emptyTotals(), models: {} as Record<string, ModelTotals>, sources: {} as Record<string, UsageTotals>};
  for (const record of Object.values(records)) {
    const {provider, model, source} = record;
    const route = JSON.stringify([provider, model]);
    const modelTotals = totals.models[route] ??= {...emptyTotals(), provider, model};
    const sourceTotals = totals.sources[source] ??= emptyTotals();
    addRecord(totals, record);
    addRecord(modelTotals, record);
    addRecord(sourceTotals, record);
  }
  return totals;
}

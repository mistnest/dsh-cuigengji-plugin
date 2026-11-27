import {builtinPrices, charge, money, moneyText, priceDigest} from '../pricing/pricing.ts';
import type {UsageMeta, UsageRecord} from '../types.ts';
import type {LoadUsageDay} from './store.ts';
import {summarize} from './totals.ts';

export function pricedRecord(meta: UsageMeta, record: UsageRecord, previous?: UsageRecord) {
  const priced = charge(record, meta.prices, previous?.price);
  const currency = previous?.reportCurrency || record.reportCurrency || meta.settings.currency;
  const rates = meta.settings.exchangeRates;
  let rate = previous?.exchangeRate ?? record.exchangeRate;
  if (rate == null) {
    if (priced.currency === currency) rate = '1';
    else if (priced.currency && rates[priced.currency] && rates[currency]) {
      rate = moneyText(money(rates[priced.currency]) * 1_000_000_000n / money(rates[currency]));
    }
  }
  const reportCost = priced.cost != null && rate ? moneyText(money(priced.cost) * money(rate) / 1_000_000_000n) : null;
  return {...priced, reportCurrency: currency, exchangeRate: rate, reportCost};
}

export const pricingVersion = (meta: UsageMeta) => priceDigest({contract:'route-pricing-v2', builtin:builtinPrices(), prices:meta.prices});

/** Backfill only unpriced estimates inside the caller's ledger transaction. */
export async function repairPrices(meta: UsageMeta, load: LoadUsageDay) {
  const repaired = new Map<string, UsageRecord>();
  for (const day of meta.days) {
    if (!meta.summaries[day]?.unpriced) continue;
    const page = await load(day);
    let changed = false;
    for (const [id, record] of Object.entries(page.records)) {
      if (record.cost != null || record.price || record.origin === 'whale') continue;
      const updated = pricedRecord(meta, record);
      if (JSON.stringify(updated) === JSON.stringify(record)) continue;
      page.records[id] = updated;
      repaired.set(id, updated);
      changed = true;
    }
    if (changed) meta.summaries[day] = summarize(page.records);
  }
  for (const turn of Object.values(meta.turns || {})) {
    for (const id of Object.keys(turn.records)) {
      const updated = repaired.get(id);
      if (updated) turn.records[id] = updated;
    }
  }
  meta.pricingVersion = pricingVersion(meta);
}

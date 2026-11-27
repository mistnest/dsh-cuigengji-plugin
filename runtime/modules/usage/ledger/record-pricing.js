import { builtinPrices, charge, money, moneyText, priceDigest } from "../pricing/pricing.js";
import { summarize } from "./totals.js";
function pricedRecord(meta, record, previous) {
  const priced = charge(record, meta.prices, previous?.price);
  const currency = previous?.reportCurrency || record.reportCurrency || meta.settings.currency;
  const rates = meta.settings.exchangeRates;
  let rate = previous?.exchangeRate ?? record.exchangeRate;
  if (rate == null) {
    if (priced.currency === currency) rate = "1";
    else if (priced.currency && rates[priced.currency] && rates[currency]) {
      rate = moneyText(money(rates[priced.currency]) * 1000000000n / money(rates[currency]));
    }
  }
  const reportCost = priced.cost != null && rate ? moneyText(money(priced.cost) * money(rate) / 1000000000n) : null;
  return { ...priced, reportCurrency: currency, exchangeRate: rate, reportCost };
}
const pricingVersion = (meta) => priceDigest({ contract: "route-pricing-v2", builtin: builtinPrices(), prices: meta.prices });
async function repairPrices(meta, load) {
  const repaired = /* @__PURE__ */ new Map();
  for (const day of meta.days) {
    if (!meta.summaries[day]?.unpriced) continue;
    const page = await load(day);
    let changed = false;
    for (const [id, record] of Object.entries(page.records)) {
      if (record.cost != null || record.price || record.origin === "whale") continue;
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
export {
  pricedRecord,
  pricingVersion,
  repairPrices
};

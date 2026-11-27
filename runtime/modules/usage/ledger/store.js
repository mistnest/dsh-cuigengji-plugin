import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { AtomicStore } from "../../../platform/files/atomic-store.js";
import { emptyUsage, isUsageDay, usageError } from "../pricing/settings.js";
class UsageStore {
  root;
  metadata;
  constructor(root) {
    this.root = root;
    this.metadata = new AtomicStore(root, emptyUsage, (v) => {
      if (!v || typeof v !== "object" || v.version !== 1 || !Array.isArray(v.days) || !v.cursors) usageError("\u8BB0\u8D26\u7D22\u5F15\u683C\u5F0F\u65E0\u6548\uFF0C\u539F\u6587\u4EF6\u5DF2\u4FDD\u7559", "CORRUPT_STORE");
    });
  }
  page(day) {
    if (!isUsageDay(day)) usageError("\u8BB0\u8D26\u65E5\u671F\u65E0\u6548");
    return new AtomicStore(join(this.root, "ledger", day.slice(0, 4), day), () => ({ version: 1, records: {} }), (v) => {
      if (!v || typeof v !== "object" || v.version !== 1 || !v.records) usageError(`\u8BB0\u8D26\u660E\u7EC6\u65E0\u6CD5\u8BFB\u53D6\uFF1A${day}`, "CORRUPT_STORE");
    });
  }
  async run(fn, write = false) {
    return this.metadata.withLock(async () => {
      let meta = await this.metadata.load();
      if (meta.pending) {
        for (const p of meta.pending.pages) {
          const page = this.page(p.day);
          await mkdir(page.root, { recursive: true, mode: 448 });
          await page.save({ version: 1, records: p.records });
        }
        delete meta.pending;
        await this.metadata.save(meta);
      }
      const pages = /* @__PURE__ */ new Map(), initialPages = /* @__PURE__ */ new Map();
      let cancelled = false;
      const load = async (day) => {
        if (!pages.has(day)) {
          const loaded = await this.page(day).load();
          if (write) initialPages.set(day, JSON.stringify(loaded.records));
          pages.set(day, loaded);
        }
        return pages.get(day);
      };
      const result = await fn(meta, load, { cancelWrite: () => {
        cancelled = true;
      } });
      if (write && !cancelled) {
        const modifiedPages = [...pages].filter(([day, page]) => JSON.stringify(page.records) !== initialPages.get(day));
        meta.revision++;
        if (modifiedPages.length > 0) {
          meta.pending = { pages: modifiedPages.map(([day, page]) => ({ day, records: page.records })) };
          await this.metadata.save(meta);
          for (const [day, page] of modifiedPages) {
            const target = this.page(day);
            await mkdir(target.root, { recursive: true, mode: 448 });
            await target.save(page);
          }
          delete meta.pending;
        }
        await this.metadata.save(meta);
      }
      return result;
    });
  }
}
export {
  UsageStore
};

import { fail } from "../../../platform/errors.js";
import { digest } from "./file-transaction.js";
async function runWorkspaceTransaction(store, operation) {
  return store.withLock(async () => {
    const state = await operation.load();
    operation.guard?.(state);
    let key;
    let signature;
    if (operation.requestId !== void 0) {
      if (typeof operation.requestId !== "string" || !operation.requestId.trim()) fail("INVALID_INPUT", "requestId\u5FC5\u987B\u662F\u975E\u7A7A\u6587\u672C");
      key = digest(operation.requestId);
      signature = operation.signature();
      if (Object.hasOwn(state.requests, key)) {
        const previous = state.requests[key];
        if (previous.signature !== signature) fail("REQUEST_ID_REUSED", "requestId \u5DF2\u7528\u4E8E\u5176\u4ED6\u8BF7\u6C42");
        if (previous.cleaned) fail("REQUEST_EXPIRED", "\u6B64\u64CD\u4F5C\u7684\u7ED3\u679C\u5DF2\u968F\u5386\u53F2\u6E05\u7406\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6\u5F53\u524D\u5185\u5BB9\uFF1B\u65E7\u8BF7\u6C42\u4E0D\u4F1A\u91CD\u590D\u6267\u884C");
        return structuredClone(previous.result);
      }
    }
    const target = await operation.prepare(state);
    const before = JSON.stringify(state);
    const activityBefore = JSON.stringify(state.activity || {});
    const { result, novelId } = await operation.apply(state, target);
    if (key) {
      state.requests[key] = { signature, result: structuredClone(result), timestamp: (/* @__PURE__ */ new Date()).toISOString(), ...novelId ? { novelId } : {} };
    }
    if (JSON.stringify(state) !== before || JSON.stringify(state.activity || {}) !== activityBefore || store.hasGeneratedSettingHistory(state)) {
      await store.save(state);
      store.clearGeneratedSettingHistory(state);
    }
    return structuredClone(result);
  });
}
export {
  runWorkspaceTransaction
};

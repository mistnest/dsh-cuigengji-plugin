const novelLifecycleActions = ["novel.archive", "novel.restore", "novel.purge"];
const recyclesNovel = (action, args) => action === "novel.purge" || action === "novel.archive" && args.archived !== false;
const fail = (code, message) => {
  throw Object.assign(new Error(message), { code });
};
function applyNovelLifecycle(state, novel, action, args) {
  if (action === "novel.purge") {
    if (!novel.archived) fail("NOVEL_NOT_RECYCLED", "\u8BF7\u5148\u5C06\u4F5C\u54C1\u79FB\u5165\u56DE\u6536\u7AD9\uFF0C\u518D\u6C38\u4E45\u5220\u9664");
    if (args.confirm !== true) fail("CONFIRM_REQUIRED", "\u6C38\u4E45\u5220\u9664\u9700\u8981\u786E\u8BA4");
    for (const [key, request] of Object.entries(state.requests)) {
      if (request.novelId === novel.id || !request.novelId && (request.result?.id === novel.id || request.result?.novelId === novel.id)) delete state.requests[key];
    }
    delete state.novels[novel.id];
  } else {
    if (action === "novel.archive" && args.archived !== void 0 && typeof args.archived !== "boolean") fail("INVALID_INPUT", "archived \u5FC5\u987B\u662F\u5E03\u5C14\u503C");
    const archived = action === "novel.archive" && args.archived !== false;
    if (!archived && !novel.archived) fail("NOVEL_NOT_RECYCLED", "\u8FD9\u90E8\u4F5C\u54C1\u4E0D\u5728\u56DE\u6536\u7AD9");
    if (archived && args.confirm !== true) fail("CONFIRM_REQUIRED", "\u79FB\u5165\u56DE\u6536\u7AD9\u9700\u8981\u786E\u8BA4");
    novel.archived = archived;
    if (archived) novel.archivedAt ??= (/* @__PURE__ */ new Date()).toISOString();
    else delete novel.archivedAt;
  }
  for (const [key, binding] of Object.entries(state.bindings)) if (binding.novelId === novel.id) delete state.bindings[key];
}
export {
  applyNovelLifecycle,
  novelLifecycleActions,
  recyclesNovel
};

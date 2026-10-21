import { createHash } from "node:crypto";
import { countManuscript } from "../../domain/manuscript.js";
import { within } from "../../application/libraries/service.js";
function registerConversationActivity(ctx, libraries) {
  const pending = /* @__PURE__ */ new Map();
  ctx.on("session/event", (session, event) => {
    const message = event.data;
    if (event.type !== "user/message" || event.surfaceOp !== "append" || message?.source?.kind !== "user" || session.header?.origin === "subagent" || event.seq < session.inheritedEventCount) return;
    const count = countManuscript((message.content || []).filter((part) => part.type === "text" && typeof part.text === "string").map((part) => part.text).join(""));
    if (!count || !message.id || !Number.isSafeInteger(event.time)) return;
    const sessionId = String(session.id), sessionKey = createHash("sha256").update(sessionId).digest("hex");
    const task = libraries.use(async () => {
      const current = libraries.current;
      await current.maintenance.ensureReady();
      await current.store.dispatch("activity.input", { count, time: event.time, sessionKey, inWorkspace: typeof session.header?.cwd === "string" && within(current.store.root, session.header.cwd), requestId: "chat:" + message.id }, { kind: "activity", sessionId });
    }).catch((error) => ctx.logger?.warn?.(`cuigengji conversation activity: ${error.message}`));
    if (!pending.has(sessionId)) pending.set(sessionId, /* @__PURE__ */ new Set());
    pending.get(sessionId).add(task);
    void task.then(() => {
      const tasks = pending.get(sessionId);
      tasks?.delete(task);
      if (!tasks?.size) pending.delete(sessionId);
    });
    return task;
  });
  ctx.on("session/flush", (session) => Promise.all([...pending.get(String(session.id)) || []]));
  ctx.effect?.(() => () => Promise.all([...pending.values()].flatMap((tasks) => [...tasks])));
}
export {
  registerConversationActivity
};

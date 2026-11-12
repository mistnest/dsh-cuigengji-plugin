function registerUsage(ctx, usage) {
  const tasks = /* @__PURE__ */ new Map(), initialized = /* @__PURE__ */ new Set();
  let closed = false;
  const safe = (task) => task.catch((e) => ctx.logger?.warn?.("cuigengji usage: " + e.message));
  const replay = async (id) => {
    const persistence = ctx.get?.("sessionPersistence");
    if (closed) return;
    if (!persistence) throw Error("\u4F1A\u8BDD\u5386\u53F2\u670D\u52A1\u5C1A\u672A\u5C31\u7EEA");
    let handle;
    try {
      handle = await persistence.open(id, "read");
      let offset = Math.max(await usage.cursor(id) + 1, handle.inheritedEventCount || 0);
      for (; ; ) {
        if (closed) break;
        const result = await handle.read(offset, 500);
        if (!result.events.length) break;
        await usage.ingest(id, result.events, "dsh", handle.inheritedEventCount || 0);
        offset = result.events.at(-1).seq + 1;
      }
    } finally {
      await handle?.close();
    }
  };
  const schedule = (session, event) => {
    const id = String(session.id), task = (tasks.get(id) || Promise.resolve()).then(async () => {
      if (!initialized.has(id)) {
        try {
          await replay(id);
          initialized.add(id);
          usage.observerError(id);
        } catch (error) {
          usage.observerError(id, "\u90E8\u5206\u4F1A\u8BDD\u5386\u53F2\u7528\u91CF\u672A\u8BFB\u5B8C\uFF0C\u6B63\u5728\u91CD\u8BD5");
          throw error;
        }
      }
      if (event && !closed) await usage.ingest(id, [event], "dsh", session.inheritedEventCount || 0, true);
    });
    tasks.set(id, safe(task));
    return task;
  };
  ctx.on("session/event", (session, event) => {
    if (event.seq < (session.inheritedEventCount || 0)) return;
    void safe(schedule(session, event));
  });
  ctx.on("session/flush", async (session) => {
    await tasks.get(String(session.id));
    await usage.flush();
  });
  ctx.on("session/created", (session) => {
    void safe(schedule(session));
  });
  ctx.on("user-questions/request", async (request, next) => {
    const sessionId = String(request.agent?.session?.id || request.agent?.id || ""), id = "question:" + String(request.wait?.callId || Date.now()) + ":" + sessionId;
    void safe(usage.notification({ id, kind: "question", sessionId, time: Date.now(), text: "AI \u6709\u95EE\u9898\u60F3\u8BF7\u4F60\u51B3\u5B9A\u3002", pending: true }));
    try {
      return await next();
    } finally {
      void safe(usage.resolveNotification(id));
    }
  });
  const catchup = () => safe((async () => {
    const p = ctx.get?.("sessionPersistence");
    if (p?.list) for (const item of await p.list()) {
      if (closed) break;
      if (!initialized.has(item.header.id)) await safe(schedule({ id: item.header.id }));
    }
  })());
  const boot = setTimeout(() => {
    void catchup();
  }, 200), retry = setInterval(() => {
    void catchup();
  }, 6e4);
  boot.unref?.();
  retry.unref?.();
  usage.start();
  ctx.effect?.(() => async () => {
    closed = true;
    clearTimeout(boot);
    clearInterval(retry);
    await Promise.allSettled([...tasks.values()]);
    await usage.close();
  });
}
export {
  registerUsage
};

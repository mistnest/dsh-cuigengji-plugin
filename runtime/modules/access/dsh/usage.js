const IMMEDIATE_EVENTS = /* @__PURE__ */ new Set(["assistant/message", "assistant/attempt", "turn/end", "session/title", "approval/asked", "approval/decided", "user-questions/asked", "user-questions/resolved"]);
const CURSOR_STEP_EVENTS = /* @__PURE__ */ new Set(["turn/start", "step/start", "llm/retry-started"]);
function extractUsageSample(data) {
  if (data?.usage) return data.usage;
  const stream = Array.isArray(data?.stream) ? data.stream : data?.stream?.chunks;
  if (Array.isArray(stream)) for (let i = stream.length - 1; i >= 0; i--) {
    const chunk = stream[i]?.chunk ?? stream[i];
    if (chunk?.type === "usage") return chunk.usage;
  }
  return void 0;
}
function slimEvent(event) {
  const type = event?.type, d = event?.data || {};
  let data = {};
  if (type === "session/title") data = { title: d.title };
  else if (CURSOR_STEP_EVENTS.has(type)) data = { turn: d.turn, step: d.step };
  else if (type === "assistant/message" || type === "assistant/attempt") {
    const usage = extractUsageSample(d), route = d.message?.source || d.source;
    data = {
      turn: d.turn,
      step: d.step,
      ...typeof d.usageIdentity === "string" ? { usageIdentity: d.usageIdentity } : {},
      ...usage !== void 0 ? { usage } : {},
      ...route && (route.provider || route.model) ? { message: { source: { provider: route.provider, model: route.model } } } : {}
    };
  } else if (type === "turn/end") data = { turn: d.turn, reason: d.reason };
  else if (type === "approval/asked" || type === "approval/decided" || type === "user-questions/asked" || type === "user-questions/resolved" || type === "user/message") {
    if (typeof d.id === "string") data.id = d.id;
    if (d.outcome !== void 0) data.outcome = d.outcome;
  }
  return { seq: event.seq, time: event.time, type, data, noop: !IMMEDIATE_EVENTS.has(type) && !CURSOR_STEP_EVENTS.has(type) && type !== "user/message" };
}
function registerUsage(ctx, usage) {
  const tasks = /* @__PURE__ */ new Map(), initialized = /* @__PURE__ */ new Set(), buffered = /* @__PURE__ */ new Map();
  let closed = false, catchingUp = null;
  const safe = (task) => task.catch((e) => ctx.logger?.warn?.("cuigengji usage: " + e.message));
  const replay = async (id, background = false) => {
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
        await usage.ingest(id, result.events.map(slimEvent), "dsh", handle.inheritedEventCount || 0, false, { background });
        offset = result.events.at(-1).seq + 1;
      }
    } finally {
      await handle?.close();
    }
  };
  const peekBuffered = (id) => {
    const entry = buffered.get(id);
    if (!entry || !entry.events.length) return null;
    const events = [...entry.events].sort((a, b) => a.seq - b.seq);
    return { inherited: entry.inherited, events, maxSeq: events.at(-1).seq };
  };
  const ackBuffered = (id, maxSeq) => {
    const entry = buffered.get(id);
    if (!entry) return;
    entry.events = entry.events.filter((e) => e.seq > maxSeq);
    if (!entry.events.length) buffered.delete(id);
  };
  const pushBuffered = (id, inherited, slim) => {
    let entry = buffered.get(id);
    if (!entry) {
      entry = { inherited, events: [] };
      buffered.set(id, entry);
    }
    entry.inherited = inherited;
    const last = entry.events.at(-1);
    if (slim.noop && last?.noop && slim.seq >= last.seq) entry.events[entry.events.length - 1] = slim;
    else entry.events.push(slim);
  };
  const schedule = (session, background = false) => {
    const id = String(session.id), inherited = session.inheritedEventCount || 0;
    const task = (tasks.get(id) || Promise.resolve()).then(async () => {
      if (!initialized.has(id)) {
        try {
          await replay(id, background);
          initialized.add(id);
          usage.observerError(id);
        } catch (error) {
          usage.observerError(id, "\u90E8\u5206\u4F1A\u8BDD\u5386\u53F2\u7528\u91CF\u672A\u8BFB\u5B8C\uFF0C\u6B63\u5728\u91CD\u8BD5");
          throw error;
        }
      }
      const pending = peekBuffered(id);
      if (pending && !closed) {
        try {
          await usage.ingest(id, pending.events, "dsh", pending.inherited ?? inherited, true, { background });
          ackBuffered(id, pending.maxSeq);
          usage.observerError(id);
        } catch (error) {
          initialized.delete(id);
          usage.observerError(id, "\u4F1A\u8BDD\u7528\u91CF\u8BB0\u5F55\u6682\u672A\u5199\u76D8\uFF0C\u6B63\u5728\u91CD\u8BD5");
          throw error;
        }
      }
    });
    const guarded = safe(task);
    tasks.set(id, guarded);
    return guarded;
  };
  ctx.on("session/event", (session, event) => {
    const inherited = session.inheritedEventCount || 0;
    if (closed || event.seq < inherited) return;
    const id = String(session.id), slim = slimEvent(event);
    pushBuffered(id, inherited, slim);
    const resolvesNotice = (event.type === "turn/start" || event.type === "user/message") && usage.hasPendingNotification(id);
    if (initialized.has(id) && !IMMEDIATE_EVENTS.has(event.type) && !resolvesNotice) return;
    void schedule(session, false);
  });
  ctx.on("session/flush", async (session) => {
    await tasks.get(String(session.id));
  });
  ctx.on("session/created", (session) => {
    void schedule(session, true);
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
  const catchup = () => {
    if (closed || catchingUp) return catchingUp || Promise.resolve();
    catchingUp = safe((async () => {
      const p = ctx.get?.("sessionPersistence");
      if (!p?.list) return;
      let count = 0;
      for (const item of await p.list()) {
        if (closed) break;
        const id = item?.header?.id;
        if (id && !initialized.has(id)) {
          await schedule({ id }, true);
          if (++count % 8 === 0) await new Promise((resolve) => setImmediate(resolve));
        }
      }
    })()).finally(() => {
      catchingUp = null;
    });
    return catchingUp;
  };
  const boot = setTimeout(() => {
    void catchup();
  }, 200), retry = setInterval(() => {
    void catchup();
  }, 6e4);
  boot.unref?.();
  retry.unref?.();
  usage.start();
  ctx.effect?.(() => async () => {
    const pendingBuffers = [...buffered.entries()];
    buffered.clear();
    for (const [id, entry] of pendingBuffers) if (entry.events.length) await safe(usage.ingest(id, entry.events.sort((a, b) => a.seq - b.seq), "dsh", entry.inherited, true));
    closed = true;
    clearTimeout(boot);
    clearInterval(retry);
    if (catchingUp) await catchingUp;
    await Promise.allSettled([...tasks.values()]);
    await usage.close();
  });
}
export {
  registerUsage
};

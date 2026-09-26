window.__ModuleLoader__.load({id:"dsh-cuigengji",factory:(require)=>{var module={exports:{}};var exports=module.exports;
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.jsx
var index_exports = {};
__export(index_exports, {
  Workbench: () => Workbench,
  apply: () => apply,
  applyWithRPC: () => applyWithRPC,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react = __toESM(require("react"), 1);

// src/client/style.js
var styles = `
.cuigengji { color:var(--dsw-alias-label-primary,inherit); font-family:inherit; font-size:13px; padding:14px; height:100%; overflow:auto; box-sizing:border-box; }
.cuigengji * { box-sizing:border-box; }
.cuigengji h2 { font-size:16px; margin:0 0 12px; }
.cuigengji h3 { font-size:14px; margin:16px 0 8px; }
.cuigengji p { line-height:1.7; }
.cuigengji button,.cuigengji input,.cuigengji select,.cuigengji textarea { font:inherit; color:inherit; border:1px solid var(--dsw-alias-border-l1,#8886); background:var(--dsw-alias-button-floating-fill,transparent); border-radius:var(--dsw-radius-sm,5px); padding:7px 9px; }
.cuigengji button { cursor:pointer; }
.cuigengji button:disabled { opacity:.5; cursor:default; }
.cuigengji button:focus-visible,.cuigengji input:focus-visible,.cuigengji textarea:focus-visible,.cuigengji select:focus-visible { outline:2px solid var(--dsw-focus-ring-color,#7187dc); outline-offset:2px; }
.cuigengji [aria-selected=true],.cuigengji .selected { border-color:var(--dsw-alias-state-business-primary,#7187dc); background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#7187dc) 10%,transparent); }
.cuigengji label { display:grid; gap:5px; margin:10px 0; }
.cuigengji textarea { width:100%; min-height:130px; resize:vertical; line-height:1.85; }
.cuigengji .prose { min-height:360px; }
.cuigengji .row { display:flex; gap:7px; align-items:center; flex-wrap:wrap; margin:8px 0; }
.cuigengji .row>* { min-width:0; }
.cuigengji nav { display:flex; gap:5px; flex-wrap:wrap; border-bottom:1px solid var(--dsw-alias-border-l1,#8886); padding-bottom:10px; margin-bottom:14px; }
.cuigengji .muted { opacity:.7; font-size:12px; }
.cuigengji .notice { padding:10px; border:1px solid var(--dsw-alias-border-l1,#8886); border-left:3px solid var(--dsw-alias-state-business-primary,#7187dc); margin:10px 0; white-space:pre-wrap; }
.cuigengji .error { border-left-color:#c64e42; }
.cuigengji .list { display:grid; gap:5px; max-height:260px; overflow:auto; }
.cuigengji .list button { text-align:left; }
.cuigengji .split { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr)); gap:12px; }
.cuigengji pre { white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; line-height:1.75; max-height:420px; overflow:auto; border:1px solid var(--dsw-alias-border-l1,#8886); padding:10px; }
.cuigengji svg { width:100%; max-height:300px; border:1px solid var(--dsw-alias-border-l1,#8886); border-radius:5px; }
.cuigengji svg text { fill:currentColor; font-size:11px; }
.cuigengji svg line { stroke:var(--dsw-alias-border-l1,#999); stroke-width:2; }
.cuigengji svg circle { fill:var(--dsw-alias-button-floating-fill,#777); stroke:var(--dsw-alias-state-business-primary,#7187dc); stroke-width:2; }
.cuigengji svg g { cursor:pointer; }
.cuigengji summary { cursor:pointer; padding:8px 0; }
.cuigengji .grow { flex:1; }
`;

// src/client/index.jsx
var import_jsx_runtime = require("react/jsx-runtime");
var ID = "dsh-cuigengji";
var array = (value) => Array.isArray(value) ? value : value?.items ?? [];
var message = (error) => error?.message || String(error);
var ask = (label, value = "") => window.prompt(label, value);
var confirm = (label) => window.confirm(label);
async function readChapter(call, novelId, chapterId) {
  const first = await call("chapter.get", { novelId, chapterId, maxChars: 2e5 });
  let next = first.nextStart, content = first.content;
  while (next !== null) {
    const page = await call("chapter.get", { novelId, chapterId, start: next, maxChars: 2e5 });
    if (page.revision !== first.revision) throw new Error("\u8BFB\u53D6\u671F\u95F4\u6B63\u6587\u5DF2\u53D8\u5316\uFF0C\u8BF7\u91CD\u65B0\u8BFB\u53D6\u3002");
    content += page.content;
    next = page.nextStart;
  }
  return { ...first, content };
}
var inject = ["connection", "slots", "sidebarRight", "sidebarRightTabs"];
function apply(ctx) {
  const rpc = async (action, args, sessionId) => {
    const result = await ctx.connection.rpc.call("/cuigengji", "dispatch", { action, args, sessionId });
    if (!result.ok) throw Object.assign(new Error(result.error.message), { code: result.error.code });
    return result.value;
  };
  return applyWithRPC(ctx, rpc);
}
function applyWithRPC(ctx, rpc) {
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: ID,
    kind: "cuigengji",
    keepMounted: true,
    patterns: ["dsh-resource://cuigengji/**"],
    title: () => "\u50AC\u66F4\u59EC"
  }));
  ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
    name: "conversation.session.header.actions",
    id: ID,
    order: 40,
    inject: (sessionId) => ({ openNovel: () => ctx.sidebarRight.openResource(`dsh-resource://cuigengji/${encodeURIComponent(sessionId)}`) })
  }, ({ openNovel }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", onClick: openNovel, title: "\u6253\u5F00\u5C0F\u8BF4\u76EE\u5F55\u3001\u6B63\u6587\u548C\u8BBE\u5B9A", children: "\u50AC\u66F4\u59EC" })));
  ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
    name: "sidebar.right.pane.tab",
    key: ID
  }, (props) => {
    const tab = props.useTabInfo();
    const address = tab.tab.navigation.address;
    const sessionId = decodeURIComponent(address.slice(address.lastIndexOf("/") + 1));
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Workbench, { sessionId, rpc }, sessionId);
  }));
}
function Workbench({ sessionId, rpc }) {
  const [novels, setNovels] = (0, import_react.useState)([]), [binding, setBinding] = (0, import_react.useState)(null);
  const [tab, setTab] = (0, import_react.useState)("chapters"), [error, setError] = (0, import_react.useState)("");
  const [busy, setBusy] = (0, import_react.useState)(false), [tick, setTick] = (0, import_react.useState)(0);
  const call = (0, import_react.useCallback)((action, args = {}) => rpc(action, args, sessionId), [rpc, sessionId]);
  const refresh = (0, import_react.useCallback)(async () => {
    const [books, bound] = await Promise.all([call("novel.list"), call("binding.get")]);
    setNovels(array(books));
    setBinding(bound);
  }, [call]);
  (0, import_react.useEffect)(() => {
    refresh().catch((e) => setError(message(e)));
  }, [refresh]);
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
      await refresh();
      setTick((x) => x + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  };
  const novelId = binding?.novelId;
  const novel = novels.find((n) => n.id === novelId);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "cuigengji", "aria-label": "\u50AC\u66F4\u59EC\u5C0F\u8BF4\u5DE5\u4F5C\u53F0", children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: styles }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: novel?.title || "\u50AC\u66F4\u59EC" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { "aria-label": "\u7ED1\u5B9A\u5C0F\u8BF4", className: "grow", disabled: busy, value: novelId || "", onChange: (e) => e.target.value && run(() => call("binding.set", { novelId: e.target.value })), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u9009\u62E9\u672C\u4F1A\u8BDD\u7684\u5C0F\u8BF4" }),
        novels.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: n.id, children: n.title }, n.id))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        const title = ask("\u5C0F\u8BF4\u540D\u79F0");
        if (title?.trim()) run(async () => {
          const n = await call("novel.create", { title });
          await call("binding.set", { novelId: n.id });
        });
      }, children: "\u65B0\u5EFA\u5C0F\u8BF4" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => run(async () => {
      }), children: "\u5237\u65B0" })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "notice error", role: "alert", children: error }),
    busy && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", className: "muted", children: "\u6B63\u5728\u4FDD\u5B58\u2026" }),
    !novelId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u7ED1\u5B9A\u4E00\u672C\u5C0F\u8BF4\u540E\uFF0C\u5728 DSH \u5BF9\u8BDD\u4E2D\u8BA8\u8BBA\u3001\u5199\u4F5C\u548C\u4FEE\u6539\u3002\u4E0D\u540C\u4F1A\u8BDD\u53EF\u5171\u540C\u4F7F\u7528\u4E00\u672C\u5C0F\u8BF4\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Manage, { ...{ call, run, busy } })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", { "aria-label": "\u5C0F\u8BF4\u529F\u80FD", children: [["chapters", "\u5377\u7AE0\u6B63\u6587"], ["memory", "\u4E16\u754C\u4E0E\u4EBA\u7269"], ["plan", "\u60C5\u8282\u89C4\u5212"], ["context", "\u53C2\u8003\u8D44\u6599"], ["manage", "\u5C0F\u8BF4\u7BA1\u7406"]].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { "aria-selected": tab === id, onClick: () => setTab(id), children: label }, id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
        tab === "chapters" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Chapters, { ...{ call, novelId, tick, run, busy } }),
        tab === "memory" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Memory, { ...{ call, novelId, tick, run, busy } }),
        tab === "plan" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plan, { ...{ call, novelId, tick, run, busy } }),
        tab === "context" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Context, { ...{ call, novelId, tick } }),
        tab === "manage" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Manage, { ...{ call, novelId, novel, run, busy } })
      ] }, novelId)
    ] })
  ] });
}
function Chapters({ call, novelId, tick, run, busy }) {
  const [chapters, setChapters] = (0, import_react.useState)([]), [volumes, setVolumes] = (0, import_react.useState)([]), [id, setId] = (0, import_react.useState)("");
  const [error, setError] = (0, import_react.useState)(""), [deleted, setDeleted] = (0, import_react.useState)(false);
  const refresh = (0, import_react.useCallback)(async () => {
    const [cs, vs] = await Promise.all([call("chapter.list", { novelId, includeDeleted: deleted }), call("volume.list", { novelId })]);
    setChapters(array(cs));
    setVolumes(array(vs));
  }, [call, novelId, deleted]);
  (0, import_react.useEffect)(() => {
    let live = true;
    const load = () => live && refresh().catch((e) => live && setError(message(e)));
    load();
    const timer = setInterval(load, 5e3);
    return () => {
      live = false;
      clearInterval(timer);
    };
  }, [refresh, tick]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        const title = ask("\u65B0\u5377\u540D\u79F0");
        if (title) run(() => call("volume.create", { novelId, title }));
      }, children: "\u65B0\u5EFA\u5377" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        const title = ask("\u7AE0\u8282\u540D\u79F0");
        if (title) run(async () => {
          const ch = await call("chapter.create", { novelId, title, content: "" });
          setId(ch.id);
        });
      }, children: "\u65B0\u5EFA\u7AE0\u8282" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: deleted, onChange: (e) => setDeleted(e.target.checked) }),
        "\u663E\u793A\u5DF2\u5220\u9664"
      ] })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: error }),
    volumes.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { className: "grow", children: v.title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        const title = ask("\u5377\u540D\u79F0", v.title);
        if (title) run(() => call("volume.update", { novelId, volumeId: v.id, title, expectedRevision: v.revision }));
      }, children: "\u6539\u540D" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        const order = ask("\u5377\u6392\u5E8F\u503C\uFF08\u8D8A\u5C0F\u8D8A\u9760\u524D\uFF09", String(v.order));
        if (order !== null) run(() => call("volume.update", { novelId, volumeId: v.id, order: Number(order), expectedRevision: v.revision }));
      }, children: "\u6392\u5E8F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        if (confirm(`\u5220\u9664\u5377\u201C${v.title}\u201D\uFF1F\u5377\u5185\u7AE0\u8282\u4FDD\u7559\u3002`)) run(() => call("volume.delete", { novelId, volumeId: v.id, expectedRevision: v.revision, confirm: true, chapterPolicy: "detach" }));
      }, children: "\u5220\u9664\u5377" })
    ] }, v.id)),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "list", "aria-label": "\u7AE0\u8282\u76EE\u5F55", children: chapters.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: id === c.id ? "selected" : "", onClick: () => {
      setId(c.id);
      run(() => call("binding.set", { novelId, chapterId: c.id }));
    }, children: [
      c.deleted ? "\u5DF2\u5220\u9664 \xB7 " : "",
      volumes.find((v) => v.id === c.volumeId)?.title ? `${volumes.find((v) => v.id === c.volumeId).title} / ` : "",
      c.title,
      " ",
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "muted", children: [
        "\xB7 \u7248\u672C ",
        c.revision
      ] })
    ] }, c.id)) }),
    !chapters.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "muted", children: "\u8FD8\u6CA1\u6709\u7AE0\u8282\u3002\u53EF\u4EE5\u65B0\u5EFA\uFF0C\u6216\u5728\u5BF9\u8BDD\u4E2D\u8BA9 Agent \u5F00\u59CB\u5199\u4F5C\u3002" }),
    id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChapterEditor, { ...{ call, novelId, tick, run, busy, volumes }, chapterId: id, latest: chapters.find((c) => c.id === id) }, id)
  ] });
}
function ChapterEditor({ call, novelId, chapterId, latest, tick, run, busy, volumes }) {
  const [base, setBase] = (0, import_react.useState)(null), [content, setContent] = (0, import_react.useState)(""), [title, setTitle] = (0, import_react.useState)("");
  const [volumeId, setVolumeId] = (0, import_react.useState)(""), [error, setError] = (0, import_react.useState)(""), [history, setHistory] = (0, import_react.useState)([]), [comparison, setComparison] = (0, import_react.useState)(null);
  const key = `cuigengji:draft:${novelId}:${chapterId}`;
  const dirty = base && (content !== base.content || title !== base.title || volumeId !== (base.volumeId || ""));
  const install = (c) => {
    setBase(c);
    setContent(c.content);
    setTitle(c.title);
    setVolumeId(c.volumeId || "");
  };
  (0, import_react.useEffect)(() => {
    let live = true;
    readChapter(call, novelId, chapterId).then((c) => {
      if (!live) return;
      install(c);
      try {
        const draft = JSON.parse(localStorage.getItem(key));
        if (draft) {
          setBase(draft.base);
          setContent(draft.content);
          setTitle(draft.title);
          setVolumeId(draft.volumeId);
        }
      } catch {
      }
    }).catch((e) => live && setError(message(e)));
    return () => {
      live = false;
    };
  }, [call, novelId, chapterId, key]);
  (0, import_react.useEffect)(() => {
    if (!base) return;
    try {
      if (dirty) localStorage.setItem(key, JSON.stringify({ base, content, title, volumeId }));
      else localStorage.removeItem(key);
    } catch {
      setError("\u6D4F\u89C8\u5668\u8349\u7A3F\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BF7\u53CA\u65F6\u4FDD\u5B58\u6B63\u6587\u3002");
    }
  }, [base, content, title, volumeId, dirty, key]);
  (0, import_react.useEffect)(() => {
    const warn = (e) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  (0, import_react.useEffect)(() => {
    call("chapter.history", { novelId, chapterId, includeContent: true }).then((h) => setHistory(array(h))).catch((e) => setError(message(e)));
  }, [call, novelId, chapterId, tick]);
  if (!base) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "status", children: error || "\u8BFB\u53D6\u6B63\u6587\u2026" });
  const conflict = latest && latest.revision !== base.revision;
  const reload = async () => {
    const c = await readChapter(call, novelId, chapterId);
    install(c);
    setComparison(null);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u7F16\u8F91\u6B63\u6587" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: error }),
    conflict && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "notice", children: [
      "\u5176\u4ED6\u4F1A\u8BDD\u5DF2\u66F4\u65B0\u672C\u7AE0\u3002\u4F60\u7684\u8349\u7A3F\u4ECD\u7136\u4FDD\u7559\uFF1B\u8BF7\u8BFB\u53D6\u6700\u65B0\u7248\u672C\u8FDB\u884C\u6BD4\u8F83\uFF0C\u518D\u51B3\u5B9A\u5408\u5E76\u5185\u5BB9\u3002",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => run(async () => setComparison(await readChapter(call, novelId, chapterId))), children: "\u67E5\u770B\u6700\u65B0\u6B63\u6587" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u7AE0\u8282\u540D",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { disabled: busy, value: title, onChange: (e) => setTitle(e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u6240\u5C5E\u5377",
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { disabled: busy, value: volumeId, onChange: (e) => setVolumeId(e.target.value), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u672A\u5206\u5377" }),
        volumes.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: v.id, children: v.title }, v.id))
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u6B63\u6587",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { disabled: busy, className: "prose", value: content, onChange: (e) => setContent(e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { className: "muted", children: [
      content.length,
      " \u5B57\u7B26 \xB7 \u57FA\u51C6\u7248\u672C ",
      base.revision,
      " \xB7 ",
      dirty ? "\u8349\u7A3F\u5C1A\u672A\u5199\u5165\u5C0F\u8BF4" : "\u5DF2\u4FDD\u5B58"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || !dirty || !!base.deleted, onClick: () => run(async () => {
        const c = await call("chapter.update", { novelId, chapterId, content, title, volumeId: volumeId || null, expectedRevision: base.revision, expectedHash: base.contentHash, reason: "\u4F5C\u8005\u624B\u52A8\u7F16\u8F91" });
        install({ ...c, content });
      }), children: "\u4FDD\u5B58\u6B63\u6587" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        if (!dirty || confirm("\u4E22\u5F03\u672C\u5730\u8349\u7A3F\uFF0C\u52A0\u8F7D\u6700\u65B0\u6B63\u6587\uFF1F")) run(reload);
      }, children: "\u91CD\u65B0\u8BFB\u53D6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || dirty, onClick: () => {
        const order = ask("\u7AE0\u8282\u6392\u5E8F\u503C\uFF08\u8D8A\u5C0F\u8D8A\u9760\u524D\uFF09", String(base.order));
        if (order !== null) run(async () => {
          await call("chapter.update", { novelId, chapterId, order: Number(order), expectedRevision: base.revision });
          await reload();
        });
      }, children: "\u7AE0\u8282\u6392\u5E8F" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || !!base.deleted, onClick: () => {
        if (confirm("\u5C06\u672C\u7AE0\u79FB\u5165\u5DF2\u5220\u9664\uFF1F\u53EF\u4EE5\u901A\u8FC7\u5386\u53F2\u7248\u672C\u6062\u590D\u3002")) run(async () => {
          await call("chapter.delete", { novelId, chapterId, expectedRevision: base.revision, confirm: true });
          await reload();
        });
      }, children: "\u5220\u9664\u7AE0\u8282" })
    ] }),
    comparison && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u7248\u672C\u6BD4\u8F83" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "split", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: "\u5F53\u524D\u8349\u7A3F" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: content })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("strong", { children: [
            "\u7248\u672C ",
            comparison.revision
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: comparison.content })
        ] })
      ] }),
      !comparison.deleted && comparison.revision === latest?.revision && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        if (confirm("\u4FDD\u7559\u5F53\u524D\u8349\u7A3F\uFF0C\u4EE5\u6B64\u7248\u672C\u4F5C\u4E3A\u5408\u5E76\u57FA\u51C6\uFF1F\u8BF7\u5148\u786E\u8BA4\u5DF2\u624B\u52A8\u5408\u5E76\u6240\u9700\u5185\u5BB9\u3002")) setBase(comparison);
      }, children: "\u5DF2\u5408\u5E76\uFF0C\u66F4\u65B0\u4FDD\u5B58\u57FA\u51C6" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: [
        "\u4FEE\u6539\u5386\u53F2\uFF08",
        history.length,
        "\uFF09"
      ] }),
      history.map((h) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "grow", children: [
          "\u7248\u672C ",
          h.revision,
          " \xB7 ",
          h.reason || h.updatedAt || h.createdAt || ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setComparison(h), children: "\u6BD4\u8F83" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          if (confirm(`\u6062\u590D\u7248\u672C ${h.revision}\uFF1F\u5F53\u524D\u8349\u7A3F\u5C06\u88AB\u66FF\u6362\uFF0C\u5DF2\u4FDD\u5B58\u7684\u5386\u53F2\u4ECD\u4FDD\u7559\u3002`)) run(async () => {
            await call("chapter.restore", { novelId, chapterId, targetRevision: h.revision, expectedRevision: base.revision });
            await reload();
          });
        }, children: "\u6062\u590D" })
      ] }, h.revision))
    ] })
  ] });
}
function Memory({ call, novelId, tick, run, busy }) {
  const [nodes, setNodes] = (0, import_react.useState)([]), [edges, setEdges] = (0, import_react.useState)([]), [query, setQuery] = (0, import_react.useState)(""), [type, setType] = (0, import_react.useState)("");
  const [node, setNode] = (0, import_react.useState)(null), [edge, setEdge] = (0, import_react.useState)(null), [error, setError] = (0, import_react.useState)("");
  const [view, setView] = (0, import_react.useState)("list");
  const load = (0, import_react.useCallback)(async () => {
    const [ns, es] = await Promise.all([call("graph.list", { novelId }), call("edge.list", { novelId })]);
    setNodes(array(ns));
    setEdges(array(es));
  }, [call, novelId]);
  (0, import_react.useEffect)(() => {
    load().catch((e) => setError(message(e)));
    const timer = setInterval(() => load().catch((e) => setError(message(e))), 5e3);
    return () => clearInterval(timer);
  }, [load, tick]);
  const select = (n) => run(async () => {
    setEdge(null);
    setNode(await call("graph.get", { novelId, nodeId: n.id }));
  });
  const visible = nodes.filter((n) => (!type || n.type === type) && `${n.name} ${n.summary} ${(n.aliases || []).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { className: "grow", "aria-label": "\u641C\u7D22\u8BBE\u5B9A", placeholder: "\u641C\u7D22\u540D\u79F0\u3001\u6458\u8981\u6216\u522B\u540D", value: query, onChange: (e) => setQuery(e.target.value) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { "aria-label": "\u8282\u70B9\u7C7B\u578B", value: type, onChange: (e) => setType(e.target.value), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "", children: "\u5168\u90E8\u7C7B\u578B" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "character_card", children: "\u89D2\u8272\u5361" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "world_book", children: "\u4E16\u754C\u4E66" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "world_entry", children: "\u4E16\u754C\u6761\u76EE" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setView(view === "list" ? "graph" : "list"), children: view === "list" ? "\u67E5\u770B\u5173\u7CFB\u56FE" : "\u67E5\u770B\u5217\u8868" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        setEdge(null);
        setNode({ type: type || "character_card", name: "", summary: "", content: "", factType: "fact", status: "active" });
      }, children: "\u65B0\u5EFA\u8282\u70B9" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || nodes.length < 2, onClick: () => {
        setNode(null);
        setEdge({ from: nodes[0]?.id, to: nodes[1]?.id, name: "", content: "" });
      }, children: "\u65B0\u5EFA\u5173\u7CFB" })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: error }),
    view === "graph" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Graph, { nodes: visible.slice(0, 40), edges, select }),
    view === "graph" && visible.length > 40 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "muted", children: "\u56FE\u4E2D\u663E\u793A\u524D 40 \u4E2A\u5339\u914D\u8282\u70B9\uFF1B\u641C\u7D22\u53EF\u7F29\u5C0F\u8303\u56F4\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "list", children: visible.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: node?.id === n.id ? "selected" : "", onClick: () => select(n), children: [
      n.name,
      n.status === "stale" ? " \xB7 \u5F85\u6838\u5BF9" : "",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "muted", children: n.summary })
    ] }, n.id)) }),
    !nodes.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: "\u8FD8\u6CA1\u6709\u4E16\u754C\u4E66\u6216\u89D2\u8272\u5361\u3002\u65B0\u5EFA\u8282\u70B9\uFF0C\u6216\u8BA9 Agent \u4ECE\u8BBE\u5B9A\u8BA8\u8BBA\u4E2D\u6574\u7406\u3002" }),
    node && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(NodeEditor, { ...{ call, novelId, run, busy }, initial: node, latest: nodes.find((n) => n.id === node.id), saved: setNode }, node.id || "new"),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: [
        "\u5173\u7CFB\uFF08",
        edges.length,
        "\uFF09"
      ] }),
      edges.map((e) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "grow", children: [
          nodes.find((n) => n.id === e.from)?.name,
          " \u2192 ",
          nodes.find((n) => n.id === e.to)?.name,
          "\uFF1A",
          e.name
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          setNode(null);
          setEdge(e);
        }, children: "\u7F16\u8F91" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
          if (confirm("\u5220\u9664\u8FD9\u6761\u5173\u7CFB\uFF1F")) run(() => call("edge.delete", { novelId, edgeId: e.id, expectedRevision: e.revision, confirm: true }));
        }, children: "\u5220\u9664" })
      ] }, e.id))
    ] }),
    edge && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EdgeEditor, { ...{ call, novelId, nodes, run, busy }, initial: edge, saved: setEdge }, edge.id || "new")
  ] });
}
function Graph({ nodes, edges, select }) {
  const positions = new Map(nodes.map((n, i) => [n.id, { x: 230 + 175 * Math.cos(2 * Math.PI * i / Math.max(1, nodes.length)), y: 150 + 105 * Math.sin(2 * Math.PI * i / Math.max(1, nodes.length)) }]));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("svg", { viewBox: "0 0 460 300", role: "img", "aria-label": "\u4E16\u754C\u4E66\u4E0E\u89D2\u8272\u5173\u7CFB\u56FE", children: [
    edges.filter((e) => positions.has(e.from) && positions.has(e.to)).map((e) => {
      const a = positions.get(e.from), b = positions.get(e.to);
      return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("line", { x1: a.x, y1: a.y, x2: b.x, y2: b.y, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("title", { children: e.name }) }, e.id);
    }),
    nodes.map((n) => {
      const p = positions.get(n.id);
      return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("g", { role: "button", tabIndex: 0, "aria-label": n.name, onClick: () => select(n), onKeyDown: (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select(n);
        }
      }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("circle", { cx: p.x, cy: p.y, r: "9" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("text", { x: p.x, y: p.y + 24, textAnchor: "middle", children: n.name.length > 10 ? n.name.slice(0, 10) + "\u2026" : n.name }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("title", { children: [
          n.name,
          "\uFF1A",
          n.summary
        ] })
      ] }, n.id);
    })
  ] });
}
function NodeEditor({ call, novelId, run, busy, initial, latest, saved }) {
  const [draft, setDraft] = (0, import_react.useState)(initial), [sourceText, setSourceText] = (0, import_react.useState)(JSON.stringify(initial.sources || [], null, 2));
  (0, import_react.useEffect)(() => {
    setDraft(initial);
    setSourceText(JSON.stringify(initial.sources || [], null, 2));
  }, [initial]);
  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: draft.id ? "\u7F16\u8F91\u8282\u70B9" : "\u65B0\u5EFA\u8282\u70B9" }),
    latest && latest.revision !== draft.revision && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "notice", children: "\u8282\u70B9\u5DF2\u88AB\u5176\u4ED6\u4F1A\u8BDD\u66F4\u65B0\u3002\u4FDD\u5B58\u5C06\u68C0\u67E5\u7248\u672C\uFF1B\u8BF7\u91CD\u65B0\u9009\u62E9\u8282\u70B9\uFF0C\u8BFB\u53D6\u6700\u65B0\u8D44\u6599\u540E\u5408\u5E76\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u7C7B\u578B",
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: draft.type, onChange: (e) => set("type", e.target.value), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "character_card", children: "\u89D2\u8272\u5361" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "world_book", children: "\u4E16\u754C\u4E66" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "world_entry", children: "\u4E16\u754C\u6761\u76EE" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u540D\u79F0",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: draft.name, onChange: (e) => set("name", e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u6458\u8981",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: draft.summary || "", onChange: (e) => set("summary", e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u5B8C\u6574\u6B63\u6587",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { className: "prose", value: draft.content || "", onChange: (e) => set("content", e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "split", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u6027\u8D28",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: draft.factType || "fact", onChange: (e) => set("factType", e.target.value), children: [["fact", "\u5BA2\u89C2\u4E8B\u5B9E"], ["belief", "\u4EBA\u7269\u8BA4\u77E5"], ["misunderstanding", "\u4EBA\u7269\u8BEF\u89E3"], ["unconfirmed", "\u672A\u786E\u8BA4"], ["plan", "\u672A\u6765\u8BA1\u5212"]].map(([v, l]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: v, children: l }, v)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u72B6\u6001",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: draft.status || "active", onChange: (e) => set("status", e.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "active", children: "\u6709\u6548" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "stale", children: "\u5F85\u6838\u5BF9" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "unconfirmed", children: "\u672A\u786E\u8BA4" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "retired", children: "\u5DF2\u5931\u6548" })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u522B\u540D\uFF08\u9017\u53F7\u5206\u9694\uFF09",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: (draft.aliases || []).join(","), onChange: (e) => set("aliases", e.target.value.split(",").map((s) => s.trim()).filter(Boolean)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("summary", { children: "\u6765\u6E90\u4E0E\u4FE1\u606F\u8FB9\u754C" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u77E5\u60C5\u89D2\u8272 ID\uFF08\u9017\u53F7\u5206\u9694\uFF09",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: (draft.knownBy || []).join(","), onChange: (e) => set("knownBy", e.target.value.split(",").map((s) => s.trim()).filter(Boolean)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u6545\u4E8B\u65F6\u95F4",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: draft.storyTime || "", onChange: (e) => set("storyTime", e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
        "\u6765\u6E90\u7AE0\u8282\u4E0E\u7248\u672C\uFF08JSON \u6570\u7EC4\uFF09",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: sourceText, onChange: (e) => setSourceText(e.target.value) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || !draft.name.trim(), onClick: () => run(async () => {
        const sources = JSON.parse(sourceText);
        const n = await call(draft.id ? "graph.update" : "graph.create", { ...draft, novelId, nodeId: draft.id, expectedRevision: draft.revision, sources });
        saved(n);
      }), children: "\u4FDD\u5B58\u8282\u70B9" }),
      draft.id && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        if (confirm(`\u5220\u9664\u201C${draft.name}\u201D\u53CA\u5176\u8FDE\u63A5\u5173\u7CFB\uFF1F`)) run(async () => {
          await call("graph.delete", { novelId, nodeId: draft.id, expectedRevision: draft.revision, confirm: true });
          saved(null);
        });
      }, children: "\u5220\u9664\u8282\u70B9" })
    ] })
  ] });
}
function EdgeEditor({ call, novelId, nodes, run, busy, initial, saved }) {
  const [draft, setDraft] = (0, import_react.useState)(initial);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u7F16\u8F91\u5173\u7CFB" }),
    [["from", "\u8D77\u70B9"], ["to", "\u7EC8\u70B9"]].map(([key, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      label,
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { value: draft[key], onChange: (e) => setDraft({ ...draft, [key]: e.target.value }), children: nodes.map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: n.id, children: n.name }, n.id)) })
    ] }, key)),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u5173\u7CFB\u540D\u79F0",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { value: draft.name || "", onChange: (e) => setDraft({ ...draft, name: e.target.value }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u8BF4\u660E",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { value: draft.content || "", onChange: (e) => setDraft({ ...draft, content: e.target.value }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || !draft.name.trim(), onClick: () => run(async () => saved(await call(draft.id ? "edge.update" : "edge.create", { ...draft, novelId, edgeId: draft.id, expectedRevision: draft.revision }))), children: "\u4FDD\u5B58\u5173\u7CFB" })
  ] });
}
function Plan({ call, novelId, tick, run, busy }) {
  const [plan, setPlan] = (0, import_react.useState)(null), [draft, setDraft] = (0, import_react.useState)(""), [error, setError] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    call("plan.get", { novelId }).then((p) => {
      setPlan(p);
      setDraft(p?.content || "");
    }).catch((e) => setError(message(e)));
  }, [call, novelId]);
  const dirty = draft !== (plan?.content || "");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u4F5C\u8005\u7684\u60C5\u8282\u610F\u56FE" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "muted", children: "\u5728\u5BF9\u8BDD\u4E2D\u8BA8\u8BBA\u5927\u65B9\u5411\uFF1B\u786E\u8BA4\u540E\u7684\u89C4\u5212\u4F1A\u8FDB\u5165\u5199\u4F5C\u4E0A\u4E0B\u6587\u3002\u4FEE\u6539\u89C4\u5212\u540E\u9700\u8981\u91CD\u65B0\u786E\u8BA4\u3002" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: error }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u60C5\u8282\u89C4\u5212",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", { disabled: busy, className: "prose", value: draft, onChange: (e) => setDraft(e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
      plan?.approved ? "\u4F5C\u8005\u5DF2\u786E\u8BA4" : "\u5C1A\u672A\u786E\u8BA4",
      plan ? ` \xB7 \u7248\u672C ${plan.revision}` : ""
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || !draft.trim() || !dirty, onClick: () => run(async () => setPlan(await call("plan.set", { novelId, content: draft, expectedRevision: plan?.revision }))), children: "\u4FDD\u5B58\u89C4\u5212" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy || !plan || dirty || plan.approved, onClick: () => run(async () => setPlan(await call("plan.approve", { novelId, expectedRevision: plan.revision }))), children: "\u786E\u8BA4\u6B64\u7248\u60C5\u8282" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        if (!dirty || confirm("\u4E22\u5F03\u672A\u4FDD\u5B58\u7684\u89C4\u5212\uFF0C\u8BFB\u53D6\u6700\u65B0\u7248\u672C\uFF1F")) run(async () => {
          const p = await call("plan.get", { novelId });
          setPlan(p);
          setDraft(p?.content || "");
        });
      }, children: "\u8BFB\u53D6\u6700\u65B0" })
    ] })
  ] });
}
function Context({ call, novelId, tick }) {
  const [value, setValue] = (0, import_react.useState)(null), [error, setError] = (0, import_react.useState)("");
  (0, import_react.useEffect)(() => {
    call("context.get", { novelId }).then(setValue).catch((e) => setError(message(e)));
  }, [call, novelId, tick]);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5199\u4F5C\u53C2\u8003\u8D44\u6599" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "muted", children: "\u8FD9\u662F\u6309\u5F53\u524D\u7ED1\u5B9A\u7AE0\u8282\u7EC4\u88C5\u7684\u8D44\u6599\u9884\u89C8\uFF1BAgent \u8FD8\u53EF\u4EE5\u6309\u9700\u8BFB\u53D6\u66F4\u591A\u539F\u6587\u3002" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { role: "alert", children: error }),
    value && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", { children: [
        "\u5DF2\u4F7F\u7528 ",
        value.usedChars,
        " / ",
        value.maxChars,
        " \u5B57\u7B26\uFF0C\u7701\u7565 ",
        value.omitted.length,
        " \u9879\u3002"
      ] }),
      value.staleMemory.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "notice", children: [
        "\u4EE5\u4E0B\u8BB0\u5FC6\u7684\u6765\u6E90\u6B63\u6587\u5DF2\u4FEE\u6539\uFF0C\u9700\u8981\u6838\u5BF9\uFF1A",
        value.staleMemory.map((n) => n.name).join("\u3001")
      ] }),
      value.items.map((item, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("details", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("summary", { children: [
          item.title || item.kind,
          " \xB7 \u7248\u672C ",
          item.revision,
          item.truncated ? " \xB7 \u5DF2\u622A\u65AD" : ""
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("pre", { children: item.content })
      ] }, `${item.id}:${i}`))
    ] })
  ] });
}
function Manage({ call, novelId, novel, run, busy }) {
  const [preview, setPreview] = (0, import_react.useState)(null);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u5C0F\u8BF4\u7BA1\u7406" }),
    novelId && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => {
        const title = ask("\u5C0F\u8BF4\u540D\u79F0", novel?.title || "");
        if (title) run(async () => {
          const n = await call("novel.get", { novelId });
          await call("novel.update", { novelId, title, expectedRevision: n.revision });
        });
      }, children: "\u91CD\u547D\u540D\u5C0F\u8BF4" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => run(async () => {
        const data = await call("novel.export", { novelId });
        const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `${novel?.title || "novel"}.cuigengji.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 1e3);
      }), children: "\u5BFC\u51FA\u542B\u5386\u53F2\u7684\u5907\u4EFD" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
      "\u5BFC\u5165 cuigengji \u5907\u4EFD",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "file", accept: ".json,application/json", onChange: (e) => {
        const f = e.target.files?.[0];
        setPreview(null);
        if (f) run(async () => {
          const data = JSON.parse(await f.text());
          if (data.format !== "cuigengji" || !data.novel) throw new Error("\u4E0D\u662F cuigengji \u5907\u4EFD\u6587\u4EF6");
          setPreview(data);
        });
      } })
    ] }),
    preview && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "notice", children: [
      preview.novel.title,
      " \xB7 ",
      Object.keys(preview.novel.chapters || {}).length,
      " \u7AE0 \xB7 ",
      Object.keys(preview.novel.nodes || {}).length,
      " \u4E2A\u8BBE\u5B9A\u8282\u70B9",
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "row", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => run(async () => {
        const n = await call("novel.import", { backup: preview });
        await call("binding.set", { novelId: n.id });
        setPreview(null);
      }), children: "\u786E\u8BA4\u5BFC\u5165" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "muted", children: "\u540C ID \u4E14\u5185\u5BB9\u4E0D\u540C\u7684\u5C0F\u8BF4\u4E0D\u4F1A\u88AB\u5BFC\u5165\u8986\u76D6\u3002\u539F\u4F5C\u54C1\u548C\u5907\u4EFD\u6587\u4EF6\u4FDD\u7559\u3002" })
  ] });
}
return module.exports;}});

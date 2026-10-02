window.__ModuleLoader__.load({id:"dsh-cuigengji",factory:(require)=>{var module={exports:{}};var exports=module.exports;
"use strict";
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
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
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

// src/client/index.tsx
var index_exports = {};
__export(index_exports, {
  Workbench: () => Workbench,
  apply: () => apply,
  applyWithRPC: () => applyWithRPC,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react26 = require("react");

// src/client/shared/preferences.tsx
var import_react = require("react");

// package.json
var package_default = {
  name: "dsh-cuigengji",
  version: "0.3.12",
  description: "\u50AC\u66F4\u59EC\uFF1A\u7ED9\u5927\u80A5\u9C7C\u4E00\u4E2A\u5C0F\u8BF4\u5DE5\u4F5C\u53F0\uFF0C\u4E00\u8D77\u5199\u6B63\u6587\u3001\u8BA8\u8BBA\u60C5\u8282\u3001\u6574\u7406\u4EBA\u7269\u4E0E\u4E16\u754C\u8BBE\u5B9A\u3002",
  type: "module",
  main: "runtime/index.js",
  exports: {
    ".": "./runtime/index.js",
    "./client": "./lib/client.js",
    "./core": "./runtime/core/store.js",
    "./package.json": "./package.json"
  },
  files: [
    "src",
    "lib",
    "skills",
    "cordis.patch.yml",
    "README.md",
    "docs",
    "runtime"
  ],
  dsh: {
    bundle: {
      patch: "./cordis.patch.yml"
    },
    client: {
      platform: "web",
      inject: [
        "@deepseek-ai/dsh-client-connection",
        "@deepseek-ai/dsh-client-locale",
        "@deepseek-ai/dsh-client-ui-sidebar-right",
        "@deepseek-ai/dsh-client-ui-session",
        "@deepseek-ai/dsh-client-ui-sidebar",
        "@deepseek-ai/dsh-client-ui-workspace"
      ]
    }
  },
  scripts: {
    build: "node scripts/build.mjs",
    test: "node --test tests/*.test.js",
    "test:rpc": "node scripts/rpc-smoke.mjs",
    "test:rpc-flow": "node scripts/rpc-flow.mjs",
    "test:live": "node scripts/live-smoke.mjs",
    prepack: "npm run typecheck && npm run build",
    typecheck: "tsc --noEmit",
    "test:ui": "node tests/ui-smoke.mjs",
    "preview:workbench": "node scripts/preview-workbench.mjs",
    "test:layout": "node tests/ui-layout.mjs",
    "test:controls": "node tests/ui-controls.mjs",
    "test:graph": "node tests/ui-graph.mjs",
    "test:pages": "node tests/ui-pages.mjs",
    "test:directory": "node tests/ui-directory.mjs",
    "test:presets": "node tests/ui-presets.mjs"
  },
  engines: {
    node: ">=24",
    dsh: "0.2.0-rc.2"
  },
  dependencies: {
    "@modelcontextprotocol/sdk": "1.29.0",
    zod: "4.4.3"
  },
  peerDependencies: {
    "@deepseek-ai/cordis": "~4.0.4",
    "@deepseek-ai/dsh-tools": "0.2.0-rc.2",
    "@deepseek-ai/schemastery": "~3.18.4"
  },
  devDependencies: {
    "@deepseek-ai/dsh": "0.2.0-rc.2",
    "@deepseek-ai/dsh-client-connection": "0.2.0-rc.2",
    "@deepseek-ai/dsh-client-ui-sidebar-right": "0.2.0-rc.2",
    "@deepseek-ai/dsh-mcp-client": "0.2.0-rc.2",
    "@deepseek-ai/dsh-skill": "0.2.0-rc.2",
    "@deepseek-ai/dsh-system-prompt": "0.2.0-rc.2",
    "@playwright/test": "^1.55.0",
    "@types/react": "^18.3.31",
    "@types/react-dom": "^18.3.7",
    esbuild: "^0.25.0",
    react: "^18.3.1",
    "react-dom": "^18.3.1",
    typescript: "^7.0.2",
    "@types/node": "^24.0.0"
  },
  license: "MIT",
  repository: {
    type: "git",
    url: "git+https://github.com/mistnest/dsh-cuigengji-plugin.git"
  },
  homepage: "https://github.com/mistnest/dsh-cuigengji-plugin#readme",
  bugs: {
    url: "https://github.com/mistnest/dsh-cuigengji-plugin/issues"
  },
  keywords: [
    "dsh",
    "deepseek-harness",
    "novel-writing",
    "writing-assistant"
  ]
};

// src/client/shared/preferences.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var defaults = { fontSize: 18, leading: 1.95, directory: true, planningView: "canvas", memoryView: "list", motion: "system" };
var key = "cuigengji:workbench:preferences:v1";
function read() {
  try {
    const p = JSON.parse(localStorage.getItem(key) || "{}");
    return {
      fontSize: [16, 18, 20, 22].includes(p.fontSize) ? p.fontSize : defaults.fontSize,
      leading: [1.7, 1.95, 2.2].includes(p.leading) ? p.leading : defaults.leading,
      directory: typeof p.directory === "boolean" ? p.directory : defaults.directory,
      planningView: p.planningView === "list" ? "list" : "canvas",
      memoryView: p.memoryView === "canvas" ? "canvas" : "list",
      motion: p.motion === "reduce" ? "reduce" : "system"
    };
  } catch {
    return defaults;
  }
}
var Context = (0, import_react.createContext)({ preferences: defaults, update: (_) => {
}, error: "" });
var useWorkbenchPreferences = () => (0, import_react.useContext)(Context);
function PreferencesProvider({ children }) {
  const [preferences, set] = (0, import_react.useState)(read), [error, setError] = (0, import_react.useState)("");
  const update = (next) => set((previous) => {
    const value = { ...previous, ...next };
    try {
      localStorage.setItem(key, JSON.stringify(value));
      setError("");
    } catch {
      setError("\u5F53\u524D\u6D4F\u89C8\u5668\u65E0\u6CD5\u4FDD\u5B58\u504F\u597D\uFF0C\u672C\u6B21\u4F1A\u8BDD\u4ECD\u7136\u751F\u6548\u3002");
    }
    return value;
  });
  (0, import_react.useEffect)(() => {
    const sync = (e) => {
      if (e.key === key) set(read());
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Context.Provider, { value: { preferences, update, error }, children });
}
function Modal({ title, close, children }) {
  const ref = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => {
      previous?.focus();
    };
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dialog", { className: "utility-modal", ref, "aria-label": title, onCancel: (e) => {
    e.preventDefault();
    close();
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { className: "utility-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", "aria-label": `\u5173\u95ED${title}`, onClick: close, children: "\xD7" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "utility-content", children })
  ] });
}
function PreferencesDialog({ close }) {
  const { preferences: p, update, error } = useWorkbenchPreferences();
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, { title: "\u8BBE\u7F6E", close, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "preference-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u6B63\u6587\u9605\u8BFB" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "split", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u5B57\u53F7",
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", { "aria-label": "\u9ED8\u8BA4\u6B63\u6587\u5B57\u53F7", value: p.fontSize, onChange: (e) => update({ fontSize: Number(e.target.value) }), children: [16, 18, 20, 22].map((n) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: n, children: n }, n)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { children: [
          "\u884C\u8DDD",
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { "aria-label": "\u6B63\u6587\u884C\u8DDD", value: p.leading, onChange: (e) => update({ leading: Number(e.target.value) }), children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: 1.7, children: "\u7D27\u51D1" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: 1.95, children: "\u9002\u4E2D" }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: 2.2, children: "\u5BBD\u677E" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "reading-preview", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { children: "\u9605\u8BFB\u9884\u89C8" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { style: { fontSize: p.fontSize, lineHeight: p.leading }, children: "\u96E8\u505C\u4EE5\u540E\uFF0C\u8857\u9053\u91CD\u65B0\u5B89\u9759\u4E0B\u6765\u3002\u7A97\u8FB9\u7684\u706F\u4ECD\u4EAE\u7740\uFF0C\u6545\u4E8B\u8FD8\u5728\u7EE7\u7EED\u3002" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { className: "preference-section", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", { children: "\u6253\u5F00\u5DE5\u4F5C\u53F0\u65F6" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "preference-row", children: [
        "\u9ED8\u8BA4\u5C55\u5F00\u76EE\u5F55",
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", { type: "checkbox", checked: p.directory, onChange: (e) => update({ directory: e.target.checked }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "preference-row", children: [
        "\u89C4\u5212\u9ED8\u8BA4\u89C6\u56FE",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: p.planningView, onChange: (e) => update({ planningView: e.target.value }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "canvas", children: "\u6D41\u7A0B\u56FE" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "list", children: "\u5217\u8868" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "preference-row", children: [
        "\u8BBE\u5B9A\u9ED8\u8BA4\u89C6\u56FE",
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: p.memoryView, onChange: (e) => update({ memoryView: e.target.value }), children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "list", children: "\u5217\u8868" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "canvas", children: "\u5173\u7CFB\u56FE" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "muted", children: "\u4E0B\u6B21\u8FDB\u5165\u5BF9\u5E94\u9875\u9762\u65F6\u751F\u6548\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("section", { className: "preference-section", children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", { className: "preference-row", children: [
      "\u52A8\u753B\u6548\u679C",
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", { value: p.motion, onChange: (e) => update({ motion: e.target.value }), children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "system", children: "\u8DDF\u968F\u7CFB\u7EDF" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: "reduce", children: "\u51CF\u5C11\u52A8\u6001\u6548\u679C" })
      ] })
    ] }) }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("footer", { className: "utility-footer", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => update(defaults), children: "\u6062\u590D\u9ED8\u8BA4\u8BBE\u7F6E" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("small", { role: "status", children: error || "\u504F\u597D\u81EA\u52A8\u4FDD\u5B58\u5728\u6B64\u6D4F\u89C8\u5668" })
    ] })
  ] });
}
function AboutDialog({ close }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Modal, { title: "\u5173\u4E8E\u50AC\u66F4\u59EC", close, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "about-identity", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", { children: "\u50AC\u66F4\u59EC" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "muted", children: package_default.version })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "about-intro", children: "\u4E0E\u4F60\u548C\u5199\u4F5C\u52A9\u624B\u4E00\u8D77\uFF0C\u8BA9\u6545\u4E8B\u7EE7\u7EED\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", { className: "about-capabilities", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u6B63\u6587" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "\u4E13\u5FC3\u5199\u4F5C\uFF0C\u81EA\u52A8\u4FDD\u5B58\uFF0C\u968F\u65F6\u56DE\u770B\u7248\u672C\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u89C4\u5212" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "\u8BA8\u8BBA\u4E0B\u4E00\u6B65\uFF0C\u628A\u60C5\u8282\u8FDE\u6210\u5171\u540C\u7406\u89E3\u7684\u8DEF\u7EBF\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", { children: "\u8BBE\u5B9A" }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", { children: "\u6309\u5206\u7EC4\u67E5\u627E\u89D2\u8272\u4E0E\u4E16\u754C\u4E66\uFF0C\u68B3\u7406\u5F7C\u6B64\u5173\u7CFB\u3002" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "muted", children: "\u4F5C\u54C1\u83DC\u5355\u4E2D\u53EF\u7BA1\u7406\u5199\u4F5C\u9884\u8BBE\u4E0E\u5DE5\u4F5C\u6570\u636E\u5907\u4EFD\u3002\u9605\u8BFB\u504F\u597D\u4EC5\u4FDD\u5B58\u5728\u6B64\u6D4F\u89C8\u5668\uFF1B\u5C0F\u8BF4\u5185\u5BB9\u7531\u5DE5\u4F5C\u6570\u636E\u76EE\u5F55\u72EC\u7ACB\u4FDD\u5B58\u3002" })
  ] });
}

// src/client/visual.ts
var visualStyles = `
.cuigengji { --cg-paper:var(--dsw-alias-bg-base,#ffffff); --cg-ink:var(--dsw-alias-label-primary,#252936); --cg-muted:var(--dsw-alias-label-secondary,#737780); --cg-line:var(--dsw-alias-border-l1,#dde0e6); --cg-accent:var(--dsw-alias-state-business-primary,#4d6bfe); --cg-wash:color-mix(in srgb,var(--cg-accent) 7%,var(--cg-paper)); --dsw-focus-ring-color:var(--cg-accent); color:var(--cg-ink); }
.cuigengji:not(dialog) { background:var(--cg-paper); }
.cuigengji button,.cuigengji summary,.cuigengji select { transition:background 120ms,border-color 120ms,color 120ms; }
.cuigengji button,.cuigengji input,.cuigengji textarea,.cuigengji select {border-color:var(--cg-line);}
.cuigengji button:not(:disabled):hover,.cuigengji .menu>summary:hover {background:var(--cg-wash);}
.cuigengji button.primary:hover {background:var(--cg-accent);}
.cuigengji .primary {background:var(--cg-accent);color:var(--dsw-alias-label-on-color,#fff);}
.cuigengji .workbench-header {display:flex;align-items:center;gap:24px;padding:8px 24px;flex-wrap:wrap;}
.cuigengji .identity {flex:1;min-width:230px;padding:0;}
.cuigengji .workbench-header nav {order:2;width:100%;}
.cuigengji nav button {padding:9px 6px;}
.cuigengji .book-picker {font-size:16px;max-width:280px;}
.cuigengji .app-actions {display:flex;margin-left:auto;gap:4px;}
.cuigengji .app-actions button {border:0;background:none;color:var(--cg-muted);font-size:12px;}
.cuigengji .module-heading {padding:16px 24px 12px;}
.cuigengji .module-toolbar {display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.cuigengji .module-toolbar h2 {margin:0;font-size:17px;font-weight:600;}
.cuigengji .module-search {width:180px;min-width:90px;max-width:280px;flex:1;margin-left:auto;border-color:transparent;background:transparent;font-size:12px;}
.cuigengji .module-search:focus {border-color:var(--cg-line);}
.cuigengji .module-toolbar>.primary {white-space:nowrap;}
.cuigengji .module-toolbar .segmented {font-size:12px;}
.cuigengji .filter-strip {display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:12px;}
.cuigengji .group-toolbar {display:contents;}
.cuigengji .filter-control {position:relative;display:flex;align-items:center;gap:8px;border:1px solid var(--cg-line);border-radius:7px;background:var(--cg-paper);padding:0 10px;height:36px;min-width:0;margin:0;color:var(--cg-muted);max-width:260px;}
.cuigengji .filter-control:focus-within {outline:2px solid var(--cg-accent);outline-offset:2px;}
.cuigengji .filter-control.is-active {background:var(--cg-wash);border-color:color-mix(in srgb,var(--cg-accent) 45%,var(--cg-line));color:var(--cg-accent);}
.cuigengji .filter-prefix {font-size:10px;border-right:1px solid var(--cg-line);padding-right:8px;white-space:nowrap;}
.cuigengji .filter-control select {appearance:none;background:transparent;color:inherit;border:0;border-radius:0;outline:none;font-size:12px;padding:0 20px 0 0;height:100%;max-width:150px;min-width:0;text-overflow:ellipsis;}
.cuigengji .filter-control option {background:var(--cg-paper);color:var(--cg-ink);}
.cuigengji .filter-chevron {position:absolute;right:12px;width:5px;height:5px;border:solid currentColor;border-width:0 1.5px 1.5px 0;transform:rotate(45deg);pointer-events:none;margin-top:-3px;}
.cuigengji .group-new {color:var(--cg-accent);border-color:transparent;background:transparent;font-size:12px;white-space:nowrap;}
.cuigengji .scope-count {color:var(--cg-muted);font-size:11px;margin-left:auto;}
.cuigengji .clear-filter {border:0;font-size:11px;color:var(--cg-accent);padding:4px;background:transparent;}
.cuigengji .memory-workspace {flex:1;display:flex;flex-direction:column;min-height:0;position:relative;}
.cuigengji .memory-layout {flex:1;min-height:0;gap:0;}
.cuigengji .memory-overview {display:flex;flex-direction:column;min-height:0;}
.cuigengji .library-list,.cuigengji .planning-list {padding:12px 28px 32px;overflow:auto;flex:1;}
.cuigengji .library-entry {display:block;width:100%;text-align:left;border:0;border-bottom:1px solid var(--cg-line);border-radius:0;background:transparent;padding:22px 2px;}
.cuigengji .entry-heading {display:flex;align-items:center;gap:12px;justify-content:space-between;}
.cuigengji .library-entry strong,.cuigengji .planning-list .planning-title {font-size:17px;font-weight:600;}
.cuigengji .library-entry small {font-size:11px;color:var(--cg-muted);}
.cuigengji .library-entry p,.cuigengji .planning-list .card>p {font-size:13px;color:var(--cg-muted);line-height:1.8;margin:8px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.cuigengji .planning-list .card {padding:20px 2px;}
.cuigengji .planning-list .planning-title {padding:0;min-height:28px;}
.cuigengji .planning-directory {display:none;}
.cuigengji .overview-page {display:flex;flex-direction:column;flex:1;min-height:0;min-width:0;overflow:hidden;}
.cuigengji .overview-page[hidden] {display:none;}
.cuigengji .detail-page {display:flex;flex-direction:column;flex:1;min-height:0;min-width:0;width:100%;overflow:hidden;animation:cg-arrive 150ms ease-out;}
.cuigengji .detail-bar {display:flex;align-items:center;gap:12px;padding:10px 24px;flex:none;border-bottom:1px solid var(--cg-line);}
.cuigengji .detail-back {border:0;background:none;font-size:12px;color:var(--cg-muted);margin:0;padding-left:0;}
.cuigengji .detail-actions {display:flex;align-items:center;gap:8px;margin-left:auto;}
.cuigengji .detail-actions button {font-size:12px;}
.cuigengji .detail-scroll {flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding:24px clamp(24px,5cqw,64px) 48px;}
.cuigengji .detail-document {max-width:680px;margin-inline:auto;}
.cuigengji .library-entry.selected,.cuigengji .planning-list .card.selected {background:var(--cg-wash);}
.cuigengji .chapter-main .manuscript {max-width:none;margin-inline:0;}
.cuigengji .planning-detail h2,.cuigengji .memory-detail h2 {font-family:Georgia,'Noto Serif SC','SimSun',serif;font-size:28px;letter-spacing:.025em;font-weight:600;line-height:1.5;}
.cuigengji .document-summary {color:var(--cg-muted);font-size:15px;line-height:1.9;white-space:pre-wrap;margin:20px 0 30px;}
.cuigengji .document-summary:empty {display:none;}
.cuigengji .document-body {white-space:pre-wrap;overflow-wrap:anywhere;font-size:16px;line-height:1.95;padding:0;margin:0 0 32px;}
.cuigengji .document-fields>label {font-size:12px;color:var(--cg-muted);margin:18px 0;}
.cuigengji .document-fields>label:has(input),.cuigengji .document-fields>label:has(textarea) {gap:12px;}
.cuigengji .document-fields input,.cuigengji .document-fields textarea {border:0;border-radius:0;background:transparent;color:var(--cg-ink);padding:4px 0;box-shadow:none;}
.cuigengji .document-fields input {font-family:Georgia,'Noto Serif SC','SimSun',serif;font-size:27px;font-weight:600;}
.cuigengji .document-fields textarea {font-size:15px;min-height:80px;line-height:1.95;}
.cuigengji .document-fields textarea.prose {font-size:17px;min-height:320px;}
.cuigengji .document-fields small {font-weight:400;opacity:.7;}
.cuigengji .document-fields input:focus-visible,.cuigengji .document-fields textarea:focus-visible {outline:0;box-shadow:-3px 0 0 -1px var(--cg-accent);padding-left:10px;}
.cuigengji .flow-context {background:transparent;border-top:1px solid var(--cg-line);padding:20px 0;margin-top:28px;}
.cuigengji .section-fold {font-size:12px;border-color:var(--cg-line);}
.cuigengji .section-fold>summary {font-weight:500;color:var(--cg-muted);}
.cuigengji .related-entry {display:flex;flex-wrap:wrap;align-items:center;gap:8px;border-top:1px solid var(--cg-line);padding:10px 0;}
.cuigengji .related-entry button {border:0;background:transparent;font-size:12px;}
.cuigengji .related-entry button:last-child {margin-left:auto;}
.cuigengji .related-entry small {color:var(--cg-muted);}
.cuigengji .related-entry p {flex-basis:100%;font-size:12px;line-height:1.8;margin:0;}
.cuigengji .canvas-tools {padding:6px 24px;gap:6px;margin:0;background:var(--cg-paper);}
.cuigengji .canvas-tools button,.cuigengji .canvas-tools summary {font-size:12px;background:transparent;}
.cuigengji .zoom-controls {display:flex;margin-left:auto;gap:2px;}
.cuigengji .zoom-controls button {border:0;min-width:30px;}
.cuigengji .planning-canvas-scroll {background-color:var(--cg-paper);background-image:radial-gradient(circle,color-mix(in srgb,var(--cg-muted) 22%,transparent) 1px,transparent 1px);background-size:24px 24px;}
.cuigengji .planning-card {width:224px;height:156px;border:1px solid var(--cg-line);border-radius:9px;padding:12px 14px;box-shadow:0 3px 10px #00000005;background:var(--cg-paper);}
.cuigengji .planning-card .planning-title {font-size:15px;padding:4px 0;}
.cuigengji .planning-card p {display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;white-space:normal;line-height:1.7;color:var(--cg-muted);}
.cuigengji .planning-card .drag-handle {font-size:10px;height:14px;}
.cuigengji .drag-handle span {visibility:hidden;}
.cuigengji .planning-card:hover .drag-handle span {visibility:visible;}
.cuigengji .planning-card.selected,.cuigengji .planning-card.connect-source {outline:1px solid var(--cg-accent);background:var(--cg-wash);}
.cuigengji .planning-state {font-size:10px;margin-top:6px;}
.cuigengji .planning-group-frame {border-color:color-mix(in srgb,var(--cg-accent) 18%,transparent);background:color-mix(in srgb,var(--cg-accent) 2%,transparent);}
.cuigengji .relation-label {position:absolute;width:180px;z-index:2;padding:6px 10px;border-radius:7px;background:var(--cg-paper);font-size:11px;text-align:center;}
.cuigengji .relation-label .edge-label-content {border:0;padding:0;min-height:0;display:block;width:100%;font-size:11px;background:none;}
.cuigengji .relation-label strong {display:block;font-size:11px;font-weight:500;color:var(--cg-accent);}
.cuigengji .relation-label span {display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;line-height:1.6;color:var(--cg-muted);}
.cuigengji .relation-label.expanded {z-index:4;box-shadow:0 5px 20px #0002;}
.cuigengji .relation-label.expanded span {-webkit-line-clamp:unset;max-height:240px;overflow:auto;white-space:pre-wrap;}
.cuigengji .relation-label .expand-edge {border:0;min-height:20px;padding:0;font-size:10px;color:var(--cg-accent);}
.cuigengji .creation {display:flex;flex-direction:column;flex:1;min-height:0;animation:cg-arrive 150ms ease-out;}
.cuigengji .creation-bar {display:flex;align-items:center;gap:12px;padding:14px 24px;border-bottom:1px solid var(--cg-line);flex:none;}
.cuigengji .creation-bar>button:first-child {border:0;background:none;}
.cuigengji .creation-scroll {flex:1;min-height:0;overflow:auto;padding:32px 32px 60px;}
.cuigengji .creation-document {max-width:680px;margin:auto;}
.cuigengji .creation-context {border-left:2px solid var(--cg-accent);padding-left:12px;color:var(--cg-accent);font-size:12px;}
.cuigengji .creation-settings {display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding-bottom:12px;border-bottom:1px solid var(--cg-line);}
.cuigengji .creation-settings label {display:flex;align-items:center;gap:8px;font-size:12px;min-width:0;}
.cuigengji .creation-settings select {max-width:240px;border:0;}
.cuigengji .creation-settings button {border:0;color:var(--cg-accent);background:none;font-size:12px;}
.cuigengji .chapter-directory {background:color-mix(in srgb,var(--cg-ink) 2%,var(--cg-paper));}
.cuigengji .manuscript {line-height:var(--prose-leading,1.95);}
.cuigengji .directory-foot {border-top:1px solid var(--cg-line);font-size:11px;color:var(--cg-muted);padding:16px 8px;margin-top:18px;}
.cuigengji .utility-modal {color:var(--cg-ink);width:min(600px,calc(100vw - 32px));max-height:calc(100dvh - 40px);padding:0;border:1px solid var(--cg-line);border-radius:12px;background:var(--cg-paper);box-shadow:0 18px 60px #0003;overflow:auto;}
.cuigengji .utility-modal::backdrop {background:#17203355;backdrop-filter:blur(2px);}
.cuigengji .utility-head {position:sticky;top:0;background:var(--cg-paper);display:flex;align-items:center;justify-content:space-between;padding:18px 28px 14px;border-bottom:1px solid var(--cg-line);z-index:1;}
.cuigengji .utility-head h2 {margin:0;font-size:22px;}
.cuigengji .utility-head button {border:0;background:none;font-size:24px;}
.cuigengji .utility-content {padding:4px 28px 24px;}
.cuigengji .preference-section {padding:16px 0;border-bottom:1px solid var(--cg-line);}
.cuigengji .preference-section h3 {font-size:13px;margin:0 0 12px;}
.cuigengji .preference-section .split {grid-template-columns:1fr 1fr;}
.cuigengji .reading-preview {padding:18px 20px;border-radius:8px;background:var(--cg-wash);}
.cuigengji .reading-preview small {color:var(--cg-muted);font-size:10px;}
.cuigengji .reading-preview p {margin:10px 0 0;}
.cuigengji .preference-row {display:flex;align-items:center;justify-content:space-between;gap:16px;min-height:44px;font-size:13px;}
.cuigengji .preference-row select {width:154px;max-width:52%;}
.cuigengji .utility-footer {display:flex;align-items:center;gap:16px;padding-top:20px;flex-wrap:wrap;}
.cuigengji .utility-footer button {border:0;background:none;color:var(--cg-accent);}
.cuigengji .utility-footer small {color:var(--cg-muted);font-size:11px;}
.cuigengji .about-identity {display:flex;align-items:center;gap:16px;margin:28px 0 0;}
.cuigengji .about-identity h2 {font-size:28px;}
.cuigengji .about-intro {font-size:16px;margin:16px 0 28px;}
.cuigengji .about-capabilities {display:grid;grid-template-columns:auto 1fr;gap:16px;font-size:13px;padding:20px 0;border-top:1px solid var(--cg-line);}
.cuigengji .about-capabilities dt {color:var(--cg-accent);}
.cuigengji .about-capabilities dd {margin:0;color:var(--cg-muted);}
@container(min-width:760px){.cuigengji .workbench-header {display:grid;grid-template-columns:minmax(130px,1fr) auto auto;gap:20px;padding:8px 24px;}.cuigengji .identity,.cuigengji .header-row {display:contents;}.cuigengji .book-picker {grid-column:1;grid-row:1;width:100%;}.cuigengji .workbench-header nav {grid-column:2;grid-row:1;width:auto;gap:20px;order:0;}.cuigengji .workbench-header nav button {min-width:64px;}.cuigengji .header-row>.menu {grid-column:3;grid-row:1;justify-self:start;}.cuigengji .app-actions {grid-column:3;grid-row:1;padding-left:32px;}.cuigengji .workbench-header .header-row>.menu {z-index:3;}}
@container(max-width:599px){.cuigengji .workbench-header {padding:6px 16px;gap:6px;}.cuigengji .module-heading {padding:12px 16px;}.cuigengji .module-toolbar {gap:6px;}.cuigengji .module-toolbar h2 {font-size:15px;}.cuigengji .module-search {order:5;flex-basis:100%;max-width:none;margin:0;}.cuigengji .module-toolbar>.primary,.cuigengji .module-toolbar>.menu:has(.primary) {margin-left:auto;}.cuigengji .filter-prefix {display:none;}.cuigengji .filter-strip {gap:6px;}.cuigengji .filter-control select {max-width:110px;font-size:11px;}.cuigengji .group-new {font-size:11px;padding:4px;}.cuigengji .scope-count {display:none;}.cuigengji .detail-scroll {padding:20px 24px 40px;}.cuigengji .detail-bar {padding:8px 16px;}.cuigengji .creation-scroll {padding:24px;}.cuigengji .creation-bar {padding:12px 16px;}.cuigengji .canvas-tools {padding:6px 16px;}.cuigengji .creation-settings select {max-width:170px;}.cuigengji .utility-head {padding:16px 20px 12px;}.cuigengji .utility-content {padding:4px 20px 20px;}}
 .cuigengji .directory-drawer {inset:0 auto 0 0;margin:0;width:min(330px,calc(100vw - 36px));max-width:none;height:100dvh;max-height:100dvh;padding:0;border:0;border-right:1px solid var(--cg-line);background:var(--cg-paper);color:var(--cg-ink);overflow:hidden;}
.cuigengji .directory-drawer[open] {display:flex;flex-direction:column;}
.cuigengji .drawer-header {display:flex;justify-content:flex-end;flex:none;padding:4px 8px;background:var(--cg-paper);}
.cuigengji .directory-drawer::backdrop {background:#17203355;}
.cuigengji .directory-drawer .chapter-directory {display:block;width:100%;min-height:0;flex:1;overflow:auto;border:0;background:transparent;padding-top:8px;}
.cuigengji .drawer-close span {pointer-events:none;}
.cuigengji .drawer-close {display:grid;place-items:center;flex:none;width:44px;height:44px;min-height:44px;padding:0;border:0;background:none;font-size:24px;line-height:1;cursor:pointer;touch-action:manipulation;}
@container(max-width:759px){.cuigengji .show-directory .chapter-main {display:flex;}.cuigengji .directory-drawer .chapter-directory .directory-heading>.icon-button {display:none;}}
@keyframes cg-arrive {from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}
.cuigengji[data-motion=reduce] *,.cuigengji[data-motion=reduce] *::before,.cuigengji[data-motion=reduce] *::after {animation:none!important;transition:none!important;scroll-behavior:auto!important;}
@media(prefers-reduced-motion:reduce){.cuigengji *,.cuigengji *::before,.cuigengji *::after {animation:none!important;transition:none!important;scroll-behavior:auto!important;}}
`;

// src/client/shared/select-style.ts
var selectStyles = `
.cuigengji select {cursor:pointer;min-height:34px;line-height:1.4;background-color:var(--cg-paper);}
.cuigengji select:disabled {cursor:default;opacity:.5;}
.cuigengji select:not(:disabled):hover {border-color:color-mix(in srgb,var(--cg-accent) 45%,var(--cg-line));}
.cuigengji select option {font:inherit;background:var(--cg-paper);color:var(--cg-ink);}
@supports (appearance:base-select) {
  .cuigengji select,.cuigengji select::picker(select) {appearance:base-select;}
  .cuigengji select {display:inline-flex;align-items:center;gap:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .cuigengji select::picker-icon {content:'';width:10px;height:6px;border:0;background:currentColor;clip-path:polygon(0 0,50% 65%,100% 0,100% 35%,50% 100%,0 35%);rotate:0deg;flex:none;margin:0 1px 0 auto;opacity:.6;transition:rotate 120ms;}
  .cuigengji select:open::picker-icon {rotate:180deg;}
  .cuigengji select::picker(select) {font:400 13px/1.5 var(--dsw-font-family,system-ui,'Microsoft YaHei',sans-serif);color:var(--cg-ink);background:var(--cg-paper);border:1px solid var(--cg-line);border-radius:12px;padding:5px;margin-block:6px;min-width:anchor-size(width);max-width:calc(100vw - 24px);max-height:min(320px,60dvh);box-shadow:0 8px 28px #0000001c,0 2px 6px #0000000a;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;}
  .cuigengji select option {display:flex;align-items:center;gap:12px;min-height:36px;padding:8px 12px;border-radius:7px;white-space:normal;overflow-wrap:anywhere;cursor:pointer;}
  .cuigengji select option:checked {color:var(--cg-accent);background:var(--cg-wash);font-weight:600;}
  .cuigengji select option:hover,.cuigengji select option:focus {background:color-mix(in srgb,var(--cg-accent) 12%,var(--cg-paper));outline:none;}
  .cuigengji select option::checkmark {order:2;margin-left:auto;color:var(--cg-accent);font-size:12px;}
  .cuigengji select option:disabled {opacity:.45;cursor:default;}
  .cuigengji .filter-control select {appearance:base-select;padding-right:2px;min-height:0;}
  .cuigengji .filter-chevron {display:none;}
  .cuigengji .book-picker {padding:7px 10px;border:1px solid transparent;border-radius:8px;background:transparent;font-weight:600;}
  .cuigengji .book-picker:hover,.cuigengji .book-picker:open {background:var(--cg-wash);border-color:var(--cg-line);}
}
@media (prefers-reduced-motion:reduce) {.cuigengji select::picker-icon {transition:none;}}
.cuigengji[data-motion=reduce] select::picker-icon {transition:none;}
`;

// src/client/shared/graph-style.ts
var graphStyles = `
.cuigengji .planning-canvas-scroll {touch-action:none;overscroll-behavior:contain;cursor:grab;}
.cuigengji .planning-canvas-scroll:focus-visible {outline:2px solid var(--cg-accent);outline-offset:-2px;}
.cuigengji .planning-card {cursor:grab;user-select:none;touch-action:none;overflow:visible;}
.cuigengji .planning-card:active,.cuigengji .graph-dragging,.cuigengji .graph-dragging * {cursor:grabbing;}
.cuigengji .planning-card .planning-title {cursor:inherit;}
.cuigengji .graph-card-kind {display:block;height:18px;color:var(--cg-muted);font-size:10px;letter-spacing:.05em;}
.cuigengji .planning-card .graph-port {position:absolute;top:45px;width:30px;height:30px;min-height:0;padding:0;border:0;border-radius:50%;background:transparent;cursor:crosshair;z-index:3;touch-action:none;}
.cuigengji .graph-port.port-in {left:-16px;}
.cuigengji .graph-port.port-out {right:-16px;}
.cuigengji .graph-port::after {content:'';display:block;position:absolute;inset:9px;border:2px solid var(--cg-muted);background:var(--cg-paper);border-radius:50%;transition:background 120ms,border-color 120ms,box-shadow 120ms;}
.cuigengji .graph-port:hover::after,.cuigengji .graph-port:focus-visible::after,.cuigengji .graph-port.port-source::after {border-color:var(--cg-accent);background:var(--cg-accent);box-shadow:0 0 0 4px var(--cg-wash);}
.cuigengji .graph-port.port-valid::after {border-color:var(--cg-accent);box-shadow:0 0 0 4px var(--cg-wash);}
.cuigengji .graph-port.port-target::after {background:var(--cg-accent);box-shadow:0 0 0 6px var(--cg-wash);}
.cuigengji .graph-port.port-unavailable {opacity:.3;}
.cuigengji .planning-lines .graph-preview {fill:none;stroke:var(--cg-accent);stroke-width:2;stroke-dasharray:6 4;pointer-events:none;}
.cuigengji .planning-lines .edge-selected path:not(.edge-hit) {stroke:var(--cg-accent);}
.cuigengji .graph-hint {color:var(--cg-muted);font-size:11px;}
.cuigengji .canvas-tools {min-height:42px;flex-wrap:wrap;}
.cuigengji .canvas-tools .menu {margin-left:0;}
.cuigengji .graph-save-error {display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:12px;}
.cuigengji .canvas-empty {position:absolute;left:32px;top:40px;color:var(--cg-muted);font-size:13px;pointer-events:none;}
.cuigengji .planning-pages {display:flex;align-items:center;gap:6px;padding:4px 20px;border-bottom:1px solid var(--cg-line);flex:none;min-height:43px;background:var(--cg-paper);}
.cuigengji .page-tabs {display:flex;gap:4px;overflow-x:auto;min-width:0;flex:1;}
.cuigengji .planning-pages button {flex:none;border:0;background:transparent;white-space:nowrap;font-size:12px;}
.cuigengji .page-tabs button[aria-current=page] {background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .page-tabs small {margin-left:8px;color:var(--cg-muted);font-weight:400;}
.cuigengji .add-page {color:var(--cg-accent);}
.cuigengji .move-page {padding:8px 24px;}
.cuigengji .move-page label {display:flex;gap:8px;align-items:center;}
.cuigengji .graph-context-menu {position:fixed;z-index:100;width:180px;background:var(--cg-paper);border:1px solid var(--cg-line);border-radius:10px;padding:5px;box-shadow:0 8px 30px #0002;}
.cuigengji .graph-context-menu button {display:block;width:100%;border:0;background:transparent;text-align:left;padding:9px 12px;font-size:13px;}
.cuigengji .graph-context-menu button:hover,.cuigengji .graph-context-menu button:focus-visible {background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .planning-decoration {display:flex;flex-direction:column;position:absolute;border:1px solid color-mix(in srgb,var(--decoration-color) 55%,var(--cg-line));border-radius:10px;background:color-mix(in srgb,var(--decoration-color) 16%,var(--cg-paper));color:var(--cg-ink);z-index:2;}
.cuigengji .tone-neutral {--decoration-color:#8e939b;}.cuigengji .tone-sand {--decoration-color:#c79b38;}.cuigengji .tone-sage {--decoration-color:#67996d;}.cuigengji .tone-sky {--decoration-color:#6f9ac8;}.cuigengji .tone-rose {--decoration-color:#bb7a90;}
.cuigengji .decoration-frame {z-index:0;pointer-events:none;background:color-mix(in srgb,var(--decoration-color) 8%,transparent);}
.cuigengji .planning-group-frame {pointer-events:none;}.cuigengji .planning-group-frame button {pointer-events:auto;}
.cuigengji .planning-decoration header {flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 14px;cursor:grab;pointer-events:auto;touch-action:none;user-select:none;}
.cuigengji .planning-decoration header span {color:var(--cg-muted);font-size:15px;}
.cuigengji .planning-decoration .decoration-title {padding:0;border:0;background:transparent;font:inherit;font-weight:600;text-align:left;max-width:calc(100% - 20px);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:grab;}
.cuigengji .decoration-content {flex:1;min-height:0;padding:0 14px 24px;white-space:pre-wrap;overflow:auto;line-height:1.6;}
.cuigengji .decoration-frame .decoration-content {flex:none;max-height:56px;color:var(--cg-muted);}
.cuigengji .planning-decoration .decoration-resize {position:absolute;right:0;bottom:0;padding:2px;width:24px;height:24px;min-height:0;border:0;background:transparent;color:var(--cg-muted);cursor:nwse-resize;pointer-events:auto;touch-action:none;font-size:12px;}
.cuigengji .planning-card {z-index:3;}
.cuigengji .decoration-options {display:flex;gap:12px;flex-wrap:wrap;}
.cuigengji .decoration-options label {flex:1;min-width:80px;}
.cuigengji .decoration-options input {width:100%;}
@media(prefers-reduced-motion:reduce){.cuigengji .graph-port::after {transition:none;}}
`;

// src/client/style.ts
var styles = `
.cuigengji { color:var(--dsw-alias-label-primary,#252936); font-family:var(--dsw-font-family,system-ui,-apple-system,"Segoe UI","Microsoft YaHei",sans-serif); font-size:13px; padding:14px; height:100%; overflow:auto; box-sizing:border-box; }
.cuigengji * { box-sizing:border-box; }


.cuigengji p { line-height:1.7; }
.cuigengji button,.cuigengji input,.cuigengji select,.cuigengji textarea { font:inherit; color:inherit; border:1px solid var(--dsw-alias-border-l1,#dde0e6); background:var(--dsw-alias-button-floating-fill,transparent); border-radius:8px; padding:7px 11px; }

.cuigengji button:disabled { opacity:.5; cursor:default; }
.cuigengji button:focus-visible,.cuigengji input:focus-visible,.cuigengji textarea:focus-visible,.cuigengji select:focus-visible { outline:2px solid var(--dsw-focus-ring-color,#4d6bfe); outline-offset:2px; }
.cuigengji [aria-selected=true],.cuigengji .selected { border-color:var(--dsw-alias-state-business-primary,#4d6bfe); background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 10%,transparent); }
.cuigengji label { display:grid; gap:5px; margin:10px 0; }
.cuigengji textarea { width:100%; min-height:130px; resize:vertical; line-height:1.85; }
.cuigengji .prose { min-height:360px; }
.cuigengji .row { display:flex; gap:7px; align-items:center; flex-wrap:wrap; margin:8px 0; }
.cuigengji .row>* { min-width:0; }

.cuigengji .muted { opacity:.7; font-size:12px; }

.cuigengji .notice.error { border-left-color:#c64e42; }
.cuigengji .list { display:grid; gap:0; }

.cuigengji .split { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr)); gap:12px; }
.cuigengji pre { white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; line-height:1.75; max-height:420px; overflow:auto; border:1px solid var(--dsw-alias-border-l1,#8886); padding:10px; }
.cuigengji svg { width:100%; max-height:300px; border:1px solid var(--dsw-alias-border-l1,#8886); border-radius:5px; }
.cuigengji svg text { fill:currentColor; font-size:11px; }
.cuigengji svg line { stroke:var(--dsw-alias-border-l1,#999); stroke-width:2; }
.cuigengji svg circle { fill:var(--dsw-alias-button-floating-fill,#777); stroke:var(--dsw-alias-state-business-primary,#4d6bfe); stroke-width:2; }
.cuigengji svg g { cursor:pointer; }
.cuigengji summary { cursor:pointer; padding:8px 0; }
.cuigengji .grow { flex:1; }
.cuigengji .editor-fields { border:0; padding:0; margin:0; min-width:0; }
.cuigengji-dialog::backdrop { background:#0008; }
.cuigengji.cuigengji-dialog { margin:auto; height:fit-content; max-height:90vh; width:min(420px,calc(100% - 36px)); padding:16px; border:1px solid var(--dsw-alias-border-l1,#8886); border-radius:8px; background:var(--dsw-alias-bg-base,#fff); box-shadow:0 12px 40px #0005; }
.cuigengji-dialog p { margin:0 0 12px; white-space:pre-wrap; }
.cuigengji-dialog input { width:100%; }

/* Workbench layout follows the panel width, including DSH full-screen mode. */
.cuigengji:not(dialog) { container-type:inline-size; display:flex; flex-direction:column; padding:0; font-size:14px; min-height:0; height:100%; overflow:hidden; background:var(--dsw-alias-bg-base,#fff); }
.cuigengji .workbench-header { flex:none; padding:8px 16px 0; border-bottom:1px solid var(--dsw-alias-border-l1,#8884); }
.cuigengji .eyebrow { font-size:12px; color:var(--dsw-alias-label-secondary,#737780); letter-spacing:.04em; }
.cuigengji .identity { padding-bottom:4px; }
.cuigengji .compact { margin:4px 0; }
.cuigengji .book-picker { font-size:16px; font-weight:600; border:0; padding-left:0; background:transparent; width:1px; }
.cuigengji nav { display:flex; gap:4px; flex-wrap:nowrap; margin:0; padding:0; border:0; }
.cuigengji nav button { flex:1; border:0; border-bottom:2px solid transparent; border-radius:0; padding:12px 6px; background:transparent; color:var(--dsw-alias-label-secondary,#737780); }
.cuigengji nav button.selected { border-bottom-color:var(--dsw-alias-state-business-primary,#4d6bfe); color:var(--dsw-alias-state-business-primary,#4d6bfe); }
.cuigengji h2 { font-size:18px; margin:8px 0 12px; line-height:1.4; overflow-wrap:anywhere; }
.cuigengji h3 { font-size:16px; margin:16px 0 8px; }
.cuigengji button { cursor:pointer; min-height:36px; }
.cuigengji .primary { background:var(--dsw-alias-state-business-primary,#4d6bfe); border-color:transparent; color:var(--dsw-alias-label-on-color,#fff); font-weight:600; }
.cuigengji .danger,.cuigengji .error-text { color:var(--dsw-alias-state-error-primary,#bf443a); }
.cuigengji .workbench-body { flex:1; min-height:0; display:flex; flex-direction:column; overflow:hidden; }
.cuigengji .page { padding:20px 16px; overflow:auto; flex:1; min-height:0; }
.cuigengji .empty { padding:24px 16px; color:var(--dsw-alias-label-secondary,#737780); line-height:1.8; }
.cuigengji .menu { position:relative; }
.cuigengji .menu>summary { cursor:pointer; list-style:none; padding:8px; min-height:36px; font-size:13px; border-radius:6px; }
.cuigengji .menu[open]>summary { background:var(--dsw-alias-bg-layer-1,#f1f2f5); }
.cuigengji .menu-panel { position:absolute; right:0; top:100%; z-index:20; width:180px; padding:8px; border:1px solid var(--dsw-alias-border-l1,#ddd); border-radius:8px; background:var(--dsw-alias-bg-base,#fff); box-shadow:0 8px 24px #0002; max-height:65vh; overflow:auto; }
.cuigengji .menu-panel button { display:block; width:100%; text-align:left; margin:2px 0; }
.cuigengji .settings-panel { width:min(300px,76vw); }
.cuigengji .chapter-workspace { flex:1; display:flex; min-height:0; }
.cuigengji .chapter-directory { width:100%; padding:16px; overflow:auto; background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 2%,var(--dsw-alias-bg-base,#fff)); }
.cuigengji .chapter-directory h2 { font-size:16px; }
.cuigengji .search { width:100%; }
.cuigengji .directory-options { margin:8px 0; font-size:12px; color:var(--dsw-alias-label-secondary,#737780); }
.cuigengji .volume-group { margin-top:16px; }
.cuigengji .chapter-item { display:flex; align-items:center; gap:12px; width:100%; border:0; margin:4px 0; text-align:left; background:transparent; padding:12px 10px; line-height:1.5; }
.cuigengji .chapter-item>span { flex:1; overflow-wrap:anywhere; }
.cuigengji .chapter-item small { color:var(--dsw-alias-label-secondary,#737780); white-space:nowrap; font-size:11px; font-variant-numeric:tabular-nums; }
.cuigengji .chapter-item.selected { background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 12%,transparent); }
.cuigengji .chapter-main { flex:1; min-width:0; min-height:0; display:flex; flex-direction:column; }
.cuigengji .show-editor .chapter-directory,.cuigengji .show-directory .chapter-main { display:none; }

.cuigengji .editor-heading { flex:none; padding:12px 16px; border-bottom:1px solid var(--dsw-alias-border-l1,#8883); }
.cuigengji .editor-heading h2 { margin:2px 0 0; font-size:22px; font-weight:600; letter-spacing:.02em; }
.cuigengji .editor-scroll { flex:1; min-height:0; overflow:auto; padding:28px 24px; scrollbar-gutter:stable; }
.cuigengji .segmented { display:flex; border:0; background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 5%,var(--dsw-alias-bg-base,#fff)); border-radius:8px; padding:3px; gap:2px; }
.cuigengji .segmented button { border:0; background:transparent; min-height:30px; padding:4px 10px; }
.cuigengji .segmented button[aria-pressed=true] { background:var(--dsw-alias-bg-base,#fff); box-shadow:0 1px 3px #0001; font-weight:600; }
.cuigengji .inline-field { display:flex; align-items:center; gap:6px; margin:0 0 0 auto; font-size:12px; }
.cuigengji .inline-field select { padding:4px; }
.cuigengji .binding-line { font-size:12px; color:var(--dsw-alias-label-secondary,#737780); margin-top:8px; }
.cuigengji .binding-line button { min-height:28px; padding:3px 6px; font-size:12px; }
.cuigengji .manuscript { display:block; max-width:36em; width:100%; margin:0 auto; line-height:2; white-space:pre-wrap; overflow-wrap:anywhere; font-family:inherit; }
.cuigengji textarea.manuscript { min-height:55vh; resize:vertical; padding:16px; font-size:16px; border-color:transparent; background:transparent; }

.cuigengji article.manuscript { padding:16px 16px 32px; min-height:180px; }
.cuigengji .reading-text { max-width:720px; margin:auto; font-size:16px; line-height:1.85; overflow-wrap:anywhere; }
.cuigengji .reading-text p { white-space:pre-wrap; }
.cuigengji .savebar { flex:none; display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:12px; padding:12px 16px; border-top:1px solid var(--dsw-alias-border-l1,#8884); background:var(--dsw-alias-bg-base,#fff); }
.cuigengji .savebar button { white-space:nowrap; }
.cuigengji .savebar span { font-size:12px; }
.cuigengji .history { max-width:720px; margin:24px auto 0; border-top:1px solid var(--dsw-alias-border-l1,#8884); }
.cuigengji .history-item { padding:12px 0; border-bottom:1px solid var(--dsw-alias-border-l1,#8883); }

.cuigengji .card { border:0; border-bottom:1px solid var(--dsw-alias-border-l1,#8883); border-radius:0; padding:16px 0; margin:0 0 16px; }
.cuigengji .list button { text-align:left; padding:12px 8px; border:0; border-bottom:1px solid var(--dsw-alias-border-l1,#8883); border-radius:0; background:transparent; overflow-wrap:anywhere; }
.cuigengji .sticky-actions { position:sticky; bottom:-20px; margin:16px -16px 0; z-index:2; }
.cuigengji .source-row { padding:10px 0; border-bottom:1px solid var(--dsw-alias-border-l1,#8883); }
.cuigengji input:not([type=checkbox]),.cuigengji select { max-width:100%; }
.cuigengji .notice { padding:10px; border:1px solid var(--dsw-alias-border-l1,#8886); border-left:3px solid var(--dsw-alias-state-business-primary,#4d6bfe); margin:8px 16px; white-space:pre-wrap; flex:none; }
.cuigengji .notice button { margin:6px; }
.cuigengji .page .notice,.cuigengji .editor-scroll .notice { margin:8px 0; }
@container (min-width:760px) {
 .cuigengji .chapter-directory { display:block!important; width:252px; flex:none; border-right:1px solid var(--dsw-alias-border-l1,#8884); }
 .cuigengji .chapter-main { display:flex!important; }
 .cuigengji .directory-back { display:none; }
 .cuigengji .editor-heading,.cuigengji .savebar { padding-left:24px; padding-right:24px; }
 .cuigengji .page { padding:24px; }
 .cuigengji .sticky-actions {bottom:-24px; margin-left:-24px; margin-right:-24px;}
}
@media (pointer:coarse) { .cuigengji button,.cuigengji summary { min-height:44px; } }

.cuigengji .module-heading { padding:12px 16px; border-bottom:1px solid var(--dsw-alias-border-l1,#8884); flex:none; }
.cuigengji .planning-workspace { position:relative; flex:1; min-height:0; display:flex; flex-direction:column; }
.cuigengji .planning-columns { display:flex; flex:1; min-height:0; }
.cuigengji .planning-overview { flex:1; min-width:0; display:flex; flex-direction:column; }
.cuigengji .planning-list { overflow:auto; padding:16px; }
.cuigengji .planning-canvas-scroll { flex:1; min-height:0; overflow:auto; background:radial-gradient(circle,#8884 1px,transparent 1px); background-size:20px 20px; }
.cuigengji .planning-canvas { position:relative; }
.cuigengji svg.planning-lines { position:absolute; inset:0; max-height:none; border:0; width:100%; height:100%; overflow:visible; pointer-events:none; }
.cuigengji .planning-lines path { stroke:var(--dsw-alias-label-secondary,#889); stroke-width:1.5; }

.cuigengji .planning-card.selected { outline:2px solid var(--dsw-focus-ring-color,#4d6bfe); }
.cuigengji .planning-card.connect-source { outline:2px solid var(--dsw-focus-ring-color,#4d6bfe); box-shadow:0 0 0 4px #4d6bfe33; }
.cuigengji .planning-lines .edge-hit { stroke:transparent; stroke-width:18; pointer-events:stroke; cursor:pointer; }
.cuigengji .planning-lines .edge-selected path:not(.edge-hit) { stroke:var(--dsw-focus-ring-color,#4d6bfe); stroke-width:3; }
.cuigengji .planning-lines .edge-hit:focus { outline:none; stroke:#4d6bfe44; }
.cuigengji .prose-tools { display:flex; align-items:center; gap:8px; margin:8px 0; flex-wrap:wrap; }
.cuigengji .planning-title { display:block; font-weight:600; border:0; background:none; text-align:left; width:100%; overflow-wrap:anywhere; }
.cuigengji .planning-card p { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:3px 0; font-size:12px; }
.cuigengji .group-filter { display:flex; gap:6px; overflow:auto; padding:4px 0; scrollbar-width:thin; }
.cuigengji .group-filter button { white-space:nowrap; border:1px solid var(--dsw-alias-border-l1,#8884); border-radius:999px; padding:5px 10px; background:transparent; }
.cuigengji .group-filter button[aria-pressed=true] { background:var(--dsw-alias-bg-layer-1,#eef0f5); border-color:var(--dsw-focus-ring-color,#4d6bfe); font-weight:600; }
.cuigengji .drag-handle { cursor:grab; touch-action:none; font-size:11px; opacity:.7; }
.cuigengji .canvas-tools { padding:0 12px; flex:none; }
.cuigengji .planning-history { position:absolute; inset:0; z-index:30; background:var(--dsw-alias-bg-base,#fff); }
.cuigengji .preset-layout { display:flex; gap:16px; min-height:0; }
.cuigengji .preset-list { width:220px; flex:none; }
.cuigengji .preset-editor { flex:1; min-width:0; }
.cuigengji .preset-list button { display:block; width:100%; text-align:left; margin-bottom:0; border:0; border-bottom:1px solid var(--dsw-alias-border-l1,#8883); border-radius:0; padding:12px 8px; overflow-wrap:anywhere; }
.cuigengji .source-row button { margin-left:8px; }
@container(max-width:599px) { .cuigengji .preset-layout {display:block;} .cuigengji .preset-list {width:100%;} .cuigengji .preset-list.is-selected {display:none;} }

.cuigengji .planning-directory { display:none; width:160px; flex:none; overflow:auto; padding:12px; border-right:1px solid var(--dsw-alias-border-l1,#8883); }
.cuigengji .planning-directory button { border:0; text-align:left; background:none; width:100%; overflow-wrap:anywhere; }
@container(min-width:1000px) { .cuigengji .planning-directory {display:block;} }

.cuigengji .memory-layout { display:flex; gap:20px; }
.cuigengji .memory-overview { flex:1; min-width:0; }

.cuigengji .editor-shell { flex:1; min-height:0; display:flex; flex-direction:column; position:relative; }
.cuigengji .history-panel { position:absolute; inset:0; background:var(--dsw-alias-bg-base,#fff); z-index:10; overflow:auto; padding:16px; }

.cuigengji .planning-card .planning-title { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; max-height:56px; }
.cuigengji .planning-card { position:absolute; width:220px; min-height:120px; border:1px solid var(--dsw-alias-border-l1,#8886); border-radius:10px; padding:10px; background:var(--dsw-alias-bg-base,#fff); box-shadow:0 2px 8px #0001; height:145px; }

.cuigengji .planning-branch { padding-left:12px; border-left:1px solid var(--dsw-alias-border-l1,#8883); }
.cuigengji .planning-directory summary { overflow-wrap:anywhere; }
.cuigengji .planning-directory [aria-current=true] { font-weight:700; background:var(--dsw-alias-bg-layer-1,#eef0f5); }
.cuigengji .planning-reading pre,.cuigengji .planning-history pre { white-space:pre-wrap; overflow-wrap:anywhere; }

.cuigengji .header-row { flex-wrap:nowrap; gap:4px; }
.cuigengji .header-row .book-picker { min-width:0; text-overflow:ellipsis; }
.cuigengji .section-fold { padding:12px 0; margin:0 0 16px; border-bottom:1px solid var(--dsw-alias-border-l1,#8883); }
.cuigengji .section-fold>summary { font-weight:600; }
.cuigengji .action-list span { display:block; font-size:12px; color:var(--dsw-alias-label-secondary,#737780); margin-top:4px; }
.cuigengji .volume-toggle { border:0; background:none; text-align:left; padding:6px 0; overflow-wrap:anywhere; }
.cuigengji .volume-toggle small { font-weight:400; opacity:.7; margin-left:4px; }
.cuigengji .return-strip { padding:4px 16px; flex:none; border-bottom:1px solid var(--dsw-alias-border-l1,#8883); }
.cuigengji .return-strip button { border:0; background:none; font-size:12px; }
.cuigengji input[type=file] { width:100%; min-width:0; }
.cuigengji .status-badge { display:inline-block; padding:2px 0; border-radius:6px; background:none; font-size:12px; margin-left:6px; color:var(--dsw-alias-label-secondary,#737780); }
.cuigengji .planning-reading pre { border:0; padding:0; max-height:none; font-size:16px; }
.cuigengji .planning-list .card { padding:12px 0; }
.cuigengji .breadcrumbs { font-size:12px; }
.cuigengji .breadcrumbs button { border:0; background:none; padding:4px; min-height:28px; overflow-wrap:anywhere; }
.cuigengji .canvas-tools .menu { margin-left:auto; }
.cuigengji .menu>summary.primary { background:var(--dsw-alias-state-business-primary,#4d6bfe); color:var(--dsw-alias-label-on-color,#fff); padding:8px 12px; }
@container(max-width:399px){.cuigengji .page,.cuigengji .editor-scroll {padding:16px 12px;}.cuigengji .workbench-header,.cuigengji .module-heading{padding-left:12px;padding-right:12px;}.cuigengji .preset-list{width:100%;}}
@media(pointer:coarse){.cuigengji button,.cuigengji summary{min-height:44px;}}

.cuigengji .list button.selected,.cuigengji .preset-list button.selected {background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 10%,transparent);font-weight:600;}
.cuigengji .memory-detail .section-fold,.cuigengji .memory-detail .card {margin-top:12px;}
.cuigengji .icon-button { border:0; background:transparent; min-width:32px; padding:4px 8px; font-size:18px; }
.cuigengji .directory-heading { flex-wrap:nowrap; }
.cuigengji .directory-collapsed .chapter-directory { width:48px; padding-left:6px; padding-right:6px; }
.cuigengji .directory-collapsed .chapter-directory > :not(.directory-heading) { display:none; }
.cuigengji .directory-collapsed .directory-heading h2 { display:none; }
.cuigengji .directory-collapsed .directory-heading { display:flex; flex-direction:column; gap:4px; }
.cuigengji .directory-collapsed .directory-heading .grow { display:none; }
@container(max-width:759px) {
 .cuigengji .directory-collapsed .chapter-directory { display:none; }
 .cuigengji .directory-collapsed.show-directory .chapter-directory { display:block; width:100%; }
}

.cuigengji .group-toolbar,.cuigengji .batch-toolbar {display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin:8px 0;}
.cuigengji .group-description {flex-basis:100%;margin:0;}
.cuigengji .group-toolbar label {max-width:240px;margin:0;}
.cuigengji .selectable-entry {display:flex;align-items:center;gap:8px;}
.cuigengji .selectable-entry > button {flex:1;min-width:0;text-align:left;}
.cuigengji .selectable-entry > input,.cuigengji .selection-label input {width:auto;}
.cuigengji .selection-label {font-size:12px;display:flex;align-items:center;gap:4px;float:right;}
.cuigengji .batch-toolbar {padding:10px;background:color-mix(in srgb,#4d6bfe 8%,transparent);border-radius:10px;}
.cuigengji .planning-group-frame {position:absolute;border:1px solid color-mix(in srgb,#4d6bfe 28%,transparent);border-radius:12px;background:color-mix(in srgb,#4d6bfe 3%,transparent);pointer-events:none;}
.cuigengji .planning-group-frame > button {pointer-events:auto;position:relative;z-index:1;margin:2px 6px;padding:4px 8px;background:transparent;border:0;font-weight:600;}
.cuigengji .planning-lines {pointer-events:none;}
.cuigengji .planning-directory details > button {display:block;width:100%;text-align:left;margin:4px 0;}

/* Keep navigation quiet and give the document the largest share of the panel. */
.cuigengji .workbench-header {padding-top:6px;}
.cuigengji .page {padding-top:16px;}
.cuigengji .module-heading {padding-top:8px;padding-bottom:10px;}
.cuigengji .module-heading > .muted {margin:4px 0 10px;}
.cuigengji .row > h2 {margin:0;}
.cuigengji .menu-panel button {border:0;background:transparent;}
.cuigengji button:not(:disabled):hover,.cuigengji .menu>summary:hover {background:var(--dsw-alias-bg-layer-1,#f0f2f7);}
.cuigengji button.primary:hover {background:var(--dsw-alias-state-business-primary,#4d6bfe);filter:brightness(.95);}
.cuigengji .memory-detail article.manuscript {min-height:0;padding-bottom:16px;}
.cuigengji .memory-overview .segmented {width:fit-content;max-width:100%;}
.cuigengji .planning-list .card {margin-bottom:0;padding:10px 0;}
.cuigengji .planning-list .card > p:empty {display:none;}
.cuigengji .prose-tools {margin:0 0 8px;}
.cuigengji .prose-tools button {min-height:30px;padding:4px 8px;font-size:12px;}
.cuigengji .editor-heading {padding-top:16px;padding-bottom:12px;}
.cuigengji .preset-layout {margin-top:12px;}
.cuigengji .directory-collapsed .directory-heading > .primary {display:none;}

/* One stable toolbar; document actions never float among the paragraphs. */
.cuigengji nav button.selected {background:transparent;font-weight:600;}
.cuigengji .chapter-title-row {gap:12px;margin:0 0 16px;flex-wrap:nowrap;}
.cuigengji .chapter-title {min-width:0;}
.cuigengji .chapter-toolbar {display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.cuigengji .chapter-toolbar .prose-tools {margin:0;gap:4px;}
.cuigengji .chapter-toolbar .prose-tools button {min-height:36px;font-size:13px;padding:7px 10px;}
.cuigengji .quiet-button,.cuigengji .directory-back {border-color:transparent;background:transparent;}
.cuigengji .chapter-main .editor-scroll.is-editing {display:block;}
.cuigengji .chapter-main textarea.manuscript {display:block;min-height:240px;resize:none;overflow:hidden;border:0;border-radius:0;background:transparent;box-shadow:none;}
.cuigengji .chapter-main textarea.manuscript:focus-visible {outline:none;box-shadow:none;}
.cuigengji .chapter-main .savebar {flex-wrap:nowrap;gap:8px;}
.cuigengji .chapter-main .savebar > div {flex:1;min-width:0;font-size:12px;line-height:1.6;}
.cuigengji .chapter-main .savebar > div > span {display:block;}
.cuigengji .auto-savebar {padding-top:8px;padding-bottom:8px;}
.cuigengji .auto-savebar > div {display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.cuigengji .history-session {border-bottom:1px solid var(--dsw-alias-border-l1,#dde0e6);}
.cuigengji .flow-context {display:flex;align-items:flex-start;gap:8px;margin:16px 0 24px;padding:12px;background:var(--dsw-alias-bg-layer-1,#f6f7fa);border-radius:8px;}
.cuigengji .flow-context > div {flex:1;min-width:0;}
.cuigengji .flow-context small {display:block;color:var(--dsw-alias-label-secondary,#737780);margin-bottom:6px;}
.cuigengji .flow-context strong {display:block;overflow-wrap:anywhere;}
.cuigengji .flow-context button {display:block;width:100%;text-align:left;border:0;background:transparent;font-size:12px;padding:4px;overflow-wrap:anywhere;}
.cuigengji .flow-context p {font-size:12px;color:var(--dsw-alias-label-secondary,#737780);margin:4px 0;}
.cuigengji .planning-state {display:block;font-size:11px;color:var(--dsw-alias-label-secondary,#737780);margin:8px 0 0;}
.cuigengji .planning-state.state-selected {color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .planning-state.state-dropped {text-decoration:line-through;}
.cuigengji .chapter-toolbar .inline-field {gap:4px;white-space:nowrap;}
.cuigengji .chapter-toolbar .inline-field select {border-color:transparent;}
.cuigengji .chapter-title-row .menu>summary {font-size:20px;line-height:20px;}
.cuigengji .directory-heading {margin:0 0 16px;gap:4px;}
.cuigengji .directory-heading h2 {margin:0;}
@container(max-width:759px) {
 .cuigengji .chapter-directory .directory-heading > .icon-button {display:none;}
 .cuigengji .directory-collapsed.show-directory .chapter-directory {padding:16px;}
 .cuigengji .directory-collapsed.show-directory .chapter-directory > :not(.directory-heading) {display:block;}
 .cuigengji .directory-collapsed.show-directory .directory-heading {flex-direction:row;}
 .cuigengji .directory-collapsed.show-directory .directory-heading h2,.cuigengji .directory-collapsed.show-directory .directory-heading > .primary {display:block;}
 .cuigengji .chapter-main .editor-scroll {padding:20px 12px;}
 .cuigengji .chapter-main .manuscript {padding-left:8px;padding-right:8px;}
 .cuigengji .chapter-toolbar {gap:8px;}
}
` + visualStyles + selectStyles + graphStyles;

// src/client/dialog.tsx
var import_react3 = require("react");

// src/client/locale.js
var import_react2 = require("react");
var LocaleContext = (0, import_react2.createContext)(null);
var zh = { title: "\u50AC\u66F4\u59EC", open: "\u6253\u5F00\u5C0F\u8BF4\u76EE\u5F55\u3001\u6B63\u6587\u548C\u8BBE\u5B9A", chapters: "\u5377\u7AE0\u6B63\u6587", memory: "\u4E16\u754C\u4E0E\u4EBA\u7269", plan: "\u60C5\u8282\u89C4\u5212", context: "\u53C2\u8003\u8D44\u6599", manage: "\u5C0F\u8BF4\u7BA1\u7406", create: "\u65B0\u5EFA\u5C0F\u8BF4", refresh: "\u5237\u65B0", choose: "\u9009\u62E9\u672C\u4F1A\u8BDD\u7684\u5C0F\u8BF4", saving: "\u6B63\u5728\u4FDD\u5B58\u2026", unbound: "\u7ED1\u5B9A\u4E00\u672C\u5C0F\u8BF4\u540E\uFF0C\u5728 DSH \u5BF9\u8BDD\u4E2D\u8BA8\u8BBA\u3001\u5199\u4F5C\u548C\u4FEE\u6539\u3002\u4E0D\u540C\u4F1A\u8BDD\u53EF\u5171\u540C\u4F7F\u7528\u4E00\u672C\u5C0F\u8BF4\u3002", cancel: "\u53D6\u6D88", confirm: "\u786E\u5B9A" };
var en = { title: "Cuigengji", open: "Open novel, chapters and world settings", chapters: "Chapters", memory: "World & characters", plan: "Plot plan", context: "References", manage: "Manage novel", create: "New novel", refresh: "Refresh", choose: "Select a novel for this session", saving: "Saving\u2026", unbound: "Bind a novel to discuss, write and revise it in DSH. Sessions can share a novel.", cancel: "Cancel", confirm: "Confirm" };
function registerLocale(ctx) {
  ctx.effect(() => ctx.locale.register("cuigengji", { zh, en }));
  return ctx.locale.bind("cuigengji");
}
var noopSubscribe = () => () => {
};
var emptySnapshot = () => null;
function useText() {
  const locale = (0, import_react2.useContext)(LocaleContext);
  (0, import_react2.useSyncExternalStore)(
    locale ? (fn) => locale.subscribe(fn) : noopSubscribe,
    locale ? () => locale.getSnapshot() : emptySnapshot
  );
  return locale ? locale.bind("cuigengji") : (key2) => zh[key2] || key2;
}

// src/client/dialog.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var DialogContext = (0, import_react3.createContext)(null);
var useDialog = () => {
  const value = (0, import_react3.useContext)(DialogContext);
  if (!value) throw new Error("DialogProvider is required");
  return value;
};
function DialogProvider({ children }) {
  const t = useText();
  const [dialog, setDialog] = (0, import_react3.useState)(null);
  const pending = (0, import_react3.useRef)(null);
  const element = (0, import_react3.useRef)(null);
  const finish = (0, import_react3.useCallback)((value) => {
    const current = pending.current;
    pending.current = null;
    setDialog(null);
    current?.resolve(value);
  }, []);
  const request = (0, import_react3.useCallback)((kind2, label, value = "") => new Promise((resolve) => {
    pending.current?.resolve(pending.current.kind === "prompt" ? null : false);
    pending.current = { kind: kind2, resolve };
    setDialog({ kind: kind2, label, value });
  }), []);
  (0, import_react3.useEffect)(() => () => {
    pending.current?.resolve(pending.current.kind === "prompt" ? null : false);
    pending.current = null;
  }, []);
  (0, import_react3.useEffect)(() => {
    if (dialog && element.current && !element.current.open) element.current.showModal();
  }, [dialog]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(DialogContext.Provider, { value: { ask: (label, value = "") => request("prompt", label, value), confirm: (label) => request("confirm", label) }, children: [
    children,
    dialog && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "dialog",
      {
        ref: element,
        className: "cuigengji cuigengji-dialog",
        "aria-label": dialog.label,
        onCancel: (event) => {
          event.preventDefault();
          finish(dialog.kind === "prompt" ? null : false);
        },
        children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("form", { onSubmit: (event) => {
          event.preventDefault();
          finish(dialog.kind === "prompt" ? dialog.value : true);
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: dialog.label }),
          dialog.kind === "prompt" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { autoFocus: true, "aria-label": "\u8F93\u5165\u503C", value: dialog.value, onChange: (event) => setDialog((current) => current && { ...current, value: event.target.value }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", autoFocus: dialog.kind === "confirm", onClick: () => finish(dialog.kind === "prompt" ? null : false), children: t("cancel") }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "submit", children: t("confirm") })
          ] })
        ] })
      }
    )
  ] });
}

// src/client/shared/detail-page.tsx
var import_react4 = require("react");
var import_react_dom = require("react-dom");
var import_jsx_runtime3 = require("react/jsx-runtime");
function OverviewPage({ active, children }) {
  const root = (0, import_react4.useRef)(null);
  const positions = (0, import_react4.useRef)(/* @__PURE__ */ new Map());
  const focus = (0, import_react4.useRef)(null);
  const wasActive = (0, import_react4.useRef)(active);
  (0, import_react4.useLayoutEffect)(() => {
    if (active && !wasActive.current) {
      positions.current.forEach((position, element) => {
        if (root.current?.contains(element)) element.scrollTo(position.left, position.top);
        else positions.current.delete(element);
      });
      if (focus.current && root.current?.contains(focus.current)) focus.current.focus({ preventScroll: true });
    }
    wasActive.current = active;
  }, [active]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "div",
    {
      ref: root,
      className: "overview-page",
      hidden: !active,
      onFocusCapture: (event) => {
        focus.current = event.target;
      },
      onScrollCapture: (event) => {
        if (!active) return;
        const element = event.target;
        positions.current.set(element, { top: element.scrollTop, left: element.scrollLeft });
      },
      children
    }
  );
}
function useDetailTrail(current) {
  const [trail, setTrail] = (0, import_react4.useState)([]);
  const [lastOpened, setLastOpened] = (0, import_react4.useState)(current);
  return {
    previous: trail.at(-1),
    lastOpened,
    visit(id) {
      if (current && current !== id) setTrail((items) => [...items, current]);
      setLastOpened(id);
    },
    back(id) {
      setTrail((items) => items.slice(0, -1));
      setLastOpened(id);
    },
    clear() {
      setTrail([]);
    }
  };
}
var ActionSlot = (0, import_react4.createContext)(null);
function DetailActions({ children }) {
  const slot = (0, import_react4.useContext)(ActionSlot);
  return slot ? (0, import_react_dom.createPortal)(children, slot) : null;
}
function DetailPage({ className, backLabel, onBack, children }) {
  const [slot, setSlot] = (0, import_react4.useState)(null);
  const back = (0, import_react4.useRef)(null);
  (0, import_react4.useLayoutEffect)(() => {
    back.current?.focus({ preventScroll: true });
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("section", { className: `detail-page ${className}`, "aria-label": "\u6761\u76EE\u8BE6\u60C5", children: [
    /* @__PURE__ */ (0, import_jsx_runtime3.jsxs)("header", { className: "detail-bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("button", { ref: back, className: "detail-back", onClick: onBack, children: backLabel }),
      /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "detail-actions", ref: setSlot })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "detail-scroll", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: "detail-document", children: /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(ActionSlot.Provider, { value: slot, children }) }) })
  ] });
}

// src/client/shared/workspace.tsx
var import_react5 = require("react");
var import_jsx_runtime4 = require("react/jsx-runtime");
function DocumentTextarea(props) {
  const ref = (0, import_react5.useRef)(null);
  const fit = () => {
    const el = ref.current;
    if (el) {
      el.style.height = "0px";
      el.style.height = `${el.scrollHeight}px`;
    }
  };
  (0, import_react5.useLayoutEffect)(fit, [props.value]);
  (0, import_react5.useLayoutEffect)(() => {
    const el = ref.current;
    if (!el) return;
    let width = 0;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0].contentRect.width;
      if (next !== width) {
        width = next;
        fit();
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("textarea", { ...props, ref, style: { ...props.style, overflow: "hidden", resize: "none" } });
}
function ViewSwitch({ value, change, graph }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("div", { className: "segmented", "aria-label": "\u663E\u793A\u65B9\u5F0F", children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { "aria-pressed": value === "list", onClick: () => change("list"), children: "\u5217\u8868" }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("button", { "aria-pressed": value === "canvas", onClick: () => change("canvas"), children: graph })
  ] });
}
function FilterControl({ label, value, change, children }) {
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsxs)("label", { className: `filter-control ${value ? "is-active" : ""}`, children: [
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "filter-prefix", children: label }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("select", { "aria-label": label, value, onChange: (e) => change(e.target.value), children }),
    /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { className: "filter-chevron", "aria-hidden": "true" })
  ] });
}

// src/client/shared/creation.tsx
var import_react8 = require("react");

// src/client/shared/drafts.js
var draftKey = (scope, entity) => `cuigengji:draft:v2:${scope}:${entity}`;
var changed = (state) => JSON.stringify(state.value) !== JSON.stringify(state.base);
function restoreDraft(storage, key2, initial) {
  try {
    const cached = JSON.parse(storage.getItem(key2));
    if (cached && cached.base && cached.value && typeof cached.base === "object" && typeof cached.value === "object" && Number.isSafeInteger(cached.base.revision ?? 0)) return cached;
  } catch {
  }
  return { base: initial, value: initial };
}
function persistDraft(storage, key2, state) {
  if (changed(state)) storage.setItem(key2, JSON.stringify(state));
  else storage.removeItem(key2);
}
function rebaseDraft(state, server) {
  return { base: server, value: { ...server, ...state.value, revision: server.revision, contentHash: server.contentHash } };
}

// src/client/shared/state.js
var import_react6 = require("react");
var memoryDrafts = /* @__PURE__ */ new Map();
function initialDraft(key2, entityKey, initial) {
  if (memoryDrafts.has(key2)) return memoryDrafts.get(key2);
  if (typeof localStorage === "undefined") return { base: initial, value: initial };
  const match = /^([^:]+):chapter:(.+)$/.exec(entityKey);
  try {
    if (match && localStorage.getItem(key2) === null && !localStorage.getItem(`${key2}:migrated`)) {
      const old = JSON.parse(localStorage.getItem(`cuigengji:draft:${match[1]}:${match[2]}`));
      if (old?.base && typeof old.content === "string") {
        persistDraft(localStorage, key2, { base: old.base, value: { ...old.base, content: old.content, title: old.title ?? old.base.title, volumeId: old.volumeId ?? old.base.volumeId } });
      }
      localStorage.setItem(`${key2}:migrated`, "true");
    }
  } catch {
  }
  return restoreDraft(localStorage, key2, initial);
}
var SessionScope = (0, import_react6.createContext)("local");
function readLocal(key2, fallback) {
  try {
    const value = localStorage.getItem(key2);
    return value === null ? fallback : JSON.parse(value);
  } catch {
    return fallback;
  }
}
function usePreference(name, fallback) {
  const scope = (0, import_react6.useContext)(SessionScope);
  const key2 = `cuigengji:ui:${scope}:${name}`;
  const [value, setValue] = (0, import_react6.useState)(() => readLocal(key2, fallback));
  const update = (next) => setValue((previous) => {
    const value2 = typeof next === "function" ? next(previous) : next;
    try {
      localStorage.setItem(key2, JSON.stringify(value2));
    } catch {
    }
    return value2;
  });
  return [value, update];
}
function useDraft(entityKey, initial) {
  const scope = (0, import_react6.useContext)(SessionScope);
  const key2 = draftKey(scope, entityKey);
  const [state, setState] = (0, import_react6.useState)(() => initialDraft(key2, entityKey, initial));
  const [cacheError, setCacheError] = (0, import_react6.useState)("");
  const current = (0, import_react6.useRef)(state);
  current.current = state;
  const dirty = JSON.stringify(state.value) !== JSON.stringify(state.base);
  const persist = (next) => {
    if (JSON.stringify(next.value) === JSON.stringify(next.base)) memoryDrafts.delete(key2);
    else memoryDrafts.set(key2, next);
    try {
      persistDraft(localStorage, key2, next);
      setCacheError("");
    } catch {
      setCacheError("\u672C\u5730\u8349\u7A3F\u7F13\u5B58\u5931\u8D25\uFF0C\u8BF7\u5148\u4FDD\u5B58\u518D\u79BB\u5F00\u3002");
    }
  };
  const change = (next) => {
    const value = typeof next === "function" ? next(current.current.value) : next;
    const updated = { ...current.current, value };
    current.current = updated;
    setState(updated);
    persist(updated);
  };
  const accept = (value) => {
    const next = { base: value, value };
    current.current = next;
    setState(next);
    persist(next);
  };
  (0, import_react6.useEffect)(() => {
    const warn = (event) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const rebase = (server) => {
    const next = rebaseDraft(current.current, server);
    current.current = next;
    setState(next);
    persist(next);
  };
  return { value: state.value, base: state.base, change, accept, rebase, dirty, cacheError };
}
function useResource(loader, deps) {
  const [state, setState] = (0, import_react6.useState)({ value: null, error: "", loading: true });
  const [retry, setRetry] = (0, import_react6.useState)(0);
  (0, import_react6.useEffect)(() => {
    let live = true;
    setState((s) => ({ ...s, loading: true, error: "" }));
    Promise.resolve().then(loader).then((value) => live && setState({ value, loading: false, error: "" }), (error) => live && setState((s) => ({ ...s, loading: false, error: error.message || String(error) })));
    return () => {
      live = false;
    };
  }, [...deps, retry]);
  return { ...state, retry: () => setRetry((n) => n + 1) };
}
function useScrollPosition(name) {
  const scope = (0, import_react6.useContext)(SessionScope);
  const ref = (0, import_react6.useRef)(null);
  const key2 = `cuigengji:scroll:${scope}:${name}`;
  (0, import_react6.useEffect)(() => {
    const element = ref.current;
    if (!element) return;
    element.scrollTop = readLocal(key2, 0);
    let timer;
    const save = () => {
      try {
        localStorage.setItem(key2, JSON.stringify(element.scrollTop));
      } catch {
      }
    };
    const scroll = () => {
      clearTimeout(timer);
      timer = setTimeout(save, 150);
    };
    element.addEventListener("scroll", scroll);
    return () => {
      clearTimeout(timer);
      save();
      element.removeEventListener("scroll", scroll);
    };
  }, [key2]);
  return ref;
}

// src/client/shared/groups.tsx
var import_react7 = require("react");
var import_jsx_runtime5 = require("react/jsx-runtime");
var filterGroup = (value) => value === "__ungrouped" ? null : value || void 0;
function GroupSelect({ groups, value, onChange }) {
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("label", { children: [
    "\u5206\u7EC4",
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("select", { value: value || "", onChange: (e) => onChange(e.target.value || null), children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "", children: "\u672A\u5206\u7EC4" }),
      groups.map((g) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: g.id, children: g.name }, g.id))
    ] })
  ] });
}
function Groups({ groups, value, onChange, prefix, novelId, busy, call, run }) {
  const { ask, confirm } = useDialog();
  const selected = groups.find((g) => g.id === value);
  const mutate = (action, args) => call(`${prefix}.group.${action}`, { novelId, requestId: crypto.randomUUID(), ...args });
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "group-toolbar", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(FilterControl, { label: prefix === "planning" ? "\u89C4\u5212\u5206\u7EC4" : "\u8BBE\u5B9A\u5206\u7EC4", value, change: onChange, children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "", children: "\u5168\u90E8\u5206\u7EC4" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: "__ungrouped", children: "\u672A\u5206\u7EC4" }),
      groups.map((g) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("option", { value: g.id, children: g.name }, g.id))
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "group-new", disabled: busy, onClick: async () => {
      const name = await ask("\u65B0\u5EFA\u5206\u7EC4\u540D\u79F0");
      if (name?.trim()) run(async () => {
        const group = await mutate("create", { name });
        onChange(group.id);
      });
    }, children: "\uFF0B \u65B0\u5EFA\u5206\u7EC4" }),
    selected && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("details", { className: "menu", children: [
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("summary", { "aria-label": "\u7BA1\u7406\u5206\u7EC4", children: "\xB7\xB7\xB7" }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: "menu-panel", children: selected && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { disabled: busy, onClick: async () => {
          const name = await ask("\u5206\u7EC4\u540D\u79F0", selected.name);
          if (name?.trim()) run(() => mutate("update", { groupId: selected.id, expectedRevision: selected.revision, name }));
        }, children: "\u91CD\u547D\u540D" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { disabled: busy, onClick: async () => {
          const summary = await ask("\u5206\u7EC4\u63CF\u8FF0", selected.summary);
          if (summary !== null) run(() => mutate("update", { groupId: selected.id, expectedRevision: selected.revision, summary }));
        }, children: "\u7F16\u8F91\u63CF\u8FF0" }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { className: "danger", disabled: busy, onClick: async () => {
          if (await confirm(`\u5220\u9664\u5206\u7EC4\u201C${selected.name}\u201D\uFF1F\u5185\u5BB9\u5C06\u4FDD\u7559\u5728\u672A\u5206\u7EC4\u4E2D\u3002`)) run(async () => {
            await mutate("delete", { groupId: selected.id, expectedRevision: selected.revision, confirm: true });
            onChange("__ungrouped");
          });
        }, children: "\u5220\u9664\u5206\u7EC4" })
      ] }) })
    ] })
  ] });
}
function MoveSelection({ count, groups, busy, onMove, clear }) {
  const [target, setTarget] = (0, import_react7.useState)(null);
  if (!count) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: "batch-toolbar", children: [
    /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { children: [
      "\u5DF2\u9009 ",
      count,
      " \u9879"
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(GroupSelect, { groups, value: target, onChange: setTarget }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { disabled: busy, onClick: () => onMove(target), children: "\u79FB\u52A8" }),
    /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { disabled: busy, onClick: clear, children: "\u53D6\u6D88\u9009\u62E9" })
  ] });
}

// src/client/shared/creation.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
function CreateDocument({ draftKey: draftKey2, label, initial, groups, busy, context, chapter, close, createGroup, save }) {
  const { value, change, accept, dirty, cacheError } = useDraft(draftKey2, initial);
  const request = (0, import_react8.useRef)({ payload: "", id: "" });
  const submit = async () => {
    const payload = JSON.stringify(value);
    if (request.current.payload !== payload) request.current = { payload, id: crypto.randomUUID() };
    if (await save(value, request.current.id)) {
      accept(initial);
      close();
    }
  };
  const { ask, confirm } = useDialog();
  const set = (field, next) => change((old) => ({ ...old, [field]: next }));
  const cancel = async () => {
    if (!dirty || await confirm("\u53D6\u6D88\u65B0\u5EFA\u5E76\u4E22\u5F03\u8FD9\u4EFD\u8349\u7A3F\uFF1F")) {
      accept(initial);
      close();
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("section", { className: "creation", children: [
    /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("header", { className: "creation-bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { disabled: busy, onClick: cancel, children: "\u2039 \u53D6\u6D88" }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { className: "grow", children: label }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("button", { className: "primary", disabled: busy || !value.title.trim(), onClick: submit, children: "\u521B\u5EFA" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("div", { className: "creation-scroll", children: /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "creation-document", children: [
      context && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { className: "creation-context", children: context }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("div", { className: "creation-settings", children: [
        chapter ? /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { children: [
          "\u6240\u5C5E\u5377",
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("select", { value: value.groupId || "", onChange: (e) => set("groupId", e.target.value || null), children: [
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: "", children: "\u672A\u5206\u5377" }),
            groups.map((g) => /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("option", { value: g.id, children: g.name }, g.id))
          ] })
        ] }) : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(GroupSelect, { groups, value: value.groupId, onChange: (id) => set("groupId", id) }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("button", { disabled: busy, onClick: async () => {
          const name = await ask(chapter ? "\u65B0\u5377\u540D\u79F0" : "\u65B0\u5EFA\u5206\u7EC4\u540D\u79F0");
          if (name?.trim()) {
            const g = await createGroup(name);
            if (g) set("groupId", g.id);
          }
        }, children: [
          "\uFF0B ",
          chapter ? "\u65B0\u5EFA\u5377" : "\u65B0\u5EFA\u5206\u7EC4"
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("fieldset", { className: "editor-fields document-fields", disabled: busy, children: [
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { children: [
          "\u6807\u9898",
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("input", { autoFocus: true, placeholder: "\u5199\u4E00\u4E2A\u6E05\u6670\u7684\u6807\u9898", value: value.title, onChange: (e) => set("title", e.target.value) })
        ] }),
        !chapter && /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
            "\u6458\u8981 ",
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("small", { children: "\u53EF\u9009" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(DocumentTextarea, { placeholder: "\u7528\u51E0\u53E5\u8BDD\u6982\u62EC\uFF0C\u65B9\u4FBF\u4E4B\u540E\u67E5\u627E", value: value.summary, onChange: (e) => set("summary", e.target.value) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("label", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime6.jsxs)("span", { children: [
            "\u6B63\u6587 ",
            /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("small", { children: "\u53EF\u9009" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(DocumentTextarea, { className: "prose", placeholder: "\u4ECE\u8FD9\u91CC\u5F00\u59CB\uFF0C\u81EA\u7531\u8BB0\u5F55\u5185\u5BB9\u2026", value: value.content, onChange: (e) => set("content", e.target.value) })
        ] })
      ] }),
      cacheError && /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("p", { role: "alert", children: cacheError })
    ] }) })
  ] });
}

// src/client/features/memory/RelationCanvas.tsx
var import_react10 = require("react");

// src/client/shared/graph.tsx
var import_react9 = require("react");
var import_jsx_runtime7 = require("react/jsx-runtime");
var CARD_WIDTH = 224;
var PORT_Y = 60;
function curve(from, to) {
  const reach = Math.max(60, Math.abs(to.x - from.x) * 0.45);
  return `M${from.x},${from.y} C${from.x + reach},${from.y} ${to.x - reach},${to.y} ${to.x},${to.y}`;
}
function canJoin(edges, from, to, acyclic = false) {
  if (from === to || edges.some((e) => e.from === from && e.to === to)) return false;
  if (!acyclic) return true;
  const seen = /* @__PURE__ */ new Set(), pending = [to];
  while (pending.length) {
    const id = pending.pop();
    if (id === from) return false;
    if (seen.has(id)) continue;
    seen.add(id);
    for (const e of edges) if (e.from === id && e.type !== "requires") pending.push(e.to);
  }
  return true;
}
function GraphStatus({ graph, busy }) {
  if (graph.failed) return /* @__PURE__ */ (0, import_jsx_runtime7.jsxs)("span", { className: "graph-save-error", role: "alert", children: [
    "\u5E03\u5C40\u672A\u4FDD\u5B58",
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { disabled: busy || graph.saving, onClick: graph.retry, children: "\u91CD\u8BD5" }),
    /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("button", { disabled: busy || graph.saving, onClick: graph.discard, children: "\u8FD8\u539F\u5E03\u5C40" })
  ] });
  if (graph.saving) return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("small", { role: "status", children: "\u6B63\u5728\u4FDD\u5B58\u2026" });
  if (graph.wire) return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("small", { role: "status", children: "\u8FDE\u63A5\u5230\u9AD8\u4EAE\u7684\u8FDE\u63A5\u70B9 \xB7 Esc \u53D6\u6D88" });
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)("small", { className: "graph-hint", children: "\u62D6\u52A8\u5361\u7247 \xB7 \u62D6\u52A8\u5706\u70B9\u8FDE\u7EBF" });
}
function useGraph({ nodes, edges, fallback, busy, acyclic, onLayout, onConnect }) {
  const scroll = (0, import_react9.useRef)(null), surface = (0, import_react9.useRef)(null);
  const [local, setLocal] = (0, import_react9.useState)({}), [zoom, setZoom] = (0, import_react9.useState)(1), [wire, setWire] = (0, import_react9.useState)(null), [selectedEdge, setSelectedEdge] = (0, import_react9.useState)(null);
  const [saving, setSaving] = (0, import_react9.useState)(false), [failed, setFailed] = (0, import_react9.useState)(false), [dragging, setDragging] = (0, import_react9.useState)(false);
  const [awaiting, setAwaiting] = (0, import_react9.useState)(null);
  const [awaitingLink, setAwaitingLink] = (0, import_react9.useState)(null);
  const pending = saving || awaiting !== null || awaitingLink !== null;
  const gesture = (0, import_react9.useRef)(null), wireRef = (0, import_react9.useRef)(null), locked = (0, import_react9.useRef)(false), suppress = (0, import_react9.useRef)(false);
  const pointer = (0, import_react9.useRef)(null), frame = (0, import_react9.useRef)(null), step = (0, import_react9.useRef)(() => {
  });
  const points = Object.fromEntries(nodes.map((n) => [n.id, local[n.id] || n.position || fallback[n.id]]));
  const updateWire = (value) => {
    wireRef.current = value;
    setWire(value);
  };
  const endpoint = (id, side) => ({ x: points[id].x + (side === "out" ? CARD_WIDTH : 0), y: points[id].y + PORT_Y });
  const clientPoint = (x, y) => {
    const rect = surface.current.getBoundingClientRect();
    return { x: (x - rect.left) / zoom, y: (y - rect.top) / zoom };
  };
  const valid = (id, side) => {
    const current = wireRef.current;
    if (!current || current.side === side) return false;
    const [from, to] = current.side === "out" ? [current.id, id] : [id, current.id];
    return canJoin(edges, from, to, acyclic);
  };
  const targetAt = (x, y) => {
    const port = document.elementFromPoint(x, y)?.closest("[data-graph-port]");
    if (!port || !surface.current?.contains(port)) return null;
    return valid(port.dataset.nodeId, port.dataset.graphPort) ? port.dataset.nodeId : null;
  };
  const cancel = () => {
    const g = gesture.current;
    if (g?.kind === "card") {
      suppress.current = g.moved;
      setLocal((old) => {
        const next = { ...old };
        if (g.previous) next[g.id] = g.previous;
        else delete next[g.id];
        return next;
      });
    }
    gesture.current = null;
    pointer.current = null;
    setDragging(false);
    updateWire(null);
    setSelectedEdge(null);
  };
  (0, import_react9.useEffect)(() => {
    const key2 = (e) => {
      if (e.target.closest("input,textarea,select,[contenteditable=true]")) return;
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", key2);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", key2);
      window.removeEventListener("blur", cancel);
    };
  }, []);
  (0, import_react9.useEffect)(() => {
    const ids = new Set(nodes.map((n) => n.id));
    setLocal((previous) => Object.fromEntries(Object.entries(previous).filter(([id, p]) => {
      const n = nodes.find((n2) => n2.id === id);
      return ids.has(id) && (gesture.current?.kind === "card" && gesture.current.id === id || n?.position?.x !== p.x || n?.position?.y !== p.y);
    })));
    if (wireRef.current && !ids.has(wireRef.current.id)) updateWire(null);
  }, [nodes]);
  (0, import_react9.useEffect)(() => {
    if (awaiting && Object.entries(awaiting).every(([id, revision]) => !nodes.some((n) => n.id === id) || nodes.some((n) => n.id === id && n.revision > revision))) {
      setLocal((old) => Object.fromEntries(Object.entries(old).filter(([id]) => !(id in awaiting))));
      setAwaiting(null);
      locked.current = false;
    }
  }, [nodes, awaiting]);
  (0, import_react9.useEffect)(() => {
    if (awaitingLink && edges.some((e) => e.from === awaitingLink.from && e.to === awaitingLink.to)) {
      setAwaitingLink(null);
      locked.current = false;
    }
  }, [edges, awaitingLink]);
  (0, import_react9.useEffect)(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
  }, []);
  const save = async (changes, persist = onLayout, revisions = Object.fromEntries(nodes.filter((n) => n.id in changes).map((n) => [n.id, n.revision]))) => {
    if (locked.current || busy) return;
    locked.current = true;
    setSaving(true);
    setFailed(false);
    let succeeded = false;
    try {
      succeeded = await persist(changes) === true;
      if (succeeded) setAwaiting(revisions);
      else setFailed(true);
    } catch {
      setFailed(true);
    } finally {
      if (!succeeded) locked.current = false;
      setSaving(false);
    }
  };
  const connect = async (target) => {
    const current = wireRef.current;
    if (!current || locked.current || busy) return;
    const [from, to] = current.side === "out" ? [current.id, target] : [target, current.id];
    updateWire(null);
    gesture.current = null;
    locked.current = true;
    setSaving(true);
    let succeeded = false;
    try {
      succeeded = await onConnect(from, to) === true;
      if (succeeded) setAwaitingLink({ from, to });
    } catch {
    } finally {
      if (!succeeded) locked.current = false;
      setSaving(false);
    }
  };
  const portProps = (id, side, name) => ({
    "data-graph-port": side,
    "data-node-id": id,
    type: "button",
    "aria-label": `${name}\uFF1A${side === "out" ? "\u8F93\u51FA" : "\u8F93\u5165"}\u8FDE\u63A5\u70B9`,
    title: side === "out" ? "\u62D6\u5230\u53E6\u4E00\u5F20\u5361\u7247\u7684\u8F93\u5165\u70B9\uFF0C\u6216\u4F9D\u6B21\u70B9\u51FB\u8FDE\u63A5\u70B9" : "\u63A5\u6536\u6765\u81EA\u53E6\u4E00\u5F20\u5361\u7247\u7684\u8FDE\u7EBF",
    disabled: busy || pending || failed,
    className: `graph-port port-${side} ${wire ? valid(id, side) ? "port-valid" : wire.id === id ? "port-source" : "port-unavailable" : ""} ${wire?.target === id && valid(id, side) ? "port-target" : ""}`,
    onPointerDown: (e) => {
      e.stopPropagation();
      if (e.button !== 0 || busy || locked.current) return;
      e.preventDefault();
      suppress.current = false;
      if (wireRef.current) {
        if (valid(id, side)) {
          void connect(id);
          return;
        }
        updateWire(null);
        return;
      }
      setSelectedEdge(null);
      updateWire({ id, side, point: endpoint(id, side), target: null });
      gesture.current = { kind: "wire", pointer: e.pointerId, x: e.clientX, y: e.clientY, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onClick: (e) => {
      e.stopPropagation();
      if (e.detail !== 0 || busy || locked.current) return;
      if (wireRef.current) {
        if (valid(id, side)) void connect(id);
        else updateWire(null);
      } else {
        setSelectedEdge(null);
        updateWire({ id, side, point: endpoint(id, side), target: null });
      }
    }
  });
  const cardProps = (id, open) => ({
    onPointerDown: (e) => {
      if (e.button !== 0 || busy || locked.current || failed || wireRef.current || e.target.closest("[data-graph-port]")) return;
      e.preventDefault();
      suppress.current = false;
      setSelectedEdge(null);
      const p = points[id];
      gesture.current = { kind: "card", id, revision: nodes.find((n) => n.id === id).revision, pointer: e.pointerId, x: e.clientX, y: e.clientY, left: scroll.current.scrollLeft, top: scroll.current.scrollTop, start: p, previous: local[id], point: p, moved: false, persist: onLayout };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onClickCapture: (e) => {
      if (suppress.current) {
        e.preventDefault();
        e.stopPropagation();
        suppress.current = false;
      }
    },
    onClick: (e) => {
      if (!busy && !locked.current && !wireRef.current && !e.target.closest("[data-graph-port]")) open();
    }
  });
  const updatePointer = (x, y) => {
    const g = gesture.current;
    if (g?.kind === "pan") {
      scroll.current.scrollLeft = g.left + g.x - x;
      scroll.current.scrollTop = g.top + g.y - y;
      return;
    }
    if (g?.kind === "card") {
      if (!g.moved && Math.hypot(x - g.x, y - g.y) < 4) return;
      g.moved = true;
      suppress.current = true;
      setDragging(true);
      g.point = { x: Math.max(32, g.start.x + (x - g.x + scroll.current.scrollLeft - g.left) / zoom), y: Math.max(60, g.start.y + (y - g.y + scroll.current.scrollTop - g.top) / zoom) };
      setLocal((old) => ({ ...old, [g.id]: g.point }));
      return;
    }
    if (wireRef.current) {
      if (g?.kind === "wire" && Math.hypot(x - g.x, y - g.y) >= 4) g.moved = true;
      updateWire({ ...wireRef.current, point: clientPoint(x, y), target: targetAt(x, y) });
    }
  };
  step.current = () => {
    frame.current = null;
    const el = scroll.current, p = pointer.current, g = gesture.current;
    if (!el || !p || !g || g.kind === "pan" || !g.moved) return;
    const r = el.getBoundingClientRect(), speed = (v, min, max) => v < min + 36 ? -Math.min(12, (min + 36 - v) / 3) : v > max - 36 ? Math.min(12, (v - max + 36) / 3) : 0;
    const left = el.scrollLeft, top = el.scrollTop;
    el.scrollLeft += speed(p.x, r.left, r.right);
    el.scrollTop += speed(p.y, r.top, r.bottom);
    if (left !== el.scrollLeft || top !== el.scrollTop) updatePointer(p.x, p.y);
    frame.current = requestAnimationFrame(() => step.current());
  };
  const move = (e) => {
    if (gesture.current && gesture.current.pointer !== e.pointerId) return;
    pointer.current = { x: e.clientX, y: e.clientY };
    updatePointer(e.clientX, e.clientY);
    if (gesture.current && frame.current === null) frame.current = requestAnimationFrame(() => step.current());
  };
  const up = (e) => {
    const g = gesture.current;
    if (!g || g.pointer !== e.pointerId) return;
    gesture.current = null;
    pointer.current = null;
    setDragging(false);
    if (g.kind === "card" && g.moved) void save({ [g.id]: g.point }, g.persist, { [g.id]: g.revision });
    if (g.kind === "wire" && g.moved) {
      const target = targetAt(e.clientX, e.clientY);
      if (target) void connect(target);
      else updateWire(null);
    }
  };
  const zoomTo = (next) => {
    const el = scroll.current;
    if (!el || gesture.current) return;
    const clamped = Math.max(0.35, Math.min(1.8, next));
    const x = (el.scrollLeft + el.clientWidth / 2) / zoom, y = (el.scrollTop + el.clientHeight / 2) / zoom;
    setZoom(clamped);
    requestAnimationFrame(() => {
      el.scrollLeft = x * clamped - el.clientWidth / 2;
      el.scrollTop = y * clamped - el.clientHeight / 2;
    });
  };
  (0, import_react9.useEffect)(() => {
    const el = scroll.current;
    if (!el) return;
    const wheel = (e) => {
      if (e.defaultPrevented || !e.deltaY) return;
      const target = e.target instanceof Element ? e.target : null;
      if (target?.closest("input,textarea,select,[contenteditable=true],[role=menu],.menu-panel,.graph-context-menu")) return;
      for (let node = target; node && node !== el; node = node.parentElement) {
        if (node.scrollHeight > node.clientHeight + 1 && /^(auto|scroll)$/.test(getComputedStyle(node).overflowY)) return;
      }
      e.preventDefault();
      zoomTo(zoom * (e.deltaY > 0 ? 0.9 : 1.1));
    };
    el.addEventListener("wheel", wheel, { passive: false });
    return () => el.removeEventListener("wheel", wheel);
  }, [zoom]);
  const pan = (e) => {
    if (e.button !== 0 && e.button !== 1) return;
    if (e.button === 0 && e.target.closest(".planning-card,[data-graph-drag],.relation-label,.edge-hit,button")) return;
    updateWire(null);
    setSelectedEdge(null);
    e.preventDefault();
    scroll.current?.focus({ preventScroll: true });
    gesture.current = { kind: "pan", pointer: e.pointerId, x: e.clientX, y: e.clientY, left: scroll.current.scrollLeft, top: scroll.current.scrollTop };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const preview = wire && points[wire.id] ? curve(wire.side === "out" ? endpoint(wire.id, "out") : wire.target ? endpoint(wire.target, "out") : wire.point, wire.side === "in" ? endpoint(wire.id, "in") : wire.target ? endpoint(wire.target, "in") : wire.point) : null;
  return {
    scroll,
    surface,
    points,
    zoom,
    zoomTo,
    wire,
    preview,
    selectedEdge,
    setSelectedEdge,
    portProps,
    cardProps,
    saving: pending,
    failed,
    dragging,
    scrollProps: { onPointerDown: pan, onPointerMove: move, onPointerUp: up, onPointerCancel: cancel, tabIndex: 0, "aria-label": "\u753B\u5E03\uFF1A\u6EDA\u8F6E\u7F29\u653E\uFF0C\u62D6\u52A8\u7A7A\u767D\u5904\u5E73\u79FB" },
    cancel,
    retry: () => save(local),
    discard: () => {
      setLocal({});
      setFailed(false);
    },
    arrange: (p) => {
      setLocal(p);
      void save(p);
    }
  };
}

// src/client/features/memory/RelationCanvas.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
function EdgeLabel({ edge: e, x, y, choose }) {
  const text = (0, import_react10.useRef)(null), [expanded, setExpanded] = (0, import_react10.useState)(false), [truncated, setTruncated] = (0, import_react10.useState)(false);
  (0, import_react10.useLayoutEffect)(() => {
    const el = text.current;
    if (el && !expanded) setTruncated(el.scrollHeight > el.clientHeight + 1);
  }, [e.content, expanded]);
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: `relation-label ${expanded ? "expanded" : ""}`, style: { left: x, top: y }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("button", { className: "edge-label-content", title: "\u9009\u62E9\u5173\u7CFB", "aria-label": `\u9009\u62E9\u5173\u7CFB ${e.name || e.content}`, onClick: choose, children: [
      e.name && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("strong", { children: e.name }),
      e.content && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { ref: text, children: e.content })
    ] }),
    (truncated || expanded) && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { className: "expand-edge", onClick: () => setExpanded(!expanded), children: expanded ? "\u6536\u8D77" : "\u5C55\u5F00" })
  ] });
}
function RelationCanvas({ nodes, edges, selected, busy, onSelect, onConnect, onLayout, onEdit, onDelete }) {
  const marker = (0, import_react10.useId)();
  const ordered = [...nodes].sort((a, b) => (a.groupId || "").localeCompare(b.groupId || "") || a.name.localeCompare(b.name));
  const fallback = Object.fromEntries(ordered.map((n, i) => [n.id, { x: 40 + i % 3 * 440, y: 64 + Math.floor(i / 3) * 350 }]));
  const graph = useGraph({ nodes, edges, fallback, busy, onLayout, onConnect });
  const { points, scroll, surface, zoom, zoomTo, selectedEdge: chosen, setSelectedEdge, cancel } = graph;
  const visible = edges.filter((e) => points[e.from] && points[e.to]);
  const occupied = ordered.map((n) => ({ ...points[n.id], width: CARD_WIDTH, height: 156 }));
  const routes = visible.map((e) => {
    const a = points[e.from], b = points[e.to], start = { x: a.x + CARD_WIDTH, y: a.y + PORT_Y }, end = { x: b.x, y: b.y + PORT_Y };
    let x = (start.x + end.x) / 2 - 90, y = (start.y + end.y) / 2 - 36;
    let path = curve(start, end);
    if (e.name || e.content) {
      for (let i = 0; i < 1e3 && occupied.some((r) => x < r.x + r.width + 12 && x + 180 > r.x - 12 && y < r.y + r.height + 12 && y + 74 > r.y - 12); i++) y += 88;
      x = Math.max(12, x);
      y = Math.max(12, y);
      occupied.push({ x, y, width: 180, height: 74 });
      const mx = x + 90, my = y + 36;
      path = `M${start.x},${start.y} C${start.x + 60},${start.y} ${mx - 60},${my} ${mx},${my} C${mx + 60},${my} ${end.x - 60},${end.y} ${end.x},${end.y}`;
    }
    return { edge: e, path, x, y };
  });
  const width = Math.max(800, ...ordered.map((n) => points[n.id].x + 304), ...routes.map((r) => r.x + 240));
  const height = Math.max(440, ...ordered.map((n) => points[n.id].y + 250), ...routes.map((r) => r.y + 140));
  const active = visible.find((e) => e.id === chosen);
  const remove = async () => {
    if (active && !busy && !graph.saving && await onDelete(active)) cancel();
  };
  const choose = (id) => {
    if (!busy) {
      cancel();
      setSelectedEdge(id);
    }
  };
  const fit = () => {
    zoomTo(Math.min(1, (scroll.current?.clientWidth || width) / width, (scroll.current?.clientHeight || height) / height));
    requestAnimationFrame(() => {
      if (scroll.current) {
        scroll.current.scrollLeft = 0;
        scroll.current.scrollTop = 0;
      }
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "row canvas-tools", children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("details", { className: "menu", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("summary", { children: "\u89C6\u56FE" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { className: "menu-panel", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { "aria-label": "\u9002\u5E94\u89C6\u56FE", onClick: fit, children: "\u9002\u5E94\u89C6\u56FE" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { "aria-label": "\u7F29\u5C0F\u753B\u5E03", onClick: () => zoomTo(zoom - 0.1), children: "\u7F29\u5C0F" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { "aria-label": "\u653E\u5927\u753B\u5E03", onClick: () => zoomTo(zoom + 0.1), children: "\u653E\u5927" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("small", { className: "graph-hint", children: [
        Math.round(zoom * 100),
        "%"
      ] }),
      active && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { disabled: busy || graph.saving, onClick: () => onEdit(active), children: "\u7F16\u8F91\u5173\u7CFB" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { disabled: busy || graph.saving, onClick: remove, children: "\u5220\u9664\u8FDE\u7EBF" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { onClick: cancel, children: "\u53D6\u6D88\u9009\u62E9" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(GraphStatus, { graph, busy })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { ref: scroll, className: `planning-canvas-scroll ${graph.dragging ? "graph-dragging" : ""}`, ...graph.scrollProps, onKeyDown: (e) => {
      if (active && (e.key === "Delete" || e.key === "Backspace") && !e.target.closest("input,textarea,select,button")) {
        e.preventDefault();
        void remove();
      }
    }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { width: width * zoom, height: height * zoom }, children: /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { ref: surface, className: "planning-canvas relation-canvas", style: { width, height, transform: `scale(${zoom})`, transformOrigin: "top left" }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("svg", { className: "planning-lines", width, height, "aria-label": "\u8BBE\u5B9A\u5173\u7CFB", children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("marker", { id: marker, markerUnits: "userSpaceOnUse", markerWidth: "8", markerHeight: "8", refX: "7", refY: "4", orient: "auto", children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: "M0 0 L8 4 L0 8", fill: "currentColor" }) }) }),
        routes.map(({ edge: e, path }) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("g", { className: chosen === e.id ? "edge-selected" : "", children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { d: path, fill: "none", markerEnd: `url(#${marker})` }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { className: "edge-hit", d: path, fill: "none", tabIndex: 0, role: "button", "aria-label": `\u5173\u7CFB\uFF1A${nodes.find((n) => n.id === e.from)?.name} \u2192 ${nodes.find((n) => n.id === e.to)?.name}`, "aria-pressed": chosen === e.id, onClick: () => choose(e.id), onKeyDown: (event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              choose(e.id);
            }
          } })
        ] }, e.id)),
        graph.preview && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("path", { className: "graph-preview", d: graph.preview })
      ] }),
      routes.filter((r) => r.edge.name || r.edge.content).map(({ edge: e, x, y }) => /* @__PURE__ */ (0, import_jsx_runtime8.jsx)(EdgeLabel, { edge: e, x, y, choose: () => choose(e.id) }, e.id)),
      ordered.map((n) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("section", { "data-node-id": n.id, ...graph.cardProps(n.id, () => onSelect(n.id)), className: `planning-card ${selected === n.id ? "selected" : ""} ${graph.wire?.id === n.id ? "connect-source" : ""}`, style: { left: points[n.id].x, top: points[n.id].y }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { ...graph.portProps(n.id, "in", n.name) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { ...graph.portProps(n.id, "out", n.name) }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("small", { className: "graph-card-kind", children: n.type === "character_card" ? "\u89D2\u8272\u5361" : "\u4E16\u754C\u4E66" }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { className: "planning-title", children: n.name }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { title: n.summary, children: n.summary || "\u6253\u5F00\u67E5\u770B\u8BBE\u5B9A" })
      ] }, n.id))
    ] }) }) })
  ] });
}

// src/client/features/memory/index.jsx
var import_react13 = __toESM(require("react"), 1);

// src/client/shared/ui.jsx
var import_react11 = __toESM(require("react"), 1);
var import_jsx_runtime9 = require("react/jsx-runtime");
function ResourceState({ resource, children }) {
  if (resource.loading && resource.value === null) return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: "empty", role: "status", children: "\u6B63\u5728\u8BFB\u53D6\u2026" });
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(import_jsx_runtime9.Fragment, { children: [
    resource.error && /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: "notice error", role: "alert", children: [
      resource.error,
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { onClick: resource.retry, children: "\u91CD\u8BD5" })
    ] }),
    children
  ] });
}
function SaveBar({ dirty, busy, error, invalid, onSave, children, label = "\u4FDD\u5B58\u4FEE\u6539" }) {
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("footer", { className: "savebar", children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { role: "status", className: error || invalid ? "error-text" : "muted", children: [
      error || invalid || (dirty ? "\u672C\u5730\u8349\u7A3F \xB7 \u5C1A\u672A\u4FDD\u5B58\u5230\u4F5C\u54C1" : "\u5DF2\u4FDD\u5B58"),
      children
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("button", { className: "primary", disabled: !dirty || busy || !!invalid, onClick: onSave, children: busy ? "\u8BF7\u7A0D\u5019\u2026" : label })
  ] });
}
function saveShortcut(event, save) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
    event.preventDefault();
    event.stopPropagation();
    save();
  }
}

// src/client/features/memory/tavern-import.jsx
var import_react12 = __toESM(require("react"), 1);
var import_jsx_runtime10 = require("react/jsx-runtime");
async function readFile(file) {
  if (file.size > 20 * 1024 * 1024) throw new Error("\u6587\u4EF6\u8D85\u8FC7 20 MB\uFF0C\u8BF7\u7F29\u5C0F\u6587\u4EF6\u540E\u91CD\u8BD5");
  if (/\.png$/i.test(file.name)) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return { pngBase64: btoa(binary), fileName: file.name };
  }
  try {
    return { json: JSON.parse((await file.text()).replace(/^\uFEFF/, "")), fileName: file.name };
  } catch {
    throw new Error("JSON \u65E0\u6CD5\u89E3\u6790\uFF0C\u8BF7\u9009\u62E9\u9152\u9986\u5BFC\u51FA\u7684\u89D2\u8272\u5361\u6216\u4E16\u754C\u4E66\u6587\u4EF6");
  }
}
function TavernImport({ call, novelId, run, busy, onOpen }) {
  const [opened] = (0, import_react12.useState)(true), [resultIds, setResultIds] = (0, import_react12.useState)([]), [preview, setPreview] = (0, import_react12.useState)(null);
  const [input, setInput] = (0, import_react12.useState)(null), [selected, setSelected] = (0, import_react12.useState)([]), [result, setResult] = (0, import_react12.useState)("");
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("section", { className: "card", children: opened && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "muted", children: "\u89D2\u8272\u5361\u652F\u6301 V1/V2 JSON\u3001PNG\uFF1BV3 \u652F\u6301\u901A\u7528\u6587\u672C\u5B57\u6BB5\u3002\u4E16\u754C\u4E66\u652F\u6301 JSON\uFF0C\u89D2\u8272\u5361\u5185\u5D4C\u4E16\u754C\u4E66\u4E5F\u4F1A\u5217\u51FA\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { children: [
      "\u9009\u62E9 JSON \u6216 PNG \u6587\u4EF6",
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("input", { type: "file", accept: ".json,.png,application/json,image/png", disabled: busy, onChange: (e) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        setPreview(null);
        setInput(null);
        setResult("");
        setResultIds([]);
        setSelected([]);
        if (file) run(async () => {
          const value = await readFile(file);
          const p = await call("tavern.preview", { novelId, ...value });
          setInput(value);
          setPreview(p);
          setSelected(p.nodes.map((_, i) => i));
        });
      } })
    ] }),
    preview && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(import_jsx_runtime10.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("h3", { children: [
        "\u5BFC\u5165\u9884\u89C8 \xB7 ",
        preview.nodes.length,
        " \u9879"
      ] }),
      preview.warnings.map((warning, i) => /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { className: "muted", children: warning }, i)),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("p", { children: [
        "\u5DF2\u9009 ",
        selected.length,
        " \u9879\u3002\u5BFC\u5165\u5230\u5F53\u524D\u4F5C\u54C1\uFF0C\u5DF2\u6709\u540C\u540D\u8D44\u6599\u4FDD\u7559\uFF1B\u91CD\u590D\u5BFC\u5165\u540C\u4E00\u4EFD\u6587\u4EF6\u4F1A\u8DF3\u8FC7\u5DF2\u5BFC\u5165\u7684\u6761\u76EE\u3002"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { disabled: busy, onClick: () => setSelected(preview.nodes.map((_, i) => i)), children: "\u5168\u9009" }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { disabled: busy, onClick: () => setSelected([]), children: "\u5168\u4E0D\u9009" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("div", { style: { maxHeight: 320, overflow: "auto" }, children: preview.nodes.map((node, i) => /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "source-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("label", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("input", { type: "checkbox", disabled: busy, checked: selected.includes(i), onChange: (e) => setSelected((v) => e.target.checked ? [...v, i] : v.filter((n) => n !== i)) }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("span", { children: [
            node.name,
            " \xB7 ",
            { character_card: "\u89D2\u8272\u5361", world_book: "\u4E16\u754C\u8BBE\u5B9A", world_entry: "\u4E16\u754C\u8BBE\u5B9A" }[node.type],
            node.status === "retired" ? " \xB7 \u539F\u6587\u4EF6\u5DF2\u7981\u7528" : ""
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("details", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("summary", { children: "\u67E5\u770B\u5185\u5BB9" }),
          /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("pre", { style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" }, children: node.content || "\u65E0\u6B63\u6587" })
        ] })
      ] }, i)) }),
      /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("button", { className: "primary", disabled: busy || !selected.length, onClick: () => run(async () => {
          const response = await call("tavern.import", { novelId, ...input, selected, fingerprint: preview.fingerprint, confirm: true });
          setResultIds(response.nodeIds || []);
          setResult(`\u5BFC\u5165\u5B8C\u6210\uFF1A\u65B0\u589E ${response.imported} \u9879\uFF0C\u8DF3\u8FC7 ${response.skipped} \u9879\u3002\u53EF\u6253\u5F00\u8D44\u6599\u7EE7\u7EED\u7F16\u8F91\u3002Agent \u901A\u8FC7\u5DE5\u5177\u6309\u9700\u67E5\u9605\uFF0C\u4E0D\u4F1A\u81EA\u52A8\u88C5\u5165\u5168\u90E8\u8BBE\u5B9A\u3002`);
          setPreview(null);
          setInput(null);
        }), children: [
          "\u786E\u8BA4\u5BFC\u5165 ",
          selected.length,
          " \u9879"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { disabled: busy, onClick: () => {
          setPreview(null);
          setInput(null);
        }, children: "\u53D6\u6D88" })
      ] })
    ] }),
    result && /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("div", { role: "status", children: [
      /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { children: result }),
      resultIds.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("button", { onClick: () => onOpen?.(resultIds[0]), children: "\u6253\u5F00\u5BFC\u5165\u7684\u8D44\u6599" })
    ] })
  ] }) });
}

// src/client/features/memory/index.jsx
var import_jsx_runtime11 = require("react/jsx-runtime");
var kind = (n) => n.type === "character_card" ? "\u89D2\u8272\u5361" : "\u4E16\u754C\u4E66";
function Memory({ call, novelId, tick, run, busy }) {
  const { preferences } = useWorkbenchPreferences();
  const [view, setView] = (0, import_react13.useState)(preferences.memoryView), [batch, setBatch] = (0, import_react13.useState)(false), [creating, setCreating] = (0, import_react13.useState)(null);
  const [selected, setSelected] = usePreference(`${novelId}:memory-selected`, null);
  const [node, setNode] = (0, import_react13.useState)(null), [edge, setEdge] = (0, import_react13.useState)(null), [query, setQuery] = (0, import_react13.useState)(""), [filter, setFilter] = (0, import_react13.useState)(""), [group, setGroup] = (0, import_react13.useState)(""), [checked, setChecked] = (0, import_react13.useState)([]), [importing, setImporting] = (0, import_react13.useState)(false), [error, setError] = (0, import_react13.useState)(""), [poll, setPoll] = (0, import_react13.useState)(0);
  const request = (0, import_react13.useRef)(0);
  const trail = useDetailTrail(node?.id || null);
  const resource = useResource(() => Promise.all([call("graph.list", { novelId, query, groupId: filterGroup(group) }), call("edge.list", { novelId }), call("graph.groups", { novelId })]), [call, novelId, tick, poll, query, group]);
  const [nodes = [], edges = [], groups = []] = resource.value || [];
  (0, import_react13.useEffect)(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setPoll((v) => v + 1);
    }, 5e3);
    return () => {
      clearInterval(timer);
      request.current++;
    };
  }, []);
  const open = async (id, back = false) => {
    const seq = ++request.current;
    setError("");
    try {
      const data = await call("graph.get", { novelId, nodeId: id });
      if (seq === request.current) {
        if (back) trail.back(id);
        else trail.visit(id);
        setNode(data);
        setSelected(id);
        setEdge(null);
      }
    } catch (e) {
      if (seq === request.current) setError(e.message);
    }
  };
  (0, import_react13.useEffect)(() => {
    if (selected) open(selected);
  }, []);
  const create = (type) => setCreating(type);
  const saved = (n) => {
    if (n) trail.visit(n.id);
    else trail.clear();
    setNode(n);
    setSelected(n?.id || null);
  };
  const all = useResource(() => call("graph.list", { novelId }), [call, novelId, tick, poll]);
  const allNodes = all.value || nodes;
  const related = edges.filter((e) => e.from === node?.id || e.to === node?.id);
  const visible = nodes.filter((n) => !filter || n.type === filter);
  const clear = () => {
    setQuery("");
    setFilter("");
    setGroup("");
  };
  const close = () => {
    if (trail.previous) {
      void open(trail.previous, true);
      return;
    }
    request.current++;
    trail.clear();
    setNode(null);
    setEdge(null);
    setSelected(null);
  };
  const connect = (from, to) => setEdge({ from, to, name: "", content: "" });
  const connectDirect = (from, to) => run(() => call("edge.create", { novelId, from, to, name: "", content: "", requestId: crypto.randomUUID() }));
  const saveLayout = (points) => run(async () => {
    for (const [nodeId, position] of Object.entries(points)) await call("graph.update", { novelId, nodeId, position, expectedRevision: nodes.find((n) => n.id === nodeId)?.revision });
  });
  if (creating) return /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(CreateDocument, { draftKey: `${novelId}:memory-create:${creating}`, label: creating === "character_card" ? "\u65B0\u5EFA\u89D2\u8272\u5361" : "\u65B0\u5EFA\u4E16\u754C\u4E66", initial: { title: "", summary: "", content: "", groupId: filterGroup(group) || null }, ...{ groups, busy }, close: () => setCreating(null), createGroup: async (name) => {
    let result;
    await run(async () => {
      result = await call("graph.group.create", { novelId, name });
    });
    return result;
  }, save: (value, requestId) => run(async () => {
    const n = await call("graph.create", { novelId, requestId, type: creating, name: value.title, summary: value.summary, content: value.content, groupId: value.groupId });
    saved(n);
  }) });
  if (importing) return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { disabled: busy, onClick: () => setImporting(false), children: "\u2039 \u8FD4\u56DE\u8BBE\u5B9A" }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h2", { children: "\u5BFC\u5165\u8BBE\u5B9A" }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(TavernImport, { ...{ call, novelId, run, busy }, onOpen: (id) => {
      setImporting(false);
      open(id);
    } })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "memory-workspace", children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(OverviewPage, { active: !node, children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("header", { className: "module-heading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "module-toolbar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h2", { children: "\u8BBE\u5B9A" }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(ViewSwitch, { value: view, change: setView, graph: "\u5173\u7CFB\u56FE" }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("input", { className: "module-search", "aria-label": "\u641C\u7D22\u8BBE\u5B9A", placeholder: "\u641C\u7D22\u540D\u79F0\u3001\u6458\u8981", value: query, onChange: (e) => setQuery(e.target.value) }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("details", { className: "menu", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("summary", { className: "primary", children: "\u65B0\u5EFA" }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "menu-panel", children: [
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { onClick: () => create("character_card"), children: "\u89D2\u8272\u5361" }),
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { onClick: () => create("world_entry"), children: "\u4E16\u754C\u4E66" })
            ] })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("details", { className: "menu", children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("summary", { "aria-label": "\u8BBE\u5B9A\u66F4\u591A\u64CD\u4F5C", children: "\xB7\xB7\xB7" }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "menu-panel", children: [
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { disabled: busy, onClick: () => setImporting(true), children: "\u5BFC\u5165\u9152\u9986\u8D44\u6599" }),
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { onClick: () => {
                setBatch(!batch);
                setChecked([]);
                setView("list");
              }, children: "\u6279\u91CF\u7BA1\u7406" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "filter-strip", children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Groups, { ...{ groups, busy, call, run, novelId }, prefix: "graph", value: group, onChange: (value) => {
            setGroup(value);
            setChecked([]);
          } }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(FilterControl, { label: "\u7C7B\u578B", value: filter, change: setFilter, children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("option", { value: "", children: "\u5168\u90E8\u7C7B\u578B" }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("option", { value: "character_card", children: "\u89D2\u8272\u5361" }),
            /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("option", { value: "world_entry", children: "\u4E16\u754C\u4E66" })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("small", { className: "scope-count", children: [
            visible.length,
            " \u9879"
          ] }),
          (query || group || filter) && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { className: "clear-filter", onClick: clear, children: "\u6E05\u9664\u7B5B\u9009" }),
          batch && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { onClick: () => {
            setBatch(false);
            setChecked([]);
          }, children: "\u5B8C\u6210\u591A\u9009" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "memory-layout", children: /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "memory-overview", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(MoveSelection, { count: checked.length, ...{ groups, busy }, clear: () => setChecked([]), onMove: (groupId) => run(async () => {
          await call("graph.move", { novelId, groupId, members: checked.map((id) => ({ id, expectedRevision: allNodes.find((n) => n.id === id)?.revision })) });
          setChecked([]);
        }) }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(ResourceState, { resource, children: !visible.length ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "empty", children: query || filter || group ? "\u6CA1\u6709\u5339\u914D\u7684\u8BBE\u5B9A\uFF0C\u8BD5\u8BD5\u8C03\u6574\u7B5B\u9009\u3002" : "\u6DFB\u52A0\u7B2C\u4E00\u5F20\u89D2\u8272\u5361\u6216\u4E16\u754C\u4E66\u3002" }) : view === "canvas" ? /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(RelationCanvas, { nodes: visible, edges, selected: node?.id || trail.lastOpened || null, busy, onSelect: open, onConnect: connectDirect, onLayout: saveLayout, onEdit: setEdge, onDelete: (e) => run(() => call("edge.delete", { novelId, edgeId: e.id, expectedRevision: e.revision, confirm: true })) }, `${group}:${filter}:${query}`) : /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("div", { className: "library-list", children: visible.map((n) => /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "selectable-entry", children: [
          batch && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("input", { type: "checkbox", "aria-label": `\u9009\u62E9 ${n.name}`, checked: checked.includes(n.id), onChange: (e) => setChecked((ids) => e.target.checked ? [...ids, n.id] : ids.filter((id) => id !== n.id)) }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("button", { className: `library-entry ${trail.lastOpened === n.id ? "selected" : ""}`, "aria-current": trail.lastOpened === n.id ? "true" : void 0, onClick: () => open(n.id), children: [
            /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("span", { className: "entry-heading", children: [
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("strong", { children: n.name }),
              /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("small", { children: kind(n) })
            ] }),
            n.summary && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { children: n.summary }),
            n.groupId && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("small", { children: groups.find((g) => g.id === n.groupId)?.name })
          ] })
        ] }, n.id)) }) })
      ] }) })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "notice error", role: "alert", children: error }),
    node && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(DetailPage, { className: "memory-detail", backLabel: trail.previous ? "\u2039 \u8FD4\u56DE\u4E0A\u4E00\u6761" : "\u2039 \u8FD4\u56DE\u8BBE\u5B9A", onBack: close, children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(NodeEditor, { ...{ call, novelId, run, busy, saved, groups }, initial: node, latest: allNodes.find((n) => n.id === node.id) }, node.id || node.type),
      node.id && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("section", { className: "section-fold", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h3", { className: "grow", children: "\u76F8\u5173\u8BBE\u5B9A" }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { disabled: busy || allNodes.length < 2, onClick: () => connect(node.id, allNodes.find((n) => n.id !== node.id)?.id), children: "\u6DFB\u52A0\u5173\u7CFB" })
        ] }),
        related.map((e) => /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "related-entry", children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { onClick: () => open(e.from === node.id ? e.to : e.from), children: allNodes.find((n) => n.id === (e.from === node.id ? e.to : e.from))?.name || "\u8BBE\u5B9A" }),
          e.name && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("small", { children: e.name }),
          e.content && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { children: e.content }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { "aria-label": `\u4FEE\u6539\u5173\u7CFB ${e.name || "\u8FDE\u7EBF"}`, onClick: () => setEdge(e), children: "\xB7\xB7\xB7" })
        ] }, e.id))
      ] })
    ] }, node.id),
    edge && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(Modal, { title: edge.id ? "\u7F16\u8F91\u5173\u7CFB" : "\u6DFB\u52A0\u5173\u7CFB", close: () => setEdge(null), children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(EdgeEditor, { ...{ call, novelId, run, busy }, nodes: allNodes, initial: edge, saved: () => setEdge(null) }, edge.id || `new:${edge.from}:${edge.to}`) })
  ] });
}
function NodeEditor({ call, novelId, run, busy, initial, latest, saved, groups }) {
  const { value, base, change, accept, dirty, cacheError } = useDraft(`${novelId}:node:${initial.id || initial.type + ":new"}`, initial);
  const [editing, setEditing] = (0, import_react13.useState)(!initial.id || dirty);
  const { confirm, ask } = useDialog();
  const set = (key2, v) => change((old) => ({ ...old, [key2]: v }));
  const save = () => {
    if (!value.name.trim() || busy) return;
    run(async () => {
      const result = await call(value.id ? "graph.update" : "graph.create", { novelId, nodeId: value.id, expectedRevision: base.revision, type: value.type === "character_card" ? "character_card" : "world_entry", groupId: value.groupId || null, name: value.name, summary: value.summary || "", content: value.content || "" });
      accept(result);
      saved(result);
      setEditing(false);
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { onKeyDown: (e) => saveShortcut(e, save), children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("h2", { children: value.name || `\u65B0${kind(value)}` }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(DetailActions, { children: /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { onClick: () => setEditing(!editing), children: editing ? "\u9605\u8BFB" : "\u7F16\u8F91" }) }),
    latest && latest.revision !== base.revision && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "notice", children: "\u8BBE\u5B9A\u5DF2\u6709\u65B0\u7248\u672C\uFF0C\u672C\u5730\u8349\u7A3F\u4ECD\u4FDD\u7559\u3002\u4FDD\u5B58\u4F1A\u68C0\u67E5\u51B2\u7A81\u3002" }),
    editing ? /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("fieldset", { disabled: busy, className: "editor-fields document-fields", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { children: [
        "\u7C7B\u578B",
        /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("select", { value: value.type === "character_card" ? "character_card" : "world_entry", onChange: (e) => set("type", e.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("option", { value: "character_card", children: "\u89D2\u8272\u5361" }),
          /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("option", { value: "world_entry", children: "\u4E16\u754C\u4E66" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { className: "creation-settings", children: [
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(GroupSelect, { groups, value: value.groupId, onChange: (id) => set("groupId", id) }),
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { type: "button", disabled: busy, onClick: async () => {
          const name = await ask("\u65B0\u5EFA\u5206\u7EC4\u540D\u79F0");
          if (name?.trim()) run(async () => {
            const g = await call("graph.group.create", { novelId, name });
            set("groupId", g.id);
          });
        }, children: "\uFF0B \u65B0\u5EFA\u5206\u7EC4" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { children: [
        "\u540D\u79F0",
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("input", { value: value.name, onChange: (e) => set("name", e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { children: [
        "\u6458\u8981",
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(DocumentTextarea, { "aria-label": "\u6458\u8981", value: value.summary || "", onChange: (e) => set("summary", e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { children: [
        "\u5168\u6587",
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(DocumentTextarea, { "aria-label": "\u5168\u6587", className: "prose", value: value.content || "", onChange: (e) => set("content", e.target.value) })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)(import_jsx_runtime11.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("p", { className: "document-summary", children: value.summary || "\u6682\u65E0\u6458\u8981" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("article", { className: "document-body", children: value.content || "\u6682\u65E0\u5185\u5BB9" })
    ] }),
    (editing || dirty) && /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(SaveBar, { dirty: dirty || !value.id, ...{ busy }, error: cacheError, invalid: !value.name.trim() ? "\u8BF7\u586B\u5199\u540D\u79F0" : null, onSave: save, label: "\u4FDD\u5B58\u8BBE\u5B9A" }),
    value.id && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("details", { className: "section-fold", children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("summary", { children: "\u66F4\u591A\u64CD\u4F5C" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { disabled: busy, onClick: async () => {
        if (!dirty || await confirm("\u653E\u5F03\u672C\u5730\u8349\u7A3F\u5E76\u8BFB\u53D6\u6700\u65B0\u8BBE\u5B9A\uFF1F")) run(async () => {
          const n = await call("graph.get", { novelId, nodeId: value.id });
          accept(n);
          saved(n);
        });
      }, children: "\u8BFB\u53D6\u6700\u65B0" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { className: "danger", disabled: busy, onClick: async () => {
        if (await confirm(`\u5220\u9664\u201C${value.name}\u201D\u53CA\u5176\u5173\u7CFB\uFF1F`)) run(async () => {
          await call("graph.delete", { novelId, nodeId: value.id, expectedRevision: base.revision, confirm: true });
          accept(initial);
          saved(null);
        });
      }, children: "\u5220\u9664\u8BBE\u5B9A" })
    ] })
  ] });
}
function EdgeEditor({ call, novelId, nodes, run, busy, initial, saved }) {
  const { value: draft, base, change, accept, dirty, cacheError } = useDraft(`${novelId}:edge:${initial.id || `new:${initial.from}:${initial.to}`}`, initial);
  const { confirm, ask } = useDialog();
  const save = () => {
    if (draft.from && draft.to && !busy) run(async () => {
      const e = await call(draft.id ? "edge.update" : "edge.create", { from: draft.from, to: draft.to, name: draft.name, content: draft.content, novelId, edgeId: draft.id, expectedRevision: base.revision });
      accept(e);
      saved(e);
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("div", { onKeyDown: (e) => saveShortcut(e, save), children: [
    /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("fieldset", { disabled: busy, className: "editor-fields", children: [
      [["from", "\u4ECE"], ["to", "\u5230"]].map(([key2, label]) => /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { children: [
        label,
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("select", { value: draft[key2], onChange: (e) => change((d) => ({ ...d, [key2]: e.target.value })), children: nodes.map((n) => /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("option", { value: n.id, children: n.name }, n.id)) })
      ] }, key2)),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { children: [
        "\u5173\u7CFB\u540D\u79F0\uFF08\u53EF\u9009\uFF09",
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("input", { placeholder: "\u4F8B\u5982\uFF1A\u5C45\u4F4F\u4E8E\u3001\u670B\u53CB\u3001\u654C\u5BF9", value: draft.name || "", onChange: (e) => change((d) => ({ ...d, name: e.target.value })) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("label", { children: [
        "\u8BF4\u660E",
        /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(DocumentTextarea, { value: draft.content || "", onChange: (e) => change((d) => ({ ...d, content: e.target.value })) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime11.jsx)(SaveBar, { dirty: dirty || !draft.id, ...{ busy }, error: cacheError, invalid: !draft.from || !draft.to ? "\u8BF7\u9009\u62E9\u5173\u7CFB\u7AEF\u70B9" : null, onSave: save, label: "\u4FDD\u5B58\u5173\u7CFB" }),
    draft.id && /* @__PURE__ */ (0, import_jsx_runtime11.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("summary", { children: "\u66F4\u591A\u64CD\u4F5C" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { disabled: busy, onClick: async () => {
        if (!dirty || await confirm("\u4E22\u5F03\u5173\u7CFB\u8349\u7A3F\u5E76\u8BFB\u53D6\u6700\u65B0\u7248\u672C\uFF1F")) run(async () => {
          const latest = await call("edge.get", { novelId, edgeId: draft.id });
          accept(latest);
          saved(latest);
        });
      }, children: "\u8BFB\u53D6\u6700\u65B0\u5173\u7CFB" }),
      /* @__PURE__ */ (0, import_jsx_runtime11.jsx)("button", { disabled: busy, className: "danger", onClick: async () => {
        if (await confirm("\u5220\u9664\u8FD9\u6761\u5173\u7CFB\uFF1F")) run(async () => {
          await call("edge.delete", { novelId, edgeId: draft.id, expectedRevision: base.revision, confirm: true });
          accept(initial);
          saved(null);
        });
      }, children: "\u5220\u9664\u5173\u7CFB" })
    ] })
  ] });
}

// src/client/features/manage/index.jsx
var import_react14 = __toESM(require("react"), 1);
var import_jsx_runtime12 = require("react/jsx-runtime");
function Manage({ call, novelId, novel, run, busy, onOpen }) {
  const [mode, setMode] = (0, import_react14.useState)(""), [preview, setPreview] = (0, import_react14.useState)(null), [report, setReport] = (0, import_react14.useState)(null), [success, setSuccess] = (0, import_react14.useState)(""), [importedId, setImportedId] = (0, import_react14.useState)(null);
  const { ask } = useDialog();
  const reset = () => {
    setMode("");
    setPreview(null);
    setReport(null);
  };
  const choose = (next) => {
    setMode(next);
    setPreview(null);
    setReport(null);
    setSuccess("");
    setImportedId(null);
  };
  const read2 = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setPreview(null);
    setReport(null);
    setSuccess("");
    setImportedId(null);
    run(async () => {
      const input = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
      if (mode === "legacy") {
        const result = await call("legacy.preview", { input });
        setPreview(result.backup);
        setReport(result.report);
      } else {
        if (input.format !== "cuigengji" || !input.novel) throw new Error("\u4E0D\u662F\u652F\u6301\u7684\u63D2\u4EF6\u5907\u4EFD");
        setPreview(input);
      }
    });
  };
  const download = () => run(async () => {
    const data = await call("novel.export", { novelId });
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${novel?.title || "novel"}.cuigengji.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
    setSuccess("\u5DF2\u751F\u6210\u5E76\u89E6\u53D1\u4E0B\u8F7D\uFF0C\u8BF7\u5728\u6D4F\u89C8\u5668\u4E0B\u8F7D\u5217\u8868\u786E\u8BA4\u3002");
  });
  return /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h2", { children: mode ? mode === "backup" ? "\u6062\u590D\u63D2\u4EF6\u5907\u4EFD" : "\u8FC1\u79FB\u65E7\u9879\u76EE" : "\u4F5C\u54C1\u4E0E\u5907\u4EFD" }),
    !mode ? /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
      novelId && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("section", { className: "section-fold", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("strong", { className: "grow", children: novel?.title }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("button", { disabled: busy, onClick: async () => {
            const title = await ask("\u4F5C\u54C1\u540D\u79F0", novel?.title || "");
            if (title?.trim()) run(async () => {
              const current = await call("novel.get", { novelId });
              await call("novel.update", { novelId, title, expectedRevision: current.revision });
            });
          }, children: "\u91CD\u547D\u540D" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { className: "muted", children: "\u5B8C\u6574\u5907\u4EFD\u5305\u542B\u6B63\u6587\u3001\u5386\u53F2\u3001\u8BBE\u5B9A\u3001\u89C4\u5212\u548C\u9884\u8BBE\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("button", { className: "primary", disabled: busy, onClick: download, children: "\u4E0B\u8F7D\u5B8C\u6574\u5907\u4EFD" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "list action-list", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("button", { disabled: busy, onClick: () => choose("backup"), children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("strong", { children: "\u6062\u590D\u63D2\u4EF6\u5907\u4EFD" }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: "\u4ECE\u672C\u63D2\u4EF6\u5BFC\u51FA\u7684 JSON \u6062\u590D\u4F5C\u54C1" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("button", { disabled: busy, onClick: () => choose("legacy"), children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("strong", { children: "\u8FC1\u79FB\u65E7\u9879\u76EE" }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("span", { children: "\u9884\u89C8\u65E7\u9879\u76EE\u5185\u5BB9\u4E0E\u517C\u5BB9\u62A5\u544A" })
        ] })
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)(import_jsx_runtime12.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("button", { disabled: busy, onClick: reset, children: "\u2039 \u8FD4\u56DE\u7BA1\u7406" }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { className: "muted", children: mode === "backup" ? "\u9009\u62E9\u63D2\u4EF6\u5907\u4EFD\uFF0C\u68C0\u67E5\u4F5C\u54C1\u5185\u5BB9\u540E\u5BFC\u5165\u3002" : "\u9009\u62E9\u5305\u542B\u6B63\u6587\u7684\u65E7\u9879\u76EE JSON\uFF0C\u6838\u5BF9\u8FC1\u79FB\u62A5\u544A\u540E\u5BFC\u5165\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("label", { children: [
        "\u9009\u62E9\u6587\u4EF6",
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("input", { disabled: busy, type: "file", accept: ".json,application/json", onChange: read2 })
      ] }),
      report && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("details", { className: "section-fold", open: true, children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("summary", { children: "\u8FC1\u79FB\u62A5\u544A" }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("p", { children: [
          report.volumes,
          " \u5377 \xB7 ",
          report.chapters,
          " \u7AE0 \xB7 ",
          report.nodes,
          " \u4E2A\u8BBE\u5B9A \xB7 ",
          report.edges,
          " \u6761\u5173\u7CFB"
        ] }),
        report.warnings.map((w, i) => /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { children: w }, i))
      ] }),
      preview && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("section", { className: "section-fold", children: [
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("h3", { children: preview.novel.title }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("p", { children: [
          Object.keys(preview.novel.chapters || {}).length,
          " \u7AE0 \xB7 ",
          Object.keys(preview.novel.nodes || {}).length,
          " \u4E2A\u8BBE\u5B9A \xB7 ",
          Object.keys(preview.novel.planning?.nodes || {}).length,
          " \u4E2A\u89C4\u5212\u8282\u70B9"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("p", { className: "muted", children: "\u65B0\u589E\u4F5C\u54C1\uFF1B\u76F8\u540C\u5185\u5BB9\u8DF3\u8FC7\u3002\u540C ID \u5185\u5BB9\u4E0D\u540C\u4F1A\u62D2\u7EDD\u5BFC\u5165\uFF0C\u539F\u4F5C\u54C1\u4E0D\u88AB\u8986\u76D6\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("button", { className: "primary", disabled: busy, onClick: () => run(async () => {
            const result = await call("novel.import", { backup: preview });
            setImportedId(result.id);
            setSuccess(result.imported ? "\u5BFC\u5165\u5B8C\u6210\u3002" : "\u4F5C\u54C1\u5DF2\u5B58\u5728\uFF0C\u672A\u91CD\u590D\u5BFC\u5165\u3002");
            setPreview(null);
            setReport(null);
          }), children: "\u786E\u8BA4\u5BFC\u5165" }),
          /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("button", { disabled: busy, onClick: () => {
            setPreview(null);
            setReport(null);
          }, children: "\u53D6\u6D88" })
        ] })
      ] })
    ] }),
    success && /* @__PURE__ */ (0, import_jsx_runtime12.jsxs)("div", { className: "notice", role: "status", children: [
      success,
      importedId && /* @__PURE__ */ (0, import_jsx_runtime12.jsx)("button", { disabled: busy, onClick: () => onOpen?.(importedId), children: "\u6253\u5F00\u4F5C\u54C1" })
    ] })
  ] });
}

// src/client/features/work-data/index.tsx
var import_react15 = require("react");
var import_jsx_runtime13 = require("react/jsx-runtime");
function WorkDataPage({ call, run, busy }) {
  const [status, setStatus] = (0, import_react15.useState)(null), [error, setError] = (0, import_react15.useState)(""), [backup, setBackup] = (0, import_react15.useState)(null), [preview, setPreview] = (0, import_react15.useState)(null), [notice, setNotice] = (0, import_react15.useState)("");
  (0, import_react15.useEffect)(() => {
    let active = true;
    call("workspace.status").then((v) => {
      if (active) setStatus(v);
    }).catch((e) => {
      if (active) setError(e.message);
    });
    return () => {
      active = false;
    };
  }, [call]);
  const download = () => run(async () => {
    const data = await call("workspace.export");
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `cuigengji-workspace-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
    setNotice("\u5DF2\u751F\u6210\u5168\u5E93\u5907\u4EFD\uFF0C\u8BF7\u5728\u4E0B\u8F7D\u5217\u8868\u786E\u8BA4\u6587\u4EF6\u5DF2\u4FDD\u5B58\u3002");
  });
  const choose = (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    setBackup(null);
    setPreview(null);
    setNotice("");
    if (!file) return;
    run(async () => {
      const value = JSON.parse((await file.text()).replace(/^\uFEFF/, ""));
      const result = await call("workspace.preview", { backup: value });
      setBackup(value);
      setPreview(result);
    });
  };
  return /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)(import_jsx_runtime13.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("h2", { children: "\u5C0F\u8BF4\u5DE5\u4F5C\u6570\u636E" }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { className: "muted", children: "\u4F5C\u54C1\u4FDD\u5B58\u5728\u72EC\u7ACB\u6570\u636E\u76EE\u5F55\u4E2D\u3002\u6362\u7535\u8111\u6216\u8FC1\u79FB DSH \u65F6\uFF0C\u8BF7\u5BFC\u51FA\u6574\u4E2A\u5DE5\u4F5C\u6570\u636E\u533A\u3002" }),
    error && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { role: "alert", children: error }),
    !status && !error && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { role: "status", children: "\u6B63\u5728\u8BFB\u53D6\u5B58\u50A8\u4FE1\u606F\u2026" }),
    status && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("section", { className: "section-fold", children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("strong", { children: "\u5F53\u524D\u5B58\u50A8\u4F4D\u7F6E" }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { style: { overflowWrap: "anywhere", userSelect: "text" }, children: status.dataRoot }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("p", { children: [
        status.novels,
        " \u90E8\u4F5C\u54C1 \xB7 ",
        status.chapters,
        " \u7AE0\u6B63\u6587 \xB7 ",
        status.bindings,
        " \u4E2A\u4F1A\u8BDD\u7ED1\u5B9A"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("ul", { children: status.books.map((book) => /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("li", { children: [
        book.title,
        book.archived ? "\uFF08\u5DF2\u5F52\u6863\uFF09" : ""
      ] }, book.id)) }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("details", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("summary", { children: "\u5907\u4EFD\u5305\u542B\u54EA\u4E9B\u5185\u5BB9" }),
        status.included.map((s) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { children: s }, s)),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("p", { children: [
          "\u4E0D\u5305\u542B\uFF1A",
          status.excluded.join("\uFF1B"),
          "\u3002\u8BF7\u5148\u4FDD\u5B58\u7F16\u8F91\u4E2D\u7684\u8349\u7A3F\u3002"
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("button", { className: "primary", disabled: busy || !status, onClick: download, children: "\u5BFC\u51FA\u5168\u90E8\u5DE5\u4F5C\u6570\u636E" }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("label", { children: [
        "\u5BFC\u5165\u5DE5\u4F5C\u6570\u636E",
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("input", { type: "file", accept: ".json,application/json", disabled: busy, onChange: choose })
      ] })
    ] }),
    preview && /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("section", { className: "section-fold", children: [
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("h3", { children: "\u5BFC\u5165\u9884\u89C8" }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("p", { children: [
        preview.novels,
        " \u90E8\u4F5C\u54C1 \xB7 ",
        preview.chapters,
        " \u7AE0 \xB7 ",
        preview.files,
        " \u4E2A\u65E5\u5FD7/\u5907\u4EFD\u6587\u4EF6"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("p", { children: [
        "\u65B0\u589E\uFF1A",
        preview.added.join("\u3001") || "\u65E0",
        "\uFF1B\u76F8\u540C\u5185\u5BB9\u8DF3\u8FC7\uFF1A",
        preview.skipped.join("\u3001") || "\u65E0"
      ] }),
      preview.conflicts.length > 0 ? /* @__PURE__ */ (0, import_jsx_runtime13.jsxs)("div", { role: "alert", children: [
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { children: "\u4EE5\u4E0B\u5185\u5BB9\u6709\u51B2\u7A81\uFF0C\u672A\u5BFC\u5165\u3002\u8BF7\u4FDD\u7559\u53CC\u65B9\u5907\u4EFD\u540E\u518D\u6838\u5BF9\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("ul", { children: preview.conflicts.map((s) => /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("li", { children: s }, s)) })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { children: "\u5BFC\u5165\u4F1A\u91CD\u65B0\u6821\u9A8C\uFF0C\u5E76\u5148\u5907\u4EFD\u5F53\u524D\u6570\u636E\uFF1B\u4E0D\u4F1A\u8986\u76D6\u4E0D\u540C\u5185\u5BB9\u7684\u540C ID \u4F5C\u54C1\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("button", { disabled: busy || !preview.valid, onClick: () => run(async () => {
        const result = await call("workspace.import", { backup });
        setStatus(await call("workspace.status"));
        setPreview(null);
        setBackup(null);
        setNotice(`\u5BFC\u5165\u5B8C\u6210\u3002\u5BFC\u5165\u524D\u5907\u4EFD\uFF1A${result.backupDir}`);
      }), children: "\u786E\u8BA4\u5BFC\u5165" }),
      /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("button", { disabled: busy, onClick: () => {
        setPreview(null);
        setBackup(null);
      }, children: "\u53D6\u6D88" })
    ] }),
    notice && /* @__PURE__ */ (0, import_jsx_runtime13.jsx)("p", { role: "status", style: { overflowWrap: "anywhere" }, children: notice })
  ] });
}

// src/client/features/chapters/index.jsx
var import_react17 = __toESM(require("react"), 1);

// src/client/features/chapters/format.ts
function formatProse(content) {
  return content.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trim()).filter(Boolean).map((line) => `\u3000\u3000${line}`).join("\n\n");
}

// src/domain/manuscript.ts
function countManuscript(content) {
  return Array.from(content.replace(/\s/gu, "")).length;
}

// src/client/features/chapters/useChapterSync.ts
var import_react16 = require("react");

// src/client/features/chapters/sync.ts
var fields = ["content", "title", "volumeId", "order"];
var same = (a, b) => fields.every((key2) => a[key2] === b[key2]);
function edit(base, text) {
  let start = 0, end = base.length, tail = text.length;
  while (start < end && start < tail && base[start] === text[start]) start++;
  while (end > start && tail > start && base[end - 1] === text[tail - 1]) {
    end--;
    tail--;
  }
  return { start, end, text: text.slice(start, tail) };
}
function mergeText(base, local, remote) {
  if (local === remote || remote === base) return local;
  if (local === base) return remote;
  const a = edit(base, local), b = edit(base, remote);
  if (!(a.end < b.start || b.end < a.start)) return null;
  let result = base;
  for (const patch of [a, b].sort((x, y) => y.start - x.start)) result = result.slice(0, patch.start) + patch.text + result.slice(patch.end);
  return result;
}
function mergeChapter(base, local, remote) {
  if (remote.deleted && !same(base, local)) return null;
  const value = { ...remote };
  for (const key2 of fields) {
    if (key2 === "content") {
      const merged = mergeText(base.content, local.content, remote.content);
      if (merged === null) return null;
      value.content = merged;
    } else if (local[key2] === base[key2]) value[key2] = remote[key2];
    else if (remote[key2] === base[key2] || remote[key2] === local[key2]) value[key2] = local[key2];
    else return null;
  }
  return value;
}
var ChapterSync = class {
  state;
  listeners = /* @__PURE__ */ new Set();
  timer;
  saving = false;
  reading = false;
  composing = false;
  touched = 0;
  pendingRemote = null;
  pending = null;
  retries = 0;
  options;
  constructor(options) {
    this.options = options;
    const restored = restoreDraft(options.storage, options.key, options.initial);
    this.state = { ...restored, phase: same(restored.base, restored.value) ? "saved" : "waiting", error: "", cacheError: "", notice: "", remote: null };
  }
  get dirty() {
    return !same(this.state.base, this.state.value);
  }
  snapshot = () => this.state;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  publish(patch) {
    this.state = { ...this.state, ...patch };
    try {
      persistDraft(this.options.storage, this.options.key, { base: this.state.base, value: this.state.value });
      this.state.cacheError = "";
    } catch {
      this.state.cacheError = "\u672C\u5730\u8349\u7A3F\u7F13\u5B58\u5931\u8D25\uFF0C\u8BF7\u4FDD\u6301\u6B64\u9875\u9762\u6253\u5F00\u5E76\u91CD\u8BD5\u4FDD\u5B58\u3002";
    }
    this.listeners.forEach((fn) => fn());
  }
  schedule(delay = this.options.delay ?? 1500) {
    clearTimeout(this.timer);
    if (!this.composing && this.state.phase !== "conflict") this.timer = setTimeout(() => void this.flush(), delay);
  }
  change = (next) => {
    this.touched = Date.now();
    this.retries = 0;
    this.publish({ value: typeof next === "function" ? next(this.state.value) : next, notice: "", phase: this.state.remote ? "conflict" : this.saving ? "saving" : "waiting" });
    this.schedule();
  };
  composition = (active) => {
    this.composing = active;
    if (active) clearTimeout(this.timer);
    else this.schedule();
  };
  accept = (value) => {
    if (this.saving) return;
    this.pending = null;
    this.pendingRemote = null;
    this.retries = 0;
    this.publish({ base: value, value, remote: null, phase: "saved", error: "", notice: "" });
  };
  rebase = (remote) => {
    if (this.saving || remote.deleted) return;
    this.pending = null;
    const value = { ...remote, ...Object.fromEntries(fields.map((key2) => [key2, this.state.value[key2]])) };
    this.publish({ base: remote, value, remote: null, phase: "waiting", error: "", notice: "" });
    this.schedule();
  };
  reconcile(remote) {
    if (remote.revision <= this.state.base.revision) return;
    const value = mergeChapter(this.state.base, this.state.value, remote);
    if (!value) {
      this.publish({ remote, phase: "conflict", error: "", notice: "" });
      return;
    }
    const dirty = !same(value, remote);
    this.publish({ base: remote, value, remote: null, phase: dirty ? "waiting" : "saved", error: "", notice: dirty ? "\u5DF2\u5408\u5E76\u53CC\u65B9\u4E0D\u540C\u4F4D\u7F6E\u7684\u4FEE\u6539" : "\u5DF2\u540C\u6B65\u6700\u65B0\u6B63\u6587" });
    if (dirty) this.schedule();
  }
  refresh = async () => {
    if (this.reading || this.saving || this.pending) return;
    this.reading = true;
    try {
      const remote = await this.options.read();
      if (this.saving || this.pending) return;
      if (this.composing || Date.now() - this.touched < (this.options.delay ?? 1500)) {
        this.pendingRemote = remote;
        this.schedule();
      } else this.reconcile(remote);
    } catch {
    } finally {
      this.reading = false;
    }
  };
  flush = async () => {
    clearTimeout(this.timer);
    if (this.saving || this.composing || this.state.remote) return;
    if (this.pendingRemote) {
      const remote = this.pendingRemote;
      this.pendingRemote = null;
      this.reconcile(remote);
      if (this.state.remote) return;
    }
    if (!this.dirty && !this.pending) {
      this.publish({ phase: "saved" });
      return;
    }
    if (this.state.base.deleted || !this.state.value.title.trim()) return;
    this.saving = true;
    const request = this.pending ?? { value: { ...this.state.value }, base: this.state.base, requestId: crypto.randomUUID() };
    this.pending = request;
    this.publish({ phase: "saving", error: "" });
    try {
      const result = await this.options.write(request.value, request.base, request.requestId);
      const base = { ...request.value, ...result };
      const value = { ...base, ...Object.fromEntries(fields.map((key2) => [key2, this.state.value[key2]])) };
      this.pending = null;
      this.retries = 0;
      this.publish({ base, value, phase: same(base, value) ? "saved" : "waiting", error: "", notice: "" });
      this.options.onSaved();
    } catch (error) {
      if (error?.code === "CONFLICT" || /版本已变化/.test(error?.message || "")) {
        this.pending = null;
        try {
          this.reconcile(await this.options.read());
        } catch {
          this.publish({ phase: "error", error: "\u65E0\u6CD5\u8BFB\u53D6\u6700\u65B0\u6B63\u6587\uFF0C\u8349\u7A3F\u5DF2\u4FDD\u7559\u3002\u8BF7\u91CD\u8BD5\u3002" });
        }
      } else {
        this.publish({ phase: "error", error: "\u81EA\u52A8\u4FDD\u5B58\u5931\u8D25\uFF0C\u8349\u7A3F\u5DF2\u4FDD\u7559\u3002\u8BF7\u91CD\u8BD5\u3002" });
        this.retries++;
      }
    } finally {
      this.saving = false;
      if (this.state.phase === "waiting") this.schedule();
      else if (this.state.phase === "error" && this.retries > 0 && this.retries <= 2) this.schedule(2e3 * this.retries);
    }
  };
  dispose() {
    clearTimeout(this.timer);
    this.listeners.clear();
  }
};

// src/client/features/chapters/useChapterSync.ts
var sessions = /* @__PURE__ */ new Map();
function useChapterSync({ novelId, chapterId, initial, latest, read: read2, write, onSaved }) {
  const scope = (0, import_react16.useContext)(SessionScope), key2 = draftKey(scope, `${novelId}:chapter:${chapterId}`);
  const controller = (0, import_react16.useMemo)(() => {
    let existing = sessions.get(key2);
    if (!existing) {
      existing = new ChapterSync({ key: key2, initial, storage: localStorage, read: read2, write, onSaved });
      sessions.set(key2, existing);
    }
    return existing;
  }, [key2]);
  controller.options = { ...controller.options, read: read2, write, onSaved };
  const state = (0, import_react16.useSyncExternalStore)(controller.subscribe, controller.snapshot, controller.snapshot);
  (0, import_react16.useEffect)(() => {
    void controller.refresh();
    void controller.flush();
    return () => {
      void controller.flush();
    };
  }, [controller]);
  (0, import_react16.useEffect)(() => {
    if (latest && latest.revision > controller.state.base.revision) void controller.refresh();
  }, [controller, latest?.revision, state.base.revision]);
  (0, import_react16.useEffect)(() => {
    const online = () => {
      void controller.flush();
      void controller.refresh();
    };
    const leave = (event) => {
      if (controller.dirty) {
        void controller.flush();
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("online", online);
    window.addEventListener("beforeunload", leave);
    return () => {
      window.removeEventListener("online", online);
      window.removeEventListener("beforeunload", leave);
    };
  }, [controller]);
  return { ...state, dirty: controller.dirty, change: controller.change, accept: controller.accept, rebase: controller.rebase, save: controller.flush, composition: controller.composition };
}

// src/client/features/chapters/history.ts
function groupHistory(versions) {
  const groups = [];
  for (const version of [...versions].reverse()) {
    const group = groups.at(-1), previous = group?.at(-1);
    if (previous && version.actor?.kind === "human" && previous.actor?.kind === "human" && version.reason === "\u4F5C\u8005\u81EA\u52A8\u4FDD\u5B58" && previous.reason === "\u4F5C\u8005\u81EA\u52A8\u4FDD\u5B58" && version.actor?.sessionId === previous.actor?.sessionId && Date.parse(previous.timestamp || "") - Date.parse(version.timestamp || "") < 18e4) group.push(version);
    else groups.push([version]);
  }
  return groups;
}

// src/client/features/chapters/clipboard.ts
var escapeHtml = (text) => text.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
})[character]);
function manuscriptClipboard(text) {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const html = lines.map((line) => {
    const content = escapeHtml(line).replace(/^ +| +$/g, (spaces) => "&nbsp;".repeat(spaces.length)).replace(/ {2,}/g, (spaces) => "&nbsp;".repeat(spaces.length - 1) + " ");
    return `<p style="margin:0; padding:0; white-space:pre-wrap; line-height:1.8;">${content || "<br>"}</p>`;
  }).join("");
  return { plain: text, html: `<div>${html}</div>` };
}
function copyManuscriptSelection(event) {
  const { value, selectionStart, selectionEnd } = event.currentTarget;
  if (selectionStart === selectionEnd || !event.clipboardData) return;
  const { plain, html } = manuscriptClipboard(value.slice(selectionStart, selectionEnd));
  event.clipboardData.setData("text/plain", plain);
  event.clipboardData.setData("text/html", html);
  event.preventDefault();
}

// src/client/features/chapters/index.jsx
var import_jsx_runtime14 = require("react/jsx-runtime");
async function readChapter(call, novelId, chapterId) {
  const first = await call("chapter.get", { novelId, chapterId, maxChars: 2e5 });
  let content = first.content, next = first.nextStart;
  while (next !== null) {
    const page = await call("chapter.get", { novelId, chapterId, start: next, maxChars: 2e5 });
    if (page.revision !== first.revision) throw new Error("\u8BFB\u53D6\u671F\u95F4\u6B63\u6587\u53D1\u751F\u53D8\u5316\uFF0C\u8BF7\u91CD\u8BD5\u3002");
    content += page.content;
    next = page.nextStart;
  }
  return { ...first, content };
}
function Chapters({ call, novelId, tick, run, busy }) {
  const { preferences } = useWorkbenchPreferences();
  const [creating, setCreating] = (0, import_react17.useState)(false);
  const workspace = (0, import_react17.useRef)(null), [narrow, setNarrow] = (0, import_react17.useState)(false);
  (0, import_react17.useEffect)(() => {
    const el = workspace.current;
    if (!el) return;
    const resize = new ResizeObserver(([entry]) => setNarrow(entry.contentRect.width < 760));
    resize.observe(el);
    return () => resize.disconnect();
  }, [creating]);
  const [id, setId] = usePreference(`${novelId}:chapter`, "");
  const [directory, setDirectory] = (0, import_react17.useState)(!id), [query, setQuery] = (0, import_react17.useState)(""), [deleted, setDeleted] = (0, import_react17.useState)(false);
  const [directoryCollapsed, setDirectoryCollapsed] = (0, import_react17.useState)(!preferences.directory);
  const [collapsed, setCollapsed] = usePreference(`${novelId}:collapsed-volumes`, {});
  const [poll, setPoll] = (0, import_react17.useState)(0);
  const { ask, confirm } = useDialog();
  const resource = useResource(() => Promise.all([call("chapter.list", { novelId, includeDeleted: deleted }), call("volume.list", { novelId })]), [call, novelId, tick, deleted, poll]);
  (0, import_react17.useEffect)(() => {
    const timer = setInterval(() => setPoll((n) => n + 1), 5e3);
    return () => clearInterval(timer);
  }, []);
  const [chapters = [], volumes = []] = resource.value || [];
  const select = (chapter) => {
    setId(chapter.id);
    setDirectory(false);
  };
  const create = () => setCreating(true);
  if (creating) return /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(CreateDocument, { chapter: true, draftKey: `${novelId}:chapter-create`, label: "\u65B0\u5EFA\u7AE0\u8282", initial: { title: "", summary: "", content: "", groupId: chapters.find((c) => c.id === id)?.volumeId || null }, groups: volumes.map((v) => ({ ...v, name: v.title })), busy, close: () => setCreating(false), createGroup: async (title) => {
    let result;
    await run(async () => {
      const v = await call("volume.create", { novelId, title });
      result = { ...v, name: v.title };
    });
    return result;
  }, save: (value, requestId) => run(async () => {
    const c = await call("chapter.create", { novelId, requestId, title: value.title, content: value.content, volumeId: value.groupId });
    select(c);
  }) });
  const groups = [...volumes, { id: null, title: "\u672A\u5206\u5377" }];
  const directoryContent = /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("aside", { className: "chapter-directory", "aria-label": "\u7AE0\u8282\u76EE\u5F55", children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "row directory-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h2", { className: "grow", children: "\u76EE\u5F55" }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { className: "icon-button", "aria-label": directoryCollapsed ? "\u5C55\u5F00\u7AE0\u8282\u76EE\u5F55" : "\u6536\u8D77\u7AE0\u8282\u76EE\u5F55", title: directoryCollapsed ? "\u5C55\u5F00\u7AE0\u8282\u76EE\u5F55" : "\u6536\u8D77\u7AE0\u8282\u76EE\u5F55", onClick: () => setDirectoryCollapsed((v) => !v), children: directoryCollapsed ? "\u203A" : "\u2039" }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { className: "primary", onClick: create, disabled: busy, children: "\uFF0B \u7AE0\u8282" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("input", { className: "search", "aria-label": "\u641C\u7D22\u7AE0\u8282", placeholder: "\u641C\u7D22\u7AE0\u8282\u540D\u79F0", value: query, onChange: (e) => setQuery(e.target.value) }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("details", { className: "directory-options", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("summary", { children: "\u76EE\u5F55\u8BBE\u7F6E" }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { disabled: busy, onClick: async () => {
        const title = await ask("\u65B0\u5377\u540D\u79F0");
        if (title) run(() => call("volume.create", { novelId, title }));
      }, children: "\u65B0\u5EFA\u5377" }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("label", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("input", { type: "checkbox", checked: deleted, onChange: (e) => setDeleted(e.target.checked) }),
        "\u663E\u793A\u5DF2\u5220\u9664"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(ResourceState, { resource, children: [
      !chapters.length && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { className: "empty", children: "\u8FD8\u6CA1\u6709\u7AE0\u8282\u3002\u65B0\u5EFA\u4E00\u7AE0\uFF0C\u5F00\u59CB\u4F60\u7684\u6545\u4E8B\u3002" }),
      query && !chapters.some((c) => c.title.includes(query)) && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { className: "empty", children: "\u6CA1\u6709\u5339\u914D\u7684\u7AE0\u8282" }),
      groups.map((v) => {
        const items = chapters.filter((c) => (c.volumeId || null) === v.id && c.title.includes(query));
        if (!items.length && !v.id) return null;
        return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("section", { className: "volume-group", children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "row compact", children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("button", { className: "volume-toggle grow", "aria-expanded": !collapsed[v.id || "none"] || !!query, onClick: () => setCollapsed((old) => ({ ...old, [v.id || "none"]: !old[v.id || "none"] })), children: [
              collapsed[v.id || "none"] && !query ? "\u25B8" : "\u25BE",
              " ",
              v.title,
              " ",
              /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("small", { children: items.length })
            ] }),
            v.id && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("details", { className: "menu", children: [
              /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("summary", { "aria-label": `${v.title}\u8BBE\u7F6E`, children: "\xB7\xB7\xB7" }),
              /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "menu-panel", children: [
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { disabled: busy, onClick: async () => {
                  const title = await ask("\u5377\u540D\u79F0", v.title);
                  if (title) run(() => call("volume.update", { novelId, volumeId: v.id, title, expectedRevision: v.revision }));
                }, children: "\u6539\u540D" }),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { disabled: busy, onClick: async () => {
                  const value = await ask("\u5377\u6392\u5E8F\uFF08\u6570\u5B57\u8D8A\u5C0F\u8D8A\u9760\u524D\uFF09", String(v.order));
                  if (value !== null) run(() => call("volume.update", { novelId, volumeId: v.id, order: Number(value), expectedRevision: v.revision }));
                }, children: "\u8C03\u6574\u987A\u5E8F" }),
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { className: "danger", disabled: busy, onClick: async () => {
                  if (await confirm(`\u5220\u9664\u5377\u201C${v.title}\u201D\uFF1F\u7AE0\u8282\u5C06\u4FDD\u7559\u5728\u672A\u5206\u5377\u3002`)) run(() => call("volume.delete", { novelId, volumeId: v.id, expectedRevision: v.revision, confirm: true, chapterPolicy: "detach" }));
                }, children: "\u5220\u9664\u5377" })
              ] })
            ] })
          ] }),
          (!collapsed[v.id || "none"] || !!query) && items.map((c) => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("button", { className: `chapter-item ${c.id === id ? "selected" : ""}`, "aria-pressed": c.id === id, onClick: () => select(c), children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("span", { children: [
              c.deleted ? "\u5DF2\u5220\u9664 \xB7 " : "",
              c.title
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("small", { title: "\u5DF2\u4FDD\u5B58\u6B63\u6587\u7684\u5B57\u6570\uFF0C\u542B\u6807\u70B9\u3001\u4E0D\u8BA1\u7A7A\u767D", children: [
              Number.isFinite(c.textCount) ? c.textCount.toLocaleString("zh-CN") : "\u2014",
              " \u5B57"
            ] })
          ] }, c.id))
        ] }, v.id || "none");
      })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "directory-foot", children: [
      chapters.filter((c) => !c.deleted).length,
      " \u7AE0 \xB7 ",
      chapters.filter((c) => !c.deleted).reduce((sum, c) => sum + (c.textCount || 0), 0).toLocaleString("zh-CN"),
      " \u5B57"
    ] })
  ] });
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { ref: workspace, className: `chapter-workspace ${directory ? "show-directory" : "show-editor"} ${directoryCollapsed ? "directory-collapsed" : ""}`, children: [
    narrow ? directory && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(DirectoryDrawer, { close: () => setDirectory(false), children: directoryContent }) : directoryContent,
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("main", { className: "chapter-main", children: id ? /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(ChapterLoader, { ...{ call, novelId, tick, run, busy, volumes }, onSaved: () => setPoll((n) => n + 1), chapterId: id, latest: chapters.find((c) => c.id === id), back: () => setDirectory(true) }, id) : /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h2", { children: "\u9009\u62E9\u4E00\u7AE0\uFF0C\u7EE7\u7EED\u5199\u4F5C" }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { children: "\u4ECE\u76EE\u5F55\u6253\u5F00\u7AE0\u8282\uFF0C\u6216\u65B0\u5EFA\u4E00\u7AE0\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { onClick: () => setDirectory(true), children: "\u6253\u5F00\u76EE\u5F55" })
    ] }) })
  ] });
}
function DirectoryDrawer({ children, close }) {
  const ref = (0, import_react17.useRef)(null);
  (0, import_react17.useEffect)(() => {
    const previous = document.activeElement;
    ref.current?.showModal();
    return () => previous?.focus();
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("dialog", { ref, className: "directory-drawer", "aria-label": "\u7AE0\u8282\u76EE\u5F55\u62BD\u5C49", onCancel: (e) => {
    e.preventDefault();
    close();
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("header", { className: "drawer-header", children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { type: "button", className: "drawer-close", "aria-label": "\u5173\u95ED\u7AE0\u8282\u76EE\u5F55", title: "\u5173\u95ED\u76EE\u5F55", onClick: close, children: /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { "aria-hidden": "true", children: "\xD7" }) }) }),
    children
  ] });
}
function ChapterLoader(props) {
  const resource = useResource(() => readChapter(props.call, props.novelId, props.chapterId), [props.call, props.novelId, props.chapterId]);
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)(import_jsx_runtime14.Fragment, { children: [
    !resource.value && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { className: "directory-back", onClick: props.back, children: "\u2039 \u8FD4\u56DE\u76EE\u5F55" }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(ResourceState, { resource, children: resource.value && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(ChapterEditor, { ...props, initial: resource.value }) })
  ] });
}
function ChapterEditor({ call, novelId, chapterId, latest, tick, run, busy, volumes, back, initial, onSaved }) {
  const { value: draft, base, change, accept, rebase, dirty, cacheError, phase, error: saveError, remote, notice: syncNotice, save, composition } = useChapterSync({ novelId, chapterId, initial, latest, onSaved, read: () => readChapter(call, novelId, chapterId), write: (value, base2, requestId) => call("chapter.update", { novelId, chapterId, requestId, content: value.content, title: value.title, volumeId: value.volumeId || null, order: value.order, expectedRevision: base2.revision, expectedHash: base2.contentHash, reason: "\u4F5C\u8005\u81EA\u52A8\u4FDD\u5B58" }) });
  const textareaRef = (0, import_react17.useRef)(null), caret = (0, import_react17.useRef)({ start: 0, end: 0, top: 0 });
  (0, import_react17.useLayoutEffect)(() => {
    const el = textareaRef.current;
    if (el && document.activeElement === el) {
      el.setSelectionRange(Math.min(caret.current.start, el.value.length), Math.min(caret.current.end, el.value.length));
      el.scrollTop = caret.current.top;
    }
  }, [base.revision]);
  const [comparison, setComparison] = (0, import_react17.useState)(null), [historyOpen, setHistoryOpen] = (0, import_react17.useState)(false);
  const { preferences, update } = useWorkbenchPreferences();
  const font = preferences.fontSize, setFont = (fontSize) => update({ fontSize });
  const scrollRef = useScrollPosition(`${novelId}:${chapterId}`);
  const fitManuscript = () => {
    const el = textareaRef.current;
    if (!el) return;
    const top = scrollRef.current?.scrollTop || 0;
    el.style.height = "0px";
    el.style.height = `${Math.max(240, el.scrollHeight)}px`;
    if (scrollRef.current) scrollRef.current.scrollTop = top;
  };
  (0, import_react17.useLayoutEffect)(fitManuscript, [draft.content, font, preferences.leading]);
  (0, import_react17.useEffect)(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;
    let width = -1;
    const observer = new ResizeObserver((entries) => {
      const next = entries[0].contentRect.width;
      if (next !== width) {
        width = next;
        fitManuscript();
      }
    });
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  const { confirm } = useDialog();
  const [formatUndo, setFormatUndo] = (0, import_react17.useState)(null);
  const format = () => {
    const content = formatProse(draft.content);
    if (content !== draft.content) {
      setFormatUndo({ before: draft.content, after: content });
      change((d) => ({ ...d, content }));
    }
  };
  const history = useResource(() => historyOpen ? call("chapter.history", { novelId, chapterId, includeContent: true }) : Promise.resolve([]), [call, novelId, chapterId, tick, base.revision, historyOpen]);
  const conflict = phase === "conflict";
  const reload = async () => {
    if (!dirty || await confirm("\u4E22\u5F03\u672C\u5730\u8349\u7A3F\uFF0C\u8BFB\u53D6\u6700\u65B0\u6B63\u6587\uFF1F")) run(async () => {
      accept(await readChapter(call, novelId, chapterId));
      setComparison(null);
    });
  };
  const set = (key2, value) => change((d) => ({ ...d, [key2]: value }));
  return /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "editor-shell", onCompositionStart: () => composition(true), onCompositionEnd: () => composition(false), onKeyDown: (e) => saveShortcut(e, save), children: [
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("header", { className: "editor-heading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "row compact chapter-title-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { className: "directory-back", onClick: back, children: "\u2039 \u76EE\u5F55" }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "grow chapter-title", children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("span", { className: "eyebrow", children: volumes.find((v) => v.id === draft.volumeId)?.title || "\u6B63\u6587" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h2", { children: draft.title })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("details", { className: "menu", children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("summary", { "aria-label": "\u7AE0\u8282\u8BBE\u7F6E", title: "\u7AE0\u8282\u8BBE\u7F6E", children: "\xB7\xB7\xB7" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "menu-panel settings-panel", children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("label", { children: [
              "\u7AE0\u8282\u540D",
              /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("input", { disabled: busy || base.deleted, value: draft.title, onChange: (e) => set("title", e.target.value) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("label", { children: [
              "\u6240\u5C5E\u5377",
              /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("select", { disabled: busy || base.deleted, value: draft.volumeId || "", onChange: (e) => set("volumeId", e.target.value || null), children: [
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("option", { value: "", children: "\u672A\u5206\u5377" }),
                volumes.map((v) => /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("option", { value: v.id, children: v.title }, v.id))
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("label", { children: [
              "\u987A\u5E8F",
              /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("input", { type: "number", disabled: busy || base.deleted, value: draft.order, onChange: (e) => set("order", Number(e.target.value)) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { onClick: () => setHistoryOpen(true), children: "\u7248\u672C\u5386\u53F2" }),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { onClick: reload, disabled: busy || phase === "saving", children: "\u8BFB\u53D6\u6700\u65B0\u6B63\u6587" }),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { className: "danger", disabled: busy || base.deleted || phase === "saving", onClick: async () => {
              if (await confirm("\u5220\u9664\u6B64\u7AE0\u8282\uFF1F\u672C\u5730\u8349\u7A3F\u4F1A\u88AB\u66FF\u6362\uFF0C\u5DF2\u4FDD\u5B58\u7684\u6B63\u6587\u4ECD\u53EF\u4ECE\u5386\u53F2\u6062\u590D\u3002")) run(async () => {
                await call("chapter.delete", { novelId, chapterId, expectedRevision: base.revision, confirm: true });
                accept(await readChapter(call, novelId, chapterId));
              });
            }, children: "\u5220\u9664\u7AE0\u8282" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "chapter-toolbar", children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "prose-tools", children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { type: "button", className: "format-button", disabled: busy || base.deleted || !draft.content.trim(), onClick: format, children: "\u81EA\u52A8\u6392\u7248" }),
          formatUndo && formatUndo.after === draft.content && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { className: "icon-button", "aria-label": "\u64A4\u9500\u6392\u7248", disabled: busy || base.deleted, onClick: () => {
            set("content", formatUndo.before);
            setFormatUndo(null);
          }, children: "\u21B6" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("label", { className: "inline-field", children: [
          "\u5B57\u53F7",
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("select", { "aria-label": "\u6B63\u6587\u5B57\u53F7", value: font, onChange: (e) => setFont(Number(e.target.value)), children: [16, 18, 20, 22].map((n) => /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("option", { value: n, children: n }, n)) })
        ] })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "editor-scroll is-editing", ref: scrollRef, children: [
      conflict && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "notice", children: [
        "\u4F60\u4E0E AI \u6216\u5176\u4ED6\u7A97\u53E3\u4FEE\u6539\u4E86\u540C\u4E00\u5904\uFF0C\u53CC\u65B9\u5185\u5BB9\u5747\u5DF2\u4FDD\u7559\u3002",
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { disabled: busy, onClick: () => setComparison(remote), children: "\u6BD4\u8F83\u6700\u65B0\u6B63\u6587" })
      ] }),
      base.deleted && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("div", { className: "notice", children: "\u672C\u7AE0\u5DF2\u5220\u9664\uFF0C\u53EF\u5728\u7AE0\u8282\u8BBE\u7F6E\u7684\u7248\u672C\u5386\u53F2\u4E2D\u6062\u590D\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("textarea", { className: "prose manuscript", "aria-label": "\u6B63\u6587", style: { fontSize: font }, ref: textareaRef, onSelect: (e) => {
        caret.current = { start: e.target.selectionStart, end: e.target.selectionEnd, top: e.target.scrollTop };
      }, onScroll: (e) => {
        caret.current.top = e.target.scrollTop;
      }, disabled: busy || base.deleted, value: draft.content, onCopy: copyManuscriptSelection, onChange: (e) => set("content", e.target.value) }),
      historyOpen && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("section", { className: "history-panel", children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h3", { className: "grow", children: "\u5386\u53F2\u7248\u672C" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { onClick: () => setHistoryOpen(false), children: "\u5173\u95ED\u5386\u53F2" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)(ResourceState, { resource: history, children: groupHistory(history.value || []).map((group) => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("details", { className: "history-session", children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("summary", { children: [
            group.length > 1 ? `\u4F5C\u8005\u7F16\u8F91 \xB7 ${group.length} \u6B21\u81EA\u52A8\u4FDD\u5B58` : `\u7248\u672C ${group[0].revision}`,
            " \xB7 ",
            group[0].timestamp ? new Date(group[0].timestamp).toLocaleString() : ""
          ] }),
          group.map((h) => /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "history-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { children: [
              /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("strong", { children: [
                "\u7248\u672C ",
                h.revision
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("p", { className: "muted", children: [
                h.actor?.kind === "agent" ? "Agent" : "\u4F5C\u8005",
                " \xB7 ",
                h.timestamp ? new Date(h.timestamp).toLocaleString() : "",
                /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("br", {}),
                h.reason || "\u6B63\u6587\u4FEE\u6539"
              ] })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { onClick: () => {
                setComparison(h);
                setHistoryOpen(false);
              }, children: "\u6BD4\u8F83" }),
              /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { disabled: busy || phase === "saving", onClick: async () => {
                if (await confirm(`\u6062\u590D\u7248\u672C${h.revision}\uFF1F\u5F53\u524D\u8349\u7A3F\u4F1A\u88AB\u66FF\u6362\uFF0C\u5DF2\u4FDD\u5B58\u7684\u5386\u53F2\u4ECD\u4FDD\u7559\u3002`)) run(async () => {
                  await call("chapter.restore", { novelId, chapterId, targetRevision: h.revision, expectedRevision: base.revision });
                  accept(await readChapter(call, novelId, chapterId));
                });
              }, children: "\u6062\u590D" })
            ] })
          ] }, h.revision))
        ] }, group[0].revision)) })
      ] }),
      comparison && /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("section", { className: "history-panel comparison", children: [
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h3", { className: "grow", children: "\u7248\u672C\u6BD4\u8F83" }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { onClick: () => setComparison(null), children: "\u5173\u95ED\u6BD4\u8F83" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { className: "split", children: [
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("h3", { children: "\u672C\u5730\u5185\u5BB9\uFF08\u53EF\u76F4\u63A5\u5408\u5E76\uFF09" }),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("textarea", { className: "prose", "aria-label": "\u5408\u5E76\u6B63\u6587", disabled: busy || base.deleted, value: draft.content, onChange: (e) => set("content", e.target.value) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("h3", { children: [
              "\u7248\u672C ",
              comparison.revision
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("pre", { children: comparison.content })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("p", { className: "muted", children: "\u53EF\u5728\u8FD9\u91CC\u5408\u5E76\u9700\u8981\u7684\u6B63\u6587\uFF0C\u518D\u66F4\u65B0\u4FDD\u5B58\u57FA\u51C6\uFF1B\u5408\u5E76\u540E\u81EA\u52A8\u4FDD\u5B58\u3002\u540E\u7EED\u5199\u5165\u4ECD\u68C0\u67E5\u7248\u672C\u3002" }),
        comparison.revision === latest?.revision && !comparison.deleted && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { onClick: async () => {
          if (await confirm("\u786E\u8BA4\u5DF2\u5C06\u9700\u8981\u7684\u5185\u5BB9\u5408\u5E76\u5230\u672C\u5730\u6B63\u6587\uFF1F\u5C06\u4EE5\u8FD9\u7248\u4F5C\u4E3A\u4FDD\u5B58\u57FA\u51C6\uFF0C\u540E\u7EED\u66F4\u65B0\u4ECD\u4F1A\u68C0\u67E5\u51B2\u7A81\u3002")) {
            rebase(comparison);
            setComparison(null);
          }
        }, children: "\u5DF2\u5408\u5E76\uFF0C\u66F4\u65B0\u4FDD\u5B58\u57FA\u51C6" }),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { onClick: reload, children: "\u653E\u5F03\u8349\u7A3F\uFF0C\u8BFB\u53D6\u6700\u65B0" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("footer", { className: "savebar auto-savebar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("div", { role: "status", className: cacheError || saveError || conflict ? "error-text" : "muted", children: [
        cacheError || saveError || (base.deleted ? "\u5DF2\u5220\u9664\u7AE0\u8282" : !draft.title.trim() ? "\u8BF7\u586B\u5199\u7AE0\u8282\u540D\u79F0" : conflict ? "\u5F85\u5408\u5E76 \xB7 \u8349\u7A3F\u5DF2\u4FDD\u7559" : phase === "saving" ? "\u4FDD\u5B58\u4E2D\u2026" : dirty ? "\u7B49\u5F85\u81EA\u52A8\u4FDD\u5B58\u2026" : syncNotice || "\u5DF2\u4FDD\u5B58"),
        /* @__PURE__ */ (0, import_jsx_runtime14.jsxs)("span", { title: "\u542B\u6807\u70B9\u3001\u4E0D\u8BA1\u7A7A\u767D", children: [
          countManuscript(draft.content).toLocaleString("zh-CN"),
          " \u5B57"
        ] })
      ] }),
      phase === "error" && /* @__PURE__ */ (0, import_jsx_runtime14.jsx)("button", { onClick: save, children: "\u91CD\u8BD5\u4FDD\u5B58" })
    ] })
  ] });
}

// src/client/features/planning/index.jsx
var import_react23 = __toESM(require("react"), 1);

// src/client/shared/evidence.jsx
var import_react18 = __toESM(require("react"), 1);
var import_jsx_runtime15 = require("react/jsx-runtime");
function ChapterEvidence({ call, novelId, source: source2, title, onChapter }) {
  const [open, setOpen] = (0, import_react18.useState)(false);
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("section", { className: "source-row", children: [
    /* @__PURE__ */ (0, import_jsx_runtime15.jsxs)("span", { children: [
      title || "\u5DF2\u5220\u9664\u6216\u7F3A\u5931\u7AE0\u8282",
      " \xB7 \u5F15\u7528\u7248\u672C",
      source2.revision
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { onClick: () => setOpen(!open), children: open ? "\u6536\u8D77\u5F15\u7528\u6B63\u6587" : "\u67E5\u770B\u5F15\u7528\u7248\u672C" }),
    /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("button", { onClick: () => onChapter?.(source2.chapterId), children: "\u6253\u5F00\u5F53\u524D\u6B63\u6587" }),
    open && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(Version, { ...{ call, novelId, source: source2 } })
  ] });
}
function Version({ call, novelId, source: source2 }) {
  const resource = useResource(() => call("chapter.history", { novelId, chapterId: source2.chapterId, includeContent: true }).then((versions) => {
    const value = versions.find((v) => v.revision === source2.revision);
    if (!value) throw new Error("\u5F15\u7528\u7248\u672C\u4E0D\u5B58\u5728");
    return value;
  }), [call, novelId, source2.chapterId, source2.revision]);
  return /* @__PURE__ */ (0, import_jsx_runtime15.jsx)(ResourceState, { resource, children: resource.value && /* @__PURE__ */ (0, import_jsx_runtime15.jsx)("pre", { "aria-label": "\u5F15\u7528\u7684\u5386\u53F2\u6B63\u6587", children: resource.value.content }) });
}

// src/client/features/planning/Pages.tsx
var import_react19 = require("react");
var import_jsx_runtime16 = require("react/jsx-runtime");
function PlanningPages({ pages, value, busy, change, create, update, remove }) {
  const [draft, setDraft] = (0, import_react19.useState)(null), [error, setError] = (0, import_react19.useState)("");
  const current = pages.find((p) => (p.id || "") === value);
  return /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)(import_jsx_runtime16.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("nav", { className: "planning-pages", "aria-label": "\u89C4\u5212\u9875\u9762", children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("div", { className: "page-tabs", children: pages.map((p) => /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("button", { "aria-current": (p.id || "") === value ? "page" : void 0, onClick: () => change(p.id || ""), title: p.summary, children: [
        p.name,
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("small", { children: p.nodeCount })
      ] }, p.id || "main")) }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("button", { className: "add-page", disabled: busy, onClick: () => {
        setError("");
        setDraft({ name: "", summary: "" });
      }, children: "\uFF0B \u9875\u9762" }),
      current?.id && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("button", { "aria-label": "\u9875\u9762\u8BBE\u7F6E", onClick: () => {
        setError("");
        setDraft({ page: current, name: current.name, summary: current.summary });
      }, children: "\xB7\xB7\xB7" })
    ] }),
    draft && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)(Modal, { title: draft.page ? "\u9875\u9762\u8BBE\u7F6E" : "\u65B0\u5EFA\u89C4\u5212\u9875\u9762", close: () => setDraft(null), children: /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("form", { className: "editor-fields", onSubmit: async (e) => {
      e.preventDefault();
      const ok = draft.page ? await update(draft.page, draft.name, draft.summary) : await create(draft.name, draft.summary);
      if (ok) setDraft(null);
      else setError("\u672A\u4FDD\u5B58\uFF0C\u8BF7\u6838\u5BF9\u63D0\u793A\u540E\u91CD\u8BD5\u3002");
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("label", { children: [
        "\u9875\u9762\u540D\u79F0",
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("input", { autoFocus: true, required: true, value: draft.name, onChange: (e) => setDraft({ ...draft, name: e.target.value }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("label", { children: [
        "\u7528\u9014\u6458\u8981",
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("textarea", { placeholder: "\u8FD9\u9875\u8BA8\u8BBA\u54EA\u6BB5\u60C5\u8282\uFF0C\u65B9\u4FBF\u4F60\u548C AI \u627E\u5230\u5B83", value: draft.summary, onChange: (e) => setDraft({ ...draft, summary: e.target.value }) })
      ] }),
      error && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("p", { role: "alert", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime16.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("button", { type: "submit", className: "primary", disabled: busy || !draft.name.trim(), children: "\u4FDD\u5B58\u9875\u9762" }),
        draft.page && /* @__PURE__ */ (0, import_jsx_runtime16.jsx)("button", { type: "button", disabled: busy || draft.page.nodeCount > 0 || draft.page.decorationCount > 0, title: "\u53EA\u5220\u9664\u7A7A\u9875\u9762\uFF1B\u6709\u5185\u5BB9\u65F6\u8BF7\u5148\u79FB\u52A8\u60C5\u8282\u5E76\u5220\u9664\u6279\u6CE8", onClick: async () => {
          if (await remove(draft.page)) setDraft(null);
          else setError("\u672A\u5220\u9664\uFF0C\u8BF7\u6838\u5BF9\u9875\u9762\u662F\u5426\u4ECD\u6709\u5185\u5BB9\u3002");
        }, children: "\u5220\u9664\u7A7A\u9875\u9762" })
      ] })
    ] }) })
  ] });
}

// src/client/features/planning/Decorations.tsx
var import_react20 = require("react");
var import_jsx_runtime17 = require("react/jsx-runtime");
function newDecoration(kind2, position, pageId) {
  return { kind: kind2, pageId, position, title: kind2 === "frame" ? "\u8BA8\u8BBA\u533A\u57DF" : "", content: "", width: kind2 === "frame" ? 560 : 280, height: kind2 === "frame" ? 360 : 180, color: kind2 === "frame" ? "sage" : "sand", fontSize: 18, fontFamily: "sans" };
}
var colors = { neutral: "\u7070", sand: "\u7C73\u9EC4", sage: "\u6D45\u7EFF", sky: "\u6D45\u84DD", rose: "\u6D45\u7C89" };
function DecorationEditor({ initial, latest, busy, save, remove, close }) {
  const [draft, setDraft] = (0, import_react20.useState)(initial), [base, setBase] = (0, import_react20.useState)(initial), [error, setError] = (0, import_react20.useState)("");
  const field = (key2, value) => setDraft((old) => ({ ...old, [key2]: value }));
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsx)(Modal, { title: draft.kind === "frame" ? "\u80CC\u666F\u6846" : "\u6587\u5B57\u6279\u6CE8", close, children: /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("form", { className: "editor-fields decoration-editor", onSubmit: async (e) => {
    e.preventDefault();
    if (await save(draft)) close();
    else setError("\u4FDD\u5B58\u5931\u8D25\uFF0C\u5185\u5BB9\u4ECD\u5728\u8FD9\u91CC\uFF0C\u8BF7\u6838\u5BF9\u7248\u672C\u540E\u91CD\u8BD5\u3002");
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("label", { children: [
      "\u6807\u9898",
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("input", { autoFocus: true, value: draft.title, onChange: (e) => field("title", e.target.value) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("label", { children: [
      "\u6279\u6CE8\u5185\u5BB9",
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("textarea", { rows: 5, value: draft.content, onChange: (e) => field("content", e.target.value), placeholder: "\u7591\u95EE\u3001\u5907\u9009\u65B9\u5411\uFF0C\u6216\u8FD9\u4E00\u7247\u533A\u57DF\u7684\u8BA8\u8BBA\u91CD\u70B9" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "decoration-options", children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("label", { children: [
        "\u5E95\u8272",
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("select", { value: draft.color, onChange: (e) => field("color", e.target.value), children: Object.entries(colors).map(([id, name]) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: id, children: name }, id)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("label", { children: [
        "\u5B57\u4F53",
        /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("select", { "aria-label": "\u5B57\u4F53", value: draft.fontFamily, onChange: (e) => field("fontFamily", e.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: "sans", children: "\u9ED1\u4F53" }),
          /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: "serif", children: "\u5B8B\u4F53" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("label", { children: [
        "\u5B57\u53F7",
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("select", { "aria-label": "\u5B57\u53F7", value: draft.fontSize, onChange: (e) => field("fontSize", Number(e.target.value)), children: [14, 18, 24, 32].map((n) => /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("option", { value: n, children: n }, n)) })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "decoration-options", children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("label", { children: [
        "\u5BBD\u5EA6",
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("input", { type: "number", min: 160, max: 6e3, value: draft.width, onChange: (e) => field("width", Number(e.target.value)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("label", { children: [
        "\u9AD8\u5EA6",
        /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("input", { type: "number", min: 80, max: 6e3, value: draft.height, onChange: (e) => field("height", Number(e.target.value)) })
      ] })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { role: "alert", children: error }),
    latest && latest.revision !== base.revision && /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("details", { className: "section-fold", children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("summary", { children: "\u6BD4\u8F83\u6700\u65B0\u6279\u6CE8 \xB7 \u672C\u5730\u8349\u7A3F\u4ECD\u4FDD\u7559" }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("strong", { children: latest.title }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("pre", { children: latest.content }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("p", { children: "\u5728\u4E0A\u65B9\u5408\u5E76\u9700\u8981\u7684\u5185\u5BB9\uFF0C\u518D\u66F4\u65B0\u4FDD\u5B58\u57FA\u51C6\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("button", { type: "button", disabled: busy, onClick: () => {
        const changed2 = Object.fromEntries(Object.entries(draft).filter(([key2, value]) => !["id", "revision"].includes(key2) && JSON.stringify(value) !== JSON.stringify(base[key2])));
        setDraft({ ...latest, ...changed2 });
        setBase(latest);
        setError("");
      }, children: "\u5DF2\u5408\u5E76\uFF0C\u66F4\u65B0\u6279\u6CE8\u57FA\u51C6" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("button", { type: "submit", className: "primary", disabled: busy, children: "\u4FDD\u5B58\u6279\u6CE8" }),
      draft.id && /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("button", { type: "button", disabled: busy, onClick: async () => {
        if (await remove(draft)) close();
        else setError("\u5220\u9664\u672A\u5B8C\u6210\uFF0C\u6279\u6CE8\u4ECD\u4FDD\u7559\u3002");
      }, children: "\u5220\u9664\u6279\u6CE8" })
    ] })
  ] }) });
}
function DecorationCard({ value, point, zoom, busy, dragProps, edit: edit2, resize }) {
  const [size, setSize] = (0, import_react20.useState)({ width: value.width, height: value.height });
  const gesture = (0, import_react20.useRef)(null);
  const cancel = () => {
    const g = gesture.current;
    if (g) setSize({ width: g.width, height: g.height });
    gesture.current = null;
  };
  (0, import_react20.useEffect)(() => {
    if (!gesture.current) setSize({ width: value.width, height: value.height });
  }, [value.width, value.height]);
  (0, import_react20.useEffect)(() => {
    const escape = (e) => {
      if (e.key === "Escape") cancel();
    };
    window.addEventListener("keydown", escape);
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("keydown", escape);
      window.removeEventListener("blur", cancel);
    };
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("section", { "data-decoration-id": value.id, className: `planning-decoration decoration-${value.kind} tone-${value.color}`, style: { left: point.x, top: point.y, ...size, fontSize: value.fontSize, fontFamily: value.fontFamily === "serif" ? '"Noto Serif SC","SimSun",serif' : "inherit" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime17.jsxs)("header", { "data-graph-drag": "true", ...dragProps, children: [
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("button", { className: "decoration-title", "aria-label": `\u7F16\u8F91\u6279\u6CE8 ${value.title || "\u672A\u547D\u540D\u6279\u6CE8"}`, children: value.title || "\u8BA8\u8BBA\u6279\u6CE8" }),
      /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("span", { "aria-hidden": "true", children: "\u283F" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("div", { className: "decoration-content", onDoubleClick: edit2, children: value.content }),
    /* @__PURE__ */ (0, import_jsx_runtime17.jsx)("button", { className: "decoration-resize", "aria-label": `\u8C03\u6574\u6279\u6CE8\u5C3A\u5BF8 ${value.title || "\u672A\u547D\u540D\u6279\u6CE8"}`, title: "\u62D6\u52A8\u8C03\u6574\u5927\u5C0F\uFF1B\u4E5F\u53EF\u5728\u7F16\u8F91\u4E2D\u8F93\u5165\u5C3A\u5BF8", disabled: busy, onClick: (e) => e.stopPropagation(), onPointerDown: (e) => {
      if (e.button !== 0) return;
      e.stopPropagation();
      e.preventDefault();
      gesture.current = { x: e.clientX, y: e.clientY, width: size.width, height: size.height, pointer: e.pointerId, value, size };
      e.currentTarget.setPointerCapture(e.pointerId);
    }, onPointerMove: (e) => {
      const g = gesture.current;
      if (!g || g.pointer !== e.pointerId) return;
      e.stopPropagation();
      g.size = { width: Math.max(160, Math.min(6e3, g.width + (e.clientX - g.x) / zoom)), height: Math.max(80, Math.min(6e3, g.height + (e.clientY - g.y) / zoom)) };
      setSize(g.size);
    }, onPointerCancel: cancel, onPointerUp: async (e) => {
      const g = gesture.current;
      if (!g || g.pointer !== e.pointerId) return;
      e.stopPropagation();
      gesture.current = null;
      if (g.size.width === g.width && g.size.height === g.height) return;
      if (!await resize(g.value, g.size)) setSize({ width: value.width, height: value.height });
    }, children: "\u25E2" })
  ] });
}

// src/client/features/planning/data.js
async function readPlanningSnapshot(call, novelId, scope = {}) {
  let offset = 0, items = [], result, sequence;
  do {
    result = await call("planning.list", { novelId, ...scope, offset, limit: 200 });
    if (sequence !== void 0 && result.sequence !== sequence) throw new Error("\u8BFB\u53D6\u671F\u95F4\u89C4\u5212\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u8BD5\u3002\u5DF2\u6709\u753B\u5E03\u548C\u8349\u7A3F\u4ECD\u4FDD\u7559\u3002");
    sequence = result.sequence;
    items.push(...result.items);
    offset = result.nextOffset;
  } while (offset !== null);
  return { ...result, items };
}
async function readDecorations(call, novelId, pageId) {
  let offset = 0, items = [], sequence;
  do {
    const result = await call("planning.decorations", { novelId, pageId, offset, limit: 200 });
    if (sequence !== void 0 && sequence !== result.sequence) throw new Error("\u8BFB\u53D6\u671F\u95F4\u6279\u6CE8\u5DF2\u66F4\u65B0\uFF0C\u8BF7\u91CD\u8BD5");
    sequence = result.sequence;
    items.push(...result.items);
    offset = result.nextOffset;
  } while (offset !== null);
  return items;
}

// src/client/features/planning/Canvas.tsx
var import_react22 = require("react");

// src/client/features/planning/layout.ts
function arrange(nodes, edges) {
  const ids = new Set(nodes.map((n) => n.id)), levels = new Map(nodes.map((n) => [n.id, 0]));
  const links = edges.filter((e) => e.type !== "requires" && ids.has(e.from) && ids.has(e.to));
  for (let step = 0; step < nodes.length; step++) {
    let changed2 = false;
    for (const edge of links) {
      const next = Math.min(nodes.length - 1, (levels.get(edge.from) ?? 0) + 1);
      if (next > (levels.get(edge.to) ?? 0)) {
        levels.set(edge.to, next);
        changed2 = true;
      }
    }
    if (!changed2) break;
  }
  const rows = /* @__PURE__ */ new Map();
  return Object.fromEntries(nodes.map((n) => {
    const level = levels.get(n.id) ?? 0, row = rows.get(level) ?? 0;
    rows.set(level, row + 1);
    return [n.id, { x: 32 + level * 280, y: 60 + row * 170 }];
  }));
}
function arrangeGroups(nodes, edges) {
  let offset = 0;
  const positions = {};
  for (const group of new Set(nodes.map((n) => n.groupId || ""))) {
    const local = arrange(nodes.filter((n) => (n.groupId || "") === group), edges);
    for (const [id, point] of Object.entries(local)) positions[id] = { x: point.x, y: point.y + offset };
    offset += Math.max(...Object.values(local).map((p) => p.y)) + 190;
  }
  return positions;
}

// src/client/features/planning/CanvasMenu.tsx
var import_react21 = require("react");
var import_jsx_runtime18 = require("react/jsx-runtime");
function CanvasMenu({ x, y, close, items }) {
  const ref = (0, import_react21.useRef)(null);
  (0, import_react21.useEffect)(() => {
    ref.current?.querySelector("button")?.focus();
    const outside = (e) => {
      if (!ref.current?.contains(e.target)) close();
    };
    const key2 = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener("pointerdown", outside);
    window.addEventListener("keydown", key2);
    return () => {
      window.removeEventListener("pointerdown", outside);
      window.removeEventListener("keydown", key2);
    };
  }, []);
  return /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("div", { ref, role: "menu", "aria-label": "\u753B\u5E03\u64CD\u4F5C", className: "graph-context-menu", style: { left: x, top: y }, onKeyDown: (e) => {
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(e.key)) {
      e.preventDefault();
      const buttons = [...ref.current.querySelectorAll("button")], index = buttons.indexOf(document.activeElement);
      buttons[e.key === "Home" ? 0 : e.key === "End" ? buttons.length - 1 : (index + (e.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length].focus();
    }
  }, children: items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime18.jsx)("button", { role: "menuitem", onClick: () => {
    close();
    item.action();
  }, children: item.label }, item.label)) });
}

// src/client/features/planning/Canvas.tsx
var import_jsx_runtime19 = require("react/jsx-runtime");
function PlanningCanvas({ nodes, edges, groups, seen, selected, busy, onSelect, onLayout, onConnect, onDisconnect, decorations, onNew, onDecorate, onEditDecoration, onResizeDecoration, emptyMessage }) {
  const markerId = (0, import_react22.useId)(), [collapsed, setCollapsed] = (0, import_react22.useState)([]);
  const allNodes = (0, import_react22.useMemo)(() => [...nodes, ...decorations], [nodes, decorations]);
  const [menu, setMenu] = (0, import_react22.useState)(null);
  const graph = useGraph({ nodes: allNodes, edges, fallback: arrangeGroups(nodes, edges), busy, acyclic: true, onLayout, onConnect });
  const { points, scroll, surface, zoom, zoomTo, selectedEdge, setSelectedEdge, cancel } = graph;
  const signature = nodes.map((n) => n.id).sort().join(":");
  (0, import_react22.useEffect)(() => {
    const p = Object.values(points);
    if (scroll.current && p.length) {
      scroll.current.scrollLeft = Math.max(0, Math.min(...p.map((v) => v.x)) - 24);
      scroll.current.scrollTop = Math.max(0, Math.min(...p.map((v) => v.y)) - 48);
    }
  }, [signature]);
  const frames = [...new Set(nodes.map((n) => n.groupId || ""))].map((id) => {
    const members = nodes.filter((n) => (n.groupId || "") === id), positions = members.map((n) => points[n.id]);
    const x = Math.min(...positions.map((p) => p.x)) - 16, y = Math.min(...positions.map((p) => p.y)) - 38;
    return {
      id,
      members,
      name: groups.find((g) => g.id === id)?.name || "\u672A\u5206\u7EC4",
      x,
      y,
      width: Math.max(...positions.map((p) => p.x)) - x + 236,
      height: collapsed.includes(id) ? 38 : Math.max(...positions.map((p) => p.y)) - y + 172
    };
  });
  const visible = nodes.filter((n) => !collapsed.includes(n.groupId || "")), ids = new Set(visible.map((n) => n.id));
  const width = Math.max(800, ...frames.map((f) => f.x + f.width + 80), ...decorations.map((d) => points[d.id].x + d.width + 80)), height = Math.max(450, ...frames.map((f) => f.y + f.height + 80), ...decorations.map((d) => points[d.id].y + d.height + 80));
  const active = edges.find((e) => e.id === selectedEdge && ids.has(e.from) && ids.has(e.to));
  const remove = async () => {
    if (active && !busy && !graph.saving && await onDisconnect(active)) cancel();
  };
  const fit = () => {
    zoomTo(Math.min(1, (scroll.current?.clientWidth || 800) / width, (scroll.current?.clientHeight || 450) / height));
    requestAnimationFrame(() => {
      if (scroll.current) {
        scroll.current.scrollLeft = 0;
        scroll.current.scrollTop = 0;
      }
    });
  };
  const viewPoint = () => {
    const el = scroll.current;
    return { x: Math.max(32, ((el?.scrollLeft || 0) + (el?.clientWidth || 800) / 3) / zoom), y: Math.max(60, ((el?.scrollTop || 0) + (el?.clientHeight || 450) / 3) / zoom) };
  };
  const menuItems = menu?.nodeId ? [{ label: "\u6253\u5F00\u60C5\u8282", action: () => onSelect(menu.nodeId) }] : menu?.decorationId ? [{ label: "\u7F16\u8F91\u6279\u6CE8", action: () => {
    const d = decorations.find((d2) => d2.id === menu.decorationId);
    if (d) onEditDecoration(d);
  } }] : [{ label: "\u65B0\u5EFA\u60C5\u8282", action: () => onNew(menu.point) }, { label: "\u6587\u5B57\u6279\u6CE8", action: () => onDecorate("note", menu.point) }, { label: "\u80CC\u666F\u6846", action: () => onDecorate("frame", menu.point) }];
  return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "row canvas-tools", children: [
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("details", { className: "menu", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("summary", { "aria-label": "\u6DFB\u52A0\u753B\u5E03\u5185\u5BB9", children: "\u6DFB\u52A0\u6279\u6CE8" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "menu-panel", children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { disabled: busy, onClick: () => onDecorate("note", viewPoint()), children: "\u6587\u5B57\u6279\u6CE8" }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { disabled: busy, onClick: () => onDecorate("frame", viewPoint()), children: "\u80CC\u666F\u6846" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("details", { className: "menu", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("summary", { children: "\u89C6\u56FE" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { className: "menu-panel", children: [
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { onClick: fit, children: "\u9002\u5E94\u89C6\u56FE" }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { "aria-label": "\u7F29\u5C0F\u753B\u5E03", onClick: () => zoomTo(zoom - 0.1), children: "\u7F29\u5C0F" }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { "aria-label": "\u653E\u5927\u753B\u5E03", onClick: () => zoomTo(zoom + 0.1), children: "\u653E\u5927" }),
          /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { disabled: busy || graph.saving || graph.failed, onClick: () => graph.arrange(arrangeGroups(nodes, edges)), children: "\u6574\u7406\u5E03\u5C40" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("small", { className: "graph-hint", children: [
        Math.round(zoom * 100),
        "%"
      ] }),
      active && /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)(import_jsx_runtime19.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { disabled: busy || graph.saving, onClick: remove, children: "\u5220\u9664\u8FDE\u7EBF" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { onClick: cancel, children: "\u53D6\u6D88\u9009\u62E9" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(GraphStatus, { graph, busy })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: `planning-canvas-scroll ${graph.dragging ? "graph-dragging" : ""}`, ref: scroll, ...graph.scrollProps, onContextMenu: (e) => {
      e.preventDefault();
      if (busy) return;
      graph.cancel();
      const rect = surface.current.getBoundingClientRect(), bounds = scroll.current.getBoundingClientRect(), target = e.target;
      setMenu({ x: Math.max(bounds.left, Math.min(e.clientX, bounds.right - 188)), y: Math.max(bounds.top, Math.min(e.clientY, bounds.bottom - 140)), point: { x: Math.max(32, (e.clientX - rect.left) / zoom), y: Math.max(60, (e.clientY - rect.top) / zoom) }, nodeId: target.closest(".planning-card")?.dataset.nodeId, decorationId: target.closest("[data-decoration-id]")?.dataset.decorationId });
    }, onKeyDown: (e) => {
      if (active && (e.key === "Delete" || e.key === "Backspace") && !e.target.closest("input,textarea,select,button")) {
        e.preventDefault();
        void remove();
      }
    }, children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { style: { width: width * zoom, height: height * zoom }, children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("div", { ref: surface, className: "planning-canvas", style: { width, height, transform: `scale(${zoom})`, transformOrigin: "top left" }, children: [
      emptyMessage && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("p", { className: "canvas-empty", children: emptyMessage }),
      decorations.map((d) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(DecorationCard, { value: d, point: points[d.id], zoom, busy: busy || graph.saving, dragProps: graph.cardProps(d.id, () => onEditDecoration(d)), edit: () => onEditDecoration(d), resize: onResizeDecoration }, d.id)),
      frames.map((f) => /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("div", { className: "planning-group-frame", style: { left: f.x, top: f.y, width: f.width, height: f.height }, children: /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("button", { "aria-expanded": !collapsed.includes(f.id), onClick: () => {
        cancel();
        setCollapsed((values) => values.includes(f.id) ? values.filter((id) => id !== f.id) : [...values, f.id]);
      }, children: [
        collapsed.includes(f.id) ? "\u25B8" : "\u25BE",
        " ",
        f.name,
        " \xB7 ",
        f.members.length
      ] }) }, f.id)),
      /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("svg", { className: "planning-lines", width, height, "aria-label": "\u89C4\u5212\u8FDE\u7EBF", children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("defs", { children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("marker", { id: markerId, markerUnits: "userSpaceOnUse", markerWidth: "8", markerHeight: "8", refX: "7", refY: "4", orient: "auto", children: /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { d: "M0 0 L8 4 L0 8", fill: "currentColor" }) }) }),
        edges.filter((e) => ids.has(e.from) && ids.has(e.to)).map((e) => {
          const a = points[e.from], b = points[e.to], path = curve({ x: a.x + CARD_WIDTH, y: a.y + PORT_Y }, { x: b.x, y: b.y + PORT_Y });
          const choose = () => {
            if (!busy) {
              cancel();
              setSelectedEdge(e.id);
            }
          };
          return /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("g", { className: selectedEdge === e.id ? "edge-selected" : "", children: [
            /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { d: path, fill: "none", stroke: "currentColor", markerEnd: `url(#${markerId})` }),
            /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { className: "edge-hit", d: path, fill: "none", role: "button", tabIndex: 0, "aria-label": `\u8FDE\u7EBF\uFF1A${nodes.find((n) => n.id === e.from)?.title} \u2192 ${nodes.find((n) => n.id === e.to)?.title}`, "aria-pressed": selectedEdge === e.id, onClick: choose, onKeyDown: (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                choose();
              }
            } })
          ] }, e.id);
        }),
        graph.preview && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("path", { className: "graph-preview", d: graph.preview })
      ] }),
      visible.map((n) => /* @__PURE__ */ (0, import_jsx_runtime19.jsxs)("section", { "data-node-id": n.id, ...graph.cardProps(n.id, () => onSelect(n.id)), className: `planning-card ${selected === n.id ? "selected" : ""} ${graph.wire?.id === n.id ? "connect-source" : ""}`, style: { left: points[n.id].x, top: points[n.id].y }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { ...graph.portProps(n.id, "in", n.title) }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { ...graph.portProps(n.id, "out", n.title) }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("small", { className: "graph-card-kind", children: (n.lastSequence || 0) > seen ? "\u6709\u66F4\u65B0" : "\u60C5\u8282" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("button", { className: "planning-title", title: n.title, children: n.title }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("p", { title: n.summary, children: n.summary || "\u6253\u5F00\u8BA8\u8BBA\u8FD9\u4E2A\u60C5\u8282" }),
        /* @__PURE__ */ (0, import_jsx_runtime19.jsx)("span", { className: `planning-state state-${n.status}`, children: { idea: "\u8BA8\u8BBA\u4E2D", selected: "\u51C6\u5907\u91C7\u7528", written: "\u5DF2\u5199\u5165\u6B63\u6587", dropped: "\u6682\u4E0D\u91C7\u7528" }[n.status] })
      ] }, n.id))
    ] }) }) }),
    menu && /* @__PURE__ */ (0, import_jsx_runtime19.jsx)(CanvasMenu, { ...menu, close: () => {
      setMenu(null);
      scroll.current?.focus({ preventScroll: true });
    }, items: menuItems })
  ] });
}

// src/client/features/planning/index.jsx
var import_jsx_runtime20 = require("react/jsx-runtime");
var statusNames = { idea: "\u8BA8\u8BBA\u4E2D", selected: "\u51C6\u5907\u91C7\u7528", written: "\u5DF2\u5199\u5165\u6B63\u6587", dropped: "\u6682\u4E0D\u91C7\u7528" };
var scopeNames = { long: "\u957F\u671F", phase: "\u9636\u6BB5", near: "\u8FD1\u671F", unspecified: "\u672A\u6307\u5B9A" };
var edgeNames = { next: "\u5267\u60C5\u63A8\u8FDB", requires: "\u4F9D\u8D56\u94FA\u57AB", alternative: "\u5907\u9009\u5206\u652F" };
function Planning({ call, novelId, tick, run, busy, onChapter, onMemory }) {
  const { preferences } = useWorkbenchPreferences();
  const [creating, setCreating] = (0, import_react23.useState)(null), [batch, setBatch] = (0, import_react23.useState)(false);
  const [parent, setParent] = usePreference(`${novelId}:planning-parent`, null), [selected, setSelected] = usePreference(`${novelId}:planning-selected`, null), [viewChoice, setView] = (0, import_react23.useState)(preferences.planningView), [query, setQuery] = (0, import_react23.useState)(""), [filter, setFilter] = (0, import_react23.useState)(""), [thread, setThread] = (0, import_react23.useState)(""), [group, setGroup] = (0, import_react23.useState)(""), [checked, setChecked] = (0, import_react23.useState)([]), [poll, setPoll] = (0, import_react23.useState)(0), [historyOpen, setHistoryOpen] = (0, import_react23.useState)(false), [changes, setChanges] = (0, import_react23.useState)(null);
  const view = viewChoice === "auto" ? "canvas" : viewChoice;
  const { ask, confirm } = useDialog();
  const [pageId, setPageId] = usePreference(`${novelId}:planning-page`, "");
  const [decoration, setDecoration] = (0, import_react23.useState)(null), [movePage, setMovePage] = (0, import_react23.useState)("");
  const resource = useResource(() => Promise.all([readPlanningSnapshot(call, novelId, { pageId: pageId || null }), call("planning.groups", { novelId }), call("planning.pages", { novelId }), readDecorations(call, novelId, pageId || null)]).then((values) => [...values, pageId]), [call, novelId, tick, poll, pageId]);
  (0, import_react23.useEffect)(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setPoll((n) => n + 1);
    }, 4e3);
    return () => clearInterval(timer);
  }, []);
  const pageReady = resource.value?.[4] === pageId;
  const nodes = pageReady && resource.value?.[0]?.items || [], edges = pageReady && resource.value?.[0]?.edges || [];
  (0, import_react23.useEffect)(() => {
    if (pageId && resource.error?.includes("\u89C4\u5212\u9875\u9762\u4E0D\u5B58\u5728")) {
      setPageId("");
      setSelected(null);
    }
  }, [resource.error, pageId]);
  const groups = resource.value?.[1] || [];
  const pages = resource.value?.[2] || [], decorations = pageReady && resource.value?.[3] || [];
  const [seen, setSeen] = usePreference(`${novelId}:planning-seen`, 0);
  const sequence = resource.value?.[0]?.sequence || 0;
  const trail = useDetailTrail(selected);
  const open = (id) => {
    trail.visit(id);
    setSelected(id);
  };
  const close = () => {
    trail.clear();
    setSelected(null);
  };
  const back = () => {
    if (trail.previous) {
      const id = trail.previous;
      trail.back(id);
      setSelected(id);
    } else close();
  };
  const transact = (operations, reason) => run(() => call("planning.apply", { novelId, requestId: crypto.randomUUID(), operations, reason, ...operations.some((op) => op.op === "node.delete") ? { expectedSequence: sequence } : {} }));
  const connect = (from, to) => transact([{ op: "edge.create", value: { from, to, type: "next" } }], "\u5EFA\u7ACB\u8FDE\u7EBF");
  const continueFrom = (node) => setCreating({ source: node });
  const disconnect = (edge) => transact([{ op: "edge.delete", id: edge.id, expectedRevision: edge.revision, confirm: true }], "\u5220\u9664\u8FDE\u7EBF");
  const add = () => setCreating({ source: null });
  const switchPage = (id) => {
    setPageId(id);
    close();
    setParent(null);
    setGroup("");
    setQuery("");
    setFilter("");
    setThread("");
    setChecked([]);
    setDecoration(null);
  };
  const moveToPage = async () => {
    const ids = new Set(checked), cut = edges.filter((e) => ids.has(e.from) !== ids.has(e.to));
    if (cut.length && !await confirm(`\u79FB\u5230\u53E6\u4E00\u9875\u9762\u4F1A\u65AD\u5F00 ${cut.length} \u6761\u8DE8\u9875\u8FDE\u7EBF\uFF0C\u6240\u9009\u60C5\u8282\u4E4B\u95F4\u7684\u8FDE\u7EBF\u4FDD\u7559\u3002\u7EE7\u7EED\uFF1F`)) return;
    const moving = nodes.filter((n) => ids.has(n.id)), detaching = nodes.filter((n) => n.parentId && ids.has(n.id) !== ids.has(n.parentId));
    const operations = [...cut.map((e) => ({ op: "edge.delete", id: e.id, expectedRevision: e.revision, confirm: true })), ...moving.map((n) => ({ op: "node.update", id: n.id, expectedRevision: n.revision, value: { pageId: movePage || null, ...n.parentId && !ids.has(n.parentId) ? { parentId: null } : {} } })), ...detaching.filter((n) => !ids.has(n.id)).map((n) => ({ op: "node.update", id: n.id, expectedRevision: n.revision, value: { parentId: null } }))];
    if (await transact(operations, "\u79FB\u52A8\u89C4\u5212\u9875\u9762")) {
      switchPage(movePage);
      setBatch(false);
    }
  };
  const saveDecoration = (value) => transact([value.id ? { op: "decoration.update", id: value.id, expectedRevision: value.revision, value } : { op: "decoration.create", value: { ...value, pageId: pageId || null } }], "\u4FDD\u5B58\u753B\u5E03\u6279\u6CE8");
  const saveLayout = (positions) => transact(Object.entries(positions).map(([id, position]) => {
    const d = decorations.find((d2) => d2.id === id);
    return d ? { op: "decoration.update", id, expectedRevision: d.revision, value: { position } } : { op: "node.update", id, expectedRevision: nodes.find((n) => n.id === id)?.revision, value: { position } };
  }), "\u8C03\u6574\u753B\u5E03\u5E03\u5C40");
  const visible = nodes.filter((n) => (query ? `${n.title} ${n.summary} ${n.threads.join(" ")}`.toLowerCase().includes(query.toLowerCase()) : true) && (group ? (n.groupId ?? null) === filterGroup(group) : true) && (!filter || n.status === filter) && (!thread || n.threads.includes(thread)));
  const openHistory = () => run(async () => {
    let result = await call("planning.history", { novelId, offset: 0, limit: 200 });
    setChanges(result);
    setHistoryOpen(true);
  });
  const chain = [];
  let current = nodes.find((n) => n.id === parent);
  const walked = /* @__PURE__ */ new Set();
  while (current && !walked.has(current.id)) {
    walked.add(current.id);
    chain.unshift(current);
    current = nodes.find((n) => n.id === current.parentId);
  }
  if (creating) return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(CreateDocument, { draftKey: `${novelId}:planning-create:${pageId}:${creating.source?.id || "new"}`, label: creating.source ? "\u63A5\u7740\u63A8\u8FDB" : "\u65B0\u5EFA\u89C4\u5212", context: creating.source ? `\u63A5\u7EED\u300C${creating.source.title}\u300D\uFF0C\u521B\u5EFA\u540E\u81EA\u52A8\u8FDE\u63A5\u3002` : void 0, initial: { title: "", summary: "", content: "", groupId: creating.source?.groupId || filterGroup(group) || null }, ...{ groups, busy }, close: () => setCreating(null), createGroup: async (name) => {
    let result;
    await run(async () => {
      result = await call("planning.group.create", { novelId, name, requestId: crypto.randomUUID() });
    });
    return result;
  }, save: (value, requestId) => run(async () => {
    if (creating.source) {
      const result = await call("planning.continue", { novelId, nodeId: creating.source.id, expectedRevision: creating.source.revision, requestId, value, reason: `\u63A5\u7EED ${creating.source.title}` });
      open(result.node.id);
    } else {
      const result = await call("planning.apply", { novelId, requestId, reason: "\u65B0\u5EFA\u89C4\u5212", operations: [{ op: "node.create", ref: "new", value: { ...value, pageId: pageId || null, ...creating.position ? { position: creating.position } : {} } }] });
      open(result.mapping.new);
    }
  }) }, creating.source?.id || "new");
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "planning-workspace", children: [
    /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)(OverviewPage, { active: !selected, children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(PlanningPages, { pages, value: pageId, busy, change: switchPage, create: (name, summary) => run(async () => {
        const page = await call("planning.page.create", { novelId, name, summary, requestId: crypto.randomUUID() });
        switchPage(page.id);
      }), update: (page, name, summary) => run(() => call("planning.page.update", { novelId, pageId: page.id, expectedRevision: page.revision, name, summary, requestId: crypto.randomUUID() })), remove: (page) => run(async () => {
        await call("planning.page.delete", { novelId, pageId: page.id, expectedRevision: page.revision, confirm: true, requestId: crypto.randomUUID() });
        switchPage("");
      }) }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("header", { className: "module-heading", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "module-toolbar", children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("h2", { children: "\u89C4\u5212" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(ViewSwitch, { value: view, change: setView, graph: "\u6D41\u7A0B\u56FE" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("input", { className: "module-search", "aria-label": "\u641C\u7D22\u89C4\u5212", placeholder: "\u641C\u7D22\u6807\u9898\u3001\u6458\u8981", value: query, onChange: (e) => setQuery(e.target.value) }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { className: "primary", disabled: busy, onClick: add, children: "\uFF0B \u89C4\u5212" }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("details", { className: "menu", children: [
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("summary", { "aria-label": "\u89C4\u5212\u66F4\u591A\u64CD\u4F5C", children: "\xB7\xB7\xB7" }),
            /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "menu-panel", children: [
              /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => {
                setBatch(!batch);
                setChecked([]);
                setView("list");
              }, children: "\u6279\u91CF\u7BA1\u7406" }),
              /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("button", { disabled: busy, onClick: openHistory, children: [
                sequence > seen ? "\u6709\u65B0\u53D8\u5316 \xB7 " : "",
                "\u4FEE\u6539\u8BB0\u5F55"
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { children: [
                "\u8FDB\u5C55",
                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("select", { "aria-label": "\u89C4\u5212\u72B6\u6001", value: filter, onChange: (e) => setFilter(e.target.value), children: [
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: "", children: "\u5168\u90E8\u72B6\u6001" }),
                  Object.entries(statusNames).map(([v, l]) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: v, children: l }, v))
                ] })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { children: [
                "\u6545\u4E8B\u7EBF",
                /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("select", { "aria-label": "\u6545\u4E8B\u7EBF", value: thread, onChange: (e) => setThread(e.target.value), children: [
                  /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: "", children: "\u5168\u90E8\u6545\u4E8B\u7EBF" }),
                  [...new Set(nodes.flatMap((n) => n.threads))].sort().map((t) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: t, children: t }, t))
                ] })
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "filter-strip", children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(Groups, { ...{ groups, busy, call, run, novelId }, prefix: "planning", value: group, onChange: (value) => {
            setGroup(value);
            setChecked([]);
          } }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("small", { className: "scope-count", children: [
            visible.length,
            " \u9879"
          ] }),
          (query || filter || thread || group) && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { className: "clear-filter", onClick: () => {
            setQuery("");
            setFilter("");
            setThread("");
            setGroup("");
          }, children: "\u6E05\u9664\u7B5B\u9009" }),
          batch && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => {
            setBatch(false);
            setChecked([]);
          }, children: "\u5B8C\u6210\u591A\u9009" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(ResourceState, { resource, children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "planning-columns", children: /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "planning-overview", children: [
        batch && checked.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "row move-page", children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { children: [
            "\u79FB\u52A8\u5230\u9875\u9762",
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("select", { "aria-label": "\u79FB\u52A8\u5230\u9875\u9762", value: movePage, onChange: (e) => setMovePage(e.target.value), children: pages.map((p) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: p.id || "", children: p.name }, p.id || "main")) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { disabled: busy || movePage === pageId, onClick: moveToPage, children: "\u79FB\u52A8\u60C5\u8282" })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(MoveSelection, { count: checked.length, ...{ groups, busy }, clear: () => setChecked([]), onMove: (groupId) => run(async () => {
          await call("planning.apply", { novelId, requestId: crypto.randomUUID(), reason: "\u79FB\u52A8\u89C4\u5212\u5206\u7EC4", operations: checked.map((id) => ({ op: "node.update", id, expectedRevision: nodes.find((n) => n.id === id)?.revision, value: { groupId } })) });
          setChecked([]);
        }) }),
        !visible.length && view !== "canvas" ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "empty", children: query || filter || thread || group ? "\u6CA1\u6709\u5339\u914D\u7684\u89C4\u5212\uFF0C\u8BD5\u8BD5\u8C03\u6574\u7B5B\u9009\u3002" : "\u4ECE\u4E00\u4E2A\u60C5\u8282\u5F00\u59CB\u3002" }) : view === "canvas" ? /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(PlanningCanvas, { nodes: visible, emptyMessage: !visible.length ? query || filter || thread || group ? "\u6CA1\u6709\u5339\u914D\u7684\u89C4\u5212\uFF0C\u8BD5\u8BD5\u8C03\u6574\u7B5B\u9009\u3002" : !decorations.length ? "\u53F3\u952E\u6DFB\u52A0\u60C5\u8282\u3001\u6587\u5B57\u6279\u6CE8\u6216\u80CC\u666F\u6846" : null : null, decorations: query || filter || thread || group ? [] : decorations, onNew: (position) => setCreating({ source: null, position }), onDecorate: (kind2, position) => setDecoration(newDecoration(kind2, position, pageId || null)), onEditDecoration: setDecoration, onResizeDecoration: (d, size) => transact([{ op: "decoration.update", id: d.id, expectedRevision: d.revision, value: size }], "\u8C03\u6574\u6279\u6CE8\u5927\u5C0F"), groups, busy, onConnect: connect, onDisconnect: disconnect, onLayout: saveLayout, childCounts: Object.fromEntries(nodes.map((n) => [n.id, nodes.filter((c) => c.parentId === n.id).length])), edges, novelId, layer: parent, seen, selected: selected || trail.lastOpened, onSelect: open, onEnter: (id) => {
          setParent(id);
          close();
          setQuery("");
        } }, `${pageId}:${group}:${query}:${filter}:${thread}`) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "planning-list", children: visible.map((n) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: `card ${trail.lastOpened === n.id ? "selected" : ""}`, children: [
          batch && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { className: "selection-label", children: [
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("input", { type: "checkbox", "aria-label": `\u9009\u62E9 ${n.title}`, checked: checked.includes(n.id), onChange: (e) => setChecked((ids) => e.target.checked ? [...ids, n.id] : ids.filter((id) => id !== n.id)) }),
            "\u9009\u62E9"
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { className: "planning-title", "aria-current": trail.lastOpened === n.id ? "true" : void 0, onClick: () => open(n.id), children: n.title }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { className: "status-badge", children: statusNames[n.status] }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { children: n.summary }),
          nodes.some((c) => c.parentId === n.id) && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("button", { onClick: () => {
            setParent(n.id);
            close();
            setQuery("");
          }, children: [
            "\u5B50\u89C4\u5212 \xB7 ",
            nodes.filter((c) => c.parentId === n.id).length
          ] })
        ] }, n.id)) })
      ] }) }) })
    ] }),
    selected && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(DetailPage, { className: "planning-detail", backLabel: trail.previous ? "\u2039 \u8FD4\u56DE\u4E0A\u4E00\u6761" : "\u2039 \u8FD4\u56DE\u89C4\u5212", onBack: back, children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(PlanningDetail, { ...{ call, novelId, run, busy, nodes, edges, groups, transact, onChapter, onMemory, continueFrom, close }, onSelect: open, onEnter: () => {
      setParent(selected);
      close();
      setQuery("");
    }, id: selected, latest: nodes.find((n) => n.id === selected) }) }, selected),
    decoration && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(DecorationEditor, { initial: decoration, latest: decorations.find((d) => d.id === decoration.id), busy, save: saveDecoration, remove: async (d) => {
      if (await confirm("\u5220\u9664\u8FD9\u6761\u753B\u5E03\u6279\u6CE8\uFF1F\u53EF\u5728\u4FEE\u6539\u8BB0\u5F55\u4E2D\u64A4\u9500\u3002")) return transact([{ op: "decoration.delete", id: d.id, expectedRevision: d.revision, confirm: true }], "\u5220\u9664\u753B\u5E03\u6279\u6CE8");
    }, close: () => setDecoration(null) }, decoration.id || "new"),
    historyOpen && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "planning-history page", children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("h2", { className: "grow", children: "\u89C4\u5212\u4FEE\u6539\u8BB0\u5F55" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => setSeen(changes?.sequence || sequence), children: "\u6807\u4E3A\u5DF2\u8BFB" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => setHistoryOpen(false), children: "\u5173\u95ED\u8BB0\u5F55" })
      ] }),
      changes?.items.map((t) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("details", { className: "card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("summary", { children: [
          t.actor.kind === "agent" ? "AI" : "\u4F5C\u8005",
          " \xB7 ",
          t.reason,
          " \xB7 ",
          new Date(t.updatedAt).toLocaleString(),
          " \xB7 ",
          t.changes.length,
          " \u9879"
        ] }),
        t.changes.map((c) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("h3", { children: c.after.title || c.after.name || edgeNames[c.after.type] || (c.collection === "decorations" ? "\u753B\u5E03\u6279\u6CE8" : "\u5173\u7CFB") }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "muted", children: changeSummary(c) }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("details", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("summary", { children: "\u6BD4\u8F83\u524D\u540E\u7248\u672C" }),
            /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "split", children: [
              /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("h4", { children: "\u4FEE\u6539\u524D" }),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("pre", { children: describe(c.before, nodes) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { children: [
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("h4", { children: "\u4FEE\u6539\u540E" }),
                /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("pre", { children: describe(c.after, nodes) })
              ] })
            ] })
          ] }),
          c.collection === "nodes" && !c.after.deleted && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => {
            setPageId(c.after.pageId || "");
            setParent(c.after.parentId || null);
            open(c.id);
            setHistoryOpen(false);
          }, children: "\u5B9A\u4F4D\u8282\u70B9" })
        ] }, `${c.collection}:${c.id}`)),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { disabled: busy, onClick: async () => {
          if (await confirm("\u64A4\u9500\u8FD9\u6B21\u53D8\u66F4\uFF1F\u82E5\u76F8\u5173\u5BF9\u8C61\u5DF2\u6709\u540E\u7EED\u4FEE\u6539\uFF0C\u5C06\u62D2\u7EDD\u8986\u76D6\u3002")) run(async () => {
            await call("planning.revert", { novelId, transactionId: t.id, requestId: crypto.randomUUID() });
            setHistoryOpen(false);
          });
        }, children: "\u64A4\u9500\u8FD9\u6B21\u53D8\u66F4" })
      ] }, t.id)),
      changes?.nextOffset !== null && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { disabled: busy, onClick: () => run(async () => {
        const next = await call("planning.history", { novelId, offset: changes.nextOffset, limit: 200 });
        setChanges({ ...next, items: [...changes.items, ...next.items] });
      }), children: "\u52A0\u8F7D\u66F4\u591A\u8BB0\u5F55" })
    ] })
  ] });
}
function PlanningDetail(props) {
  const resource = useResource(() => props.call("planning.get", { novelId: props.novelId, nodeId: props.id }), [props.call, props.novelId, props.id]);
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(ResourceState, { resource, children: resource.value && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(PlanningEditor, { ...props, initial: resource.value.node }) });
}
function PlanningEditor({ call, novelId, run, busy, id, initial, latest, nodes, edges, groups, transact, close, onChapter, onMemory, onEnter, continueFrom, onSelect }) {
  const { value, base, change, accept, rebase, dirty, cacheError } = useDraft(`${novelId}:planning:${id}`, initial);
  const { confirm, ask } = useDialog();
  const refs = useResource(() => Promise.all([call("chapter.list", { novelId }), call("graph.list", { novelId })]), [call, novelId]);
  const [chapters = [], memory = []] = refs.value || [];
  const [target, setTarget] = (0, import_react23.useState)(""), [referenceQuery, setReferenceQuery] = (0, import_react23.useState)(""), [remote, setRemote] = (0, import_react23.useState)(null), [editing, setEditing] = (0, import_react23.useState)(dirty);
  const [threadText, setThreadText] = (0, import_react23.useState)(value.threads.join(", "));
  (0, import_react23.useEffect)(() => setThreadText(value.threads.join(", ")), [base]);
  const set = (key2, v) => change((old) => ({ ...old, [key2]: v }));
  const reload = () => run(async () => accept((await call("planning.get", { novelId, nodeId: id })).node));
  const save = () => run(async () => {
    await call("planning.apply", { novelId, requestId: crypto.randomUUID(), reason: `\u4FEE\u6539 ${value.title}`, operations: [{ op: "node.update", id, expectedRevision: base.revision, value }] });
    accept((await call("planning.get", { novelId, nodeId: id })).node);
  });
  const adjacent = (direction) => edges.filter((e) => direction === "before" ? e.to === id : e.from === id).map((e) => nodes.find((n) => n.id === (direction === "before" ? e.from : e.to))).filter(Boolean);
  return /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { onKeyDown: (e) => saveShortcut(e, () => {
    if (dirty && !busy) save();
  }), children: [
    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("h2", { children: value.title }),
    /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(DetailActions, { children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => setEditing(!editing), children: editing ? "\u9605\u8BFB\u9884\u89C8" : "\u7F16\u8F91\u89C4\u5212" }) }),
    latest?.revision !== base.revision && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "notice", children: "\u8FDC\u7AEF\u6709\u66F4\u65B0\uFF0C\u8349\u7A3F\u4ECD\u4FDD\u7559\u3002\u4FDD\u5B58\u4F1A\u68C0\u67E5\u7248\u672C\u3002" }),
    value.deleted && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "notice", children: "\u6B64\u89C4\u5212\u5DF2\u5220\u9664\uFF0C\u53EF\u5728\u5386\u53F2\u4E2D\u64A4\u9500\u5220\u9664\u3002" }),
    editing ? /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("fieldset", { className: "editor-fields document-fields", disabled: busy || value.deleted, children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { children: [
        "\u6807\u9898",
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("input", { value: value.title, onChange: (e) => set("title", e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { children: [
        "\u6458\u8981",
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(DocumentTextarea, { "aria-label": "\u6458\u8981", value: value.summary, onChange: (e) => set("summary", e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { children: [
        "\u6B63\u6587",
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(DocumentTextarea, { "aria-label": "\u6B63\u6587", className: "prose", value: value.content, onChange: (e) => set("content", e.target.value) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(GroupSelect, { groups, value: value.groupId, onChange: (id2) => set("groupId", id2) }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { children: [
        "\u8BA8\u8BBA\u8FDB\u5C55",
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("select", { value: value.status, onChange: (e) => set("status", e.target.value), children: Object.entries(statusNames).map(([v, l]) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: v, children: l }, v)) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("details", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("summary", { children: "\u66F4\u591A\u5C5E\u6027\u4E0E\u65E7\u7248\u5C42\u7EA7" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("div", { className: "split", children: /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { children: [
          "\u8303\u56F4",
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("select", { value: value.scope, onChange: (e) => set("scope", e.target.value), children: Object.entries(scopeNames).map(([v, l]) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: v, children: l }, v)) })
        ] }) }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { children: [
          "\u6240\u5C5E\u9636\u6BB5",
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("select", { value: value.parentId || "", onChange: (e) => set("parentId", e.target.value || null), children: [
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: "", children: "\u5168\u4E66" }),
            nodes.filter((n) => n.id !== id).map((n) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: n.id, children: n.title }, n.id))
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { children: [
          "\u6545\u4E8B\u7EBF\uFF08\u9017\u53F7\u5206\u9694\uFF09",
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("input", { value: threadText, onChange: (e) => {
            setThreadText(e.target.value);
            set("threads", [...new Set(e.target.value.split(/[,，]/).map((s) => s.trim()).filter(Boolean))]);
          } })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("details", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("summary", { children: "\u5173\u8054\u6B63\u6587\u4E0E\u4EBA\u7269\u8BBE\u5B9A" }),
        value.chapterRefs.map((r) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("p", { children: [
          chapters.find((c) => c.id === r.chapterId)?.title || "\u5DF2\u5220\u9664\u6216\u7F3A\u5931\u7AE0\u8282",
          " \xB7 \u7248\u672C",
          r.revision,
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => set("chapterRefs", value.chapterRefs.filter((x) => x.chapterId !== r.chapterId)), children: "\u79FB\u9664" })
        ] }, r.chapterId)),
        value.memoryRefs.map((id2) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("p", { children: [
          memory.find((n) => n.id === id2)?.name || "\u5DF2\u5220\u9664\u6216\u7F3A\u5931\u8BBE\u5B9A",
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => set("memoryRefs", value.memoryRefs.filter((x) => x !== id2)), children: "\u79FB\u9664" })
        ] }, id2)),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("input", { "aria-label": "\u7B5B\u9009\u5173\u8054\u8D44\u6599", placeholder: "\u641C\u7D22\u7AE0\u8282\u6216\u8BBE\u5B9A", value: referenceQuery, onChange: (e) => setReferenceQuery(e.target.value) }),
        chapters.filter((c) => c.title.includes(referenceQuery)).map((c) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("input", { type: "checkbox", checked: value.chapterRefs.some((r) => r.chapterId === c.id), onChange: (e) => set("chapterRefs", e.target.checked ? [...value.chapterRefs, { chapterId: c.id, revision: c.revision }] : value.chapterRefs.filter((r) => r.chapterId !== c.id)) }),
          c.title,
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { type: "button", onClick: () => onChapter(c.id), children: "\u6253\u5F00" }),
          value.chapterRefs.some((r) => r.chapterId === c.id && r.revision !== c.revision) && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { children: "\u6B63\u6587\u7248\u672C\u5DF2\u53D8\u5316" })
        ] }, c.id)),
        memory.filter((n) => n.name.includes(referenceQuery)).map((n) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("label", { className: "row", children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("input", { type: "checkbox", checked: value.memoryRefs.includes(n.id), onChange: (e) => set("memoryRefs", e.target.checked ? [...value.memoryRefs, n.id] : value.memoryRefs.filter((v) => v !== n.id)) }),
          n.name
        ] }, n.id))
      ] })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("section", { className: "planning-reading", children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { className: "document-summary", children: value.summary }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("article", { className: "document-body", children: value.content || "\u5C1A\u672A\u586B\u5199\u8BE6\u7EC6\u89C4\u5212" }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("details", { className: "section-fold", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("summary", { children: "\u5C5E\u6027" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("p", { className: "muted", children: [
          scopeNames[value.scope],
          " \xB7 ",
          statusNames[value.status],
          " \xB7 ",
          value.threads.join(" / ") || "\u672A\u6307\u5B9A\u6545\u4E8B\u7EBF"
        ] })
      ] }),
      value.chapterRefs.map((r) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(ChapterEvidence, { ...{ call, novelId, onChapter }, source: r, title: chapters.find((c) => c.id === r.chapterId)?.title }, r.chapterId)),
      value.memoryRefs.map((ref) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { children: /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => onMemory(ref), children: memory.find((n) => n.id === ref)?.name || "\u5DF2\u5220\u9664\u6216\u7F3A\u5931\u8BBE\u5B9A" }) }, ref))
    ] }),
    (editing || dirty) && /* @__PURE__ */ (0, import_jsx_runtime20.jsx)(SaveBar, { ...{ dirty, busy }, error: cacheError, invalid: !value.title.trim() ? "\u8BF7\u586B\u5199\u6807\u9898" : value.deleted ? "\u5DF2\u5220\u9664" : null, onSave: save, label: "\u4FDD\u5B58\u89C4\u5212" }),
    /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("section", { className: "flow-context", "aria-label": "\u60C5\u8282\u524D\u540E\u5173\u7CFB", children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("small", { children: "\u4ECE\u54EA\u91CC\u6765" }),
        adjacent("before").length ? adjacent("before").map((n) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => onSelect(n.id), children: n.title }, n.id)) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { children: "\u8FD9\u6761\u8DEF\u7EBF\u7684\u8D77\u70B9" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { "aria-hidden": "true", children: "\u2192" }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("small", { children: "\u5F53\u524D\u60C5\u8282" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("strong", { children: value.title }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { className: "status-badge", children: statusNames[value.status] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("span", { "aria-hidden": "true", children: "\u2192" }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("small", { children: "\u63A5\u4E0B\u6765" }),
        adjacent("after").length ? adjacent("after").map((n) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => onSelect(n.id), children: n.title }, n.id)) : /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { children: "\u7B49\u5F85\u8BA8\u8BBA\u4E0B\u4E00\u6B65" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { disabled: busy || dirty || value.deleted, title: dirty ? "\u5148\u4FDD\u5B58\u5F53\u524D\u8282\u70B9\uFF0C\u518D\u7EE7\u7EED\u63A8\u8FDB" : void 0, onClick: () => continueFrom(latest || base), children: "\uFF0B \u63A5\u7740\u63A8\u8FDB" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("details", { className: "section-fold", children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("summary", { children: "\u7248\u672C\u4E0E\u5F15\u7528" }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => run(() => navigator.clipboard.writeText(`\u89C4\u5212\uFF1A${value.title} [\u89C4\u5212\u8282\u70B9: ${id}]`)), children: "\u590D\u5236\u8282\u70B9\u5F15\u7528" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { disabled: busy, onClick: async () => {
          if (!dirty || await confirm("\u4E22\u5F03\u672C\u5730\u8349\u7A3F\u5E76\u8BFB\u53D6\u6700\u65B0\u89C4\u5212\uFF1F")) reload();
        }, children: "\u8BFB\u53D6\u6700\u65B0" })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { disabled: busy, onClick: () => run(async () => setRemote((await call("planning.get", { novelId, nodeId: id })).node)), children: "\u6BD4\u8F83\u8FDC\u7AEF\u7248\u672C" }),
      remote && /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("section", { className: "card", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("h3", { children: [
          "\u8FDC\u7AEF\u7248\u672C ",
          remote.revision
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "split", children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("h3", { children: "\u672C\u5730" }),
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("pre", { children: describe(value, nodes) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { children: [
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("h3", { children: "\u8FDC\u7AEF" }),
            /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("pre", { children: describe(remote, nodes) })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("p", { children: "\u5728\u4E0A\u65B9\u7F16\u8F91\u5668\u5408\u5E76\u9700\u8981\u7684\u5185\u5BB9\uFF0C\u518D\u66F4\u65B0\u4FDD\u5B58\u57FA\u51C6\u3002" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { disabled: busy || remote.deleted, onClick: async () => {
          if (await confirm("\u786E\u8BA4\u5DF2\u5408\u5E76\u9700\u8981\u7684\u5185\u5BB9\uFF1F\u540E\u7EED\u4FDD\u5B58\u4ECD\u68C0\u67E5\u7248\u672C\u3002")) {
            rebase(remote);
            setRemote(null);
          }
        }, children: "\u5DF2\u5408\u5E76\uFF0C\u66F4\u65B0\u4FDD\u5B58\u57FA\u51C6" }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { onClick: () => setRemote(null), children: "\u5173\u95ED\u6BD4\u8F83" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("details", { className: "section-fold", children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("summary", { children: "\u7BA1\u7406\u8FDE\u7EBF" }),
      edges.filter((e) => e.from === id || e.to === id).map((e) => /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "source-row", children: [
        nodes.find((n) => n.id === e.from)?.title,
        " \u2192 ",
        nodes.find((n) => n.id === e.to)?.title,
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { disabled: busy, onClick: async () => {
          if (await confirm("\u5220\u9664\u8FD9\u6761\u89C4\u5212\u5173\u7CFB\uFF1F")) transact([{ op: "edge.delete", id: e.id, expectedRevision: e.revision, confirm: true }], "\u5220\u9664\u89C4\u5212\u5173\u7CFB");
        }, children: "\u79FB\u9664" })
      ] }, e.id)),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("select", { "aria-label": "\u76EE\u6807\u89C4\u5212", value: target, onChange: (e) => setTarget(e.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: "", children: "\u9009\u62E9\u76EE\u6807" }),
          nodes.filter((n) => n.id !== id).map((n) => /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("option", { value: n.id, children: n.title }, n.id))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { disabled: busy || !target, onClick: () => transact([{ op: "edge.create", value: { from: id, to: target, type: "next" } }], "\u5EFA\u7ACB\u5267\u60C5\u5173\u7CFB"), children: "\u8FDE\u63A5" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime20.jsxs)("details", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("summary", { children: "\u5220\u9664\u89C4\u5212" }),
      /* @__PURE__ */ (0, import_jsx_runtime20.jsx)("button", { className: "danger", disabled: busy, onClick: async () => {
        let childPolicy = "detach";
        if (nodes.some((n) => n.parentId === id)) {
          const choice = await ask("\u8F93\u5165\u201C\u79FB\u51FA\u201D\u4FDD\u7559\u5B50\u8282\u70B9\uFF0C\u6216\u201C\u5B50\u6811\u201D\u5220\u9664\u5168\u90E8\u4E0B\u7EA7", "\u79FB\u51FA");
          if (!["\u79FB\u51FA", "\u5B50\u6811"].includes(choice)) return;
          childPolicy = choice === "\u5B50\u6811" ? "subtree" : "detach";
        }
        if (await confirm("\u5220\u9664\u6B64\u89C4\u5212\u53CA\u76F8\u5173\u8FDE\u7EBF\uFF1F\u53EF\u5728\u4FEE\u6539\u8BB0\u5F55\u4E2D\u64A4\u9500\u3002")) {
          const ok = await transact([{ op: "node.delete", id, expectedRevision: base.revision, confirm: true, childPolicy }], "\u5220\u9664\u89C4\u5212");
          if (ok) {
            accept(initial);
            close();
          }
        }
      }, children: "\u5220\u9664\u8282\u70B9" })
    ] })
  ] });
}
function describe(value, nodes) {
  if (value?.kind === "note" || value?.kind === "frame") return `\u6279\u6CE8\uFF1A${value.title}
${value.content}
${value.width} \xD7 ${value.height} \xB7 ${value.color} \xB7 ${value.fontSize}`;
  if (value?.name !== void 0) return `\u540D\u79F0\uFF1A${value.name}
${value.summary || ""}${value.deleted ? "\n\u5DF2\u5220\u9664" : ""}`;
  if (!value) return "\u4E0D\u5B58\u5728\uFF08\u672C\u6B21\u65B0\u589E\uFF09";
  if (value.from) return `${nodes.find((n) => n.id === value.from)?.title || value.from} \u2192 ${edgeNames[value.type]} \u2192 ${nodes.find((n) => n.id === value.to)?.title || value.to}
${value.label || ""}${value.deleted ? "\n\u5DF2\u5220\u9664" : ""}`;
  return [`\u6807\u9898\uFF1A${value.title}`, `\u8303\u56F4\uFF1A${scopeNames[value.scope]} \xB7 \u8FDB\u5C55\uFF1A${statusNames[value.status]}`, `\u6240\u5C5E\uFF1A${nodes.find((n) => n.id === value.parentId)?.title || value.parentId || "\u5168\u4E66"}`, `\u6545\u4E8B\u7EBF\uFF1A${value.threads.join("\u3001") || "\u672A\u6307\u5B9A"}`, `\u6982\u8FF0\uFF1A${value.summary}`, value.content, `\u6B63\u6587\u5F15\u7528\uFF1A${value.chapterRefs.map((r) => `${r.chapterId} \xB7 \u7248\u672C${r.revision}`).join("\uFF1B") || "\u65E0"}`, `\u8BBE\u5B9A\u5F15\u7528\uFF1A${value.memoryRefs.join("\u3001") || "\u65E0"}`, value.deleted ? "\u5DF2\u5220\u9664" : ""].filter(Boolean).join("\n");
}
function changeSummary(change) {
  if (!change.before) return "\u65B0\u589E";
  const labels = { pageId: "\u6240\u5C5E\u9875\u9762", width: "\u5BBD\u5EA6", height: "\u9AD8\u5EA6", fontSize: "\u5B57\u53F7", fontFamily: "\u5B57\u4F53", color: "\u5E95\u8272", groupId: "\u6240\u5C5E\u5206\u7EC4", position: "\u753B\u5E03\u4F4D\u7F6E", name: "\u5206\u7EC4\u540D\u79F0", title: "\u6807\u9898", summary: "\u6982\u8FF0", content: "\u8BE6\u7EC6\u5185\u5BB9", scope: "\u8303\u56F4", status: "\u8FDB\u5C55", parentId: "\u6240\u5C5E\u9636\u6BB5", threads: "\u6545\u4E8B\u7EBF", chapterRefs: "\u6B63\u6587\u5F15\u7528", memoryRefs: "\u8BBE\u5B9A\u5F15\u7528", deleted: "\u5220\u9664\u72B6\u6001", from: "\u8D77\u70B9", to: "\u7EC8\u70B9", type: "\u5173\u7CFB\u7C7B\u578B", label: "\u5173\u7CFB\u8BF4\u660E" };
  return Object.entries(labels).filter(([key2]) => JSON.stringify(change.before[key2]) !== JSON.stringify(change.after[key2])).map(([, label]) => label).join("\u3001") || "\u7248\u672C\u66F4\u65B0";
}

// src/client/features/preset/index.jsx
var import_react24 = __toESM(require("react"), 1);

// src/domain/preset/index.js
var object = (v) => v && typeof v === "object" && !Array.isArray(v);
var fail = (message2) => {
  throw Object.assign(new Error(message2), { code: "INVALID_PRESET" });
};
function presetBlockReason(block) {
  return block.marker && !block.content?.trim() ? "\u52A8\u6001\u5360\u4F4D\u6761\u76EE\u6CA1\u6709\u63D0\u793A\u8BCD\u6B63\u6587\uFF0C\u5185\u5BB9\u7531\u50AC\u66F4\u59EC\u6309\u81EA\u5DF1\u7684\u65B9\u5F0F\u8BFB\u53D6" : "";
}
function presetBlockNotice(block) {
  if (presetBlockReason(block)) return presetBlockReason(block);
  return /\{\{|\}\}/.test(block.content) ? "\u542B\u9152\u9986\u5B8F\u6216\u5360\u4F4D\u7B26\uFF1A\u6309\u539F\u6587\u4FDD\u7559\uFF0C\u4E0D\u6267\u884C\u66FF\u6362\uFF1B\u53EF\u5728\u4E0B\u65B9\u6539\u6210\u660E\u786E\u7684\u5199\u4F5C\u8981\u6C42\u3002" : "";
}
function source(input) {
  if (!object(input) || JSON.stringify(input).length > 2e6) fail("\u9884\u8BBE\u5FC5\u987B\u662F\u5C0F\u4E8E 2 MB \u7684 JSON \u5BF9\u8C61");
  if (Array.isArray(input.prompts)) return { data: input, format: "chat-completion" };
  if (object(input.data) && Array.isArray(input.data.prompts)) return { data: input.data, format: "prompt-manager" };
  if (typeof input.content === "string" || typeof input.system_prompt === "string") {
    const fields2 = [["content", "\u4E3B\u8981\u63D0\u793A\u8BCD"], ["system_prompt", "\u7CFB\u7EDF\u63D0\u793A\u8BCD"], ["post_history", "\u8865\u5145\u8981\u6C42"], ["post_history_instructions", "\u8865\u5145\u6307\u4EE4"]];
    for (const [key2] of fields2) if (input[key2] !== void 0 && typeof input[key2] !== "string") fail(`${key2} \u5FC5\u987B\u662F\u6587\u672C`);
    const prompts = fields2.filter(([key2]) => typeof input[key2] === "string").map(([key2, name]) => ({ identifier: key2, name, content: input[key2], enabled: true }));
    return { data: { prompts }, format: "system-prompt" };
  }
  if ("story_string" in input || "input_sequence" in input || "output_sequence" in input) fail("\u8FD9\u662F\u4E0A\u4E0B\u6587\u88C5\u586B\u6216 Instruct \u5206\u9694\u6A21\u677F\uFF0C\u6CA1\u6709\u72EC\u7ACB\u63D0\u793A\u8BCD\u6B63\u6587\u3002\u8BF7\u9009\u62E9\u5B8C\u6574 Chat Completion \u9884\u8BBE\u3001\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u5BFC\u51FA\u6216\u7CFB\u7EDF\u63D0\u793A\u8BCD\u6587\u4EF6\u3002");
  fail("\u672A\u627E\u5230\u63D0\u793A\u8BCD\u5185\u5BB9\u3002\u652F\u6301\u542B prompts \u7684\u5B8C\u6574\u9884\u8BBE\u3001\u63D0\u793A\u8BCD\u7BA1\u7406\u5668\u5BFC\u51FA\uFF0C\u4EE5\u53CA\u542B content \u7684\u7CFB\u7EDF\u63D0\u793A\u8BCD JSON\uFF1B\u4EC5\u91C7\u6837\u53C2\u6570\u7684\u6587\u4EF6\u4E0D\u5305\u542B\u63D0\u793A\u8BCD\u3002");
}
function presetImportOrders(input) {
  const { data } = source(input), orders = data.prompt_order;
  if (orders === void 0 || orders === null) return [];
  if (!Array.isArray(orders)) fail("prompt_order \u5FC5\u987B\u662F\u6570\u7EC4");
  if (!orders.length) return [];
  if (orders.every((v) => object(v) && typeof v.identifier === "string")) return [{ character_id: "flat", order: orders }];
  if (!orders.every((v) => object(v) && v.character_id !== void 0 && Array.isArray(v.order))) fail("\u63D0\u793A\u8BCD\u6392\u5217\u7ED3\u6784\u65E0\u6548");
  if (new Set(orders.map((v) => String(v.character_id))).size !== orders.length) fail("\u63D0\u793A\u8BCD\u6392\u5217\u65B9\u6848\u6807\u8BC6\u91CD\u590D");
  return orders;
}
function validatePreset(value) {
  if (JSON.stringify(value)?.length > 2e6) fail("\u9884\u8BBE\u603B\u5927\u5C0F\u8D85\u8FC7 2 MB");
  if (!object(value) || typeof value.name !== "string" || !value.name.trim() || typeof value.enabled !== "boolean" || !Array.isArray(value.blocks) || value.blocks.length > 500) fail("\u9884\u8BBE\u683C\u5F0F\u65E0\u6548");
  if (value.importFormat !== void 0 && !["chat-completion", "prompt-manager", "system-prompt"].includes(value.importFormat)) fail("\u9884\u8BBE\u5BFC\u5165\u683C\u5F0F\u6807\u8BC6\u65E0\u6548");
  const ids = /* @__PURE__ */ new Set();
  let length = 0;
  for (const block of value.blocks) {
    if (!object(block) || typeof block.identifier !== "string" || ids.has(block.identifier) || typeof block.content !== "string" || typeof block.name !== "string" || typeof block.enabled !== "boolean") fail("\u9884\u8BBE\u6761\u76EE\u65E0\u6548\u6216\u6807\u8BC6\u91CD\u590D");
    ids.add(block.identifier);
    length += block.content.length;
  }
  if (length > 1e5) fail("\u63D0\u793A\u8BCD\u603B\u957F\u5EA6\u4E0D\u80FD\u8D85\u8FC7 100000 \u5B57\u7B26");
  return value;
}
function compilePreset(preset) {
  if (!preset?.enabled) return "";
  validatePreset(preset);
  return preset.blocks.filter((block) => block.enabled && block.content.trim()).map((block) => block.content).join("\n\n");
}

// src/client/features/preset/index.jsx
var import_jsx_runtime21 = require("react/jsx-runtime");
function Preset(props) {
  const resource = useResource(() => props.call("preset.get", { novelId: props.novelId }).then((v) => v || { name: "\u5199\u4F5C\u9884\u8BBE", enabled: false, blocks: [], revision: 0 }), [props.call, props.novelId]);
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(ResourceState, { resource, children: resource.value && /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(PresetEditor, { ...props, initial: resource.value }) });
}
function PresetEditor({ call, novelId, run, busy, initial }) {
  const { value, base, change, accept, dirty, cacheError } = useDraft(`${novelId}:preset`, initial);
  const [onlyUnsupported, setOnlyUnsupported] = (0, import_react24.useState)(false);
  const [orders, setOrders] = (0, import_react24.useState)([]);
  const [file, setFile] = (0, import_react24.useState)(null), [orderId, setOrderId] = (0, import_react24.useState)(""), [selected, setSelected] = usePreference(`${novelId}:preset-selected`, null);
  const { confirm } = useDialog();
  const update = (index, patch) => change((v) => ({ ...v, blocks: v.blocks.map((b, i) => i === index ? { ...b, ...patch } : b) }));
  const move = (index, delta) => {
    setSelected(index + delta);
    change((v) => {
      const blocks = [...v.blocks];
      [blocks[index], blocks[index + delta]] = [blocks[index + delta], blocks[index]];
      return { ...v, blocks };
    });
  };
  let preview = "", candidate = "", invalid = "";
  try {
    preview = compilePreset(value);
    candidate = compilePreset({ ...value, enabled: true });
  } catch (e) {
    invalid = e.message;
  }
  const active = value.blocks.filter((b) => b.enabled && b.content.trim()).length;
  const state = (block) => presetBlockReason(block) ? "\u65E0\u6B63\u6587" : `${block.enabled ? "\u542F\u7528" : "\u505C\u7528"}${presetBlockNotice(block) ? " \xB7 \u542B\u5360\u4F4D\u7B26" : ""}`;
  const warnings = value.importFormat ? value.warnings : [];
  const save = () => run(async () => accept(await call("preset.set", { novelId, expectedRevision: base.revision, preset: value })));
  return /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "page", children: [
    /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("h2", { className: "grow", children: value.name || "\u5199\u4F5C\u9884\u8BBE" }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("label", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("input", { type: "checkbox", disabled: busy, checked: value.enabled, onChange: (e) => change((v) => ({ ...v, enabled: e.target.checked })) }),
        "\u542F\u7528"
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "muted", children: "\u6309\u5217\u8868\u987A\u5E8F\u4F7F\u7528\u5DF2\u542F\u7528\u7684\u63D0\u793A\u8BCD\u5185\u5BB9\uFF0C\u4FEE\u6539\u4FDD\u5B58\u540E\u4ECE\u4E0B\u4E00\u6B21\u8BF7\u6C42\u5F00\u59CB\u751F\u6548\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("p", { role: "status", className: "preset-effective-summary", children: [
      value.blocks.length,
      " \u4E2A\u6761\u76EE \xB7 ",
      active,
      " \u4E2A\u6709\u6548\u6761\u76EE \xB7 \u542F\u7528\u540E ",
      candidate.length.toLocaleString("zh-CN"),
      " \u5B57\u7B26"
    ] }),
    !candidate.trim() && /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "notice", children: "\u5F53\u524D\u6CA1\u6709\u53EF\u751F\u6548\u7684\u63D0\u793A\u8BCD\u6B63\u6587\u3002\u8BF7\u542F\u7528\u6709\u5185\u5BB9\u7684\u6761\u76EE\uFF0C\u6216\u65B0\u589E\u5199\u4F5C\u8981\u6C42\u3002" }),
    value.raw && !value.importFormat && /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "muted", children: "\u65E7\u7248\u5BFC\u5165\u7684\u505C\u7528\u72B6\u6001\u5DF2\u4FDD\u7559\uFF1B\u91CD\u65B0\u5BFC\u5165\u539F\u6587\u4EF6\u53EF\u6309\u65B0\u7684\u5185\u5BB9\u4F18\u5148\u89C4\u5219\u89E3\u6790\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("details", { className: "section-fold", children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("summary", { children: "\u5BFC\u5165\u4E0E\u9884\u8BBE\u8BBE\u7F6E" }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("label", { children: [
        "\u5BFC\u5165\u5199\u4F5C\u9884\u8BBE JSON",
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("input", { type: "file", disabled: busy, accept: ".json,application/json", onChange: (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          setFile(null);
          setOrders([]);
          if (f) run(async () => {
            if (f.size > 2e6) throw new Error("\u9884\u8BBE\u8D85\u8FC7 2 MB");
            const data = JSON.parse((await f.text()).replace(/^\uFEFF/, ""));
            const options = presetImportOrders(data);
            setFile(data);
            setOrders(options);
            setOrderId(String((options.find((o) => String(o.character_id) === "100001") || options[0])?.character_id ?? ""));
          });
        } })
      ] }),
      file && /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "card", children: [
        orders.length > 1 && /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("label", { children: [
          "\u63D0\u793A\u8BCD\u6392\u5217\u65B9\u6848",
          /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("select", { disabled: busy, value: orderId, onChange: (e) => setOrderId(e.target.value), children: orders.map((o, i) => /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("option", { value: String(o.character_id), children: String(o.character_id) === "100001" ? "\u9152\u9986\u901A\u7528\u6392\u5217" : `\u65B9\u6848 ${o.character_id}` }, i)) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("button", { disabled: busy, onClick: async () => {
          if (!dirty || await confirm("\u7528\u5BFC\u5165\u5185\u5BB9\u66FF\u6362\u5F53\u524D\u672A\u4FDD\u5B58\u7684\u9884\u8BBE\u8349\u7A3F\uFF1F")) run(async () => {
            const p = await call("preset.preview", { novelId, input: file, ...orderId ? { orderId } : {} });
            change({ ...p, revision: base.revision });
            setFile(null);
            setOnlyUnsupported(false);
            setSelected(p.blocks.length ? 0 : null);
          });
        }, children: "\u89E3\u6790\u4E3A\u9884\u8BBE\u8349\u7A3F" }),
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("button", { disabled: busy, onClick: () => setFile(null), children: "\u53D6\u6D88\u5BFC\u5165" })
      ] }),
      !!warnings?.length && /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("details", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("summary", { children: [
          "\u5BFC\u5165\u8BF4\u660E \xB7 ",
          warnings.length,
          " \u9879"
        ] }),
        warnings.map((w, i) => /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { children: w }, i))
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("label", { children: [
        "\u9884\u8BBE\u540D\u79F0",
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("input", { disabled: busy, value: value.name, onChange: (e) => change((v) => ({ ...v, name: e.target.value })) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("button", { disabled: busy, onClick: async () => {
          if (!dirty || await confirm("\u4E22\u5F03\u9884\u8BBE\u8349\u7A3F\u5E76\u8BFB\u53D6\u5DF2\u4FDD\u5B58\u7248\u672C\uFF1F")) run(async () => {
            accept(await call("preset.get", { novelId }) || initial);
            setSelected(null);
            setOnlyUnsupported(false);
          });
        }, children: "\u8BFB\u53D6\u5DF2\u4FDD\u5B58\u7248\u672C" }),
        value.raw && /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("button", { onClick: () => {
          const url = URL.createObjectURL(new Blob([JSON.stringify(value.raw, null, 2)], { type: "application/json" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = "original-tavern-preset.json";
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1e3);
        }, children: "\u4E0B\u8F7D\u539F\u59CB\u6587\u4EF6\uFF08\u4E0D\u542B\u7F16\u8F91\uFF09" })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("button", { disabled: busy, onClick: () => {
        setOnlyUnsupported(false);
        setSelected(value.blocks.length);
        change((v) => ({ ...v, blocks: [...v.blocks, { identifier: crypto.randomUUID(), name: "\u65B0\u63D0\u793A\u8BCD", content: "", role: "system", enabled: true }] }));
      }, children: "\u65B0\u589E\u63D0\u793A\u8BCD" }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("label", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("input", { type: "checkbox", checked: onlyUnsupported, onChange: (e) => {
          setOnlyUnsupported(e.target.checked);
          setSelected(null);
        } }),
        "\u53EA\u770B\u9700\u68C0\u67E5"
      ] })
    ] }),
    !value.enabled && /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "muted", children: "\u6574\u4F53\u505C\u7528\uFF0C\u6761\u76EE\u914D\u7F6E\u4ECD\u4FDD\u7559\u3002" }),
    !value.blocks.length && /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "empty", children: "\u65B0\u589E\u63D0\u793A\u8BCD\uFF0C\u6216\u4ECE\u9884\u8BBE\u8BBE\u7F6E\u4E2D\u5BFC\u5165\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "preset-layout", children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("aside", { className: `preset-list ${selected !== null ? "is-selected" : ""}`, children: value.blocks.map((block, i) => onlyUnsupported && !presetBlockNotice(block) ? null : /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("button", { className: selected === i ? "selected" : "", onClick: () => setSelected(i), children: [
        i + 1,
        ". ",
        block.name,
        /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("small", { children: [
          " \xB7 ",
          state(block)
        ] })
      ] }, block.identifier)) }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("main", { className: "preset-editor", children: [
        selected !== null && /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("button", { onClick: () => setSelected(null), children: "\u2039 \u6761\u76EE\u5217\u8868" }),
        value.blocks.map((block, i) => {
          if (i !== selected) return null;
          const reason = presetBlockReason(block), notice = presetBlockNotice(block);
          return /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("details", { open: true, className: "card", children: [
            /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("summary", { children: [
              i + 1,
              ". ",
              block.name,
              " \xB7 ",
              state(block)
            ] }),
            notice && /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "notice", children: notice }),
            /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("label", { className: "row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("input", { type: "checkbox", checked: block.enabled, disabled: busy || !!reason, onChange: (e) => update(i, { enabled: e.target.checked }) }),
              "\u542F\u7528\u6761\u76EE"
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("label", { children: [
              "\u6761\u76EE\u540D\u79F0",
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("input", { disabled: busy, value: block.name, onChange: (e) => update(i, { name: e.target.value }) })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("label", { children: [
              "\u63D0\u793A\u8BCD\u5185\u5BB9",
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("textarea", { className: "prose", disabled: busy, value: block.content, onChange: (e) => {
                const next = { ...block, content: e.target.value };
                update(i, { content: e.target.value, enabled: block.enabled && !presetBlockReason(next) });
              } })
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("div", { className: "row", children: [
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("button", { disabled: busy || i === 0, onClick: () => move(i, -1), children: "\u4E0A\u79FB" }),
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("button", { disabled: busy || i === value.blocks.length - 1, onClick: () => move(i, 1), children: "\u4E0B\u79FB" }),
              /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("button", { disabled: busy, onClick: () => {
                change((v) => ({ ...v, blocks: v.blocks.filter((_, j) => j !== i) }));
                setSelected(value.blocks.length > 1 ? Math.min(i, value.blocks.length - 2) : null);
              }, children: "\u79FB\u9664\u6761\u76EE" })
            ] })
          ] }, block.identifier);
        })
      ] })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("details", { className: "card", children: [
      /* @__PURE__ */ (0, import_jsx_runtime21.jsxs)("summary", { children: [
        "\u5F53\u524D\u8349\u7A3F\u7684\u751F\u6548\u6587\u672C\u9884\u89C8 \xB7 ",
        preview.length,
        " \u5B57\u7B26"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("pre", { style: { whiteSpace: "pre-wrap", overflowWrap: "anywhere" }, children: preview || "\u9884\u8BBE\u672A\u542F\u7528\u6216\u6CA1\u6709\u542F\u7528\u7684\u6587\u672C\u6761\u76EE\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("p", { className: "muted", children: "\u4FDD\u5B58\u5E76\u542F\u7528\u540E\uFF0C\u8FD9\u4E9B\u6587\u672C\u4F1A\u5728\u4E0B\u6B21\u8BF7\u6C42\u65F6\u52A0\u5165\u5F53\u524D\u4F5C\u54C1\u7ED1\u5B9A\u4F1A\u8BDD\u7684\u7CFB\u7EDF\u63D0\u793A\u8BCD\u3002\u9152\u9986\u7684\u89E6\u53D1\u3001\u89D2\u8272\u4E0E\u88C5\u586B\u89C4\u5219\u4E0D\u6267\u884C\uFF0C\u5B8F\u4FDD\u7559\u4E3A\u539F\u6587\u3002" })
    ] }),
    dirty && /* @__PURE__ */ (0, import_jsx_runtime21.jsx)("div", { className: "sticky-actions", children: /* @__PURE__ */ (0, import_jsx_runtime21.jsx)(SaveBar, { ...{ dirty, busy }, error: cacheError, invalid: invalid || (!value.name.trim() ? "\u8BF7\u586B\u5199\u9884\u8BBE\u540D\u79F0" : ""), onSave: save, label: "\u4FDD\u5B58\u9884\u8BBE" }) })
  ] });
}

// src/client/launcher.tsx
var import_react25 = require("react");
var import_jsx_runtime22 = require("react/jsx-runtime");
var launcherStyle = `
.cg-launcher {position:relative;width:100%;min-width:0;margin:4px 0;}
.cg-launcher-button {box-sizing:border-box;display:flex;align-items:center;gap:9px;width:100%;min-height:38px;border:1px solid transparent;border-radius:9px;padding:8px 10px;background:transparent;color:var(--dsw-alias-label-primary,#252936);font:500 13px/20px var(--dsw-font-family,system-ui,sans-serif);cursor:pointer;-webkit-app-region:no-drag;transition:background 120ms;}
.cg-launcher-button:hover {background:var(--dsw-alias-interactive-bg-hover,#4d6bfe10);}
.cg-launcher-button:focus-visible {outline:2px solid var(--dsw-focus-ring-color,#4d6bfe);outline-offset:-2px;}
.cg-launcher-button svg {flex:none;color:var(--dsw-alias-label-secondary,#6c7769);}
.cg-launcher-button[data-compact=true] {width:36px;min-height:36px;justify-content:center;padding:8px;}
.cg-launcher-hint {position:absolute;bottom:100%;left:0;z-index:100;width:220px;box-sizing:border-box;padding:12px;border:1px solid var(--dsw-alias-border-l1,#dde0e6);border-radius:10px;background:var(--dsw-alias-bg-base,#ffffff);color:var(--dsw-alias-label-primary,#252936);box-shadow:0 8px 24px #0002;font:13px/1.6 system-ui;}
.cuigengji.cg-launcher-dialog {height:fit-content;min-height:0;padding:24px;width:min(400px,calc(100vw - 32px));max-height:80dvh;border:1px solid var(--cg-line);border-radius:16px;background:var(--cg-paper);box-shadow:0 16px 60px #0003;}
.cg-launcher-dialog::backdrop {background:#0005;}
.cg-launcher-dialog h2 {font-size:18px;margin:0 0 8px;}
.cg-launcher-dialog .launcher-actions {display:flex;justify-content:flex-end;gap:8px;margin-top:20px;}
`;
function BookIcon() {
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("svg", { width: "18", height: "18", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "1.65", strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": "true", children: [
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M12 5.5C9 3.5 5.5 3.5 3 4.5v14c2.5-1 6-1 9 1 3-2 6.5-2 9-1v-14c-2.5-1-6-1-9 1Z" }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("path", { d: "M12 5.5v14M6 8h3M15 8h3" })
  ] });
}
function Launcher({ wide, useNovelSession, useNovelWorkspaces, useSessions, openNovel, revealConversation, openWorkspace }) {
  const mounted = useNovelSession((value) => value), workspaces = useNovelWorkspaces((value) => value), sessions2 = useSessions((value) => value);
  const [choosing, setChoosing] = (0, import_react25.useState)(false), [workspace, setWorkspace] = (0, import_react25.useState)("");
  const [pending, setPending] = (0, import_react25.useState)(null), [busy, setBusy] = (0, import_react25.useState)(false), [error, setError] = (0, import_react25.useState)("");
  const dialog = (0, import_react25.useRef)(null), trigger = (0, import_react25.useRef)(null);
  (0, import_react25.useEffect)(() => {
    if (choosing) dialog.current?.showModal();
  }, [choosing]);
  (0, import_react25.useEffect)(() => {
    if (!pending || !mounted) return;
    setPending(null);
    if (mounted !== pending) return;
    try {
      openNovel(mounted);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [mounted, pending, openNovel]);
  const close = () => {
    dialog.current?.close();
    setChoosing(false);
    trigger.current?.focus();
  };
  const open = () => {
    setError("");
    try {
      if (mounted) {
        openNovel(mounted);
        return;
      }
      const selected = Object.values(sessions2.byId).find((s) => (s.retainedBy.mainView || 0) > 0)?.id;
      if (selected) {
        setPending(selected);
        revealConversation();
        return;
      }
      setWorkspace(workspaces.items[0]?.workspaceId || "");
      setChoosing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };
  const connect = async () => {
    if (busy || !workspace) return;
    setBusy(true);
    setError("");
    try {
      await openWorkspace(workspace, (id) => setPending(id));
      close();
    } catch (e) {
      setPending(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "cg-launcher", children: [
    /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("style", { children: launcherStyle }),
    /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("button", { ref: trigger, className: "cg-launcher-button", "data-compact": !wide, type: "button", title: "\u50AC\u66F4\u59EC \xB7 \u5199\u4F5C\u5DE5\u4F5C\u53F0", "aria-label": "\u6253\u5F00\u50AC\u66F4\u59EC", onClick: open, children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)(BookIcon, {}),
      wide && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("span", { children: "\u50AC\u66F4\u59EC" })
    ] }),
    error && !choosing && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("div", { className: "cg-launcher-hint", role: "alert", children: error }),
    choosing && /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("dialog", { ref: dialog, className: "cuigengji cg-launcher-dialog", "aria-label": "\u6253\u5F00\u5199\u4F5C\u5DE5\u4F5C\u53F0", onCancel: (e) => {
      e.preventDefault();
      if (!busy) close();
    }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("style", { children: styles }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("h2", { children: "\u6253\u5F00\u5199\u4F5C\u5DE5\u4F5C\u53F0" }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { className: "muted", children: "\u9009\u62E9\u4E00\u4E2A DSH \u5DE5\u4F5C\u533A\u5373\u53EF\u5F00\u59CB\uFF0C\u65E0\u9700\u5148\u53D1\u6D88\u606F\u3002" }),
      workspaces.items.length ? /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("label", { children: [
        "\u5DE5\u4F5C\u533A",
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("select", { "aria-label": "\u5DE5\u4F5C\u533A", value: workspace, disabled: busy, onChange: (e) => setWorkspace(e.target.value), children: workspaces.items.map((w) => /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("option", { value: w.workspaceId, children: w.title || w.name || w.cwd || w.path || w.workspaceId }, w.workspaceId)) })
      ] }) : /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { children: workspaces.phase === "ready" ? "\u8BF7\u5148\u5728 DSH \u5DE6\u4FA7\u6DFB\u52A0\u4E00\u4E2A\u5DE5\u4F5C\u533A\uFF0C\u7136\u540E\u4ECE\u8FD9\u91CC\u8FDB\u5165\u3002" : "\u6B63\u5728\u8BFB\u53D6\u5DE5\u4F5C\u533A\u2026" }),
      error && /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("p", { role: "alert", children: error }),
      /* @__PURE__ */ (0, import_jsx_runtime22.jsxs)("div", { className: "launcher-actions", children: [
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("button", { onClick: close, disabled: busy, children: "\u53D6\u6D88" }),
        /* @__PURE__ */ (0, import_jsx_runtime22.jsx)("button", { className: "primary", onClick: connect, disabled: busy || !workspace, children: busy ? "\u6B63\u5728\u6253\u5F00\u2026" : "\u8FDB\u5165\u5DE5\u4F5C\u53F0" })
      ] })
    ] })
  ] });
}

// src/client/index.tsx
var import_jsx_runtime23 = require("react/jsx-runtime");
var ID = "dsh-cuigengji";
var RPC_ENDPOINT = "cuigengji/dispatch";
var message = (error) => error?.message || String(error);
var inject = ["connection", "slots", "sidebarRight", "sidebarRightTabs", "locale", "layout", "uiWorkspace", "workspaces"];
function apply(ctx) {
  const rpc = async (action, args, sessionId) => {
    const result = await ctx.connection.rpc.call("/api", RPC_ENDPOINT, { action, args, sessionId });
    if (!result.ok) throw Object.assign(new Error(result.error.message), { code: result.error.code });
    return result.value;
  };
  return applyWithRPC(ctx, rpc);
}
function applyWithRPC(ctx, rpc) {
  const t = ctx.locale ? registerLocale(ctx) : (key2) => ({ title: "\u50AC\u66F4\u59EC", open: "\u6253\u5F00\u5C0F\u8BF4\u76EE\u5F55\u3001\u6B63\u6587\u548C\u8BBE\u5B9A" })[key2];
  ctx.effect(() => ctx.sidebarRightTabs.register({
    id: ID,
    kind: "cuigengji",
    keepMounted: true,
    patterns: ["dsh-resource://cuigengji/**"],
    title: () => t("title")
  }));
  ctx.slots.inject("sidebar.footer.action", () => ctx.slots.register({
    name: "sidebar.footer.action",
    id: ID,
    order: 40,
    inject: () => ({
      hooks: { novelSession: ctx.sidebarRight.mounted, novelWorkspaces: ctx.workspaces.list },
      openNovel: (sessionId) => ctx.sidebarRight.openResource(`dsh-resource://cuigengji/${encodeURIComponent(sessionId)}`),
      revealConversation: () => ctx.layout.selectPanel(null),
      openWorkspace: (id, beforeOpen) => ctx.uiWorkspace.openWorkspace(id, beforeOpen)
    })
  }, Launcher));
  ctx.slots.inject("sidebar.right.pane.tab", () => ctx.slots.register({
    name: "sidebar.right.pane.tab",
    key: ID
  }, (props) => {
    const tab = props.useTabInfo();
    const address = tab.tab.navigation.address;
    const sessionId = decodeURIComponent(address.slice(address.lastIndexOf("/") + 1));
    return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(LocaleContext.Provider, { value: ctx.locale, children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Workbench, { sessionId, rpc }, sessionId) });
  }));
}
function Workbench(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(SessionScope.Provider, { value: props.sessionId, children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(PreferencesProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(DialogProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(WorkbenchContent, { ...props }) }) }) });
}
function WorkbenchContent({ sessionId, rpc }) {
  const { preferences } = useWorkbenchPreferences();
  const [utility, setUtility] = (0, import_react26.useState)(null);
  const [tab, setTab] = usePreference("page", "chapters");
  (0, import_react26.useEffect)(() => {
    if (tab === "context") setTab("chapters");
  }, [tab]);
  const [returnTarget, setReturnTarget] = (0, import_react26.useState)(null);
  const [error, setError] = (0, import_react26.useState)(""), [busy, setBusy] = (0, import_react26.useState)(false), [tick, setTick] = (0, import_react26.useState)(0);
  const { ask } = useDialog();
  const call = (0, import_react26.useCallback)((action, args = {}) => rpc(action, args, sessionId), [rpc, sessionId]);
  const resource = useResource(() => Promise.all([call("novel.list"), call("binding.get")]), [call, tick]);
  const [books = [], binding = null] = resource.value || [];
  const novelId = binding?.novelId, novel = books.find((n) => n.id === novelId);
  (0, import_react26.useEffect)(() => {
    const outside = (event) => {
      document.querySelectorAll(".cuigengji details.menu[open]").forEach((menu) => {
        if (!menu.contains(event.target)) menu.open = false;
      });
    };
    const escape = (event) => {
      if (event.key === "Escape") {
        document.querySelectorAll(".cuigengji details.menu[open]").forEach((menu) => {
          menu.open = false;
          menu.querySelector("summary")?.focus();
        });
      }
    };
    const activate = (event) => {
      const menu = event.target.closest?.("details.menu");
      if (menu && event.target.closest("button")) menu.open = false;
    };
    document.addEventListener("click", activate);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("click", activate);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const running = (0, import_react26.useRef)(false);
  const run = async (fn) => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
      setTick((x) => x + 1);
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  const create = async () => {
    const title = await ask("\u4F5C\u54C1\u540D\u79F0");
    if (title?.trim()) run(async () => {
      const n = await call("novel.create", { title });
      await call("binding.set", { novelId: n.id });
      setTab("chapters");
    });
  };
  const openNovel = (id) => run(async () => {
    await call("binding.set", { novelId: id });
    setTab("chapters");
    setReturnTarget(null);
  });
  const jump = (page, key2, id) => {
    setReturnTarget(tab);
    try {
      localStorage.setItem(`cuigengji:ui:${sessionId}:${novelId}:${key2}`, JSON.stringify(id));
    } catch {
    }
    setTab(page);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("section", { className: "cuigengji", "data-motion": preferences.motion, style: { "--prose-size": `${preferences.fontSize}px`, "--prose-leading": preferences.leading }, "aria-label": "\u50AC\u66F4\u59EC\u5C0F\u8BF4\u5DE5\u4F5C\u53F0", children: [
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("style", { children: styles }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("header", { className: "workbench-header", children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "identity", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "row compact header-row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("select", { "aria-label": "\u7ED1\u5B9A\u5C0F\u8BF4", className: "book-picker grow", disabled: busy || !resource.value, value: novelId || "", onChange: (e) => {
          if (e.target.value) openNovel(e.target.value);
        }, children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("option", { value: "", children: "\u9009\u62E9\u4F5C\u54C1" }),
          books.map((n) => /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("option", { value: n.id, children: n.title }, n.id))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("details", { className: "menu", children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("summary", { "aria-label": "\u4F5C\u54C1\u64CD\u4F5C", children: "\xB7\xB7\xB7" }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "menu-panel", children: [
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { onClick: create, disabled: busy, children: "\u65B0\u5EFA\u4F5C\u54C1" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { onClick: () => setTab("manage"), children: "\u4F5C\u54C1\u4E0E\u5907\u4EFD" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { onClick: () => setTab("preset"), children: "\u5199\u4F5C\u9884\u8BBE" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { onClick: () => setTab("data"), children: "\u5DE5\u4F5C\u6570\u636E \xB7 \u5BFC\u5165/\u5BFC\u51FA" }),
            /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { onClick: resource.retry, children: "\u5237\u65B0\u4F5C\u54C1" })
          ] })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "app-actions", children: [
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { "aria-label": "\u8BBE\u7F6E", onClick: () => setUtility("settings"), children: "\u8BBE\u7F6E" }),
          /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { "aria-label": "\u5173\u4E8E\u50AC\u66F4\u59EC", onClick: () => setUtility("about"), children: "\u5173\u4E8E" })
        ] })
      ] }) }),
      novelId && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("nav", { "aria-label": "\u5C0F\u8BF4\u529F\u80FD", children: [["chapters", "\u6B63\u6587"], ["plan", "\u89C4\u5212"], ["memory", "\u8BBE\u5B9A"]].map(([id, label]) => /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { "aria-pressed": tab === id, className: tab === id ? "selected" : "", onClick: () => {
        setReturnTarget(null);
        setTab(id);
      }, children: label }, id)) })
    ] }),
    error && /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "notice error", role: "alert", children: [
      error,
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { onClick: () => setError(""), children: "\u5173\u95ED\u63D0\u793A" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(ResourceState, { resource, children: tab === "data" ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "page", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(WorkDataPage, { ...{ call, run, busy } }) }) : /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(import_jsx_runtime23.Fragment, { children: !novelId ? /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "page", children: tab === "manage" ? /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)(import_jsx_runtime23.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { onClick: () => setTab("chapters"), children: "\u2039 \u8FD4\u56DE\u4F5C\u54C1\u9009\u62E9" }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Manage, { ...{ call, run, busy }, onOpen: openNovel })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "empty", children: [
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("h2", { children: "\u4ECE\u4E00\u672C\u4F5C\u54C1\u5F00\u59CB" }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("p", { children: "\u4ECE\u4E0A\u65B9\u9009\u62E9\u4F5C\u54C1\uFF0C\u6216\u521B\u5EFA\u4E00\u672C\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "row", children: [
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { className: "primary", onClick: create, children: "\u65B0\u5EFA\u4F5C\u54C1" }),
        /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("button", { onClick: () => setTab("manage"), children: "\u5BFC\u5165\u5DF2\u6709\u4F5C\u54C1" })
      ] })
    ] }) }) : /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("div", { className: "workbench-body", children: [
      returnTarget && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "return-strip", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsxs)("button", { onClick: () => {
        setTab(returnTarget);
        setReturnTarget(null);
      }, children: [
        "\u2039 \u8FD4\u56DE",
        { plan: "\u89C4\u5212", memory: "\u8BBE\u5B9A" }[returnTarget] || "\u4E0A\u4E00\u9875"
      ] }) }),
      tab === "chapters" && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Chapters, { ...{ call, novelId, tick, run, busy } }),
      tab === "memory" && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Memory, { ...{ call, novelId, tick, run, busy }, onChapter: (id) => jump("chapters", "chapter", id) }),
      tab === "plan" && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Planning, { ...{ call, novelId, tick, run, busy }, onMemory: (id) => jump("memory", "memory-selected", id), onChapter: (id) => jump("chapters", "chapter", id) }),
      tab === "preset" && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Preset, { ...{ call, novelId, run, busy } }),
      tab === "manage" && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)("div", { className: "page", children: /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(Manage, { ...{ call, novelId, novel, run, busy }, onOpen: openNovel }) })
    ] }, novelId) }) }),
    utility === "settings" && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(PreferencesDialog, { close: () => setUtility(null) }),
    utility === "about" && /* @__PURE__ */ (0, import_jsx_runtime23.jsx)(AboutDialog, { close: () => setUtility(null) })
  ] });
}
return module.exports;}});

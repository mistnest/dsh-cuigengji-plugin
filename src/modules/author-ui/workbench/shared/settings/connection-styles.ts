export const connectionStyles = `
.cuigengji .mcp-manager-modal {width:min(930px,calc(100vw - 24px));}
.cuigengji .mcp-edit-modal {width:min(540px,calc(100vw - 24px));}
.cuigengji :is(.mcp-manager-modal,.mcp-edit-modal)[open] {display:flex;flex-direction:column;overflow:hidden;}
.cuigengji :is(.mcp-manager-modal,.mcp-edit-modal) > .utility-head {flex:none;padding:12px 20px;}
.cuigengji :is(.mcp-manager-modal,.mcp-edit-modal) > .utility-content {min-height:0;padding:16px 20px;overflow:auto;overscroll-behavior:contain;}
.mcp-manager,.mcp-form {container:mcp-connections / inline-size;min-width:0;color:var(--cg-ink);font-size:14px;}
.mcp-manager small,.mcp-form small {display:block;color:var(--cg-muted);font-size:12px;line-height:1.5;}
.mcp-toolbar,.mcp-layout article > header,.mcp-scope,.mcp-form footer,.mcp-tail {display:flex;align-items:center;justify-content:space-between;gap:10px;}
.mcp-toolbar {margin-bottom:12px;}
.mcp-toolbar strong small {display:inline;}
.mcp-layout {display:grid;grid-template-columns:minmax(188px,26%) minmax(0,1fr);border:1px solid var(--cg-line);border-radius:10px;min-height:320px;overflow:hidden;}
.mcp-layout nav {display:flex;flex-direction:column;align-items:stretch;gap:4px;min-width:0;padding:8px;border-right:1px solid var(--cg-line);background:var(--cg-canvas);}
.cuigengji .mcp-layout nav button {display:flex;flex:none;align-items:center;gap:9px;min-width:0;text-align:left;margin:0;padding:8px 10px;border:0;border-radius:7px;background:transparent;}
.cuigengji .mcp-layout nav button.is-disabled {opacity:.62;}
.mcp-layout nav button > span,.mcp-layout article header > div {min-width:0;}
.mcp-layout nav button :is(strong,small) {display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mcp-layout nav button .mcp-nav-perms {font-size:11px;opacity:.85;}
.cuigengji .mcp-layout nav button[aria-current=true],.cuigengji .mcp-level button[aria-pressed=true],.cuigengji .mcp-tabs button[aria-pressed=true] {background:var(--cg-wash);color:var(--cg-accent);font-weight:650;}
.mcp-layout article {min-width:0;padding:16px;}
.cuigengji .mcp-layout article h3 {font-size:18px;margin:0;overflow-wrap:anywhere;}
.cuigengji .mcp-layout article header label,.cuigengji .mcp-books label {display:flex;align-items:center;gap:7px;margin:0;}
.cuigengji .mcp-layout article header label.mcp-enable-switch {cursor:pointer;font-size:12px;color:var(--cg-muted);gap:8px;}
.cuigengji .mcp-enable-switch input[role=switch] {appearance:none;position:relative;width:34px;height:20px;min-height:0;padding:0;margin:0;border-radius:999px;border:1px solid var(--cg-line);background:color-mix(in srgb,var(--cg-ink) 16%,var(--cg-paper));cursor:pointer;transition:background 140ms,border-color 140ms;}
.cuigengji .mcp-enable-switch input[role=switch]::after {content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px #0003;transition:transform 140ms;}
.cuigengji .mcp-enable-switch input[role=switch]:checked {background:var(--cg-accent);border-color:var(--cg-accent);}
.cuigengji .mcp-enable-switch input[role=switch]:checked::after {transform:translateX(14px);}
.mcp-layout article header label,.mcp-scope > button {flex:none;white-space:nowrap;}
.mcp-tabs {display:flex;gap:6px;flex-wrap:wrap;border-bottom:1px solid var(--cg-line);padding:10px 0;}
.mcp-scope {margin:12px 0 4px;padding:10px;background:var(--cg-wash);border-radius:8px;}
.mcp-scope > div {flex:1;min-width:0;overflow-wrap:anywhere;}
.mcp-scope-box {margin:12px 0 6px;padding:10px 12px;background:var(--cg-wash);border:1px solid color-mix(in srgb,var(--cg-accent) 16%,var(--cg-line));border-radius:8px;}
.mcp-scope-box > .mcp-scope {margin:0;padding:0;background:transparent;}
.mcp-inline-books {display:flex;flex-wrap:wrap;gap:6px 12px;margin-top:8px;padding-top:8px;border-top:1px dashed color-mix(in srgb,var(--cg-accent) 22%,var(--cg-line));}
.cuigengji .mcp-inline-books label {display:inline-flex;align-items:center;gap:5px;margin:0;font-size:12px;cursor:pointer;}
.cuigengji .mcp-inline-books input {margin:0;padding:0;min-height:0;}
.mcp-perm {display:grid;grid-template-columns:18px minmax(0,1fr) auto;gap:5px 10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--cg-line);}
.mcp-perm small {font-size:12px;}
.mcp-level {display:inline-grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:2px;border:1px solid var(--cg-line);padding:2px;border-radius:8px;}
.cuigengji .mcp-level button {margin:0;min-height:30px;padding:4px 7px;border:0;border-radius:5px;font-size:12px;white-space:nowrap;}
.mcp-tail,.mcp-form footer {justify-content:flex-end;margin-top:12px;}
.mcp-pane {padding-top:10px;min-width:0;}
.mcp-pane textarea {width:100%;box-sizing:border-box;font:12px/1.5 Consolas,monospace;margin:6px 0;}
.mcp-empty {align-self:center;text-align:center;color:var(--cg-muted);padding:20px;}
.mcp-log {display:flex;gap:8px;align-items:center;flex-wrap:wrap;border-bottom:1px solid var(--cg-line);padding:8px 2px;font-size:12px;overflow-wrap:anywhere;}
.mcp-log time {color:var(--cg-muted);font-variant-numeric:tabular-nums;}
.mcp-log strong {font-weight:550;}
.mcp-log code {font-family:ui-monospace,Consolas,monospace;font-size:11px;padding:1px 5px;border-radius:4px;background:var(--cg-canvas);color:var(--cg-muted);}
.mcp-log .mcp-log-book {display:inline;font-size:11px;color:var(--cg-muted);}
.mcp-log span {margin-left:auto;font-size:11px;}
.mcp-log span.is-ok {color:var(--cg-ok);}
.mcp-log span.is-err {color:var(--cg-danger);font-weight:550;}
.cuigengji .mcp-edit-modal:has(.mcp-form) > .utility-content {display:flex;flex-direction:column;overflow:hidden;padding:0;}
.mcp-form {display:flex;flex-direction:column;min-height:0;}
.mcp-fields {min-height:0;overflow:auto;overscroll-behavior:contain;padding:12px 20px;}
.mcp-form footer {flex:none;margin:0;padding:10px 20px;border-top:1px solid var(--cg-line);}
.cuigengji .mcp-fields > label {display:grid;gap:5px;margin:0;}
.mcp-form input:not([type]) {min-width:0;min-height:34px;}
.mcp-books {min-width:0;border:1px solid var(--cg-line);border-radius:8px;margin:14px 0 6px;padding:6px 12px 10px;}
.mcp-books label {padding:4px 0;overflow-wrap:anywhere;}
.mcp-books input {flex:none;}
.mcp-picks {display:grid;max-height:145px;overflow:auto;border-top:1px solid var(--cg-line);padding-top:5px;margin-top:5px;}
.mcp-back {display:none;}
@container mcp-connections (max-width:600px) {
  .mcp-layout {display:block;min-height:0;}
  .mcp-layout nav {border:0;}
  .mcp-layout article,.mcp-detail-open nav {display:none;}
  .mcp-detail-open article {display:block;padding:12px;}
  .mcp-detail-open .mcp-back {display:inline-block;margin-bottom:10px;}
}
@container mcp-connections (max-width:410px) {
  .mcp-fields,.mcp-form footer {padding-inline:12px;}
  .mcp-perm {grid-template-columns:18px minmax(0,1fr);align-items:start;row-gap:7px;}
  .mcp-level {grid-column:2;justify-self:stretch;}
  .mcp-tabs {gap:4px;}
  .cuigengji .mcp-tabs button {padding:5px 8px;}
}
@container cg-utility (max-width:540px) {
  .cuigengji :is(.mcp-manager-modal,.mcp-edit-modal) > .utility-head {padding:8px 14px;}
  .cuigengji :is(.mcp-manager-modal,.mcp-edit-modal) > .utility-content {padding:12px;}
}
`;

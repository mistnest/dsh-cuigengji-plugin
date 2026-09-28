export const styles = `
.cuigengji { color:var(--dsw-alias-label-primary,inherit); font-family:inherit; font-size:13px; padding:14px; height:100%; overflow:auto; box-sizing:border-box; }
.cuigengji * { box-sizing:border-box; }


.cuigengji p { line-height:1.7; }
.cuigengji button,.cuigengji input,.cuigengji select,.cuigengji textarea { font:inherit; color:inherit; border:1px solid var(--dsw-alias-border-l1,#8886); background:var(--dsw-alias-button-floating-fill,transparent); border-radius:var(--dsw-radius-sm,5px); padding:7px 9px; }

.cuigengji button:disabled { opacity:.5; cursor:default; }
.cuigengji button:focus-visible,.cuigengji input:focus-visible,.cuigengji textarea:focus-visible,.cuigengji select:focus-visible { outline:2px solid var(--dsw-focus-ring-color,#7187dc); outline-offset:2px; }
.cuigengji [aria-selected=true],.cuigengji .selected { border-color:var(--dsw-alias-state-business-primary,#7187dc); background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#7187dc) 10%,transparent); }
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
.cuigengji svg circle { fill:var(--dsw-alias-button-floating-fill,#777); stroke:var(--dsw-alias-state-business-primary,#7187dc); stroke-width:2; }
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
.cuigengji nav button { flex:1; border:0; border-bottom:2px solid transparent; border-radius:0; padding:10px 6px; background:transparent; }
.cuigengji nav button.selected { border-bottom-color:var(--dsw-alias-state-business-primary,#5269c9); color:var(--dsw-alias-state-business-primary,#5269c9); }
.cuigengji h2 { font-size:18px; margin:8px 0 12px; line-height:1.4; overflow-wrap:anywhere; }
.cuigengji h3 { font-size:16px; margin:16px 0 8px; }
.cuigengji button { cursor:pointer; min-height:36px; }
.cuigengji .primary { background:var(--dsw-alias-state-business-primary,#465dba); border-color:transparent; color:var(--dsw-alias-label-on-color,#fff); font-weight:600; }
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
.cuigengji .chapter-directory { width:100%; padding:12px 16px; overflow:auto; }
.cuigengji .chapter-directory h2 { font-size:16px; }
.cuigengji .search { width:100%; }
.cuigengji .directory-options { margin:8px 0; font-size:12px; color:var(--dsw-alias-label-secondary,#737780); }
.cuigengji .volume-group { margin-top:16px; }
.cuigengji .chapter-item { display:flex; align-items:center; gap:8px; width:100%; border:0; margin:3px 0; text-align:left; background:transparent; padding:10px 8px; }
.cuigengji .chapter-item>span { flex:1; overflow-wrap:anywhere; }
.cuigengji .chapter-item small { color:var(--dsw-alias-label-secondary,#737780); white-space:nowrap; }
.cuigengji .chapter-item.selected { background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#5269c9) 12%,transparent); }
.cuigengji .chapter-main { flex:1; min-width:0; min-height:0; display:flex; flex-direction:column; }
.cuigengji .show-editor .chapter-directory,.cuigengji .show-directory .chapter-main { display:none; }

.cuigengji .editor-heading { flex:none; padding:12px 16px; border-bottom:1px solid var(--dsw-alias-border-l1,#8883); }
.cuigengji .editor-heading h2 { margin:6px 0 10px; }
.cuigengji .editor-scroll { flex:1; min-height:0; overflow:auto; padding:16px; }
.cuigengji .segmented { display:flex; border:1px solid var(--dsw-alias-border-l1,#8884); border-radius:7px; padding:2px; gap:2px; }
.cuigengji .segmented button { border:0; background:transparent; min-height:30px; padding:4px 10px; }
.cuigengji .segmented button[aria-pressed=true] { background:var(--dsw-alias-bg-layer-1,#eef0f5); font-weight:600; }
.cuigengji .inline-field { display:flex; align-items:center; gap:6px; margin:0 0 0 auto; font-size:12px; }
.cuigengji .inline-field select { padding:4px; }
.cuigengji .binding-line { font-size:12px; color:var(--dsw-alias-label-secondary,#737780); margin-top:8px; }
.cuigengji .binding-line button { min-height:28px; padding:3px 6px; font-size:12px; }
.cuigengji .manuscript { display:block; max-width:40em; width:100%; margin:0 auto; line-height:1.85; white-space:pre-wrap; overflow-wrap:anywhere; font-family:inherit; }
.cuigengji textarea.manuscript { min-height:55vh; resize:vertical; padding:14px; font-size:16px; }
.cuigengji article.manuscript { padding:12px 4px 32px; min-height:180px; }
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
.cuigengji .notice { padding:10px; border:1px solid var(--dsw-alias-border-l1,#8886); border-left:3px solid var(--dsw-alias-state-business-primary,#7187dc); margin:8px 16px; white-space:pre-wrap; flex:none; }
.cuigengji .notice button { margin:6px; }
.cuigengji .page .notice,.cuigengji .editor-scroll .notice { margin:8px 0; }
@container (min-width:760px) {
 .cuigengji .chapter-directory { display:block!important; width:220px; flex:none; border-right:1px solid var(--dsw-alias-border-l1,#8884); }
 .cuigengji .chapter-main { display:flex!important; }
 .cuigengji .directory-back { display:none; }
 .cuigengji .editor-heading,.cuigengji .savebar { padding-left:24px; padding-right:24px; }
 .cuigengji .page { padding:24px; }
 .cuigengji .sticky-actions {bottom:-24px; margin-left:-24px; margin-right:-24px;}
}
@media (pointer:coarse) { .cuigengji button,.cuigengji summary { min-height:44px; } }

.cuigengji .reference-link { flex:none; margin:0; font-size:12px; border:0; background:transparent; white-space:nowrap; }
.cuigengji .reference-link.active { color:var(--dsw-alias-state-business-primary,#5269c9); font-weight:600; }
.cuigengji .reference-drawer { position:absolute; z-index:40; top:0; right:0; bottom:0; width:min(420px,92%); padding:0 16px 16px; overflow:auto; background:var(--dsw-alias-bg-base,#fff); border-left:1px solid var(--dsw-alias-border-l1,#8885); box-shadow:-8px 0 24px #0002; }
.cuigengji .reference-drawer-head { position:sticky; top:0; z-index:1; display:flex; align-items:center; justify-content:space-between; padding:14px 0 10px; background:var(--dsw-alias-bg-base,#fff); border-bottom:1px solid var(--dsw-alias-border-l1,#8883); }
.cuigengji .reference-drawer-head button { border:0; background:transparent; min-height:30px; padding:4px 8px; }
.cuigengji .module-heading { padding:12px 16px; border-bottom:1px solid var(--dsw-alias-border-l1,#8884); flex:none; }
.cuigengji .planning-workspace { position:relative; flex:1; min-height:0; display:flex; flex-direction:column; }
.cuigengji .planning-columns { display:flex; flex:1; min-height:0; }
.cuigengji .planning-overview { flex:1; min-width:0; display:flex; flex-direction:column; }
.cuigengji .planning-list { overflow:auto; padding:16px; }
.cuigengji .planning-detail { width:100%; overflow:auto; padding:16px; border-left:1px solid var(--dsw-alias-border-l1,#8884); }
.cuigengji .has-detail .planning-overview { display:none; }
.cuigengji .planning-canvas-scroll { flex:1; min-height:0; overflow:auto; background:radial-gradient(circle,#8884 1px,transparent 1px); background-size:20px 20px; }
.cuigengji .planning-canvas { position:relative; }
.cuigengji svg.planning-lines { position:absolute; inset:0; max-height:none; border:0; width:100%; height:100%; overflow:visible; pointer-events:none; }
.cuigengji .planning-lines path { stroke:var(--dsw-alias-label-secondary,#889); stroke-width:1.5; }

.cuigengji .planning-card.selected { outline:2px solid var(--dsw-focus-ring-color,#7187dc); }
.cuigengji .planning-title { display:block; font-weight:600; border:0; background:none; text-align:left; width:100%; overflow-wrap:anywhere; }
.cuigengji .planning-card p { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; margin:3px 0; font-size:12px; }
.cuigengji .drag-handle { cursor:grab; touch-action:none; font-size:11px; opacity:.7; }
.cuigengji .canvas-tools { padding:0 12px; flex:none; }
.cuigengji .planning-history { position:absolute; inset:0; z-index:30; background:var(--dsw-alias-bg-base,#fff); }
.cuigengji .preset-layout { display:flex; gap:16px; min-height:0; }
.cuigengji .preset-list { width:220px; flex:none; }
.cuigengji .preset-editor { flex:1; min-width:0; }
.cuigengji .preset-list button { display:block; width:100%; text-align:left; margin-bottom:0; border:0; border-bottom:1px solid var(--dsw-alias-border-l1,#8883); border-radius:0; padding:12px 8px; overflow-wrap:anywhere; }
.cuigengji .source-row button { margin-left:8px; }
@container(min-width:1000px) { .cuigengji .has-detail .planning-overview {display:flex;} .cuigengji .planning-detail {width:360px; flex:none;} }
@container(max-width:599px) { .cuigengji .preset-layout {display:block;} .cuigengji .preset-list {width:100%;} .cuigengji .preset-list.is-selected {display:none;} }

.cuigengji .planning-directory { display:none; width:160px; flex:none; overflow:auto; padding:12px; border-right:1px solid var(--dsw-alias-border-l1,#8883); }
.cuigengji .planning-directory button { border:0; text-align:left; background:none; width:100%; overflow-wrap:anywhere; }
@container(min-width:1000px) { .cuigengji .planning-directory {display:block;} }

.cuigengji .memory-layout { display:flex; gap:20px; }
.cuigengji .memory-overview,.cuigengji .memory-detail { flex:1; min-width:0; }
.cuigengji .memory-layout.has-detail .memory-overview { display:none; }
@container(min-width:900px){.cuigengji .memory-layout.has-detail .memory-overview{display:block;flex:0 0 280px;}.cuigengji .memory-detail{border-left:1px solid var(--dsw-alias-border-l1,#8883);padding-left:20px;}}

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
.cuigengji .menu>summary.primary { background:var(--dsw-alias-state-business-primary,#465dba); color:var(--dsw-alias-label-on-color,#fff); padding:8px 12px; }
@container(max-width:399px){.cuigengji .page,.cuigengji .editor-scroll {padding:16px 12px;}.cuigengji .workbench-header,.cuigengji .module-heading{padding-left:12px;padding-right:12px;}.cuigengji .preset-list{width:100%;}}
@media(pointer:coarse){.cuigengji button,.cuigengji summary{min-height:44px;}}

.cuigengji .list button.selected,.cuigengji .preset-list button.selected {background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#5269c9) 10%,transparent);font-weight:600;}
.cuigengji .memory-detail .section-fold,.cuigengji .memory-detail .card {margin-top:12px;}
.cuigengji .planning-detail .savebar {position:sticky;bottom:-16px;margin:12px -16px;z-index:2;}
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
`;

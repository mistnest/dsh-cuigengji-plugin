export const documentStyles=`
@keyframes cg-detail-enter {
  from { opacity:0; transform:translateY(5px); }
  to { opacity:1; transform:translateY(0); }
}
@keyframes cg-loading-fade {
  from { opacity:0; }
  to { opacity:1; }
}
.cuigengji .empty-loading { animation:cg-loading-fade 160ms ease 120ms both; text-align:center; padding:36px 16px; font-size:12px; color:var(--cg-muted); }
.cuigengji .workspace-detail {container-name:cg-detail card-inspector;container-type:inline-size;}
.cuigengji .workspace-detail .entry-document {animation:cg-detail-enter 180ms cubic-bezier(.2,.8,.2,1);}
.cuigengji .workspace-detail .detail-bar {flex-wrap:nowrap;gap:8px;min-height:48px;padding:8px 16px;overflow:visible;position:relative;z-index:5;}
.cuigengji .workspace-detail .detail-back {flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:4px 6px;min-height:30px;border-radius:6px;}
.cuigengji .workspace-detail .detail-actions {flex:none;flex-wrap:nowrap;gap:6px;margin-left:auto;min-width:0;align-items:center;}
.cuigengji .workspace-detail .detail-action-buttons {flex-wrap:nowrap;gap:6px;align-items:center;}
.cuigengji .workspace-detail .detail-action-buttons button,.cuigengji .workspace-detail .detail-action-buttons .menu>summary {min-height:30px;padding:4px 10px;font-size:12px;border-radius:7px;white-space:nowrap;}
.cuigengji .workspace-detail details.detail-more-menu {border:0;margin:0;padding:0;display:inline-flex;align-items:center;}
.cuigengji .workspace-detail details.detail-more-menu>summary {border:1px solid transparent;background:transparent;color:var(--cg-muted);padding:4px 8px;min-width:30px;min-height:30px;font-size:15px;line-height:1;display:inline-flex;align-items:center;justify-content:center;}
.cuigengji .workspace-detail details.detail-more-menu>summary:hover,.cuigengji .workspace-detail details.detail-more-menu[open]>summary {background:var(--cg-wash);color:var(--cg-ink);}
.cuigengji .workspace-detail .detail-more-menu .menu-panel {width:184px;right:0;left:auto;top:calc(100% + 4px);}
.cuigengji .workspace-detail .detail-more-divider {height:1px;margin:4px 2px;background:var(--cg-line);}
.cuigengji .document-save-state {font-size:11px;color:var(--cg-muted);white-space:nowrap;}

/* Archive header & metadata chips */
.cuigengji .document-heading {padding:0 0 18px;border-bottom:1px solid var(--cg-line);margin:0 0 18px;}
.cuigengji .document-chip-bar {display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-bottom:12px;}
.cuigengji .detail-chip {display:inline-flex;align-items:center;gap:4px;min-height:22px;padding:2px 8px;border-radius:999px;border:1px solid color-mix(in srgb,var(--cg-line) 80%,transparent);background:var(--cg-canvas);color:var(--cg-muted);font-size:11px;line-height:1.4;white-space:nowrap;transition:background 140ms,border-color 140ms,color 140ms;}
.cuigengji .detail-chip .app-icon {width:12px;height:12px;}
.cuigengji .detail-chip.is-accent {background:var(--cg-wash);color:var(--cg-accent);border-color:transparent;font-weight:500;}
.cuigengji .detail-chip.is-ok {background:color-mix(in srgb,var(--cg-ok) 11%,var(--cg-paper));color:var(--cg-ok);border-color:transparent;font-weight:500;}
.cuigengji .detail-chip.is-warn {background:color-mix(in srgb,#d98b26 12%,var(--cg-paper));color:#c27818;border-color:transparent;font-weight:500;}
body[data-ds-dark-theme] .cuigengji .detail-chip.is-warn {color:#eba044;}
.cuigengji .detail-chip-dot {width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.85;}
.cuigengji .detail-status-pill {position:relative;display:inline-flex;align-items:center;gap:5px;min-height:22px;padding:1px 6px 1px 8px;border-radius:999px;font-size:11px;font-weight:500;cursor:pointer;transition:transform 120ms,filter 120ms;}
.cuigengji .detail-status-pill:hover {filter:brightness(.97);}
.cuigengji .detail-status-pill.status-idea {background:color-mix(in srgb,#d98b26 12%,var(--cg-paper));color:#c27818;}
body[data-ds-dark-theme] .cuigengji .detail-status-pill.status-idea {color:#eba044;}
.cuigengji .detail-status-pill.status-selected {background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .detail-status-pill.status-written {background:color-mix(in srgb,var(--cg-ok) 11%,var(--cg-paper));color:var(--cg-ok);}
.cuigengji .detail-status-pill.status-dropped {background:var(--cg-canvas);color:var(--cg-muted);text-decoration:line-through;}
.cuigengji .detail-status-pill select {appearance:none;border:0;background:transparent;color:inherit;font:inherit;padding:1px 13px 1px 0;min-height:20px;cursor:pointer;outline:none;}
.cuigengji .detail-status-caret {position:absolute;right:6px;font-size:9px;pointer-events:none;opacity:.75;}
.cuigengji .document-meta-inline {margin-left:auto;display:inline-flex;align-items:center;gap:8px;font-size:11px;color:var(--cg-muted);font-variant-numeric:tabular-nums;}
.cuigengji .workspace-detail .document-heading h2 {font-size:25px;line-height:1.42;margin:0;font-weight:600;letter-spacing:-.01em;overflow-wrap:anywhere;}
.cuigengji .document-aliases {display:flex;align-items:center;flex-wrap:wrap;gap:6px;margin-top:10px;}
.cuigengji .document-aliases-label {font-size:11px;color:var(--cg-muted);}
.cuigengji .document-alias-pill {padding:1px 7px;border-radius:5px;background:var(--cg-canvas);border:1px solid color-mix(in srgb,var(--cg-line) 70%,transparent);font-size:11px;color:var(--cg-ink);}
.cuigengji .workspace-detail .document-heading .document-summary {margin:12px 0 0;padding:9px 12px;border-radius:8px;background:var(--cg-canvas);border-left:2.5px solid color-mix(in srgb,var(--cg-accent) 50%,var(--cg-line));font-size:13.5px;line-height:1.75;color:var(--cg-muted);white-space:pre-wrap;}

/* Click-to-edit prose surface */
.cuigengji .detail-prose-editable {position:relative;margin:0 -10px 24px;padding:8px 10px;border-radius:10px;border:1px solid transparent;cursor:text;transition:background 140ms,border-color 140ms;}
.cuigengji .detail-prose-editable:hover {background:color-mix(in srgb,var(--cg-ink) 1.8%,var(--cg-paper));border-color:color-mix(in srgb,var(--cg-line) 80%,transparent);}
.cuigengji .detail-prose-editable .document-body {margin:0;}
.cuigengji .detail-prose-edit-hint {position:absolute;top:8px;right:10px;display:inline-flex;align-items:center;gap:4px;padding:2px 7px;border-radius:6px;border:1px solid var(--cg-line);background:var(--cg-paper);color:var(--cg-muted);font-size:11px;opacity:0;pointer-events:none;transition:opacity 140ms,transform 140ms;transform:translateY(-2px);}
.cuigengji .detail-prose-edit-hint .app-icon {width:11px;height:11px;}
.cuigengji .detail-prose-editable:hover .detail-prose-edit-hint {opacity:1;transform:translateY(0);}
.cuigengji .document-empty.is-clickable-empty {display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px;margin:0 0 22px;border:1px dashed var(--cg-line);border-radius:10px;background:var(--cg-canvas);cursor:text;transition:border-color 140ms,background 140ms;}
.cuigengji .document-empty.is-clickable-empty:hover {border-color:color-mix(in srgb,var(--cg-accent) 45%,var(--cg-line));background:var(--cg-wash);}
.cuigengji .document-empty-cta {font-size:11.5px;color:var(--cg-accent);font-weight:500;}

/* Unified card-style editing layout */
.cuigengji .workspace-detail .detail-edit-card {padding:16px 16px 6px;margin-bottom:20px;border:1px solid color-mix(in srgb,var(--cg-accent) 28%,var(--cg-line));border-radius:12px;background:var(--cg-card);animation:cg-detail-enter 140ms ease-out;}
.cuigengji .workspace-detail .detail-edit-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px 12px;margin-bottom:14px;}
.cuigengji .workspace-detail .detail-edit-grid label {margin:0;font-size:11px;color:var(--cg-muted);gap:5px;}
.cuigengji .workspace-detail .detail-edit-grid input,.cuigengji .workspace-detail .detail-edit-grid select {width:100%;min-height:32px;padding:5px 9px;border:1px solid var(--cg-line);border-radius:7px;background:var(--cg-paper);font-size:12px;font-weight:400;color:var(--cg-ink);}

/* Default-open relationship & flow cards */
.cuigengji .detail-rel-section {margin-top:24px;padding-top:18px;border-top:1px solid var(--cg-line);}
.cuigengji .detail-rel-head {display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:12px;}
.cuigengji .detail-rel-head h3 {margin:0;font-size:12px;font-weight:600;color:var(--cg-muted);letter-spacing:.02em;display:inline-flex;align-items:center;gap:6px;}
.cuigengji .detail-rel-head h3 small {font-weight:400;font-variant-numeric:tabular-nums;opacity:.8;}
.cuigengji .detail-rel-head-actions {display:flex;align-items:center;gap:4px;}
.cuigengji .detail-rel-head button {min-height:26px;padding:3px 8px;border:0;border-radius:6px;background:transparent;color:var(--cg-accent);font-size:12px;font-weight:500;}
.cuigengji .detail-rel-head button:hover:not(:disabled) {background:var(--cg-wash);}
.cuigengji .detail-rel-grid {display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,210px),1fr));gap:8px;}
.cuigengji .detail-rel-card {display:flex;align-items:flex-start;justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid var(--cg-line);border-radius:10px;background:var(--cg-card);transition:transform 150ms cubic-bezier(.2,.8,.2,1),border-color 150ms,box-shadow 150ms;}
.cuigengji .detail-rel-card:hover {transform:translateY(-1px);border-color:color-mix(in srgb,var(--cg-accent) 42%,var(--cg-line));box-shadow:0 4px 12px color-mix(in srgb,var(--cg-ink) 4%,transparent);}
.cuigengji .detail-rel-main {flex:1;min-width:0;}
.cuigengji .detail-rel-title-row {display:flex;align-items:center;flex-wrap:wrap;gap:6px;}
.cuigengji .detail-rel-open {display:inline-flex;align-items:center;gap:5px;padding:0;min-height:22px;border:0;background:transparent;color:var(--cg-ink);font-size:13px;font-weight:550;text-align:left;}
.cuigengji .detail-rel-open:hover {color:var(--cg-accent);background:transparent;}
.cuigengji .detail-rel-open .app-icon {width:13px;height:13px;color:var(--cg-muted);}
.cuigengji .detail-rel-tag {padding:1px 6px;border-radius:4px;background:var(--cg-wash);color:var(--cg-accent);font-size:10.5px;font-weight:500;}
.cuigengji .detail-rel-desc {margin:5px 0 0;font-size:12px;line-height:1.55;color:var(--cg-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.cuigengji .detail-rel-more {flex:none;min-height:24px;min-width:24px;padding:2px 5px;border:0;border-radius:5px;background:transparent;color:var(--cg-muted);font-size:14px;line-height:1;}
.cuigengji .detail-rel-more:hover {background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .detail-rel-empty {margin:0;font-size:12px;color:var(--cg-muted);}

/* Flow cards for planning upstream/downstream */
.cuigengji .detail-flow-grid {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.cuigengji .detail-flow-box {padding:11px 13px;border:1px solid var(--cg-line);border-radius:10px;background:var(--cg-card);}
.cuigengji .detail-flow-label {display:block;font-size:11px;color:var(--cg-muted);margin-bottom:7px;}
.cuigengji .detail-flow-items {display:grid;gap:5px;}
.cuigengji .detail-flow-item {display:flex;align-items:center;justify-content:space-between;gap:8px;width:100%;min-height:28px;padding:4px 7px;margin:0 -7px;border:0;border-radius:6px;background:transparent;text-align:left;font-size:12.5px;font-weight:500;color:var(--cg-ink);transition:background 130ms,color 130ms;}
.cuigengji .detail-flow-item:hover {background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .detail-flow-item>span:first-child {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .detail-flow-item small {flex:none;font-size:10.5px;font-weight:400;color:var(--cg-muted);}
.cuigengji .detail-flow-none {margin:0;font-size:12px;color:var(--cg-muted);opacity:.75;}
.cuigengji .detail-quick-connect {display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:10px;padding:10px 12px;border-radius:9px;border:1px solid var(--cg-line);background:var(--cg-canvas);}
.cuigengji .detail-quick-connect select {flex:1;min-width:120px;min-height:30px;padding:4px 8px;font-size:12px;}
.cuigengji .detail-quick-connect button {min-height:30px;padding:4px 10px;font-size:12px;}

/* Evidence & linked references strip */
.cuigengji .detail-meta-section {margin-top:18px;padding-top:14px;border-top:1px solid color-mix(in srgb,var(--cg-line) 65%,transparent);display:grid;gap:10px;}
.cuigengji .detail-pill-group {display:flex;align-items:center;flex-wrap:wrap;gap:6px;font-size:12px;color:var(--cg-muted);}
.cuigengji .detail-ref-pill {display:inline-flex;align-items:center;gap:4px;min-height:26px;padding:3px 9px;border:1px solid var(--cg-line);border-radius:999px;background:var(--cg-card);color:var(--cg-ink);font-size:12px;transition:border-color 140ms,background 140ms,color 140ms;}
.cuigengji .detail-ref-pill:hover {border-color:var(--cg-accent);background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .detail-ref-pill .app-icon {width:12px;height:12px;color:var(--cg-muted);}
.cuigengji .workspace-detail .source-row {display:flex;align-items:center;flex-wrap:wrap;gap:8px;padding:8px 10px;border:1px solid var(--cg-line);border-radius:8px;background:var(--cg-card);font-size:12px;}
.cuigengji .workspace-detail .source-row>span {flex:1;min-width:140px;color:var(--cg-ink);}
.cuigengji .workspace-detail .source-row button {margin:0;min-height:26px;padding:3px 8px;font-size:11.5px;}
.cuigengji .workspace-detail .source-row pre {flex-basis:100%;margin:6px 0 0;}

/* Fix double-border bug on remaining details folds inside workspace-detail */
.cuigengji .workspace-detail details.section-fold {border-top:1px solid var(--cg-line);border-bottom:0;margin:18px 0 0;padding:8px 0 0;}
.cuigengji .workspace-detail .detail-edit-card details.section-fold {border-top:0;margin:6px 0 4px;padding:2px 0 0;}
.cuigengji .workspace-detail details.section-fold>summary {padding:6px 0;font-size:12px;font-weight:500;color:var(--cg-muted);}
.cuigengji .workspace-detail details.section-fold[open]>summary {margin-bottom:10px;}
.cuigengji .resource-breadcrumb[hidden] {display:none!important;}
@media (prefers-reduced-motion:reduce) {
  .cuigengji .workspace-detail .entry-document,.cuigengji .workspace-detail .detail-edit-card,.cuigengji .empty-loading {animation:none!important;}
}

.cuigengji .document-tabs {display:flex;gap:24px;border-bottom:1px solid var(--cg-line);margin:-12px 0 28px;}
.cuigengji .document-tabs button {padding:10px 0;border:0;border-radius:0;background:none;border-bottom:2px solid transparent;color:var(--cg-muted);font-size:12px;}
.cuigengji .document-tabs button[aria-pressed=true] {color:var(--cg-accent);border-color:var(--cg-accent);font-weight:600;}
.cuigengji .document-prose,.cuigengji .document-body.document-prose {min-width:0;max-width:100%;white-space:normal;overflow-wrap:anywhere;line-height:1.88;}
.cuigengji .document-prose p {margin:0 0 1em;white-space:pre-wrap;}
.cuigengji .document-prose :is(h1,h2,h3,h4,h5,h6) {margin:1.45em 0 .55em;line-height:1.45;color:var(--cg-ink);font-weight:600;scroll-margin-top:16px;}
.cuigengji .document-prose h1 {font-size:1.34em;letter-spacing:.01em;}
.cuigengji .document-prose h2 {font-size:1.16em;padding-bottom:.3em;border-bottom:1px solid color-mix(in srgb,var(--cg-line) 70%,transparent);}
.cuigengji .document-prose h3 {font-size:1.05em;}
.cuigengji .document-prose :is(h4,h5,h6) {font-size:.98em;color:var(--cg-muted);}
.cuigengji .document-prose > :first-child,.cuigengji .document-prose blockquote > :first-child {margin-top:0;}
.cuigengji .document-prose > :last-child,.cuigengji .document-prose blockquote > :last-child {margin-bottom:0;}
.cuigengji .document-prose :is(ul,ol) {padding-inline-start:1.55em;margin:.5em 0 1em;}
.cuigengji .document-prose ul {list-style:disc;}
.cuigengji .document-prose ol {list-style:decimal;}
.cuigengji .document-prose li :is(ul,ol) {margin:.2em 0;}
.cuigengji .document-prose li + li {margin-top:.28em;}
.cuigengji .document-prose .task-list-item {list-style:none;}
.cuigengji .document-prose .task-list-item > input {margin-inline-start:-1.3em;accent-color:var(--cg-accent);}
.cuigengji .document-prose blockquote {margin:1em 0;padding:8px 14px;border-left:3px solid color-mix(in srgb,var(--cg-accent) 55%,var(--cg-line));background:color-mix(in srgb,var(--cg-wash) 55%,transparent);border-radius:0 7px 7px 0;color:var(--cg-muted);}
.cuigengji .document-prose code {font-family:ui-monospace,Consolas,monospace;font-size:.88em;background:var(--cg-canvas);border:1px solid color-mix(in srgb,var(--cg-line) 75%,transparent);padding:.1em .38em;border-radius:5px;}
.cuigengji .document-prose pre {max-width:100%;max-height:none;overflow:auto;white-space:pre;overflow-wrap:normal;padding:12px 14px;border-radius:8px;border:1px solid var(--cg-line);background:var(--cg-canvas);line-height:1.65;}
.cuigengji .document-prose pre code {background:transparent;border:0;padding:0;}
.cuigengji .document-prose a {color:var(--cg-accent);text-decoration:underline;text-underline-offset:.18em;}
.cuigengji .document-prose hr {border:0;border-top:1px solid var(--cg-line);margin:1.5em 0;}
.cuigengji .markdown-table-scroll {overflow-x:auto;max-width:100%;margin:1em 0;border:1px solid var(--cg-line);border-radius:8px;}
.cuigengji .markdown-table-scroll table {width:100%;border-collapse:collapse;line-height:1.65;font-size:.93em;}
.cuigengji .markdown-table-scroll :is(th,td) {border-bottom:1px solid var(--cg-line);border-right:1px solid color-mix(in srgb,var(--cg-line) 65%,transparent);padding:7px 12px;text-align:left;}
.cuigengji .markdown-table-scroll :is(th,td):last-child {border-right:0;}
.cuigengji .markdown-table-scroll tbody tr:last-child td {border-bottom:0;}
.cuigengji .markdown-table-scroll th {font-weight:600;background:var(--cg-canvas);color:var(--cg-ink);}
.cuigengji .chapter-reading-modal {width:min(740px,calc(100vw - 32px));}
.cuigengji .chapter-reading-modal .document-prose {padding-top:12px;font-size:var(--prose-size,16px);line-height:var(--prose-leading,1.95);}
.cuigengji .document-empty {font-size:13px;color:var(--cg-muted);padding:16px 0;}

@container card-inspector (max-width:460px) {
  .cuigengji .workspace-detail .detail-bar {padding:6px 10px;gap:4px;}
  .cuigengji .workspace-detail .detail-actions {gap:4px;}
  .cuigengji .workspace-detail .detail-action-buttons {gap:4px;}
  .cuigengji .workspace-detail .detail-action-buttons button,.cuigengji .workspace-detail .detail-action-buttons .menu>summary {padding:3px 7px;min-height:28px;font-size:11.5px;}
  .cuigengji .document-save-state {display:none;}
  .cuigengji .workspace-detail .selection-count {font-size:11px;}
  .cuigengji .workspace-detail .document-heading h2 {font-size:22px;}
  .cuigengji .detail-flow-grid,.cuigengji .workspace-detail .detail-edit-grid {grid-template-columns:minmax(0,1fr);}
  .cuigengji .document-meta-inline {margin-left:0;}
}
`;

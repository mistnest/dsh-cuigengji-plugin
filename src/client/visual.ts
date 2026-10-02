/** The approved reading-first design. Host tokens retain light/dark integration. */
export const visualStyles = `
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

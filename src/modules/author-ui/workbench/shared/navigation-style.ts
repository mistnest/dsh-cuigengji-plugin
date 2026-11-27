export const navigationStyles = `
.cuigengji svg.app-icon {display:block;width:18px;height:18px;max-height:none;flex:none;border:0;border-radius:0;}
.cuigengji svg.app-icon circle {fill:none;stroke:currentColor;stroke-width:1.6;}
.cuigengji .workbench-header.workbench-navigation {display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:20px;padding:8px 24px;min-height:60px;flex:none;}
.cuigengji .navigation-origin {display:flex;align-items:center;gap:12px;min-width:0;}
.cuigengji .navigation-home,.cuigengji .navigation-action {position:relative;display:flex;align-items:center;justify-content:center;gap:7px;border:0;background:none;border-radius:8px;min-height:36px;padding:8px 10px;font-size:12px;color:var(--cg-muted);white-space:nowrap;}
.cuigengji .navigation-home {flex:none;color:var(--cg-ink);}
.cuigengji .navigation-about {color:var(--cg-accent);}
.cuigengji .navigation-home[aria-current=page] {color:var(--cg-accent);background:var(--cg-wash);}
.cuigengji .navigation-badge {position:absolute;top:6px;right:6px;width:7px;height:7px;border-radius:50%;background:var(--cg-accent);box-shadow:0 0 0 2px var(--cg-paper);}
.cuigengji .navigation-book {min-width:0;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;color:var(--cg-muted);}
.cuigengji .book-switcher-menu {min-width:0;max-width:100%;}
.cuigengji .book-switcher-menu>.book-switcher-trigger {display:flex;align-items:center;gap:6px;min-width:0;min-height:30px;padding:4px 9px;border-radius:7px;background:var(--cg-canvas);color:var(--cg-ink);font-size:12px;font-weight:500;}
.cuigengji .book-switcher-menu>.book-switcher-trigger:hover,.cuigengji .book-switcher-menu[open]>.book-switcher-trigger {background:var(--cg-wash);}
.cuigengji .book-switcher-trigger .navigation-book {color:inherit;}
.cuigengji .book-switcher-caret {flex:none;font-size:10px;color:var(--cg-muted);}
.cuigengji .ai-focus-dot {flex:none;width:6px;height:6px;border-radius:50%;background:var(--cg-line);}
.cuigengji .ai-focus-dot.is-bound {background:var(--cg-ok);}
.cuigengji .ai-focus-dot.is-other {background:#d98b26;}
.cuigengji .book-switcher-panel {left:0;right:auto;width:min(248px,calc(100cqw - 24px));padding:8px;}
.cuigengji .book-switcher-status {padding:4px 8px 7px;margin-bottom:4px;border-bottom:1px solid var(--cg-line);font-size:11px;color:var(--cg-muted);}
.cuigengji .book-switcher-panel button {display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:32px;padding:6px 8px;border-radius:6px;font-size:12px;}
.cuigengji .book-switcher-panel button.is-current {background:var(--cg-wash);color:var(--cg-accent);font-weight:600;}
.cuigengji .book-switcher-title {min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .book-switcher-panel small {flex:none;font-size:10px;padding:1px 5px;border-radius:4px;background:color-mix(in srgb,var(--cg-ok) 12%,transparent);color:var(--cg-ok);}
.cuigengji .book-switcher-foot {margin-top:6px;padding-top:6px;border-top:1px solid var(--cg-line);}
.cuigengji .book-switcher-foot .book-bind-action {color:var(--cg-accent);font-size:11px;justify-content:flex-start;}
.cuigengji .workbench-navigation .navigation-tabs {grid-column:2;grid-row:1;order:0;width:auto;gap:12px;}
.cuigengji .navigation-tabs button {min-width:56px;padding:11px 10px;font-size:13px;transition:color 140ms,border-color 140ms;}
.cuigengji .navigation-actions {grid-column:3;grid-row:1;display:flex;gap:4px;justify-self:end;}
.cuigengji .is-refreshing .app-icon {animation:cg-refresh 900ms linear infinite;}
@keyframes cg-refresh {to {transform:rotate(360deg);}}
.cuigengji .preference-work-heading {display:flex;align-items:baseline;gap:12px;justify-content:space-between;}
.cuigengji .preference-work-heading small {font-size:11px;max-width:65%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--cg-muted);}
.cuigengji .preference-action {display:flex;justify-content:space-between;align-items:center;gap:16px;width:100%;text-align:left;border:1px solid var(--cg-line);padding:16px;border-radius:10px;background:var(--cg-paper);}
.cuigengji .preference-action strong {display:block;font-size:14px;font-weight:500;}
.cuigengji .preference-action small {display:block;font-size:11px;color:var(--cg-muted);margin-top:5px;line-height:1.8;}
.cuigengji .preference-action>span:last-child {color:var(--cg-muted);font-size:18px;}
.cuigengji .preference-action+.preference-action {margin-top:10px;}
.cuigengji .pet-settings-tools {display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:12px 0 18px;}
.cuigengji .pet-settings-tools button {font-size:11px;border:0;background:none;color:var(--cg-accent);padding:4px 0;}
.cuigengji .pet-settings-tools small {font-size:10px;color:var(--cg-muted);}
.cuigengji .module-toolbar .module-select {border:0;background:none;color:var(--cg-muted);font-size:12px;padding:6px 8px;}
.cuigengji .module-add {display:flex;align-items:stretch;gap:1px;}
.cuigengji .module-add>button {border-radius:8px 0 0 8px;}
.cuigengji .module-add>.menu>summary {border-radius:0 8px 8px 0;display:grid;place-items:center;min-width:30px;padding:7px;font-size:14px;}
.cuigengji .module-add .menu-panel {width:156px;}
.cuigengji .filter-menu>summary {display:flex;align-items:center;gap:5px;min-height:36px;font-size:12px;color:var(--cg-muted);}
.cuigengji .filter-menu.is-active>summary {color:var(--cg-accent);background:var(--cg-wash);}
.cuigengji .filter-menu summary small {font-size:10px;}
.cuigengji .filter-menu .menu-panel {width:220px;padding:16px;}
.cuigengji .filter-menu label {font-size:11px;color:var(--cg-muted);margin:0 0 14px;gap:7px;}
.cuigengji .filter-menu select {width:100%;font-size:12px;color:var(--cg-ink);}
.cuigengji .active-filters {display:flex;gap:6px;align-items:center;flex-wrap:wrap;padding-top:8px;}
.cuigengji .active-filters button {display:flex;align-items:center;gap:8px;border:0;min-height:26px;padding:3px 9px;border-radius:6px;background:var(--cg-wash);font-size:11px;color:var(--cg-accent);}
.cuigengji .page-new,.cuigengji .page-settings {border:0;background:none;color:var(--cg-muted);font-size:12px;padding:5px 6px;white-space:nowrap;}
.cuigengji .planning-page-picker {display:flex;align-items:center;gap:4px;min-width:0;}
.cuigengji .page-settings {display:grid;place-items:center;min-width:30px;padding:6px;}
.cuigengji .directory-search {display:flex;align-items:center;gap:6px;}
.cuigengji .directory-search .search {min-width:0;flex:1;font-size:12px;}
.cuigengji .directory-new-volume {flex:none;font-size:11px;min-height:32px;padding:5px 7px;border:0;background:none;color:var(--cg-muted);}
.cuigengji .chapter-volume {display:block;margin:0;}
.cuigengji .chapter-volume select {border:0;padding:0 20px 0 0;font-size:11px;max-width:240px;min-height:24px;color:var(--cg-muted);background-color:transparent;}
.cuigengji .chapter-main .editor-scroll {padding-bottom:12px;overscroll-behavior:contain;}
.cuigengji .chapter-main textarea.manuscript {padding-bottom:0;}
.cuigengji .prose-display>summary {display:flex;align-items:center;gap:7px;color:var(--cg-muted);font-size:12px;}
.cuigengji .prose-display .menu-panel {width:210px;padding:16px;}
.cuigengji .prose-display label {font-size:11px;color:var(--cg-muted);margin:0 0 12px;}
.cuigengji .prose-display label:last-child {margin-bottom:0;}
.cuigengji .prose-display select {width:100%;color:var(--cg-ink);}
.cuigengji .chapter-toolbar>.prose-display {margin-left:auto;}
.cuigengji .graph-control-divider {height:16px;width:1px;background:var(--cg-line);margin:0 3px;}
@container(max-width:759px) {
 .cuigengji .workbench-header.workbench-navigation {grid-template-columns:minmax(0,1fr) auto;gap:2px 8px;padding:6px 14px 0;min-height:0;}
 .cuigengji .navigation-origin {gap:8px;}
 .cuigengji .navigation-actions {grid-column:2;grid-row:1;gap:2px;}
 .cuigengji .workbench-navigation .navigation-tabs {grid-column:1/-1;grid-row:2;width:100%;gap:4px;margin-top:2px;}
 .cuigengji .navigation-tabs button {flex:1;min-height:32px;padding:7px 6px;}
 .cuigengji .navigation-book {font-size:11px;max-width:168px;}
 .cuigengji .navigation-home,.cuigengji .navigation-action {min-height:32px;padding:6px 7px;gap:5px;}
}
@container(max-width:640px) {
 .cuigengji .navigation-home>span {display:none;}
}
@container(max-width:420px) {
 .cuigengji .workbench-header.workbench-navigation {padding-inline:12px;}
 .cuigengji .navigation-origin {gap:6px;}
 .cuigengji .navigation-book {max-width:132px;}
 .cuigengji .navigation-actions {gap:2px;}
 .cuigengji .module-toolbar .toolbar-spacer {display:none;}
}
@container(max-width:599px) {
 .cuigengji .navigation-actions .navigation-action>span {display:none;}
}
@container(min-width:560px) and (max-width:759px) {
 .cuigengji .workbench-header.workbench-navigation {grid-template-columns:minmax(0,1fr) auto auto;gap:8px;padding:8px 16px;min-height:56px;}
 .cuigengji .workbench-navigation .navigation-tabs {grid-column:2;grid-row:1;width:auto;margin:0;}
 .cuigengji .navigation-tabs button {min-width:44px;min-height:36px;padding:10px 7px;}
 .cuigengji .navigation-actions {grid-column:3;grid-row:1;}
 .cuigengji .navigation-actions .navigation-action>span {display:none;}
 .cuigengji .navigation-origin {gap:6px;}
 .cuigengji .navigation-book {max-width:146px;}
}
.cuigengji .chapter-main .auto-savebar {padding-right:calc(16px + var(--cg-pet-safe-right, 0px));transition:padding-right 160ms ease;}
@container (min-width:760px) {
 .cuigengji .chapter-main .auto-savebar {padding-right:calc(24px + var(--cg-pet-safe-right, 0px));}
}
@media(prefers-reduced-motion:reduce) {.cuigengji .is-refreshing .app-icon {animation:none;}}
.cuigengji[data-motion=reduce] .is-refreshing .app-icon {animation:none;}
`;

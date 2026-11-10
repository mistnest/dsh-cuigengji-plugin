export const chapterStudioStyles=`
.cuigengji .chapter-workspace {position:relative;}
.cuigengji .directory-heading>.directory-order-toggle {display:flex;flex:none;align-items:center;gap:3px;padding:4px 5px;min-height:30px;border:0;background:none;font-size:11px;color:var(--cg-muted);white-space:nowrap;}
.cuigengji .directory-order-toggle svg {display:block;width:13px;height:13px;max-height:none;border:0;border-radius:0;fill:none;stroke:currentColor;stroke-width:1.25;stroke-linecap:round;stroke-linejoin:round;}
.cuigengji .directory-collapsed .directory-order-toggle {display:none;}
.cuigengji .chapter-directory-overlay {position:absolute;inset:0;z-index:15;}
.cuigengji .chapter-directory-backdrop {position:absolute;inset:0;background:#17203318;}
.cuigengji .chapter-directory-overlay .directory-drawer {position:absolute;inset:0 auto 0 0;margin:0;width:min(300px,calc(100% - 32px));height:100%;max-height:100%;box-shadow:6px 0 20px #17203310;}
.cuigengji .chapter-drop-after::after {content:'';position:absolute;inset:auto 0 -3px;height:2px;border-radius:2px;background:var(--cg-accent);pointer-events:none;}
.cuigengji .chapter-directory {--cg-directory-inset:16px;--cg-directory-top:16px;}
.cuigengji .chapter-directory .directory-header {position:sticky;top:calc(-1 * var(--cg-directory-top));z-index:6;margin:calc(-1 * var(--cg-directory-top)) calc(-1 * var(--cg-directory-inset)) 0;padding:var(--cg-directory-top) var(--cg-directory-inset) 12px;background:color-mix(in srgb,var(--cg-ink) 2%,var(--cg-paper));border-bottom:1px solid var(--cg-line);}
.cuigengji .directory-collapsed .chapter-directory {--cg-directory-inset:6px;}
.cuigengji .directory-collapsed .directory-search {display:none;}
.cuigengji .directory-drawer .chapter-directory {--cg-directory-top:8px;}
.cuigengji .directory-drawer .directory-header {background:var(--cg-paper);}
@container(max-width:759px) {
 .cuigengji .directory-collapsed.show-directory .chapter-directory {--cg-directory-inset:16px;}
 .cuigengji .directory-collapsed.show-directory .directory-search {display:flex;}
 .cuigengji .directory-collapsed.show-directory .directory-order-toggle {display:flex;}
}
.cuigengji .chapter-main {container:chapter-writing / inline-size;}
.cuigengji .chapter-document {display:flex;flex:1;flex-direction:column;min-height:0;min-width:0;}
/* Gutter rows are presentation, never a browser scroll-anchoring target. */
.cuigengji .chapter-document .editor-scroll.is-editing {overflow-anchor:none;}
.cuigengji .chapter-toolbar .prose-tools>[aria-pressed=true] {color:var(--cg-accent);background:var(--cg-wash);border-color:transparent;}
.cuigengji .manuscript-surface {display:grid;grid-template-columns:minmax(0,1fr);width:100%;min-width:0;align-items:start;}
.cuigengji .manuscript-surface[data-lines=true] {grid-template-columns:36px minmax(0,1fr);}
.cuigengji .manuscript-surface>textarea {min-width:0;max-width:none;}
.cuigengji .manuscript-gutter {font-size:11px;color:var(--cg-muted);user-select:none;pointer-events:none;font-variant-numeric:tabular-nums;text-align:right;}
.cuigengji .manuscript-gutter>span {display:block;padding-right:8px;}
.cuigengji .manuscript-gutter>span[data-current=true] {color:var(--cg-accent);font-weight:600;}
.cuigengji .chapter-main .manuscript-counts {flex-wrap:wrap;justify-content:flex-end;}
.cuigengji .auto-savebar .manuscript-location {border:0;background:none;font-size:11px;min-height:26px;padding:2px 5px;color:var(--cg-muted);font-variant-numeric:tabular-nums;}
.cuigengji .manuscript-line-jump {position:absolute;right:16px;bottom:50px;z-index:15;width:258px;max-width:calc(100% - 24px);padding:14px;border:1px solid var(--cg-line);border-radius:10px;background:var(--cg-paper);box-shadow:0 8px 30px #0002;}
.cuigengji .manuscript-line-jump>div {display:flex;align-items:center;justify-content:space-between;gap:8px;}
.cuigengji .manuscript-line-jump strong {font-size:13px;font-weight:550;}
.cuigengji .manuscript-line-jump>div>button {border:0;background:none;min-width:28px;min-height:28px;padding:0;font-size:18px;}
.cuigengji .manuscript-line-jump label {font-size:11px;color:var(--cg-muted);}
.cuigengji .manuscript-line-jump input {width:100%;min-width:0;color:var(--cg-ink);}
.cuigengji .manuscript-line-jump>small {display:block;font-size:11px;color:var(--cg-muted);margin:8px 0 12px;}
.cuigengji .manuscript-line-jump>.primary {display:block;margin-left:auto;font-size:12px;}
.cuigengji .chapter-comparison {position:absolute;inset:0;z-index:12;display:flex;flex-direction:column;min-height:0;min-width:0;background:var(--cg-paper);}
.cuigengji .chapter-comparison-head {display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 22px;border-bottom:1px solid var(--cg-line);flex:none;}
.cuigengji .chapter-comparison-head>div {min-width:0;}
.cuigengji .chapter-comparison-head small {color:var(--cg-muted);font-size:11px;}
.cuigengji .chapter-comparison-head h3 {font-size:18px;line-height:1.6;margin:3px 0 0;font-weight:550;overflow-wrap:anywhere;}
.cuigengji .chapter-comparison-head>button {font-size:12px;white-space:nowrap;flex:none;}
.cuigengji .chapter-comparison-tools {display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:12px 22px 8px;flex:none;}
.cuigengji .chapter-comparison-tools>label {display:flex;align-items:center;gap:7px;font-size:11px;margin:0;min-width:0;color:var(--cg-muted);}
.cuigengji .chapter-comparison-tools select {min-width:0;max-width:240px;font-size:12px;padding:6px 8px;color:var(--cg-ink);}
.cuigengji .chapter-comparison-arrow {color:var(--cg-muted);}
.cuigengji .chapter-comparison-current {font-size:12px;white-space:nowrap;}
.cuigengji .chapter-diff-navigation {display:flex;gap:8px;align-items:center;justify-content:space-between;padding:0 22px 10px;flex:none;}
.cuigengji .chapter-diff-navigation>div {display:flex;align-items:center;gap:6px;}
.cuigengji .chapter-diff-navigation button {border:0;background:none;padding:2px 8px;min-height:30px;}
.cuigengji .chapter-diff-navigation [role=status] {font-size:11px;min-width:92px;text-align:center;color:var(--cg-muted);font-variant-numeric:tabular-nums;}
.cuigengji .chapter-comparison-notice {display:flex;flex-wrap:wrap;gap:6px;align-items:center;flex:none;padding:8px 22px;background:var(--cg-wash);font-size:11px;color:var(--cg-muted);}
.cuigengji .chapter-comparison-notice button {border:0;background:none;color:var(--cg-accent);font-size:11px;min-height:26px;padding:2px 5px;}
.cuigengji .chapter-diff-scroll {overflow:auto;overscroll-behavior:contain;flex:1;min-height:0;padding:8px 18px 28px;scrollbar-gutter:stable;}
.cuigengji .chapter-diff-labels {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;font-size:11px;color:var(--cg-muted);padding:10px;border-bottom:1px solid var(--cg-line);margin-bottom:10px;}
.cuigengji .chapter-comparison[data-layout=inline] .chapter-diff-labels {display:none;}
.cuigengji .chapter-title-diff {display:flex;align-items:center;flex-wrap:wrap;gap:10px;font-size:12px;margin:8px 0 18px;padding:10px;overflow-wrap:anywhere;}
.cuigengji .chapter-title-diff>small {width:100%;font-size:11px;color:var(--cg-muted);}
.cuigengji .chapter-diff-empty {text-align:center;font-size:12px;color:var(--cg-muted);padding:24px 8px;}
.cuigengji .chapter-comparison-foot {display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;flex:none;padding:10px 22px;border-top:1px solid var(--cg-line);font-size:11px;color:var(--cg-muted);font-variant-numeric:tabular-nums;}
.cuigengji .chapter-comparison-foot>button {font-size:12px;min-height:30px;}
@container chapter-writing (max-width:420px) {
 .cuigengji .manuscript-surface[data-lines=true] {grid-template-columns:28px minmax(0,1fr);}
 .cuigengji .chapter-comparison-head,.cuigengji .chapter-comparison-tools {padding-inline:14px;}
 .cuigengji .chapter-comparison-tools select {max-width:170px;}
 .cuigengji .chapter-comparison-arrow {display:none;}
 .cuigengji .chapter-diff-navigation {padding-inline:10px;flex-wrap:wrap;}
 .cuigengji .chapter-diff-scroll {padding-inline:8px;}
 .cuigengji .prose-diff-cell {grid-template-columns:23px minmax(0,1fr);gap:5px;padding-inline:5px;}
}
`;

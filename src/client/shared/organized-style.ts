/** Layout and content primitives used by both planning and settings. */
export const organizedStyles = `
.cuigengji .content-tree{padding:2px 0;}
.cuigengji .directory-search-count{padding:2px 8px 7px;color:var(--cg-muted);font-size:11px;}
.cuigengji .directory-context .tree-folder-name,.cuigengji .directory-context>button>span>strong{color:var(--cg-muted);}
.cuigengji .workspace-tools .batch-toolbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;min-width:0;}
.cuigengji .batch-toolbar .batch-select-all{display:flex;align-items:center;gap:6px;margin:0 4px 0 0;font-size:12px;white-space:nowrap;}
.cuigengji .batch-toolbar .batch-select-all input{width:14px;height:14px;min-height:0;margin:0;accent-color:var(--cg-accent);}
.cuigengji .batch-toolbar .batch-done{padding:4px 10px;min-height:30px;}
.cuigengji .batch-toolbar .menu>summary{padding:5px 8px;min-height:30px;}
.cuigengji .batch-toolbar .batch-move-menu .menu-panel{width:220px;}
.cuigengji .batch-toolbar .batch-move-menu label{display:grid;gap:6px;min-width:0;padding:6px;font-size:11px;color:var(--cg-muted);}
.cuigengji .batch-toolbar .batch-move-menu select{width:100%;font-size:12px;}
.cuigengji .tree-groups{min-height:56px;padding-bottom:18px;position:relative;}
.cuigengji .directory-tools{display:flex;align-items:center;gap:1px;}
.cuigengji .workspace-sidebar-section .directory-tools button{display:grid;place-items:center;width:26px;min-height:26px;padding:5px;border:0;background:none;color:var(--cg-muted);border-radius:4px;}
.cuigengji .directory-tools button:hover{background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .directory-tools svg{width:15px;height:15px;}
.cuigengji .workspace-sidebar-section .directory-tools .directory-new{display:flex;width:auto;gap:4px;padding:5px 6px;color:var(--cg-accent);font-size:11px;white-space:nowrap;}
.cuigengji .tree-root-menu>summary{display:none;}
.cuigengji .workspace-sidebar-section .page-new{display:flex;align-items:center;gap:4px;font-size:11px;}
.cuigengji .workspace-sidebar-section .page-new svg{width:14px;height:14px;}
.cuigengji .canvas-page-actions {display:flex;align-items:center;gap:2px;}
.cuigengji .workspace-sidebar-section .canvas-page-actions>button {display:grid;place-items:center;width:26px;min-height:26px;padding:5px;border:0;background:none;color:var(--cg-muted);border-radius:4px;}
.cuigengji .canvas-page-actions>button:hover {background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .canvas-page-actions svg {width:14px;height:14px;}
.cuigengji .canvas-page-select {display:block;width:100%;min-width:0;min-height:36px;padding:7px 9px;font-size:13px;border-radius:6px;text-overflow:ellipsis;}
.cuigengji .planning-page-picker{display:flex;align-items:center;gap:4px;min-width:0;}
.cuigengji .planning-page-picker .filter-control{flex:1;min-width:0;margin:0;}
.cuigengji .planning-page-picker .page-settings{flex:none;display:grid;place-items:center;width:28px;padding:5px;border:0;background:none;color:var(--cg-muted);}
.cuigengji .planning-page-picker .page-settings svg{width:14px;height:14px;}
.cuigengji .tree-folder{min-width:0;}
.cuigengji .tree-folder-row{display:flex;align-items:center;position:relative;gap:0;min-height:30px;border-radius:4px;}
.cuigengji .tree-folder-row:hover{background:color-mix(in srgb,var(--cg-ink) 4%,transparent);}
.cuigengji .tree-folder-row[data-selected=true]{background:var(--cg-wash);}
.cuigengji .tree-folder-row button{border:0;background:transparent;min-height:30px;}
.cuigengji .tree-chevron{width:20px;flex:none;padding:0;color:var(--cg-muted);font-size:17px;}
.cuigengji .tree-chevron span{display:inline-block;transform:rotate(0);}
.cuigengji .tree-chevron[aria-expanded=true] span{transform:rotate(90deg);}
.cuigengji .tree-folder-name{display:flex;align-items:center;gap:6px;min-width:0;flex:1;padding:5px 4px;text-align:left;font-size:12px;}
.cuigengji .tree-folder-name svg{width:14px;height:14px;flex:none;color:var(--cg-muted);}
.cuigengji .tree-folder-name span{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .tree-folder-name small{font-size:10px;color:var(--cg-muted);}
.cuigengji .tree-children{margin:0 0 2px 8px;padding-left:8px;border-left:1px solid color-mix(in srgb,var(--cg-line) 65%,transparent);}
.cuigengji .tree-children .directory-entries{margin-left:0;padding-left:0;}
.cuigengji .tree-groups .directory-entries{margin:0;padding-left:0;gap:0;}
.cuigengji .tree-children .directory-entry>button{padding:4px;font-size:12px;}
.cuigengji .tree-folder-row>.tree-group-menu,.cuigengji .tree-folder-row>.page-settings{opacity:0;}
.cuigengji .tree-folder-row:hover>.tree-group-menu,.cuigengji .tree-folder-row:focus-within>.tree-group-menu,.cuigengji .tree-folder-row>.tree-group-menu[open],.cuigengji .tree-folder-row:hover>.page-settings,.cuigengji .tree-folder-row:focus-within>.page-settings{opacity:1;pointer-events:auto;}
.cuigengji .tree-group-menu>summary{border:0;background:none;padding:4px 6px;color:var(--cg-muted);font-size:12px;min-height:28px;}
.cuigengji .tree-group-menu .menu-panel{position:fixed;left:0;right:auto;top:0;width:180px;visibility:hidden;}
.cuigengji .tree-menu-hint{margin:2px 5px 8px;color:var(--cg-muted);font-size:11px;line-height:1.6;}
.cuigengji .directory-order-status{padding:5px 8px;color:var(--cg-muted);font-size:11px;}
.cuigengji .tree-folder-grip{position:absolute;left:-7px;width:8px;color:var(--cg-muted);font-size:12px;cursor:grab;user-select:none;touch-action:none;opacity:0;}
.cuigengji .tree-folder-row:hover>.tree-folder-grip,.cuigengji .tree-folder-row:focus-within>.tree-folder-grip{opacity:.65;}
.cuigengji .tree-folder-row[data-group-dragging=true]{opacity:.55;}
.cuigengji .tree-folder-row[data-group-drop=true],.cuigengji .tree-root-drop[data-group-drop=true]{outline:1px solid var(--cg-accent);background:var(--cg-wash);}
.cuigengji .tree-group-destination{display:grid;gap:5px;padding:8px;font-size:10px;color:var(--cg-muted);}
.cuigengji .tree-group-destination select{width:100%;min-width:0;font-size:11px;}
.cuigengji .tree-root-drop{padding:9px;border:1px dashed var(--cg-line);border-radius:6px;margin:6px 0;color:var(--cg-muted);font-size:11px;}
.cuigengji .tree-folder-row .page-settings{padding:5px;border:0;background:none;color:var(--cg-muted);min-height:28px;}
.cuigengji .tree-folder-row .page-settings svg{width:13px;height:13px;}
.cuigengji .organized-workspace {display:flex;flex-direction:column;position:relative;flex:1;min-width:0;min-height:0;overflow:hidden;}
.cuigengji .workspace-toolbar {display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--cg-line);flex:none;min-height:56px;}
.cuigengji .workspace-sidebar-toggle {display:grid;place-items:center;padding:7px;border:0;background:none;color:var(--cg-muted);flex:none;width:32px;min-height:32px;}
.cuigengji .workspace-heading {display:flex;align-items:center;gap:8px;min-width:0;flex:1;}
.cuigengji .workspace-heading strong {font-size:13px;font-weight:500;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.cuigengji .workspace-heading small {font-size:10px;color:var(--cg-muted);font-variant-numeric:tabular-nums;}
.cuigengji .workspace-tools {display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:flex-end;min-width:0;}
.cuigengji .workspace-tools button,.cuigengji .workspace-tools summary {min-height:32px;font-size:12px;}
.cuigengji .workspace-tools .module-select {border:0;background:none;padding:5px 7px;color:var(--cg-muted);}
.cuigengji .workspace-tools .graph-search {display:flex;align-items:center;gap:4px;min-width:0;}
.cuigengji .workspace-tools .graph-search>button {display:grid;place-items:center;width:32px;padding:6px;border:0;background:none;color:var(--cg-muted);}
.cuigengji .workspace-tools .module-search {width:160px;min-width:0;margin:0;padding:6px 9px;font-size:12px;flex-basis:auto;order:0;}
.cuigengji .workspace-layout {display:flex;flex:1;min-height:0;min-width:0;position:relative;overflow:hidden;isolation:isolate;}
.cuigengji .workspace-sidebar {display:flex;flex-direction:column;position:absolute;inset:0 auto 0 0;width:232px;max-width:100%;border-right:1px solid var(--cg-line);background:color-mix(in srgb,var(--cg-ink) 1.4%,var(--cg-paper));min-height:0;z-index:10;box-shadow:4px 0 18px #00000008;}
.cuigengji .workspace-sidebar[hidden] {display:none;}
.cuigengji .workspace-sidebar-heading {display:none;align-items:center;justify-content:space-between;padding:12px 12px 6px;font-size:11px;color:var(--cg-muted);}
.cuigengji .workspace-sidebar-heading button {border:0;background:none;padding:4px 8px;min-height:30px;font-size:20px;}
.cuigengji .workspace-sidebar-scroll {overflow:auto;overscroll-behavior:contain;padding:8px 10px 20px;min-height:0;flex:1;}
.cuigengji .workspace-sidebar-section {padding:10px 0 14px;border-bottom:1px solid color-mix(in srgb,var(--cg-line) 75%,transparent);}
.cuigengji .workspace-sidebar-section:last-child {border:0;}
.cuigengji .workspace-sidebar-section>header {display:flex;justify-content:space-between;align-items:center;gap:4px;margin-bottom:8px;}
.cuigengji .workspace-sidebar-section h3 {margin:0 0 0 8px;font-size:11px;font-weight:500;color:var(--cg-muted);}
.cuigengji .workspace-sidebar-section .group-new,.cuigengji .workspace-sidebar-section .page-new {padding:4px 5px;min-height:28px;font-size:10px;border:0;background:none;color:var(--cg-accent);white-space:nowrap;}
.cuigengji .workspace-choices {display:grid;gap:3px;}
.cuigengji .workspace-choice-row {display:flex;align-items:center;gap:2px;position:relative;min-width:0;}
.cuigengji .workspace-choice {display:flex;align-items:center;gap:8px;flex:1;min-width:0;width:100%;min-height:34px;padding:7px 9px;border:0;border-radius:7px;background:transparent;text-align:left;font-size:12px;font-weight:400;color:var(--cg-muted);}
.cuigengji .workspace-choice>span {flex:1;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.cuigengji .workspace-choice>small {font-size:10px;font-variant-numeric:tabular-nums;color:var(--cg-muted);}
.cuigengji .workspace-choice:hover {background:color-mix(in srgb,var(--cg-ink) 4%,transparent);color:var(--cg-ink);}
.cuigengji .workspace-choice[aria-pressed=true] {background:var(--cg-wash);color:var(--cg-accent);font-weight:500;}
.cuigengji .workspace-choice-row .page-settings,.cuigengji .workspace-choice-row .menu>summary {width:26px;min-width:26px;min-height:28px;padding:5px;font-size:14px;border:0;background:none;color:var(--cg-muted);}
.cuigengji .workspace-choice-row .page-settings svg {width:14px;height:14px;}
.cuigengji .workspace-choice-row .menu-panel {left:0;right:auto;width:150px;}
.cuigengji .workspace-sidebar .filter-control {margin:8px 0;width:100%;}
.cuigengji .workspace-sidebar .filter-control select {width:100%;max-width:none;font-size:11px;}
.cuigengji .workspace-sidebar .filter-prefix {display:none;}
.cuigengji .workspace-sidebar .active-filters {padding:0 5px 8px;}
.cuigengji .workspace-directory-search {display:flex;align-items:center;gap:6px;margin:14px 14px 2px;min-width:0;flex:none;padding:0 0 8px;border-bottom:1px solid var(--cg-line);}
.cuigengji .workspace-directory-search svg {width:14px;height:14px;color:var(--cg-muted);}
.cuigengji .workspace-directory-search input {min-width:0;flex:1;padding:5px 0;border:0;border-radius:0;background:transparent;font-size:11px;box-shadow:none;}
.cuigengji .workspace-directory-search input:focus {outline:none;}
.cuigengji .workspace-directory-search:focus-within {border-color:var(--cg-accent);}
.cuigengji .workspace-directory-search button {border:0;background:none;padding:3px;min-height:24px;color:var(--cg-muted);}
.cuigengji .workspace-tools .workspace-search-toggle {display:grid;place-items:center;padding:6px;border:0;background:none;color:var(--cg-muted);}
.cuigengji .directory-group {min-width:0;}
.cuigengji .directory-disclosure {width:23px;flex:none;padding:4px 2px;min-height:28px;border:0;background:none;color:var(--cg-muted);font-size:17px;}
.cuigengji .directory-disclosure span {display:block;transition:transform 120ms;}
.cuigengji .directory-disclosure[aria-expanded=true] span {transform:rotate(90deg);}
.cuigengji .directory-group .workspace-choice {padding-left:6px;}
.cuigengji .directory-entries {display:grid;gap:2px;margin:3px 0 8px;padding-left:15px;}
.cuigengji .directory-entry {display:flex;align-items:center;gap:4px;min-width:0;border-radius:6px;}
.cuigengji .directory-entry.is-dragging {opacity:.55;background:var(--cg-wash);}
.cuigengji .directory-entry.directory-drop-before {box-shadow:inset 0 2px 0 var(--cg-accent);}
.cuigengji .directory-entry.directory-drop-inside {background:var(--cg-wash);outline:1px solid var(--cg-accent);outline-offset:-1px;}
.cuigengji .tree-groups .directory-entry {position:relative;padding-left:20px;}
.cuigengji .directory-grip {width:13px;flex:none;color:var(--cg-muted);font-size:14px;line-height:1;cursor:grab;user-select:none;}
.cuigengji .tree-groups .directory-grip {position:absolute;left:3px;opacity:0;}
.cuigengji .directory-entry:hover>.directory-grip,.cuigengji .directory-entry:focus-within>.directory-grip {opacity:.6;}
@media(hover:none){.cuigengji .tree-folder-row>.tree-group-menu,.cuigengji .tree-folder-row>.page-settings,.cuigengji .tree-groups .directory-grip,.cuigengji .tree-folder-grip{opacity:1;pointer-events:auto;}}
.cuigengji .directory-entry:active .directory-grip {cursor:grabbing;}
.cuigengji .directory-reorder-error {margin:4px 8px;color:var(--cg-danger,#b65050);font-size:10px;}
.cuigengji .directory-entry input {width:14px;height:14px;flex:none;margin:0;accent-color:var(--cg-accent);}
.cuigengji .directory-entry>button {display:flex;align-items:flex-start;gap:7px;flex:1;min-width:0;padding:7px 8px;border:0;background:none;text-align:left;border-radius:6px;color:var(--cg-ink);}
.cuigengji .directory-entry svg {width:13px;height:13px;margin-top:3px;color:var(--cg-muted);}
.cuigengji .directory-entry>button>span {flex:1;min-width:0;}
.cuigengji .directory-entry strong {display:block;font-size:12px;line-height:1.7;font-weight:400;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .directory-entry small {display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;color:var(--cg-muted);font-size:10px;line-height:1.7;margin-top:3px;}
.cuigengji .directory-entry>button:hover {background:color-mix(in srgb,var(--cg-ink) 4%,transparent);}
.cuigengji .directory-entry[data-active=true],.cuigengji .directory-entry[data-checked=true] {background:var(--cg-wash);}
.cuigengji .directory-entry[data-active=true] strong,.cuigengji .directory-entry[data-active=true] svg {color:var(--cg-accent);}
.cuigengji .directory-status {flex:none;width:5px;height:5px;margin-top:7px;border-radius:50%;background:var(--cg-line);}
.cuigengji .directory-status-准备采用 {background:var(--cg-accent);}.cuigengji .directory-status-已写入正文 {background:#7bada0;}.cuigengji .directory-status-暂不采用 {background:#c8b6ab;}
.cuigengji .directory-empty {font-size:10px;line-height:1.8;color:var(--cg-muted);margin:6px 8px 10px 31px;}
.cuigengji .directory-filters {padding:10px 0;border-bottom:1px solid var(--cg-line);}
.cuigengji .directory-filters>summary {padding:4px 8px;font-size:11px;color:var(--cg-muted);cursor:pointer;}
.cuigengji .directory-filters>summary small {float:right;font-size:10px;color:var(--cg-accent);}
.cuigengji .directory-filters .workspace-sidebar-section {padding-bottom:0;border:0;}
.cuigengji .workspace-stage {display:flex;min-height:0;min-width:0;overflow:hidden;position:absolute;inset:0;isolation:isolate;}
.cuigengji .workspace-stage .planning-overview,.cuigengji .workspace-stage .memory-overview {display:flex;flex-direction:column;min-height:0;min-width:0;flex:1;overflow:hidden;}
.cuigengji .workspace-stage .graph-top-area {left:calc(var(--workspace-directory) + 12px);max-width:max(0px,calc(100% - var(--workspace-directory) - var(--workspace-inspector) - 24px));}
.cuigengji .workspace-stage .graph-view-controls {right:calc(var(--workspace-inspector) + 16px);}
.cuigengji .workspace-stage .graph-help {left:calc(var(--workspace-directory) + 16px);}
.cuigengji .workspace-stage .graph-status {left:calc(var(--workspace-directory) + 16px);right:calc(var(--workspace-inspector) + 16px);}
.cuigengji .workspace-stage .resource-breadcrumb {margin-left:var(--workspace-directory);margin-right:var(--workspace-inspector);white-space:nowrap;height:42px;min-height:42px;max-height:42px;overflow-y:hidden;}
.cuigengji .organized-workspace[data-canvas-space=none] .workspace-stage :is(.graph-top-area,.graph-view-controls,.graph-help,.graph-status,.resource-breadcrumb) {visibility:hidden;}
.cuigengji .organized-workspace[data-canvas-space=small] .workspace-stage .graph-help {visibility:hidden;}
.cuigengji .workspace-detail {display:flex;flex-direction:column;position:absolute;inset:0 0 0 auto;min-height:0;min-width:0;max-width:100%;background:var(--cg-paper);border-left:1px solid var(--cg-line);z-index:11;box-shadow:-4px 0 18px #00000008;container:card-inspector / inline-size;}
.cuigengji .workspace-detail .detail-page {width:100%;}
.cuigengji .workspace-detail .detail-bar {padding:10px 16px;min-height:54px;flex-wrap:wrap;gap:6px;}
.cuigengji .workspace-detail .detail-actions {min-width:0;flex-wrap:wrap;margin-left:auto;}
.cuigengji .workspace-detail .detail-action-buttons {min-width:0;flex-wrap:wrap;justify-content:flex-end;}
.cuigengji .workspace-detail .detail-scroll {padding:28px 28px 40px;}
.cuigengji .workspace-detail .detail-document {max-width:800px;margin:0 auto;}
.cuigengji .workspace-detail .detail-document h2 {font-family:inherit;font-size:25px;line-height:1.45;margin:0 0 20px;font-weight:600;}
.cuigengji .workspace-detail .document-summary {font-size:14px;line-height:1.9;color:var(--cg-muted);margin:0 0 24px;white-space:pre-wrap;}
.cuigengji .workspace-detail .document-body {font-family:inherit;font-size:16px;line-height:1.95;white-space:pre-wrap;overflow-wrap:anywhere;margin:0 0 28px;}
.cuigengji .workspace-detail .document-fields label {font-size:11px;color:var(--cg-muted);margin:0 0 22px;gap:8px;}
.cuigengji .workspace-detail .document-fields input,.cuigengji .workspace-detail .document-fields textarea {font-family:inherit;color:var(--cg-ink);border:0;border-radius:0;border-bottom:1px solid var(--cg-line);background:transparent;padding:6px 0;line-height:1.9;box-shadow:none;}
.cuigengji .workspace-detail .document-fields input {font-size:24px;font-weight:600;}
.cuigengji .workspace-detail .document-fields textarea {font-size:14px;min-height:60px;}
.cuigengji .workspace-detail .document-fields textarea.prose {font-size:16px;min-height:260px;}
.cuigengji .workspace-detail .document-fields input:focus,.cuigengji .workspace-detail .document-fields textarea:focus {outline:none;border-color:var(--cg-accent);}
.cuigengji .workspace-detail .document-fields select {font-size:12px;font-weight:400;color:var(--cg-ink);}
.cuigengji .workspace-detail details {border-top:1px solid var(--cg-line);margin-top:22px;padding-top:4px;}
.cuigengji .workspace-detail details summary {font-size:12px;color:var(--cg-muted);}
.cuigengji .workspace-detail .flow-context {gap:10px;flex-direction:column;align-items:stretch;}
.cuigengji .workspace-detail .flow-context>span {display:none;}
.cuigengji .workspace-panel-grip {position:absolute;inset-block:0;width:8px;z-index:20;touch-action:none;cursor:col-resize;outline:none;}
.cuigengji .workspace-panel-grip.grip-directory {right:0;}
.cuigengji .workspace-panel-grip.grip-detail {left:0;}
.cuigengji .workspace-panel-grip::after {content:'';position:absolute;top:calc(50% - 22px);left:2px;width:3px;height:44px;border-radius:4px;background:color-mix(in srgb,var(--cg-muted) 35%,transparent);transition:background .15s;}
.cuigengji .workspace-panel-grip:hover,.cuigengji .workspace-panel-grip:focus-visible {background:color-mix(in srgb,var(--cg-accent) 10%,transparent);}
.cuigengji .workspace-panel-grip:hover::after,.cuigengji .workspace-panel-grip:focus-visible::after {background:var(--cg-accent);}
.cuigengji .organized-workspace[data-joined=true] .workspace-detail {border-left:0;box-shadow:none;}
.cuigengji .organized-workspace[data-joined=true] .workspace-sidebar {box-shadow:none;}
.cuigengji .organized-workspace[data-narrow=true] .workspace-toolbar {padding:8px 10px;gap:4px;flex-wrap:wrap;min-height:50px;}
.cuigengji .organized-workspace[data-narrow=true] .workspace-heading {display:none;}
.cuigengji .organized-workspace[data-narrow=true] .workspace-tools {flex:1;gap:4px;}
.cuigengji .organized-workspace[data-narrow=true] .workspace-tools .graph-search:has(input) {order:5;flex-basis:100%;}
.cuigengji .organized-workspace[data-narrow=true] .workspace-tools .module-search {width:auto;flex:1;max-width:none;}
.cuigengji .organized-workspace[data-narrow=true] .workspace-sidebar {box-shadow:8px 0 32px #0001;}
.cuigengji .organized-workspace[data-narrow=true] .workspace-sidebar-heading {display:flex;}
.cuigengji .workspace-sidebar-scrim {position:absolute;inset:0;border:0;border-radius:0;background:#0002;z-index:9;}
.cuigengji .organized-workspace .canvas-draft {width:min(320px,calc(100% - 32px));max-height:calc(100% - 32px);overflow-y:auto;overscroll-behavior:contain;}
@container card-inspector (max-width:420px){.cuigengji .workspace-detail .detail-scroll {padding:24px 20px 32px;}}

.cuigengji .resource-root {display:flex;align-items:center;gap:8px;width:calc(100% - 20px);margin:0 10px 4px;padding:8px 10px;border:0;background:transparent;text-align:left;font-size:12px;}
.cuigengji .resource-root small {margin-left:auto;color:var(--cg-muted);}
.cuigengji .resource-root[aria-current],.cuigengji .tree-folder-name[aria-current] {color:var(--cg-accent);background:color-mix(in srgb,var(--cg-accent) 9%,transparent);border-radius:5px;}
.cuigengji .resource-breadcrumb {display:flex;align-items:center;gap:3px;flex-shrink:0;padding:8px 16px;overflow:auto;border-bottom:1px solid var(--cg-line);}
.cuigengji .resource-breadcrumb button {flex:0 0 auto;padding:3px 6px;min-height:26px;border:0;background:transparent;font-size:12px;color:var(--cg-muted);max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .resource-breadcrumb button[aria-current] {color:var(--cg-ink);font-weight:600;}
.cuigengji .resource-breadcrumb>span {color:var(--cg-muted);font-size:12px;}
.cuigengji .resource-external {flex-shrink:0;padding:5px 16px;border-bottom:1px solid var(--cg-line);font-size:12px;}
.cuigengji .resource-external summary {cursor:pointer;color:var(--cg-muted);}
.cuigengji .resource-external>div {display:flex;gap:6px;flex-wrap:wrap;padding:8px 0;max-height:140px;overflow:auto;}
.cuigengji .resource-external button {font-size:12px;min-height:28px;}
.cuigengji .directory-branch {min-width:0;}
.cuigengji .directory-branch .directory-entry>.tree-chevron {flex:0 0 20px;padding:0;min-height:24px;border:0;background:none;}
.cuigengji .directory-branch .directory-entry>.tree-chevron[aria-expanded=true]>span {transform:rotate(90deg);}
.cuigengji .directory-branch .tree-children {margin-left:14px;}
`;

/** Shared canvas-first surfaces for planning and settings. */
export const graphStyles = `
.cuigengji .graph-junction{fill:var(--cg-edge,#9ca5b5);stroke:var(--cg-paper);stroke-width:1.5;cursor:default;pointer-events:all;}
.cuigengji .graph-junction.is-active{fill:var(--cg-accent);}

.cuigengji .planning-canvas-scroll {container-type:inline-size;}
.cuigengji .canvas-folder {position:absolute;border:1px solid color-mix(in srgb,var(--cg-accent) 23%,var(--cg-line));border-radius:14px;background:color-mix(in srgb,var(--cg-accent) 3%,var(--cg-paper));pointer-events:none;z-index:0;}
.cuigengji .canvas-folder.selected {border-color:var(--cg-accent);box-shadow:0 0 0 2px color-mix(in srgb,var(--cg-accent) 9%,transparent);}
.cuigengji .canvas-folder>header {display:flex;align-items:center;gap:8px;padding:10px 14px;min-height:44px;pointer-events:auto;cursor:grab;touch-action:none;}
.cuigengji .canvas-folder>header>svg {width:17px;height:17px;flex:none;color:var(--cg-accent);}
.cuigengji .canvas-folder-name {font-size:13px;font-weight:600;flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .canvas-folder>header>small {font-size:11px;color:var(--cg-muted);}
.cuigengji .canvas-folder>header>button {border:0;background:none;padding:3px 5px;min-height:24px;color:var(--cg-muted);}
.cuigengji .canvas-folder-folded {pointer-events:auto;cursor:grab;z-index:3;background:var(--cg-paper);box-shadow:0 3px 9px color-mix(in srgb,var(--cg-ink) 6%,transparent);}
.cuigengji .canvas-folder-folded:after {content:'';position:absolute;inset:5px 5px -5px;border:1px solid var(--cg-line);border-radius:14px;background:var(--cg-paper);z-index:-1;pointer-events:none;}
.cuigengji .canvas-folder-summary {display:flex;align-items:flex-start;flex-direction:column;gap:3px;padding:12px 15px;font-size:11px;color:var(--cg-muted);}
.cuigengji .graph-top-area {position:absolute;top:12px;left:12px;z-index:12;display:grid;gap:8px;max-width:calc(100% - 24px);pointer-events:none;}
.cuigengji .graph-view-context {display:flex;flex-wrap:wrap;gap:8px;align-items:center;min-width:0;font-size:11px;color:var(--cg-muted);}
.cuigengji .graph-view-context>div {display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--cg-line);border-radius:8px;background:var(--cg-paper);white-space:nowrap;}
.cuigengji .graph-view-context i {width:3px;height:3px;border-radius:50%;background:var(--cg-line);}
.cuigengji .graph-view-context>button {pointer-events:auto;display:flex;gap:8px;align-items:center;border:1px solid var(--cg-line);border-radius:8px;background:var(--cg-paper);font-size:12px;padding:5px 10px;min-height:30px;white-space:nowrap;}
.cuigengji .graph-view-context>button span {max-width:140px;overflow:hidden;text-overflow:ellipsis;color:var(--cg-muted);font-size:11px;}
.cuigengji .graph-view-context>.graph-auto-arrange{color:var(--cg-accent);border-color:color-mix(in srgb,var(--cg-accent) 25%,var(--cg-line));}
@container(max-width:400px){.cuigengji .graph-view-context {gap:6px;}.cuigengji .graph-view-context>div {gap:5px;padding:6px;font-size:10px;}.cuigengji .graph-view-context>button span {display:none;}.cuigengji .graph-view-context>button {font-size:11px;padding:4px 7px;}}
.cuigengji .planning-lines .graph-line-halo {fill:none;stroke:var(--cg-canvas);stroke-width:6px;stroke-linecap:round;stroke-linejoin:round;}
.cuigengji .planning-lines .graph-edge .graph-line {stroke-width:1.6px;stroke-linejoin:round;stroke-linecap:round;}
.cuigengji .planning-lines .graph-edge {transition:opacity 130ms,color 130ms;}
.cuigengji .planning-lines .graph-edge.edge-related {color:var(--cg-accent);}
.cuigengji .planning-lines .graph-edge.edge-muted {opacity:.23;}
.cuigengji .planning-lines .graph-edge.edge-related .graph-line {stroke-width:2px;}
.cuigengji .planning-lines .graph-edge .edge-hit:hover {cursor:pointer;}
.cuigengji .planning-card.card-muted {opacity:.42;}
.cuigengji .planning-card.card-muted:hover {opacity:1;}
.cuigengji .graph-route-note {position:absolute;left:16px;bottom:92px;max-width:calc(100% - 32px);font-size:11px;color:var(--cg-muted);background:var(--cg-paper);padding:5px 9px;border-radius:6px;pointer-events:none;z-index:8;}
.cuigengji .planning-decoration .frame-fold {border:0;background:transparent;font-size:11px;color:var(--cg-muted);min-height:28px;padding:3px 6px;margin-left:auto;white-space:nowrap;cursor:pointer;}
.cuigengji .planning-decoration header .decoration-title {min-width:0;flex:1;}
.cuigengji .planning-decoration.decoration-folded {padding:13px 16px;border-radius:12px;cursor:grab;z-index:3;background:var(--cg-paper);box-shadow:0 3px 8px color-mix(in srgb,var(--cg-ink) 5%,transparent);}
.cuigengji .decoration-folded::before {content:'';position:absolute;inset:5px 6px -5px;border:1px solid color-mix(in srgb,var(--decoration-color) 25%,var(--cg-line));border-radius:12px;background:var(--cg-paper);z-index:-1;}
.cuigengji .folded-eyebrow {color:var(--decoration-color);font-size:10px;margin-bottom:7px;}
.cuigengji .planning-decoration .folded-title {padding:0;background:transparent;border:0;text-align:left;min-height:0;font-size:15px;font-weight:600;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:inherit;}
.cuigengji .decoration-folded footer {display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:auto;font-size:10px;color:var(--cg-muted);}
.cuigengji .decoration-folded footer button {border:0;background:transparent;font-size:11px;padding:3px;min-height:24px;color:var(--cg-accent);}
.cuigengji {--cg-canvas:color-mix(in srgb,var(--cg-ink) 3%,var(--cg-paper));--cg-edge:color-mix(in srgb,var(--cg-muted) 65%,var(--cg-paper));}
.cuigengji .canvas-heading {padding:9px 16px;}
.cuigengji .canvas-heading .module-toolbar {gap:6px;min-height:36px;}
.cuigengji .canvas-heading .group-toolbar {display:contents;}
.cuigengji .canvas-heading .filter-prefix {display:none;}
.cuigengji .canvas-heading .filter-control {border-color:transparent;background:transparent;padding:0 8px;max-width:210px;}
.cuigengji .canvas-heading .filter-control.is-active {background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .canvas-heading .filter-control select {font-size:13px;max-width:170px;}
.cuigengji .canvas-heading button,.cuigengji .canvas-heading .menu>summary {font-size:13px;min-height:34px;white-space:nowrap;}
.cuigengji .canvas-heading .group-new,.cuigengji .graph-search>button {border:0;background:transparent;color:var(--cg-muted);}
.cuigengji .toolbar-spacer {flex:1;min-width:0;}
.cuigengji .graph-search {display:flex;align-items:center;gap:4px;max-width:100%;}
.cuigengji .graph-search .module-search {width:150px;max-width:180px;margin:0;flex:initial;border:1px solid var(--cg-line);background:var(--cg-paper);}
.cuigengji .canvas-heading .segmented {padding:2px;}
.cuigengji .canvas-heading .segmented button {min-height:30px;padding:4px 9px;font-size:12px;}
.cuigengji .planning-canvas-scroll {position:relative;flex:1;min-height:160px;overflow:clip;touch-action:none;overscroll-behavior:contain;cursor:default;user-select:none;background-color:var(--cg-canvas);background-image:radial-gradient(circle,color-mix(in srgb,var(--cg-muted) 20%,transparent) .8px,transparent .8px);}
.cuigengji .planning-canvas-scroll:focus-visible {outline:2px solid var(--cg-accent);outline-offset:-2px;}
.cuigengji .planning-canvas {position:absolute;inset:0;transform-origin:0 0;}
.cuigengji .planning-card {display:grid;grid-template-rows:14px 24px minmax(0,1fr) 16px;gap:8px;position:absolute;width:248px;height:168px;min-height:168px;padding:16px;border:1px solid var(--cg-line);border-radius:12px;background:var(--cg-paper);box-shadow:0 2px 5px color-mix(in srgb,var(--cg-ink) 3%,transparent);cursor:grab;overflow:visible;touch-action:none;z-index:3;transition:border-color 130ms,box-shadow 130ms;}
.cuigengji .planning-card:hover {border-color:color-mix(in srgb,var(--cg-accent) 35%,var(--cg-line));box-shadow:0 4px 12px color-mix(in srgb,var(--cg-ink) 6%,transparent);}
.cuigengji .planning-card.selected {outline:none;border-color:var(--cg-accent);background:var(--cg-paper);box-shadow:0 0 0 2px color-mix(in srgb,var(--cg-accent) 16%,transparent);}
.cuigengji .planning-card .planning-title {font-weight:500;font-size:16px;line-height:24px;padding:0;border:0;background:transparent;min-width:0;min-height:0;max-height:24px;text-align:left;cursor:pointer;white-space:nowrap;display:block;-webkit-line-clamp:unset;overflow:hidden;text-overflow:ellipsis;}
.cuigengji .planning-card p {min-width:0;min-height:0;max-height:3.4em;font-size:13px;line-height:1.7;margin:0;color:var(--cg-muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;white-space:normal;align-self:start;}
.cuigengji .planning-state {position:static;font-size:12px;color:var(--cg-muted);display:block;}
.cuigengji .planning-state.state-selected {color:var(--cg-accent);}
.cuigengji .graph-card-kind {display:flex;align-items:center;gap:5px;color:var(--cg-muted);font-size:10px;height:14px;letter-spacing:0;}
.cuigengji .graph-card-kind svg.app-icon {width:12px;height:12px;}
.cuigengji .planning-card:active,.cuigengji .graph-dragging,.cuigengji .graph-dragging * {cursor:grabbing;}
.cuigengji .planning-card .graph-port,.cuigengji .canvas-folder>.graph-port {position:absolute;top:19px;width:32px;height:32px;min-height:0;padding:0;border:0;border-radius:50%;background:transparent;cursor:crosshair;z-index:3;touch-action:none;}
.cuigengji .graph-port.port-in {left:-17px;}.cuigengji .graph-port.port-out {right:-17px;}
.cuigengji .relation-canvas .graph-port.anchor-left {top:calc(50% - 16px);left:-17px;}
.cuigengji .relation-canvas .graph-port.anchor-right {top:calc(50% - 16px);right:-17px;}
.cuigengji .relation-canvas .graph-port.anchor-top {top:-17px;left:calc(50% - 16px);}
.cuigengji .relation-canvas .graph-port.anchor-bottom {top:auto;bottom:-17px;left:calc(50% - 16px);}
.cuigengji .relation-canvas .graph-port:not([data-connected=true]):not(.port-valid):not(.port-source) {opacity:0;}
.cuigengji .relation-canvas .planning-card:hover .graph-port,.cuigengji .relation-canvas .planning-card:focus-within .graph-port {opacity:1;}
.cuigengji .graph-port::after {content:'';position:absolute;inset:12px;border:1.5px solid var(--cg-edge);background:var(--cg-paper);border-radius:50%;transition:background 130ms,border-color 130ms,box-shadow 130ms;}
.cuigengji .graph-port:hover::after,.cuigengji .graph-port:focus-visible::after,.cuigengji .graph-port.port-source::after,.cuigengji .graph-port.port-target::after {border-color:var(--cg-accent);background:var(--cg-accent);box-shadow:0 0 0 4px var(--cg-wash);}
.cuigengji .graph-port.port-valid::after {border-color:var(--cg-accent);box-shadow:0 0 0 4px var(--cg-wash);}
.cuigengji .graph-port.port-unavailable {opacity:.3;}
.cuigengji svg.planning-lines {position:absolute;inset:auto;max-width:none;max-height:none;overflow:visible;pointer-events:none;color:var(--cg-edge);z-index:1;}
.cuigengji .planning-lines .graph-line {fill:none;stroke:currentColor;stroke-width:1.5px;}
.cuigengji .planning-lines defs path {stroke:context-stroke;}
.cuigengji .planning-lines .edge-hit {fill:none;stroke:transparent;stroke-width:20px;pointer-events:stroke;cursor:crosshair;}
.cuigengji .planning-lines .edge-selected {color:var(--cg-accent);}
.cuigengji .planning-lines .edge-selected .graph-line {stroke:currentColor;stroke-width:2px;}
.cuigengji .planning-lines .graph-preview {fill:none;stroke:var(--cg-accent);stroke-width:2px;stroke-dasharray:5 4;pointer-events:none;}
.cuigengji .relation-label {width:140px;min-height:0;padding:2px 7px;background:var(--cg-canvas);color:var(--cg-muted);border-radius:6px;z-index:2;}
.cuigengji .relation-label .edge-label-content {display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 0;min-height:20px;border:0;background:transparent;font-size:11px;color:var(--cg-muted);font-weight:400;line-height:1.5;}
.cuigengji .relation-label.expanded {background:var(--cg-paper);z-index:6;box-shadow:0 4px 16px color-mix(in srgb,var(--cg-ink) 12%,transparent);}
.cuigengji .relation-label .expand-edge {font-size:12px;}
.cuigengji .graph-lasso {position:absolute;background:color-mix(in srgb,var(--cg-accent) 10%,transparent);border:1px solid var(--cg-accent);pointer-events:none;z-index:10;}
.cuigengji .graph-view-controls {position:absolute;right:16px;bottom:16px;display:flex;align-items:center;padding:4px;border:1px solid var(--cg-line);border-radius:10px;background:var(--cg-paper);z-index:12;box-shadow:0 3px 10px color-mix(in srgb,var(--cg-ink) 5%,transparent);}
.cuigengji .graph-view-controls>button,.cuigengji .graph-view-controls summary {border:0;background:transparent;padding:5px 8px;min-height:28px;font-size:12px;color:var(--cg-muted);}
.cuigengji .graph-view-controls .menu {margin-left:0;}
.cuigengji .graph-view-menu .menu-panel {top:auto;bottom:calc(100% + 8px);}
.cuigengji .graph-help {position:absolute;left:16px;bottom:16px;z-index:12;font-size:12px;}
.cuigengji .graph-help>summary {list-style:none;padding:6px 10px;border:1px solid var(--cg-line);border-radius:7px;background:var(--cg-paper);color:var(--cg-muted);cursor:pointer;}
.cuigengji .graph-help>div {position:absolute;left:0;bottom:calc(100% + 8px);background:var(--cg-paper);border:1px solid var(--cg-line);border-radius:10px;padding:10px 14px;width:280px;max-width:calc(100cqw - 40px);box-shadow:0 4px 16px color-mix(in srgb,var(--cg-ink) 8%,transparent);}
.cuigengji .graph-help p {margin:5px 0;}
.cuigengji .graph-status {position:absolute;bottom:62px;left:16px;right:16px;pointer-events:none;font-size:12px;color:var(--cg-muted);z-index:12;}
.cuigengji .graph-status:empty {display:none;}.cuigengji .graph-status>* {display:inline-flex;background:var(--cg-paper);border-radius:7px;padding:5px 9px;pointer-events:auto;}
.cuigengji .graph-save-error {display:flex;gap:6px;align-items:center;flex-wrap:wrap;}
.cuigengji .graph-save-error button {padding:3px 6px;font-size:12px;min-height:24px;}
.cuigengji .canvas-empty {position:absolute;left:24px;top:64px;color:var(--cg-muted);font-size:13px;pointer-events:none;}
.cuigengji .graph-context-menu {position:fixed;z-index:100;width:190px;max-width:calc(100vw - 16px);max-height:calc(100vh - 16px);overflow:auto;background:var(--cg-paper);border:1px solid var(--cg-line);border-radius:10px;padding:5px;box-shadow:0 8px 28px color-mix(in srgb,var(--cg-ink) 12%,transparent);animation:cg-menu-arrive 130ms ease-out;}
.cuigengji .graph-context-menu button {display:flex;justify-content:space-between;align-items:center;width:100%;border:0;background:transparent;text-align:left;padding:9px 12px;font-size:13px;font-weight:400;min-height:36px;}
.cuigengji .graph-context-menu button:not(:disabled):hover,.cuigengji .graph-context-menu button:focus-visible {background:var(--cg-wash);}
.cuigengji .planning-decoration {position:absolute;display:flex;flex-direction:column;border:1px solid color-mix(in srgb,var(--decoration-color) 32%,var(--cg-line));border-radius:10px;background:color-mix(in srgb,var(--decoration-color) 10%,var(--cg-paper));color:var(--cg-ink);z-index:2;}
.cuigengji .tone-neutral {--decoration-color:var(--cg-muted);}.cuigengji .tone-sand {--decoration-color:#c79b38;}.cuigengji .tone-sage {--decoration-color:#67996d;}.cuigengji .tone-sky {--decoration-color:var(--cg-accent);}.cuigengji .tone-rose {--decoration-color:#bb7a90;}
.cuigengji .decoration-frame {z-index:0;pointer-events:none;background:color-mix(in srgb,var(--decoration-color) 4%,var(--cg-paper));}
.cuigengji .planning-decoration.selected {border-color:var(--cg-accent);}
.cuigengji .planning-decoration header {display:flex;align-items:center;padding:12px 16px 6px;cursor:grab;pointer-events:auto;touch-action:none;user-select:none;}
.cuigengji .planning-decoration .decoration-title {border:0;background:transparent;min-height:0;padding:0;font-size:14px;font-weight:500;text-align:left;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis;cursor:grab;}
.cuigengji .decoration-content {flex:1;min-height:0;padding:0 16px 18px;white-space:pre-wrap;overflow:auto;line-height:1.7;color:var(--cg-muted);}
.cuigengji .decoration-frame .decoration-content {flex:none;max-height:44px;font-size:12px;}
.cuigengji .planning-decoration .decoration-resize {position:absolute;right:0;bottom:0;width:24px;height:24px;min-height:0;padding:0;border:0;background:transparent;color:var(--cg-muted);cursor:nwse-resize;pointer-events:auto;touch-action:none;font-size:12px;opacity:.6;}
.cuigengji .decoration-options {display:flex;gap:12px;flex-wrap:wrap;}
.cuigengji .decoration-options label {flex:1;min-width:90px;}
.cuigengji .decoration-editor .frame-move-option {display:flex;align-items:center;gap:8px;font-size:13px;color:var(--cg-muted);}
.cuigengji .frame-move-option input {width:auto;}
.cuigengji .document-kind {font-size:12px;color:var(--cg-muted);margin-bottom:14px;}
.cuigengji .scene-card .planning-title {font-family:inherit;font-size:15px;font-weight:600;}
.cuigengji .scene-card p {font-size:12px;line-height:1.65;max-height:3.3em;}
.cuigengji .scene-card-footer {display:flex;align-items:center;justify-content:space-between;gap:8px;border-top:1px solid color-mix(in srgb,var(--cg-line) 65%,transparent);padding-top:8px;}
.cuigengji .scene-card .planning-state {position:static;display:inline-flex;align-items:center;gap:5px;font-size:11px;line-height:1.4;white-space:nowrap;}
.cuigengji .scene-card .planning-state i {width:5px;height:5px;border-radius:50%;background:currentColor;opacity:.65;}
.cuigengji .scene-card .state-written {color:var(--cg-accent);}
.cuigengji .scene-card-footer small {font-size:10px;color:var(--cg-muted);white-space:nowrap;}
.cuigengji .scene-card.is-dropped {opacity:.65;}
/* Color identifies the object; zoom never changes its composition. */
.cuigengji .planning-card {--graph-card-tone:var(--cg-muted);}
.cuigengji .setting-card.kind-character {--graph-card-tone:#8981c8;}
.cuigengji .setting-card.kind-world,.cuigengji .scene-card.state-selected,.cuigengji .scene-card.state-written {--graph-card-tone:var(--cg-accent);}
.cuigengji .canvas-draft {position:absolute;z-index:20;width:280px;padding:14px;border:1px solid var(--cg-accent);border-radius:12px;background:var(--cg-paper);box-shadow:0 8px 24px color-mix(in srgb,var(--cg-ink) 12%,transparent);cursor:default;user-select:text;}
.cuigengji .canvas-draft input,.cuigengji .canvas-draft textarea {width:100%;padding:6px 0;border:0;border-radius:0;background:transparent;box-shadow:none;line-height:1.65;}
.cuigengji .canvas-draft input {font-size:15px;font-weight:600;}
.cuigengji .canvas-draft textarea {font-size:13px;min-height:50px;resize:vertical;margin-top:4px;}
.cuigengji .canvas-draft input:focus,.cuigengji .canvas-draft textarea:focus {outline:none;box-shadow:0 1px var(--cg-accent);}
.cuigengji .canvas-draft footer {display:flex;justify-content:flex-end;gap:6px;margin-top:12px;}
.cuigengji .canvas-draft footer>button {font-size:12px;min-height:30px;padding:4px 10px;}
.cuigengji .canvas-draft footer>button:not(.primary) {border:0;background:none;color:var(--cg-muted);}
.cuigengji .draft-origin {display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--cg-muted);font-size:11px;margin-bottom:6px;}
.cuigengji .canvas-draft .draft-error {font-size:12px;line-height:1.6;color:var(--cg-muted);margin:8px 0 0;}
.cuigengji .canvas-draft.draft-note {background:color-mix(in srgb,#c79b38 7%,var(--cg-paper));}
.cuigengji .canvas-draft.draft-frame {background:color-mix(in srgb,var(--cg-accent) 3%,var(--cg-paper));}
.cuigengji .inline-appearance {font-size:12px;color:var(--cg-muted);margin-top:8px;}
.cuigengji .inline-appearance .decoration-options {gap:4px;flex-wrap:nowrap;margin-top:8px;}
.cuigengji .inline-appearance select {min-width:0;flex:1;font-size:12px;padding:4px;}
@keyframes cg-menu-arrive {from {opacity:0;transform:translateY(-3px);}to {opacity:1;transform:translateY(0);}}
@container(max-width:599px){.cuigengji .canvas-heading {padding:8px 10px;}.cuigengji .canvas-heading .module-toolbar {gap:4px;}.cuigengji .canvas-heading .module-toolbar>.primary,.cuigengji .canvas-heading .module-toolbar>.menu:has(.primary) {margin-left:0;}.cuigengji .canvas-heading .filter-control select {max-width:120px;font-size:13px;}.cuigengji .canvas-heading .group-new {font-size:12px;padding:6px;}.cuigengji .graph-search .module-search {order:initial;flex-basis:initial;width:120px;}.cuigengji .graph-view-controls {right:10px;bottom:10px;}.cuigengji .graph-help {left:10px;bottom:10px;}}
@container(max-width:359px){.cuigengji .graph-view-controls>button{padding-inline:5px;}.cuigengji .graph-view-controls{max-width:calc(100% - 72px);}}
@media(pointer:coarse){.cuigengji .planning-card .graph-port,.cuigengji .canvas-folder>.graph-port {width:44px;height:44px;top:13px;}.cuigengji .graph-port.port-in {left:-23px;}.cuigengji .graph-port.port-out {right:-23px;}.cuigengji .graph-port::after {inset:18px;}.cuigengji .canvas-heading button,.cuigengji .canvas-heading summary,.cuigengji .graph-view-controls button,.cuigengji .graph-help summary {min-height:44px;}}
@media(pointer:coarse){.cuigengji .relation-canvas .graph-port {opacity:1!important;}.cuigengji .relation-canvas .graph-port.anchor-left{top:calc(50% - 22px);left:-23px;}.cuigengji .relation-canvas .graph-port.anchor-right{top:calc(50% - 22px);right:-23px;}.cuigengji .relation-canvas .graph-port.anchor-top{top:-23px;left:calc(50% - 22px);}.cuigengji .relation-canvas .graph-port.anchor-bottom{top:auto;bottom:-23px;left:calc(50% - 22px);}}
@media(prefers-reduced-motion:reduce){.cuigengji .graph-context-menu {animation:none;}.cuigengji .planning-card,.cuigengji .graph-port::after {transition:none;}}

.cuigengji .story-card-footer {display:flex;align-items:center;justify-content:space-between;gap:8px;min-width:0;min-height:0;font-size:10px;color:var(--cg-muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.cuigengji .story-card-footer .planning-state {font-size:10px;display:flex;align-items:center;gap:5px;}
.cuigengji .story-card-footer i {width:5px;height:5px;border-radius:50%;background:currentColor;display:inline-block;}
.cuigengji .story-card-footer small {font-size:9px;}

.cuigengji .canvas-folder-summary p {margin:0;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;line-height:1.5;font-size:12px;color:var(--cg-muted);}
.cuigengji .canvas-folder header {min-width:0;}
.cuigengji .canvas-folder header>button {flex-shrink:0;}
.cuigengji .canvas-folder>.graph-port {position:absolute;pointer-events:auto;}
`;

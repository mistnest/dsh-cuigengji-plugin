export const graphStyles = `
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

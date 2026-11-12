export const proseDiffStyles=`
.cuigengji .prose-comparison {--chapter-removed:color-mix(in srgb,#cf5e75 80%,var(--cg-ink));--chapter-added:color-mix(in srgb,#26936b 80%,var(--cg-ink));}
.cuigengji .chapter-diff-modes {margin-left:auto;display:flex;gap:2px;padding:2px;border-radius:7px;background:color-mix(in srgb,var(--cg-ink) 4%,var(--cg-paper));}
.cuigengji .chapter-diff-modes button {font-size:11px;border:0;background:none;padding:3px 9px;min-height:29px;}
.cuigengji .chapter-diff-modes button[aria-pressed=true] {background:var(--cg-paper);color:var(--cg-accent);box-shadow:0 1px 4px #0001;}
.cuigengji .chapter-diff-legend {display:flex;gap:12px;font-size:11px;}
.cuigengji .chapter-diff-legend>span:first-child {color:var(--chapter-removed);}
.cuigengji .chapter-diff-legend>span:last-child {color:var(--chapter-added);}
.cuigengji .prose-diff-row {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;min-width:0;}
.cuigengji .prose-diff-cell {display:grid;grid-template-columns:28px minmax(0,1fr);gap:8px;min-width:0;padding:6px 8px;font-size:15px;line-height:1.95;white-space:pre-wrap;overflow-wrap:anywhere;}
.cuigengji .prose-diff-number {font-size:11px;line-height:2.65;color:var(--cg-muted);user-select:none;text-align:right;font-variant-numeric:tabular-nums;}
.cuigengji .prose-diff-cell.is-removed {background:color-mix(in srgb,var(--chapter-removed) 8%,var(--cg-paper));}
.cuigengji .prose-diff-cell.is-added {background:color-mix(in srgb,var(--chapter-added) 8%,var(--cg-paper));}
.cuigengji .prose-comparison del {background:color-mix(in srgb,var(--chapter-removed) 15%,transparent);color:var(--chapter-removed);text-decoration-thickness:1px;}
.cuigengji .prose-comparison ins {background:color-mix(in srgb,var(--chapter-added) 15%,transparent);color:var(--chapter-added);text-decoration:none;border-bottom:1px solid color-mix(in srgb,var(--chapter-added) 45%,transparent);}
.cuigengji .chapter-diff-change {margin:8px 0 12px;padding:4px 0 6px;border:1px solid transparent;border-radius:8px;scroll-margin:10px;}
.cuigengji .chapter-diff-change[data-current=true] {border-color:color-mix(in srgb,var(--cg-accent) 45%,var(--cg-line));}
.cuigengji .chapter-diff-change-label {font-size:11px;color:var(--cg-accent);padding:3px 10px 6px;}
.cuigengji .prose-diff-context {color:var(--cg-muted);}
.cuigengji .prose-diff-expand {display:block;width:100%;border:0;background:var(--cg-wash);border-radius:4px;padding:6px;font-size:11px;color:var(--cg-accent);margin:6px 0;}
.cuigengji .prose-diff-inline {display:none;}
.cuigengji .prose-diff-inline>small {display:block;padding:6px 10px;font-size:11px;color:var(--cg-muted);}
.cuigengji .prose-comparison[data-layout=inline] .prose-diff-side,.cuigengji .prose-comparison[data-layout=inline] .context-before {display:none;}
.cuigengji .prose-comparison[data-layout=inline] .prose-diff-inline {display:block;}
.cuigengji .prose-comparison[data-layout=inline] .prose-diff-row {grid-template-columns:minmax(0,1fr);}
`;

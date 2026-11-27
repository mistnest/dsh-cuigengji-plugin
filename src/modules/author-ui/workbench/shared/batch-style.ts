export const batchStyles = `
.cuigengji .batch-manager {flex:none;margin:0;padding:18px 28px 20px;border-bottom:1px solid var(--cg-line);background:var(--cg-wash);}
.cuigengji .batch-heading {display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:14px;}
.cuigengji .batch-heading>div {display:flex;align-items:center;gap:12px;min-width:0;}
.cuigengji .batch-heading h2 {font-size:14px;font-weight:600;line-height:1.5;margin:0;}
.cuigengji .batch-count {color:var(--cg-muted);font-size:11px;white-space:nowrap;}
.cuigengji .batch-done {background:var(--cg-paper);font-size:12px;min-height:32px;padding:5px 14px;flex:none;}
.cuigengji .batch-controls {display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.cuigengji label.batch-select-all {display:flex;align-items:center;gap:8px;margin:0;font-size:12px;cursor:pointer;white-space:nowrap;}
.cuigengji .batch-select-all input,.cuigengji .batch-entry>input {accent-color:var(--cg-accent);width:16px;height:16px;flex:none;min-height:0;padding:0;margin:0;}
.cuigengji .batch-clear {border:0;background:none;padding:4px 0;color:var(--cg-muted);min-height:28px;font-size:11px;}
.cuigengji .batch-destination {display:flex;align-items:center;gap:10px;margin-left:auto;min-width:0;}
.cuigengji .batch-destination>label {display:flex;align-items:center;gap:10px;margin:0;font-size:11px;white-space:nowrap;color:var(--cg-muted);min-width:0;}
.cuigengji .batch-destination select {width:190px;max-width:100%;min-width:0;background:var(--cg-paper);font-size:12px;color:var(--cg-ink);}
.cuigengji .batch-destination>button {font-size:12px;min-width:64px;}
.cuigengji .batch-list {flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;padding:12px 28px 28px;}
.cuigengji label.batch-entry {display:flex;align-items:flex-start;gap:16px;cursor:pointer;margin:0;padding:18px 16px;border:1px solid transparent;border-bottom-color:var(--cg-line);border-radius:8px;background:transparent;transition:background 120ms,border-color 120ms;}
.cuigengji .batch-entry:hover {background:var(--cg-wash);}
.cuigengji label.batch-entry.is-checked {background:var(--cg-wash);border-color:color-mix(in srgb,var(--cg-accent) 20%,var(--cg-line));}
.cuigengji .batch-entry:has(input:focus-visible) {outline:2px solid var(--cg-accent);outline-offset:-2px;}
.cuigengji .batch-entry>input {margin-top:4px;}
.cuigengji .batch-entry-body {flex:1;min-width:0;}
.cuigengji .batch-entry-heading {display:flex;align-items:baseline;gap:16px;justify-content:space-between;}
.cuigengji .batch-entry-heading strong {font-weight:500;font-size:14px;line-height:1.7;overflow-wrap:anywhere;}
.cuigengji .batch-entry-heading small {font-size:10px;line-height:1.8;color:var(--cg-muted);text-align:right;flex:none;max-width:40%;overflow-wrap:anywhere;}
.cuigengji .batch-entry-summary {display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;font-size:12px;line-height:1.85;color:var(--cg-muted);margin-top:5px;overflow-wrap:anywhere;}
.cuigengji .batch-empty {font-size:12px;color:var(--cg-muted);padding:24px 0;text-align:center;}
@container (max-width:740px) {
 .cuigengji .batch-manager {padding:16px 20px;}
 .cuigengji .batch-destination {width:100%;margin:0;}
 .cuigengji .batch-destination>label {flex:1;}
 .cuigengji .batch-destination select {width:100%;flex:1;}
 .cuigengji .batch-list {padding:10px 16px 24px;}
}
@container (max-width:440px) {
 .cuigengji .batch-manager {padding:14px 16px 16px;}
 .cuigengji .batch-entry-heading {display:block;}
 .cuigengji .batch-entry-heading small {display:block;max-width:none;text-align:left;margin-top:3px;}
 .cuigengji label.batch-entry {padding:16px 10px;gap:12px;}
}
`;

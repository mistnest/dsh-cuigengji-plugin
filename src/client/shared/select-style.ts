/** Native customizable selects keep form, keyboard and accessibility semantics. */
export const selectStyles = `
.cuigengji select {cursor:pointer;min-height:34px;line-height:1.4;background-color:var(--cg-paper);}
.cuigengji select:disabled {cursor:default;opacity:.5;}
.cuigengji select:not(:disabled):hover {border-color:color-mix(in srgb,var(--cg-accent) 45%,var(--cg-line));}
.cuigengji select option {font:inherit;background:var(--cg-paper);color:var(--cg-ink);}
@supports (appearance:base-select) {
  .cuigengji select,.cuigengji select::picker(select) {appearance:base-select;}
  .cuigengji select {display:inline-flex;align-items:center;gap:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .cuigengji select::picker-icon {content:'';width:10px;height:6px;border:0;background:currentColor;clip-path:polygon(0 0,50% 65%,100% 0,100% 35%,50% 100%,0 35%);rotate:0deg;flex:none;margin:0 1px 0 auto;opacity:.6;transition:rotate 120ms;}
  .cuigengji select:open::picker-icon {rotate:180deg;}
  .cuigengji select::picker(select) {font:400 13px/1.5 var(--dsw-font-family,system-ui,'Microsoft YaHei',sans-serif);color:var(--cg-ink);background:var(--cg-paper);border:1px solid var(--cg-line);border-radius:12px;padding:5px;margin-block:6px;min-width:anchor-size(width);max-width:calc(100vw - 24px);max-height:min(320px,60dvh);box-shadow:0 8px 28px #0000001c,0 2px 6px #0000000a;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;}
  .cuigengji select option {display:flex;align-items:center;gap:12px;min-height:36px;padding:8px 12px;border-radius:7px;white-space:normal;overflow-wrap:anywhere;cursor:pointer;}
  .cuigengji select option:checked {color:var(--cg-accent);background:var(--cg-wash);font-weight:600;}
  .cuigengji select option:hover,.cuigengji select option:focus {background:color-mix(in srgb,var(--cg-accent) 12%,var(--cg-paper));outline:none;}
  .cuigengji select option::checkmark {order:2;margin-left:auto;color:var(--cg-accent);font-size:12px;}
  .cuigengji select option:disabled {opacity:.45;cursor:default;}
  .cuigengji .filter-control select {appearance:base-select;padding-right:2px;min-height:0;}
  .cuigengji .filter-chevron {display:none;}
  .cuigengji .book-picker {padding:7px 10px;border:1px solid transparent;border-radius:8px;background:transparent;font-weight:600;}
  .cuigengji .book-picker:hover,.cuigengji .book-picker:open {background:var(--cg-wash);border-color:var(--cg-line);}
}
@media (prefers-reduced-motion:reduce) {.cuigengji select::picker-icon {transition:none;}}
.cuigengji[data-motion=reduce] select::picker-icon {transition:none;}
`;

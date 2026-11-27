export const manuscriptSearchStyles=`
.cuigengji.manuscript-search-layer {position:fixed;inset:0;z-index:1000;display:block;width:auto;height:auto;padding:0;overflow:visible;background:transparent;pointer-events:none;}
.cuigengji.manuscript-search-layer[hidden] {display:none;}
.cuigengji .manuscript-search {position:absolute;z-index:30;right:16px;top:56px;width:min(364px,calc(100% - 24px));max-height:calc(100% - 16px);display:flex;flex-direction:column;min-height:0;min-width:0;border:1px solid var(--cg-line);border-radius:12px;background:var(--cg-paper);color:var(--cg-ink);box-shadow:0 14px 48px #17203326,0 2px 10px #1720330a;overflow:hidden;pointer-events:auto;-webkit-app-region:no-drag;}
.cuigengji .manuscript-search-heading {display:flex;align-items:center;justify-content:space-between;padding:8px 14px 4px;cursor:move;touch-action:none;user-select:none;}
.cuigengji .manuscript-search-heading strong {font-size:13px;font-weight:600;}
.cuigengji .manuscript-search-heading small {font-size:10px;font-weight:400;color:var(--cg-muted);margin-left:8px;}
.cuigengji .manuscript-search-heading button {border:0;background:none;font-size:19px;min-width:32px;min-height:32px;padding:2px;}
.cuigengji .manuscript-search-tabs {display:flex;gap:18px;padding:0 16px;border-bottom:1px solid var(--cg-line);}
.cuigengji .manuscript-search-tabs button {border:0;border-bottom:2px solid transparent;border-radius:0;background:none;padding:9px 2px;font-size:12px;color:var(--cg-muted);}
.cuigengji .manuscript-search-tabs button[aria-selected=true] {color:var(--cg-accent);border-bottom-color:var(--cg-accent);background:none;}
.cuigengji .manuscript-search-fields {padding:4px 16px 12px;}
.cuigengji .manuscript-search-fields>label {font-size:11px;color:var(--cg-muted);margin:10px 0;gap:6px;}
.cuigengji .manuscript-search-fields>label input {width:100%;min-width:0;background:var(--cg-card);color:var(--cg-ink);font-size:12px;min-height:34px;}
.cuigengji .manuscript-search-options {display:flex;align-items:center;justify-content:space-between;gap:8px;}
.cuigengji .manuscript-search-options select {font-size:11px;min-width:0;padding:5px 7px;}
.cuigengji .manuscript-search-options label {display:flex;gap:5px;align-items:center;font-size:11px;color:var(--cg-muted);margin:0;white-space:nowrap;}
.cuigengji .manuscript-search-options input {margin:0;accent-color:var(--cg-accent);}
.cuigengji .manuscript-replace-actions {display:flex;gap:8px;margin-top:12px;}
.cuigengji .manuscript-replace-actions button {flex:1;font-size:11px;min-height:32px;padding:6px 8px;}
.cuigengji .manuscript-search-summary {display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 16px;border-block:1px solid var(--cg-line);font-size:11px;color:var(--cg-muted);}
.cuigengji .manuscript-search-summary>div {display:flex;gap:2px;}
.cuigengji .manuscript-search-summary button {padding:3px 8px;border:0;background:none;font-size:15px;}
.cuigengji .manuscript-search-results {flex:0 1 auto;max-height:210px;min-height:0;overflow:auto;overscroll-behavior:contain;padding:6px 8px 12px;}
.cuigengji .manuscript-search-results h3 {font-size:11px;font-weight:500;color:var(--cg-muted);margin:12px 7px 6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .manuscript-search-result {display:block;width:100%;text-align:left;border:1px solid transparent;background:none;border-radius:7px;padding:9px;font-size:12px;line-height:1.8;margin:2px 0;}
.cuigengji .manuscript-search-result>span {display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden;overflow-wrap:anywhere;white-space:pre-wrap;}
.cuigengji .manuscript-search-result small {display:block;color:var(--cg-muted);font-size:10px;margin-top:4px;}
.cuigengji .manuscript-search-result:hover {background:var(--cg-wash);}
.cuigengji .manuscript-search-result[aria-current=true] {border-color:var(--cg-accent);background:var(--cg-wash);}
.cuigengji .manuscript-search mark {color:inherit;border-radius:2px;background:color-mix(in srgb,#e7be53 38%,transparent);}
.cuigengji .manuscript-search-empty {font-size:12px;color:var(--cg-muted);padding:16px 8px;margin:0;}
.cuigengji .manuscript-search-error,.cuigengji .manuscript-search-notice {font-size:11px;line-height:1.8;margin:0;padding:10px 16px;background:var(--cg-wash);overflow-wrap:anywhere;}
.cuigengji .manuscript-search-error {color:var(--dsw-alias-label-error,#b64242);}
.cuigengji .manuscript-search-error button {display:block;border:0;background:none;padding:4px 0;font-size:11px;text-decoration:underline;}
.cuigengji .manuscript-search-pages {display:flex;align-items:center;justify-content:space-between;padding:8px;border-top:1px solid var(--cg-line);gap:4px;}
.cuigengji .manuscript-search-pages button {font-size:11px;padding:5px 7px;}
.cuigengji .manuscript-search-pages small {font-size:10px;color:var(--cg-muted);}
.cuigengji .manuscript-replace-preview {display:flex;flex-direction:column;flex:1;min-height:0;}
.cuigengji .manuscript-replace-preview>p,.cuigengji .manuscript-replace-preview>small {font-size:11px;color:var(--cg-muted);padding:8px 16px;margin:0;}
.cuigengji .manuscript-replace-preview article {padding:10px;border-bottom:1px solid var(--cg-line);font-size:12px;line-height:1.8;overflow-wrap:anywhere;}
.cuigengji .manuscript-replace-preview article strong {display:block;font-size:11px;color:var(--cg-muted);margin-bottom:4px;}
.cuigengji .manuscript-replace-preview del {background:color-mix(in srgb,#db7777 18%,transparent);}
.cuigengji .manuscript-replace-preview ins {text-decoration:none;background:color-mix(in srgb,#77b99a 20%,transparent);}
.cuigengji .manuscript-replace-preview>footer {display:flex;gap:8px;padding:12px;border-top:1px solid var(--cg-line);}
.cuigengji .manuscript-replace-preview>footer button {flex:1;font-size:11px;padding:7px;}
.cuigengji .manuscript-search-fields,.cuigengji .manuscript-search-heading,.cuigengji .manuscript-search-tabs,.cuigengji .manuscript-search-summary,.cuigengji .manuscript-search-pages,.cuigengji .manuscript-replace-preview>footer {flex-shrink:0;}
@container(max-width:599px) {
  .cuigengji .manuscript-search-results {max-height:150px;}
  .cuigengji .manuscript-search-heading small {display:none;}
}
`;

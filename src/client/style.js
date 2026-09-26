export const styles = `
.cuigengji { color:var(--dsw-alias-label-primary,inherit); font-family:inherit; font-size:13px; padding:14px; height:100%; overflow:auto; box-sizing:border-box; }
.cuigengji * { box-sizing:border-box; }
.cuigengji h2 { font-size:16px; margin:0 0 12px; }
.cuigengji h3 { font-size:14px; margin:16px 0 8px; }
.cuigengji p { line-height:1.7; }
.cuigengji button,.cuigengji input,.cuigengji select,.cuigengji textarea { font:inherit; color:inherit; border:1px solid var(--dsw-alias-border-l1,#8886); background:var(--dsw-alias-button-floating-fill,transparent); border-radius:var(--dsw-radius-sm,5px); padding:7px 9px; }
.cuigengji button { cursor:pointer; }
.cuigengji button:disabled { opacity:.5; cursor:default; }
.cuigengji button:focus-visible,.cuigengji input:focus-visible,.cuigengji textarea:focus-visible,.cuigengji select:focus-visible { outline:2px solid var(--dsw-focus-ring-color,#7187dc); outline-offset:2px; }
.cuigengji [aria-selected=true],.cuigengji .selected { border-color:var(--dsw-alias-state-business-primary,#7187dc); background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#7187dc) 10%,transparent); }
.cuigengji label { display:grid; gap:5px; margin:10px 0; }
.cuigengji textarea { width:100%; min-height:130px; resize:vertical; line-height:1.85; }
.cuigengji .prose { min-height:360px; }
.cuigengji .row { display:flex; gap:7px; align-items:center; flex-wrap:wrap; margin:8px 0; }
.cuigengji .row>* { min-width:0; }
.cuigengji nav { display:flex; gap:5px; flex-wrap:wrap; border-bottom:1px solid var(--dsw-alias-border-l1,#8886); padding-bottom:10px; margin-bottom:14px; }
.cuigengji .muted { opacity:.7; font-size:12px; }
.cuigengji .notice { padding:10px; border:1px solid var(--dsw-alias-border-l1,#8886); border-left:3px solid var(--dsw-alias-state-business-primary,#7187dc); margin:10px 0; white-space:pre-wrap; }
.cuigengji .error { border-left-color:#c64e42; }
.cuigengji .list { display:grid; gap:5px; max-height:260px; overflow:auto; }
.cuigengji .list button { text-align:left; }
.cuigengji .split { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr)); gap:12px; }
.cuigengji pre { white-space:pre-wrap; overflow-wrap:anywhere; font:inherit; line-height:1.75; max-height:420px; overflow:auto; border:1px solid var(--dsw-alias-border-l1,#8886); padding:10px; }
.cuigengji svg { width:100%; max-height:300px; border:1px solid var(--dsw-alias-border-l1,#8886); border-radius:5px; }
.cuigengji svg text { fill:currentColor; font-size:11px; }
.cuigengji svg line { stroke:var(--dsw-alias-border-l1,#999); stroke-width:2; }
.cuigengji svg circle { fill:var(--dsw-alias-button-floating-fill,#777); stroke:var(--dsw-alias-state-business-primary,#7187dc); stroke-width:2; }
.cuigengji svg g { cursor:pointer; }
.cuigengji summary { cursor:pointer; padding:8px 0; }
.cuigengji .grow { flex:1; }
`;

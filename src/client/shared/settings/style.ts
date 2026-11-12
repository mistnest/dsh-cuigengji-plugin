export const settingsStyles=`
.cuigengji .library-count{display:block;margin:8px 0 16px;color:var(--cg-muted);font-size:11px;}
.cuigengji .library-modes{display:grid;gap:8px;}
.cuigengji .library-modes>button{text-align:left;padding:13px 14px;border:1px solid var(--cg-line);border-radius:9px;background:var(--cg-paper);}
.cuigengji .library-modes>button[aria-pressed=true]{border-color:var(--cg-accent);background:color-mix(in srgb,var(--cg-accent) 5%,var(--cg-paper));}
.cuigengji .library-modes strong{display:block;font-size:12px;font-weight:550;}
.cuigengji .library-modes span{display:block;font-size:11px;line-height:1.65;color:var(--cg-muted);margin-top:4px;}
.cuigengji .library-destination{margin-top:16px;padding:16px;border-radius:10px;border:1px solid var(--cg-line);background:var(--cg-canvas);}
.cuigengji .library-destination label{display:block;font-size:12px;margin-bottom:12px;}
.cuigengji .library-path-input{display:flex;gap:6px;margin-top:7px;}
.cuigengji .library-path-input input{flex:1;min-width:0;font-size:12px;}
.cuigengji .library-path-input button{flex:none;}
.cuigengji .library-destination select{display:block;max-width:100%;margin-top:6px;}
.cuigengji .library-preview{border-top:1px solid var(--cg-line);padding-top:14px;}
.cuigengji .library-preview .primary{margin-top:14px;}
.cuigengji .library-cancel{margin-top:10px;margin-left:8px;}
.cuigengji .settings-modal {width:min(880px,calc(100vw - 28px));height:min(700px,calc(100dvh - 36px));overflow:hidden;}
.cuigengji .settings-modal[open] {display:flex;flex-direction:column;}
.cuigengji .settings-modal .utility-head {padding:20px 24px 14px;}
.cuigengji .settings-modal .utility-content {flex:1;min-height:0;display:flex;flex-direction:column;padding:0;}
.cuigengji .settings-search {display:flex;align-items:center;gap:9px;margin:0 24px 16px;padding:0 12px;border:1px solid var(--cg-line);border-radius:9px;flex:none;background:var(--cg-canvas);}
.cuigengji .settings-search:focus-within {outline:2px solid var(--cg-accent);outline-offset:2px;}
.cuigengji .settings-search>svg {width:17px;height:17px;color:var(--cg-muted);flex:none;}
.cuigengji .settings-search input {min-width:0;flex:1;border:0;background:transparent;padding:10px 0;box-shadow:none;outline:none;}
.cuigengji .settings-search input:focus-visible {outline:none;}
.cuigengji .settings-search button {flex:none;min-width:28px;min-height:28px;padding:3px;border:0;background:transparent;font-size:18px;}
.cuigengji .settings-layout {display:flex;flex:1;min-height:0;border-top:1px solid var(--cg-line);}
.cuigengji .settings-categories {display:flex;flex-direction:column;gap:5px;width:182px;flex:none;padding:18px 12px;background:var(--cg-canvas);border-right:1px solid var(--cg-line);overflow:auto;}
.cuigengji .settings-categories button {flex:none;min-height:40px;display:flex;align-items:center;gap:9px;width:100%;padding:10px 12px;border:0;background:transparent;text-align:left;white-space:nowrap;}
.cuigengji .settings-categories button[aria-current=page] {color:var(--cg-accent);background:color-mix(in srgb,var(--cg-accent) 9%,var(--cg-paper));font-weight:600;}
.cuigengji .settings-categories svg {width:17px;height:17px;flex:none;}
.cuigengji .settings-categories small {margin-left:auto;color:var(--cg-muted);}
.cuigengji .settings-sections {flex:1;min-width:0;overflow:auto;overscroll-behavior:contain;padding:22px 28px 28px;scrollbar-gutter:stable;}
.cuigengji .settings-category+section {margin-top:32px;}
.cuigengji .settings-category>header h3 {font-size:17px;margin:0 0 6px;font-weight:600;}
.cuigengji .settings-category>header p {margin:0 0 18px;font-size:12px;color:var(--cg-muted);}
.cuigengji .settings-row {display:flex;align-items:center;gap:18px;padding:18px 0;border-bottom:1px solid var(--cg-line);}
.cuigengji .settings-row-text {flex:1;min-width:0;}
.cuigengji .settings-row-heading {display:flex;gap:7px;align-items:center;flex-wrap:wrap;}
.cuigengji .settings-row-heading strong {font-weight:550;font-size:13px;}
.cuigengji .settings-scope {font-size:10px;font-weight:400;color:var(--cg-muted);padding:1px 5px;border:1px solid var(--cg-line);border-radius:4px;white-space:nowrap;}
.cuigengji .settings-row p,.cuigengji .settings-data-path p {font-size:12px;line-height:1.65;color:var(--cg-muted);margin:6px 0 0;}
.cuigengji .settings-control {display:flex;align-items:center;gap:4px;flex:none;max-width:45%;}
.cuigengji .settings-control select {max-width:140px;font-size:12px;}
.cuigengji .settings-control button {white-space:nowrap;font-size:12px;}
.cuigengji .settings-control .settings-reset {border:0;background:transparent;padding:4px;min-width:28px;font-size:16px;color:var(--cg-muted);}
.cuigengji .settings-control input[role=switch] {appearance:none;width:34px;height:20px;margin:0;padding:2px;background:var(--cg-line);border:0;border-radius:20px;cursor:pointer;flex:none;}
.cuigengji .settings-control input[role=switch]::before {content:'';display:block;width:16px;height:16px;border-radius:50%;background:white;box-shadow:0 1px 3px #0002;transition:transform .15s;}
.cuigengji .settings-control input[role=switch]:checked {background:var(--cg-accent);}
.cuigengji .settings-control input[role=switch]:checked::before {transform:translateX(14px);}
.cuigengji .settings-control input[role=switch]:disabled {opacity:.45;cursor:default;}
.cuigengji .settings-control .settings-action {display:flex;align-items:center;gap:10px;}
.cuigengji .settings-runtime-state {font-size:11px;color:var(--cg-muted);}
.cuigengji .settings-reading-preview {margin:14px 0 0;padding:16px 18px;border-radius:8px;background:var(--cg-canvas);}
.cuigengji .settings-reading-preview p {margin:8px 0 0;}
.cuigengji .settings-work-name {font-size:11px;color:var(--cg-muted);background:var(--cg-canvas);border-radius:6px;padding:9px 12px;overflow-wrap:anywhere;margin:20px 0 0;}
.cuigengji .settings-work-name strong {display:block;font-size:13px;color:var(--cg-ink);font-weight:500;margin-top:3px;}
.cuigengji .settings-hint {font-size:12px;color:var(--cg-muted);margin-top:20px;}
.cuigengji .settings-data-path {margin-top:24px;}
.cuigengji .settings-data-path>strong {font-size:13px;font-weight:550;}
.cuigengji .settings-data-path code {display:block;user-select:text;overflow-wrap:anywhere;margin-top:12px;padding:12px;border-radius:7px;background:var(--cg-canvas);font-size:11px;line-height:1.7;}
.cuigengji .settings-footer {flex:none;padding:12px 24px;border-top:1px solid var(--cg-line);color:var(--cg-muted);font-size:11px;background:var(--cg-paper);}
.cuigengji .settings-category-reset {margin-top:20px;background:transparent;font-size:12px;color:var(--cg-muted);}
.cuigengji .settings-canvas-links {padding-bottom:18px;border-bottom:1px solid var(--cg-line);}
.cuigengji .settings-canvas-links .settings-row {border-bottom:0;padding-bottom:12px;}
.cuigengji .settings-link-options {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.cuigengji .settings-link-options>button {display:flex;flex-direction:column;align-items:stretch;gap:5px;min-width:0;padding:12px;text-align:left;background:var(--cg-paper);border:1px solid var(--cg-line);border-radius:9px;}
.cuigengji .settings-link-options>button[aria-checked=true] {border-color:var(--cg-accent);box-shadow:inset 0 0 0 1px var(--cg-accent);background:color-mix(in srgb,var(--cg-accent) 4%,var(--cg-paper));}
.cuigengji .settings-link-options svg {display:block;width:100%;height:76px;color:var(--cg-accent);margin-bottom:5px;}
.cuigengji .settings-link-options strong {font-size:12px;font-weight:550;}
.cuigengji .settings-link-options span {font-size:11px;line-height:1.6;color:var(--cg-muted);white-space:normal;}
.cuigengji .settings-empty {display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:260px;color:var(--cg-muted);}
.cuigengji .settings-empty svg {width:28px;height:28px;}
.cuigengji .settings-mobile-category {display:none;}
@container cg-utility (max-width:620px) {
 .cuigengji .settings-categories {display:none;}
 .cuigengji .settings-mobile-category {display:flex;align-items:center;gap:12px;padding:0 20px 12px;margin:0;font-size:12px;color:var(--cg-muted);}
 .cuigengji .settings-mobile-category select {flex:1;min-width:0;}
 .cuigengji .settings-sections {padding:20px;}
 .cuigengji .settings-search {margin:0 20px 12px;}
 .cuigengji .settings-row {gap:12px;flex-wrap:wrap;}
 .cuigengji .settings-control {max-width:100%;}
 .cuigengji .settings-control select {max-width:120px;}
 .cuigengji .settings-row-text {min-width:145px;}
 .cuigengji .settings-row p {font-size:11px;}
 .cuigengji .settings-row:has(p)> .settings-control:has(.settings-action) {margin-left:auto;}
}
@media(prefers-reduced-motion:reduce){.cuigengji .settings-control input[role=switch]::before{transition:none;}}
.cuigengji[data-motion=reduce] .settings-control input[role=switch]::before{transition:none;}
`;

export const settingsStyles=`
.cuigengji .sr-only {position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;}
.cuigengji .settings-modal {position:relative;width:min(880px,calc(100vw - 28px));height:min(672px,calc(100dvh - var(--cg-modal-top,0px) - 32px));border-radius:15px;overflow:hidden;}
.cuigengji .settings-modal[open] {display:flex;flex-direction:column;}
.cuigengji .settings-modal > .utility-head {position:absolute;inset:0 0 auto 0;padding:0;border-bottom:0;background:transparent;pointer-events:none;z-index:4;}
.cuigengji .settings-modal > .utility-head h2 {padding:20px 20px 0;font-size:16px;font-weight:650;letter-spacing:-.01em;pointer-events:auto;}
.cuigengji .settings-modal > .utility-head button {position:absolute;top:12px;right:14px;width:30px;height:30px;min-width:30px;min-height:30px;border-radius:8px;border:1px solid transparent;font-size:19px;line-height:1;color:var(--cg-muted);display:inline-flex;align-items:center;justify-content:center;pointer-events:auto;transition:background .15s,color .15s,border-color .15s;}
.cuigengji .settings-modal > .utility-head button:hover {background:var(--cg-canvas);border-color:var(--cg-line);color:var(--cg-ink);}
.cuigengji .settings-modal > .utility-content {flex:1;min-height:0;display:flex;flex-direction:column;padding:0;}
.cuigengji .settings-layout {display:flex;flex:1;min-height:0;min-width:0;}
.cuigengji .settings-rail {width:220px;flex:none;display:flex;flex-direction:column;padding:52px 14px 16px;background:var(--cg-canvas);border-right:1px solid var(--cg-line);overflow-y:auto;}
.cuigengji .settings-rail-controls {display:flex;flex-direction:column;gap:8px;margin-bottom:14px;}
.cuigengji .settings-search {display:flex;align-items:center;gap:7px;padding:0 10px;min-height:34px;border:1px solid var(--cg-line);border-radius:9px;background:var(--cg-card);transition:border-color .15s,box-shadow .15s;}
.cuigengji .settings-search:focus-within {border-color:var(--cg-accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--cg-accent) 12%,transparent);}
.cuigengji .settings-search>svg {width:14px;height:14px;color:var(--cg-muted);flex:none;}
.cuigengji .settings-search input {min-width:0;flex:1;border:0;background:transparent;padding:6px 0;font-size:12.5px;box-shadow:none;outline:none;color:var(--cg-ink);}
.cuigengji .settings-search input:focus-visible {outline:none;}
.cuigengji .settings-search button {flex:none;width:20px;height:20px;min-width:20px;min-height:20px;padding:0;border:0;border-radius:50%;background:var(--cg-canvas);color:var(--cg-muted);font-size:13px;line-height:1;display:inline-flex;align-items:center;justify-content:center;}
.cuigengji .settings-search button:hover {color:var(--cg-ink);}
.cuigengji .settings-categories {display:flex;flex-direction:column;gap:3px;}
.cuigengji .settings-categories button {position:relative;flex:none;min-height:38px;display:flex;align-items:center;gap:10px;width:100%;padding:0 11px;border:1px solid transparent;border-radius:9px;background:transparent;color:color-mix(in srgb,var(--cg-ink) 78%,var(--cg-muted));font-size:13px;font-weight:500;text-align:left;white-space:nowrap;transition:background .15s,color .15s,border-color .15s,box-shadow .15s;}
.cuigengji .settings-categories button:hover {background:color-mix(in srgb,var(--cg-ink) 5%,transparent);color:var(--cg-ink);}
.cuigengji .settings-categories button[aria-current=page] {color:var(--cg-ink);background:var(--cg-card);border-color:var(--cg-line);font-weight:600;box-shadow:0 1px 2px #0000000a;}
.cuigengji .settings-categories button[aria-current=page]::before {content:'';position:absolute;left:-1px;top:9px;bottom:9px;width:3px;border-radius:0 3px 3px 0;background:var(--cg-accent);}
.cuigengji .settings-categories svg {width:16px;height:16px;flex:none;color:var(--cg-muted);transition:color .15s;}
.cuigengji .settings-categories button[aria-current=page] svg {color:var(--cg-accent);}
.cuigengji .settings-categories small {margin-left:auto;font-size:11px;padding:1px 6px;border-radius:999px;background:color-mix(in srgb,var(--cg-accent) 12%,var(--cg-paper));color:var(--cg-accent);font-weight:600;}
.cuigengji .settings-sections {flex:1;min-width:0;overflow:auto;overscroll-behavior:contain;padding:26px 30px 30px;scrollbar-gutter:stable;}
.cuigengji .settings-error-banner {margin:0 0 14px;}
.cuigengji .settings-category {animation:cg-arrive 150ms ease-out;}
.cuigengji .settings-category+section {margin-top:26px;padding-top:22px;border-top:1px solid var(--cg-line);}
.cuigengji .settings-category>header {margin-bottom:16px;padding-right:28px;}
.cuigengji .settings-category>header h3 {font-size:17px;margin:0 0 4px;font-weight:650;letter-spacing:-.01em;}
.cuigengji .settings-category>header p {margin:0;font-size:12.5px;line-height:1.5;color:var(--cg-muted);}
.cuigengji .settings-group {margin-bottom:18px;}
.cuigengji .settings-group:last-child {margin-bottom:0;}
.cuigengji .settings-group-head {display:flex;align-items:center;justify-content:space-between;gap:8px;padding:0 3px 8px;font-size:11.5px;font-weight:600;color:var(--cg-muted);letter-spacing:.02em;}
.cuigengji .settings-book-pill {font-weight:500;font-size:11px;color:var(--cg-accent);background:color-mix(in srgb,var(--cg-accent) 10%,var(--cg-paper));padding:2px 8px;border-radius:999px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:65%;}
.cuigengji .settings-group-card {border:1px solid var(--cg-line);border-radius:12px;background:var(--cg-card);box-shadow:0 1px 2px #00000008;overflow:hidden;}
.cuigengji .settings-row {display:flex;align-items:center;gap:14px;padding:13px 16px;border-bottom:1px solid var(--cg-line);transition:background .14s,opacity .15s;}
.cuigengji .settings-group-card > :last-child,.cuigengji .settings-group-card > .settings-canvas-links:last-child {border-bottom:0;}
.cuigengji .settings-row.is-action-row:hover {background:color-mix(in srgb,var(--cg-canvas) 55%,var(--cg-card));}
.cuigengji .settings-row.is-muted-row {opacity:.58;}
.cuigengji .settings-row-icon {width:34px;height:34px;border-radius:9px;background:var(--cg-canvas);border:1px solid var(--cg-line);color:color-mix(in srgb,var(--cg-ink) 78%,var(--cg-muted));display:inline-flex;align-items:center;justify-content:center;flex:none;transition:color .15s,border-color .15s,background .15s;}
.cuigengji .settings-row-icon svg {width:16px;height:16px;}
.cuigengji .settings-row.is-action-row:hover .settings-row-icon {color:var(--cg-accent);border-color:color-mix(in srgb,var(--cg-accent) 32%,var(--cg-line));background:color-mix(in srgb,var(--cg-accent) 10%,var(--cg-paper));}
.cuigengji .settings-row-text {flex:1;min-width:0;}
.cuigengji .settings-row-heading {display:flex;gap:7px;align-items:center;flex-wrap:wrap;}
.cuigengji .settings-row-heading strong {font-weight:560;font-size:13px;}
.cuigengji .settings-scope {font-size:10px;font-weight:400;color:var(--cg-muted);padding:1px 5px;border-radius:4px;background:var(--cg-canvas);white-space:nowrap;}
.cuigengji .settings-row p,.cuigengji .settings-data-path p {font-size:12px;line-height:1.52;color:var(--cg-muted);margin:3px 0 0;}
.cuigengji .settings-control {display:flex;align-items:center;gap:5px;flex:none;max-width:48%;}
.cuigengji .settings-control select,.cuigengji .settings-mobile-category select {appearance:none;min-height:31px;padding:4px 28px 4px 11px;font-size:12.5px;border-radius:8px;border:1px solid color-mix(in srgb,var(--cg-ink) 14%,var(--cg-line));background-color:var(--cg-paper);background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2378736a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 9px center;color:var(--cg-ink);cursor:pointer;transition:border-color .15s,box-shadow .15s;}
.cuigengji .settings-control select {max-width:142px;}
.cuigengji .settings-control select:hover,.cuigengji .settings-mobile-category select:hover {border-color:color-mix(in srgb,var(--cg-accent) 42%,var(--cg-line));}
.cuigengji .settings-control button {min-height:30px;padding:4px 12px;border-radius:8px;white-space:nowrap;font-size:12px;}
.cuigengji .settings-control .settings-reset {width:26px;height:26px;min-width:26px;min-height:26px;padding:0;border:0;border-radius:7px;background:transparent;color:var(--cg-muted);display:inline-flex;align-items:center;justify-content:center;opacity:.68;transition:opacity .15s,background .15s,color .15s;}
.cuigengji .settings-control .settings-reset:hover {opacity:1;background:var(--cg-canvas);color:var(--cg-ink);}
.cuigengji .settings-control .settings-reset svg {width:13.5px;height:13.5px;}
.cuigengji .settings-control input[role=switch] {appearance:none;width:36px;height:20px;min-height:0;margin:0;padding:2px;background:color-mix(in srgb,var(--cg-ink) 15%,var(--cg-paper));border:1px solid color-mix(in srgb,var(--cg-ink) 12%,var(--cg-line));border-radius:999px;cursor:pointer;flex:none;transition:background .16s,border-color .16s;}
.cuigengji .settings-control input[role=switch]::before {content:'';display:block;width:14px;height:14px;border-radius:50%;background:white;box-shadow:0 1px 3px #0003;transition:transform .16s cubic-bezier(.22,1,.36,1);}
.cuigengji .settings-control input[role=switch]:checked {background:var(--cg-accent);border-color:var(--cg-accent);}
.cuigengji .settings-control input[role=switch]:checked::before {transform:translateX(16px);}
.cuigengji .settings-control input[role=switch]:disabled {opacity:.45;cursor:default;}
.cuigengji .settings-control .settings-action {display:inline-flex;align-items:center;gap:4px;background:var(--cg-paper);border-color:color-mix(in srgb,var(--cg-ink) 14%,var(--cg-line));transition:background .15s,border-color .15s,color .15s;}
.cuigengji .settings-control .settings-action svg {width:13px;height:13px;color:var(--cg-muted);transition:transform .15s,color .15s;}
.cuigengji .settings-row.is-action-row:hover .settings-action {border-color:color-mix(in srgb,var(--cg-accent) 38%,var(--cg-line));color:var(--cg-accent);}
.cuigengji .settings-row.is-action-row:hover .settings-action svg {transform:translateX(2px);color:var(--cg-accent);}
.cuigengji .settings-runtime-state {display:inline-flex;align-items:center;gap:6px;font-size:11.5px;padding:3px 10px;border-radius:999px;background:color-mix(in srgb,var(--cg-accent) 10%,var(--cg-paper));color:var(--cg-accent);font-weight:500;}
.cuigengji .settings-runtime-state::before {content:'';width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.8;}
.cuigengji .settings-reading-preview {margin:0;padding:13px 18px 14px;border-bottom:1px solid var(--cg-line);border-radius:0;background:linear-gradient(90deg,color-mix(in srgb,var(--cg-accent) 22%,transparent) 0,color-mix(in srgb,var(--cg-accent) 22%,transparent) 3px,transparent 3px),color-mix(in srgb,var(--cg-canvas) 55%,var(--cg-card));}
.cuigengji .settings-specimen-meta {display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;}
.cuigengji .settings-reading-preview small {font-size:11px;color:var(--cg-muted);}
.cuigengji .settings-specimen-badge {font-size:10.5px;font-variant-numeric:tabular-nums;padding:1px 7px;border-radius:5px;border:1px solid var(--cg-line);background:var(--cg-card);color:var(--cg-muted);}
.cuigengji .settings-reading-preview p {margin:0;font-family:Georgia,'Noto Serif SC','SimSun',serif;text-indent:2em;transition:font-size .15s,line-height .15s;}
.cuigengji .settings-hint {font-size:12px;color:var(--cg-muted);margin:0 0 18px;padding:11px 14px;border-radius:10px;border:1px dashed var(--cg-line);background:var(--cg-canvas);}
.cuigengji .settings-data-path {padding:14px 16px 16px;}
.cuigengji .settings-data-path>strong {font-size:13px;font-weight:560;}
.cuigengji .settings-path-bar {display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-top:10px;padding:9px 12px;border-radius:9px;border:1px solid var(--cg-line);background:var(--cg-paper);}
.cuigengji .settings-path-bar code {flex:1;min-width:140px;user-select:text;overflow-wrap:anywhere;margin:0;padding:0;border:0;background:transparent;font-size:11.5px;line-height:1.5;}
.cuigengji .library-count {display:inline-block;margin:0;padding:2px 8px;border-radius:999px;background:var(--cg-canvas);color:var(--cg-muted);font-size:11px;white-space:nowrap;}
.cuigengji .library-modes {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:12px;}
.cuigengji .library-modes>button {display:flex;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:3px;min-height:0;text-align:left;padding:11px 12px;border:1px solid var(--cg-line);border-radius:10px;background:var(--cg-paper);transition:border-color .15s,background .15s;}
.cuigengji .library-modes>button:hover {border-color:color-mix(in srgb,var(--cg-ink) 18%,var(--cg-line));}
.cuigengji .library-modes>button[aria-pressed=true] {border-color:var(--cg-accent);background:color-mix(in srgb,var(--cg-accent) 8%,var(--cg-paper));}
.cuigengji .library-modes>button svg {width:15px;height:15px;color:var(--cg-accent);margin-bottom:2px;}
.cuigengji .library-modes strong {display:block;font-size:12px;font-weight:580;}
.cuigengji .library-modes span {display:block;font-size:11px;line-height:1.45;color:var(--cg-muted);}
.cuigengji .library-destination {margin-top:12px;padding:13px 14px;border-radius:10px;border:1px solid var(--cg-line);background:var(--cg-paper);}
.cuigengji .library-destination label {display:block;font-size:12px;margin-bottom:10px;}
.cuigengji .library-path-input {display:flex;gap:6px;margin-top:6px;}
.cuigengji .library-path-input input {flex:1;min-width:0;font-size:12px;}
.cuigengji .library-path-input button {flex:none;}
.cuigengji .library-destination select {display:block;max-width:100%;margin-top:6px;}
.cuigengji .library-preview {border-top:1px solid var(--cg-line);padding-top:12px;}
.cuigengji .library-preview .primary {margin-top:12px;}
.cuigengji .library-cancel {margin-top:8px;margin-left:8px;}
.cuigengji .settings-category-foot {margin-top:14px;display:flex;justify-content:flex-end;}
.cuigengji .settings-category-reset {display:inline-flex;align-items:center;gap:5px;min-height:30px;padding:4px 10px;border:0;border-radius:7px;background:transparent;font-size:12px;color:var(--cg-muted);transition:background .15s,color .15s;}
.cuigengji .settings-category-reset:hover {background:var(--cg-canvas);color:var(--cg-ink);}
.cuigengji .settings-category-reset svg {width:13px;height:13px;}
.cuigengji .settings-canvas-links {padding-bottom:15px;border-bottom:1px solid var(--cg-line);}
.cuigengji .settings-canvas-links .settings-row {border-bottom:0;padding-bottom:8px;}
.cuigengji .settings-link-options {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding:0 16px;}
.cuigengji .settings-link-options>button {position:relative;display:flex;flex-direction:column;align-items:stretch;gap:3px;min-width:0;padding:11px 13px;text-align:left;background:var(--cg-paper);border:1px solid var(--cg-line);border-radius:10px;transition:border-color .15s,background .15s,box-shadow .15s;}
.cuigengji .settings-link-options>button:hover {border-color:color-mix(in srgb,var(--cg-ink) 18%,var(--cg-line));}
.cuigengji .settings-link-options>button[aria-checked=true] {border-color:var(--cg-accent);box-shadow:inset 0 0 0 1px var(--cg-accent);background:color-mix(in srgb,var(--cg-accent) 5%,var(--cg-card));}
.cuigengji .settings-link-check {position:absolute;top:10px;right:10px;width:15px;height:15px;border-radius:50%;border:1.5px solid color-mix(in srgb,var(--cg-ink) 22%,var(--cg-line));display:flex;align-items:center;justify-content:center;}
.cuigengji .settings-link-options>button[aria-checked=true] .settings-link-check {border-color:var(--cg-accent);background:var(--cg-accent);}
.cuigengji .settings-link-options>button[aria-checked=true] .settings-link-check::after {content:'';width:5px;height:5px;border-radius:50%;background:white;}
.cuigengji .settings-link-options svg {display:block;width:100%;height:50px;color:var(--cg-accent);margin-bottom:3px;}
.cuigengji .settings-link-options strong {font-size:12.5px;font-weight:580;}
.cuigengji .settings-link-options span:not(.settings-link-check) {font-size:11px;line-height:1.45;color:var(--cg-muted);white-space:normal;}
.cuigengji .settings-empty {display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;min-height:260px;color:var(--cg-muted);}
.cuigengji .settings-empty svg {width:26px;height:26px;opacity:.65;}
.cuigengji .settings-empty p {margin:0;font-size:13px;}
.cuigengji .settings-mobile-category {display:none;}
@container cg-utility (max-width:620px) {
 .cuigengji .settings-layout {flex-direction:column;}
 .cuigengji .settings-modal > .utility-head h2 {padding:15px 18px 0;}
 .cuigengji .settings-rail {width:100%;padding:44px 16px 12px;border-right:0;border-bottom:1px solid var(--cg-line);overflow:visible;}
 .cuigengji .settings-rail-controls {flex-direction:row;flex-wrap:wrap;gap:8px;margin-bottom:0;}
 .cuigengji .settings-search {flex:1 1 150px;min-width:0;}
 .cuigengji .settings-categories {display:none;}
 .cuigengji .settings-mobile-category {display:flex;flex:0 1 auto;margin:0;}
 .cuigengji .settings-mobile-category select {max-width:140px;min-width:0;}
 .cuigengji .settings-sections {padding:18px 16px 22px;}
 .cuigengji .settings-category>header {padding-right:0;}
 .cuigengji .settings-row {gap:10px;flex-wrap:wrap;padding:11px 13px;}
 .cuigengji .settings-control {max-width:100%;}
 .cuigengji .settings-control select {max-width:124px;}
 .cuigengji .settings-row-text {min-width:130px;}
 .cuigengji .settings-row p {font-size:11px;}
 .cuigengji .settings-row:has(p)> .settings-control:has(.settings-action) {margin-left:auto;}
 .cuigengji .library-modes,.cuigengji .settings-link-options {grid-template-columns:1fr;}
 .cuigengji .settings-link-options {padding:0 13px;}
}
@media(prefers-reduced-motion:reduce){.cuigengji .settings-control input[role=switch]::before{transition:none;}}
.cuigengji[data-motion=reduce] .settings-control input[role=switch]::before{transition:none;}
`;

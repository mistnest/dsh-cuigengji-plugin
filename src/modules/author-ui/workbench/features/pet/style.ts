export const petStyles = `
.cg-pet-surface { --pet-blue:#416dea; --pet-ink:#26334d; --pet-muted:#73809a; --pet-line:#e0e7f4; color:var(--pet-ink); font:13px/1.6 var(--dsw-font-family,system-ui,"Microsoft YaHei",sans-serif); }
.cg-pet-surface * { box-sizing:border-box; }
.cg-pet-surface button { font:inherit; cursor:pointer; }
.cg-pet-surface button:disabled { opacity:.5; cursor:default; }
.cg-pet-surface button:focus-visible,.cg-pet-surface input:focus-visible,.cg-pet-surface summary:focus-visible { outline:2px solid var(--pet-blue); outline-offset:3px; }
.cg-pet-surface.pet-panel-root { height:100%; min-height:0; width:100%; overflow:auto; overscroll-behavior:contain; container-type:inline-size; background:#f5f8ff; }
.cg-pet-surface .pet-panel { min-height:100%; padding:24px; background:radial-gradient(circle at 20% 0%,#fff,transparent 55%),#f5f8ff; }
.cg-pet-surface .pet-panel-header { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; }
.cg-pet-surface .pet-eyebrow { display:block; margin-bottom:4px; color:var(--pet-blue); font-size:11px; letter-spacing:.08em; }
.cg-pet-surface .pet-heading { min-width:0; }.cg-pet-surface .pet-heading h2 { margin:0; color:var(--pet-ink); font-size:24px; line-height:1.25; font-weight:700; }
.cg-pet-surface .pet-scope { display:block; max-width:240px; margin-top:5px; overflow:hidden; color:var(--pet-muted); font-size:12px; text-overflow:ellipsis; white-space:nowrap; }
.cg-pet-surface .pet-icon-button { flex:none; width:32px; height:32px; padding:0; border:1px solid var(--pet-line); border-radius:10px; color:var(--pet-muted); background:#ffffffb8; font-size:20px; line-height:1; }
.cg-pet-surface .pet-hero { display:flex; align-items:center; gap:16px; padding:20px 0 8px; }
.cg-pet-surface .pet-avatar { position:relative; display:block; flex:none; width:112px; height:112px; padding:0; border:0; border-radius:0; background:transparent; box-shadow:none; isolation:isolate; touch-action:none; user-select:none; -webkit-user-select:none; }
.cg-pet-surface .pet-avatar-art { position:absolute; inset:0; display:block; pointer-events:none; background-repeat:no-repeat; transform-origin:50% 90%; filter:drop-shadow(0 5px 5px #12234324); }
.cg-pet-surface .pet-panel .pet-avatar { width:138px; height:138px; }
.cg-pet-surface .pet-avatar-bigfish .pet-avatar-art { background-size:300% 200%; background-position:0 0; }
.cg-pet-surface .pet-avatar-bigfish.pet-mood-thinking .pet-avatar-art,.cg-pet-surface .pet-avatar-bigfish.pet-mood-waiting .pet-avatar-art { background-position:50% 0; }
.cg-pet-surface .pet-avatar-bigfish.pet-mood-writing .pet-avatar-art { background-position:100% 0; }
.cg-pet-surface .pet-avatar-bigfish.pet-mood-celebrate .pet-avatar-art,.cg-pet-surface .pet-avatar-bigfish.pet-mood-reacting .pet-avatar-art { background-position:0 100%; }
.cg-pet-surface .pet-avatar-bigfish.pet-mood-sleepy .pet-avatar-art { background-position:50% 100%; }
.cg-pet-surface .pet-avatar-bigfish.pet-mood-error .pet-avatar-art { background-position:100% 100%; }
.cg-pet-surface .pet-avatar-cuigengji .pet-avatar-art { background-size:200% 200%; background-position:0 0; }
.cg-pet-surface .pet-avatar-cuigengji.pet-mood-writing .pet-avatar-art,.cg-pet-surface .pet-avatar-cuigengji.pet-mood-sleepy .pet-avatar-art { background-position:100% 0; }
.cg-pet-surface .pet-avatar-cuigengji.pet-mood-celebrate .pet-avatar-art,.cg-pet-surface .pet-avatar-cuigengji.pet-mood-reacting .pet-avatar-art { background-position:0 100%; }
.cg-pet-surface .pet-avatar-cuigengji.pet-mood-thinking .pet-avatar-art,.cg-pet-surface .pet-avatar-cuigengji.pet-mood-waiting .pet-avatar-art,.cg-pet-surface .pet-avatar-cuigengji.pet-mood-error .pet-avatar-art { background-position:100% 100%; }
.cg-pet-surface .pet-avatar-art { animation:cg-pet-breathe 4s ease-in-out infinite; }
.cg-pet-surface .pet-mood-writing .pet-avatar-art { animation:cg-pet-read 2.8s ease-in-out infinite; }
.cg-pet-surface .pet-mood-sleepy .pet-avatar-art { animation:cg-pet-breathe 6s ease-in-out infinite; }
.cg-pet-surface .pet-mood-celebrate .pet-avatar-art,.cg-pet-surface .pet-mood-reacting .pet-avatar-art { animation:cg-pet-hop .75s ease-in-out 2; }
.cg-pet-surface .pet-sparkles { position:absolute; inset:0; pointer-events:none; }
.cg-pet-surface .pet-sparkles i { position:absolute; top:12%; left:4%; color:#f2b84d; font-size:16px; font-style:normal; animation:cg-pet-sparkle .9s ease-in-out 2 alternate; }
.cg-pet-surface .pet-sparkles i:nth-child(2) { top:28%; left:auto; right:4%; color:#6289f6; font-size:11px; animation-delay:.15s; }.cg-pet-surface .pet-sparkles i:nth-child(3) { top:70%; left:auto; right:8%; font-size:10px; animation-delay:.3s; }
.cg-pet-surface .pet-bubble { flex:1; min-width:0; max-width:270px; padding:13px 15px; border:1px solid var(--pet-line); border-radius:16px 16px 16px 4px; color:#53617c; background:#fff; box-shadow:0 6px 18px #243c8010; font-size:13px; line-height:1.8; overflow-wrap:anywhere; }
.cg-pet-surface .pet-status-row { display:flex; align-items:center; gap:8px; color:var(--pet-muted); font-size:12px; }
.cg-pet-surface .pet-status-dot { flex:none; width:7px; height:7px; border-radius:50%; background:#78ad9d; }
.cg-pet-surface .pet-status-thinking,.cg-pet-surface .pet-status-writing { background:#5b7dea; }.cg-pet-surface .pet-status-waiting,.cg-pet-surface .pet-status-celebrate,.cg-pet-surface .pet-status-reacting { background:#e7ac46; }.cg-pet-surface .pet-status-sleepy { background:#a093c3; }.cg-pet-surface .pet-status-error { background:#d68997; }
.cg-pet-surface .pet-role-hint { margin:4px 0 20px; color:var(--pet-muted); font-size:11px; }
.cg-pet-surface .pet-date-row { display:flex; align-items:center; justify-content:space-between; color:var(--pet-muted); font-size:12px; }
.cg-pet-surface .pet-retry { padding:2px 5px; border:0; color:var(--pet-blue); background:transparent; font-size:12px; }
.cg-pet-surface .pet-error { color:#ad5366; font-size:12px; overflow-wrap:anywhere; }
.cg-pet-surface .pet-metrics { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:10px; }
.cg-pet-surface .pet-metric { min-width:0; padding:12px 10px; border:1px solid var(--pet-line); border-radius:12px; background:#ffffffcf; }
.cg-pet-surface .pet-metric span { display:block; color:var(--pet-muted); font-size:11px; }.cg-pet-surface .pet-metric strong { display:inline-block; margin-top:6px; color:var(--pet-ink); font-size:22px; line-height:1.2; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }.cg-pet-surface .pet-metric small { margin-left:3px; color:var(--pet-muted); font-size:10px; }
.cg-pet-surface .pet-metric-prose { border-top:2px solid #6c8bf1; }.cg-pet-surface .pet-metric-setting { border-top:2px solid #72b8ae; }.cg-pet-surface .pet-metric-plan { border-top:2px solid #edbd6d; }
.cg-pet-surface .pet-secondary { display:flex; flex-wrap:wrap; gap:12px; margin-top:8px; color:var(--pet-muted); font-size:11px; }
.cg-pet-surface .pet-panel-actions { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; margin-top:18px; }.cg-pet-surface .pet-panel-actions button { min-width:0; padding:9px 6px; border:1px solid var(--pet-line); border-radius:10px; color:#4963a6; background:#fff; font-size:12px; }
.cg-pet-surface .pet-panel-actions button span { opacity:.6; }
.cg-pet-surface .pet-details { margin-top:16px; border-top:1px solid var(--pet-line); color:var(--pet-muted); font-size:12px; }.cg-pet-surface .pet-details summary { padding:12px 0; cursor:pointer; }
.cg-pet-surface .pet-breakdown { display:grid; gap:6px; padding:0 0 10px; }.cg-pet-surface .pet-breakdown div { display:flex; justify-content:space-between; gap:10px; }.cg-pet-surface .pet-breakdown strong { color:var(--pet-ink); font-weight:500; text-align:right; }
.cg-pet-surface .pet-controls { margin-top:6px; padding-top:16px; border-top:1px solid var(--pet-line); }
.cg-pet-surface .pet-role-picker { display:flex; padding:3px; border:1px solid var(--pet-line); border-radius:12px; background:#eaf0fc; }.cg-pet-surface .pet-role-picker button { flex:1; padding:6px 8px; border:0; border-radius:8px; color:var(--pet-muted); background:transparent; font-size:12px; }.cg-pet-surface .pet-role-picker button[aria-pressed=true] { color:var(--pet-blue); background:#fff; box-shadow:0 2px 5px #263d7810; }
.cg-pet-surface .pet-visibility { display:flex; align-items:center; justify-content:space-between; gap:12px; margin:14px 0 8px; font-size:12px; }.cg-pet-surface .pet-visibility input { width:17px; height:17px; accent-color:var(--pet-blue); cursor:pointer; }
.cg-pet-surface .pet-reset { padding:4px 0; border:0; color:var(--pet-blue); background:transparent; font-size:11px; }
.cg-pet-surface .pet-footnote { margin:18px 0 0; color:#8995aa; font-size:10px; line-height:1.7; }
.cg-pet-surface.pet-overlay-root { display:contents; }
.cg-pet-surface .pet-companion { position:fixed; z-index:1000; width:112px; height:112px; pointer-events:none; user-select:none; -webkit-user-select:none; }
.cg-pet-surface .pet-companion-character { position:relative; width:112px; height:112px; }
.cg-pet-surface .pet-companion .pet-avatar { pointer-events:auto; cursor:grab; border-radius:24px; }
.cg-pet-surface .pet-companion.is-dragging .pet-avatar { cursor:grabbing; }.cg-pet-surface .pet-companion.is-dragging .pet-avatar-art { animation:none; transform:rotate(-3deg); }
.cg-pet-surface .pet-companion-status { position:absolute; right:10px; bottom:4px; width:10px; height:10px; border:2px solid #fff; border-radius:50%; box-shadow:0 1px 5px #26334d40; }
.cg-pet-surface .pet-companion-bubble { position:fixed; padding:14px; overflow:auto; overscroll-behavior:contain; border:1px solid #dce4f5; border-radius:16px; color:var(--pet-ink); background:#fff; box-shadow:0 12px 38px #14275026; pointer-events:auto; user-select:text; -webkit-user-select:text; animation:cg-pet-bubble .16s ease-out; }
.cg-pet-surface .pet-companion-bubble-head { display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px; }.cg-pet-surface .pet-companion-bubble-head strong { font-size:13px; }.cg-pet-surface .pet-companion-bubble-head button { flex:none; width:26px; height:26px; padding:0; border:0; border-radius:8px; color:var(--pet-muted); background:#f2f5fb; font-size:18px; line-height:1; }
.cg-pet-surface .pet-companion-bubble p { margin:0; color:#58657f; font-size:12px; line-height:1.75; overflow-wrap:anywhere; }.cg-pet-surface p.pet-companion-scope { margin:0 0 8px; color:#8a95aa; font-size:11px; }
.cg-pet-surface .pet-companion-stats { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:6px; margin-top:12px; }.cg-pet-surface .pet-companion-stats span { min-width:0; padding:6px 4px; border-radius:9px; color:var(--pet-muted); background:#f4f7fd; font-size:10px; text-align:center; }.cg-pet-surface .pet-companion-stats b { display:block; color:#4265c7; font-size:16px; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
.cg-pet-surface .pet-companion-actions { display:flex; gap:8px; margin-top:12px; }.cg-pet-surface .pet-companion-actions button,.cg-pet-surface .pet-companion-retry { flex:1; padding:7px 6px; border:1px solid var(--pet-line); border-radius:9px; color:#4963a6; background:#fff; font-size:11px; }.cg-pet-surface .pet-companion-retry { width:100%; margin-top:8px; color:#ad5366; }
.cg-pet-surface .pet-menu-actions { display:grid; gap:3px; }.cg-pet-surface .pet-menu-actions button { padding:9px; border:0; border-radius:8px; color:var(--pet-ink); background:transparent; text-align:left; font-size:12px; }.cg-pet-surface .pet-menu-actions button:hover { background:#f0f4fd; }
.cg-pet-surface.pet-recovery { position:fixed; right:16px; bottom:16px; z-index:1000; display:flex; gap:8px; align-items:center; padding:10px 14px; border:1px solid var(--pet-line); border-radius:12px; background:#fff; pointer-events:auto; font-size:12px; }.cg-pet-surface.pet-recovery button { padding:4px 6px; border:0; color:var(--pet-blue); background:transparent; }
@keyframes cg-pet-breathe { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-2px) rotate(.4deg); } }
@keyframes cg-pet-read { 0%,100% { transform:rotate(0); } 50% { transform:rotate(-1deg) translateY(-1px); } }
@keyframes cg-pet-hop { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-5px) rotate(-1deg); } }
@keyframes cg-pet-sparkle { from { opacity:.3; transform:scale(.8); } to { opacity:1; transform:scale(1.1) translateY(-3px); } }
@keyframes cg-pet-bubble { from { opacity:0; } to { opacity:1; } }
.cg-pet-surface[data-motion=reduce] .pet-avatar-art,.cg-pet-surface[data-motion=reduce] .pet-sparkles i,.cg-pet-surface[data-motion=reduce] .pet-companion-bubble { animation:none; }
@media(prefers-reduced-motion:reduce) { .cg-pet-surface .pet-avatar-art,.cg-pet-surface .pet-sparkles i,.cg-pet-surface .pet-companion-bubble { animation:none; } }
@container(max-width:380px) { .cg-pet-surface .pet-panel { padding:18px; }.cg-pet-surface .pet-panel .pet-avatar { width:112px; height:112px; }.cg-pet-surface .pet-hero { gap:10px; }.cg-pet-surface .pet-bubble { padding:10px; font-size:12px; }.cg-pet-surface .pet-metric { padding:10px 7px; }.cg-pet-surface .pet-metric strong { font-size:18px; } }
`;

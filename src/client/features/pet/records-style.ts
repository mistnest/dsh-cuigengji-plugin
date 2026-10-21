export const recordsStyles=`
.cuigengji .writing-records-modal {width:min(840px,calc(100vw - 32px));}
.cuigengji .records-document {min-width:0;padding:24px 0 4px;}
.cuigengji .records-heading {display:flex;justify-content:space-between;align-items:center;gap:20px;margin-bottom:28px;}
.cuigengji .records-eyebrow {font-size:11px;color:var(--cg-accent);}
.cuigengji .records-heading h3 {font-size:23px;font-weight:500;line-height:1.6;margin:8px 0 0;}
.cuigengji .records-controls {display:flex;align-items:flex-end;gap:8px;flex-shrink:0;max-width:240px;}
.cuigengji .records-heading label {display:flex;flex-direction:column;gap:6px;min-width:0;flex:1;margin:0;font-size:11px;color:var(--cg-muted);}
.cuigengji .records-heading select {width:100%;font-size:12px;}
.cuigengji .records-refresh {height:36px;flex:none;font-size:12px;padding:6px 10px;color:var(--cg-muted);}
.cuigengji .records-metrics {display:grid;grid-template-columns:repeat(4,minmax(0,1fr));border:1px solid var(--cg-line);border-radius:14px;background:color-mix(in srgb,var(--cg-accent) 3%,var(--cg-paper));overflow:hidden;}
.cuigengji .records-metric {min-width:0;padding:24px;border-right:1px solid var(--cg-line);container-type:inline-size;}
.cuigengji .records-metric:last-child {border:0;}
.cuigengji .records-metric>span {font-size:12px;color:var(--cg-muted);}
.cuigengji .records-metric strong {display:block;margin-top:12px;font-size:32px;font-weight:500;line-height:1.2;font-variant-numeric:tabular-nums;overflow-wrap:anywhere;}
.cuigengji .records-metric small {margin-left:6px;font-size:11px;font-weight:400;color:var(--cg-muted);}
.cuigengji .records-books {margin-top:36px;}
.cuigengji .records-books>header {display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:12px;}
.cuigengji .records-books h4 {font-size:13px;font-weight:500;margin:0;}
.cuigengji .records-books>header small {color:var(--cg-muted);font-size:11px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.cuigengji .records-table{overflow-x:auto;}
.cuigengji .records-table>div {min-width:420px;display:grid;grid-template-columns:minmax(0,1.5fr) repeat(4,minmax(0,1fr));gap:12px;align-items:center;padding:14px 0;border-bottom:1px solid var(--cg-line);font-size:13px;font-variant-numeric:tabular-nums;}
.cuigengji .records-table strong {font-size:12px;font-weight:500;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.cuigengji .records-table span:not(:first-child) {text-align:right;}
.cuigengji .records-table .records-table-head {color:var(--cg-muted);font-size:10px;padding:8px 0;}
.cuigengji .records-contributions {margin-top:24px;}
.cuigengji .records-contributions summary {font-size:12px;padding:12px 0;color:var(--cg-muted);cursor:pointer;}
.cuigengji .records-empty {padding:24px 0;color:var(--cg-muted);font-size:12px;line-height:1.9;}
.cuigengji .records-range {display:flex;gap:4px;width:max-content;max-width:100%;padding:4px;margin:0 0 20px;border:1px solid var(--cg-line);border-radius:10px;background:var(--cg-canvas);}
.cuigengji .records-range button {padding:7px 13px;border:0;border-radius:7px;background:transparent;color:var(--cg-muted);font-size:12px;white-space:nowrap;}
.cuigengji .records-range button[aria-pressed=true] {background:var(--cg-paper);color:var(--cg-accent);box-shadow:0 1px 5px #17264a0c;}
.cuigengji .records-custom {display:flex;align-items:end;gap:10px;margin:0 0 20px;}
.cuigengji .records-custom label {min-width:0;flex:1;margin:0;gap:6px;font-size:11px;color:var(--cg-muted);}
.cuigengji .records-custom input {min-width:0;width:100%;font-size:12px;}
.cuigengji .records-custom>span {align-self:center;padding-top:16px;color:var(--cg-muted);}
.cuigengji .records-custom>button {height:36px;flex:none;}
.cuigengji .records-trend {margin-top:30px;}
.cuigengji .records-trend>header {display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:20px;}
.cuigengji .records-trend h4 {margin:0;font-size:13px;font-weight:500;}
.cuigengji .records-trend h4 small {font-size:10px;color:var(--cg-muted);margin-left:8px;font-weight:400;}
.cuigengji .records-legend {display:flex;gap:16px;color:var(--cg-muted);font-size:11px;}
.cuigengji .records-legend span:before {content:'';display:inline-block;width:7px;height:7px;border-radius:2px;margin-right:5px;background:var(--cg-accent);}
.cuigengji .records-legend .legend-setting:before {background:#a689d8;}
.cuigengji .records-legend .legend-chat:before,.cuigengji .records-bar-pair .records-bar-chat{background:#c69845;}
.cuigengji .records-chart {height:174px;display:flex;gap:10px;}
.cuigengji .records-chart-scale {width:42px;flex:none;height:148px;display:flex;flex-direction:column;justify-content:space-between;text-align:right;color:var(--cg-muted);font-size:9px;font-variant-numeric:tabular-nums;}
.cuigengji .records-chart-scroll {flex:1;min-width:0;padding-right:10px;overflow-x:auto;overflow-y:hidden;scrollbar-width:thin;}
.cuigengji .records-chart-bars {display:grid;gap:3px;min-width:100%;height:170px;background:linear-gradient(var(--cg-line),var(--cg-line)) 0 0/100% 1px no-repeat,linear-gradient(var(--cg-line),var(--cg-line)) 0 74px/100% 1px no-repeat,linear-gradient(var(--cg-line),var(--cg-line)) 0 148px/100% 1px no-repeat;}
.cuigengji button.records-chart-day {display:flex;flex-direction:column;align-items:center;justify-content:end;gap:7px;min-width:0;height:170px;border:0;border-radius:5px;padding:0 1px;background:transparent;position:relative;}
.cuigengji button.records-chart-day:hover,.cuigengji button.records-chart-day.is-selected {background:color-mix(in srgb,var(--cg-accent) 8%,transparent);}
.cuigengji .records-bar-pair {height:148px;width:100%;max-width:24px;display:flex;align-items:end;justify-content:center;gap:2px;}
.cuigengji .records-bar-pair i {width:28%;border-radius:3px 3px 0 0;display:block;background:var(--cg-accent);opacity:.8;transition:opacity .15s;}
.cuigengji .records-bar-pair .records-bar-setting {background:#a689d8;}
.cuigengji .records-chart-day:hover i,.cuigengji .records-chart-day.is-selected i {opacity:1;}
.cuigengji .records-day-label {height:15px;line-height:15px;font-size:9px;color:var(--cg-muted);white-space:nowrap;}
.cuigengji .records-chart-day:first-child .records-day-label {align-self:flex-start;}
.cuigengji .records-chart-day:last-child .records-day-label {align-self:flex-end;}
.cuigengji .records-trend-foot {display:flex;justify-content:space-between;gap:10px;align-items:center;min-height:28px;margin-top:10px;}
.cuigengji .records-trend-foot small {font-size:11px;color:var(--cg-muted);}
.cuigengji .records-trend-foot button {font-size:11px;color:var(--cg-accent);background:transparent;border:0;padding:4px 0;}
.cuigengji .records-books {margin-top:26px;}
.cuigengji .records-books .records-date-picker {display:flex;flex-direction:row;align-items:center;margin:0;gap:8px;font-size:10px;color:var(--cg-muted);}
.cuigengji .records-date-picker select {font-size:11px;padding:5px 8px;max-width:150px;}
.cuigengji .records-table strong>small {display:block;font-size:10px;font-weight:400;color:var(--cg-muted);margin-top:3px;}
.cuigengji .records-contributions summary small {font-size:10px;margin-left:6px;}
@container cg-utility (max-width:599px){.cuigengji .records-metrics{grid-template-columns:repeat(2,minmax(0,1fr));}.cuigengji .records-metric:nth-child(2){border-right:0;}.cuigengji .records-metric:nth-child(-n+2){border-bottom:1px solid var(--cg-line);}.cuigengji .records-heading {align-items:flex-start;flex-direction:column;gap:18px;}.cuigengji .records-heading h3 {font-size:20px;}.cuigengji .records-controls {width:100%;max-width:none;}.cuigengji .records-metric {padding:18px 12px;}.cuigengji .records-metric strong {font-size:24px;}.cuigengji .records-table{overflow-x:auto;}
.cuigengji .records-table>div {min-width:420px;gap:8px;font-size:12px;}}
@container cg-utility (max-width:359px){.cuigengji .records-metric {padding:16px 8px;}.cuigengji .records-metric strong {font-size:22px;}.cuigengji .records-metric small {margin-left:3px;font-size:10px;}}
@container cg-utility (max-width:449px){.cuigengji .records-range {width:100%;}.cuigengji .records-range button {flex:1;padding:7px 5px;font-size:11px;}.cuigengji .records-custom {flex-wrap:wrap;gap:8px;}.cuigengji .records-custom label {flex-basis:40%;}.cuigengji .records-custom>span {display:none;}.cuigengji .records-custom>button {margin-left:auto;}.cuigengji .records-books>header {align-items:start;flex-direction:column;gap:10px;}.cuigengji .records-chart-bars {gap:2px;}.cuigengji .records-chart-scale {width:32px;}.cuigengji .records-metric strong {font-size:clamp(12px,calc(180cqw / var(--record-digits)),24px);letter-spacing:-.03em;white-space:nowrap;}.cuigengji .records-metric strong small {display:block;margin:5px 0 0;letter-spacing:0;}}
`;

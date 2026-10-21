export const documentStyles=`
.cuigengji .workspace-detail {container:cg-detail / inline-size;}
.cuigengji .document-heading {padding:2px 0 24px;border-bottom:1px solid var(--cg-line);margin:0 0 28px;}
.cuigengji .document-eyebrow {display:flex;align-items:center;gap:9px;color:var(--cg-muted);font-size:11px;line-height:1.6;margin-bottom:12px;}
.cuigengji .document-eyebrow>span:first-child {color:var(--cg-accent);font-weight:550;}
.cuigengji .document-eyebrow i {height:3px;width:3px;border-radius:50%;background:var(--cg-line);}
.cuigengji .workspace-detail .document-heading h2 {font-size:27px;line-height:1.5;margin:0 0 12px;font-weight:600;letter-spacing:.01em;overflow-wrap:anywhere;}
.cuigengji .workspace-detail .document-heading .document-summary {font-size:14px;line-height:1.85;margin:0 0 16px;color:var(--cg-muted);}
.cuigengji .document-meta {display:flex;flex-wrap:wrap;gap:14px;font-size:10px;color:var(--cg-muted);font-variant-numeric:tabular-nums;}
.cuigengji .document-tabs {display:flex;gap:24px;border-bottom:1px solid var(--cg-line);margin:-12px 0 28px;}
.cuigengji .document-tabs button {padding:10px 0;border:0;border-radius:0;background:none;border-bottom:2px solid transparent;color:var(--cg-muted);font-size:12px;}
.cuigengji .document-tabs button[aria-pressed=true] {color:var(--cg-accent);border-color:var(--cg-accent);font-weight:600;}
.cuigengji .document-body.document-prose {white-space:normal;}
.cuigengji .document-prose p,.cuigengji .document-prose li,.cuigengji .document-prose blockquote {white-space:pre-wrap;}
.cuigengji .document-prose p {margin:0 0 1.15em;}
.cuigengji .document-prose h3 {font-size:1.08em;margin:1.7em 0 .7em;line-height:1.6;color:var(--cg-ink);}
.cuigengji .document-prose ul,.cuigengji .document-prose ol {padding-left:1.5em;margin:0 0 1.2em;}
.cuigengji .document-prose li+li {margin-top:.35em;}
.cuigengji .document-prose blockquote {margin:1.2em 0;padding:4px 0 4px 16px;border-left:2px solid var(--cg-line);color:var(--cg-muted);}
.cuigengji .document-empty {font-size:13px;color:var(--cg-muted);padding:16px 0;}
.cuigengji .history-intro {display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;justify-content:space-between;margin-bottom:24px;}
.cuigengji .history-intro strong {font-size:13px;font-weight:550;}
.cuigengji .history-intro p {font-size:11px;color:var(--cg-muted);line-height:1.8;margin:6px 0 0;}
.cuigengji .history-intro label {display:flex;align-items:center;gap:5px;font-size:10px;color:var(--cg-muted);margin:2px 0;}
.cuigengji .history-timeline {list-style:none;margin:0;padding:0 0 0 18px;border-left:1px solid var(--cg-line);}
.cuigengji .history-timeline>li {position:relative;padding-bottom:14px;}
.cuigengji .history-timeline>li:before {content:'';position:absolute;left:-22px;top:19px;width:7px;height:7px;border-radius:50%;border:2px solid var(--cg-paper);background:var(--cg-edge);}
.cuigengji .history-timeline>li[data-current=true]:before,.cuigengji .history-timeline>li:has(>[aria-expanded=true]):before {background:var(--cg-accent);}
.cuigengji .history-event {display:block;width:100%;padding:12px 14px;border:1px solid transparent;border-radius:9px;background:transparent;text-align:left;}
.cuigengji .history-event[aria-expanded=true] {border-color:var(--cg-line);background:var(--cg-canvas);}
.cuigengji .history-event-heading {display:flex;align-items:baseline;gap:10px;justify-content:space-between;}
.cuigengji .history-event-heading strong {font-size:12px;font-weight:550;line-height:1.7;}
.cuigengji .history-event-heading small {font-size:10px;color:var(--cg-muted);white-space:nowrap;}
.cuigengji .history-event-meta {display:flex;flex-wrap:wrap;gap:12px;color:var(--cg-muted);font-size:10px;margin-top:7px;}
.cuigengji .history-reason {display:block;font-size:11px;line-height:1.7;color:var(--cg-muted);margin-top:8px;}
.cuigengji .history-version-panel {padding:18px 0 12px;}
.cuigengji .history-version-tools {display:flex;flex-wrap:wrap;justify-content:space-between;gap:8px;margin-bottom:24px;align-items:center;}
.cuigengji .history-version-tools label {display:flex;gap:8px;align-items:center;font-size:11px;color:var(--cg-muted);margin:0;min-width:0;}
.cuigengji .history-version-tools select {max-width:220px;font-size:11px;}
.cuigengji .history-close {border:0;background:none;font-size:11px;color:var(--cg-muted);}
.cuigengji .workspace-detail .history-version-panel .document-heading h2 {font-size:20px;}
.cuigengji .history-version-panel .document-body {font-size:14px;}
.cuigengji .history-restore {display:flex;flex-wrap:wrap;justify-content:space-between;gap:12px;align-items:center;border-top:1px solid var(--cg-line);padding:16px 0 0;margin-top:24px;}
.cuigengji .history-restore span,.cuigengji .history-footnote,.cuigengji .history-attribute {font-size:10px;color:var(--cg-muted);line-height:1.8;}
.cuigengji .history-restore button {font-size:11px;}
.cuigengji .history-footnote {margin-top:22px;}
.cuigengji .version-compare-head {display:flex;flex-wrap:wrap;gap:12px;justify-content:space-between;margin:0 0 18px;font-size:12px;}
.cuigengji .version-compare-head span {font-size:10px;color:var(--cg-muted);}
.cuigengji .version-diff-field {margin-bottom:22px;}
.cuigengji .version-diff-field h4 {font-size:11px;color:var(--cg-muted);font-weight:500;margin:0 0 8px;}
.cuigengji .version-diff-columns {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
.cuigengji .version-diff-columns small {font-size:10px;color:var(--cg-muted);display:block;margin-bottom:7px;}
.cuigengji .version-diff-columns pre {font-family:inherit;font-size:12px;line-height:1.9;white-space:pre-wrap;overflow-wrap:anywhere;margin:0;padding:12px;border-radius:7px;max-height:440px;overflow:auto;}
.cuigengji .diff-before {background:color-mix(in srgb,#bd6b81 7%,var(--cg-paper));border-left:2px solid #bd6b8155;}
.cuigengji .diff-after {background:color-mix(in srgb,var(--cg-accent) 6%,var(--cg-paper));border-left:2px solid color-mix(in srgb,var(--cg-accent) 35%,transparent);}
@container cg-detail (max-width:520px){.cuigengji .version-diff-columns{grid-template-columns:1fr;}.cuigengji .workspace-detail .document-heading h2{font-size:24px;}.cuigengji .history-timeline{padding-left:14px;}.cuigengji .history-timeline>li:before{left:-18px;}.cuigengji .history-event{padding:12px 8px;}.cuigengji .history-version-tools select{max-width:190px;}}
`;

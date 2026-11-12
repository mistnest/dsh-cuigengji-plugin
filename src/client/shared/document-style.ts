export const documentStyles=`
.cuigengji .workspace-detail {container-name:cg-detail card-inspector;container-type:inline-size;}
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
@container cg-detail (max-width:520px){.cuigengji .workspace-detail .document-heading h2{font-size:24px;}}
`;

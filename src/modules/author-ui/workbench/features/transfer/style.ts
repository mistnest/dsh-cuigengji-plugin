export const transferStyles = `
.cuigengji .transfer-document {max-width:1100px;}
.cuigengji .transfer-mode {display:flex;gap:4px;padding:4px;background:var(--cg-wash);border-radius:10px;}
.cuigengji .transfer-mode button {border:0;background:none;color:var(--cg-muted);padding:7px 22px;min-height:34px;}
.cuigengji .transfer-mode button[aria-pressed=true] {color:var(--cg-accent);background:var(--cg-paper);box-shadow:0 1px 5px #0001;}
.cuigengji .transfer-kinds {display:flex;gap:8px;flex-wrap:wrap;}
.cuigengji .transfer-kinds button {border-color:var(--cg-line);background:transparent;font-size:12px;padding:8px 15px;}
.cuigengji .transfer-kinds button[aria-pressed=true] {background:var(--cg-wash);border-color:color-mix(in srgb,var(--cg-accent) 40%,var(--cg-line));color:var(--cg-accent);}
.cuigengji .transfer-caption {color:var(--cg-muted);font-size:12px;margin:12px 0 26px;line-height:1.8;}
.cuigengji .transfer-grid {display:grid;grid-template-columns:minmax(0,1fr) minmax(220px,280px);gap:32px;align-items:start;}
.cuigengji .transfer-form {min-width:0;}
.cuigengji .transfer-form>.management-field:first-child {margin-top:0;}
.cuigengji .transfer-summary {padding:22px;background:var(--cg-wash);border-radius:12px;min-width:0;position:sticky;top:0;}
.cuigengji .transfer-summary h3 {font-size:13px;font-weight:600;margin:0 0 20px;}
.cuigengji .transfer-counts {display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:22px 12px;margin:0;}
.cuigengji .transfer-counts dd {font-size:24px;font-weight:500;line-height:1.2;font-variant-numeric:tabular-nums;margin:0;}
.cuigengji .transfer-counts dt {font-size:11px;color:var(--cg-muted);margin-top:7px;}
.cuigengji .transfer-filter-pair {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
.cuigengji .transfer-book-field select,.cuigengji .transfer-filter select,.cuigengji .transfer-filter-pair select {width:100%;}
.cuigengji .transfer-selection {border:1px solid var(--cg-line);border-radius:10px;overflow:hidden;margin:16px 0 22px;}
.cuigengji .transfer-selection-head {display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;background:var(--cg-wash);border-bottom:1px solid var(--cg-line);}
.cuigengji .transfer-selection-head>input {width:110px;min-width:0;background:var(--cg-paper);font-size:11px;padding:5px 8px;}
.cuigengji label.transfer-checkbox {display:flex;align-items:center;gap:9px;margin:0;font-size:12px;line-height:1.7;}
.cuigengji .transfer-checkbox input,.cuigengji .transfer-selection-row input {flex:none;accent-color:var(--cg-accent);width:15px;height:15px;margin:0;}
.cuigengji .transfer-checkbox small {font-size:11px;color:var(--cg-muted);}
.cuigengji .transfer-selection-list {max-height:340px;overflow:auto;overscroll-behavior:contain;scrollbar-width:thin;}
.cuigengji label.transfer-selection-row {display:flex;align-items:center;gap:12px;padding:14px 16px;border-top:1px solid var(--cg-line);margin:0;cursor:pointer;transition:background 120ms;}
.cuigengji .transfer-selection-row:first-child {border-top:0;}
.cuigengji .transfer-selection-row:hover {background:var(--cg-wash);}
.cuigengji .transfer-selection-row>span {min-width:0;overflow-wrap:anywhere;}
.cuigengji .transfer-selection-row strong {display:block;font-weight:500;font-size:13px;line-height:1.6;}
.cuigengji .transfer-selection-row small {display:block;font-size:11px;color:var(--cg-muted);margin-top:3px;line-height:1.6;}
.cuigengji .transfer-empty {padding:20px;text-align:center;font-size:12px;color:var(--cg-muted);}
.cuigengji .transfer-dependency-choice {margin-top:20px!important;align-items:flex-start!important;}
.cuigengji .transfer-dependency-choice input {margin-top:4px;}
.cuigengji .transfer-dependency-choice small {display:block;}
.cuigengji .transfer-dependencies,.cuigengji .transfer-details,.cuigengji .transfer-samples {font-size:11px;margin-top:22px;padding-top:14px;border-top:1px solid var(--cg-line);color:var(--cg-muted);}
.cuigengji .transfer-summary summary {font-size:11px;}
.cuigengji .transfer-summary .transfer-refresh {display:block;font-size:11px;padding:4px 0;margin-top:18px;min-height:28px;}
.cuigengji .transfer-summary ul {list-style:none;margin:12px 0 0;padding:0;line-height:1.8;max-height:220px;overflow:auto;}
.cuigengji .transfer-summary li {margin:8px 0;overflow-wrap:anywhere;}
.cuigengji .transfer-dependencies li {display:flex;align-items:baseline;gap:8px;color:var(--cg-ink);}
.cuigengji .transfer-dependencies small {font-size:10px;color:var(--cg-muted);white-space:nowrap;}
.cuigengji .transfer-whole-library {display:flex;gap:20px;padding:24px 0;align-items:center;}
.cuigengji .transfer-whole-library>span {font-size:36px;color:var(--cg-accent);}
.cuigengji .transfer-whole-library h3,.cuigengji .transfer-preset-scope h3 {font-size:16px;font-weight:500;margin:0;}
.cuigengji .transfer-whole-library p,.cuigengji .transfer-preset-scope p {font-size:12px;line-height:1.8;color:var(--cg-muted);}
.cuigengji .transfer-preset-scope {padding:24px 0;}
.cuigengji .transfer-footer {display:flex;gap:18px;justify-content:space-between;align-items:center;width:100%;max-width:1100px;margin:auto;padding:14px clamp(20px,4cqw,40px);}
.cuigengji .transfer-footer>span {font-size:12px;min-width:0;overflow-wrap:anywhere;line-height:1.6;}
.cuigengji .transfer-footer small {display:block;font-size:10px;color:var(--cg-muted);margin-top:4px;}
.cuigengji .transfer-footer>button {flex:none;white-space:nowrap;padding:9px 24px;}
.cuigengji .transfer-upload {display:flex;align-items:center;gap:20px;border:1px dashed var(--cg-line);border-radius:12px;padding:22px 24px;margin:10px 0 28px;transition:background 120ms,border-color 120ms;}
.cuigengji .transfer-upload.is-dragging {background:var(--cg-wash);border-color:var(--cg-accent);}
.cuigengji .transfer-upload-mark {width:40px;height:40px;flex:none;color:var(--cg-accent);}
.cuigengji .transfer-upload-mark svg {display:block;width:100%;height:100%;}
.cuigengji .transfer-upload>div:nth-child(2) {min-width:0;flex:1;}
.cuigengji .transfer-upload h3 {font-size:14px;font-weight:500;margin:0;overflow-wrap:anywhere;}
.cuigengji .transfer-upload p {font-size:11px;color:var(--cg-muted);margin:6px 0 0;line-height:1.8;}
.cuigengji .transfer-upload .management-file-picker {flex:none;border-radius:8px;}
.cuigengji .transfer-upload .file-picker-label {padding:8px 14px;min-height:38px;font-size:12px;}
.cuigengji .transfer-import-options {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin-bottom:22px;}
.cuigengji .transfer-import-options .management-field {margin:0;}
.cuigengji .transfer-import-options+.transfer-kinds {margin-bottom:24px;}
.cuigengji .transfer-destination {border-top:1px solid var(--cg-line);padding-top:10px;margin-top:24px;}
.cuigengji .transfer-destination h3 {font-size:13px;font-weight:500;margin:10px 0;}
.cuigengji .transfer-conflicts {color:var(--cg-ink);font-size:12px;margin-top:20px;padding-top:16px;border-top:1px solid var(--cg-line);}
.cuigengji .transfer-conflicts strong {color:#ce4a59;font-weight:500;}
.cuigengji .transfer-conflicts p {font-size:11px;color:var(--cg-muted);}
.cuigengji .transfer-samples h4 {font-size:12px;font-weight:500;color:var(--cg-ink);margin:16px 0 8px;}
.cuigengji .transfer-samples pre {white-space:pre-wrap;overflow-wrap:anywhere;font:inherit;line-height:1.9;max-height:200px;overflow:auto;margin:0;background:none;padding:0;border:0;}
.cuigengji .transfer-complete {padding:24px 0 40px;max-width:600px;}
.cuigengji .transfer-complete-mark {display:grid;place-items:center;color:var(--cg-accent);background:var(--cg-wash);width:42px;height:42px;border-radius:50%;font-size:20px;margin-bottom:20px;}
.cuigengji .transfer-complete h3 {font-size:21px;font-weight:500;margin:0 0 12px;}
.cuigengji .transfer-complete p {font-size:12px;color:var(--cg-muted);}
.cuigengji .transfer-notice {color:var(--cg-accent);font-size:12px;margin:24px 0 0;}
.cuigengji .transfer-storage {margin-top:32px!important;}
.cuigengji .transfer-storage code {display:block;margin:14px 0;}
@container (max-width:740px) {
 .cuigengji .transfer-grid {grid-template-columns:minmax(0,1fr);gap:24px;}
 .cuigengji .transfer-summary {position:static;}
 .cuigengji .transfer-counts {grid-template-columns:repeat(4,minmax(0,1fr));}
 .cuigengji .transfer-import-options {grid-template-columns:minmax(0,1fr);gap:14px;}
}
@container (max-width:440px) {
 .cuigengji .management-page:has(.transfer-document) .management-header {grid-template-columns:minmax(0,1fr) auto;gap:10px;}
 .cuigengji .management-page:has(.transfer-document) .management-heading p {display:none;}
 .cuigengji .management-page:has(.transfer-document) .management-head-actions {justify-self:end;}
 .cuigengji .transfer-mode button {padding:7px 14px;}
 .cuigengji .transfer-upload {display:grid;grid-template-columns:32px minmax(0,1fr);padding:18px;gap:14px;}
 .cuigengji .transfer-upload-mark {width:32px;height:32px;}
 .cuigengji .transfer-upload .management-file-picker {grid-column:2;}
 .cuigengji .transfer-kinds {gap:6px;}
 .cuigengji .transfer-kinds button {padding:7px 12px;}
 .cuigengji .transfer-filter-pair {grid-template-columns:minmax(0,1fr);gap:0;}
 .cuigengji .transfer-footer {gap:12px;padding:12px 20px;}
 .cuigengji .transfer-footer>button {padding:9px 16px;}
 .cuigengji .transfer-counts {grid-template-columns:repeat(3,minmax(0,1fr));}
}
`;

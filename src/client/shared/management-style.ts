export const managementStyles = `
.cuigengji .management-page {display:flex;flex-direction:column;flex:1;min-height:0;overflow:hidden;-webkit-app-region:no-drag;animation:cg-arrive 150ms ease-out;}
.cuigengji .management-header {display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:12px 20px;padding:14px 24px 18px;border-bottom:1px solid var(--cg-line);flex:none;}
.cuigengji .management-back {grid-column:1/-1;justify-self:start;border:0;background:transparent;padding:2px 0;min-height:28px;font-size:12px;color:var(--cg-muted);}
.cuigengji .management-heading {min-width:0;}
.cuigengji .management-heading h2 {font-size:21px;line-height:1.4;margin:0;font-weight:600;}
.cuigengji .management-heading p {font-size:12px;line-height:1.7;margin:5px 0 0;color:var(--cg-muted);}
.cuigengji .management-head-actions {display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.cuigengji .management-scroll {flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;}
.cuigengji .management-document {width:100%;max-width:860px;margin:auto;padding:28px clamp(20px,4cqw,40px) 40px;}
.cuigengji .management-section {padding:24px 0;border-top:1px solid var(--cg-line);}
.cuigengji .management-section:first-child {border-top:0;padding-top:0;}
.cuigengji .management-section-heading {margin-bottom:18px;}
.cuigengji .management-section-heading h3 {font-size:14px;font-weight:600;margin:0;}
.cuigengji .management-section-heading p,.cuigengji .management-hint {font-size:12px;line-height:1.8;color:var(--cg-muted);margin:6px 0 0;}
.cuigengji .management-action-row {display:flex;align-items:center;gap:24px;justify-content:space-between;}
.cuigengji .management-action-row>div {min-width:0;flex:1;}
.cuigengji .management-action-row h3 {font-size:18px;margin:0 0 4px;font-weight:600;overflow-wrap:anywhere;}
.cuigengji .management-actions {display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-top:20px;}
.cuigengji .management-page .quiet {border-color:transparent;background:transparent;color:var(--cg-muted);}
.cuigengji .management-current-work {padding-bottom:18px;}
.cuigengji .management-current-work>button {flex:none;white-space:nowrap;}
.cuigengji .management-view-switch {display:flex;gap:4px;padding:3px;border:1px solid var(--cg-line);border-radius:9px;background:var(--cg-paper);}
.cuigengji .management-view-switch button {border:0;background:transparent;font-size:12px;white-space:nowrap;padding:6px 12px;min-height:32px;color:var(--cg-muted);}
.cuigengji .management-view-switch button[aria-pressed=true] {background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .management-trash-list {list-style:none;margin:0;padding:0;}
.cuigengji .management-trash-row {display:flex;align-items:center;justify-content:space-between;gap:20px;padding:20px 0;border-bottom:1px solid var(--cg-line);}
.cuigengji .management-trash-row:first-child {padding-top:0;}
.cuigengji .management-trash-copy {min-width:0;flex:1;}
.cuigengji .management-trash-copy h3 {font-size:16px;font-weight:500;margin:0;overflow-wrap:anywhere;line-height:1.6;}
.cuigengji .management-trash-copy p {font-size:11px;color:var(--cg-muted);margin:5px 0 0;}
.cuigengji .management-trash-actions {display:flex;align-items:center;gap:10px;flex-wrap:wrap;flex:none;}
.cuigengji .management-trash-actions button {display:inline-flex;align-items:center;gap:7px;white-space:nowrap;font-size:12px;}
.cuigengji .management-page .management-trash-actions .danger {color:var(--dsw-alias-state-error-primary,#bf443a);}
.cuigengji .management-trash-actions svg {width:16px;height:16px;border:0;border-radius:0;}
.cuigengji .management-trash-empty {display:flex;flex-direction:column;align-items:center;text-align:center;padding:52px 12px 64px;color:var(--cg-muted);}
.cuigengji .management-trash-empty svg {width:32px;height:32px;padding:0;border:0;border-radius:0;opacity:.65;}
.cuigengji .management-trash-empty p {font-size:14px;color:var(--cg-ink);margin:16px 0 8px;}
.cuigengji .management-trash-empty small {font-size:12px;line-height:1.8;max-width:280px;}
.cuigengji .management-action-link {display:flex;align-items:center;gap:20px;text-align:left;width:100%;padding:18px 0;border:0;border-top:1px solid var(--cg-line);border-radius:0;background:none;}
.cuigengji .management-action-link:first-child {border-top:0;}
.cuigengji .management-action-link>span:first-child {flex:1;min-width:0;}
.cuigengji .management-action-link strong {display:block;font-size:14px;font-weight:500;}
.cuigengji .management-action-link small {display:block;font-size:12px;line-height:1.7;margin-top:5px;color:var(--cg-muted);}
.cuigengji .management-action-link>span:last-child {font-size:22px;color:var(--cg-muted);}
.cuigengji .management-page .management-file-picker {position:relative;display:block;width:fit-content;max-width:100%;margin:0;border:1px solid var(--cg-line);border-radius:8px;background:var(--cg-paper);cursor:pointer;transition:background 120ms;}
.cuigengji .management-file-picker:hover {background:var(--cg-wash);}
.cuigengji .file-picker-label {display:flex;gap:14px;align-items:center;min-height:44px;padding:10px 16px;font-size:13px;}
.cuigengji .file-picker-label small {font-size:11px;color:var(--cg-muted);}
.cuigengji .file-picker-label>span {color:var(--cg-accent);font-size:18px;}
.cuigengji .management-file-picker input {position:absolute;inset:0;width:100%;height:100%;opacity:0;padding:0;cursor:pointer;}
.cuigengji .management-file-picker:has(input:focus-visible) {outline:2px solid var(--cg-accent);outline-offset:3px;}
.cuigengji .management-file-picker:has(input:disabled) {opacity:.5;cursor:default;}
.cuigengji .management-file-picker input:disabled {cursor:default;}
.cuigengji .management-file-name {font-size:12px;margin:12px 0;color:var(--cg-muted);overflow-wrap:anywhere;}
.cuigengji .management-import-steps {display:flex;gap:22px;padding:0;margin:0 0 24px;list-style:none;flex-wrap:wrap;}
.cuigengji .management-import-steps li {display:flex;align-items:center;gap:8px;font-size:12px;color:var(--cg-muted);}
.cuigengji .management-import-steps li>span {display:grid;place-items:center;width:22px;height:22px;border:1px solid var(--cg-line);border-radius:50%;font-size:11px;}
.cuigengji .management-import-steps li.reached {color:var(--cg-accent);}
.cuigengji .management-import-steps li.reached>span {border-color:transparent;background:var(--cg-wash);}
.cuigengji .management-preview {margin-top:24px;padding:22px 24px;background:var(--cg-wash);border-radius:10px;}
.cuigengji .management-preview h3 {margin:0;font-size:17px;overflow-wrap:anywhere;}
.cuigengji .management-counts {display:flex;flex-wrap:wrap;gap:16px 32px;margin:18px 0;}
.cuigengji .management-counts>div {display:flex;flex-direction:column-reverse;gap:5px;}
.cuigengji .management-counts dt {font-size:11px;color:var(--cg-muted);}
.cuigengji .management-counts dd {margin:0;font-size:22px;line-height:1.3;font-variant-numeric:tabular-nums;}
.cuigengji .management-result {margin-top:20px;padding:14px 16px;background:var(--cg-wash);border-radius:8px;font-size:13px;line-height:1.8;overflow-wrap:anywhere;}
.cuigengji .management-result button {margin-left:12px;}
.cuigengji .management-page .management-disclosure {margin-top:24px;border-top:1px solid var(--cg-line);padding-top:10px;font-size:12px;color:var(--cg-muted);}
.cuigengji .management-disclosure>summary {font-size:12px;font-weight:500;}
.cuigengji .management-disclosure>p {font-size:12px;line-height:1.8;}
.cuigengji .management-disclosure pre {border:0;background:var(--cg-wash);padding:18px;margin:12px 0;max-height:400px;}
.cuigengji .management-page .management-field {display:grid;gap:8px;margin:16px 0;font-size:12px;}
.cuigengji .management-field input {width:100%;}
.cuigengji .management-page .switch-control {display:flex;align-items:center;gap:8px;margin:0;font-size:12px;white-space:nowrap;}
.cuigengji .switch-control input {appearance:none;position:relative;display:block;width:32px;height:18px;border-radius:20px;padding:0;border:0;background:var(--cg-line);cursor:pointer;flex:none;transition:background 120ms;}
.cuigengji .switch-control input:checked {background:var(--cg-accent);}
.cuigengji .switch-control input::before {content:'';position:absolute;width:14px;height:14px;top:2px;left:2px;background:var(--cg-paper);border-radius:50%;box-shadow:0 1px 3px #0002;transition:transform 120ms;}
.cuigengji .switch-control input:checked::before {transform:translateX(14px);}
.cuigengji .management-footer {flex:none;border-top:1px solid var(--cg-line);background:var(--cg-paper);}
.cuigengji .management-footer .savebar {max-width:940px;margin:auto;border:0;box-shadow:none;padding:14px 24px;gap:16px;}
.cuigengji .preset-management {max-width:1020px;}
.cuigengji .preset-workspace {display:grid;grid-template-columns:200px minmax(0,1fr);gap:32px;align-items:start;}
.cuigengji .preset-workspace .preset-list {width:auto;position:sticky;top:0;margin:0;max-height:60dvh;overflow:auto;}
.cuigengji .preset-list-heading {display:flex;gap:8px;justify-content:space-between;align-items:center;padding:0 4px 10px;}
.cuigengji .preset-list-heading h3 {margin:0;font-size:12px;font-weight:500;color:var(--cg-muted);}
.cuigengji .preset-list-heading button {border:0;background:none;width:auto;flex:none;min-width:32px;min-height:32px;text-align:center;padding:3px 8px;color:var(--cg-accent);font-size:20px;}
.cuigengji .preset-workspace .preset-list>button {border:0;border-radius:7px;padding:12px;margin:2px 0;font-size:13px;font-weight:400;}
.cuigengji .preset-list>button .prompt-list-title {display:flex;gap:8px;align-items:baseline;overflow-wrap:anywhere;}
.cuigengji .prompt-list-title>span {font-size:11px;font-variant-numeric:tabular-nums;color:var(--cg-muted);}
.cuigengji .preset-list>button small {display:block;padding-left:18px;margin-top:5px;font-size:10px;color:var(--cg-muted);}
.cuigengji .preset-workspace .preset-list>button.selected {background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .preset-review-filter {display:flex!important;gap:6px;align-items:center;font-size:11px!important;margin:12px 4px!important;color:var(--cg-muted);}
.cuigengji .preset-empty {font-size:13px;line-height:1.8;color:var(--cg-muted);padding:24px 0;}
.cuigengji .prompt-document {min-width:0;}
.cuigengji .prompt-document-head {display:flex;align-items:center;gap:12px;margin-bottom:20px;}
.cuigengji .prompt-document-head>label:first-child {flex:1;min-width:0;}
.cuigengji .prompt-document-head .menu summary {min-width:30px;text-align:center;}
.cuigengji .management-page .prompt-title-field {display:grid;gap:7px;font-size:11px;color:var(--cg-muted);margin:0;}
.cuigengji .prompt-title-field input {font-size:20px;line-height:1.5;padding:4px 0;border:0;border-radius:0;width:100%;color:var(--cg-ink);background:transparent;}
.cuigengji .management-page .prompt-content-field {display:block;margin:0;}
.cuigengji .prompt-content-field>span {display:block;font-size:11px;color:var(--cg-muted);margin-bottom:10px;}
.cuigengji .prompt-content-field textarea {min-height:340px;height:48dvh;resize:vertical;line-height:1.9;padding:12px 0;border:0;border-radius:0;background:transparent;font-size:14px;}
.cuigengji .prompt-document>.notice {font-size:12px;margin:0 0 16px;}
.cuigengji .prompt-list-back {display:none;border:0;background:none;padding:0;font-size:12px;color:var(--cg-muted);margin-bottom:18px;}
.cuigengji .preset-import-panel {margin-bottom:28px;padding:20px 24px;background:var(--cg-wash);border-radius:10px;}
.cuigengji .preset-import-panel h3 {font-size:14px;margin:0 0 8px;}
.cuigengji .preset-import-panel .management-preview {padding:0;background:none;}
.cuigengji .work-data-library {list-style:none;margin:16px 0 0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:4px 24px;max-height:220px;overflow:auto;}
.cuigengji .work-data-library li {display:flex;align-items:center;gap:10px;padding:10px 0;font-size:13px;min-width:0;overflow-wrap:anywhere;}
.cuigengji .work-data-library li>span:last-child {min-width:0;}
.cuigengji .work-data-library small {color:var(--cg-muted);font-size:11px;margin-left:8px;}
.cuigengji .work-data-path {display:block;overflow-wrap:anywhere;white-space:normal;font-size:12px;line-height:1.8;user-select:text;margin:8px 0 16px;}
.cuigengji .work-data-conflicts {margin-top:18px;color:var(--cg-ink);font-size:12px;line-height:1.8;}
.cuigengji .preset-onboarding {padding:48px 20px 52px;text-align:center;max-width:440px;margin:auto;}
.cuigengji .preset-onboarding>span {display:grid;place-items:center;margin:auto;width:48px;height:48px;background:var(--cg-wash);color:var(--cg-accent);border-radius:14px;}
.cuigengji .preset-onboarding h3 {font-size:20px;font-weight:500;margin:20px 0 12px;}
.cuigengji .preset-onboarding p {font-size:12px;color:var(--cg-muted);line-height:1.9;}
.cuigengji .preset-onboarding>button {font-size:12px;margin-top:16px;padding-inline:20px;}
@container(max-width:599px) {
 .cuigengji .management-trash-row {flex-wrap:wrap;gap:12px;}
 .cuigengji .management-trash-copy {flex-basis:100%;}
 .cuigengji .management-header {padding:12px 20px 16px;grid-template-columns:1fr;gap:10px;}
 .cuigengji .management-heading h2 {font-size:19px;}
 .cuigengji .management-head-actions {justify-content:space-between;}
 .cuigengji .management-document {padding:22px 20px 32px;}
 .cuigengji .management-action-row {align-items:flex-start;gap:12px;}
 .cuigengji .management-section {padding:22px 0;}
 .cuigengji .management-preview,.cuigengji .preset-import-panel {padding:18px;}
 .cuigengji .management-import-steps {gap:12px;}
 .cuigengji .management-import-steps li {gap:5px;font-size:11px;}
 .cuigengji .management-footer .savebar {padding:12px 20px;}
 .cuigengji .preset-workspace {display:block;}
 .cuigengji .preset-workspace .preset-list {position:static;max-height:none;width:100%;}
 .cuigengji .preset-workspace .preset-list.is-selected {display:none;}
 .cuigengji .prompt-list-back {display:inline-flex;}
 .cuigengji .prompt-document-head {gap:8px;flex-wrap:wrap;}
 .cuigengji .prompt-document-head>label:first-child {flex-basis:100%;}
 .cuigengji .prompt-document-head .menu {margin-left:auto;}
 .cuigengji .prompt-content-field textarea {min-height:320px;}
 .cuigengji .prompt-document.preset-empty {display:none;}
}
`;

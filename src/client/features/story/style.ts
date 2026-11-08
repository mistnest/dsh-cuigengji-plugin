export const storyStyles=`
.cuigengji .story-workspace {display:flex;flex-direction:column;min-height:0;flex:1;height:100%;}
.cuigengji .story-workspace-heading {display:flex;align-items:flex-end;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:14px 18px 10px;}
.cuigengji .story-workspace-heading h2 {margin:2px 0 0;font-size:20px;font-weight:600;}
.cuigengji .story-workspace-heading h2:focus-visible {outline:2px solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#4d6bfe));outline-offset:3px;}
.cuigengji .story-eyebrow {font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-muted {margin:0;font-size:12px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-sections {display:flex;flex-wrap:wrap;gap:4px;padding:0 18px 12px;border-bottom:1px solid var(--dsw-alias-border-l1,#8883);}
.cuigengji .story-sections button {min-height:32px;padding:5px 12px;border:1px solid transparent;border-radius:8px;background:transparent;font-size:13px;}
.cuigengji .story-sections button[aria-pressed=true] {border-color:var(--dsw-alias-border-l1,#8883);background:var(--dsw-alias-bg-layer-1,#fff);font-weight:600;}
.cuigengji .story-nav-count {display:inline-block;margin-left:6px;padding:0 6px;border-radius:999px;background:var(--dsw-alias-state-error-primary,#d92d20);color:#fff;font-size:11px;line-height:16px;}
.cuigengji .story-scroll {flex:1;min-height:0;overflow:auto;padding:18px;scrollbar-gutter:stable;}
.cuigengji .story-overview,.cuigengji .story-thread-workspace,.cuigengji .story-review-workspace {display:flex;flex-direction:column;gap:16px;max-width:1080px;}
.cuigengji .story-section-heading {display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.cuigengji .story-section-heading h2,.cuigengji .story-section-heading h3 {margin:0 0 4px;font-size:16px;font-weight:600;}
.cuigengji .story-section-heading h2 {font-size:19px;}
.cuigengji .story-section-heading p {margin:0;font-size:13px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-panel {display:flex;flex-direction:column;gap:12px;padding:16px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);}
.cuigengji .story-metrics {display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;}
.cuigengji .story-metrics>div {display:flex;flex-direction:column;gap:4px;padding:12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:10px;background:var(--dsw-alias-bg-layer-1,#fff);}
.cuigengji .story-metrics strong {font-size:22px;line-height:1.1;font-variant-numeric:tabular-nums;}
.cuigengji .story-metrics strong small {font-size:12px;font-weight:400;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-metrics span {font-size:12px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-metrics progress {width:100%;height:4px;border:0;border-radius:999px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 8%,transparent);}
.cuigengji .story-metrics progress::-webkit-progress-bar {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 8%,transparent);border-radius:999px;}
.cuigengji .story-metrics progress::-webkit-progress-value {background:var(--dsw-alias-state-business-primary,#4d6bfe);border-radius:999px;}
.cuigengji .story-metrics progress::-moz-progress-bar {background:var(--dsw-alias-state-business-primary,#4d6bfe);border-radius:999px;}
.cuigengji .story-metrics button,.cuigengji .story-next-step button {align-self:flex-start;min-height:26px;padding:2px 0;border:0;background:transparent;font-size:12px;color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-error-text {color:var(--dsw-alias-state-error-primary,#d92d20);}
.cuigengji .story-stage-map {display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:0;padding:0;list-style:none;}
.cuigengji .story-stage-map li {display:flex;}
.cuigengji .story-stage-map button {flex:1;display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:10px;background:transparent;text-align:left;}
.cuigengji .story-stage-map button>span {font-size:11px;color:var(--dsw-alias-label-secondary,#737780);font-variant-numeric:tabular-nums;}
.cuigengji .story-stage-map button>strong {font-size:13px;font-weight:600;}
.cuigengji .story-stage-map button>small {font-size:11px;color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-stage-map li[data-complete] button {border-color:color-mix(in srgb,var(--dsw-alias-state-success-primary,#12805c) 45%,transparent);}
.cuigengji .story-stage-map button[aria-current=step] {border-color:var(--dsw-alias-state-business-primary,#4d6bfe);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 10%,transparent);}
.cuigengji .story-next-step {padding:12px;border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 4%,transparent);}
.cuigengji .story-next-step p {margin:4px 0 8px;font-size:13px;line-height:1.6;}
.cuigengji .story-inline-field {display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-inline-field select {padding:4px 6px;font-size:12px;}
.cuigengji .story-brief-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));}
.cuigengji .story-field-grid {display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;}
.cuigengji .story-draft-footer {display:flex;flex-direction:column;gap:10px;}
.cuigengji .story-reset {align-self:flex-start;border:0;background:transparent;font-size:12px;color:var(--dsw-alias-label-secondary,#737780);text-decoration:underline;}
.cuigengji .story-latest {margin-top:6px;padding:10px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 4%,transparent);font-size:12px;line-height:1.6;}
.cuigengji .story-latest p {margin:0 0 4px;}
.cuigengji .story-detail-list {display:grid;grid-template-columns:minmax(88px,auto) 1fr;gap:4px 12px;margin:0;font-size:12px;}
.cuigengji .story-detail-list dt {color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-detail-list dd {margin:0;white-space:pre-wrap;}
.cuigengji .story-badge {display:inline-flex;align-items:center;padding:1px 8px;border-radius:999px;font-size:11px;line-height:18px;white-space:nowrap;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 8%,transparent);color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-tone-brand {background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 14%,transparent);color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-tone-warning {background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 16%,transparent);color:var(--dsw-alias-state-warn-primary,#b25e09);}
.cuigengji .story-tone-error {background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 14%,transparent);color:var(--dsw-alias-state-error-primary,#d92d20);}
.cuigengji .story-tone-success {background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#12805c) 14%,transparent);color:var(--dsw-alias-state-success-primary,#12805c);}
.cuigengji .story-alert {margin:0;padding:10px 12px;border-radius:8px;border:1px solid var(--dsw-alias-border-l1,#8883);font-size:13px;line-height:1.6;}
.cuigengji .story-alert p {margin:0 0 6px;}
.cuigengji .story-error {border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 40%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 8%,transparent);}
.cuigengji .story-warning {padding:10px 12px;border-radius:8px;border:1px solid color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 40%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 8%,transparent);font-size:13px;line-height:1.6;}
.cuigengji .story-warning p {margin:0 0 8px;}
.cuigengji .story-save-notice {margin:0;font-size:12px;color:var(--dsw-alias-state-success-primary,#12805c);}
.cuigengji .story-chapter-layout {display:grid;grid-template-columns:minmax(180px,240px) minmax(0,1fr);gap:16px;min-height:0;align-items:start;}
.cuigengji .story-chapter-directory {position:sticky;top:0;display:flex;flex-direction:column;gap:8px;padding-right:12px;border-right:1px solid var(--dsw-alias-border-l1,#8883);max-height:100%;overflow:auto;}
.cuigengji .story-chapter-directory h2 {margin:0;font-size:13px;font-weight:600;}
.cuigengji .story-chapter-directory ul {margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:2px;}
.cuigengji .story-chapter-directory button {width:100%;display:flex;gap:8px;align-items:flex-start;padding:7px 8px;border:1px solid transparent;border-radius:8px;background:transparent;text-align:left;}
.cuigengji .story-chapter-directory button[aria-pressed=true] {border-color:var(--dsw-alias-border-l1,#8883);background:var(--dsw-alias-bg-layer-1,#fff);}
.cuigengji .story-chapter-directory button>span:last-child {display:flex;flex-direction:column;gap:2px;min-width:0;}
.cuigengji .story-chapter-directory strong {font-size:13px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .story-chapter-directory small {font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-chapter-number {flex:none;min-width:20px;font-size:11px;line-height:20px;text-align:center;color:var(--dsw-alias-label-secondary,#737780);font-variant-numeric:tabular-nums;}
.cuigengji .story-chapter-detail {display:flex;flex-direction:column;gap:12px;min-width:0;}
.cuigengji .story-segmented {align-self:flex-start;}
.cuigengji .story-character-picker {display:flex;flex-wrap:wrap;gap:8px 14px;margin:0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:8px;}
.cuigengji .story-character-picker legend {padding:0 4px;font-size:12px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-character-picker label {display:inline-flex;align-items:center;gap:6px;font-size:13px;}
.cuigengji .story-item-editor {max-width:880px;}
.cuigengji .story-back {min-height:24px;padding:0;border:0;background:transparent;font-size:12px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-thread-board {display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;align-items:start;}
.cuigengji .story-thread-column {display:flex;flex-direction:column;gap:10px;padding:12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);}
.cuigengji .story-thread-column>header {display:flex;flex-direction:column;gap:6px;}
.cuigengji .story-thread-column h3 {margin:0;font-size:14px;font-weight:600;display:flex;align-items:center;gap:6px;}
.cuigengji .story-thread-column h3 span {font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary,#737780);font-variant-numeric:tabular-nums;}
.cuigengji .story-thread-column header p {margin:0;font-size:12px;line-height:1.5;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-thread-column header button {align-self:flex-start;min-height:28px;padding:3px 8px;font-size:12px;}
.cuigengji .story-thread-cards {display:flex;flex-direction:column;gap:8px;}
.cuigengji .story-thread-card {display:flex;flex-direction:column;gap:6px;padding:10px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:10px;background:var(--dsw-alias-bg-base,#fff);}
.cuigengji .story-card-flags {display:flex;flex-wrap:wrap;gap:4px;}
.cuigengji .story-card-title {min-height:0;padding:0;border:0;background:transparent;text-align:left;font-size:13px;font-weight:600;line-height:1.45;}
.cuigengji .story-card-title:hover {text-decoration:underline;}
.cuigengji .story-card-copy {margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-primary,#252936);white-space:pre-wrap;word-break:break-word;}
.cuigengji .story-card-copy strong {display:block;margin-bottom:2px;font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-card-source {display:grid;grid-template-columns:auto 1fr;gap:2px 8px;margin:0;font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-card-source dt {font-weight:600;}
.cuigengji .story-card-source dd {margin:0;}
.cuigengji .story-card-source button {min-height:0;padding:0;border:0;background:transparent;font-size:11px;color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-card-status {display:flex;align-items:center;gap:6px;font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-card-status select {padding:2px 4px;font-size:12px;}
.cuigengji .story-column-empty {margin:0;padding:8px 0;font-size:12px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-empty {display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:28px 16px;border:1px dashed var(--dsw-alias-border-l1,#8883);border-radius:12px;max-width:560px;}
.cuigengji .story-empty h2,.cuigengji .story-empty h3 {margin:0;font-size:16px;}
.cuigengji .story-empty p {margin:0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-review-filters {display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;font-size:12px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-review-filters label {display:flex;align-items:center;gap:6px;}
.cuigengji .story-review-filters select {padding:3px 6px;font-size:12px;}
.cuigengji .story-check {display:inline-flex;align-items:center;gap:6px;}
.cuigengji .story-review-list {display:flex;flex-direction:column;gap:10px;}
.cuigengji .story-review-card {display:flex;flex-direction:column;gap:8px;padding:14px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);}
.cuigengji .story-review-anchor {display:flex;flex-wrap:wrap;gap:4px 12px;align-items:center;font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-review-anchor button {min-height:0;padding:0;border:0;background:transparent;font-size:11px;color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-evidence {margin:0;padding:8px 12px;border-left:3px solid color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 20%,transparent);border-radius:0 8px 8px 0;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 4%,transparent);font-size:12px;line-height:1.65;}
.cuigengji .story-evidence span {display:block;margin-bottom:2px;font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-evidence p {margin:0;white-space:pre-wrap;word-break:break-word;}
.cuigengji .story-source-note {margin:0;padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 4%,transparent);font-size:12px;line-height:1.6;}
.cuigengji .story-source-note p {margin:0 0 6px;}
.cuigengji .story-review-actions {display:flex;flex-wrap:wrap;gap:10px;align-items:center;}
.cuigengji .story-review-actions label {display:flex;align-items:center;gap:6px;font-size:12px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-review-actions select {padding:3px 6px;font-size:12px;}
.cuigengji .story-review-actions button {min-height:28px;padding:3px 10px;font-size:12px;}
.cuigengji .story-chapter-directory::-webkit-scrollbar,.cuigengji .story-scroll::-webkit-scrollbar {width:10px;}
@container(max-width:759px) {
 .cuigengji .story-scroll {padding:12px;}
 .cuigengji .story-workspace-heading {padding:12px 12px 8px;}
 .cuigengji .story-sections {padding:0 12px 10px;}
 .cuigengji .story-chapter-layout {grid-template-columns:1fr;}
 .cuigengji .story-chapter-directory {position:static;max-height:none;border-right:0;border-bottom:1px solid var(--dsw-alias-border-l1,#8883);padding:0 0 10px;}
 .cuigengji .story-chapter-directory ul {flex-direction:row;overflow-x:auto;gap:6px;padding-bottom:4px;}
 .cuigengji .story-chapter-directory li {flex:none;}
 .cuigengji .story-chapter-directory button {width:auto;max-width:180px;}
 .cuigengji .story-thread-board {grid-template-columns:1fr;}
 .cuigengji .story-metrics {grid-template-columns:repeat(auto-fit,minmax(130px,1fr));}
}
`;

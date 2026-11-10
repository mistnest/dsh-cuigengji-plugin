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
.cuigengji .story-visual-stack {display:flex;flex-direction:column;gap:20px;}
.cuigengji .story-figure {display:flex;flex-direction:column;gap:10px;padding:14px 16px 12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);}
.cuigengji .story-figure-heading {display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.cuigengji .story-figure-heading h3 {margin:0 0 3px;font-size:14px;font-weight:600;}
.cuigengji .story-figure-heading p {margin:0;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#737780);max-width:62em;}
.cuigengji .story-figure-empty {margin:0;padding:14px 0;font-size:12px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-legend {display:flex;flex-wrap:wrap;gap:6px 14px;margin:0;padding:0;list-style:none;font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-legend li {display:inline-flex;align-items:center;gap:5px;}
.cuigengji .story-legend-line {width:18px;height:0;border-top:2px solid var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-legend-line.tone-resolved {border-top-color:var(--dsw-alias-state-success-primary,#12805c);}
.cuigengji .story-legend-line.tone-open {border-top-style:dashed;}
.cuigengji .story-legend-line.tone-stale {border-top-style:dotted;border-top-color:var(--dsw-alias-state-warn-primary,#b25e09);}
.cuigengji .story-legend-dot {width:7px;height:7px;border-radius:50%;background:var(--dsw-alias-state-error-primary,#d92d20);}
.cuigengji .story-legend-square {width:10px;height:10px;border-radius:3px;}
.cuigengji .story-legend-square.tone-ok {background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#12805c) 26%,transparent);}
.cuigengji .story-legend-square.tone-warn {background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 26%,transparent);}
.cuigengji .story-legend-square.tone-bad {background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 24%,transparent);}
.cuigengji .story-timeline-scroll {overflow-x:auto;overflow-y:hidden;padding-bottom:4px;}
.cuigengji .story-timeline {display:block;overflow:visible;font-family:inherit;}
.cuigengji .story-timeline text {font-size:10px;fill:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-timeline-grid line {stroke:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 10%,transparent);stroke-dasharray:2 4;}
.cuigengji .story-timeline-lanes rect {fill:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 2.5%,transparent);}
.cuigengji .story-timeline-lanes text {font-size:11px;font-weight:600;fill:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-timeline-row .story-timeline-hit {fill:transparent;}
.cuigengji .story-timeline-row[data-active] .story-timeline-hit {fill:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 7%,transparent);}
.cuigengji .story-timeline-row .story-timeline-label {font-size:11px;fill:var(--dsw-alias-label-primary,#252936);paint-order:stroke;stroke:var(--dsw-alias-bg-layer-1,#fff);stroke-width:3px;stroke-linejoin:round;}
.cuigengji .story-timeline-link {stroke-width:2;stroke-linecap:round;stroke:var(--dsw-alias-state-business-primary,#4d6bfe);stroke-dasharray:5 4;}
.cuigengji .story-timeline-node {fill:var(--dsw-alias-bg-layer-1,#fff);stroke:var(--dsw-alias-state-business-primary,#4d6bfe);stroke-width:2;}
.cuigengji .story-timeline-row.tone-resolved .story-timeline-link {stroke:var(--dsw-alias-state-success-primary,#12805c);stroke-dasharray:none;}
.cuigengji .story-timeline-row.tone-resolved .story-timeline-node {stroke:var(--dsw-alias-state-success-primary,#12805c);fill:var(--dsw-alias-state-success-primary,#12805c);}
.cuigengji .story-timeline-row.tone-stale .story-timeline-link {stroke:var(--dsw-alias-state-warn-primary,#b25e09);stroke-dasharray:3 3;}
.cuigengji .story-timeline-row.tone-stale .story-timeline-node {stroke:var(--dsw-alias-state-warn-primary,#b25e09);}
.cuigengji .story-timeline-row .story-timeline-node.is-due {fill:var(--dsw-alias-state-error-primary,#d92d20);stroke:var(--dsw-alias-state-error-primary,#d92d20);r:5;}
.cuigengji .story-timeline-due-label {font-size:10px!important;fill:var(--dsw-alias-state-error-primary,#d92d20)!important;font-weight:600;}
.cuigengji .story-timeline-row.tone-resolved .story-timeline-node.is-verified {fill:var(--dsw-alias-state-success-primary,#12805c);stroke:var(--dsw-alias-state-success-primary,#12805c);}
.cuigengji .story-timeline-unsourced {fill:var(--dsw-alias-label-secondary,#737780)!important;font-style:italic;}
.cuigengji .story-timeline-row[data-active] .story-timeline-label {font-weight:600;fill:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-timeline-jump {fill:transparent;cursor:pointer;}
.cuigengji .story-timeline-jump:hover {fill:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 16%,transparent);}
.cuigengji .story-timeline-tick {font-size:10px;paint-order:stroke;stroke:var(--dsw-alias-bg-layer-1,#fff);stroke-width:3px;stroke-linejoin:round;}
.cuigengji .story-timeline-detail {display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:4px 16px;margin:0;padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 4%,transparent);font-size:12px;}
.cuigengji .story-timeline-detail div {min-width:0;}
.cuigengji .story-timeline-detail dt {font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-timeline-detail dd {margin:0;overflow:hidden;text-overflow:ellipsis;}
.cuigengji .story-timeline-detail button {min-height:0;padding:0;border:0;background:transparent;font-size:12px;color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-matrix-scroll {overflow-x:auto;max-height:min(60vh,520px);overflow-y:auto;}
.cuigengji .story-matrix {border-collapse:separate;border-spacing:0;width:100%;font-size:12px;}
.cuigengji .story-matrix th,.cuigengji .story-matrix td {padding:2px 3px;text-align:left;font-weight:400;}
.cuigengji .story-matrix thead th {position:sticky;top:0;z-index:1;background:var(--dsw-alias-bg-layer-1,#fff);font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary,#737780);white-space:nowrap;}
.cuigengji .story-matrix-chapter {min-width:160px;}
.cuigengji .story-matrix-state {min-width:64px;}
.cuigengji .story-matrix tbody th button {display:flex;align-items:center;gap:6px;width:100%;min-height:26px;padding:3px 6px;border:1px solid transparent;border-radius:6px;background:transparent;font-size:12px;text-align:left;}
.cuigengji .story-matrix tbody th button:hover {border-color:var(--dsw-alias-border-l1,#8883);}
.cuigengji .story-matrix tr[data-selected] tbody th button,.cuigengji .story-matrix tbody tr[data-selected] th button {border-color:var(--dsw-alias-state-business-primary,#4d6bfe);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 8%,transparent);}
.cuigengji .story-matrix-cell {width:100%;min-height:24px;padding:2px 6px;border:0;border-radius:6px;font-size:11px;white-space:nowrap;text-align:left;background:transparent;color:var(--dsw-alias-label-primary,#252936);}
.cuigengji .story-matrix-cell:hover {outline:1px solid var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-matrix-cell.tone-ok {background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#12805c) 12%,transparent);}
.cuigengji .story-matrix-cell.tone-warn {background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 16%,transparent);color:var(--dsw-alias-state-warn-primary,#b25e09);}
.cuigengji .story-matrix-cell.tone-bad {background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 14%,transparent);color:var(--dsw-alias-state-error-primary,#d92d20);font-weight:600;}
.cuigengji .story-matrix-cell.tone-idle {color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-context {display:flex;flex-direction:column;gap:14px;max-width:1180px;}
.cuigengji .story-context-controls {display:flex;flex-wrap:wrap;gap:10px 18px;align-items:center;}
.cuigengji .story-context-open {min-height:26px;padding:2px 0;border:0;background:transparent;font-size:12px;color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-context-budget {display:flex;flex-direction:column;gap:6px;padding:12px 14px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);}
.cuigengji .story-context-bar {height:8px;border-radius:999px;overflow:hidden;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 8%,transparent);}
.cuigengji .story-context-bar i {display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,var(--dsw-alias-state-business-primary,#4d6bfe),color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 60%,var(--dsw-alias-state-success-primary,#12805c)));transition:width .2s ease;}
.cuigengji .story-context-budget p {margin:0;font-size:12px;color:var(--dsw-alias-label-secondary,#737780);font-variant-numeric:tabular-nums;}
.cuigengji .story-context-legend {display:flex;flex-wrap:wrap;gap:6px 16px;margin:0;padding:0;list-style:none;font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-context-key {display:inline-block;width:10px;height:10px;margin-right:5px;border-radius:3px;vertical-align:-1px;}
.cuigengji .story-context-key.tone-fact {background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#12805c) 30%,transparent);}
.cuigengji .story-context-key.tone-plan {background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 30%,transparent);}
.cuigengji .story-context-key.tone-omitted {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 16%,transparent);}
.cuigengji .story-context-columns {display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px;align-items:start;}
.cuigengji .story-context-column {display:flex;flex-direction:column;gap:8px;padding:12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);min-width:0;}
.cuigengji .story-context-column h3 {margin:0;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:space-between;gap:6px;}
.cuigengji .story-context-column h3 span,.cuigengji .story-context-column h3 small {font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-context-item {display:flex;flex-direction:column;gap:4px;padding:9px 10px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:10px;background:var(--dsw-alias-bg-base,#fff);}
.cuigengji .story-context-item header {display:flex;flex-wrap:wrap;align-items:center;gap:6px;}
.cuigengji .story-context-item header strong {font-size:12px;font-weight:600;line-height:1.4;}
.cuigengji .story-context-item p {margin:0;max-height:160px;overflow:auto;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-word;}
.cuigengji .story-context-link {align-self:flex-start;min-height:0;padding:0;border:0;background:transparent;font-size:11px;color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-context-omitted details {border-top:1px solid var(--dsw-alias-border-l1,#8883);padding-top:6px;}
.cuigengji .story-context-omitted summary {display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:12px;cursor:pointer;}
.cuigengji .story-context-omitted summary span {color:var(--dsw-alias-label-secondary,#737780);font-variant-numeric:tabular-nums;}
.cuigengji .story-context-omitted ul {margin:4px 0 8px;padding-left:18px;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-context-omitted details p {margin:4px 0;}
.cuigengji .story-unit-workspace {gap:16px;}
.cuigengji .story-unit-tree {display:flex;flex-direction:column;gap:10px;min-width:0;}
.cuigengji .story-unit-volume {display:flex;flex-direction:column;gap:8px;min-width:0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:12px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 2.5%,transparent);}
.cuigengji .story-unit-volume>header {display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;}
.cuigengji .story-unit-volume>header button {min-height:28px;padding:3px 8px;font-size:12px;}
.cuigengji .story-unit-volume-toggle {display:inline-flex;align-items:center;gap:6px;border:0;background:transparent;font-size:14px;font-weight:600;text-align:left;}
.cuigengji .story-unit-volume-toggle.is-static {min-height:28px;padding:3px 8px;font-size:14px;font-weight:600;color:var(--dsw-alias-label-primary,#252936);}
.cuigengji .story-unit-volume-toggle small {margin-left:4px;font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary,#737780);font-variant-numeric:tabular-nums;}
.cuigengji .story-unit-list {display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:10px;align-items:start;min-width:0;}
.cuigengji .story-unit-card {display:flex;flex-direction:column;gap:6px;min-width:0;padding:10px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:10px;background:var(--dsw-alias-bg-base,#fff);}
.cuigengji .story-unit-card.is-overdue {border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 45%,transparent);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 5%,var(--dsw-alias-bg-base,#fff));}
.cuigengji .story-unit-card-head {display:flex;align-items:baseline;gap:8px;min-width:0;}
.cuigengji .story-unit-card-head .story-card-title {min-width:0;overflow-wrap:anywhere;}
.cuigengji .story-unit-order {flex:none;padding:0 6px;border-radius:6px;font-size:11px;line-height:18px;font-variant-numeric:tabular-nums;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 8%,transparent);color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-unit-meta {margin:0;font-size:11px;line-height:1.6;color:var(--dsw-alias-label-secondary,#737780);overflow-wrap:anywhere;}
.cuigengji .story-unit-overdue {margin:0;padding:6px 8px;border-radius:8px;font-size:12px;line-height:1.6;background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 10%,transparent);color:var(--dsw-alias-state-error-primary,#d92d20);}
.cuigengji .story-unit-contract {display:grid;grid-template-columns:1fr;gap:2px;margin:0;padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 4%,transparent);font-size:12px;}
.cuigengji .story-unit-contract div {display:grid;grid-template-columns:minmax(64px,auto) 1fr;gap:8px;min-width:0;}
.cuigengji .story-unit-contract dt {color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-unit-contract dd {margin:0;white-space:pre-wrap;overflow-wrap:anywhere;}
.cuigengji .story-unit-card-actions {display:flex;flex-wrap:wrap;gap:6px;}
.cuigengji .story-unit-card-actions button {min-height:26px;padding:2px 8px;font-size:12px;}
.cuigengji .story-unit-card-actions .story-unit-danger {border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 40%,transparent);color:var(--dsw-alias-state-error-primary,#d92d20);}
.cuigengji .story-unit-chip {max-width:11em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .story-unit-chapters {display:flex;flex-wrap:wrap;gap:6px;grid-column:1/-1;align-items:center;font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-unit-chapters strong {font-size:11px;font-weight:600;}
.cuigengji .story-unit-chapters button {display:inline-flex;flex-direction:column;align-items:flex-start;gap:0;max-width:100%;min-height:26px;padding:2px 8px;border:1px dashed var(--dsw-alias-border-l1,#8883);border-radius:8px;background:transparent;font-size:12px;text-align:left;}
.cuigengji .story-unit-chapters button.is-hooked {border-style:solid;background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 8%,transparent);}
.cuigengji .story-unit-chapters button small {font-size:10px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-unit-matrix {width:max-content;min-width:100%;}
.cuigengji .story-unit-matrix-line {min-width:150px;}
.cuigengji .story-unit-matrix-carry {min-width:86px;}
.cuigengji .story-unit-matrix thead th:not(:first-child):not(:nth-child(2)) {min-width:92px;max-width:120px;vertical-align:bottom;}
.cuigengji .story-unit-matrix-head {display:flex;flex-direction:column;gap:1px;width:100%;min-height:24px;padding:2px 4px;border:1px solid transparent;border-radius:6px;background:transparent;font-size:11px;line-height:1.35;text-align:left;white-space:normal;overflow-wrap:anywhere;}
.cuigengji .story-unit-matrix-head:hover {border-color:var(--dsw-alias-border-l1,#8883);}
.cuigengji .story-unit-matrix thead th[data-selected] .story-unit-matrix-head {border-color:var(--dsw-alias-state-business-primary,#4d6bfe);background:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 8%,transparent);}
.cuigengji .story-unit-matrix-code {font-size:10px;color:var(--dsw-alias-label-secondary,#737780);font-variant-numeric:tabular-nums;}
.cuigengji .story-unit-matrix-kind {display:block;font-size:10px;line-height:1.4;color:var(--dsw-alias-label-secondary,#737780);overflow-wrap:anywhere;}
.cuigengji .story-unit-matrix td .story-matrix-cell {min-width:44px;text-align:center;}
/* A line that can carry a chapter highlights its whole row so a stalled main plot has a visible fallback. */
.cuigengji .story-unit-matrix td.is-carry {background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 6%,transparent);}
.cuigengji .story-unit-field {width:100%;box-sizing:border-box;min-height:56px;}
.cuigengji .story-unit-lines {display:grid;grid-template-columns:1fr;gap:6px;margin:0;padding:0;list-style:none;}
.cuigengji .story-unit-lines li {display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:8px;}
.cuigengji .story-unit-lines li small {font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-unit-lines .story-card-title {min-width:0;overflow-wrap:anywhere;}
.cuigengji .story-legend-square.tone-idle {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 10%,transparent);}
.cuigengji .story-detect {display:flex;flex-direction:column;gap:16px;max-width:1080px;}
.cuigengji .story-detect-toolbar {display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.cuigengji .story-detect-action {min-height:30px;padding:4px 12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);font-size:12px;}
.cuigengji .story-detect-link {min-height:0;padding:2px 0;border:0;background:transparent;font-size:12px;color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-detect-disclaimer {padding:10px 12px;border-left:3px solid var(--dsw-alias-state-business-primary,#4d6bfe);border-radius:0 8px 8px 0;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 4%,transparent);}
.cuigengji .story-detect-disclaimer p {margin:0;font-size:12px;line-height:1.65;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-detect-disclaimer strong {color:var(--dsw-alias-label-primary,#252936);}
.cuigengji .story-detect-heat,.cuigengji .story-detect-summary,.cuigengji .story-detect-findings {display:flex;flex-direction:column;gap:10px;min-width:0;padding:14px 16px 12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:12px;background:var(--dsw-alias-bg-layer-1,#fff);}
.cuigengji .story-detect-heat-scroll {overflow-x:auto;padding-bottom:4px;}
.cuigengji .story-detect-heat-grid {display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px;min-width:0;}
.cuigengji .story-detect-heat-cell {display:flex;flex-direction:column;align-items:flex-start;gap:1px;min-width:0;padding:6px 8px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:8px;background:transparent;text-align:left;}
.cuigengji .story-detect-heat-cell[aria-pressed=true] {border-color:var(--dsw-alias-state-business-primary,#4d6bfe);outline:1px solid var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-detect-heat-name {max-width:100%;font-size:12px;font-weight:600;line-height:1.4;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .story-detect-heat-count {font-size:11px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-detect-heat-cell[aria-pressed=true] .story-detect-heat-count {color:inherit;}
.cuigengji .story-detect-heat-cell[data-heat="1"] {background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 10%,transparent);}
.cuigengji .story-detect-heat-cell[data-heat="2"] {background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 26%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 38%,transparent);}
.cuigengji .story-detect-heat-cell[data-heat="3"] {background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 24%,transparent);border-color:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 42%,transparent);}
.cuigengji .story-detect-key {display:inline-block;width:10px;height:10px;margin-right:5px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:3px;vertical-align:-1px;}
.cuigengji .story-detect-key.heat-1 {background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 10%,transparent);}
.cuigengji .story-detect-key.heat-2 {background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 26%,transparent);}
.cuigengji .story-detect-key.heat-3 {background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 24%,transparent);}
.cuigengji .story-detect-layers {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,240px),1fr));gap:12px;align-items:start;}
.cuigengji .story-detect-layer {display:flex;flex-direction:column;gap:6px;min-width:0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:10px;background:var(--dsw-alias-bg-base,#fff);}
.cuigengji .story-detect-layer h4 {margin:0;font-size:13px;font-weight:600;display:flex;align-items:center;justify-content:space-between;gap:6px;}
.cuigengji .story-detect-layer h4 span {font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary,#737780);font-variant-numeric:tabular-nums;}
.cuigengji .story-detect-layer header p {margin:2px 0 0;font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-detect-layer ul {display:flex;flex-direction:column;gap:4px;margin:0;padding:0;list-style:none;}
.cuigengji .story-detect-layer li {display:flex;flex-wrap:wrap;align-items:center;gap:6px;min-width:0;font-size:12px;}
.cuigengji .story-detect-type {min-width:0;font-size:12px;font-weight:600;overflow-wrap:anywhere;}
.cuigengji .story-detect-type-count {font-size:11px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-detect-layer li small {font-size:11px;color:var(--dsw-alias-state-warn-primary,#b25e09);}
.cuigengji .story-detect-meta {font-size:11px;font-weight:400;color:var(--dsw-alias-label-secondary,#737780);font-variant-numeric:tabular-nums;}
.cuigengji .story-detect-list {display:flex;flex-direction:column;gap:10px;margin:0;padding:0;list-style:none;}
.cuigengji .story-detect-card {display:flex;flex-direction:column;gap:6px;min-width:0;padding:12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-left-width:3px;border-radius:10px;background:var(--dsw-alias-bg-base,#fff);}
.cuigengji .story-detect-card[data-severity=blocking] {border-left-color:var(--dsw-alias-state-error-primary,#d92d20);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 4%,var(--dsw-alias-bg-base,#fff));}
.cuigengji .story-detect-card[data-severity=advisory] {border-left-color:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 22%,transparent);}
.cuigengji .story-detect-locate {align-self:flex-start;min-height:0;padding:0;border:0;background:transparent;font-size:12px;font-variant-numeric:tabular-nums;color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-detect-locate:hover {text-decoration:underline;}
.cuigengji .story-tone-swatch {display:inline-block;width:10px;height:10px;border-radius:3px;vertical-align:-1px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 10%,transparent);}
.cuigengji .story-heat-scroll {overflow-x:auto;overflow-y:hidden;padding-bottom:4px;}
.cuigengji .story-heat-scroll:focus-visible {outline:2px solid var(--dsw-alias-state-business-primary,#4d6bfe);outline-offset:2px;}
.cuigengji .story-heat {display:grid;gap:3px;min-width:100%;width:max-content;align-items:stretch;grid-auto-rows:auto;}
.cuigengji .story-heat-runs {display:grid;gap:3px;grid-row:1;height:5px;}
.cuigengji .story-heat-run {position:relative;height:5px;border-radius:3px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 7%,transparent);}
.cuigengji .story-heat-run i {position:absolute;inset:0;border-radius:3px;background:inherit;}
.cuigengji .story-heat-run.tone-none {background:transparent;}
.cuigengji .story-heat-cell {grid-row:2;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;gap:2px;min-height:104px;min-width:0;padding:14px 1px 4px;border:1px solid transparent;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 6%,transparent);color:var(--dsw-alias-label-primary,#252936);font-variant-numeric:tabular-nums;}
.cuigengji .story-heat-cell:hover {border-color:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 30%,transparent);}
.cuigengji .story-heat-cell[aria-pressed=true] {border-color:var(--dsw-alias-label-primary,#252936);box-shadow:0 0 0 1px var(--dsw-alias-label-primary,#252936);}
.cuigengji .story-heat-cell.tone-none {border-style:dashed;border-color:var(--dsw-alias-border-l1,#8883);background:transparent;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-heat-role {position:absolute;top:0;left:0;right:0;font-size:10px;font-weight:600;line-height:1.6;text-align:center;}
.cuigengji .story-heat-bar {display:flex;align-items:flex-end;justify-content:center;width:7px;height:36px;margin:0 auto 1px;border-radius:3px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 10%,transparent);}
.cuigengji .story-heat-bar i {display:block;width:100%;border-radius:3px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 55%,transparent);}
.cuigengji .story-heat-cell.tone-none .story-heat-bar i {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 25%,transparent);}
.cuigengji .story-heat-words {max-width:100%;font-size:9px;line-height:1.3;color:var(--dsw-alias-label-secondary,#737780);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .story-heat-index {font-size:9px;line-height:1.3;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-heat-dot {position:absolute;right:2px;bottom:2px;width:5px;height:5px;border-radius:50%;background:var(--dsw-alias-state-warn-primary,#b25e09);}
.cuigengji .story-heat-run-list {display:flex;flex-wrap:wrap;gap:6px 16px;margin:0;padding:0;list-style:none;font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-heat-run-list li {display:inline-flex;align-items:center;gap:6px;min-width:0;}
.cuigengji .story-heat-run-list strong {font-size:11px;font-weight:600;color:var(--dsw-alias-label-primary,#252936);}
.cuigengji .story-heat-detail {display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:4px 14px;margin:0;padding:8px 10px;border-radius:8px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 4%,transparent);font-size:12px;}
.cuigengji .story-heat-detail div {min-width:0;}
.cuigengji .story-heat-detail dt {font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-heat-detail dd {margin:0;overflow-wrap:anywhere;}
.cuigengji .story-heat-detail-title {grid-column:1/-1;display:flex;flex-wrap:wrap;align-items:center;gap:6px;}
.cuigengji .story-heat-detail-title dt {display:none;}
.cuigengji .story-heat-detail-title dd {font-size:13px;font-weight:600;}
.cuigengji .story-heat-detail-note {grid-column:1/-1;}
.cuigengji .story-heat-detail-note dd {white-space:pre-wrap;line-height:1.6;}
.cuigengji .story-heat-detail.tone-none {border:1px dashed var(--dsw-alias-border-l1,#8883);}
.cuigengji .story-heat-detail:not(.tone-none) {border-left:3px solid currentColor;}
.cuigengji .story-tone-swatch.tone-tense,.cuigengji .story-heat-cell.tone-tense,.cuigengji .story-heat-run.tone-tense {background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 26%,transparent);}
.cuigengji .story-tone-swatch.tone-light,.cuigengji .story-heat-cell.tone-light,.cuigengji .story-heat-run.tone-light {background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#12805c) 20%,transparent);}
.cuigengji .story-tone-swatch.tone-sad,.cuigengji .story-heat-cell.tone-sad,.cuigengji .story-heat-run.tone-sad {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 26%,var(--dsw-alias-state-business-primary,#4d6bfe) 14%,transparent);}
.cuigengji .story-tone-swatch.tone-hot,.cuigengji .story-heat-cell.tone-hot,.cuigengji .story-heat-run.tone-hot {background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 22%,var(--dsw-alias-state-warn-primary,#b25e09) 36%,transparent);}
.cuigengji .story-tone-swatch.tone-satisfying,.cuigengji .story-heat-cell.tone-satisfying,.cuigengji .story-heat-run.tone-satisfying {background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 30%,transparent);}
.cuigengji .story-tone-swatch.tone-sweet,.cuigengji .story-heat-cell.tone-sweet,.cuigengji .story-heat-run.tone-sweet {background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 14%,var(--dsw-alias-state-warn-primary,#b25e09) 12%,transparent);}
.cuigengji .story-tone-swatch.tone-warm,.cuigengji .story-heat-cell.tone-warm,.cuigengji .story-heat-run.tone-warm {background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#12805c) 10%,var(--dsw-alias-state-warn-primary,#b25e09) 24%,transparent);}
.cuigengji .story-tone-swatch.tone-horror,.cuigengji .story-heat-cell.tone-horror,.cuigengji .story-heat-run.tone-horror {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 40%,transparent);}
.cuigengji .story-tone-swatch.tone-oppressive,.cuigengji .story-heat-cell.tone-oppressive,.cuigengji .story-heat-run.tone-oppressive {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 76%,transparent);}
.cuigengji .story-tone-swatch.tone-other,.cuigengji .story-heat-cell.tone-other,.cuigengji .story-heat-run.tone-other {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 14%,transparent);}
.cuigengji .story-heat-detail.tone-tense {background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 10%,transparent);}
.cuigengji .story-heat-detail.tone-light {background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#12805c) 8%,transparent);}
.cuigengji .story-heat-detail.tone-sad {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 10%,var(--dsw-alias-state-business-primary,#4d6bfe) 6%,transparent);}
.cuigengji .story-heat-detail.tone-hot {background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 8%,var(--dsw-alias-state-warn-primary,#b25e09) 14%,transparent);}
.cuigengji .story-heat-detail.tone-satisfying {background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 12%,transparent);}
.cuigengji .story-heat-detail.tone-sweet {background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 6%,var(--dsw-alias-state-warn-primary,#b25e09) 5%,transparent);}
.cuigengji .story-heat-detail.tone-warm {background:color-mix(in srgb,var(--dsw-alias-state-success-primary,#12805c) 4%,var(--dsw-alias-state-warn-primary,#b25e09) 10%,transparent);}
.cuigengji .story-heat-detail.tone-horror {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 16%,transparent);}
.cuigengji .story-heat-detail.tone-oppressive {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 32%,var(--dsw-alias-bg-layer-1,#fff));color:var(--dsw-alias-label-on-color,#fff);}
.cuigengji .story-heat-detail.tone-other {background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 6%,transparent);}
.cuigengji .story-heat-detail.tone-oppressive dt,.cuigengji .story-heat-detail.tone-oppressive small {color:color-mix(in srgb,var(--dsw-alias-label-on-color,#fff) 78%,transparent);}
.cuigengji .story-heat-cell.tone-horror,.cuigengji .story-heat-cell.tone-oppressive {color:var(--dsw-alias-label-on-color,#fff);}
.cuigengji .story-heat-cell.tone-horror .story-heat-index,.cuigengji .story-heat-cell.tone-oppressive .story-heat-index,.cuigengji .story-heat-cell.tone-horror .story-heat-words,.cuigengji .story-heat-cell.tone-oppressive .story-heat-words {color:var(--dsw-alias-label-on-color,#fff);}
.cuigengji .story-heat-cell.tone-horror .story-heat-bar,.cuigengji .story-heat-cell.tone-oppressive .story-heat-bar {background:color-mix(in srgb,var(--dsw-alias-label-on-color,#fff) 22%,transparent);}
.cuigengji .story-heat-cell.tone-horror .story-heat-bar i,.cuigengji .story-heat-cell.tone-oppressive .story-heat-bar i {background:color-mix(in srgb,var(--dsw-alias-label-on-color,#fff) 78%,transparent);}
.cuigengji .story-style {gap:14px;}
.cuigengji .story-style-requirements {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,180px),1fr));gap:8px;}
.cuigengji .story-style-tile {display:flex;flex-direction:column;gap:2px;min-width:0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:10px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 2.5%,transparent);}
.cuigengji .story-style-tile>span {font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-style-tile>strong {font-size:13px;font-weight:600;line-height:1.5;white-space:pre-wrap;overflow-wrap:anywhere;}
.cuigengji .story-style-tile>small {font-size:11px;line-height:1.5;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-style-tile-wide {grid-column:span 2;}
.cuigengji .story-style-tile>input,.cuigengji .story-style-tile>textarea {width:100%;min-width:0;padding:4px 6px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:8px;background:var(--dsw-alias-bg-base,#fff);font:inherit;font-size:13px;line-height:1.6;resize:vertical;}
.cuigengji .story-style-tile>input[type=number] {font-variant-numeric:tabular-nums;max-width:11em;}
.cuigengji .story-style-tile>input::placeholder,.cuigengji .story-style-tile>textarea::placeholder {color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-style-tile>input:focus-visible,.cuigengji .story-style-tile>textarea:focus-visible {outline:2px solid var(--dsw-alias-state-business-primary,#4d6bfe);outline-offset:1px;}
.cuigengji .story-style-editor {gap:10px;}
.cuigengji .story-style-editor h3 {margin:0;font-size:14px;font-weight:600;}
.cuigengji .story-style-editor fieldset {border:0;margin:0;padding:0;min-width:0;}
.cuigengji .story-rhythm-editor {gap:10px;padding:12px 14px;}
.cuigengji .story-rhythm-editor h4 {margin:2px 0 0;font-size:14px;font-weight:600;}
.cuigengji .story-rhythm-editor fieldset {border:0;margin:0;padding:0;min-width:0;}
.cuigengji .story-rhythm-editor .story-section-heading p {font-size:11px;}
.cuigengji .story-heat-detail-actions {grid-column:1/-1;display:flex;flex-wrap:wrap;gap:8px;margin-top:2px;}
.cuigengji .story-heat-action {min-height:28px;padding:3px 10px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:8px;background:var(--dsw-alias-bg-layer-1,#fff);font-size:12px;}
.cuigengji .story-heat-action:hover {border-color:var(--dsw-alias-state-business-primary,#4d6bfe);}
.cuigengji .story-heat-detail .story-heat-action {background:var(--dsw-alias-bg-layer-1,#fff);color:var(--dsw-alias-label-primary,#252936);}
.cuigengji .story-heat-toolbar {display:flex;flex-wrap:wrap;align-items:center;gap:8px 12px;}
.cuigengji .story-style-anchors {margin:0;padding-left:16px;font-size:12px;line-height:1.6;}
.cuigengji .story-style-anchors li {overflow-wrap:anywhere;}
.cuigengji .story-style-deviations {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:8px;}
.cuigengji .story-style-deviation {display:flex;flex-direction:column;gap:2px;min-width:0;padding:10px 12px;border:1px solid var(--dsw-alias-border-l1,#8883);border-radius:10px;font-size:12px;}
.cuigengji .story-style-deviation>span {font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-style-deviation>strong {font-size:20px;line-height:1.2;font-variant-numeric:tabular-nums;}
.cuigengji .story-style-deviation>small {font-size:11px;line-height:1.55;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-style-deviation strong[data-tone=over] {color:var(--dsw-alias-state-error-primary,#d92d20);}
.cuigengji .story-style-deviation strong[data-tone=under] {color:var(--dsw-alias-state-warn-primary,#b25e09);}
.cuigengji .story-style-deviation strong[data-tone=match] {color:var(--dsw-alias-state-success-primary,#12805c);}
.cuigengji .story-style-deviation[data-state=unset] {border-style:dashed;}
.cuigengji .story-style-deviation[data-state=unmeasured] {border-color:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 40%,transparent);}
.cuigengji .story-style-deviation .story-style-unset {font-size:13px;font-weight:600;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-style-charts {display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:14px;align-items:start;}
.cuigengji .story-style-chart {display:flex;flex-direction:column;gap:6px;min-width:0;margin:0;}
.cuigengji .story-style-chart figcaption {display:flex;flex-wrap:wrap;align-items:baseline;gap:8px;font-size:12px;}
.cuigengji .story-style-chart figcaption strong {font-size:12px;font-weight:600;}
.cuigengji .story-style-chart figcaption span {font-size:11px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-style-chart-scroll {overflow-x:auto;overflow-y:hidden;padding-bottom:2px;}
.cuigengji .story-style-chart svg {display:block;overflow:visible;font-family:inherit;}
.cuigengji .story-style-grid line {stroke:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 10%,transparent);stroke-dasharray:2 4;}
.cuigengji .story-style-grid text {font-size:9px;fill:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-style-bar-hit {fill:transparent;}
.cuigengji .story-style-bar:hover .story-style-bar-hit,.cuigengji .story-style-bar:focus .story-style-bar-hit {fill:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 6%,transparent);}
.cuigengji .story-style-bar-rect {fill:color-mix(in srgb,var(--dsw-alias-state-business-primary,#4d6bfe) 70%,transparent);}
.cuigengji .story-style-bar-rect.bar-success {fill:color-mix(in srgb,var(--dsw-alias-state-success-primary,#12805c) 70%,transparent);}
.cuigengji .story-style-bar-rect.bar-warn {fill:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 70%,transparent);}
.cuigengji .story-style-bar-rect.bar-error {fill:color-mix(in srgb,var(--dsw-alias-state-error-primary,#d92d20) 55%,var(--dsw-alias-label-primary,#252936));}
.cuigengji .story-style-bar.tone-over .story-style-bar-rect {stroke:var(--dsw-alias-state-error-primary,#d92d20);stroke-width:1;}
.cuigengji .story-style-bar.tone-under .story-style-bar-rect {stroke:var(--dsw-alias-state-warn-primary,#b25e09);stroke-width:1;stroke-dasharray:3 2;}
.cuigengji .story-style-bar.tone-match .story-style-bar-rect {stroke:var(--dsw-alias-state-success-primary,#12805c);stroke-width:1.5;}
.cuigengji .story-style-bar-value {font-size:9px;fill:var(--dsw-alias-label-primary,#252936);}
.cuigengji .story-style-bar-tick {font-size:9px;fill:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-style-target line {stroke:var(--dsw-alias-state-error-primary,#d92d20);stroke-width:1.5;stroke-dasharray:6 4;}
.cuigengji .story-style-target text {font-size:9px;fill:var(--dsw-alias-state-error-primary,#d92d20);font-weight:600;}
.cuigengji .story-style-scroll {overflow-x:auto;}
.cuigengji .story-style-table {border-collapse:separate;border-spacing:0;width:100%;font-size:12px;font-variant-numeric:tabular-nums;}
.cuigengji .story-style-table caption {padding-bottom:6px;font-size:11px;line-height:1.5;text-align:left;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-style-table th,.cuigengji .story-style-table td {padding:3px 6px;text-align:left;font-weight:400;white-space:nowrap;}
.cuigengji .story-style-table thead th {font-size:11px;font-weight:600;color:var(--dsw-alias-label-secondary,#737780);border-bottom:1px solid var(--dsw-alias-border-l1,#8883);}
.cuigengji .story-style-table tbody th {display:flex;align-items:center;gap:6px;min-width:120px;max-width:220px;font-size:12px;overflow:hidden;text-overflow:ellipsis;}
.cuigengji .story-style-table tbody tr+tr th,.cuigengji .story-style-table tbody tr+tr td {border-top:1px solid color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 6%,transparent);}
.cuigengji .story-style-table td small,.cuigengji .story-style-diff small {font-size:10px;color:var(--dsw-alias-label-secondary,#737780);}
.cuigengji .story-style-diff.tone-error,.cuigengji .story-style-diff.tone-error small {color:var(--dsw-alias-state-error-primary,#d92d20);}
.cuigengji .story-style-diff.tone-warn,.cuigengji .story-style-diff.tone-warn small {color:var(--dsw-alias-state-warn-primary,#b25e09);}
.cuigengji .story-style-diff.tone-success,.cuigengji .story-style-diff.tone-success small {color:var(--dsw-alias-state-success-primary,#12805c);}
.cuigengji .story-truth-list {margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:4px;}
.cuigengji .story-truth-list li {padding:4px 7px;border-radius:6px;background:color-mix(in srgb,var(--dsw-alias-label-primary,#252936) 5%,transparent);font-size:12px;line-height:1.5;overflow-wrap:anywhere;}
.cuigengji .story-truth-gap li {background:color-mix(in srgb,var(--dsw-alias-state-warn-primary,#b25e09) 12%,transparent);}
.cuigengji .story-timeline-table td {vertical-align:top;min-width:150px;}
.cuigengji .story-timeline-table th[scope=row] button {display:flex;flex-direction:column;align-items:flex-start;gap:2px;}
.cuigengji .story-review-matrix td {min-width:76px;}
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
 .cuigengji .story-figure {padding:12px;}
 .cuigengji .story-matrix-chapter {min-width:120px;}
 .cuigengji .story-unit-list {grid-template-columns:1fr;}
 .cuigengji .story-unit-matrix-line {min-width:100px;}
 .cuigengji .story-unit-matrix-carry {min-width:64px;}
 .cuigengji .story-context-columns {grid-template-columns:1fr;}
 .cuigengji .story-detect-heat,.cuigengji .story-detect-summary,.cuigengji .story-detect-findings {padding:12px;}
 .cuigengji .story-detect-heat-grid {grid-template-columns:repeat(auto-fill,minmax(78px,1fr));}
 .cuigengji .story-detect-layers {grid-template-columns:minmax(0,1fr);}
 .cuigengji .story-style-tile-wide {grid-column:span 1;}
 .cuigengji .story-style-charts {grid-template-columns:minmax(0,1fr);}
 .cuigengji .story-heat-cell {min-height:104px;}
 .cuigengji .story-style-table tbody th {min-width:96px;}
}
`;

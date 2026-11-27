export const cardComparisonStyles=`
.cuigengji .detail-scroll:has(.card-comparison) {position:relative;overflow:hidden;padding:0;display:flex;}
.cuigengji .detail-page:has(.card-comparison) .detail-selection-slot {display:none;}
.cuigengji .detail-scroll:has(.card-comparison)>.detail-document {width:100%;max-width:none;min-width:0;display:flex;flex:1;}
.cuigengji .entry-document.is-comparing {min-height:0;min-width:0;display:flex;flex:1;}
.cuigengji .card-comparison {display:flex;flex:1;flex-direction:column;min-height:0;min-width:0;background:var(--cg-paper);}
.cuigengji .card-comparison-head {display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 20px;border-bottom:1px solid var(--cg-line);flex:none;}
.cuigengji .card-comparison-head>div {min-width:0;}
.cuigengji .card-comparison-head small {display:block;color:var(--cg-muted);font-size:10px;margin-bottom:4px;}
.cuigengji .card-comparison-head strong {display:block;font-size:16px;font-weight:550;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;}
.cuigengji .card-comparison-head>button {flex:none;font-size:11px;white-space:nowrap;}
.cuigengji .card-comparison-tools {display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:14px 20px 10px;flex:none;}
.cuigengji .card-comparison-tools>label {display:flex;align-items:center;gap:6px;font-size:11px;color:var(--cg-muted);margin:0;min-width:0;max-width:100%;}
.cuigengji .card-comparison-tools select {font-size:11px;min-width:0;max-width:240px;color:var(--cg-ink);}
.cuigengji .card-comparison-current {font-size:11px;white-space:nowrap;color:var(--cg-muted);}
.cuigengji .card-diff-navigation {display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:6px;padding:0 20px 10px;flex:none;}
.cuigengji .card-diff-navigation>div {display:flex;align-items:center;gap:5px;}
.cuigengji .card-diff-navigation button {border:0;background:none;padding:2px 8px;min-height:28px;}
.cuigengji .card-diff-navigation [role=status] {font-size:11px;color:var(--cg-muted);font-variant-numeric:tabular-nums;}
.cuigengji .card-diff-scroll {overflow:auto;overscroll-behavior:contain;flex:1;min-height:0;min-width:0;padding:0 14px 24px;scrollbar-gutter:stable;overflow-anchor:none;}
.cuigengji .card-diff-labels {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;font-size:11px;color:var(--cg-muted);padding:8px;border-bottom:1px solid var(--cg-line);}
.cuigengji .card-diff-field {margin:16px 0 24px;min-width:0;}
.cuigengji .card-diff-field h4 {font-size:11px;font-weight:550;display:flex;align-items:center;gap:8px;color:var(--cg-ink);margin:0 8px 8px;}
.cuigengji .card-diff-field h4 small {font-size:10px;color:var(--cg-muted);font-weight:400;}
.cuigengji .card-diff-field .prose-diff-cell {font-size:13px;line-height:1.9;grid-template-columns:24px minmax(0,1fr);}
.cuigengji .card-diff-field .prose-diff-number {line-height:2.25;}
.cuigengji .card-comparison-foot {display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:12px 20px;border-top:1px solid var(--cg-line);flex:none;}
.cuigengji .card-comparison-foot>span {font-size:10px;color:var(--cg-muted);font-variant-numeric:tabular-nums;}
.cuigengji .card-comparison-foot>button {font-size:12px;margin-left:auto;}
.cuigengji .card-comparison[data-layout=inline] .card-diff-labels {display:none;}
@container card-inspector (max-width:420px) {
 .cuigengji .card-comparison-head,.cuigengji .card-comparison-tools,.cuigengji .card-comparison-foot {padding-inline:14px;}
 .cuigengji .card-comparison-tools select {max-width:190px;}
 .cuigengji .card-diff-scroll {padding-inline:7px;}
 .cuigengji .card-diff-navigation {padding-inline:14px;}
 .cuigengji .workspace-detail .detail-bar .detail-action-buttons {white-space:normal;flex-wrap:wrap;}
}
`;

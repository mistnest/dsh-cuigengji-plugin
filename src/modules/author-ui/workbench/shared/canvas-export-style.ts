export const canvasExportStyles=`
.cuigengji .utility-modal {pointer-events:auto;}
.cuigengji .canvas-export-launch {font-size:11px;min-height:28px;padding:4px 9px;border:1px solid var(--cg-line);background:var(--cg-paper);}
.cuigengji .canvas-export-modal {width:min(900px,calc(100vw - 28px));}
.cuigengji .canvas-export-options {display:grid;grid-template-columns:1fr 1fr;gap:12px 18px;}
.cuigengji .canvas-export-options label {margin:8px 0;font-size:12px;color:var(--cg-muted);}
.cuigengji .canvas-export-options .export-title-option {grid-column:1/-1;display:flex;gap:8px;align-items:center;margin:0 0 16px;}
.cuigengji .canvas-export-preview {display:flex;align-items:center;justify-content:center;height:clamp(180px,42vh,440px);border:1px solid var(--cg-line);background:var(--cg-canvas);border-radius:9px;overflow:hidden;padding:16px;}
.cuigengji .canvas-export-preview img {display:block;width:100%;height:100%;object-fit:contain;}
.cuigengji .canvas-export-footer {display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:18px;}
.cuigengji .canvas-export-footer small {display:block;font-size:11px;color:var(--cg-muted);line-height:1.65;}
.cuigengji .canvas-export-footer button {white-space:nowrap;flex:none;}
.cuigengji .document-save-state {font-size:11px;color:var(--cg-muted);white-space:nowrap;}
.cuigengji .workspace-filter-notice {flex:none;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 16px;border-bottom:1px solid var(--cg-line);background:var(--cg-paper);font-size:11px;color:var(--cg-muted);}.cuigengji .workspace-filter-notice>span {min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cuigengji .workspace-filter-notice button {font-size:11px;padding:2px 6px;min-height:24px;white-space:nowrap;}
.cuigengji .document-conflict-modal {width:min(900px,calc(100vw - 28px));}
.cuigengji .conflict-field {margin:20px 0;padding:0;border:0;}
.cuigengji .conflict-field legend {font-weight:600;margin-bottom:6px;}
.cuigengji .conflict-field .split {grid-template-columns:1fr 1fr;gap:12px;align-items:stretch;}
.cuigengji .conflict-field label {min-width:0;border:1px solid var(--cg-line);border-radius:8px;padding:12px;background:var(--cg-canvas);}
.cuigengji .conflict-field label:has(:checked) {border-color:var(--cg-accent);background:color-mix(in srgb,var(--cg-accent) 5%,var(--cg-paper));}
.cuigengji .conflict-field label>span {display:flex;align-items:center;gap:7px;font-size:12px;}
.cuigengji .conflict-field pre {margin:8px 0 0;font-family:inherit;font-size:13px;line-height:1.75;max-height:240px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;}
.cuigengji .document-management .document-danger-zone {padding-top:18px;margin-top:20px;border-top:1px solid var(--cg-line);}
@container cg-utility (max-width:500px){.cuigengji .conflict-field .split{grid-template-columns:1fr;}.cuigengji .canvas-export-options{gap:10px;}.cuigengji .canvas-export-footer{flex-wrap:wrap;}.cuigengji .canvas-export-footer button{margin-left:auto;}}
.cuigengji .detail-page {container:cg-detail / inline-size;}
.cuigengji .detail-selection-slot {display:block;min-width:96px;min-height:18px;}
@container cg-detail (max-width:500px){
 .cuigengji .detail-bar {display:grid;grid-template-columns:auto minmax(0,1fr);gap:2px 6px;}
 .cuigengji .detail-bar .document-save-state {display:none;}
 .cuigengji .detail-bar .detail-actions {display:contents;}
 .cuigengji .detail-bar .detail-action-buttons {grid-column:2;grid-row:1;justify-self:end;gap:5px;white-space:nowrap;}
 .cuigengji .detail-bar .detail-selection-slot {grid-column:1/-1;grid-row:2;}
 .cuigengji .detail-bar .detail-back {white-space:nowrap;padding-right:0;}
}
`;

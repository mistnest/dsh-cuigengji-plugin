export const cardImageStyles=`
.cuigengji .planning-card.has-card-image{height:280px;padding-top:128px;}
.cuigengji .card-image-cover{position:absolute;left:0;top:0;width:100%;height:112px;min-height:0;padding:0;border:0;border-bottom:1px solid var(--cg-line);border-radius:11px 11px 0 0;overflow:hidden;background:var(--cg-canvas);cursor:zoom-in;touch-action:pan-y;}
.cuigengji .card-image-cover img{display:block;width:100%;height:100%;object-fit:cover;object-position:50% 30%;transition:transform 220ms ease;}
.cuigengji .card-image-cover:hover img{transform:scale(1.02);}
.cuigengji .card-image-cover small{position:absolute;right:8px;bottom:7px;border-radius:5px;padding:2px 6px;color:var(--cg-ink);background:var(--cg-paper);font-size:11px;box-shadow:0 1px 4px color-mix(in srgb,var(--cg-ink) 10%,transparent);}
.cuigengji .card-image-gallery{min-width:0;margin:0 0 22px;padding:12px 14px;border:1px solid var(--cg-line);border-radius:11px;background:var(--cg-card);transition:border-color 150ms,background 150ms;}
.cuigengji .card-image-gallery.is-empty{margin:-10px 0 18px;padding:0;border:0;border-radius:0;background:transparent;}
.cuigengji .editor-fields+.card-image-gallery.is-empty,.cuigengji .card-image-gallery.is-empty:has(+.editor-fields){margin:0 0 12px;}
.cuigengji .card-image-gallery.is-empty>header{margin-bottom:0;min-height:26px;gap:6px;opacity:.78;transition:opacity 140ms;}
.cuigengji .card-image-gallery.is-empty:hover>header{opacity:1;}
.cuigengji .card-image-heading{display:inline-flex;align-items:center;gap:5px;color:var(--cg-muted);}
.cuigengji .card-image-heading .app-icon{width:13px;height:13px;}
.cuigengji .card-image-gallery .card-image-empty-hint{font-size:11px;color:var(--cg-muted);opacity:.75;}
@container cg-detail (max-width:460px){.cuigengji .card-image-gallery .card-image-empty-hint{display:none;}}
.cuigengji .card-image-gallery.is-dragging{outline:2px dashed var(--cg-accent);outline-offset:5px;background:var(--cg-wash);border-radius:10px;padding:8px 10px;}
.cuigengji .card-image-gallery>header{display:flex;align-items:center;gap:6px;margin-bottom:10px;flex-wrap:wrap;}
.cuigengji .card-image-gallery>header h3{margin:0;font-size:12px;font-weight:500;color:var(--cg-muted);}
.cuigengji .card-image-gallery>header small{color:var(--cg-muted);font-size:11px;}
.cuigengji .card-image-gallery>header button:first-of-type{margin-left:auto;}
.cuigengji .card-image-gallery>header button{padding:2px 7px;border:0;font-size:11.5px;min-height:24px;border-radius:6px;color:var(--cg-muted);background:transparent;}
.cuigengji .card-image-gallery>header button:hover:not(:disabled){color:var(--cg-accent);background:var(--cg-wash);}
.cuigengji .card-image-main{position:relative;display:flex;width:100%;height:208px;max-width:100%;padding:0;align-items:center;justify-content:center;overflow:hidden;border:1px solid var(--cg-line);border-radius:9px;background:var(--cg-canvas);cursor:zoom-in;}
.cuigengji .card-image-main img{width:100%;height:100%;object-fit:contain;transition:transform 200ms ease;}
.cuigengji .card-image-main:hover img{transform:scale(1.015);}
.cuigengji .card-image-main>span:last-child{position:absolute;right:8px;bottom:8px;display:flex;align-items:center;gap:4px;padding:3px 7px;border-radius:5px;background:var(--cg-paper);color:var(--cg-ink);font-size:11px;box-shadow:0 2px 6px #0002;}
.cuigengji .card-image-main .app-icon{width:13px;height:13px;}
.cuigengji .card-image-caption{display:flex;align-items:center;gap:8px;margin:7px 0 10px;color:var(--cg-muted);font-size:12px;min-width:0;}
.cuigengji .card-image-caption>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}
.cuigengji .card-image-caption>small{color:var(--cg-accent);font-size:11px;white-space:nowrap;}
.cuigengji .card-image-thumbnails{display:flex;flex-wrap:wrap;gap:7px;}
.cuigengji .card-image-thumb,.cuigengji .card-image-add{display:flex;align-items:center;justify-content:center;width:50px;height:55px;min-height:0;flex:none;overflow:hidden;border:1px solid var(--cg-line);border-radius:7px;padding:0;background:var(--cg-canvas);transition:border-color 140ms,transform 140ms;}
.cuigengji .card-image-thumb:hover{transform:translateY(-1px);}
.cuigengji .card-image-thumb img{width:100%;height:100%;object-fit:cover;}
.cuigengji .card-image-thumb[aria-pressed=true]{border-color:var(--cg-accent);box-shadow:0 0 0 1px var(--cg-accent);}
.cuigengji .card-image-add{border-style:dashed;color:var(--cg-muted);font-size:20px;}
.cuigengji .card-image-actions{display:flex;gap:4px;flex-wrap:wrap;margin-top:10px;}
.cuigengji .card-image-actions button{font-size:12px;min-height:28px;padding:4px 8px;}
.cuigengji .card-image-actions .danger{margin-left:auto;}
.cuigengji .card-image-viewer{width:min(1100px,calc(100vw - 28px));max-width:calc(100vw - 28px);height:min(800px,calc(100dvh - var(--cg-modal-top,0px) - 32px));max-height:calc(100dvh - var(--cg-modal-top,0px) - 32px);}
.cuigengji .card-image-viewer .utility-content{min-height:0;display:flex;flex:1;flex-direction:column;overflow:hidden;}
.cuigengji .card-image-view-stage{display:flex;align-items:center;justify-content:center;gap:10px;flex:1;min-height:0;height:0;padding:12px 0;}
.cuigengji .card-image-view-stage>img{height:100%;width:100%;min-width:0;object-fit:contain;}
.cuigengji .card-image-view-stage>button{flex:none;font-size:24px;padding:3px 8px;}
.cuigengji .card-image-viewer footer{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;gap:8px;padding-top:12px;max-height:130px;overflow:auto;}
.cuigengji .card-image-viewer footer>span{font-size:12px;color:var(--cg-muted);}
@media(pointer:coarse){.cuigengji .card-image-actions button,.cuigengji .card-image-gallery>header button{min-height:44px;}}
`;

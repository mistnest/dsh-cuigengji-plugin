export const welcomeStyles = `
.cuigengji .welcome-scroll {flex:1;min-height:0;overflow:auto;overscroll-behavior:contain;scrollbar-gutter:stable;}
.cuigengji .welcome-document {max-width:940px;margin:auto;padding:clamp(28px,6cqw,64px) clamp(24px,6cqw,64px) 32px;animation:cg-arrive 180ms ease-out;}
.cuigengji .welcome-hero {display:flex;align-items:center;gap:clamp(28px,5cqw,56px);padding:12px 0 38px;}
.cuigengji .welcome-avatar {display:block;width:clamp(136px,20cqw,180px);height:auto;flex:none;border-radius:32px;background:#fff;box-shadow:0 10px 32px color-mix(in srgb,var(--cg-accent) 8%,transparent);border:1px solid color-mix(in srgb,var(--cg-line) 60%,transparent);}
.cuigengji .welcome-intro {min-width:0;}
.cuigengji .welcome-brand {font-size:13px;letter-spacing:.025em;font-weight:600;color:var(--cg-accent);}
.cuigengji .welcome-brand>span {font-weight:400;color:var(--cg-muted);}
.cuigengji .welcome-intro h1 {font-size:clamp(25px,3.5cqw,34px);letter-spacing:-.035em;font-weight:600;line-height:1.45;overflow-wrap:anywhere;margin:12px 0;}
.cuigengji .welcome-intro p {font-size:13px;color:var(--cg-muted);line-height:1.95;margin:0;}
.cuigengji .welcome-actions {display:flex;flex-wrap:wrap;gap:10px;margin-top:24px;}
.cuigengji .welcome-actions button {font-size:12px;padding:10px 18px;border-radius:9px;min-height:40px;}
.cuigengji .welcome-library {border-top:1px solid var(--cg-line);padding-top:26px;}
.cuigengji .welcome-library>header {display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:18px;}
.cuigengji .welcome-library h2 {font-size:14px;font-weight:600;margin:0;}
.cuigengji .welcome-library h2>span {display:inline-block;font-weight:400;color:var(--cg-muted);font-size:11px;margin-left:8px;}
.cuigengji .welcome-library-hint {font-size:11px;color:var(--cg-muted);}
.cuigengji .welcome-library input {font-size:12px;min-width:0;width:180px;}
.cuigengji .welcome-library-tools {display:flex;align-items:center;gap:12px;min-width:0;}
.cuigengji .welcome-library-tools button {border:0;background:none;color:var(--cg-muted);font-size:11px;padding:5px;white-space:nowrap;}
.cuigengji .welcome-books {display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
.cuigengji .welcome-book {display:flex;align-items:center;min-width:0;min-height:88px;border:1px solid var(--cg-line);border-radius:12px;background:var(--cg-paper);transition:background 140ms,border-color 140ms,transform 140ms;}
.cuigengji .welcome-book:hover {border-color:color-mix(in srgb,var(--cg-accent) 40%,var(--cg-line));transform:translateY(-1px);}
.cuigengji .welcome-book:focus-within {border-color:var(--cg-accent);}
.cuigengji button.welcome-book-open {display:flex;align-items:center;align-self:stretch;flex:1;gap:14px;min-width:0;text-align:left;padding:18px 8px 18px 18px;border:0;border-radius:11px;background:transparent;}
.cuigengji button.welcome-book-recycle {display:grid;place-items:center;flex:none;width:36px;height:36px;padding:8px;margin-right:10px;border:0;border-radius:8px;background:transparent;color:var(--cg-muted);transition:color 140ms,background 140ms;}
.cuigengji .welcome-book-recycle:hover,.cuigengji .welcome-book-recycle:focus-visible {color:var(--dsw-alias-state-error-primary,#bf443a);background:color-mix(in srgb,var(--dsw-alias-state-error-primary,#bf443a) 8%,transparent);}
.cuigengji .welcome-book-recycle svg,.cuigengji .welcome-trash svg {width:18px;height:18px;border:0;border-radius:0;}
.cuigengji .welcome-book-mark {display:grid;place-items:center;width:40px;height:44px;flex:none;border-radius:8px;background:var(--cg-wash);color:var(--cg-accent);}
.cuigengji .welcome-book-mark svg {width:22px;height:22px;border:0;border-radius:0;}
.cuigengji .welcome-book-copy {min-width:0;flex:1;}
.cuigengji .welcome-book strong {display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;font-weight:500;font-size:14px;line-height:1.6;overflow-wrap:anywhere;}
.cuigengji .welcome-book small {display:block;color:var(--cg-muted);font-size:10px;margin-top:5px;}
.cuigengji .welcome-expand {display:block;font-size:11px;border:0;background:none;color:var(--cg-muted);margin:18px auto 0;}
.cuigengji .welcome-no-match {color:var(--cg-muted);font-size:12px;padding:16px 0;}
.cuigengji .welcome-start {border-top:1px solid var(--cg-line);display:flex;gap:18px;align-items:center;padding:30px 0;}
.cuigengji .welcome-start-line {width:3px;height:40px;flex:none;background:color-mix(in srgb,var(--cg-accent) 30%,var(--cg-paper));border-radius:2px;}
.cuigengji .welcome-start p {color:var(--cg-muted);font-size:12px;line-height:2;margin:0;}
.cuigengji .welcome-start strong {font-weight:400;color:var(--cg-ink);}
.cuigengji .welcome-footer {display:flex;gap:12px;align-items:center;flex-wrap:wrap;padding:24px 0 0;}
.cuigengji .welcome-footer button,.cuigengji .welcome-star {display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;padding:6px 8px;font-size:11px;min-height:36px;border:0;border-radius:8px;background:transparent;color:var(--cg-muted);transition:color 140ms,background 140ms;}
.cuigengji .welcome-footer button:hover,.cuigengji .welcome-footer button:focus-visible,.cuigengji .welcome-star:hover,.cuigengji .welcome-star:focus-visible {color:var(--cg-accent);background:var(--cg-wash);}
.cuigengji .welcome-star {text-decoration:none;white-space:nowrap;}
.cuigengji .welcome-star:focus-visible {outline:2px solid var(--cg-accent);outline-offset:2px;}
.cuigengji .welcome-star svg {width:15px;height:15px;flex:none;border:0;border-radius:0;color:var(--cg-accent);}
.cuigengji .welcome-star-arrow {font-size:12px;}
.cuigengji .welcome-manage {margin-right:auto;}
.cuigengji .welcome-trash {margin-left:auto;}
.cuigengji .welcome-hero.is-returning {flex-direction:row;align-items:center;gap:20px;padding:0 0 28px;}
.cuigengji .is-returning .welcome-avatar {width:64px;border-radius:16px;box-shadow:none;}
.cuigengji .is-returning .welcome-intro {flex:1;}
.cuigengji .is-returning .welcome-brand {font-size:11px;}
.cuigengji .is-returning .welcome-intro h1 {font-size:22px;margin:5px 0 0;}
.cuigengji .is-returning .welcome-actions {margin-top:16px;}
@container (max-width:640px) {
 .cuigengji .welcome-hero {flex-direction:column;align-items:flex-start;gap:24px;padding-top:0;}
 .cuigengji .welcome-avatar {width:128px;border-radius:26px;}
 .cuigengji .welcome-intro h1 {font-size:28px;}
 .cuigengji .welcome-books {grid-template-columns:minmax(0,1fr);}
 .cuigengji .welcome-library-hint {display:none;}
 .cuigengji .welcome-library>header {flex-wrap:wrap;}
 .cuigengji .welcome-library-tools {flex-wrap:wrap;}
}
@container (max-width:380px) {
 .cuigengji .welcome-document {padding:26px 20px;}
 .cuigengji .welcome-avatar {width:108px;border-radius:22px;}
 .cuigengji .welcome-intro h1 {font-size:25px;}
 .cuigengji .welcome-actions {gap:8px;}
 .cuigengji .welcome-actions button {padding:10px 13px;}
 .cuigengji .welcome-library input {width:140px;}
}
`;

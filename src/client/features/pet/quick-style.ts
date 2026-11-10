export const quickStyles = `

.cg-pet-surface .pet-quick-bubble{--quick-paper:light-dark(#fff,#24242a);--quick-ink:light-dark(#292633,#eceaf2);--quick-muted:light-dark(#756f80,#b0aab9);--quick-line:light-dark(#ece9f0,#3b3743);--quick-ground:light-dark(#f6f3fa,#302b38);--quick-hover:light-dark(#f1edf6,#39313f);--quick-accent:light-dark(#79608e,#c3a9dc);--quick-motion:180ms;display:flex;flex-direction:column;z-index:1;padding:0;overflow:hidden;border-color:var(--quick-line);border-radius:18px;color:var(--quick-ink);background:var(--quick-paper);box-shadow:0 12px 40px light-dark(#36204418,#0000003d);font:13px/1.5 var(--dsw-font-family,system-ui,"Microsoft YaHei",sans-serif);animation:cg-quick-enter 150ms ease-out}
.cg-pet-surface .pet-quick-bubble strong{font-weight:500}
.cg-pet-surface .pet-quick-bubble button{color:inherit;-webkit-tap-highlight-color:transparent}
.cg-pet-surface .pet-quick-bubble .pet-companion-bubble-head{flex:none;margin:0;padding:12px 16px 8px;min-height:52px;align-items:center}
.cg-pet-surface .pet-quick-bubble .pet-companion-bubble-head strong{font-size:14px;display:flex;align-items:center;gap:8px}
.cg-pet-surface .pet-quick-mark{display:grid;place-items:center;width:28px;height:28px;background:var(--quick-ground);border-radius:9px;color:var(--quick-accent)}
.cg-pet-surface .pet-quick-mark svg{width:15px;height:15px}
.cg-pet-surface .pet-quick-bubble .pet-companion-bubble-head button{display:grid;place-items:center;background:transparent;color:var(--quick-muted);width:32px;height:32px;padding:0;border:0;border-radius:8px;transition:background-color 120ms}
.cg-pet-surface .pet-quick-bubble .pet-companion-bubble-head button:hover{background:var(--quick-hover)}
.cg-pet-surface .pet-quick-scroll{min-height:0;overflow:auto;overscroll-behavior:contain;padding:0 16px 12px;scrollbar-width:thin;scrollbar-color:var(--quick-line) transparent}
.cg-pet-surface .pet-quick-content{min-width:0}
.cg-pet-surface .pet-quick-date{display:flex;justify-content:space-between;gap:12px;color:var(--quick-muted);font-size:11px;margin-bottom:10px;font-variant-numeric:tabular-nums}
.cg-pet-surface .pet-quick-label{display:block;color:var(--quick-muted);font-size:12px;font-weight:400}
.cg-pet-surface .pet-quick-label small{font-size:10px;margin-left:3px;white-space:nowrap}
.cg-pet-surface .pet-quick-disclosure{display:grid;grid-template-columns:minmax(0,1fr) 16px;align-items:center;gap:8px;width:100%;min-height:32px;padding:5px 0;border:0;border-radius:7px;background:transparent;font:inherit;text-align:left;transition:background-color 120ms}
.cg-pet-surface .pet-quick-disclosure:hover{background:var(--quick-ground)}
.cg-pet-surface .pet-quick-disclosure>span{min-width:0}
.cg-pet-surface .pet-quick-chevron{display:block;width:16px;height:16px;color:var(--quick-muted);transform-origin:center;transition:transform var(--quick-motion) cubic-bezier(.2,.7,.2,1);pointer-events:none;justify-self:end}
.cg-pet-surface .pet-quick-disclosure[aria-expanded=true]>.pet-quick-chevron{transform:rotate(180deg)}
.cg-pet-surface .pet-quick-tokens{margin:0 0 12px}
.cg-pet-surface .pet-quick-token-toggle{padding:4px 0}
.cg-pet-surface .pet-quick-token-line{display:block;margin-top:3px}
.cg-pet-surface .pet-quick-token-line>strong{display:block;font-size:32px;line-height:1.2;letter-spacing:-.8px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.cg-pet-surface .pet-quick-reveal{display:grid;grid-template-rows:0fr;opacity:0;visibility:hidden;transition:grid-template-rows var(--quick-motion) cubic-bezier(.2,.7,.2,1),opacity 120ms ease,visibility 0s var(--quick-motion)}
.cg-pet-surface .pet-quick-reveal>div{min-height:0;overflow:hidden}
.cg-pet-surface .pet-quick-reveal.is-open{grid-template-rows:1fr;opacity:1;visibility:visible;transition-delay:0s}
.cg-pet-surface .pet-quick-breakdown{margin:8px 0 0;padding:10px 12px;display:grid;gap:6px;background:var(--quick-ground);border:1px solid var(--quick-line);border-radius:10px;font-size:11px}
.cg-pet-surface .pet-quick-breakdown>div{display:flex;justify-content:space-between;gap:8px}
.cg-pet-surface .pet-quick-breakdown dt{color:var(--quick-muted)}
.cg-pet-surface .pet-quick-breakdown dd{margin:0;font-variant-numeric:tabular-nums}
.cg-pet-surface .pet-quick-money{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:16px;align-items:start}
.cg-pet-surface .pet-quick-cost{padding:5px 12px 5px 0;border-right:1px solid var(--quick-line);align-self:stretch;min-width:0}
.cg-pet-surface .pet-quick-balance-toggle{gap:4px;align-self:stretch}
.cg-pet-surface .pet-quick-amounts{display:flex;flex-direction:column;gap:4px;margin-top:4px;min-width:0;container-type:inline-size}
.cg-pet-surface .pet-quick-amounts strong{font-size:22px;font-size:clamp(11px,calc(100cqi / var(--amount-chars) * 1.7),22px);line-height:1.35;letter-spacing:-.5px;white-space:nowrap;font-variant-numeric:tabular-nums}
.cg-pet-surface .pet-quick-unavailable{font-size:16px;color:var(--quick-muted);line-height:1.85}
.cg-pet-surface .pet-quick-accounts{margin-top:8px;padding:10px 12px;background:var(--quick-ground);border:1px solid var(--quick-line);border-radius:10px;color:var(--quick-muted);font-size:11px;overflow-wrap:anywhere;display:grid;gap:10px}
.cg-pet-surface .pet-quick-accounts>div{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:2px 12px}
.cg-pet-surface .pet-quick-accounts strong{color:var(--quick-ink);font-size:12px;font-variant-numeric:tabular-nums}
.cg-pet-surface .pet-quick-accounts small{grid-column:1/-1;font-size:10px}
.cg-pet-surface p.pet-quick-pricing-note{font-size:11px;color:var(--quick-muted);margin:6px 0 0}
.cg-pet-surface .pet-quick-writing{margin-top:14px;border-top:1px solid var(--quick-line);padding-top:7px}
.cg-pet-surface .pet-quick-writing-head{grid-template-columns:auto minmax(0,1fr) 16px;margin-bottom:7px;min-height:32px;font-size:12px}
.cg-pet-surface .pet-quick-writing-head>span:first-child{font-weight:500}
.cg-pet-surface .pet-quick-writing-head .pet-companion-scope{font-size:11px;margin:0;color:var(--quick-muted);overflow:hidden;white-space:nowrap;text-overflow:ellipsis;text-align:right;min-width:0}
.cg-pet-surface .pet-quick-writing-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:12px 16px}
.cg-pet-surface .pet-quick-writing-grid strong{display:block;font-size:17px;line-height:1.5;margin-top:2px;font-variant-numeric:tabular-nums;overflow-wrap:anywhere}
.cg-pet-surface .pet-quick-writing-grid small{color:var(--quick-muted);font-size:11px;font-weight:400}
.cg-pet-surface .pet-quick-writing-extra{padding-top:12px}
.cg-pet-surface p.pet-quick-notice{font-size:12px;color:var(--quick-ink);padding:9px 10px;margin:12px 0 0;background:var(--quick-ground);border-radius:8px;overflow-wrap:anywhere}
.cg-pet-surface .pet-quick-custom{margin-top:12px;padding-top:6px;border-top:1px solid var(--quick-line);font-size:12px}
.cg-pet-surface .pet-quick-custom button:not(.pet-quick-disclosure){background:var(--quick-ground);border:0;border-radius:6px;padding:5px 8px;font-size:11px}
.cg-pet-surface .pet-quick-records{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;margin:0;width:100%;min-height:44px;padding:12px 16px;border:0;border-top:1px solid var(--quick-line);background:transparent;border-radius:0 0 17px 17px;font-size:12px;text-align:left;color:var(--quick-accent)!important;transition:background-color 120ms}
.cg-pet-surface .pet-quick-records svg{width:16px;height:16px}
.cg-pet-surface .pet-quick-records:hover{background:var(--quick-ground)}
.cg-pet-surface .pet-quick-bubble .pet-menu-actions{padding:0 10px 10px}
.cg-pet-surface .pet-quick-bubble .pet-menu-actions button{color:var(--quick-ink)}
.cg-pet-surface .pet-quick-bubble .pet-menu-actions button:hover{background:var(--quick-hover)}
.cg-pet-surface .pet-quick-bubble .pet-companion-retry{margin:10px 0 0;background:var(--quick-ground);border-color:var(--quick-line);color:var(--quick-muted)}
@keyframes cg-quick-enter{from{opacity:0}to{opacity:1}}
.cg-pet-surface[data-motion=reduce] .pet-quick-bubble,.cg-pet-surface[data-motion=reduce] .pet-quick-bubble *{animation:none;transition:none}
@media(prefers-reduced-motion:reduce){.cg-pet-surface .pet-quick-bubble,.cg-pet-surface .pet-quick-bubble *{animation:none;transition:none}}
@media(pointer:coarse){.cg-pet-surface .pet-quick-disclosure{min-height:44px}.cg-pet-surface .pet-quick-bubble .pet-companion-bubble-head button{width:44px;height:44px}}

`;

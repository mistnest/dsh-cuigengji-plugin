import React from 'react';
import poses from '../assets/pets/cuigengji-pet-poses.png';

export interface GuidanceProps {enabled?: boolean; disabled?: boolean; onToggle: () => void; plain?: boolean}
export function GuidanceToggle({enabled,disabled,onToggle,plain=false}:GuidanceProps) {
  return <button className={`guidance-toggle${plain?' guidance-toggle-plain':''}`} role="switch" aria-label="当前会话写作指引" aria-checked={enabled===true} disabled={disabled||enabled===undefined} onClick={onToggle} title="开启：自动注入核心指引和当前作品已启用的预设。关闭：通过 MCP 按需读取，AI 可能不会主动调用，可明确说“使用催更姬”。已有聊天记录保留。">
    {!plain&&<span className="guidance-face" aria-hidden="true" style={{backgroundImage:`url(${poses})`,backgroundPosition:enabled?'0 100%':'0 0'}}/>}
    <span><strong>当前会话写作指引</strong><small>{enabled===undefined?'读取中…':enabled?'已开启 · 自动提供写作提示':'已关闭 · 需要时仍可调用催更姬'}</small></span>
    <span className="guidance-track" aria-hidden="true"><i/></span>
  </button>;
}
export const guidanceStyle=`
.cuigengji .guidance-toggle{display:flex;align-items:center;gap:9px;border:0;background:transparent;padding:2px 6px;text-align:left;color:var(--cg-ink);border-radius:12px;}
.cuigengji .guidance-toggle:hover{background:color-mix(in srgb,var(--cg-accent) 6%,transparent);}
.cuigengji .guidance-face{display:block;width:44px;height:44px;flex:none;background-size:200% 200%;background-repeat:no-repeat;}
.cuigengji .guidance-toggle strong{display:block;font-size:12px;font-weight:500;}
.cuigengji .guidance-toggle small{display:block;font-size:11px;color:var(--cg-muted);margin-top:3px;}
.cuigengji .guidance-toggle-plain{width:100%;padding:10px 12px;border:1px solid var(--cg-line);background:var(--cg-paper,#fff);}
.cuigengji .guidance-toggle-plain:hover{border-color:color-mix(in srgb,var(--cg-accent) 35%,var(--cg-line));}
.cuigengji .guidance-track{width:28px;height:16px;flex:none;border-radius:12px;background:var(--cg-line);margin-left:6px;padding:2px;box-sizing:border-box;}
.cuigengji .guidance-track i{display:block;width:12px;height:12px;border-radius:50%;background:white;box-shadow:0 1px 3px #0002;transition:transform .15s;}
.cuigengji .guidance-toggle[aria-checked=true] .guidance-track{background:var(--cg-accent);}
.cuigengji .guidance-toggle[aria-checked=true] .guidance-track i{transform:translateX(12px);}
.cuigengji .welcome-book-export{flex:none;padding:8px;font-size:12px;background:transparent;border:0;color:var(--cg-muted);}
@media(prefers-reduced-motion:reduce){.cuigengji .guidance-track i{transition:none;}}
.cuigengji[data-motion=reduce] .guidance-track i{transition:none;}
`;

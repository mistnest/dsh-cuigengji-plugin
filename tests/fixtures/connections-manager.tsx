import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConnectionsManager } from '../../src/modules/author-ui/workbench/shared/settings/ExternalAccess.tsx';
import { visualStyles } from '../../src/modules/author-ui/workbench/visual.ts';
import type { FeatureCall } from '../../src/modules/author-ui/workbench/shared/workspace-state.ts';
import icon from '../../src/modules/author-ui/workbench/assets/plugin-icon.png';
export function mountConnections(call: FeatureCall) {
  document.title = 'MCP 连接管理 · 催更姬';
  createRoot(document.getElementById('root')!).render(
    <main className="cuigengji cg-preview">
      <style>
        {visualStyles +
          `
      html,body{margin:0;background:#f5f6fa;font:14px/1.55 "Inter","Microsoft YaHei",sans-serif}
      .cg-preview{max-width:1000px;margin:auto;padding:clamp(14px,4vw,38px);box-sizing:border-box}.cg-preview .preview-brand{display:flex;align-items:center;gap:9px;color:var(--cg-muted)}
      .preview-brand img{width:29px;height:29px}.cg-preview h1{font-size:27px;margin:14px 0}.cg-preview .mcp-manager{background:var(--cg-paper);padding:16px;border:1px solid var(--cg-line);border-radius:12px}
      .cg-preview button{font:inherit;cursor:pointer;border:1px solid var(--cg-line);border-radius:7px;background:var(--cg-paper);color:var(--cg-ink);padding:5px 10px}.cg-preview button.primary{background:var(--cg-accent);color:white}
      .cg-preview footer.preview-note{color:var(--cg-muted);font-size:12px;margin-top:10px}
    `}
      </style>
      <div className="preview-brand">
        <img src={icon} alt="" />
        催更姬 · AI 与写作
      </div>
      <h1>MCP 连接管理</h1>
      <ConnectionsManager call={call} />
      <footer className="preview-note">本地演示 · 仅使用示例作品库</footer>
    </main>,
  );
}

import React from 'react';
import {SettingsGroup, SettingsRow} from './SettingsRow.tsx';
import {defaults,useWorkbenchPreferences,type Preferences} from './preferences-state.tsx';
import type {SettingId} from './model.ts';
import {CanvasLinkSettings} from './CanvasLinkSettings.tsx';

export function EditorSettings({show}:{show:(id:SettingId)=>boolean}) {
  const {preferences:p,update}=useWorkbenchPreferences();
  const leadingLabel=p.leading<=1.75?'紧凑 1.7':p.leading>=2.1?'宽松 2.2':'适中 1.95';
  return <>
    <SettingsGroup title="正文排版">
      {(show('font')||show('leading'))&&<div className="reading-preview settings-reading-preview">
        <div className="settings-specimen-meta"><small>实时书页样张预览</small><span className="settings-specimen-badge">{p.fontSize}px · {leadingLabel}</span></div>
        <p style={{fontSize:p.fontSize,lineHeight:p.leading}}>雨停以后，街道重新安静下来。窗边的灯仍亮着，故事还在继续。</p>
      </div>}
      {show('font')&&<SettingsRow title="正文字号" description="正文章节的文字大小。" reset={()=>update({fontSize:defaults.fontSize})}><select aria-label="默认正文字号" value={p.fontSize} onChange={e=>update({fontSize:Number(e.target.value)})}>{[16,18,20,22].map(n=><option key={n} value={n}>{n} px</option>)}</select></SettingsRow>}
      {show('leading')&&<SettingsRow title="正文行距" description="正文段落的行间距。" reset={()=>update({leading:defaults.leading})}><select aria-label="正文行距" value={p.leading} onChange={e=>update({leading:Number(e.target.value)})}><option value={1.7}>紧凑</option><option value={1.95}>适中</option><option value={2.2}>宽松</option></select></SettingsRow>}
      {show('directory')&&<SettingsRow title="默认展开目录" description="打开新作品时默认展开左侧章节目录。" reset={()=>update({directory:defaults.directory})}><input type="checkbox" role="switch" aria-label="默认展开正文目录" checked={p.directory} onChange={e=>update({directory:e.target.checked})}/></SettingsRow>}
      {show('lineNumbers')&&<SettingsRow title="显示段落行号" description="在正文左侧标出段落行号，按 Ctrl+G 快速跳行。" reset={()=>update({lineNumbers:defaults.lineNumbers})}><input type="checkbox" role="switch" aria-label="显示正文行号" checked={p.lineNumbers} onChange={e=>update({lineNumbers:e.target.checked})}/></SettingsRow>}
    </SettingsGroup>

    <SettingsGroup title="画布与动效">
      {show('canvas-links')&&<CanvasLinkSettings/>}
      {show('canvas-scroll')&&<SettingsRow title="画布滚轮动作" description="鼠标滚轮或触控板滑动时的默认操作（按住 Ctrl 均可缩放）。" reset={()=>update({canvasScrollAction:defaults.canvasScrollAction})}><select aria-label="画布滚动操作" value={p.canvasScrollAction} onChange={e=>update({canvasScrollAction:e.target.value as Preferences['canvasScrollAction']})}><option value="zoom">缩放画布</option><option value="pan">平移画布</option></select></SettingsRow>}
      {show('motion')&&<SettingsRow title="界面动画" description="缩短或保留面板切换时的过渡动效。" reset={()=>update({motion:defaults.motion})}><select aria-label="动画效果" value={p.motion} onChange={e=>update({motion:e.target.value as Preferences['motion']})}><option value="system">正常动效</option><option value="reduce">减少动效</option></select></SettingsRow>}
    </SettingsGroup>
  </>;
}

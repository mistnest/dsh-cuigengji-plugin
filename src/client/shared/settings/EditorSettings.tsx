import React from 'react';
import {SettingsRow} from './SettingsRow.tsx';
import {defaults,useWorkbenchPreferences,type Preferences} from './preferences-state.tsx';
import type {SettingId} from './model.ts';
export function EditorSettings({show}:{show:(id:SettingId)=>boolean}) {
  const {preferences:p,update}=useWorkbenchPreferences();
  return <>
    {show('font')&&<SettingsRow title="正文字号" description="用于正文章节的阅读与编辑。" scope="此设备" reset={()=>update({fontSize:defaults.fontSize})}><select aria-label="默认正文字号" value={p.fontSize} onChange={e=>update({fontSize:Number(e.target.value)})}>{[16,18,20,22].map(n=><option key={n} value={n}>{n}</option>)}</select></SettingsRow>}
    {show('leading')&&<SettingsRow title="正文行距" description="调整段落中每行文字的间距。" reset={()=>update({leading:defaults.leading})}><select aria-label="正文行距" value={p.leading} onChange={e=>update({leading:Number(e.target.value)})}><option value={1.7}>紧凑</option><option value={1.95}>适中</option><option value={2.2}>宽松</option></select></SettingsRow>}
    {(show('font')||show('leading'))&&<div className="reading-preview settings-reading-preview"><small>阅读预览</small><p style={{fontSize:p.fontSize,lineHeight:p.leading}}>雨停以后，街道重新安静下来。窗边的灯仍亮着，故事还在继续。</p></div>}
    {show('directory')&&<SettingsRow title="默认展开正文目录" description="首次打开作品时使用这个状态，之后会记住你在每本书中的收纳习惯。" reset={()=>update({directory:defaults.directory})}><input type="checkbox" role="switch" aria-label="默认展开正文目录" checked={p.directory} onChange={e=>update({directory:e.target.checked})}/></SettingsRow>}
    {show('motion')&&<SettingsRow title="动画效果" description="减少动态效果时，工作台会缩短过渡和移动动画。" reset={()=>update({motion:defaults.motion})}><select aria-label="动画效果" value={p.motion} onChange={e=>update({motion:e.target.value as Preferences['motion']})}><option value="system">跟随系统</option><option value="reduce">减少动态效果</option></select></SettingsRow>}
  </>;
}

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import manifest from '../../../package.json' with { type: 'json' };

export interface Preferences {
  fontSize: number; leading: number; directory: boolean;
  planningView: 'canvas' | 'list'; memoryView: 'canvas' | 'list'; motion: 'system' | 'reduce';
}
export const defaults: Preferences = { fontSize: 18, leading: 1.95, directory: true, planningView: 'canvas', memoryView: 'list', motion: 'system' };
const key = 'cuigengji:workbench:preferences:v1';
function read(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(key) || '{}');
    return {fontSize: [16,18,20,22].includes(p.fontSize) ? p.fontSize : defaults.fontSize,
      leading: [1.7,1.95,2.2].includes(p.leading) ? p.leading : defaults.leading,
      directory: typeof p.directory === 'boolean' ? p.directory : defaults.directory,
      planningView: p.planningView === 'list' ? 'list' : 'canvas', memoryView: p.memoryView === 'canvas' ? 'canvas' : 'list',
      motion: p.motion === 'reduce' ? 'reduce' : 'system'};
  } catch { return defaults; }
}
const Context = createContext({ preferences: defaults, update: (_: Partial<Preferences>) => {}, error: '' });
export const useWorkbenchPreferences = () => useContext(Context);
export function PreferencesProvider({children}: {children: React.ReactNode}) {
  const [preferences, set] = useState(read), [error, setError] = useState('');
  const update = (next: Partial<Preferences>) => set(previous => {
    const value = {...previous, ...next};
    try {localStorage.setItem(key, JSON.stringify(value)); setError('');}
    catch {setError('当前浏览器无法保存偏好，本次会话仍然生效。');}
    return value;
  });
  useEffect(() => {const sync = (e: StorageEvent) => {if(e.key === key) set(read());}; window.addEventListener('storage', sync); return () => window.removeEventListener('storage', sync);}, []);
  return <Context.Provider value={{preferences, update, error}}>{children}</Context.Provider>;
}
export function Modal({title, close, children}: {title: string; close: () => void; children: React.ReactNode}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {const previous = document.activeElement as HTMLElement | null; ref.current?.showModal(); return () => {previous?.focus();};}, []);
  return <dialog className="utility-modal" ref={ref} aria-label={title} onCancel={e => {e.preventDefault();close();}}>
    <header className="utility-head"><h2>{title}</h2><button type="button" aria-label={`关闭${title}`} onClick={close}>×</button></header>
    <div className="utility-content">{children}</div>
  </dialog>;
}
export function PreferencesDialog({close}: {close: () => void}) {
  const {preferences:p, update, error} = useWorkbenchPreferences();
  return <Modal title="设置" close={close}><section className="preference-section"><h3>正文阅读</h3><div className="split">
    <label>字号<select aria-label="默认正文字号" value={p.fontSize} onChange={e=>update({fontSize:Number(e.target.value)})}>{[16,18,20,22].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
    <label>行距<select aria-label="正文行距" value={p.leading} onChange={e=>update({leading:Number(e.target.value)})}><option value={1.7}>紧凑</option><option value={1.95}>适中</option><option value={2.2}>宽松</option></select></label></div>
    <div className="reading-preview"><small>阅读预览</small><p style={{fontSize:p.fontSize,lineHeight:p.leading}}>雨停以后，街道重新安静下来。窗边的灯仍亮着，故事还在继续。</p></div></section>
    <section className="preference-section"><h3>打开工作台时</h3><label className="preference-row">默认展开目录<input type="checkbox" checked={p.directory} onChange={e=>update({directory:e.target.checked})}/></label>
      <label className="preference-row">规划默认视图<select value={p.planningView} onChange={e=>update({planningView:e.target.value as Preferences['planningView']})}><option value="canvas">流程图</option><option value="list">列表</option></select></label>
      <label className="preference-row">设定默认视图<select value={p.memoryView} onChange={e=>update({memoryView:e.target.value as Preferences['memoryView']})}><option value="list">列表</option><option value="canvas">关系图</option></select></label><p className="muted">下次进入对应页面时生效。</p></section>
    <section className="preference-section"><label className="preference-row">动画效果<select value={p.motion} onChange={e=>update({motion:e.target.value as Preferences['motion']})}><option value="system">跟随系统</option><option value="reduce">减少动态效果</option></select></label></section>
    <footer className="utility-footer"><button onClick={()=>update(defaults)}>恢复默认设置</button><small role="status">{error || '偏好自动保存在此浏览器'}</small></footer>
  </Modal>;
}
export function AboutDialog({close}: {close: () => void}) {
  return <Modal title="关于催更姬" close={close}><div className="about-identity"><h2>催更姬</h2><span className="muted">{manifest.version}</span></div><p className="about-intro">与你和写作助手一起，让故事继续。</p><dl className="about-capabilities"><dt>正文</dt><dd>专心写作，自动保存，随时回看版本。</dd><dt>规划</dt><dd>讨论下一步，把情节连成共同理解的路线。</dd><dt>设定</dt><dd>按分组查找角色与世界书，梳理彼此关系。</dd></dl><p className="muted">作品菜单中可管理写作预设与工作数据备份。阅读偏好仅保存在此浏览器；小说内容由工作数据目录独立保存。</p></Modal>;
}

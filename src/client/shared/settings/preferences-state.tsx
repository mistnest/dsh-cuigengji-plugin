import React,{createContext,useContext,useEffect,useState} from 'react';
import {defaultCanvasLinkStyle,type CanvasLinkStyle} from '../../../domain/canvas/link-style.ts';
import {defaultCanvasScrollAction,type CanvasScrollAction} from '../graph-wheel.ts';
export interface Preferences {
  fontSize: number; leading: number; directory: boolean; lineNumbers:boolean;
  motion: 'system' | 'reduce';
  canvasLinkStyle: CanvasLinkStyle;
  canvasScrollAction: CanvasScrollAction;
}
export const defaults: Preferences = { fontSize: 18, leading: 1.95, directory: true, lineNumbers:true, motion: 'system', canvasLinkStyle: defaultCanvasLinkStyle, canvasScrollAction: defaultCanvasScrollAction };
const key = 'cuigengji:workbench:preferences:v1';
function read(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(key) || '{}');
    return {fontSize: [16,18,20,22].includes(p.fontSize) ? p.fontSize : defaults.fontSize,
      leading: [1.7,1.95,2.2].includes(p.leading) ? p.leading : defaults.leading,
      directory: typeof p.directory === 'boolean' ? p.directory : defaults.directory,
      lineNumbers:typeof p.lineNumbers==='boolean'?p.lineNumbers:defaults.lineNumbers,
      motion: p.motion === 'reduce' ? 'reduce' : 'system',
      canvasLinkStyle: p.canvasLinkStyle === 'classic' ? 'classic' : defaults.canvasLinkStyle,
      canvasScrollAction: p.canvasScrollAction === 'pan' || p.canvasScrollAction === 'zoom' ? p.canvasScrollAction : defaults.canvasScrollAction};
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
  useEffect(() => {window.dispatchEvent(new Event('cuigengji:preferences-changed'));}, [preferences]);
  return <Context.Provider value={{preferences, update, error}}>{children}</Context.Provider>;
}

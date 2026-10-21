import React,{createContext,useContext,useEffect,useState} from 'react';
export interface Preferences {
  fontSize: number; leading: number; directory: boolean;
  motion: 'system' | 'reduce';
}
export const defaults: Preferences = { fontSize: 18, leading: 1.95, directory: true, motion: 'system' };
const key = 'cuigengji:workbench:preferences:v1';
function read(): Preferences {
  try {
    const p = JSON.parse(localStorage.getItem(key) || '{}');
    return {fontSize: [16,18,20,22].includes(p.fontSize) ? p.fontSize : defaults.fontSize,
      leading: [1.7,1.95,2.2].includes(p.leading) ? p.leading : defaults.leading,
      directory: typeof p.directory === 'boolean' ? p.directory : defaults.directory,
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
  useEffect(() => {window.dispatchEvent(new Event('cuigengji:preferences-changed'));}, [preferences]);
  return <Context.Provider value={{preferences, update, error}}>{children}</Context.Provider>;
}

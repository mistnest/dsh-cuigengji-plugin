import React from 'react';
import {Icon, type IconName} from '../icons.tsx';

export function SettingsGroup({title, subtitle, children}: {title?: string; subtitle?: string; children: React.ReactNode}) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (!items.length) return null;
  return <div className="settings-group">
    {(title || subtitle) && <div className="settings-group-head">{title && <span>{title}</span>}{subtitle && <strong className="settings-book-pill">{subtitle}</strong>}</div>}
    <div className="settings-group-card">{items}</div>
  </div>;
}

export function SettingsRow({title,description,scope,icon,children,reset,disabled=false,className=''}:{title:string;description:React.ReactNode;scope?:string;icon?:IconName;children:React.ReactNode;reset?:()=>void;disabled?:boolean;className?:string}) {
  return <div className={`settings-row ${className}`}>
    {icon&&<span className="settings-row-icon" aria-hidden="true"><Icon name={icon}/></span>}
    <div className="settings-row-text"><div className="settings-row-heading"><strong>{title}</strong>{scope&&<small className="settings-scope">{scope}</small>}</div>{typeof description==='string'?<p>{description}</p>:description}</div>
    <div className="settings-control">{children}{reset&&<button type="button" className="settings-reset" aria-label={`重置${title}`} title="恢复默认" disabled={disabled} onClick={reset}><Icon name="rotateCcw"/></button>}</div>
  </div>;
}

export function SettingsAction({title,description,scope,icon,actionLabel='打开',onClick,disabled=false}:{title:string;description:string;scope?:string;icon?:IconName;actionLabel?:string;onClick:()=>void;disabled?:boolean}) {
  return <SettingsRow {...{title,description,scope,icon}} className="is-action-row"><button type="button" className="settings-action" disabled={disabled} onClick={onClick} aria-label={title}>{actionLabel}<Icon name="chevronRight"/></button></SettingsRow>;
}

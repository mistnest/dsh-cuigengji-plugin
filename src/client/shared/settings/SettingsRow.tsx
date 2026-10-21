import React from 'react';
export function SettingsRow({title,description,scope,children,reset,disabled=false,className=''}:{title:string;description:React.ReactNode;scope?:string;children:React.ReactNode;reset?:()=>void;disabled?:boolean;className?:string}) {
  return <div className={`settings-row ${className}`}>
    <div className="settings-row-text"><div className="settings-row-heading"><strong>{title}</strong>{scope&&<small className="settings-scope">{scope}</small>}</div>{typeof description==='string'?<p>{description}</p>:description}</div>
    <div className="settings-control">{children}{reset&&<button type="button" className="settings-reset" aria-label={`重置${title}`} title="恢复默认值" disabled={disabled} onClick={reset}>↺</button>}</div>
  </div>;
}
export function SettingsAction({title,description,scope,onClick,disabled=false}:{title:string;description:string;scope?:string;onClick:()=>void;disabled?:boolean}) {
  return <SettingsRow {...{title,description,scope}}><button type="button" className="settings-action" disabled={disabled} onClick={onClick} aria-label={title}>打开<span aria-hidden="true">↗</span></button></SettingsRow>;
}

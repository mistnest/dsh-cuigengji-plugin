import React from 'react';
import {resetPetPosition} from './geometry.ts';
import {usePetPreferences,setPetRole,setPetVisible} from './preferences.ts';
import {retryNativePet,useNativePetStatus} from './native.tsx';
import {roles} from './model.ts';
import {SettingsRow,SettingsAction} from '../../shared/settings/SettingsRow.tsx';
import type {SettingId} from '../../shared/settings/model.ts';

export function PetSettings({onRecords,show=()=>true}:{onRecords:()=>void;show?:(id:SettingId)=>boolean}) {
  const {role,visible}=usePetPreferences();
  const native=useNativePetStatus();
  return <div className="pet-settings" aria-label="桌宠设置">
    {show('pet-visible')&&<SettingsRow title="开启桌宠" description="在桌面陪你写作，点击可查看今日进度。关闭后仍会记录写作数据。" scope="此设备"><input aria-label="开启桌宠" type="checkbox" role="switch" checked={visible} onChange={event=>setPetVisible(event.target.checked)}/></SettingsRow>}
    {show('pet-role')&&<SettingsRow title="陪伴角色" description="两位伙伴使用相同的写作记录，随时可以切换。" reset={()=>setPetRole('bigfish')}><select aria-label="陪伴角色" value={role} onChange={event=>setPetRole(event.target.value as keyof typeof roles)}>{Object.entries(roles).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></SettingsRow>}
    {show('pet-position')&&<SettingsRow title="桌宠位置" description="找不到桌宠时，把它放回屏幕右下角并显示。"><button onClick={()=>{resetPetPosition();setPetVisible(true);}}>放回右下角</button></SettingsRow>}
    {show('pet-status')&&<SettingsRow title="桌宠运行状态" description={!visible?'桌宠已关闭，写作记录仍会更新。':native.mode==='desktop'?'桌面陪伴已启动，最小化 DSH 后仍可见。':native.mode==='starting'?'正在唤醒桌面陪伴…':'当前在 DSH 窗口内陪伴。'}>{visible&&native.error?<button title={native.error} onClick={retryNativePet}>重新启动桌宠</button>:<small className="settings-runtime-state" role="status">{!visible?'已关闭':native.mode==='starting'?'启动中':native.mode==='desktop'?'桌面陪伴':'窗口内陪伴'}</small>}</SettingsRow>}
    {show('records')&&<SettingsAction title="查看写作记录" description="按日期查看字数趋势、作品明细与规划进度。" scope="作品库" onClick={onRecords}/>}
  </div>;
}

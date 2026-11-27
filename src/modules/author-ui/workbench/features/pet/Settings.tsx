import React from 'react';
import {resetPetPosition} from './geometry.ts';
import {usePetPreferences,setPetRole,setPetVisible} from './preferences.ts';
import {retryNativePet,useNativePetStatus} from './native.tsx';
import {roles} from './model.ts';
import {SettingsGroup,SettingsRow} from '../../shared/settings/SettingsRow.tsx';
import type {SettingId} from '../../shared/settings/model.ts';

export function PetSettings({show=()=>true}:{onRecords?:()=>void;show?:(id:SettingId)=>boolean}) {
  const {role,visible}=usePetPreferences();
  const native=useNativePetStatus();
  return <div className="pet-settings" aria-label="桌宠设置">
    <SettingsGroup title="桌面陪伴">
      {show('pet-visible')&&<SettingsRow title="开启桌宠" description="在屏幕角落显示陪伴角色，点击可快速看今日进度。"><input aria-label="开启桌宠" type="checkbox" role="switch" checked={visible} onChange={event=>setPetVisible(event.target.checked)}/></SettingsRow>}
      {show('pet-role')&&<SettingsRow className={!visible?'is-muted-row':''} title="陪伴角色" description="切换大肥鱼或催更姬形象。" reset={()=>setPetRole('bigfish')}><select aria-label="陪伴角色" value={role} onChange={event=>setPetRole(event.target.value as keyof typeof roles)}>{Object.entries(roles).map(([key,value])=><option key={key} value={key}>{value.name}</option>)}</select></SettingsRow>}
      {show('pet-position')&&<SettingsRow className={!visible?'is-muted-row':''} title="桌宠位置" description="找不到桌宠时移回屏幕右下角。"><button type="button" onClick={()=>{resetPetPosition();setPetVisible(true);}}>放回右下角</button></SettingsRow>}
      {show('pet-status')&&<SettingsRow title="桌宠运行状态" description={!visible?'当前已隐藏，后台仍正常统计字数。':native.mode==='desktop'?'独立桌面窗口运行中，最小化客户端也可见。':native.mode==='starting'?'正在启动独立桌面窗口…':'当前在客户端窗口内显示。'}>{visible&&native.error?<button type="button" title={native.error} onClick={retryNativePet}>重新启动桌宠</button>:<small className="settings-runtime-state" role="status">{!visible?'已关闭':native.mode==='starting'?'启动中':native.mode==='desktop'?'桌面陪伴已启动':'窗口内陪伴'}</small>}</SettingsRow>}
    </SettingsGroup>
  </div>;
}

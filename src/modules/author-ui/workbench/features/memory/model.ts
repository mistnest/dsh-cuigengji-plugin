import type {Point} from '../../../../workspace/planning/types.ts';
export type SettingStatus = 'active' | 'stale' | 'unconfirmed' | 'retired';
export type SettingFactType = 'fact' | 'belief' | 'misunderstanding' | 'unconfirmed' | 'plan';
export interface SettingIndex {id:string;revision:number;name:string;summary:string;type:'character_card'|'world_entry'|'world_book';groupId?:string|null;pageId?:string|null;position?:Point|null}
export interface SettingDocument extends SettingIndex {
  content:string;
  updatedAt?:string;
  deleted?:boolean;
  aliases?:string[];
  storyTime?:string;
  status?:SettingStatus;
  factType?:SettingFactType;
  knownBy?:string[];
  sources?:{chapterId:string;revision:number}[];
}
export interface SettingEdge {id?:string;from:string;to:string;name?:string;content?:string;revision?:number}
export const kind=(node:{type:string})=>node.type==='character_card'?'角色卡':'世界书';
export const settingFactNames:Record<SettingFactType,string>={
  fact:'既定事实',
  belief:'角色认知',
  misunderstanding:'角色误解',
  unconfirmed:'待定构想',
  plan:'后续设定',
};
export const settingStatusNames:Record<SettingStatus,string>={
  active:'生效中',
  stale:'待核对更新',
  unconfirmed:'待确认',
  retired:'已停用',
};

import type {Point} from '../../../contracts/planning.ts';
export interface SettingIndex {id:string;revision:number;name:string;summary:string;type:'character_card'|'world_entry'|'world_book';groupId?:string|null;pageId?:string|null;position?:Point|null}
export interface SettingDocument extends SettingIndex {content:string}
export interface SettingEdge {id?:string;from:string;to:string;name?:string;content?:string;revision?:number}
export const kind=(node:{type:string})=>node.type==='character_card'?'角色卡':'世界书';

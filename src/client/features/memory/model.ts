import type {Point} from '../../../contracts/planning.ts';
import type {RelationKind} from '../../../contracts/transfer.ts';
export interface SettingIndex {id:string;revision:number;name:string;summary:string;type:'character_card'|'world_entry'|'world_book';groupId?:string|null;pageId?:string|null;position?:Point|null}
export interface SettingDocument extends SettingIndex {content:string}
export interface SettingEdge {id?:string;from:string;to:string;name?:string;content?:string;kind?:RelationKind;revision?:number}
export const kind=(node:{type:string})=>node.type==='character_card'?'角色卡':'世界书';
export const relationKindNames:Record<Exclude<RelationKind,never>,string>={'':'未分类',family:'亲属',alliance:'结盟',hostile:'敌对',location:'居住/位于',membership:'隶属',other:'其他'};
export const relationKindOf=(edge:{kind?:RelationKind|null}):RelationKind=>edge.kind??'';

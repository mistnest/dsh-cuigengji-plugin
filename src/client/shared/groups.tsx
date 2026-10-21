import React from 'react';
import type {Group} from '../../domain/memory/groups.ts';
import {groupRows} from '../../domain/directory/groups.ts';

export type GroupItem = Pick<Group,'id'|'name'|'summary'|'revision'|'parentId'|'pageId'|'position'>;
export const filterGroup=(value:string):string|null|undefined=>value==='__ungrouped'?null:value||undefined;
/** Directory membership is independent from entry type, canvas and story relationships. */
export function GroupSelect({groups,value,onChange}:{groups:GroupItem[];value?:string|null;onChange:(id:string|null)=>void}){
  return <label>文件夹<select value={value||''} onChange={event=>onChange(event.target.value||null)}><option value="">根目录</option>{groupRows(groups).map(({group,label})=><option key={group.id} value={group.id}>{label}</option>)}</select></label>;
}

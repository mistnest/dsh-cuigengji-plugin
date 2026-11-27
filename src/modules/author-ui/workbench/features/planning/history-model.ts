import type {Change, NodeIndex} from '../../../../workspace/planning/types.ts';
import {scopeNames,statusNames,edgeNames} from './model.ts';
export function describe(value: Change["before"], nodes: Pick<NodeIndex,"id" | "title">[]) {
 if(!value)return '不存在（本次新增）';
 if('pruned' in value)return `版本 ${value.revision} 已清理`;
 if('kind' in value)return `批注：${value.title}\n${value.content}\n${value.width} × ${value.height} · ${value.color} · ${value.fontSize}`;
 if('name' in value)return `名称：${value.name}\n${value.summary||''}${value.deleted?'\n已删除':''}`;
 if('from' in value)return `${nodes.find(n=>n.id===value.from)?.title||value.from} → ${edgeNames[value.type]} → ${nodes.find(n=>n.id===value.to)?.title||value.to}\n${value.label||''}${value.deleted?'\n已删除':''}`;
 if(![value.threads,value.chapterRefs,value.memoryRefs].every(Array.isArray))return '此版本记录不完整，无法显示内容';
 return [`标题：${value.title}`,`范围：${scopeNames[value.scope]} · 进展：${statusNames[value.status]}`,`所属：${nodes.find(n=>n.id===value.parentId)?.title||value.parentId||'全书'}`,`故事线：${value.threads.join('、')||'未指定'}`,`概述：${value.summary}`,value.content,`正文引用：${value.chapterRefs.map(r=>`${r.chapterId} · 版本${r.revision}`).join('；')||'无'}`,`设定引用：${value.memoryRefs.join('、')||'无'}`,value.deleted?'已删除':''].filter(Boolean).join('\n');
}

export function changeSummary(change: Change) {
 if((change.before && 'pruned' in change.before)||'pruned' in change.after)return '历史内容已清理';
 if(!change.before)return '新增';
 const labels={pageId:'所属页面',width:'宽度',height:'高度',fontSize:'字号',fontFamily:'字体',color:'底色',groupId:'所属分组',position:'画布位置',name:'分组名称',title:'标题',summary:'概述',content:'详细内容',scope:'范围',status:'进展',parentId:'所属阶段',threads:'故事线',chapterRefs:'正文引用',memoryRefs:'设定引用',deleted:'删除状态',from:'起点',to:'终点',type:'关系类型',label:'关系说明'};
 return Object.entries(labels).filter(([key])=>JSON.stringify(Reflect.get(change.before!,key))!==JSON.stringify(Reflect.get(change.after,key))).map(([,label])=>label).join('、')||'版本更新';
}

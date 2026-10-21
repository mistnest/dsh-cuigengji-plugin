import {scopeNames,statusNames,edgeNames} from './model.ts';
export function describe(value,nodes) {
 if(value?.kind==='note'||value?.kind==='frame')return `批注：${value.title}\n${value.content}\n${value.width} × ${value.height} · ${value.color} · ${value.fontSize}`;
 if(value?.name!==undefined)return `名称：${value.name}\n${value.summary||''}${value.deleted?'\n已删除':''}`;
 if(!value)return '不存在（本次新增）';
 if(value.from)return `${nodes.find(n=>n.id===value.from)?.title||value.from} → ${edgeNames[value.type]} → ${nodes.find(n=>n.id===value.to)?.title||value.to}\n${value.label||''}${value.deleted?'\n已删除':''}`;
 return [`标题：${value.title}`,`范围：${scopeNames[value.scope]} · 进展：${statusNames[value.status]}`,`所属：${nodes.find(n=>n.id===value.parentId)?.title||value.parentId||'全书'}`,`故事线：${value.threads.join('、')||'未指定'}`,`概述：${value.summary}`,value.content,`正文引用：${value.chapterRefs.map(r=>`${r.chapterId} · 版本${r.revision}`).join('；')||'无'}`,`设定引用：${value.memoryRefs.join('、')||'无'}`,value.deleted?'已删除':''].filter(Boolean).join('\n');
}

export function changeSummary(change) {
 if(!change.before)return '新增';
 const labels={pageId:'所属页面',width:'宽度',height:'高度',fontSize:'字号',fontFamily:'字体',color:'底色',groupId:'所属分组',position:'画布位置',name:'分组名称',title:'标题',summary:'概述',content:'详细内容',scope:'范围',status:'进展',parentId:'所属阶段',threads:'故事线',chapterRefs:'正文引用',memoryRefs:'设定引用',deleted:'删除状态',from:'起点',to:'终点',type:'关系类型',label:'关系说明'};
 return Object.entries(labels).filter(([key])=>JSON.stringify(change.before[key])!==JSON.stringify(change.after[key])).map(([,label])=>label).join('、')||'版本更新';
}

// Shared by the DSH wrapper and the internal MCP tools. Optional fields belong
// to different actions; the domain layer validates the selected action.
export const memoryArgsSchema = {
  type:'object',additionalProperties:true,
  description:'默认使用本会话当前作品；显式 novelId 仅指定本次操作。设定用文件夹组织，不另建画布页。graph.* 直接使用这些字段；DSH cuigengji_memory 用 {action,args} 包装。',
  properties:{
    novelId:{type:'string',description:'本次目标作品 ID，不改变会话焦点；可以在未选择当前作品时使用'},
    nodeId:{type:'string',description:'graph.get/update/delete/history/restore/continue 的设定 ID'},
    edgeId:{type:'string',description:'edge.get/update/delete 的关系 ID'},
    groupId:{oneOf:[{type:'string'},{type:'null'}],description:'目标文件夹；null 为根目录。graph.list 省略时查全书，指定文件夹时含其子夹'},
    parentId:{oneOf:[{type:'string'},{type:'null'}],description:'graph.group.create/update 的父文件夹 ID，null 为顶层；不是人物关系或剧情父节点'},
    query:{type:'string',description:'graph.list 按名称、别名、摘要与当前正文检索；返回值不含正文和历史'},
    type:{type:'string',enum:['character_card','world_entry','world_book'],description:'人物用 character_card，地点/规则/组织用 world_entry；world_book 为旧类型'},
    name:{type:'string',description:'资源、关系或文件夹名称'},
    summary:{type:'string',description:'当前资源或文件夹的检索摘要，不代替正文'},
    content:{type:'string',description:'完整正文。更新会替换原文，先读取当前全文并合并'},
    expectedRevision:{type:'integer',description:'目标资源、关系或文件夹刚读取的版本；批量操作在 members 内逐项提供'},
    requestId:{type:'string',description:'一次修改的唯一标识，同一请求原样重试复用'},
    members:{type:'array',description:'graph.move/group.create/arrange/duplicate/remove 的资源及其版本，最多 200 项；group.create 可省略表示空文件夹',items:{
      type:'object',additionalProperties:true,properties:{id:{type:'string'},expectedRevision:{type:'integer'}},
    }},
    mode:{type:'string',enum:['missing','all'],description:'graph.arrange 默认 missing，仅安放未定位对象；作者要求整理时才用 all'},
    revision:{type:'integer',description:'graph.history 要读取的单个历史版本；读取历史全文时必须指定'},
    includeContent:{type:'boolean',description:'graph.history 默认 false，仅返回历史摘要；true 时须同时提供 revision'},
    targetRevision:{type:'integer',description:'graph.restore 要恢复的历史版本；仍须 expectedRevision 核对当前版本'},
    from:{type:'string',description:'edge.create 的起点设定 ID'},
    to:{type:'string',description:'edge.create 的终点设定 ID'},
    side:{type:'string',enum:['in','out'],description:'graph.continue 默认 out 为原卡→新卡，in 为新卡→原卡'},
    value:{type:'object',additionalProperties:true,description:'graph.continue 新卡的 type/name/summary/content 等字段；继承原卡文件夹'},
    confirm:{type:'boolean',description:'删除或批量断线须为 true；已有作者授权无需重复询问'},
    reason:{type:'string',description:'记录本次修改缘由'},
  },
};

export function memoryActionDescription(action) {
  const hints = {
    'graph.workspace.ensure':'将旧设定页无损归入同名文件夹，返回旧 pageId 到新 groupId 的映射；之后重新读取目录与版本。可安全重复，不是普通读取的前置门禁。',
    'graph.groups':'读取嵌套资源目录及 path；文件夹就是界面的画布查看范围。',
    'graph.list':'按名称、别名、摘要或当前正文检索，只返回当前索引，不返回正文和历史。groupId 指定文件夹时包含子夹，省略为全书。',
    'graph.get':'读取一份设定的当前全文及 revision；不自动读取历史。',
    'graph.group.create':'创建文件夹，parentId 为父文件夹；可用 members 原子收纳已有资源，保留其 ID、正文和关系。',
    'graph.group.update':'修改文件夹名称、摘要或 parentId；用 groupId 与 expectedRevision 指定原文件夹。',
    'graph.group.delete':'删除文件夹并将内容上移，保留资源；须 groupId、expectedRevision、confirm:true。',
    'graph.move':'用 groupId 和 members:[{id,expectedRevision}] 调整归属，不改正文或坐标；null 为根目录。',
    'graph.history':'按作者明确的追溯请求读取历史摘要；includeContent:true 必须同时指定单个 revision，旧版不作为当前事实。',
    'graph.restore':'用 nodeId、expectedRevision、targetRevision 恢复为新的当前版本，保留历史。',
  };
  const hint = action==='graph.pages'||action.startsWith('graph.page.')
    ? '仅为旧版兼容保留；新资源组织使用 graph.groups 和 graph.group.*，不要另建设定画布页。'
    : hints[action]||'修改前读取目标和版本，只提交所需字段；全文更新须保留作者原文。';
  return `${action}。显式 novelId 指定本次作品，否则使用会话当前作品，无需面板绑定。${hint}`;
}

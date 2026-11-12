// MCP uses JSON Schema. DSH's value-schema DSL marks required properties on
// the property itself; derive that shape below from the same field contract.
// Optional fields belong to different actions; the domain validates each one.
export const memoryArgsSchema = {
  type:'object',additionalProperties:true,
  description:'默认使用本会话当前作品；显式 novelId 仅指定本次操作。设定用文件夹组织，不另建画布页。graph.* 直接使用这些字段；DSH cuigengji_memory 用 {action,args} 包装。',
  properties:{
    novelId:{type:'string',description:'本次目标作品 ID，不改变会话焦点；可以在未选择当前作品时使用'},
    nodeId:{type:'string',description:'graph.get/update/delete/history/restore/continue 的设定 ID'},
    chapterId:{type:'string',description:'graph.get 渲染变量所处的章节；写前文时明确指定'},chapterRevision:{type:'integer',description:'已读取的章节版本，至少为 1'},
    position:{oneOf:[{type:'string',enum:['start','end']},{type:'object',additionalProperties:false,properties:{x:{type:'number'},y:{type:'number'}},required:['x','y']},{type:'null'}],description:'graph.get 的变量时点用 start/end；graph.create/update 的画布坐标用 {x,y}，null 清除坐标'},
    edgeId:{type:'string',description:'edge.get/update/delete 的关系 ID'},
    groupId:{oneOf:[{type:'string'},{type:'null'}],description:'graph.groups 返回的真实文件夹 ID；graph.list 省略查全书，指定 ID 含子夹，null 只查根目录直接卡片。不改变作者的界面范围'},
    parentId:{oneOf:[{type:'string'},{type:'null'}],description:'graph.group.create/update 的父文件夹 ID，null 为顶层；不是人物关系或剧情父节点'},
    query:{type:'string',description:'graph.list 按名称、别名、摘要与当前正文检索；返回值不含正文和历史'},
    type:{type:'string',enum:['character_card','world_entry','world_book'],description:'人物用 character_card，地点/规则/组织用 world_entry；world_book 为旧类型'},
    name:{type:'string',description:'资源、关系或文件夹名称'},
    summary:{type:'string',description:'当前检索摘要；修改涉及摘要中的事实时同次更新，避免旧描述继续被检索。不代替正文'},
    content:{type:'string',description:'完整正文，更新时整体替换；可按作者要求删减、重组或重写。只改一处优先 patch，与 content 二选一'},
    patch:{type:'object',additionalProperties:false,properties:{
      oldText:{type:'string',description:'刚读取的原始 content 中唯一匹配的非空原文，必要时多带上下文'},
      newText:{type:'string',description:'替换后的文字；空字符串删除这段描述，保留整张卡'},
    },required:['oldText','newText'],description:'graph.update 的局部替换；按字面匹配，不执行正则。可同时更新 summary 等字段；原文不存在或重复时报 PATCH_CONFLICT'},
    status:{type:'string',enum:['active','stale','unconfirmed','retired'],description:'资源或关系状态；retired 仍可检索，作者要求删除整卡用 graph.delete'},
    factType:{type:'string',enum:['fact','belief','misunderstanding','unconfirmed','plan']},
    storyTime:{type:'string',description:'设定适用的故事阶段'},
    aliases:{type:'array',items:{type:'string'},description:'别名，更新时整体替换'},
    sources:{type:'array',items:{type:'object',additionalProperties:false,properties:{chapterId:{type:'string'},revision:{type:'integer'}},required:['chapterId','revision']},description:'已保存正文版本引用；作者直接规定的设定无需编造来源'},
    knownBy:{type:'array',items:{type:'string'},description:'知情角色 ID；更新时整体替换'},
    dependsOn:{type:'array',items:{type:'string'},description:'依赖的设定 ID；更新时整体替换'},
    includeDeleted:{type:'boolean',description:'graph.list/edge.list 可显式包含软删除项；普通检索默认排除'},
    expectedRevision:{type:'integer',description:'目标资源、关系或文件夹刚读取的版本；批量操作在 members 内逐项提供'},
    requestId:{type:'string',description:'一次修改的唯一标识，同一请求原样重试复用'},
    members:{type:'array',description:'graph.move/group.create/arrange/duplicate/remove 的资源及其版本，最多 200 项；group.create 可省略表示空文件夹',items:{
      type:'object',additionalProperties:true,properties:{id:{type:'string'},expectedRevision:{type:'integer'}},
    }},
    mode:{type:'string',enum:['missing','all'],description:'graph.arrange 默认 missing，仅安放未定位对象；作者要求整理时才用 all'},
    revision:{type:'integer',description:'graph.history 要读取的单个历史版本；读取历史全文时必须指定'},
    includeContent:{type:'boolean',description:'graph.history 默认 false，仅返回历史摘要；true 时须同时提供 revision'},
    targetRevision:{type:'integer',description:'graph.restore 要恢复的历史版本；仍须 expectedRevision 核对当前版本'},
    restoreScope:{type:'string',enum:['all','content'],description:'graph.restore 默认 all；content 只恢复内容属性与证据，保留当前文件夹与画布归属，不恢复已删除的卡片'},
    from:{type:'string',description:'edge.create 的起点设定 ID'},
    to:{type:'string',description:'edge.create 的终点设定 ID'},
    kind:{type:'string',enum:['','family','alliance','hostile','location','membership','other'],description:'edge.create/update 的关系类型：family 亲属、alliance 结盟/友协、hostile 敌对、location 居住/位于、membership 隶属组织、other 其他；空字符串清除类型。名称仍是自由文本，类型只用于分组与画布线型'},
    side:{type:'string',enum:['in','out'],description:'graph.continue 默认 out 为原卡→新卡，in 为新卡→原卡'},
    value:{type:'object',additionalProperties:true,description:'graph.continue 新卡的 type/name/summary/content 等字段；继承原卡文件夹'},
    confirm:{type:'boolean',description:'删除或批量断线须为 true；已有作者授权无需重复询问'},
    reason:{type:'string',description:'记录本次修改缘由'},
  },
};

function nativeValueSchema(value) {
  if(Array.isArray(value))return value.map(nativeValueSchema);
  if(!value||typeof value!=='object')return value;
  const result=Object.fromEntries(Object.entries(value).filter(([key])=>key!=='required').map(([key,item])=>[key,nativeValueSchema(item)]));
  if(Array.isArray(value.required))for(const key of value.required)result.properties[key].required=true;
  return result;
}
export const memoryDshArgsSchema=nativeValueSchema(memoryArgsSchema);

export function memoryActionDescription(action) {
  const hints = {
    'graph.workspace.ensure':'将旧设定页无损归入同名文件夹，返回旧 pageId 到新 groupId 的映射；之后重新读取目录与版本。可安全重复，不是普通读取的前置门禁。',
    'graph.groups':'读取嵌套资源目录及 path；文件夹就是界面的画布查看范围。',
    'graph.list':'按名称、别名、摘要或当前正文检索，只返回当前索引，不返回正文和历史。groupId 指定文件夹时包含子夹，省略为全书，null 只查根目录直接卡片。',
    'graph.get':'读取当前原文 content 和 revision；启用变量时另附 renderedContent 与状态版本，创作参考渲染值，编辑保留原始取值宏。写前文带 chapterId/position；不自动读取历史。',
    'graph.create':'为独立新对象创建设定；补充、纠正或删减已有对象用 graph.update，保留原卡 ID。',
    'graph.update':'修改原卡：nodeId、expectedRevision、requestId，加 patch:{oldText,newText} 或完整 content。newText:"" 删除卡内描述；可按授权删减重组，并同步受影响的摘要。返回 changed、changedFields、previousRevision 和当前 revision/content；changed:false 表示未变化，不新增版本。写错参数明确报错。',
    'graph.delete':'软删除整卡及相连关系，保留历史；须 nodeId、expectedRevision、confirm:true、requestId。作者已要求删除即可执行。返回 deleted、changed、deletedEdgeIds；回读 deleted:true 或普通列表不再出现即可核验，不能用 retired 代替删除。',
    'graph.remove':'批量软删除指定卡片及相连边，保留历史；用 members:[{id,expectedRevision}]、confirm:true、requestId。逐项返回删除状态；仅删卡内文字时用 graph.update 的 patch。',
    'graph.group.create':'创建文件夹，parentId 为父文件夹；可用 members 原子收纳已有资源，保留其 ID、正文和关系。',
    'graph.group.update':'修改文件夹名称、摘要或 parentId；用 groupId 与 expectedRevision 指定原文件夹。',
    'graph.group.delete':'删除文件夹并将内容上移，保留资源；须 groupId、expectedRevision、confirm:true。',
    'graph.move':'用 groupId 和 members:[{id,expectedRevision}] 调整归属，不改正文或坐标；null 为根目录。',
    'graph.history':'按作者明确的追溯请求读取历史摘要；includeContent:true 必须同时指定单个 revision，旧版不作为当前事实。',
    'graph.restore':'用 nodeId、expectedRevision、targetRevision 恢复为新的当前版本，保留历史。只恢复内容且沿用当前目录时加 restoreScope:"content"；省略为完整恢复。',
    'edge.update':'修改已有关系的名称、类型、内容或端点；用 edgeId、expectedRevision、requestId，保留本次未涉及的字段。',
    'edge.delete':'删除一条关系而保留两端卡片；用 edgeId、expectedRevision、confirm:true、requestId。',
  };
  const hint = action==='graph.pages'||action.startsWith('graph.page.')
    ? '仅为旧版兼容保留；新资源组织使用 graph.groups 和 graph.group.*，不要另建设定画布页。'
    : hints[action]||'修改前读取目标和版本，只提交所需字段；作者授权的编辑可删减、替换或重组，保留未涉及且仍有效的信息。';
  return `${action}。显式 novelId 指定本次作品，否则使用会话当前作品，无需面板绑定。${hint}`;
}

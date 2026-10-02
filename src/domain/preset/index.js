const object = v => v && typeof v === 'object' && !Array.isArray(v);
const fail = message => { throw Object.assign(new Error(message), {code:'INVALID_PRESET'}); };
export function presetBlockReason(block) {
  return block.marker && !block.content?.trim() ? '动态占位条目没有提示词正文，内容由催更姬按自己的方式读取' : '';
}
export function presetBlockNotice(block) {
  if (presetBlockReason(block)) return presetBlockReason(block);
  return /\{\{|\}\}/.test(block.content) ? '含酒馆宏或占位符：按原文保留，不执行替换；可在下方改成明确的写作要求。' : '';
}
function source(input) {
  if (!object(input) || JSON.stringify(input).length > 2_000_000) fail('预设必须是小于 2 MB 的 JSON 对象');
  if (Array.isArray(input.prompts)) return {data:input,format:'chat-completion'};
  if (object(input.data) && Array.isArray(input.data.prompts)) return {data:input.data,format:'prompt-manager'};
  if (typeof input.content === 'string' || typeof input.system_prompt === 'string') {
    const fields=[['content','主要提示词'],['system_prompt','系统提示词'],['post_history','补充要求'],['post_history_instructions','补充指令']];
    for(const [key] of fields)if(input[key]!==undefined&&typeof input[key]!=='string')fail(`${key} 必须是文本`);
    const prompts=fields.filter(([key])=>typeof input[key]==='string').map(([key,name])=>({identifier:key,name,content:input[key],enabled:true}));
    return {data:{prompts},format:'system-prompt'};
  }
  if ('story_string' in input || 'input_sequence' in input || 'output_sequence' in input) fail('这是上下文装填或 Instruct 分隔模板，没有独立提示词正文。请选择完整 Chat Completion 预设、提示词管理器导出或系统提示词文件。');
  fail('未找到提示词内容。支持含 prompts 的完整预设、提示词管理器导出，以及含 content 的系统提示词 JSON；仅采样参数的文件不包含提示词。');
}
// Shared UI/backend normalization for nested and flat Prompt Manager orders.
export function presetImportOrders(input) {
  const {data}=source(input),orders=data.prompt_order;
  if(orders===undefined||orders===null)return [];
  if(!Array.isArray(orders))fail('prompt_order 必须是数组');
  if(!orders.length)return [];
  if(orders.every(v=>object(v)&&typeof v.identifier==='string'))return [{character_id:'flat',order:orders}];
  if(!orders.every(v=>object(v)&&v.character_id!==undefined&&Array.isArray(v.order)))fail('提示词排列结构无效');
  if(new Set(orders.map(v=>String(v.character_id))).size!==orders.length)fail('提示词排列方案标识重复');
  return orders;
}
export function importPreset(input, orderId) {
  const {data,format}=source(input);
  if (data.prompts.length > 500) fail('最多支持 500 个提示词条目');
  const orders=presetImportOrders(input);
  const order = orderId !== undefined ? orders.find(v=>String(v.character_id)===String(orderId)) : orders.find(v=>String(v.character_id)==='100001') || (orders.length===1?orders[0]:null);
  if (orders.length && !order) fail('存在多个提示词排列，请先选择排列方案');
  const map = new Map();
  for (const p of data.prompts) {
    if (!object(p) || typeof p.identifier !== 'string' || !p.identifier || map.has(p.identifier)) fail('条目标识缺失或重复');
    if (p.content !== undefined && typeof p.content !== 'string') fail('提示词 content 必须是文本');
    if (p.enabled !== undefined && typeof p.enabled !== 'boolean') fail('提示词 enabled 必须是布尔值');
    map.set(p.identifier,p);
  }
  const seen = new Set(); const blocks = [], missing=[];
  function add(p,enabled) {
    if (seen.has(p.identifier)) return;
    seen.add(p.identifier);
    const block = { identifier:p.identifier, name:typeof p.name==='string'?p.name:p.identifier, content:p.content||'', role:p.role||'system', marker:p.marker===true,
      injection_position:p.injection_position ?? 0, injection_trigger:p.injection_trigger ?? [], enabled:enabled===true };
    const reason=presetBlockReason(block);
    blocks.push({...block,enabled:enabled===true&&!reason,importWarning:presetBlockNotice(block)});
  }
  if (order) for (const item of order.order) {
    if(!object(item)||typeof item.identifier!=='string'||(item.enabled!==undefined&&typeof item.enabled!=='boolean'))fail('提示词排列条目无效');
    if (!map.has(item.identifier)) {
      // Prompt Manager exports custom prompts without built-in runtime markers.
      if(format==='prompt-manager'){missing.push(item.identifier);continue;}
      fail(`排列引用了不存在的条目：${item.identifier}`);
    }
    add(map.get(item.identifier),item.enabled??map.get(item.identifier).enabled??true);
  }
  for (const p of data.prompts) add(p,order?false:p.enabled!==false);
  const warnings=['导入后整体停用，核对后启用并保存。启用条目的正文按当前列表顺序加入写作要求。', '仅使用提示词内容；酒馆消息角色、触发、插入深度及装填规则不执行。模型和采样参数由 DSH 管理，原始文件随备份保留。'];
  if(blocks.some(b=>/\{\{|\}\}/.test(b.content)))warnings.push('宏与占位符按原文保留，不执行。需要替换角色名或用户称谓时，请直接编辑提示词内容。');
  if(missing.length)warnings.push(`排列中有 ${missing.length} 项未随文件导出，已跳过这些引用；未编造其提示词内容。`);
  const result={name:typeof input.name==='string'&&input.name.trim()?input.name:typeof data.name==='string'&&data.name.trim()?data.name:'导入的写作预设',enabled:false,blocks,raw:input,importFormat:format,warnings};
  validatePreset(result);
  return result;
}
export function validatePreset(value) {
  if (JSON.stringify(value)?.length > 2_000_000) fail('预设总大小超过 2 MB');
  if (!object(value) || typeof value.name!=='string' || !value.name.trim() || typeof value.enabled!=='boolean' || !Array.isArray(value.blocks) || value.blocks.length>500) fail('预设格式无效');
  if(value.importFormat!==undefined&&!['chat-completion','prompt-manager','system-prompt'].includes(value.importFormat))fail('预设导入格式标识无效');
  const ids=new Set();let length=0;
  for (const block of value.blocks) {
    if (!object(block)||typeof block.identifier!=='string'||ids.has(block.identifier)||typeof block.content!=='string'||typeof block.name!=='string'||typeof block.enabled!=='boolean') fail('预设条目无效或标识重复');
    ids.add(block.identifier);length+=block.content.length;
  }
  if(length>100000) fail('提示词总长度不能超过 100000 字符');
  return value;
}
export function compilePreset(preset) {
  if (!preset?.enabled) return '';
  validatePreset(preset);
  return preset.blocks.filter(block=>block.enabled&&block.content.trim()).map(block=>block.content).join('\n\n');
}

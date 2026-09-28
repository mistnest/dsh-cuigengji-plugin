const object = v => v && typeof v === 'object' && !Array.isArray(v);
const fail = message => { throw Object.assign(new Error(message), {code:'INVALID_PRESET'}); };
export function presetBlockReason(block) {
  if (block.marker) return '酒馆动态占位条目由 DSH 自身上下文管理';
  if (block.role !== 'system') return '暂不支持模拟 user / assistant 消息';
  if (block.injection_position !== undefined && block.injection_position !== 0) return '暂不支持插入聊天历史指定深度';
  if (block.injection_trigger?.length) return '暂不支持按生成事件触发';
  if (/\{\{|\}\}/.test(block.content)) return '包含尚未适配的酒馆宏，请改成明确文本后启用';
  return '';
}
export function importPreset(input, orderId) {
  if (!object(input) || JSON.stringify(input).length > 2_000_000) fail('预设必须是小于 2 MB 的 JSON 对象');
  if (!Array.isArray(input.prompts)) fail('请选择包含 prompts 的酒馆 Chat Completion 预设；暂不支持 Instruct 模板或仅采样参数的预设');
  if (input.prompts.length > 500) fail('最多支持 500 个提示词条目');
  const orders = Array.isArray(input.prompt_order) ? input.prompt_order : [];
  const order = orderId !== undefined ? orders.find(v=>String(v.character_id)===String(orderId)) : orders.find(v=>v.character_id===100001) || (orders.length===1?orders[0]:null);
  if (orders.length && !order) fail('存在多个提示词排列，请先选择排列方案');
  if (order && !Array.isArray(order.order)) fail('prompt_order.order 必须是数组');
  const map = new Map();
  for (const p of input.prompts) {
    if (!object(p) || typeof p.identifier !== 'string' || !p.identifier || map.has(p.identifier)) fail('条目标识缺失或重复');
    if (p.content !== undefined && typeof p.content !== 'string') fail('提示词 content 必须是文本');
    map.set(p.identifier,p);
  }
  const seen = new Set(); const blocks = [];
  function add(p,enabled) {
    if (seen.has(p.identifier)) return;
    seen.add(p.identifier);
    const block = { identifier:p.identifier, name:typeof p.name==='string'?p.name:p.identifier, content:p.content||'', role:p.role||'system', marker:p.marker===true,
      injection_position:p.injection_position ?? 0, injection_trigger:p.injection_trigger ?? [], enabled:enabled===true };
    const reason=presetBlockReason(block);
    blocks.push({...block,enabled:enabled===true&&!reason,importWarning:reason});
  }
  if (order) for (const item of order.order) {
    if (!map.has(item.identifier)) fail(`排列引用了不存在的条目：${item.identifier}`);
    add(map.get(item.identifier),item.enabled);
  }
  for (const p of input.prompts) add(p,order?false:p.enabled===true);
  return {name:typeof input.name==='string'?input.name:'导入的酒馆预设',enabled:false,blocks,raw:input,
    warnings:['导入后默认停用，请核对条目并保存启用。启用的兼容文本按列表顺序提供给写作助手按需读取，不自动加入系统提示词。', '温度、top_p、模型、token 上限等采样配置未应用；请在 DSH 模型设置中配置。', '聊天历史插入、消息角色模拟、动态占位和宏暂不兼容，对应条目保持停用；原始字段随备份保存。']};
}
export function validatePreset(value) {
  if (JSON.stringify(value)?.length > 2_000_000) fail('预设总大小超过 2 MB');
  if (!object(value) || typeof value.name!=='string' || !value.name.trim() || typeof value.enabled!=='boolean' || !Array.isArray(value.blocks) || value.blocks.length>500) fail('预设格式无效');
  const ids=new Set();let length=0;
  for (const block of value.blocks) {
    if (!object(block)||typeof block.identifier!=='string'||ids.has(block.identifier)||typeof block.content!=='string'||typeof block.name!=='string'||typeof block.enabled!=='boolean') fail('预设条目无效或标识重复');
    ids.add(block.identifier);length+=block.content.length;
    if(block.enabled&&presetBlockReason(block)) fail(`${block.name}：${presetBlockReason(block)}`);
  }
  if(length>100000) fail('提示词总长度不能超过 100000 字符');
  return value;
}
export function compilePreset(preset) {
  if (!preset?.enabled) return '';
  validatePreset(preset);
  return preset.blocks.filter(block=>block.enabled&&block.content.trim()).map(block=>block.content).join('\n\n');
}

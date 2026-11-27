import { PLANNING_OPERATIONS, type Operation } from '../types.ts';

const record = (value:unknown):value is Record<string,unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const supported = new Set<string>(PLANNING_OPERATIONS);
const fail = (index:number,message:string):never => {
  throw Object.assign(new Error(`operations[${index}]：${message}`),{code:'INVALID_INPUT'});
};

// Accept the unambiguous shapes observed in agent calls. Never invent a target,
// revision or deletion confirmation; conflicting control fields are rejected.
export function normalizePlanningOperations(input:unknown):Operation[] {
  if(!Array.isArray(input)||!input.length||input.length>200) {
    throw Object.assign(new Error('请提供 1–200 个规划操作：operations:[{op,id,expectedRevision,value}]'),{code:'INVALID_INPUT'});
  }
  return input.map((raw,index) => {
    if(!record(raw))return fail(index,'操作必须是对象，如 {op:"node.update",id,expectedRevision,value}');
    if(raw.op!==undefined&&raw.action!==undefined&&raw.op!==raw.action)fail(index,'op 与 action 不一致，请明确要执行的操作');
    const name=raw.op??raw.action;
    if(typeof name!=='string'||!supported.has(name))return fail(index,'请用 op 指定操作，如 node.create、node.update 或 edge.create');
    const op:Record<string,unknown>={...raw,op:name};
    delete op.action;
    const updating=name.endsWith('.update'),deleting=name.endsWith('.delete');
    if((updating||(!deleting&&name!=='node.create'))&&!record(raw.value))fail(index,'value 必须是对象，只放待保存的字段');
    if(raw.value!==undefined&&!record(raw.value))fail(index,'value 必须是对象');
    if(record(raw.value))op.value={...raw.value};
    if(updating||deleting) {
      const value=record(op.value)?op.value:{};
      const select=(field:string,candidates:unknown[]) => {
        const present=candidates.filter(item=>item!==undefined);
        if(present.some(item=>item!==present[0]))fail(index,`${field} 出现不同的值，请保留唯一值并放在与 op 同一层`);
        return present[0];
      };
      op.id=select('id',[raw.id,name.startsWith('node.')?raw.nodeId:undefined,value.id]);
      op.expectedRevision=select('expectedRevision',[raw.expectedRevision,value.expectedRevision]);
      if(typeof op.id!=='string'||!op.id.trim())fail(index,'缺少 id。apply 操作用 id；planning.get/continue 才用 nodeId。id 与 op 同层');
      if(!Number.isSafeInteger(op.expectedRevision)||typeof op.expectedRevision!=='number'||op.expectedRevision<0)fail(index,'缺少有效 expectedRevision，请先读取对象版本；它与 op 同层，不放在 value 内');
      delete op.nodeId;
      delete value.id;
      delete value.expectedRevision;
    }
    if(op.ref!==undefined&&(typeof op.ref!=='string'||!op.ref.trim()))fail(index,'ref 必须是非空字符串，后续操作直接引用，不加 $');
    if(name==='edge.create') {
      const value=op.value as Record<string,unknown>;
      if(typeof value.from!=='string'||!value.from.trim()||typeof value.to!=='string'||!value.to.trim())fail(index,'edge.create 需要 value:{from,to}，端点使用真实 ID 或本次已创建的 ref');
    }
    return op as unknown as Operation;
  });
}

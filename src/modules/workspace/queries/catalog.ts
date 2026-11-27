import {z} from 'zod';
import type {ReaderModule} from './reader-modules.ts';
import type {QueryCapability} from '../../../platform/tools/definition.ts';
import {workspaceOperations} from '../operations/catalog.ts';
import {batchKinds, readItemsFor} from './batch-input.ts';
export {READER_MODULES,readerModuleNames,type ReaderModule} from './reader-modules.ts';
export type {QueryCapability} from '../../../platform/tools/definition.ts';

// Only declared read operations can be exposed through the external MCP.
export const QUERY_CAPABILITIES: readonly QueryCapability[] = Object.freeze(workspaceOperations.flatMap(({id, effect, dshTool, query}) => {
  if (effect !== 'read' || !query) return [];
  return [{...query, id, tool:query.tool ?? dshTool}];
}));
const byId = new Map(QUERY_CAPABILITIES.map(query => [query.id, query]));
export const queryCapability = (action: string) => byId.get(action);

export const queryAllowed=(capability:QueryCapability,modules:readonly ReaderModule[])=>capability.id==='context.readMany'
  ? Object.values(batchKinds).some(module=>modules.includes(module)) : capability.module==='workspace'||modules.includes(capability.module);
export function parseQuery(action:string,input:unknown){
  const capability=queryCapability(action);
  if(!capability)throw Object.assign(new Error('外部连接只允许已开放的查询操作'),{code:'READ_ONLY'});
  const parsed=capability.input.safeParse(input);
  if(!parsed.success)throw Object.assign(new Error(parsed.error.issues.map(issue=>`${issue.path.join('.')||'args'}：${issue.message}`).join('；')),{code:'INVALID_INPUT'});
  return {capability,args:parsed.data as Record<string,any>};
}
export function queryInputSchema(capability:QueryCapability, modules?:readonly ReaderModule[]){
  const schema = capability.id === 'context.readMany' && modules
    ? capability.input.extend({items:readItemsFor(modules)}) : capability.input;
  const {$schema,...value}=z.toJSONSchema(schema);
  return value;
}

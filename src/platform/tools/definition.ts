import {z} from 'zod';
import type {ReaderModule} from '../../modules/workspace/queries/reader-modules.ts';

export interface QueryCapability {
  id: string;
  module: 'workspace' | ReaderModule;
  tool?: string;
  description: string;
  input: z.ZodObject<any>;
  loadAction: string | null;
}

interface Visibility {
  tier?: 'common' | 'advanced' | 'compatibility';
  panel?: boolean;
}

interface OperationSpec extends Visibility {
  id: string;
  effect: 'read' | 'write';
  query?: Omit<QueryCapability, 'id'>;
}

export function read(id: string, options: Visibility = {}): OperationSpec {
  return {id, effect:'read', ...options};
}

export function write(id: string, options: Visibility = {}): OperationSpec {
  return {id, effect:'write', ...options};
}

export function readerQuery(id: string, module: QueryCapability['module'], description: string, shape: z.ZodRawShape,
  {tool, loadAction = id, ...visibility}: Visibility & {tool?: string; loadAction?: string | null} = {}): OperationSpec {
  return {
    ...read(id, visibility),
    query: {module, tool, description, input:z.object(shape).strict(), loadAction},
  };
}

export function defineOperations(module: string, entries: readonly OperationSpec[], dshTool?: string) {
  return entries.map(({tier = 'common', panel = true, ...entry}) => ({...entry, module, dshTool, tier, panel}));
}

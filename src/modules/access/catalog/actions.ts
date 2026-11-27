// Shared capability contract. Actor policy remains in the host and Store.
import {actionCapability} from './capabilities.ts';
import {TOOL_ACTIONS} from './tool-groups.ts';
export {TOOL_ACTIONS,HUMAN_ACTIONS} from './tool-groups.ts';
export const isReadAction = (action: string) => actionCapability(action)?.effect === 'read';
export const changesProse = (action: string, args: Record<string, unknown>) => ['chapter.restore', 'chapter.delete', 'chapter.replace'].includes(action)
  || (action === 'volume.delete' && args.chapterPolicy === 'delete')
  || (['chapter.create', 'chapter.update'].includes(action)
    && ['content', 'append', 'patch'].some(key => args[key] !== undefined));
export const MEMORY_ACTIONS = Object.freeze([...TOOL_ACTIONS.cuigengji_memory,...TOOL_ACTIONS.cuigengji_variables,...TOOL_ACTIONS.cuigengji_context.filter(action=>action.startsWith('preset.') || action.startsWith('creativeMemory.')), 'context.get', 'context.readMany', 'guidance.read']);

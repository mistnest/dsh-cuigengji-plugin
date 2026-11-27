import type {BookSection} from '../../workspace/operations/record-reader.ts';

/** Physical names belong to the library. Both full snapshots and incremental
 * commits must use exactly the same names for the same logical sections. */
export const sectionPaths = {
  edges: 'settings/relations.json',
  memoryGroups: 'settings/groups.json',
  variables: 'variables.json',
  preset: 'preset.json',
  plan: 'planning/legacy.json',
  tavernSources: 'imports/originals.json',
  collaboration: 'collaboration.json',
  collaborationProgress: 'collaboration-progress.json',
} as const satisfies Record<BookSection, string>;

export const sectionFiles = Object.entries(sectionPaths) as [BookSection, string][];
export const creativeMemoryFile = 'memory.md';

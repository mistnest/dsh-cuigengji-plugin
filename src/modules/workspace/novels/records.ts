import type { Board } from '../planning/types.ts';
import type { CollaborationData, CollaborationProgress } from './legacy/types.ts';
import type { Group } from '../settings/rules/groups.ts';
import type { MemoryPage } from '../settings/rules/pages.ts';
import type { VariableState } from '../variables/model.ts';

export interface Entity {
  id: string;
  revision: number;
  createdAt?: string;
  updatedAt?: string;
  deleted?: boolean;
  [key: string]: unknown;
}
export interface ChapterRef {
  chapterId: string;
  revision: number;
}
export interface Volume extends Entity {
  title: string;
  order: number;
}
export interface ChapterVersion {
  revision: number;
  content: string;
  contentHash: string;
  title?: string;
  volumeId?: string | null;
  order?: number;
  deleted?: boolean;
  timestamp?: string;
  actor?: { kind: string; sessionId: string | null };
  reason?: string;
  [key: string]: unknown;
}
export interface Chapter extends Entity {
  title: string;
  volumeId: string | null;
  order: number;
  content: string;
  contentHash: string;
  versions: ChapterVersion[];
}
export interface MemoryFields extends Entity {
  name: string;
  summary: string;
  content: string;
  status: 'active' | 'stale' | 'unconfirmed' | 'retired';
  factType: string;
  sources: ChapterRef[];
  dependsOn: string[];
  knownBy: string[];
  aliases: string[];
  storyTime: string;
  position?: { x: number; y: number } | null;
  groupId?: string | null;
  pageId?: string | null;
  tavern?: { fingerprint: string; format: string; index: number };
}
export interface MemoryVersion {
  revision: number;
  content: string;
  contentHash: string;
  sources: ChapterRef[];
  dependsOn: string[];
  knownBy: string[];
  groupId?: string | null;
  status: MemoryFields['status'];
  factType: string;
  actor?: { kind: string; sessionId: string | null };
  [key: string]: unknown;
}
export interface MemoryNode extends MemoryFields {
  type: 'character_card' | 'world_entry' | 'world_book';
  versions?: MemoryVersion[];
}
export interface MemoryEdge extends MemoryFields {
  from: string;
  to: string;
}
export interface PresetBlock {
  identifier: string;
  name: string;
  content: string;
  enabled: boolean;
  [key: string]: unknown;
}
export interface PresetData {
  id?: string;
  revision?: number;
  name: string;
  enabled: boolean;
  blocks: PresetBlock[];
  raw?: unknown;
  importFormat?: string;
  warnings?: string[];
  [key: string]: unknown;
}
export interface Novel extends Entity {
  cardImages?: import('../cards/image-types.ts').CardImages;
  directoryOrder?: Record<string, string[]>;
  title: string;
  description: string;
  archived: boolean;
  archivedAt?: string;
  volumes: Record<string, Volume>;
  chapters: Record<string, Chapter>;
  nodes: Record<string, MemoryNode>;
  edges: Record<string, MemoryEdge>;
  memoryGroups?: Record<string, Group>;
  memoryPages?: Record<string, MemoryPage>;
  memoryPageFolders?: Record<string, string>;
  memoryFolderWorkspace?: boolean;
  creativeMemory?: string;
  creativeMemoryRevision?: number;
  planning?: Board;
  plan?: Board['legacy'] | null;
  preset?: PresetData;
  variables?: VariableState;
  collaboration?: CollaborationData;
  collaborationProgress?: CollaborationProgress;
  tavernSources?: Record<string, { format: string; raw: unknown }>;
  transferScope?: { mainPage: boolean };
}

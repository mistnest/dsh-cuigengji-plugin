import type {PlanningNode,PlanningEdge,PlanningGroup,Decoration} from './planning.ts';
import type {MemoryNode,MemoryEdge,Novel} from './transfer.ts';

// Legacy storage/backup schema only. No runtime collaboration API is exposed.

/** Immutable saved source, without source manuscript or chapter history. */
export interface SourceSnapshot {
  id:string; createdAt:string; novelId:string; novelTitle:string;
  pageId:string|null; pageTitle:string; sequence:number;
  nodes:Record<string,PlanningNode>; edges:Record<string,PlanningEdge>;
  groups:Record<string,PlanningGroup>; decorations:Record<string,Decoration>;
  settings:Record<string,MemoryNode>; relations:Record<string,MemoryEdge>;
  settingGroups:NonNullable<Novel['memoryGroups']>;
}
export interface CollaborationOrigin {
  novelId:string; novelTitle:string; pageId:string|null; pageTitle:string;
  snapshotId:string; localPageId:string; creatorSessionId:string;
  requirements:string; settingIds:string[]|null;
}
/** A read-only pointer to one immutable version of a shared planning page.
 * The page body remains in the source novel. A writer only receives this
 * pointer and reads the snapshot on demand, so creating a book never copies
 * the source manuscript, settings, or canvas. */
export interface SharedPlanRef {
  sourceNovelId:string;
  sourceNovelTitle:string;
  sourcePageId:string|null;
  sourcePageTitle:string;
  snapshotId:string;
  sequence:number;
  createdAt:string;
}
/** An acceptance receipt, never a replacement for DSH runtime status. */
export interface WritingTask {
  id:string; revision:number; createdAt:string; updatedAt:string;
  novelId:string; parentSessionId:string; childSessionId:string;
  label:string; goal:string; snapshotId:string|null;
  /** 0.5 shared-plan assignment. Optional for 0.4 legacy tasks. */
  sharedPlan?:SharedPlanRef|null;
  dispatchState:'prepared'|'accepted'|'failed'; error?:string;
}
export interface CollaborationData {
  formatVersion:1|2; origin?:CollaborationOrigin;
  creatorSessionId?:string;
  /** Shared plan metadata for newly assigned writer books. */
  sharedPlan?:SharedPlanRef|null;
  snapshots:Record<string,SourceSnapshot>; tasks:Record<string,WritingTask>;
}

export interface SourceSummary {
  id:string; createdAt:string; novelId:string; novelTitle:string;
  pageId:string|null; pageTitle:string; sequence:number; signature:string; settingIds?:string[];
}
/** Rebuildable projection. No manuscript, setting bodies or source snapshot bodies. */
export interface CollaborationIndex {
  formatVersion:1|2; origin?:CollaborationOrigin; sharedPlan?:SharedPlanRef|null; creatorSessionId?:string;
  tasks:Record<string,WritingTask>; snapshots:Record<string,SourceSummary>;
}
export type ProgressPhase = 'starting'|'planning'|'writing'|'revising'|'awaiting_feedback'|'delivered'|'paused';
export type ArtifactRef =
  | {kind:'chapter'|'planning_node'|'setting'; id:string; revision:number}
  | {kind:'planning_page'; id:string|null; revision:number}
  | {kind:'discussion'};
export interface WriterProgress {
  taskId:string; sessionId:string; parentSessionId:string; revision:number; updatedAt:string;
  phase:ProgressPhase; summary:string; question:string; artifacts:ArtifactRef[];
}
export interface CollaborationProgress {formatVersion:1; reports:Record<string,WriterProgress>}

/** Native story workflow. Plans remain separate from versioned manuscript facts. */
export const STORY_OPERATIONS = ['configure', 'outline.upsert', 'tracking.commit', 'thread.upsert', 'review.upsert', 'thread.remove', 'review.remove'] as const;
export type StoryOperationName = typeof STORY_OPERATIONS[number];
export type StoryMode = 'long' | 'short';
export type StoryStage = 'idea' | 'design' | 'outline' | 'draft' | 'review' | 'ready';
export interface StoryBrief {
  premise: string; readerPromise: string; protagonistGoal: string; coreConflict: string; ending: string; style: string;
}
export interface StoryOutline {
  chapterId: string; intent: string; beats: string[]; endingHook: string; minWords?: number; maxWords?: number;
}
export interface StoryTracking {
  chapterId: string; chapterRevision: number; summary: string; storyTime: string; location: string;
  activeCharacterIds: string[]; commitments: string[]; risks: string[];
}
export interface StoryThread {
  id: string; kind: 'foreshadow' | 'promise' | 'expectation' | 'constraint'; title: string; detail: string;
  status: 'open' | 'progressing' | 'resolved' | 'retired';
  sourceChapterId?: string; sourceRevision?: number; dueChapterId?: string;
}
export interface StoryReview {
  id: string; chapterId: string; chapterRevision: number; severity: 'blocking' | 'suggestion' | 'note';
  category: 'causality' | 'character' | 'continuity' | 'pacing' | 'prose' | 'promise';
  location: string; evidence: string; issue: string; suggestion: string; status: 'open' | 'resolved' | 'dismissed';
}
export interface StoryState {
  schemaVersion: 1; revision: number; mode: StoryMode; stage: StoryStage; brief: StoryBrief;
  outlines: Record<string, StoryOutline>; tracking: Record<string, StoryTracking>;
  threads: Record<string, StoryThread>; reviews: Record<string, StoryReview>;
}
export interface StoryChapter {
  id: string; title: string; revision: number; order: number; volumeId?: string | null; charCount: number; textCount: number;
}
export interface StoryCharacter {
  id: string; name: string; type: 'character_card'; status: string; summary: string;
}
export interface StoryDiagnostics {
  untrackedChapterIds: string[]; staleTrackingChapterIds: string[]; staleReviewIds: string[];
  staleThreadIds: string[]; dueThreadIds: string[]; blockingReviewIds: string[];
}
export interface StorySnapshot {
  novelId: string; story: StoryState; chapters: StoryChapter[]; characters: StoryCharacter[]; diagnostics: StoryDiagnostics;
}
export type StoryOperation =
  | {op: 'configure'; value: {mode?: StoryMode; stage?: StoryStage; brief?: Partial<StoryBrief>}}
  | {op: 'outline.upsert'; value: StoryOutline}
  | {op: 'tracking.commit'; value: Omit<StoryTracking, 'chapterRevision'> & {expectedChapterRevision: number; chapterRevision?: number}}
  | {op: 'thread.upsert'; value: Partial<StoryThread> & Pick<StoryThread, 'kind' | 'title' | 'detail' | 'status'> | (Partial<StoryThread> & {id: string})}
  | {op: 'review.upsert'; value: (Omit<StoryReview, 'id' | 'chapterRevision'> & {id?: string; chapterRevision?: number; expectedChapterRevision: number}) | (Partial<StoryReview> & {id: string; expectedChapterRevision: number})}
  | {op: 'thread.remove' | 'review.remove'; value: {id: string}};
export interface StoryApplyArgs {novelId?: string; expectedRevision: number; requestId?: string; operations: StoryOperation[]}
export interface StoryOperationResult {op: StoryOperationName; id?: string; chapterId?: string}
export interface StoryApplyResult extends StorySnapshot {revision: number; results: StoryOperationResult[]}
export type StoryContextKind = 'brief' | 'outline' | 'tracking' | 'manuscript' | 'setting' | 'commitment' | 'thread' | 'review';
export interface StoryContextItem {
  kind: StoryContextKind; id: string; chapterId?: string; revision?: number; title: string; content: string; truncated: boolean;
}
export interface StoryContextOmission {
  kind: StoryContextKind; id: string; reason: 'future' | 'stale' | 'deleted' | 'budget' | 'unconfirmed';
}
export interface StoryContext {
  novelId: string; chapterId: string | null; revision: number; maxChars: number; usedChars: number; truncated: boolean;
  plans: StoryContextItem[]; facts: StoryContextItem[]; omitted: StoryContextOmission[];
  omittedCount: number; omittedTruncated: boolean;
}
/** A selectively hydrated project; manuscript bodies are optional for metadata reads. */
export interface StoryNovel {
  id: string; story?: unknown;
  volumes?: Record<string, {id: string; order: number; deleted?: boolean}>;
  chapters: Record<string, {id: string; title: string; revision: number; order: number; volumeId?: string | null;
    content?: string; deleted?: boolean; versions?: {revision: number}[]}>;
  nodes: Record<string, {id: string; name: string; type: string; status: string; summary: string; factType?: string; revision?: number;
    deleted?: boolean; sources?: {chapterId: string; revision: number}[]; dependsOn?: string[]}>;
}

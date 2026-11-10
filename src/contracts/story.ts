/** Native story workflow. Plans remain separate from versioned manuscript facts. */
export const STORY_OPERATIONS = ['configure', 'outline.upsert', 'tracking.commit', 'thread.upsert', 'review.upsert', 'thread.remove', 'review.remove',
  'unit.upsert', 'storyline.upsert', 'unit.remove', 'storyline.remove',
  'rhythm.upsert', 'rhythm.remove', 'style.upsert'] as const;
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
  /** What is true in the story even if the reader has not been told (author-only). */
  authorTruth: string[];
  /** What the reader has actually been told by this chapter. */
  readerKnown: string[];
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
/** A story line runs across units (vertical cut): main plot, romance, growth… */
export interface StoryLine {
  id: string; title: string; kind: 'main' | 'subplot';
  driver: string; junction: string; canCarryChapter: 'yes' | 'half' | 'no';
}
/** A story unit is a complete arc inside one volume; it is not a chapter. */
export interface StoryUnit {
  id: string; title: string; volumeId: string | null; order: number | string;
  promise: string; emotionEngine: string; causeEntry: string; blocker: string;
  choice: string; payoff: string; hook: string;
  lineIds: string[]; chapterIds: string[]; contractRisk: '' | 'safe' | 'reinforce' | 'broken';
  retired?: boolean;
}
/** How a chapter reads: its dominant tone and its explicit role in the unit. */
export interface ChapterRhythm {
  chapterId: string; chapterRevision: number;
  tone: 'tense' | 'light' | 'sad' | 'hot' | 'satisfying' | 'sweet' | 'warm' | 'horror' | 'oppressive' | 'other';
  role: '' | 'setup' | 'escalate' | 'turn' | 'payoff' | 'aftermath';
  note: string;
}
/** A structured style dossier: explicit writing requirements, not free prose. */
export interface StyleProfile {
  chapterId: string | null; chapterRevision: number | null;
  targetSentence: number | null; dialogueRatio: number | null;
  viewpoint: string; tense: string; diction: string; avoid: string; anchors: string[];
}
export interface StyleSample {
  chapterId: string; chapterRevision: number; sentences: number; avgSentenceLength: number; dialogueRatio: number; paragraphs: number;
}
export interface StyleComparison {
  samples: StyleSample[]; chapterIds: string[]; revision: number;
  deviation: {sentence: number | null; dialogue: number | null};
}
export interface StoryState {
  schemaVersion: 1; revision: number; mode: StoryMode; stage: StoryStage; brief: StoryBrief;
  outlines: Record<string, StoryOutline>; tracking: Record<string, StoryTracking>;
  threads: Record<string, StoryThread>; reviews: Record<string, StoryReview>;
  units: Record<string, StoryUnit>; storylines: Record<string, StoryLine>;
  rhythms: Record<string, ChapterRhythm>; style: StyleProfile;
}
export interface StoryVolume {
  id: string; title: string; order: number; chapterIds: string[];
}
export interface StoryChapter {
  id: string; title: string; revision: number; order: number; volumeId?: string | null; charCount: number; textCount: number;
  sentences: number; avgSentenceLength: number; dialogueRatio: number; paragraphs: number;
}
export type DetectorSeverity = 'blocking' | 'advisory';
export type DetectorLayer = 'expression' | 'narrative' | 'logic';
export interface DetectorFinding {
  type: string; severity: DetectorSeverity; review: 'mechanical' | 'semantic';
  layer: DetectorLayer; line: number; column: number; excerpt: string; message: string;
}
export interface DetectorCount {
  type: string; severity: DetectorSeverity; review: 'mechanical' | 'semantic'; count: number; blockingCount: number;
}
export interface DetectorResult {
  chapterId: string; chapterRevision: number; ranAt: string;
  findings: DetectorFinding[]; counts: DetectorCount[];
  totalChars: number; perThousand: number; blocking: number; advisory: number; clean: boolean;
  /** The library-wide scan always excludes this chapter: the detector never scores its own source without an explicit single-chapter run. */
  excluded?: boolean;
}
export interface StoryCharacter {
  id: string; name: string; type: 'character_card'; status: string; summary: string;
}
export interface StoryDiagnostics {
  untrackedChapterIds: string[]; staleTrackingChapterIds: string[]; staleReviewIds: string[];
  staleThreadIds: string[]; dueThreadIds: string[]; blockingReviewIds: string[];
  /** Units whose whole chapter range is written but whose contract is still marked at risk. */
  overdueUnitIds: string[];
}
export interface StorySnapshot {
  novelId: string; story: StoryState; chapters: StoryChapter[]; volumes: StoryVolume[];
  characters: StoryCharacter[]; diagnostics: StoryDiagnostics; style: StyleComparison;
}
export type StoryOperation =
  | {op: 'configure'; value: {mode?: StoryMode; stage?: StoryStage; brief?: Partial<StoryBrief>}}
  | {op: 'outline.upsert'; value: StoryOutline}
  | {op: 'tracking.commit'; value: Omit<StoryTracking, 'chapterRevision'> & {expectedChapterRevision: number; chapterRevision?: number}}
  | {op: 'thread.upsert'; value: Partial<StoryThread> & Pick<StoryThread, 'kind' | 'title' | 'detail' | 'status'> | (Partial<StoryThread> & {id: string})}
  | {op: 'unit.upsert'; value: Partial<StoryUnit> & Pick<StoryUnit, 'volumeId' | 'title'> | (Partial<StoryUnit> & {id: string})}
  | {op: 'storyline.upsert'; value: Partial<StoryLine> & Pick<StoryLine, 'title'> | (Partial<StoryLine> & {id: string})}
  | {op: 'unit.remove' | 'storyline.remove'; value: {id: string}}
  | {op: 'rhythm.upsert'; value: Omit<ChapterRhythm, 'chapterRevision'> & {expectedChapterRevision: number; chapterRevision?: number}}
  | {op: 'rhythm.remove'; value: {chapterId: string}}
  | {op: 'style.upsert'; value: Partial<Omit<StyleProfile, 'chapterRevision'>> & {expectedChapterRevision?: number}}
  | {op: 'review.upsert'; value: (Omit<StoryReview, 'id' | 'chapterRevision'> & {id?: string; chapterRevision?: number; expectedChapterRevision: number}) | (Partial<StoryReview> & {id: string; expectedChapterRevision: number})}
  | {op: 'thread.remove' | 'review.remove'; value: {id: string}};
export interface StoryApplyArgs {novelId?: string; expectedRevision: number; requestId?: string; operations: StoryOperation[]}
export interface StoryOperationResult {op: StoryOperationName; id?: string; chapterId?: string}
export interface StoryApplyResult extends StorySnapshot {revision: number; results: StoryOperationResult[]}
export type StoryContextKind = 'brief' | 'outline' | 'tracking' | 'manuscript' | 'setting' | 'commitment' | 'thread' | 'review' | 'unit' | 'style';
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
  volumes?: Record<string, {id: string; title?: string; name?: string; order: number; deleted?: boolean}>;
  chapters: Record<string, {id: string; title: string; revision: number; order: number; volumeId?: string | null;
    content?: string; deleted?: boolean; versions?: {revision: number}[]}>;
  nodes: Record<string, {id: string; name: string; type: string; status: string; summary: string; factType?: string; revision?: number;
    deleted?: boolean; sources?: {chapterId: string; revision: number}[]; dependsOn?: string[]}>;
}

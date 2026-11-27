/** Logical records shared by application operations and the project store. */
export type Row = Record<string, any>;
export type Workspace = {
  schemaVersion: number;
  novels: Record<string, Row>;
  bindings: Record<string, Row>;
  requests: Record<string, Row>;
  [key: string]: any;
};

export type BookSection = 'edges' | 'memoryGroups' | 'variables' | 'preset' | 'plan'
  | 'tavernSources' | 'collaboration' | 'collaborationProgress';

/** All reads populate the same in-memory novel while its workspace lock is held. */
export interface BookReads {
  creativeMemory(): Promise<void>;
  chapterIndex(): Promise<void>;
  chapter(id: string, history?: boolean): Promise<void>;
  memoryIndex(): Promise<void>;
  node(id: string): Promise<void>;
  nodeHistory(id: string): Promise<void>;
  section(field: BookSection): Promise<void>;
  board(): Promise<void>;
  planningPageIds(): Iterable<string | null>;
  planningPage(id: string | null): Promise<void>;
  planningTransaction(id: string): Promise<void>;
  imageIndex(): Promise<void>;
  imageGallery(key: string): Promise<void>;
}

export interface BookRecordReader extends BookReads {
  full(): Promise<Workspace>;
}

/** One consistent view, valid for the duration of the caller's existing store lock. */
export interface WorkspaceRecordReader {
  state: Workspace;
  activityYears: readonly string[];
  manuscriptCounts(novelId?: string): Promise<void>;
  activity(years: string[]): Promise<void>;
  receipt(key: string): Promise<Row | undefined>;
  allReceipts(): Promise<void>;
  full(): Promise<Workspace>;
  book(id: string): Promise<BookRecordReader>;
}

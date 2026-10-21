export interface BookSummary {
  id: string;
  title: string;
  revision: number;
  archived: boolean;
  archivedAt?: string;
  updatedAt?: string;
  hasCollaboration?: boolean;
  origin?: Pick<import('./collaboration.ts').CollaborationOrigin,'novelId'|'novelTitle'|'pageId'|'pageTitle'>;
}

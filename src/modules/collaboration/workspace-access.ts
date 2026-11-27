import type {LibraryAccess} from '../library/roots/service.ts';
import type {QueryService} from '../workspace/queries/service.ts';

/** Collaboration can inspect the selected library and query its saved work under the switching gate. */
export type CollaborationLibraries = LibraryAccess<{
  store: {readonly root: string};
  maintenance: {ensureReady(): Promise<unknown>; status(): Promise<{status: string}>};
  queries: Pick<QueryService, 'query'>;
}>;

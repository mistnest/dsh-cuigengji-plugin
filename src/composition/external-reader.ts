import {createReaderTransport} from '../modules/access/mcp/reader-http.ts';
import {ExternalAccess, type ExternalOptions, type GrantLibraries} from '../modules/collaboration/grants/service.ts';

export function createExternalAccess(libraries: GrantLibraries, options: ExternalOptions) {
  return new ExternalAccess(libraries, options, createReaderTransport);
}

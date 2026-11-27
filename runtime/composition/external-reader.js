import { createReaderTransport } from "../modules/access/mcp/reader-http.js";
import { ExternalAccess } from "../modules/collaboration/grants/service.js";
function createExternalAccess(libraries, options) {
  return new ExternalAccess(libraries, options, createReaderTransport);
}
export {
  createExternalAccess
};

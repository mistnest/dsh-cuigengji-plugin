import { Store } from "./store.js";
import { WorkData } from "../modules/library/archives/workspace-archive.js";
import { TransferService } from "../modules/library/archives/transfer-service.js";
import { UpgradeCoordinator } from "../modules/library/upgrade/upgrade.js";
import { QueryService } from "../modules/workspace/queries/service.js";
import { LibraryRoots } from "../modules/library/roots/service.js";
import { within } from "../platform/files/paths.js";
function createLibraryRuntime(root, options = {}) {
  const store = new Store(root, options), workData = new WorkData(store), maintenance = new UpgradeCoordinator(store);
  return { store, workData, maintenance, queries: new QueryService(store), transfer: new TransferService(store, workData) };
}
class LibraryService extends LibraryRoots {
  constructor(root, options = {}) {
    super(root, createLibraryRuntime, options);
  }
}
export {
  LibraryService,
  createLibraryRuntime,
  within
};

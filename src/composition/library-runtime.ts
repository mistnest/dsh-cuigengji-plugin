import {Store} from './store.ts';
import {WorkData} from '../modules/library/archives/workspace-archive.ts';
import {TransferService} from '../modules/library/archives/transfer-service.ts';
import {UpgradeCoordinator} from '../modules/library/upgrade/upgrade.ts';
import {QueryService} from '../modules/workspace/queries/service.ts';
import {LibraryRoots, type LibraryOptions} from '../modules/library/roots/service.ts';
export {within} from '../platform/files/paths.ts';

export function createLibraryRuntime(root:string,options:{allowCreate?:boolean}={}) {
  const store=new Store(root,options),workData=new WorkData(store),maintenance=new UpgradeCoordinator(store);
  return {store,workData,maintenance,queries:new QueryService(store),transfer:new TransferService(store,workData)};
}
export type LibraryRuntime=ReturnType<typeof createLibraryRuntime>;

export class LibraryService extends LibraryRoots<LibraryRuntime> {
  constructor(root: string, options: LibraryOptions = {}) {
    super(root, createLibraryRuntime, options);
  }
}

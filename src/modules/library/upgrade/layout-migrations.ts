import {mkdir, open, readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {digest, type FileChanges, type FileTransaction} from '../transactions/file-transaction.ts';
import {planProjectDirectories} from '../records/project-directories.ts';
import {bookPath, fileId, splitWorkspace, type LegacyLibrary, type Library, type OccupiedProjectFiles, type Workspace} from '../records/project-layout.ts';

interface LayoutAccess {
  root: string;
  transaction: Pick<FileTransaction, 'commit'>;
  read(library: Library): Promise<{state: Workspace; pathsRead: Iterable<string>; legacyActivity: boolean}>;
  directoryNames(): Promise<string[]>;
  occupiedFiles(base: string): Promise<OccupiedProjectFiles>;
}

export function readableLayout(library: LegacyLibrary | Library): Library {
  if (library.storageVersion !== 2) return library;
  const directories = Object.fromEntries(Object.keys(library.novels).map(id => [id, fileId(id)]));
  return {...library, storageVersion: 3, directories};
}

function checkpointName(label: string) {
  return 'backups/before-' + label + '-' + Date.now() + '-' + randomUUID();
}

async function checkpointFiles(root: string, state: Workspace, from: number, to: number, details = {}) {
  const snapshot = JSON.stringify(state);
  const manifest = {from, to, sourceSha256: digest(snapshot), ...details, createdAt: new Date().toISOString()};
  return new Map([
    ['store.json', snapshot],
    ['library.json', await readFile(join(root, 'library.json'), 'utf8')],
    ['migration.json', JSON.stringify(manifest)],
  ]);
}

async function writeCheckpoint(directory: string, files: Map<string, string>) {
  await mkdir(directory, {recursive: true, mode: 0o700});
  for (const [name, content] of files) {
    const handle = await open(join(directory, name), 'wx', 0o600);
    try {await handle.writeFile(content); await handle.sync();} finally {await handle.close();}
  }
}

async function occupiedPaths(access: LayoutAccess, library: Library) {
  const paths: Record<string, OccupiedProjectFiles> = {};
  for (const id of Object.keys(library.novels)) paths[id] = await access.occupiedFiles(bookPath(id, library.directories));
  return paths;
}

/** Each transition validates its source and commits before the next version is opened. Caller holds the data lock. */
export async function migrateIndexedLayout(stored: LegacyLibrary | Library, access: LayoutAccess): Promise<Library> {
  let library = readableLayout(stored);
  if (stored.storageVersion === 2) {
    const {state} = await access.read(library);
    const {directories, moves} = planProjectDirectories(state.novels, library.directories, {}, await access.directoryNames());
    await writeCheckpoint(join(access.root, checkpointName('project-names')), await checkpointFiles(access.root, state, 2, 3, {directories, moves}));
    library = {...stored, storageVersion: 3, directories};
    await access.transaction.commit(new Map([['library.json', JSON.stringify(library)]]), moves);
  }
  if (library.storageVersion === 3) {
    const {state} = await access.read(library);
    const occupied = await occupiedPaths(access, library);
    const before = splitWorkspace(state, library.directories, 3);
    const after = splitWorkspace(state, library.directories, 4, occupied);
    await writeCheckpoint(join(access.root, checkpointName('readable-files')), await checkpointFiles(access.root, state, 3, 4));
    const changes: FileChanges = new Map(after);
    for (const path of before.keys()) if (!after.has(path) && path !== 'library.json') changes.set(path, null);
    await access.transaction.commit(changes);
    library = {...library, storageVersion: 4};
  }
  if (library.storageVersion === 4) {
    const {state, pathsRead, legacyActivity} = await access.read(library);
    const after = splitWorkspace(state, library.directories, 5, await occupiedPaths(access, library));
    const changes: FileChanges = new Map(after);
    if (!legacyActivity) changes.delete('activity.json');
    const checkpoint = checkpointName('content-tree');
    for (const [name, text] of await checkpointFiles(access.root, state, 4, 5)) changes.set(checkpoint + '/' + name, text);
    // Only remove paths actually read from authoritative old indexes. Preserve other files in the same directory.
    for (const path of pathsRead) if (path.startsWith('novels/') && !after.has(path)) changes.set(path, null);
    await access.transaction.commit(changes);
    library = {...library, storageVersion: 5};
  }
  return library;
}

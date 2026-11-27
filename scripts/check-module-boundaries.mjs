import assert from 'node:assert/strict';
import {posix} from 'node:path';

const moduleOf = file => /^src\/modules\/([^/]+)\//.exec(file)?.[1];

function checkAcyclic(dependencies, label) {
  const completed = new Set();
  const visiting = new Set();
  const path = [];
  function visit(name) {
    if (completed.has(name)) return;
    if (visiting.has(name)) {
      const cycle = [...path.slice(path.indexOf(name)), name];
      throw new Error(label + ' cycle: ' + cycle.join(' -> '));
    }
    visiting.add(name);
    path.push(name);
    for (const dependency of dependencies.get(name) ?? []) visit(dependency);
    path.pop();
    visiting.delete(name);
    completed.add(name);
  }
  for (const name of dependencies.keys()) visit(name);
}

/** Use the actual shipped imports. Types disappear at compilation; compatibility forwarders are generated separately. */
export function checkModuleBoundaries(server, client) {
  const files = new Map(), modules = new Map();
  const id = path => path.replaceAll('\\', '/').replace(/\.[cm]?[jt]sx?$/, '');
  function record(from, to) {
    from = id(from); to = id(to);
    if (!from.startsWith('src/') || !to.startsWith('src/')) return;
    const owner = moduleOf(from), dependency = moduleOf(to);
    if (owner) assert.ok(!to.startsWith('src/composition/'), 'Module imports the application assembly: ' + from + ' -> ' + to);
    if (owner === 'workspace' && dependency) assert.equal(dependency, owner, 'Writing rules import another module: ' + from + ' -> ' + to);
    if (!files.has(from)) files.set(from, new Set());
    files.get(from).add(to);
    if (!owner || !dependency || owner === dependency) return;
    if (!modules.has(owner)) modules.set(owner, new Set());
    modules.get(owner).add(dependency);
  }
  for (const output of Object.values(server.outputs)) {
    if (!output.entryPoint) continue;
    for (const dependency of output.imports) {
      if (dependency.path.startsWith('.')) record(output.entryPoint, posix.join(posix.dirname(output.entryPoint), dependency.path));
    }
  }
  for (const [entry, input] of Object.entries(client.inputs)) {
    for (const dependency of input.imports) if (!dependency.external) record(entry, dependency.path);
  }
  checkAcyclic(files, 'Source file');
  checkAcyclic(modules, 'Module');
}

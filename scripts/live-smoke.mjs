import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const run = promisify(execFile);
const root = resolve(import.meta.dirname, '..');
const nodeHost = resolve(root, 'scripts/node-host.sh');
const dsh = resolve(root, 'node_modules/@deepseek-ai/dsh/lib/bin.js');
const env = { ...process.env, DSH_HOME: resolve(root, '.test-runtime') };
const { stdout } = await run(nodeHost, [dsh, 'plugin', '--profile', 'web', 'list'], { cwd: root, env });
if (!stdout.includes('dsh-cuigengji')) {
  throw new Error(`DSH profile does not contain dsh-cuigengji:\n${stdout}`);
}
console.log(JSON.stringify({ ok: true, dsh: '0.1.7-rc.2', plugin: 'dsh-cuigengji', profile: 'web' }));

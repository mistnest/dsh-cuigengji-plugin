import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { dirname, join, resolve, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Run the published market's real routes and Desktop adapter against the actual
// bundled pluginManager in a disposable Host. No model calls or user profile.
// The CLI carrier is given Desktop's bundled pnpm invocation explicitly; this
// is an isolated Host integration check, not an Electron window UI test.
const argv=process.argv.slice(2),arg=name=>{const at=argv.indexOf(name);return at<0?undefined:argv[at+1];};
const manifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const mode = arg('--mode') || 'upgrade';
const marketVersion = arg('--market-version');
const oldSpec=arg('--old-package');
const targetVersion=arg('--target-version')||manifest.version;
const registry=arg('--registry')||'https://registry.npmjs.org';
const reportFile=arg('--report')&&resolve(arg('--report'));
assert.ok(arg('--desktop-exe')&&marketVersion&&reportFile,
  '--desktop-exe <exe> --market-version <latest-exact> --report <json> [--mode fresh|upgrade|failed-upgrade] [--old-package <npm-spec, URL or local.tgz>] [--target-version <published-version>] [--expected-dsh-version <latest-exact>] [--with-git] [--keep-on-failure]');
assert.match(marketVersion,/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u);
assert.match(targetVersion,/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u);
const base=dirname(reportFile),reportName=basename(reportFile,'.json');
await mkdir(base,{recursive:true});
assert.ok(['fresh', 'upgrade', 'failed-upgrade'].includes(mode));
const upgrading = mode !== 'fresh', injectingFailure = mode === 'failed-upgrade';
assert.ok(!upgrading||oldSpec,'Upgrade acceptance requires --old-package');
let expectedVersion=targetVersion;
const exe = resolve(arg('--desktop-exe'));
assert.equal(process.platform,'win32','This Desktop acceptance carrier targets Windows');
const helper=fileURLToPath(new URL('./desktop-package-operation.mjs',import.meta.url));
const root = await mkdtemp(join(tmpdir(), 'cuigengji-market-managed-'));
const home = join(root, 'home'), profileName = 'market-audit', profile = join(home, 'profiles', profileName);
const data = join(root, 'custom-library'), usage = join(root, 'custom-usage');
const resources = join(dirname(exe), 'resources');
const bundledPnpm = ['runtime/primary-runtime/dependencies/pnpm/bin/pnpm.mjs', 'runtime/pnpm/bin/pnpm.mjs']
  .map(path => join(resources, path)).find(existsSync);
assert.ok(bundledPnpm);
const hostCli = join(resources, 'app.asar/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js');
const windows = process.env.SystemRoot || 'C:/Windows';
const env = { ...process.env, DSH_HOME: home, ELECTRON_RUN_AS_NODE: '1', DSH_DESKTOP_NODE_EXECUTABLE: exe,
  CI: 'true', PNPM_HOME: join(root, 'pnpm'), PATH: [join(resources, 'runtime/bin'), join(windows, 'System32'), windows].join(';') };
if(argv.includes('--with-git')){
  const git=spawnSync(join(windows,'System32/where.exe'),['git'],{encoding:'utf8',windowsHide:true});
  assert.equal(git.status,0,'The GitHub-source audit requires Git to resolve repository updates');
  env.PATH+=';'+dirname(git.stdout.trim().split(/\r?\n/u)[0]);
}
for (const key of ['NODE_OPTIONS', 'CUIGENGJI_DATA_ROOT', 'DEEPSEEK_API_KEY', 'OPENAI_API_KEY', 'DSH_URL', 'DSH_TOKEN']) delete env[key];
const report = { mode, marketVersion, oldPackage:oldSpec, targetVersion, root, gitAvailable:argv.includes('--with-git'), ok: false, modelCalls: 0, checks: [] };
let host, browser, page, hostLog = '';
const redact = text => text.replace(/([?&]token=)[\w-]+/gu, '$1[redacted]');
function run(file, args, timeout = 300000) {
  return new Promise((done, reject) => {
    const child = spawn(file, args, { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Child operation timed out')); }, timeout);
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('exit', code => { clearTimeout(timer); code === 0 ? done(stdout) : reject(new Error(redact(stderr || stdout || `exit ${code}`))); });
  });
}
async function install(spec, activateNewBundles) {
  const input = { context: { profile: profileName, dir: profile, cwd: root, home }, args: ['add', spec, `--registry=${registry}`],
    options: { execution: 'service', activateNewBundles, outputBytes: 5000, lockWaitMs: 10000, idleTimeoutMs: 120000, lookupTimeoutMs: 20000 } };
  const out = await run(exe, ['--expose-internals', helper, JSON.stringify(input)]);
  const result = JSON.parse(out.trim().split(/\r?\n/u).at(-1));
  assert.equal(result.exitCode, 0, result.output);
  report.hostVersion = result.runtimeVersion;
  if(arg('--expected-dsh-version'))assert.equal(report.hostVersion,arg('--expected-dsh-version'),'The desktop carrier must load the expected latest DSH');
}
async function boot() {
  hostLog = '';
  host = spawn(exe, ['--expose-internals', hostCli, '--profile', profileName, '--host', '127.0.0.1', '--port', '0', '--no-open'],
    { env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  const url = await new Promise((done, reject) => {
    const timer = setTimeout(() => reject(new Error('Host startup timed out: ' + redact(hostLog.slice(-1500)))), 90000);
    const receive = bytes => {
      hostLog += bytes;
      const match = hostLog.match(/http:\/\/127\.0\.0\.1:\d+\/\?token=[\w-]+/u);
      if (match) { clearTimeout(timer); done(match[0]); }
    };
    host.stdout.on('data', receive); host.stderr.on('data', receive);
    host.once('exit', code => { clearTimeout(timer); reject(new Error(`Host exited ${code}: ${redact(hostLog.slice(-2000))}`)); });
  });
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  const origin = new URL(url).origin;
  const post = async (path, body) => {
    const result = await page.request.post(origin + path, { headers: { origin }, data: body, timeout: 240000 });
    return { status: result.status(), body: await result.json() };
  };
  return { origin, post };
}
async function stop() {
  if (browser) { await browser.close(); browser = undefined; }
  if (host && host.exitCode === null) {
    const child = host;
    await new Promise(done => { const timer = setTimeout(done, 10000); child.once('exit', () => { clearTimeout(timer); done(); }); child.kill(); });
  }
  host = undefined;
}
try {
  await mkdir(profile, { recursive: true }); await mkdir(data);
  await writeFile(join(profile, 'package.json'), JSON.stringify({ name: 'isolated-market-audit', private: true,
    preservedMarker: 'unrelated-profile-setting', dsh: { profile: { bundles: ['@deepseek-ai/dsh-base', '@deepseek-ai/dsh-web-app'] } } }, null, 2));
  console.log(`${mode}: installing published market package`);
  await install(`dshmarket@${marketVersion}`, false);
  if (upgrading) {
    console.log(`${mode}: installing and seeding the published baseline`);
    await install(oldSpec, true);
    const seeded = await run(exe, ['--expose-internals', fileURLToPath(new URL('./seed-installed-upgrade.mjs',import.meta.url)),
      join(profile, 'node_modules/dsh-cuigengji-plugin'), data, join(root, 'before-upgrade.json')]);
    report.oldData = JSON.parse(seeded.trim());
    if(injectingFailure)expectedVersion=report.oldData.oldVersion;
  }
  const marketBase = join(profile, 'node_modules/dshmarket/lib');
  const controlledPnpm = join(root, 'controlled-pnpm.mjs');
  await writeFile(controlledPnpm, `import {spawn} from 'node:child_process';
const args=process.argv.slice(2);
if(args.includes('add')&&args.includes(${JSON.stringify(manifest.name+'@'+targetVersion)})){
  console.error('Controlled audit failure while fetching the replacement package');process.exit(1);
}
const child=spawn(process.execPath,['--expose-internals',${JSON.stringify(bundledPnpm)},...args],{env:process.env,windowsHide:true,stdio:'inherit'});
child.on('error',error=>{console.error(error.message);process.exit(1);});child.on('exit',code=>process.exit(code??1));
`);
  const probe = join(root, 'market-probe.mjs');
  await writeFile(probe, `import {mountMarketRoutes} from ${JSON.stringify(pathToFileURL(join(marketBase, 'routes.js')).href)};
import {createOfficialDesktopRuntime} from ${JSON.stringify(pathToFileURL(join(marketBase, 'official-desktop.js')).href)};
import * as hostDetection from ${JSON.stringify(pathToFileURL(join(marketBase, 'dsh-install.js')).href)};
import {setActiveRegion} from ${JSON.stringify(pathToFileURL(join(marketBase, 'regions.js')).href)};
export const inject=['webServer','loader'];
export function apply(ctx){
  // The CLI carrier does not supply Desktop's packageManager invocation.
  // Supply that same carrier contract, using the actual bundled executable,
  // so the real service never falls back to a global pnpm.
  const carrier=ctx.get('profileContext');
  if(carrier&&carrier.packageManager===undefined)carrier.packageManager={command:process.execPath,args:['--expose-internals',${JSON.stringify(injectingFailure ? controlledPnpm : bundledPnpm)}],env:process.env};
  const calls=[]; const real=()=>ctx.get('pluginManager');
  const lookup=()=>{const manager=real();if(!manager)return undefined;return new Proxy(manager,{get(target,key){const value=Reflect.get(target,key,target);if(typeof value!=='function')return value;return (...args)=>{if(['installBundle','removeBundle'].includes(key))calls.push({method:key,target:args[0]});return value.apply(target,args);};}});};
  if(hostDetection.setLauncherInstallAnchorSource)ctx.effect(()=>hostDetection.setLauncherInstallAnchorSource(()=>ctx.get('profileContext')?.installAnchor));
  setActiveRegion('global');
  const runtime=createOfficialDesktopRuntime(lookup,${JSON.stringify(profileName)},${JSON.stringify(profile)});
  ctx.effect(()=>mountMarketRoutes(ctx,{profile:${JSON.stringify(profileName)},profileDirectory:${JSON.stringify(profile)},desktopHost:true,allowRestart:false,region:'global'},runtime));
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/channel-audit/status',handler:async(_req,res)=>{
    res.setHeader('content-type','application/json');res.end(JSON.stringify({hasManager:!!real(),hasHmr:!!ctx.get('hmr'),calls,loaded:!!ctx.get('cuigengji')}));
  }}));
  ctx.effect(()=>ctx.webServer.register({kind:'exact',path:'/channel-audit/workspace',handler:async(_req,res)=>{
    res.setHeader('content-type','application/json');res.end(JSON.stringify(await ctx.get('cuigengji').store.load()));
  }}));
}
`);
  await writeFile(join(profile, 'cordis.patch.yml'), `# Unrelated profile comment must survive market operations.
- id: cuigengji
  config:
    dataRoot: ${JSON.stringify(data)}
    usageRoot: ${JSON.stringify(usage)}
- insert:
    - id: channel-audit-probe
      name: ${JSON.stringify(probe)}
`);
  const patchBefore = await readFile(join(profile, 'cordis.patch.yml'), 'utf8');
  console.log(`${mode}: starting isolated desktop-bundled host`);
  let api = await boot();
  const statusResponse = await page.request.get(api.origin + '/channel-audit/status');
  assert.equal(statusResponse.status(), 200, 'Isolated audit probe did not mount; inspect the redacted host log');
  const status = await statusResponse.json();
  report.before = status;
  assert.equal(status.hasManager, true, 'The actual host pluginManager service is required');
  console.log(`${mode}: invoking the published market HTTP ${mode === 'fresh' ? 'install' : 'update'} route`);
  const operation = await api.post(mode === 'fresh' ? '/dsh-market/install' : '/dsh-market/update',
    mode === 'fresh' ? { url: 'https://github.com/mistnest/dsh-cuigengji-plugin',version:targetVersion }
      : { name: 'dsh-cuigengji-plugin',...(argv.includes('--pin-target')?{compatVersion:targetVersion}:{}) });
  await writeFile(join(base, `market-${reportName}-response.json`), JSON.stringify(operation, null, 2));
  report.operation = operation;
  if (injectingFailure) assert.ok(operation.status >= 400, 'The intentionally failed update must not report success');
  else assert.ok(operation.status >= 200 && operation.status < 300, JSON.stringify(operation));
  const live = await (await page.request.get(api.origin + '/channel-audit/status')).json();
  report.afterOperation = live;
  const beforeRestart = await api.post('/api/cuigengji/dispatch', { type: 'client-request', rpcId: crypto.randomUUID(),
    method: 'cuigengji/dispatch', payload: { action: 'settings.get', args: {}, sessionId: 'market-audit-author' } });
  report.beforeRestartBackend = beforeRestart;
  const packagePath = join(profile, 'node_modules/dsh-cuigengji-plugin');
  assert.equal(JSON.parse(await readFile(join(packagePath, 'package.json'), 'utf8')).version, expectedVersion);
  assert.equal(await readFile(join(profile, 'cordis.patch.yml'), 'utf8'), patchBefore, 'Market must preserve the configured library/usage roots and patch comment');
  assert.equal(JSON.parse(await readFile(join(profile, 'package.json'), 'utf8')).preservedMarker, 'unrelated-profile-setting');
  report.checks.push(injectingFailure ? 'failed replacement was rejected and the previous package was restored through the actual host manager'
    : 'published market route installed the exact public version through the actual host manager');
  report.checks.push('custom library/usage roots and unrelated profile settings preserved');
  await stop();
  api = await boot();
  const rpc = async (action, args = {}) => {
    const result = await api.post('/api/cuigengji/dispatch', { type: 'client-request', rpcId: crypto.randomUUID(),
      method: 'cuigengji/dispatch', payload: { action, args, sessionId: 'market-audit-author' } });
    assert.equal(result.status, 200, JSON.stringify(result));
    assert.equal(result.body.result?.ok, true, JSON.stringify(result));
    return result.body.result.value;
  };
  report.maintenance = await rpc('maintenance.status');
  assert.equal(report.maintenance.status, 'ready');
  const books = await rpc('novel.list', { includeArchived: true });
  if (upgrading) {
    const before = JSON.parse(await readFile(join(root, 'before-upgrade.json'), 'utf8'));
    assert.equal(books.length,Object.keys(before.novels).length);
    const actual = await (await page.request.get(api.origin + '/channel-audit/workspace')).json();
    assert.deepEqual(actual.novels, before.novels, 'Every old work, chapter, history, setting, page and preset must survive the market update');
    assert.deepEqual(actual.requests, before.requests, 'Old request receipts must survive the market update');
    for (const [id, binding] of Object.entries(before.bindings)) assert.deepEqual(actual.bindings[id], injectingFailure ? binding : {
      ...binding, scope: 'library', activeNovelId: binding.activeNovelId || binding.novelId, novelId: binding.activeNovelId || binding.novelId,
    });
    report.completeWorkspacePreserved = true;
  }
  else {
    assert.equal(books.length, 0);
    const book = await rpc('novel.create', { title: '市场新装后的写作验收' });
    await rpc('chapter.create', { novelId: book.id, title: '第一章', content: '来自实际市场安装流程的正文。' });
  }
  report.verification = await rpc('maintenance.verify', { expectedVersion, expectedDataRoot: data });
  assert.equal(report.verification.verified, true);
  report.checks.push('backend route and maintenance ready after host restart; synthetic works accessible');
  report.ok = true;
} catch (error) {
  report.error = redact(error.message);
  process.exitCode = 1;
} finally {
  await stop();
  await writeFile(reportFile, JSON.stringify(report, null, 2));
  await writeFile(join(base, `market-managed-${reportName}-host.log`), redact(hostLog));
  if(report.ok||!argv.includes('--keep-on-failure')){
    assert.equal(dirname(resolve(root)),resolve(tmpdir()));assert.ok(basename(root).startsWith('cuigengji-market-managed-'));
    await rm(root,{recursive:true,force:true});
  }
  console.log(JSON.stringify({ ok: report.ok, mode, marketVersion, hostVersion: report.hostVersion, report:reportFile, error: report.error, checks: report.checks }));
}

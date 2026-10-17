// Developer acceptance: use DSH's real native package operation in a disposable
// profile. Default has no Git/global Node; --with-git covers repository HEAD
// resolution in the official GitHub address flow. Never touches the user's profile.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {mkdtemp,mkdir,readFile,writeFile,copyFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parse} from 'yaml';

const args = process.argv.slice(2), arg = name => {const index=args.indexOf(name);return index < 0 ? undefined : args[index+1];};
const desktopExe = arg('--desktop-exe'), archiveSpec = arg('--package'), npmSpec = arg('--npm-package'), packageSpec = archiveSpec || npmSpec;
const oldPackage = args.includes('--old-package') ? arg('--old-package') : undefined;
const oldDesktopExe = arg('--old-desktop-exe') || desktopExe;
const withGit = args.includes('--with-git');
if (!desktopExe || !packageSpec || (archiveSpec && npmSpec) || process.platform !== 'win32') throw new Error('Windows: --desktop-exe <exe> (--package <local.tgz, URL or github: spec> | --npm-package <dsh-cuigengji-plugin[@version]>) [--old-package <tgz>] [--report <json>]');
if (npmSpec) assert.match(npmSpec,/^dsh-cuigengji-plugin(?:@[a-zA-Z0-9][a-zA-Z0-9.+~-]*)?$/,'--npm-package must name the published plugin package');
const currentManifest = JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
const workspace = await mkdtemp(join(tmpdir(),'cuigengji-native-install-')), profile = join(workspace,'profile'), data = join(workspace,'novel-data');
const runtime = join(dirname(resolve(desktopExe)),'resources/runtime'), windows = process.env.SystemRoot || 'C:\\Windows';
const env = {...process.env,PATH:[join(runtime,'bin'),join(windows,'System32'),windows].join(';'),
  DSH_DESKTOP_NODE_EXECUTABLE:resolve(desktopExe),ELECTRON_RUN_AS_NODE:'1',CI:'true',PNPM_HOME:join(workspace,'pnpm')};
delete env.NODE_OPTIONS;
if (withGit) {
  const executable = spawnSync(join(windows,'System32/where.exe'),['git'],{encoding:'utf8',windowsHide:true});
  assert.equal(executable.status,0,'--with-git requires an installed Git executable');
  env.PATH += ';' + dirname(executable.stdout.trim().split(/\r?\n/)[0]);
}
const gitAvailable = spawnSync(join(windows,'System32/where.exe'),['git'],{env,encoding:'utf8',windowsHide:true}).status === 0;
assert.equal(gitAvailable,withGit,'Git must only be on PATH in the --with-git case');
const nodePaths = spawnSync(join(windows,'System32/where.exe'),['node'],{env,encoding:'utf8',windowsHide:true}).stdout.trim();
assert.ok(nodePaths.includes('runtime\\bin\\node.cmd'),'only the desktop Node shim should be available');
const options = {execution:'service',outputBytes:4000,activateNewBundles:true,lockWaitMs:10000,idleTimeoutMs:120000,lookupTimeoutMs:20000};
const context = {profile:'desktop',dir:profile,cwd:process.cwd(),home:join(workspace,'home')};
const packageOperation=(exe,command,extra={})=>{
  const resources=join(dirname(resolve(exe)),'resources/runtime');
  const result=spawnSync(resolve(exe),['--expose-internals',fileURLToPath(new URL('./desktop-package-operation.mjs',import.meta.url)),JSON.stringify({context,args:command,options:{...options,...extra}})],
    {env:{...env,DSH_HOME:context.home,DSH_DESKTOP_NODE_EXECUTABLE:resolve(exe),PATH:[join(resources,'bin'),join(windows,'System32'),windows,...(withGit?env.PATH.split(';').slice(3):[])].join(';')},encoding:'utf8',windowsHide:true,timeout:300000,maxBuffer:2*1024*1024});
  assert.equal(result.status,0,result.stderr||result.stdout||result.error?.message);
  return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
};
const report = {gitAvailable,globalNode:false,packageSpec,packageSource:npmSpec?'npm':'archive-or-github',steps:[],ok:false};
let oldPackageName;
try {
  await mkdir(profile,{recursive:true}); await mkdir(data);
  await writeFile(join(profile,'package.json'),JSON.stringify({name:'isolated-release-test',private:true,customField:{keep:true},dsh:{profile:{bundles:[]}}},null,2));
  await writeFile(join(profile,'cordis.patch.yml'),'# unrelated host config remains untouched\n');
  const install = async (spec, legacy = false) => {
    const result = packageOperation(legacy?oldDesktopExe:desktopExe,['add',spec],{activateNewBundles:legacy || !oldPackage});
    assert.equal(result.exitCode,0,result.output); assert.notEqual(result.timedOut,true);
    const manifest = JSON.parse(await readFile(join(profile,'package.json'),'utf8'));
    assert.equal(manifest.customField.keep,true);
    const name = legacy ? Object.keys(manifest.dependencies).find(name=>name==='dsh-cuigengji'||name===currentManifest.name) : currentManifest.name;
    assert.ok(name,'writing bundle dependency is installed');
    if (legacy || !oldPackage) assert.ok(manifest.dsh.profile.bundles.includes(name));
    return JSON.parse(await readFile(join(profile,'node_modules',name,'package.json'),'utf8')).version;
  };
  const smoke=(exe,version)=>{
    const result=spawnSync(resolve(exe),['--expose-internals',fileURLToPath(new URL('./installed-release-smoke.mjs',import.meta.url)),join(profile,'node_modules',currentManifest.name),data,version],
      {env,encoding:'utf8',windowsHide:true,timeout:120000});
    assert.equal(result.status,0,result.stderr || result.stdout || result.error?.message);
    return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1));
  };
  if (oldPackage) {
    const oldVersion = await install(resolve(oldPackage),true);
    const oldProfile = JSON.parse(await readFile(join(profile,'package.json'),'utf8'));
    oldPackageName = Object.keys(oldProfile.dependencies).find(name=>name==='dsh-cuigengji'||name===currentManifest.name);
    assert.ok(oldPackageName);
    await copyFile(new URL('../tests/fixtures/public-0.3.13/store.json',import.meta.url),join(data,'store.json'));
    await writeFile(join(profile,'cordis.patch.yml'),`# unrelated host config remains untouched\n- id: cuigengji\n  name: ${oldPackageName}\n  config:\n    dataRoot: ${JSON.stringify(data)}\n`);
    report.steps.push({operation:'install-old',packageName:oldPackageName,version:oldVersion});
    if(oldPackageName===currentManifest.name)report.beforeUpgrade=smoke(oldDesktopExe,oldVersion);
  }
  const target = npmSpec || (/^(?:https?:|github:|git\+https?:)/.test(packageSpec) ? packageSpec : resolve(packageSpec));
  assert.equal(await install(target),currentManifest.version);
  if (oldPackage) {
    // This disposable profile has its own stopped shell identity, so the
    // user's unrelated desktop may remain open during isolated acceptance.
    const isolatedExe = join(workspace,'Isolated DeepSeek Harness.exe');
    await copyFile(resolve(desktopExe),isolatedExe);
    const rename = spawnSync(resolve(desktopExe),['--expose-internals',join(profile,'node_modules',currentManifest.name,'runtime/adapters/dsh/rename-installation.js'),
      '--profile',profile,'--home',context.home,'--apply','--desktop-exe',isolatedExe],{env,encoding:'utf8',windowsHide:true,timeout:60000});
    assert.equal(rename.status,0,rename.stderr||rename.stdout);
    assert.ok(rename.stdout.trim(),'Installed migration CLI must return a result when started through the pnpm package link');
    report.rename = JSON.parse(rename.stdout.trim().split(/\r?\n/).at(-1));
    assert.ok(report.rename.bundles.includes(currentManifest.name));
    assert.ok(!report.rename.bundles.includes('dsh-cuigengji'));
    const patch = await readFile(join(profile,'cordis.patch.yml'),'utf8');
    assert.ok(patch.includes('# unrelated host config remains untouched'));
    assert.equal(parse(patch).find(row=>row.id==='cuigengji').config.dataRoot,data);
  }
  const selected=JSON.parse(await readFile(join(profile,'package.json'),'utf8'));
  assert.ok(selected.dsh.profile.bundles.includes(currentManifest.name));
  assert.ok(!selected.dsh.profile.bundles.includes('dsh-cuigengji'));
  for (const path of ['runtime/index.js','runtime/application/maintenance/upgrade.js','runtime/infrastructure/persistence/upgrade-backup.js','runtime/adapters/dsh/rename-installation.js','lib/client.js','skills/cuigengji-maintenance/SKILL.md']) {
    const hash = bytes => createHash('sha256').update(bytes).digest('hex');
    assert.equal(hash(await readFile(join(profile,'node_modules',currentManifest.name,path))),hash(await readFile(new URL('../'+path,import.meta.url))),`installed ${path} must match this build`);
  }
  report.steps.push({operation:oldPackage?'update':'fresh-install',version:currentManifest.version});
  const policy = await readFile(join(profile,'pnpm-workspace.yaml'),'utf8').catch(error=>{if(error.code==='ENOENT') return ''; throw error;});
  assert.ok(!/dsh-cuigengji[^\r\n]*:\s*(?:true|set this to true or false)/.test(policy),'install must not grant or request plugin build-script permissions');
  report.smoke=smoke(desktopExe,currentManifest.version);
  if(report.beforeUpgrade){
    assert.equal(report.smoke.initialStateDigest,report.beforeUpgrade.finalStateDigest,'Upgrade must preserve the complete logical workspace');
    report.logicalWorkspacePreserved=true;
  }
  if (oldPackageName === 'dsh-cuigengji') {
    const cleanup = packageOperation(desktopExe,['remove','dsh-cuigengji']);
    assert.equal(cleanup.exitCode,0,cleanup.output);
    const final=JSON.parse(await readFile(join(profile,'package.json'),'utf8'));
    assert.ok(!final.dependencies['dsh-cuigengji']);
    assert.ok(final.dsh.profile.bundles.includes(currentManifest.name));
    report.steps.push({operation:'remove-legacy-package',dataRetained:true});
  }
  report.ok = true;
  if (args.includes('--report')) {await mkdir(dirname(resolve(arg('--report'))),{recursive:true}); await writeFile(resolve(arg('--report')),JSON.stringify(report,null,2));}
  console.log(JSON.stringify(report));
} finally {await rm(workspace,{recursive:true,force:true});}

// Maintainer entry: npm run release -- <plan|prepare|publish|verify|status|trust>.
// Host installation acceptance is disposable; it never updates the author's DSH.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {readFile,writeFile,mkdir,rename,stat,access,rm} from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {identity,sha256,checksumFor,assertPrepared,assetAction,releaseNotes,verifyRegistry,responseJSON,
  REPOSITORY,PACKAGE,REGISTRY,WORKFLOW,MARKET,assetURL,distTag,safeError,trustEntries,matchingTrust,marketUpdate} from './release-support.mjs';

const root=fileURLToPath(new URL('../',import.meta.url)), argv=process.argv.slice(2), command=argv.shift();
const value=name=>{const at=argv.indexOf(name); return at<0?undefined:argv[at+1];};
const has=name=>argv.includes(name);
const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8')), release=identity(pkg);
const dir=join(root,'releases',release.tag), stateFile=join(dir,'release-state.json');
const archive=join(dir,release.asset), sums=join(dir,'SHA256SUMS'), notesFile=join(dir,'release-notes.md');
const desktopExe=value('--desktop-exe') || process.env.CUIGENGJI_DESKTOP_EXE;
const oldDesktopExe=value('--old-desktop-exe') || process.env.CUIGENGJI_PREVIOUS_DESKTOP_EXE;
let state;
let locked=false;
const lock=join(dir,'.release-lock');

async function run(bin,args,{inherit=false,timeout=900000,quiet=false,input}={}) {
  if (!quiet) console.log(`> ${bin==='npm'?'npm':bin} ${args.join(' ')}`);
  // npm.cmd cannot be started with shell:false on Windows. Use npm's JS entry.
  if (bin==='npm') {
    let cli=process.env.npm_execpath;
    if (!cli) {
      const executable=(await run(process.platform==='win32'?'where.exe':'which',['npm'],{quiet:true})).trim().split(/\r?\n/)[0];
      cli=process.platform==='win32'?join(dirname(executable),'node_modules/npm/bin/npm-cli.js'):await import('node:fs/promises').then(fs=>fs.realpath(executable));
    }
    bin=process.execPath; args=[cli,...args];
  }
  return new Promise((done,reject)=>{
    const child=spawn(bin,args,{cwd:root,windowsHide:true,shell:false,stdio:inherit?'inherit':['pipe','pipe','pipe']});
    let out='',err='';
    child.stdout?.on('data',bytes=>{out+=bytes;}); child.stderr?.on('data',bytes=>{err+=bytes;});
    if (!inherit) child.stdin.end(input);
    const timer=setTimeout(()=>child.kill(),timeout);
    child.once('error',error=>{clearTimeout(timer); reject(error);});
    child.once('close',(code,signal)=>{clearTimeout(timer);
      if (code===0) done(out);
      else reject(new Error(`${bin} failed (${signal||code}): ${safeError((err||out).slice(-7000))}`));
    });
  });
}
const git=(...args)=>run('git',args,{quiet:true}).then(text=>text.trim());
const gh=(...args)=>run('gh',[...args,'--repo',REPOSITORY],{quiet:true});
const jsonGH=async(...args)=>JSON.parse(await gh(...args));
const api=async(path,...args)=>JSON.parse(await run('gh',['api',path,...args],{quiet:true}));
const exists=async path=>access(path).then(()=>true,error=>{if(error.code==='ENOENT')return false;throw error;});
const save=async()=>{await mkdir(dir,{recursive:true}); await writeFile(stateFile+'.tmp',JSON.stringify(state,null,2)+'\n'); await rename(stateFile+'.tmp',stateFile);};

async function source() {
  assert.equal(resolve(await git('rev-parse','--show-toplevel')),resolve(root), 'Run from the plugin checkout');
  assert.equal(await git('branch','--show-current'),'main','Release from main');
  assert.match(await git('remote','get-url','origin'),/^https:\/\/github\.com\/mistnest\/dsh-cuigengji-plugin(?:\.git)?$|^git@github\.com:mistnest\/dsh-cuigengji-plugin\.git$/);
  return {commit:await git('rev-parse','HEAD'),clean:!(await git('status','--porcelain'))};
}
async function remoteRelease() {
  const rows=await jsonGH('release','list','--limit','100','--json','tagName,isDraft');
  return rows.some(row=>row.tagName===release.tag)?jsonGH('release','view',release.tag,'--json','tagName,isDraft,isPrerelease,assets,url'):null;
}
async function enabled() {
  const rows=JSON.parse(await run('gh',['variable','list','--repo',REPOSITORY,'--json','name,value'],{quiet:true}));
  return rows.some(row=>row.name==='NPM_TRUSTED_PUBLISHING_ENABLED' && row.value==='true');
}
async function prepared() {
  state=JSON.parse(await readFile(stateFile,'utf8'));
  const {commit,clean}=await source();
  assertPrepared(state,{commit,clean,version:release.version,hash:sha256(await readFile(archive))});
  assert.equal(checksumFor(await readFile(sums,'utf8'),release.asset),state.sha256);
  assert.equal(sha256(await readFile(notesFile)),state.notesHash,'Prepared release notes changed');
}
async function acquireLock() {
  await mkdir(dir,{recursive:true});
  try {await mkdir(lock);}
  catch(error) {
    if (error.code!=='EEXIST') throw error;
    const owner=JSON.parse(await readFile(join(lock,'owner.json'),'utf8'));
    assert.equal(owner.hostname,(await import('node:os')).hostname(),'Release locked by another computer');
    let dead=false;
    try {process.kill(owner.pid,0);} catch(error) {if(error.code==='ESRCH')dead=true;else throw error;}
    assert.ok(dead,'Another release process is running. Do not publish concurrently');
    await rm(lock,{recursive:true}); await mkdir(lock);
  }
  locked=true;
  await writeFile(join(lock,'owner.json'),JSON.stringify({pid:process.pid,hostname:(await import('node:os')).hostname()}));
}
async function waitWorkflow(name,allowDispatch=false) {
  const started=Date.now(); let dispatched=false;
  while (Date.now()-started<45*60*1000) {
    const rows=await jsonGH('run','list','--workflow',name,'--limit','30','--json','databaseId,headSha,status,conclusion,url,createdAt');
    const current=rows.find(row=>row.headSha===state.sourceCommit);
    if (current) {
      if (current.status==='completed') {
        if (name===WORKFLOW) {
          const jobs=await api(`repos/${REPOSITORY}/actions/runs/${current.databaseId}/jobs`);
          if (jobs.jobs.some(job=>job.steps.some(step=>step.name==='Publish using npm trusted publishing' && step.conclusion==='success'))) {
            state.npm={...state.npm,uploadAccepted:true,workflow:current}; await save();
          }
        }
        assert.equal(current.conclusion,'success',`Workflow failed or was skipped: ${current.url}`); return current;
      }
      console.log(`${name} ${current.databaseId}: ${current.status}`);
    } else if (allowDispatch&&!dispatched&&Date.now()-started>60000) {
      await gh('workflow','run',name,'--field',`tag=${release.tag}`); dispatched=true;
    }
    await new Promise(done=>setTimeout(done,15000));
  }
  throw new Error(`${name} did not finish in 45 minutes. Inspect the existing run and resume verification; do not repack or repeat an accepted upload`);
}
async function native(spec,label,oldPackage) {
  const report=join(dir,`${label}.json`);
  await run(process.execPath,[join(root,'scripts/check-release-install.mjs'),'--desktop-exe',state.desktopExe,
    '--package',spec,...(oldPackage?['--old-package',oldPackage,...(state.oldDesktopExe?['--old-desktop-exe',state.oldDesktopExe]:[])]:[]),'--report',report]);
  const result=JSON.parse(await readFile(report,'utf8')); assert.equal(result.ok,true); return result;
}

async function prepare() {
  assert.equal(process.platform,'win32','Native desktop acceptance requires Windows');
  assert.ok(desktopExe,'Pass --desktop-exe <DSH exe> or set CUIGENGJI_DESKTOP_EXE');
  assert.ok((await stat(desktopExe)).isFile(),'DSH executable is missing');
  const src=await source(); assert.ok(src.clean,'Commit the version, changes and changelog first');
  const publicRelease=await remoteRelease();
  assert.ok(!publicRelease || publicRelease.isDraft,'This version is already public. Increment the version; never repack it');
  const npm=await responseJSON(`${REGISTRY}/${PACKAGE}/${release.version}`);
  assert.ok(!npm,'This version is already on npm. Increment the version');
  if (has('--reset')) {
    assert.ok(!publicRelease,'Reset is only allowed before any GitHub release exists');
    assert.equal(await git('ls-remote','--tags','origin',`refs/tags/${release.tag}`),'','Cannot reset an already pushed tag');
    assert.equal(await git('tag','--list',release.tag),'','Cannot reset a tagged release');
    const history=join(dir,'preparation-history',`${Date.now()}`); await mkdir(history,{recursive:true});
    for (const file of [stateFile,archive,sums,notesFile,join(dir,'pack-files.json')]) {
      if (await exists(file)) await rename(file,join(history,file.slice(dir.length+1)));
    }
  }
  if (await exists(stateFile)) {
    state=JSON.parse(await readFile(stateFile,'utf8'));
    assert.equal(state.sourceCommit,src.commit,'A prepared version belongs to another commit; use a new version');
    if (state.checks?.prepared) {await prepared(); console.log('Prepared package is unchanged; resuming without repacking.'); return;}
    if (state.sha256) assert.equal(sha256(await readFile(archive)),state.sha256,'Interrupted preparation archive changed');
  } else assert.equal(await exists(archive),false,'Untracked archive has no preparation state; use --reset before publication');
  state={schemaVersion:1,...release,sourceCommit:src.commit,sha256:null,checks:{},
    desktopExe:resolve(desktopExe),...(oldDesktopExe?{oldDesktopExe:resolve(oldDesktopExe)}:{}),dshBaseline:pkg.engines.dsh,startedAt:new Date().toISOString(),github:{published:false},npm:{published:false},market:{}};
  await save();
  await run('npm',['test']); state.checks.unitTests=true;
  await run('npm',['run','typecheck']); state.checks.typecheck=true;
  await run('npm',['run','build']); await run('npm',['run','check:build']); state.checks.build=true;
  assert.equal((await source()).clean,true,'Build changed committed outputs; commit them before preparing');
  const notes=releaseNotes(await readFile(join(root,'docs/CHANGELOG.md'),'utf8'),release.version,pkg.engines.dsh);
  await writeFile(notesFile,notes); state.notesHash=sha256(Buffer.from(notes));
  // Resume interrupted preparation using its original bytes, never a second pack.
  if (!(await exists(archive))) await run('npm',['pack','--ignore-scripts','--json','--pack-destination',dir]);
  const pack=JSON.parse(await run('npm',['pack',archive,'--ignore-scripts','--dry-run','--json'],{quiet:true}));
  const packFile=join(dir,'pack-files.json'); await writeFile(packFile,JSON.stringify(pack));
  await run(process.execPath,[join(root,'scripts/audit-release.mjs'),packFile]); state.checks.packageAudit=true;
  state.sha256=sha256(await readFile(archive)); await writeFile(sums,`${state.sha256}  ${release.asset}\n`);
  await save();
  state.checks.freshNoGit=await native(archive,'fresh-no-git'); await save();
  const hostReport=join(dir,'host-compatibility.json');
  await run(process.execPath,[join(root,'scripts/check-host-compat.mjs'),'--desktop-exe',state.desktopExe,'--package',archive,'--report',hostReport]);
  state.checks.hostCompatibility=JSON.parse(await readFile(hostReport,'utf8'));assert.equal(state.checks.hostCompatibility.ok,true);await save();
  // Test both the most recent stable archive and the old-name migration boundary.
  const releases=await jsonGH('release','list','--limit','100','--json','tagName,isDraft,isPrerelease');
  const previous=releases.find(row=>!row.isDraft&&!row.isPrerelease&&row.tagName!==release.tag)?.tagName;
  const oldTags=[...new Set([previous,'v0.4.1'].filter(Boolean))];
  assert.ok(previous,'Public upgrade baseline is missing'); state.oldArchives=[];
  for (const tag of oldTags) {
    const old=await jsonGH('release','view',tag,'--json','assets');
    const oldAsset=old.assets.filter(row=>/^dsh-cuigengji(?:-plugin)?-[0-9].*\.tgz$/.test(row.name));
    assert.equal(oldAsset.length,1,`Expected one plugin archive on ${tag}`);
    const oldDir=join(dir,'upgrade-from',tag); await mkdir(oldDir,{recursive:true});
    await gh('release','download',tag,'--pattern',oldAsset[0].name,'--pattern','SHA256SUMS','--dir',oldDir,'--skip-existing');
    const oldFile=join(oldDir,oldAsset[0].name), hash=sha256(await readFile(oldFile));
    assert.equal(hash,checksumFor(await readFile(join(oldDir,'SHA256SUMS'),'utf8'),oldAsset[0].name),'Old public archive checksum mismatch');
    state.oldArchives.push({tag,path:oldFile,sha256:hash});
    state.checks[`upgradeFrom${tag}`]=await native(archive,`upgrade-from-${tag}`,oldFile); await save();
  }
  state.checks.prepared=true; state.preparedAt=new Date().toISOString(); delete state.lastError; await save();
}

async function ensureAssets(remote) {
  const downloads=join(dir,'github-assets'); await mkdir(downloads,{recursive:true});
  for (const [name,file] of [[release.asset,archive],['SHA256SUMS',sums]]) {
    const present=remote.assets.some(row=>row.name===name); let actual;
    if (present) {
      await gh('release','download',release.tag,'--pattern',name,'--dir',downloads,'--clobber');
      actual=sha256(await readFile(join(downloads,name)));
    }
    if (assetAction({draft:remote.isDraft,exists:present,expected:sha256(await readFile(file)),actual})==='upload') {
      await gh('release','upload',release.tag,file); // no --clobber
    }
  }
}

async function publish() {
  await prepared();
  const githubOnly=has('--github-only');
  assert.ok(githubOnly||await enabled(),'npm trusted publishing is not enabled. Run release trust once, or explicitly use --github-only and report npm as pending');
  // Push without force. Local and remote tag identities are checked before reuse.
  await run('git',['push','origin','HEAD:refs/heads/main']);
  state.checks.githubCI=await waitWorkflow('check.yml'); await save();
  const remoteTag=(await git('ls-remote','--tags','origin',`refs/tags/${release.tag}`,`refs/tags/${release.tag}^{}`)).split(/\r?\n/).filter(Boolean);
  if (remoteTag.length) {
    const resolved=remoteTag.find(row=>row.endsWith('^{}'))||remoteTag[0];
    assert.equal(resolved.split(/\s+/)[0],state.sourceCommit,'Remote release tag points to another commit');
  } else {
    const localTags=(await git('tag','--list',release.tag));
    if (localTags) assert.equal(await git('rev-list','-n','1',release.tag),state.sourceCommit,'Local release tag points to another commit');
    else await git('tag',release.tag,state.sourceCommit);
    await run('git',['push','origin',`refs/tags/${release.tag}`]);
  }
  let remote=await remoteRelease();
  if (!remote) {
    await gh('release','create',release.tag,'--verify-tag','--draft','--title',`催更姬 ${release.version}`,
      '--notes-file',notesFile,...(distTag(release.version)==='next'?['--prerelease']:[]));
    remote=await remoteRelease();
  }
  await ensureAssets(remote);
  // A draft also gets a second download after upload to verify transport bytes.
  await ensureAssets(await remoteRelease());
  if (remote.isDraft) await gh('release','edit',release.tag,'--draft=false',...(distTag(release.version)==='latest'?['--latest']:[]));
  state.github={published:true,url:`https://github.com/${REPOSITORY}/releases/tag/${release.tag}`}; await save();
  if (!githubOnly && !state.npm.uploadAccepted) {
    state.npm.workflow=await waitWorkflow(WORKFLOW,true); await save();
  }
  await verify(githubOnly);
}

async function syncMarket() {
  // Only update the existing, user-authorized submission; don't create comments or new PRs.
  const pr=JSON.parse(await run('gh',['pr','view',String(MARKET.pr),'--repo',MARKET.upstream,'--json','state,url,headRefName,headRepositoryOwner'],{quiet:true}));
  state.market={submission:pr.url,state:pr.state,publicInstallVerified:false};
  if (pr.state!=='OPEN') {state.market.nextStep='Check the public catalog and prepare a separate entry update if needed'; await save(); return;}
  assert.equal(pr.headRefName,MARKET.branch); assert.equal(pr.headRepositoryOwner.login,'mistnest');
  const file=await api(`repos/${MARKET.repository}/contents/${MARKET.path}?ref=${MARKET.branch}`);
  const before=Buffer.from(file.content.replace(/\s/g,''),'base64').toString('utf8');
  const after=marketUpdate(before,release.version);
  if (after!==before) {
    await run('gh',['api',`repos/${MARKET.repository}/contents/${MARKET.path}`,'--method','PUT','--input','-'],
      {quiet:true,input:JSON.stringify({message:`Update cuigengji install target to ${release.version}`,branch:MARKET.branch,sha:file.sha,
        content:Buffer.from(after).toString('base64')})});
    const updated=await api(`repos/${MARKET.repository}/contents/${MARKET.path}?ref=${MARKET.branch}`);
    assert.equal(Buffer.from(updated.content.replace(/\s/g,''),'base64').toString('utf8'),after,'Market entry update was not retained');
  }
  state.market.target=assetURL(release.version); state.market.entryUpdated=true; await save();
}

async function verify(githubOnly=has('--github-only')) {
  await prepared(); const remote=await remoteRelease(); assert.ok(remote&&!remote.isDraft,'GitHub release is not public');
  await ensureAssets(remote); state.github={published:true,url:remote.url,assetsVerified:true}; await save();
  // Public URL is tested separately from authenticated downloads of Release assets.
  state.checks.publicArchiveNoGit=await native(assetURL(release.version),'public-archive-no-git',state.oldArchives[0].path); await save();
  state.npm={...state.npm,...await verifyRegistry({version:release.version,expectedHash:state.sha256})}; await save();
  if (state.npm.published) {
    const report=join(dir,'npm-no-git.json');
    await run(process.execPath,[join(root,'scripts/check-release-install.mjs'),'--desktop-exe',state.desktopExe,
      '--npm-package',`${PACKAGE}@${release.version}`,'--old-package',state.oldArchives[0].path,...(state.oldDesktopExe?['--old-desktop-exe',state.oldDesktopExe]:[]),'--report',report]);
    state.checks.npmNoGit=JSON.parse(await readFile(report,'utf8')); assert.equal(state.checks.npmNoGit.ok,true); await save();
  } else assert.ok(githubOnly,'Exact npm version is not public; staging or a successful CLI exit is insufficient. Resume verify when it is available');
  await syncMarket();
  state.complete=Boolean(state.npm.published&&state.checks.npmNoGit?.ok); state.completedAt=new Date().toISOString(); delete state.lastError; await save();
  await writeFile(join(dir,'announcement.md'),await readFile(notesFile));
}

async function trust() {
  // Uses npm's official 2FA flow once; never copies keys or recovery codes.
  const prefix=['exec','--yes','--package=npm@12.2.0',`--registry=${REGISTRY}`,'--','npm'];
  const list=async()=>trustEntries(await run('npm',[...prefix,'trust','list',PACKAGE,'--json',`--registry=${REGISTRY}`],{quiet:true}));
  if (!matchingTrust(await list())) await run('npm',[...prefix,'trust','github',PACKAGE,'--file',WORKFLOW,'--repository',REPOSITORY,
    '--allow-publish','--yes',`--registry=${REGISTRY}`],{inherit:true});
  assert.ok(matchingTrust(await list()),'Exact trusted publisher with direct-publish permission is missing');
  await run('gh',['variable','set','NPM_TRUSTED_PUBLISHING_ENABLED','--repo',REPOSITORY,'--body','true']);
  console.log('Trust configured. Complete a real OIDC publish of a new version within two days; an already-published version only verifies hashes.');
}

async function status() {
  const src=await source(), remote=await remoteRelease();
  const meta=await responseJSON(`${REGISTRY}/${PACKAGE}`);
  const exact=await responseJSON(`${REGISTRY}/${PACKAGE}/${release.version}`);
  const local=await exists(stateFile)?JSON.parse(await readFile(stateFile,'utf8')):null;
  const pr=JSON.parse(await run('gh',['pr','view',String(MARKET.pr),'--repo',MARKET.upstream,'--json','state,url'],{quiet:true}));
  const exactVersionExists=exact?.version===release.version;
  const next=local?.complete && exactVersionExists ? (pr.state==='OPEN'?'Core channels verified; marketplace submission is waiting for upstream review':'Check market availability; increment the version before the next release')
    : !local?.checks?.prepared ? (src.clean?'prepare the committed version with a desktop executable':'commit version, changelog and generated outputs before prepare')
    : src.commit!==local.sourceCommit ? 'Resume this release from its original prepared checkout; published archives cannot be reset'
    : !remote || remote.isDraft ? 'publish the prepared archive'
    : !exactVersionExists ? 'Check the npm upload run. If accepted, wait for registry processing and resume verify; workflow retries must use verify_only=true'
    : !local.checks.npmNoGit?.ok ? 'verify the public npm package and native no-Git upgrade'
    : pr.state==='OPEN' ? 'Core channels verified; marketplace submission is waiting for upstream review'
    : 'Check public market search and installation for this version';
  console.log(JSON.stringify({...release,source:src,localState:local?{path:stateFile,prepared:local.checks?.prepared===true,complete:local.complete===true,lastError:local.lastError}:null,
    github:remote?{published:!remote.isDraft,url:remote.url}:null,npm:{exactVersionExists,distTags:meta?.['dist-tags']||{},
      placeholderOnly:meta?.['dist-tags']?.latest==='0.0.0-stage',trustedWorkflowEnabled:await enabled()},market:pr,
    next},null,2));
}

try {
  if (['prepare','publish','verify','trust'].includes(command)) await acquireLock();
  if (command==='plan'||command==='status') await status();
  else if (command==='prepare') await prepare();
  else if (command==='publish') await publish();
  else if (command==='verify') await verify();
  else if (command==='trust') await trust();
  else throw new Error('Usage: npm run release -- plan | prepare --desktop-exe <exe> | publish [--github-only] | verify [--github-only] | status | trust');
  if (state) console.log(JSON.stringify({version:state.version,prepared:state.checks.prepared===true,complete:state.complete===true,
    github:state.github,npm:state.npm,market:state.market,report:stateFile},null,2));
} catch(error) {
  if (state) {state.lastError={step:command,at:new Date().toISOString(),message:safeError(error)}; await save();}
  console.error(safeError(error)); process.exitCode=1;
} finally {
  if (locked) await rm(lock,{recursive:true});
}

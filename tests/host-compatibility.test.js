import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {evaluatePluginCompatibility} from '@deepseek-ai/dsh-app-boot';

const DSH_PEERS=['@deepseek-ai/dsh-atomic-write','@deepseek-ai/dsh-tools'];

test('DSH accepts the 0.2.0 and 0.2.1 host lines and rejects prereleases outside them without exemptions',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  const range=manifest.engines.dsh;
  // Older hosts fall back to the dsh peers, so both declarations must describe the same window.
  for(const name of DSH_PEERS) assert.equal(manifest.peerDependencies[name],range,name);
  // Later versions exercise declaration semantics, not an actual future-host certification.
  for(const version of ['0.2.0-rc.2','0.2.0-rc.3','0.2.0','0.2.1-rc.2','0.2.1','0.2.2-rc.1']) {
    assert.equal(evaluatePluginCompatibility(manifest,{},version),undefined,version);
    // The older host decides by dsh peers instead of engines.dsh.
    const {engines,...legacy}=manifest;
    assert.equal(evaluatePluginCompatibility(legacy,{},version),undefined,version);
  }
  // 0.2.1-alpha.1 sits below the declared 0.2.1-rc.2 baseline; 0.3.0-rc.1/0.3.0/1.0.0 are past the window.
  for(const version of ['0.1.9','0.2.0-rc.1','0.2.1-alpha.1','0.3.0-rc.1','0.3.0','1.0.0']) {
    const issue=evaluatePluginCompatibility(manifest,{},version);
    assert.ok(issue,`${version} must be rejected by engines.dsh`);
    assert.deepEqual(issue.requirements,{'engines.dsh':range},version);
    const {engines,...legacy}=manifest;
    const legacyIssue=evaluatePluginCompatibility(legacy,{},version);
    assert.ok(legacyIssue,`${version} must be rejected by the dsh peers`);
    assert.deepEqual(legacyIssue.requirements,Object.fromEntries(DSH_PEERS.map(name=>[name,range])),version);
  }
  const original={...manifest,version:'0.4.3',engines:{dsh:'0.2.0-rc.2'}};
  assert.deepEqual(evaluatePluginCompatibility(original,{},'0.2.1-rc.2').requirements,{'engines.dsh':'0.2.0-rc.2'});
});

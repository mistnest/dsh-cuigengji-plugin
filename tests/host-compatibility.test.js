import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {evaluatePluginCompatibility} from '@deepseek-ai/dsh-app-boot';

test('DSH accepts the minimum host and later stable or prerelease hosts without exemptions',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  // Later versions exercise declaration semantics, not an actual future-host certification.
  for(const version of ['0.2.0-rc.2','0.2.0-rc.3','0.2.0','0.2.1-rc.2','0.2.1','0.2.2-rc.1','0.3.0','1.0.0']) {
    assert.equal(evaluatePluginCompatibility(manifest,{},version),undefined);
    // The older host decides by dsh peers instead of engines.dsh.
    const {engines,...legacy}=manifest;
    assert.equal(evaluatePluginCompatibility(legacy,{},version),undefined);
  }
  for(const version of ['0.1.9','0.2.0-rc.1']) {
    assert.deepEqual(evaluatePluginCompatibility(manifest,{},version).requirements,{'engines.dsh':'>=0.2.0-rc.2'});
    const {engines,...legacy}=manifest;
    assert.deepEqual(evaluatePluginCompatibility(legacy,{},version).requirements,{
      '@deepseek-ai/dsh-atomic-write':'>=0.2.0-rc.2',
      '@deepseek-ai/dsh-tools':'>=0.2.0-rc.2',
    });
  }
  const original={...manifest,version:'0.4.3',engines:{dsh:'0.2.0-rc.2'}};
  assert.deepEqual(evaluatePluginCompatibility(original,{},'0.2.1-rc.2').requirements,{'engines.dsh':'0.2.0-rc.2'});
});

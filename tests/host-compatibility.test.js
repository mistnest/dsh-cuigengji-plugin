import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {evaluatePluginCompatibility} from '@deepseek-ai/dsh-app-boot';

test('DSH accepts the hotfix on both supported hosts without a version exemption',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
  for(const version of ['0.2.0-rc.2','0.2.1-rc.2']) {
    assert.equal(evaluatePluginCompatibility(manifest,{},version),undefined);
    // The older host decides by dsh peers instead of engines.dsh.
    const {engines,...legacy}=manifest;
    assert.equal(evaluatePluginCompatibility(legacy,{},version),undefined);
  }
  const original={...manifest,version:'0.4.3',engines:{dsh:'0.2.0-rc.2'}};
  assert.deepEqual(evaluatePluginCompatibility(original,{},'0.2.1-rc.2').requirements,{'engines.dsh':'0.2.0-rc.2'});
  assert.equal(evaluatePluginCompatibility(manifest,{},'0.3.0').exempted,false);
});

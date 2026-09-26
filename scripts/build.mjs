import { build } from 'esbuild';
import { mkdir } from 'node:fs/promises';
await mkdir('lib', { recursive: true });
await build({
  entryPoints: ['src/client/index.jsx'], outfile: 'lib/client.js', bundle: true,
  platform: 'browser', format: 'cjs', target: 'es2022', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom', '@deepseek-ai/*'],
  banner: { js: 'window.__ModuleLoader__.load({id:"dsh-cuigengji",factory:(require)=>{var module={exports:{}};var exports=module.exports;' },
  footer: { js: 'return module.exports;}});' },
});

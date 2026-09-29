import { build } from 'esbuild';
import { mkdir, readFile, readdir } from 'node:fs/promises';

const manifest = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
if (typeof manifest.name !== 'string' || !manifest.name) throw new Error('package.json must define a non-empty name');
const loaderId = JSON.stringify(manifest.name);

// Ship JavaScript: Node deliberately does not strip TypeScript inside node_modules.
const serverFiles = (await readdir('src', {recursive:true})).filter(file => !file.startsWith('client') && /\.[jt]s$/.test(file));
await build({
  entryPoints: serverFiles.map(file => `src/${file}`), outbase:'src', outdir:'runtime',
  platform:'node', format:'esm', target:'node24', bundle:false,
  plugins:[{name:'typescript-imports',setup(builder){builder.onLoad({filter:/\.[jt]s$/},async args=>({
    contents:(await readFile(args.path,'utf8')).replace(/(from\s*['"]|import\s*['"])(\.[^'"]+)\.ts(['"])/g,'$1$2.js$3'),loader:args.path.endsWith('.ts')?'ts':'js',
  }));}}],
});

await mkdir('lib', { recursive: true });
await build({
  entryPoints: ['src/client/index.tsx'], outfile: 'lib/client.js', bundle: true,
  platform: 'browser', format: 'cjs', target: 'es2022', jsx: 'automatic',
  external: ['react', 'react/jsx-runtime', 'react-dom', '@deepseek-ai/*'],
  banner: { js: `window.__ModuleLoader__.load({id:${loaderId},factory:(require)=>{var module={exports:{}};var exports=module.exports;` },
  footer: { js: 'return module.exports;}});' },
});

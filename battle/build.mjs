import { build } from 'esbuild';
import fs from 'fs';
import path from 'path';
const here = path.dirname(new URL(import.meta.url).pathname);
const out = await build({
  entryPoints: [path.join(here, 'src/main.js')], bundle: true, minify: true, format: 'iife',
  charset: 'utf8', write: false, target: 'es2020', legalComments: 'none', loader: { '.glb': 'binary' },
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
const html = fs.readFileSync(path.join(here, 'template.html'), 'utf8').replace('<!--GAME_JS-->', () => `<script>${js}</script>`);
fs.mkdirSync(path.join(here, 'dist'), { recursive: true });
fs.writeFileSync(path.join(here, 'dist/index.html'), html);
fs.writeFileSync(path.join(here, '../public/battle.html'), html);
console.log('built', (html.length / 1024 | 0) + 'KB -> dist/index.html, public/battle.html');

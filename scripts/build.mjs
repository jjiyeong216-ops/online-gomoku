import { cp, mkdir, rm } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
const root = new URL('../', import.meta.url);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

for (const file of ['index.html', 'style.css', 'script.js', 'game-result.js']) {
  await cp(new URL(file, root), new URL(file, output));
}

console.log('Built static assets in dist/');

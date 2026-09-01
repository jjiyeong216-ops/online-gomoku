import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../', import.meta.url);

test('defines the Cloudflare build and deploy commands', async () => {
  const packageJson = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
  assert.equal(packageJson.scripts.build, 'node scripts/build.mjs');
  assert.equal(packageJson.scripts.deploy, 'wrangler deploy');
  assert.ok(packageJson.devDependencies.wrangler);
});

test('configures static assets and a SQLite Durable Object', async () => {
  const config = await readFile(new URL('wrangler.jsonc', root), 'utf8');
  assert.match(config, /"main"\s*:\s*"worker\/index\.js"/);
  assert.match(config, /"directory"\s*:\s*"\.\/dist"/);
  assert.match(config, /"name"\s*:\s*"GAME_ROOM"/);
  assert.match(config, /"new_sqlite_classes"\s*:\s*\["GameRoom"\]/);
});

test('build output contains every browser asset', async () => {
  for (const file of ['index.html', 'style.css', 'script.js']) {
    await access(new URL(`dist/${file}`, root));
  }
});

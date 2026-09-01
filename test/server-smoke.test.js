import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { DEFAULT_PORT, createAppServer } from '../server/index.js';

test('uses localhost port 2020 by default', () => {
  assert.equal(DEFAULT_PORT, 2020);
});

test('serves the game page over HTTP', async (t) => {
  const server = createAppServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());

  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/`);

  assert.equal(response.status, 200);
  assert.match(await response.text(), /온라인 1:1 오목/);
});

test('draws stones on line intersections instead of inside boxed cells', async () => {
  const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');
  const cellRule = css.match(/\.cell\s*\{(?<body>[\s\S]*?)\}/)?.groups?.body ?? '';

  assert.match(cellRule, /border:\s*none/);
  assert.match(cellRule, /linear-gradient\(\s*to right/);
  assert.match(cellRule, /linear-gradient\(\s*to bottom/);
});

test('provides nickname, room creation, and code joining controls', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  for (const id of ['nicknameInput', 'ruleSelect', 'createRoomButton', 'roomCodeInput', 'joinRoomButton', 'roomCodeDisplay', 'timerDisplay']) {
    assert.match(html, new RegExp(`id=["']${id}["']`));
  }
});

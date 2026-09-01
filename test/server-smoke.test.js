import assert from 'node:assert/strict';
import { once } from 'node:events';
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
  assert.match(await response.text(), /2인용 오목/);
});

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

test('provides two desktop Kakao ad placeholders', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const css = await readFile(new URL('../style.css', import.meta.url), 'utf8');

  assert.match(html, /id=["']leftAdSlot["'][^>]*class=["'][^"']*ad-slot/);
  assert.match(html, /id=["']rightAdSlot["'][^>]*class=["'][^"']*ad-slot/);
  assert.match(css, /\.page-shell\s*\{[\s\S]*grid-template-columns:\s*160px\s+minmax\(0,\s*900px\)\s+160px/);
  assert.match(css, /\.ad-slot\s*\{[\s\S]*width:\s*160px[\s\S]*height:\s*600px/);
  assert.match(css, /@media\s*\(max-width:\s*1299px\)[\s\S]*\.ad-rail\s*\{[\s\S]*display:\s*none/);
});

test('loads the configured Kakao AdFit unit in the left slot once', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id=["']leftAdSlot["'][\s\S]*?data-ad-unit=["']DAN-jpKLsrimtcgIKeCs["']/);
  assert.match(html, /data-ad-width=["']160["'][\s\S]*?data-ad-height=["']600["']/);
  assert.equal((html.match(/t1\.kakaocdn\.net\/kas\/static\/ba\.min\.js/g) ?? []).length, 1);
});

test('loads the configured Kakao AdFit unit in the right slot', async () => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(html, /id=["']rightAdSlot["'][\s\S]*?data-ad-unit=["']DAN-nh5VAdlWP3tRoeVH["']/);
  assert.match(html, /data-ad-unit=["']DAN-nh5VAdlWP3tRoeVH["'][\s\S]*?data-ad-width=["']160["'][\s\S]*?data-ad-height=["']600["']/);
  assert.equal((html.match(/t1\.kakaocdn\.net\/kas\/static\/ba\.min\.js/g) ?? []).length, 1);
});

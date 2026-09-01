import assert from 'node:assert/strict';
import { once } from 'node:events';
import test from 'node:test';
import WebSocket from 'ws';

import { createAppServer } from '../server/index.js';
import { RoomManager } from '../server/room-manager.js';

function nextMessage(socket) {
  return Promise.race([new Promise((resolve, reject) => {
    socket.once('message', (data) => resolve(JSON.parse(data.toString())));
    socket.once('error', reject);
  }), new Promise((_, reject) => setTimeout(() => reject(new Error('message timeout')), 750))]);
}

async function connect(url) {
  const socket = new WebSocket(url);
  await once(socket, 'open');
  return socket;
}

test('two clients create and join the same online room', async (t) => {
  const server = createAppServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const { port } = server.address();
  const host = await connect(`ws://127.0.0.1:${port}`);
  const guest = await connect(`ws://127.0.0.1:${port}`);
  t.after(() => host.close());
  t.after(() => guest.close());

  host.send(JSON.stringify({ type: 'create_room', nickname: '방장', rule: 'freestyle' }));
  const created = await nextMessage(host);
  assert.equal(created.type, 'state_changed');
  assert.match(created.state.code, /^[A-Z2-9]{6}$/);
  assert.equal(created.state.status, 'waiting');

  const hostUpdate = nextMessage(host);
  guest.send(JSON.stringify({ type: 'join_room', nickname: '손님', code: created.state.code }));
  const [joinedHost, joinedGuest] = await Promise.all([hostUpdate, nextMessage(guest)]);
  assert.equal(joinedHost.state.status, 'playing');
  assert.deepEqual(joinedHost.state.board, joinedGuest.state.board);
  assert.notEqual(joinedHost.you.color, joinedGuest.you.color);

  const black = joinedHost.you.color === 1 ? host : guest;
  const other = black === host ? guest : host;
  const blackUpdate = nextMessage(black);
  const otherUpdate = nextMessage(other);
  black.send(JSON.stringify({ type: 'place_stone', row: 7, col: 7 }));
  const [afterBlack, afterOther] = await Promise.all([blackUpdate, otherUpdate]);
  assert.equal(afterBlack.state.board[7][7], 1);
  assert.equal(afterOther.state.board[7][7], 1);

  const closedMessage = nextMessage(other);
  black.close();
  const closed = await closedMessage;
  assert.equal(closed.type, 'room_closed');
});

test('broadcasts a server-authoritative timeout result', async (t) => {
  const roomManager = new RoomManager({ turnDurationMs: 40, random: () => 0 });
  const server = createAppServer({ roomManager });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => server.close());
  const { port } = server.address();
  const host = await connect(`ws://127.0.0.1:${port}`);
  const guest = await connect(`ws://127.0.0.1:${port}`);
  t.after(() => host.close());
  t.after(() => guest.close());

  host.send(JSON.stringify({ type: 'create_room', nickname: '방장', rule: 'freestyle' }));
  const created = await nextMessage(host);
  const hostPlaying = nextMessage(host);
  guest.send(JSON.stringify({ type: 'join_room', nickname: '손님', code: created.state.code }));
  await Promise.all([hostPlaying, nextMessage(guest)]);
  const [hostFinished, guestFinished] = await Promise.all([nextMessage(host), nextMessage(guest)]);

  assert.equal(hostFinished.state.status, 'finished');
  assert.equal(hostFinished.state.finishReason, 'timeout');
  assert.equal(guestFinished.state.finishReason, 'timeout');
});

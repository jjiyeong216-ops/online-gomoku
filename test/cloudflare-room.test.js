import assert from 'node:assert/strict';
import test from 'node:test';

import { BLACK, WHITE } from '../server/game-rules.js';
import { GameRoomState } from '../worker/game-room-state.js';

test('creates and joins a Cloudflare room with random colors', () => {
  const room = new GameRoomState({ code: 'ABC234', now: () => 1_000, random: () => 0.9 });
  let host = room.addPlayer({ id: 'host', nickname: '방장', mode: 'create', rule: 'freestyle' });
  assert.equal(host.state.status, 'waiting');
  assert.equal(host.you.color, null);
  const guest = room.addPlayer({ id: 'guest', nickname: '손님', mode: 'join' });
  host = room.snapshotFor('host');
  assert.equal(host.you.color, WHITE);
  assert.equal(guest.you.color, BLACK);
  assert.equal(guest.state.turnDeadline, 31_000);
});

test('rejects joining a room that was never created', () => {
  const room = new GameRoomState({ code: 'ABC234' });
  assert.throws(() => room.addPlayer({ id: 'guest', nickname: '손님', mode: 'join' }), /ROOM_NOT_FOUND/);
});

test('applies server-authoritative moves and timeouts', () => {
  const clock = { value: 1_000 };
  const room = new GameRoomState({ code: 'ABC234', now: () => clock.value, random: () => 0 });
  room.addPlayer({ id: 'host', nickname: '방장', mode: 'create', rule: 'freestyle' });
  room.addPlayer({ id: 'guest', nickname: '손님', mode: 'join' });
  clock.value = 5_000;
  const moved = room.placeStone({ id: 'host', row: 7, col: 7 });
  assert.equal(moved.state.board[7][7], BLACK);
  assert.equal(moved.state.currentPlayer, WHITE);
  assert.equal(moved.state.turnDeadline, 35_000);
  clock.value = 35_000;
  const timedOut = room.timeout();
  assert.equal(timedOut.status, 'finished');
  assert.equal(timedOut.winner, BLACK);
  assert.equal(timedOut.finishReason, 'timeout');
});

test('closes the room when either player disconnects', () => {
  const room = new GameRoomState({ code: 'ABC234', random: () => 0 });
  room.addPlayer({ id: 'host', nickname: '방장', mode: 'create', rule: 'renju' });
  room.addPlayer({ id: 'guest', nickname: '손님', mode: 'join' });
  assert.deepEqual(room.removePlayer('guest'), { remainingPlayerId: 'host', closed: true });
  assert.equal(room.exportState(), null);
});

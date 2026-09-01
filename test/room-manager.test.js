import assert from 'node:assert/strict';
import test from 'node:test';

import { BLACK, WHITE } from '../server/game-rules.js';
import { RoomManager } from '../server/room-manager.js';

function manager(random = () => 0) {
  return new RoomManager({ codeGenerator: () => 'ABC123', random });
}

function timedManager(now) {
  return new RoomManager({ codeGenerator: () => 'ABC123', random: () => 0, now: () => now.value });
}

test('creates a waiting room with a normalized host', () => {
  const rooms = manager();
  const state = rooms.createRoom({ socketId: 'host', nickname: '  방장  ', rule: 'freestyle' });
  assert.equal(state.code, 'ABC123');
  assert.equal(state.status, 'waiting');
  assert.deepEqual(state.players, [{ nickname: '방장', color: null }]);
});

test('joins a guest as white and starts the game', () => {
  const rooms = manager();
  rooms.createRoom({ socketId: 'host', nickname: '방장', rule: 'renju' });
  const state = rooms.joinRoom({ socketId: 'guest', nickname: '손님', code: 'abc123' });
  assert.equal(state.status, 'playing');
  assert.deepEqual(state.players.map((player) => player.color), [BLACK, WHITE]);
  assert.equal(state.currentPlayer, BLACK);
});

test('randomly assigns the guest as black when the draw flips', () => {
  const rooms = manager(() => 0.9);
  rooms.createRoom({ socketId: 'host', nickname: '방장', rule: 'freestyle' });
  const state = rooms.joinRoom({ socketId: 'guest', nickname: '손님', code: 'ABC123' });
  assert.deepEqual(state.players, [
    { nickname: '방장', color: WHITE },
    { nickname: '손님', color: BLACK },
  ]);
  assert.equal(state.currentPlayer, BLACK);
});

test('rejects unknown and full rooms', () => {
  const rooms = manager();
  assert.throws(() => rooms.joinRoom({ socketId: 'x', nickname: '손님', code: 'NOPE00' }), /ROOM_NOT_FOUND/);
  rooms.createRoom({ socketId: 'host', nickname: '방장', rule: 'freestyle' });
  rooms.joinRoom({ socketId: 'guest', nickname: '손님', code: 'ABC123' });
  assert.throws(() => rooms.joinRoom({ socketId: 'third', nickname: '셋째', code: 'ABC123' }), /ROOM_FULL/);
});

test('enforces game start, turn, and empty intersections', () => {
  const rooms = manager();
  rooms.createRoom({ socketId: 'host', nickname: '방장', rule: 'freestyle' });
  assert.throws(() => rooms.placeStone({ socketId: 'host', row: 7, col: 7 }), /GAME_NOT_PLAYING/);
  rooms.joinRoom({ socketId: 'guest', nickname: '손님', code: 'ABC123' });
  assert.throws(() => rooms.placeStone({ socketId: 'guest', row: 7, col: 7 }), /NOT_YOUR_TURN/);
  rooms.placeStone({ socketId: 'host', row: 7, col: 7 });
  assert.throws(() => rooms.placeStone({ socketId: 'guest', row: 7, col: 7 }), /OCCUPIED/);
});

test('transitions to finished after a winning move', () => {
  const rooms = manager();
  rooms.createRoom({ socketId: 'host', nickname: '방장', rule: 'freestyle' });
  rooms.joinRoom({ socketId: 'guest', nickname: '손님', code: 'ABC123' });
  for (let col = 0; col < 4; col += 1) {
    rooms.placeStone({ socketId: 'host', row: 7, col });
    rooms.placeStone({ socketId: 'guest', row: 8, col });
  }
  const state = rooms.placeStone({ socketId: 'host', row: 7, col: 4 });
  assert.equal(state.status, 'finished');
  assert.equal(state.winner, BLACK);
});

test('deletes the room immediately when either player disconnects', () => {
  const rooms = manager();
  rooms.createRoom({ socketId: 'host', nickname: '방장', rule: 'freestyle' });
  rooms.joinRoom({ socketId: 'guest', nickname: '손님', code: 'ABC123' });
  const closed = rooms.disconnect('guest');
  assert.equal(closed.code, 'ABC123');
  assert.equal(closed.remainingSocketId, 'host');
  assert.equal(rooms.hasRoom('ABC123'), false);
});

test('starts and resets a 30 second turn deadline', () => {
  const now = { value: 1_000 };
  const rooms = timedManager(now);
  rooms.createRoom({ socketId: 'host', nickname: '방장', rule: 'freestyle' });
  let state = rooms.joinRoom({ socketId: 'guest', nickname: '손님', code: 'ABC123' });
  assert.equal(state.turnDeadline, 31_000);
  now.value = 8_000;
  state = rooms.placeStone({ socketId: 'host', row: 7, col: 7 });
  assert.equal(state.turnDeadline, 38_000);
});

test('ends the game with a loss when the current player uses 30 seconds', () => {
  const now = { value: 1_000 };
  const rooms = timedManager(now);
  rooms.createRoom({ socketId: 'host', nickname: '방장', rule: 'freestyle' });
  rooms.joinRoom({ socketId: 'guest', nickname: '손님', code: 'ABC123' });
  now.value = 31_000;
  const state = rooms.timeoutRoom('ABC123');
  assert.equal(state.status, 'finished');
  assert.equal(state.winner, WHITE);
  assert.equal(state.finishReason, 'timeout');
  assert.equal(state.turnDeadline, null);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { BLACK, WHITE, analyzeRenjuMove, createBoard } from '../server/game-rules.js';

function place(board, stones, player = BLACK) {
  for (const [row, col] of stones) board[row][col] = player;
}

test('rejects a black overline', () => {
  const board = createBoard();
  place(board, [[7, 3], [7, 4], [7, 5], [7, 6], [7, 8]]);
  assert.deepEqual(analyzeRenjuMove(board, 7, 7, BLACK), {
    legal: false, reason: 'overline', wins: false,
  });
});

test('accepts an exact black five as a win', () => {
  const board = createBoard();
  place(board, [[7, 3], [7, 4], [7, 5], [7, 6]]);
  assert.deepEqual(analyzeRenjuMove(board, 7, 7, BLACK), {
    legal: true, reason: null, wins: true,
  });
});

test('rejects a black double four', () => {
  const board = createBoard();
  place(board, [[7, 5], [7, 6], [7, 8], [5, 7], [6, 7], [8, 7]]);
  assert.equal(analyzeRenjuMove(board, 7, 7, BLACK).reason, 'double-four');
});

test('rejects a black double three', () => {
  const board = createBoard();
  place(board, [[7, 6], [7, 8], [6, 7], [8, 7]]);
  assert.equal(analyzeRenjuMove(board, 7, 7, BLACK).reason, 'double-three');
});

test('accepts a legal black single three', () => {
  const board = createBoard();
  place(board, [[7, 6], [7, 8]]);
  assert.deepEqual(analyzeRenjuMove(board, 7, 7, BLACK), {
    legal: true, reason: null, wins: false,
  });
});

test('white is not restricted by Renju forbidden moves', () => {
  const board = createBoard();
  place(board, [[7, 3], [7, 4], [7, 5], [7, 6], [7, 8]], WHITE);
  assert.deepEqual(analyzeRenjuMove(board, 7, 7, WHITE), {
    legal: true, reason: null, wins: true,
  });
});

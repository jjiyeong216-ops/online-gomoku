import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BLACK,
  BOARD_SIZE,
  EMPTY,
  WHITE,
  createBoard,
  getFreestyleWinner,
  isInside,
} from '../server/game-rules.js';

test('creates an empty 15 by 15 board', () => {
  const board = createBoard();
  assert.equal(board.length, BOARD_SIZE);
  assert.ok(board.every((row) => row.length === BOARD_SIZE));
  assert.ok(board.flat().every((cell) => cell === EMPTY));
});

test('recognizes board boundaries', () => {
  assert.equal(isInside(0, 0), true);
  assert.equal(isInside(14, 14), true);
  assert.equal(isInside(-1, 0), false);
  assert.equal(isInside(15, 0), false);
});

for (const [name, delta] of [
  ['horizontal', [0, 1]],
  ['vertical', [1, 0]],
  ['descending diagonal', [1, 1]],
  ['ascending diagonal', [1, -1]],
]) {
  test(`detects a ${name} freestyle win`, () => {
    const board = createBoard();
    for (let index = 0; index < 5; index += 1) {
      board[7 + delta[0] * index][7 + delta[1] * index] = BLACK;
    }
    assert.equal(getFreestyleWinner(board, 7, 7), BLACK);
  });
}

test('six stones are a freestyle win', () => {
  const board = createBoard();
  for (let col = 2; col < 8; col += 1) board[4][col] = WHITE;
  assert.equal(getFreestyleWinner(board, 4, 5), WHITE);
});

test('four stones are not a win', () => {
  const board = createBoard();
  for (let col = 2; col < 6; col += 1) board[4][col] = BLACK;
  assert.equal(getFreestyleWinner(board, 4, 4), null);
});

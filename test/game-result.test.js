import assert from 'node:assert/strict';
import test from 'node:test';

import { getGameResult } from '../game-result.js';

test('describes a normal victory from the local player perspective', () => {
  assert.deepEqual(getGameResult({ winner: 1, finishReason: 'five' }, 1), {
    title: '승리했습니다!',
    description: '오목을 완성했습니다.',
    tone: 'win',
    symbol: '○',
  });
});

test('describes a normal defeat from the local player perspective', () => {
  assert.deepEqual(getGameResult({ winner: 1, finishReason: 'five' }, 2), {
    title: '패배했습니다',
    description: '상대방이 오목을 완성했습니다.',
    tone: 'loss',
    symbol: '×',
  });
});

test('describes victory caused by the opponent timeout', () => {
  assert.equal(getGameResult({ winner: 2, finishReason: 'timeout' }, 2).description, '상대방의 시간이 초과되었습니다.');
});

test('describes defeat caused by the local player timeout', () => {
  assert.equal(getGameResult({ winner: 2, finishReason: 'timeout' }, 1).description, '제한 시간 30초가 초과되었습니다.');
});

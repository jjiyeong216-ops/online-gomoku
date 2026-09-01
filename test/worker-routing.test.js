import assert from 'node:assert/strict';
import test from 'node:test';

import { generateRoomCode, parseRoomRequest } from '../worker/room-code.js';

test('generates an unambiguous six-character room code', () => {
  let index = 0;
  const code = generateRoomCode(() => index++);
  assert.match(code, /^[A-HJ-NP-Z2-9]{6}$/);
  assert.equal(code.length, 6);
});

test('parses a room creation WebSocket request', () => {
  assert.deepEqual(parseRoomRequest('https://example.com/ws?mode=create&nickname=%EB%B0%A9%EC%9E%A5&rule=renju'), {
    mode: 'create', nickname: '방장', rule: 'renju', code: null,
  });
});

test('normalizes a room join WebSocket request', () => {
  assert.deepEqual(parseRoomRequest('https://example.com/ws?mode=join&nickname=%EC%86%90%EB%8B%98&code=ab23cd'), {
    mode: 'join', nickname: '손님', rule: null, code: 'AB23CD',
  });
});

test('rejects invalid modes, nicknames, rules, and codes', () => {
  assert.throws(() => parseRoomRequest('https://example.com/ws?mode=nope&nickname=a'), /INVALID_MODE/);
  assert.throws(() => parseRoomRequest('https://example.com/ws?mode=create&nickname=&rule=renju'), /INVALID_NICKNAME/);
  assert.throws(() => parseRoomRequest('https://example.com/ws?mode=create&nickname=a&rule=nope'), /INVALID_RULE/);
  assert.throws(() => parseRoomRequest('https://example.com/ws?mode=join&nickname=a&code=123'), /INVALID_CODE/);
});

const CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomIndex() {
  const value = new Uint32Array(1);
  crypto.getRandomValues(value);
  return value[0];
}

function fail(code) {
  throw new Error(code);
}

export function generateRoomCode(nextIndex = randomIndex) {
  return Array.from({ length: 6 }, () => CODE_CHARACTERS[nextIndex() % CODE_CHARACTERS.length]).join('');
}

export function parseRoomRequest(requestUrl) {
  const url = new URL(requestUrl);
  const mode = url.searchParams.get('mode');
  const nickname = (url.searchParams.get('nickname') ?? '').trim().slice(0, 12);
  if (!['create', 'join'].includes(mode)) fail('INVALID_MODE');
  if (!nickname) fail('INVALID_NICKNAME');

  if (mode === 'create') {
    const rule = url.searchParams.get('rule');
    if (!['freestyle', 'renju'].includes(rule)) fail('INVALID_RULE');
    return { mode, nickname, rule, code: null };
  }

  const code = (url.searchParams.get('code') ?? '').trim().toUpperCase();
  if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) fail('INVALID_CODE');
  return { mode, nickname, rule: null, code };
}

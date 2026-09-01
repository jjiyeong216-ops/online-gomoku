import {
  BLACK,
  EMPTY,
  WHITE,
  analyzeRenjuMove,
  createBoard,
  getFreestyleWinner,
  isInside,
} from '../server/game-rules.js';

function fail(code) { throw new Error(code); }

export class GameRoomState {
  constructor({ code, savedState = null, now = Date.now, random = Math.random, turnDurationMs = 30_000 } = {}) {
    this.code = code ?? savedState?.code;
    this.state = savedState;
    this.now = now;
    this.random = random;
    this.turnDurationMs = turnDurationMs;
  }

  addPlayer({ id, nickname, mode, rule }) {
    const cleanNickname = String(nickname ?? '').trim().slice(0, 12);
    if (!cleanNickname) fail('INVALID_NICKNAME');
    if (mode === 'create') {
      if (this.state) fail('ROOM_EXISTS');
      if (!['freestyle', 'renju'].includes(rule)) fail('INVALID_RULE');
      this.state = {
        code: this.code, rule, status: 'waiting', board: createBoard(), currentPlayer: BLACK,
        winner: null, finishReason: null, turnDeadline: null, lastMove: null,
        players: [{ id, nickname: cleanNickname, color: null }],
      };
      return this.snapshotFor(id);
    }
    if (!this.state) fail('ROOM_NOT_FOUND');
    if (this.state.players.length >= 2) fail('ROOM_FULL');
    this.state.players.push({ id, nickname: cleanNickname, color: null });
    const hostIsBlack = this.random() < 0.5;
    this.state.players[0].color = hostIsBlack ? BLACK : WHITE;
    this.state.players[1].color = hostIsBlack ? WHITE : BLACK;
    this.state.status = 'playing';
    this.state.turnDeadline = this.now() + this.turnDurationMs;
    return this.snapshotFor(id);
  }

  placeStone({ id, row, col }) {
    if (this.state?.status !== 'playing') fail('GAME_NOT_PLAYING');
    if (this.now() >= this.state.turnDeadline) { this.timeout(); fail('TIME_EXPIRED'); }
    const player = this.state.players.find((item) => item.id === id);
    if (!player) fail('ROOM_NOT_FOUND');
    if (player.color !== this.state.currentPlayer) fail('NOT_YOUR_TURN');
    if (!Number.isInteger(row) || !Number.isInteger(col) || !isInside(row, col)) fail('INVALID_POSITION');
    if (this.state.board[row][col] !== EMPTY) fail('OCCUPIED');

    let wins = false;
    if (this.state.rule === 'renju') {
      const analysis = analyzeRenjuMove(this.state.board, row, col, player.color);
      if (!analysis.legal) fail(`FORBIDDEN_${analysis.reason.toUpperCase()}`);
      wins = analysis.wins;
    }
    this.state.board[row][col] = player.color;
    if (this.state.rule === 'freestyle') wins = getFreestyleWinner(this.state.board, row, col) === player.color;
    this.state.lastMove = { row, col, color: player.color };
    if (wins) this.finish(player.color, 'five');
    else if (this.state.board.flat().every((cell) => cell !== EMPTY)) this.finish(0, 'draw');
    else {
      this.state.currentPlayer = player.color === BLACK ? WHITE : BLACK;
      this.state.turnDeadline = this.now() + this.turnDurationMs;
    }
    return this.snapshotFor(id);
  }

  timeout() {
    if (this.state?.status !== 'playing' || this.now() < this.state.turnDeadline) return this.publicState();
    this.finish(this.state.currentPlayer === BLACK ? WHITE : BLACK, 'timeout');
    return this.publicState();
  }

  finish(winner, reason) {
    this.state.status = 'finished';
    this.state.winner = winner;
    this.state.finishReason = reason;
    this.state.turnDeadline = null;
  }

  removePlayer(id) {
    if (!this.state?.players.some((player) => player.id === id)) return { remainingPlayerId: null, closed: false };
    const remainingPlayerId = this.state.players.find((player) => player.id !== id)?.id ?? null;
    this.state = null;
    return { remainingPlayerId, closed: true };
  }

  snapshotFor(id) {
    const player = this.state?.players.find((item) => item.id === id);
    if (!player) fail('ROOM_NOT_FOUND');
    return { state: this.publicState(), you: { nickname: player.nickname, color: player.color } };
  }

  publicState() {
    if (!this.state) return null;
    return {
      ...this.state,
      board: this.state.board.map((row) => [...row]),
      players: this.state.players.map(({ nickname, color }) => ({ nickname, color })),
    };
  }

  exportState() {
    return this.state ? structuredClone(this.state) : null;
  }
}

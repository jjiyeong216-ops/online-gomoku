import {
  BLACK,
  BOARD_SIZE,
  EMPTY,
  WHITE,
  analyzeRenjuMove,
  createBoard,
  getFreestyleWinner,
  isInside,
} from './game-rules.js';

const CODE_CHARACTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode() {
  return Array.from({ length: 6 }, () => CODE_CHARACTERS[Math.floor(Math.random() * CODE_CHARACTERS.length)]).join('');
}

function fail(code) {
  throw new Error(code);
}

function cleanNickname(nickname) {
  const value = String(nickname ?? '').trim().slice(0, 12);
  if (!value) fail('INVALID_NICKNAME');
  return value;
}

export class RoomManager {
  constructor({ codeGenerator = randomCode } = {}) {
    this.rooms = new Map();
    this.socketRooms = new Map();
    this.codeGenerator = codeGenerator;
  }

  hasRoom(code) {
    return this.rooms.has(String(code).toUpperCase());
  }

  createRoom({ socketId, nickname, rule }) {
    if (this.socketRooms.has(socketId)) fail('ALREADY_IN_ROOM');
    if (!['freestyle', 'renju'].includes(rule)) fail('INVALID_RULE');
    let code;
    do code = this.codeGenerator(); while (this.rooms.has(code));
    const room = {
      code,
      rule,
      status: 'waiting',
      board: createBoard(),
      currentPlayer: BLACK,
      winner: null,
      lastMove: null,
      players: [{ socketId, nickname: cleanNickname(nickname), color: BLACK }],
    };
    this.rooms.set(code, room);
    this.socketRooms.set(socketId, code);
    return this.snapshot(room);
  }

  joinRoom({ socketId, nickname, code }) {
    if (this.socketRooms.has(socketId)) fail('ALREADY_IN_ROOM');
    const normalizedCode = String(code ?? '').trim().toUpperCase();
    const room = this.rooms.get(normalizedCode);
    if (!room) fail('ROOM_NOT_FOUND');
    if (room.players.length >= 2) fail('ROOM_FULL');
    room.players.push({ socketId, nickname: cleanNickname(nickname), color: WHITE });
    room.status = 'playing';
    this.socketRooms.set(socketId, normalizedCode);
    return this.snapshot(room);
  }

  placeStone({ socketId, row, col }) {
    const room = this.roomForSocket(socketId);
    if (room.status !== 'playing') fail('GAME_NOT_PLAYING');
    const player = room.players.find((item) => item.socketId === socketId);
    if (player.color !== room.currentPlayer) fail('NOT_YOUR_TURN');
    if (!Number.isInteger(row) || !Number.isInteger(col) || !isInside(row, col)) fail('INVALID_POSITION');
    if (room.board[row][col] !== EMPTY) fail('OCCUPIED');

    let wins = false;
    if (room.rule === 'renju') {
      const analysis = analyzeRenjuMove(room.board, row, col, player.color);
      if (!analysis.legal) fail(`FORBIDDEN_${analysis.reason.toUpperCase()}`);
      wins = analysis.wins;
    }

    room.board[row][col] = player.color;
    if (room.rule === 'freestyle') wins = getFreestyleWinner(room.board, row, col) === player.color;
    room.lastMove = { row, col, color: player.color };

    if (wins) {
      room.status = 'finished';
      room.winner = player.color;
    } else if (room.board.flat().every((cell) => cell !== EMPTY)) {
      room.status = 'finished';
      room.winner = 0;
    } else {
      room.currentPlayer = player.color === BLACK ? WHITE : BLACK;
    }
    return this.snapshot(room);
  }

  disconnect(socketId) {
    const code = this.socketRooms.get(socketId);
    if (!code) return null;
    const room = this.rooms.get(code);
    const remainingPlayer = room?.players.find((player) => player.socketId !== socketId);
    for (const player of room?.players ?? []) this.socketRooms.delete(player.socketId);
    this.rooms.delete(code);
    return { code, remainingSocketId: remainingPlayer?.socketId ?? null };
  }

  roomForSocket(socketId) {
    const code = this.socketRooms.get(socketId);
    const room = code && this.rooms.get(code);
    if (!room) fail('ROOM_NOT_FOUND');
    return room;
  }

  snapshot(room) {
    return {
      code: room.code,
      rule: room.rule,
      status: room.status,
      board: room.board.map((row) => [...row]),
      currentPlayer: room.currentPlayer,
      winner: room.winner,
      lastMove: room.lastMove,
      players: room.players.map(({ nickname, color }) => ({ nickname, color })),
    };
  }
}

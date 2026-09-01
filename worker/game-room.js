import { GameRoomState } from './game-room-state.js';
import { parseRoomRequest } from './room-code.js';

const ERROR_MESSAGES = {
  ROOM_NOT_FOUND: '방을 찾을 수 없습니다.', ROOM_FULL: '참여 인원이 가득 찼습니다.',
  INVALID_NICKNAME: '닉네임을 입력해주세요.', INVALID_RULE: '올바른 룰을 선택해주세요.',
  GAME_NOT_PLAYING: '아직 대국을 시작할 수 없습니다.', NOT_YOUR_TURN: '내 차례가 아닙니다.',
  INVALID_POSITION: '놓을 수 없는 위치입니다.', OCCUPIED: '이미 돌이 놓인 자리입니다.',
  FORBIDDEN_OVERLINE: '장목 금수입니다.', 'FORBIDDEN_DOUBLE-FOUR': '사사 금수입니다.',
  'FORBIDDEN_DOUBLE-THREE': '삼삼 금수입니다.', TIME_EXPIRED: '착수 시간이 끝났습니다.',
};

export class GameRoom {
  constructor(ctx) {
    this.ctx = ctx;
    this.ready = ctx.blockConcurrencyWhile(async () => {
      const savedState = await ctx.storage.get('room');
      this.room = new GameRoomState({ savedState });
    });
  }

  async fetch(request) {
    await this.ready;
    let roomRequest;
    try {
      roomRequest = parseRoomRequest(request.url);
      const code = new URL(request.url).searchParams.get('code');
      if (!this.room.code) this.room.code = code;
      const playerId = crypto.randomUUID();
      this.room.addPlayer({ id: playerId, ...roomRequest });
      const [client, server] = Object.values(new WebSocketPair());
      server.serializeAttachment({ playerId });
      this.ctx.acceptWebSocket(server, [playerId]);
      await this.persistAndSchedule();
      this.broadcastState();
      return new Response(null, { status: 101, webSocket: client });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
  }

  async webSocketMessage(socket, rawMessage) {
    await this.ready;
    try {
      if (typeof rawMessage !== 'string' || rawMessage.length > 4096) throw new Error('INVALID_MESSAGE');
      const message = JSON.parse(rawMessage);
      if (message.type !== 'place_stone') throw new Error('UNKNOWN_MESSAGE');
      const { playerId } = socket.deserializeAttachment();
      this.room.placeStone({ id: playerId, row: message.row, col: message.col });
      await this.persistAndSchedule();
      this.broadcastState();
    } catch (error) {
      if (error.message === 'TIME_EXPIRED') {
        await this.persistAndSchedule();
        this.broadcastState();
      }
      this.send(socket, {
        type: 'request_rejected', code: error.message,
        message: ERROR_MESSAGES[error.message] ?? '요청을 처리할 수 없습니다.',
      });
    }
  }

  async alarm() {
    await this.ready;
    this.room.timeout();
    await this.persistAndSchedule();
    this.broadcastState();
  }

  async webSocketClose(socket) {
    await this.ready;
    const { playerId } = socket.deserializeAttachment() ?? {};
    const closed = this.room.removePlayer(playerId);
    if (!closed.closed) return;
    await this.ctx.storage.deleteAll();
    await this.ctx.storage.deleteAlarm();
    for (const peer of this.ctx.getWebSockets()) {
      if (peer === socket) continue;
      this.send(peer, { type: 'room_closed', message: '상대방의 연결이 끊겨 대국이 종료되었습니다.' });
      peer.close(1000, 'Room closed');
    }
  }

  async webSocketError(socket) {
    await this.webSocketClose(socket);
  }

  async persistAndSchedule() {
    const state = this.room.exportState();
    if (!state) return;
    await this.ctx.storage.put('room', state);
    if (state.status === 'playing' && state.turnDeadline) await this.ctx.storage.setAlarm(state.turnDeadline);
    else await this.ctx.storage.deleteAlarm();
  }

  broadcastState() {
    for (const socket of this.ctx.getWebSockets()) {
      const { playerId } = socket.deserializeAttachment() ?? {};
      try { this.send(socket, { type: 'state_changed', ...this.room.snapshotFor(playerId) }); } catch { /* stale socket */ }
    }
  }

  send(socket, message) {
    if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  }
}

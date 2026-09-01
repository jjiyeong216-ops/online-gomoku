import { randomUUID } from 'node:crypto';
import { WebSocketServer } from 'ws';

import { RoomManager } from './room-manager.js';

const ERROR_MESSAGES = {
  ROOM_NOT_FOUND: '방을 찾을 수 없습니다.',
  ROOM_FULL: '참여 인원이 가득 찼습니다.',
  INVALID_NICKNAME: '닉네임을 입력해주세요.',
  INVALID_RULE: '올바른 룰을 선택해주세요.',
  ALREADY_IN_ROOM: '이미 다른 방에 참여 중입니다.',
  GAME_NOT_PLAYING: '아직 대국을 시작할 수 없습니다.',
  NOT_YOUR_TURN: '내 차례가 아닙니다.',
  INVALID_POSITION: '놓을 수 없는 위치입니다.',
  OCCUPIED: '이미 돌이 놓인 자리입니다.',
  FORBIDDEN_OVERLINE: '장목 금수입니다.',
  'FORBIDDEN_DOUBLE-FOUR': '사사 금수입니다.',
  'FORBIDDEN_DOUBLE-THREE': '삼삼 금수입니다.',
  TIME_EXPIRED: '착수 시간이 끝났습니다.',
};

export function attachSocketServer(server, { roomManager = new RoomManager() } = {}) {
  const webSocketServer = new WebSocketServer({ server });
  const sockets = new Map();
  const roomTimers = new Map();

  function send(socket, message) {
    if (socket?.readyState === socket.OPEN) socket.send(JSON.stringify(message));
  }

  function broadcastState(socketId) {
    const { state } = roomManager.stateForSocket(socketId);
    for (const participantId of roomManager.socketIdsForSocket(socketId)) {
      send(sockets.get(participantId), {
        type: 'state_changed',
        ...roomManager.stateForSocket(participantId),
      });
    }
    clearTimeout(roomTimers.get(state.code));
    roomTimers.delete(state.code);
    if (state.status === 'playing' && state.turnDeadline) {
      const timer = setTimeout(() => {
        if (!roomManager.hasRoom(state.code)) return;
        roomManager.timeoutRoom(state.code);
        const participantId = roomManager.socketIdsForCode(state.code)[0];
        if (participantId) broadcastState(participantId);
      }, Math.max(0, state.turnDeadline - Date.now()));
      timer.unref();
      roomTimers.set(state.code, timer);
    }
  }

  webSocketServer.on('connection', (socket, request) => {
    const socketId = randomUUID();
    sockets.set(socketId, socket);

    const connectionUrl = new URL(request.url, 'http://localhost');
    const mode = connectionUrl.searchParams.get('mode');
    if (mode === 'create' || mode === 'join') {
      setTimeout(() => {
        try {
          if (mode === 'create') {
            roomManager.createRoom({
              socketId,
              nickname: connectionUrl.searchParams.get('nickname'),
              rule: connectionUrl.searchParams.get('rule'),
            });
          } else {
            roomManager.joinRoom({
              socketId,
              nickname: connectionUrl.searchParams.get('nickname'),
              code: connectionUrl.searchParams.get('code'),
            });
          }
          broadcastState(socketId);
        } catch (error) {
          send(socket, {
            type: 'request_rejected',
            code: error.message,
            message: ERROR_MESSAGES[error.message] ?? '요청을 처리할 수 없습니다.',
          });
        }
      }, 0);
    }

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());
        if (message.type === 'create_room') {
          roomManager.createRoom({ socketId, nickname: message.nickname, rule: message.rule });
          broadcastState(socketId);
        } else if (message.type === 'join_room') {
          roomManager.joinRoom({ socketId, nickname: message.nickname, code: message.code });
          broadcastState(socketId);
        } else if (message.type === 'place_stone') {
          roomManager.placeStone({ socketId, row: message.row, col: message.col });
          broadcastState(socketId);
        } else {
          throw new Error('UNKNOWN_MESSAGE');
        }
      } catch (error) {
        const code = error instanceof SyntaxError ? 'INVALID_MESSAGE' : error.message;
        send(socket, {
          type: 'request_rejected',
          code,
          message: ERROR_MESSAGES[code] ?? '요청을 처리할 수 없습니다.',
        });
      }
    });

    socket.on('close', () => {
      sockets.delete(socketId);
      const closed = roomManager.disconnect(socketId);
      if (closed) {
        clearTimeout(roomTimers.get(closed.code));
        roomTimers.delete(closed.code);
      }
      if (closed?.remainingSocketId) {
        send(sockets.get(closed.remainingSocketId), {
          type: 'room_closed',
          message: '상대방의 연결이 끊겨 대국이 종료되었습니다.',
        });
      }
    });
  });

  return webSocketServer;
}

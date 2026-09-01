import { generateRoomCode, parseRoomRequest } from './room-code.js';
export { GameRoom } from './game-room.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== '/ws') return env.ASSETS.fetch(request);
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 });
    }

    try {
      const roomRequest = parseRoomRequest(url);
      const code = roomRequest.code ?? generateRoomCode();
      url.searchParams.set('code', code);
      return env.GAME_ROOM.getByName(code).fetch(new Request(url, request));
    } catch (error) {
      return Response.json({ error: error.message }, { status: 400 });
    }
  },
};

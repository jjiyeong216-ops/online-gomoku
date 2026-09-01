const BOARD_SIZE = 15;
const BLACK = 1;
const WHITE = 2;
const byId = (id) => document.getElementById(id);
const elements = {
  lobbyView: byId('lobbyView'), gameView: byId('gameView'), nickname: byId('nicknameInput'),
  rule: byId('ruleSelect'), codeInput: byId('roomCodeInput'), create: byId('createRoomButton'),
  join: byId('joinRoomButton'), lobbyMessage: byId('lobbyMessage'), gameMessage: byId('gameMessage'),
  connection: byId('connectionDisplay'), codeDisplay: byId('roomCodeDisplay'), copy: byId('copyCodeButton'),
  leave: byId('leaveButton'), ruleDisplay: byId('ruleDisplay'), turn: byId('turnDisplay'),
  blackPlayer: byId('blackPlayer'), whitePlayer: byId('whitePlayer'), board: byId('board'),
  timer: byId('timerDisplay'),
};
let socket;
let gameState = null;
let me = null;

function createBoard() {
  const fragment = document.createDocumentFragment();
  for (let row = 0; row < BOARD_SIZE; row += 1) for (let col = 0; col < BOARD_SIZE; col += 1) {
    const cell = document.createElement('button');
    cell.type = 'button'; cell.className = 'cell'; cell.dataset.row = row; cell.dataset.col = col;
    cell.setAttribute('aria-label', `${row + 1}행 ${col + 1}열`);
    cell.addEventListener('click', () => placeStone(row, col));
    fragment.appendChild(cell);
  }
  elements.board.appendChild(fragment);
}

function connect() {
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}`);
  socket.addEventListener('open', () => {
    elements.connection.textContent = '서버 연결됨'; elements.connection.classList.add('connected'); setLobbyEnabled(true);
  });
  socket.addEventListener('message', ({ data }) => handleMessage(JSON.parse(data)));
  socket.addEventListener('close', () => {
    elements.connection.textContent = '서버 연결 끊김'; elements.connection.classList.remove('connected'); setLobbyEnabled(false);
    if (gameState) showGameMessage('서버 연결이 끊겨 대국이 종료되었습니다.');
  });
}

function send(message) {
  if (socket?.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  else showLobbyMessage('서버에 연결되지 않았습니다.');
}

function getNickname() {
  const value = elements.nickname.value.trim();
  if (value) return value;
  showLobbyMessage('닉네임을 입력해주세요.'); elements.nickname.focus(); return null;
}

function handleMessage(message) {
  if (message.type === 'state_changed') {
    gameState = message.state; me = message.you;
    elements.lobbyView.hidden = true; elements.gameView.hidden = false; renderGame();
  } else if (message.type === 'request_rejected') {
    if (gameState) showGameMessage(message.message); else showLobbyMessage(message.message);
  } else if (message.type === 'room_closed') {
    gameState = null; showGameMessage(message.message);
    elements.board.querySelectorAll('.cell').forEach((cell) => { cell.disabled = true; });
  }
}

function renderGame() {
  elements.codeDisplay.textContent = gameState.code;
  elements.ruleDisplay.textContent = gameState.rule === 'renju' ? '렌주룰' : '자유룰';
  const black = gameState.players.find((player) => player.color === BLACK);
  const white = gameState.players.find((player) => player.color === WHITE);
  elements.blackPlayer.lastElementChild.textContent = `흑 · ${black?.nickname ?? '배정 대기'}`;
  elements.whitePlayer.lastElementChild.textContent = `백 · ${white?.nickname ?? '배정 대기'}`;
  if (gameState.status === 'waiting') elements.turn.textContent = '코드를 공유하고 상대방을 기다려주세요';
  else if (gameState.status === 'finished') {
    const winner = gameState.players.find((player) => player.color === gameState.winner);
    elements.turn.textContent = winner
      ? `${winner.nickname} ${gameState.finishReason === 'timeout' ? '시간승' : '승리'}!`
      : '무승부';
  } else {
    const current = gameState.players.find((player) => player.color === gameState.currentPlayer);
    elements.turn.textContent = gameState.currentPlayer === me.color ? `내 차례 (${me.color === BLACK ? '흑' : '백'})` : `${current?.nickname} 차례`;
  }
  renderTimer();
  elements.board.querySelectorAll('.cell').forEach((cell) => {
    const row = Number(cell.dataset.row); const col = Number(cell.dataset.col); const value = gameState.board[row][col];
    cell.classList.toggle('black', value === BLACK); cell.classList.toggle('white', value === WHITE);
    cell.classList.toggle('last-move', gameState.lastMove?.row === row && gameState.lastMove?.col === col);
    cell.disabled = gameState.status !== 'playing' || gameState.currentPlayer !== me.color || value !== 0;
  });
}

function placeStone(row, col) {
  if (gameState?.status === 'playing' && gameState.currentPlayer === me?.color) send({ type: 'place_stone', row, col });
}
function setLobbyEnabled(enabled) { elements.create.disabled = !enabled; elements.join.disabled = !enabled; }
function showLobbyMessage(message) { elements.lobbyMessage.textContent = message; }
function showGameMessage(message) { elements.gameMessage.textContent = message; }

function renderTimer() {
  if (gameState?.status !== 'playing' || !gameState.turnDeadline) {
    elements.timer.textContent = '--';
    elements.timer.classList.remove('urgent');
    return;
  }
  const seconds = Math.max(0, Math.ceil((gameState.turnDeadline - Date.now()) / 1000));
  elements.timer.textContent = `${seconds}초`;
  elements.timer.classList.toggle('urgent', seconds <= 5);
}

elements.create.addEventListener('click', () => {
  const nickname = getNickname(); if (nickname) send({ type: 'create_room', nickname, rule: elements.rule.value });
});
elements.join.addEventListener('click', () => {
  const nickname = getNickname(); const code = elements.codeInput.value.trim().toUpperCase();
  if (!nickname) return;
  if (!/^[A-Z0-9]{6}$/.test(code)) { showLobbyMessage('6자리 참여 코드를 입력해주세요.'); return; }
  send({ type: 'join_room', nickname, code });
});
elements.codeInput.addEventListener('input', () => { elements.codeInput.value = elements.codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6); });
elements.copy.addEventListener('click', async () => { await navigator.clipboard.writeText(gameState.code); showGameMessage('참여 코드를 복사했습니다.'); });
elements.leave.addEventListener('click', () => location.reload());

setInterval(renderTimer, 250);
setLobbyEnabled(false); createBoard(); connect();

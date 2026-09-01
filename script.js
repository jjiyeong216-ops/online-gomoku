const BOARD_SIZE = 15;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;

const boardElement = document.getElementById('board');
const turnDisplay = document.getElementById('turnDisplay');
const recordDisplay = document.getElementById('recordDisplay');
const resetButton = document.getElementById('resetButton');

const board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
let currentPlayer = BLACK;
let gameOver = false;
let blackWins = 0;
let whiteWins = 0;

function createBoard() {
  boardElement.innerHTML = '';

  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'cell';
      cell.setAttribute('aria-label', `${row + 1}행 ${col + 1}열`);
      cell.dataset.row = String(row);
      cell.dataset.col = String(col);
      cell.addEventListener('click', () => handleCellClick(row, col));
      boardElement.appendChild(cell);
    }
  }
}

function updateTurnDisplay() {
  turnDisplay.textContent = currentPlayer === BLACK ? '검은색' : '흰색';
  turnDisplay.classList.toggle('black', currentPlayer === BLACK);
  turnDisplay.classList.toggle('white', currentPlayer === WHITE);
}

function updateRecordDisplay() {
  recordDisplay.textContent = `검은색 ${blackWins} - ${whiteWins} 흰색`;
}

function resetBoard() {
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      board[row][col] = EMPTY;
    }
  }

  gameOver = false;
  currentPlayer = BLACK;
  updateTurnDisplay();
  renderBoard();
}

function renderBoard() {
  const cells = boardElement.querySelectorAll('.cell');
  cells.forEach((cell) => {
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    const value = board[row][col];
    cell.classList.remove('black', 'white');

    if (value === BLACK) {
      cell.classList.add('black');
    } else if (value === WHITE) {
      cell.classList.add('white');
    }

    cell.disabled = gameOver || value !== EMPTY;
  });
}

function checkWinner(row, col) {
  const target = board[row][col];
  const directions = [
    [1, 0],
    [0, 1],
    [1, 1],
    [1, -1],
  ];

  for (const [dx, dy] of directions) {
    let count = 1;

    for (const direction of [-1, 1]) {
      let nextRow = row + dx * direction;
      let nextCol = col + dy * direction;

      while (
        nextRow >= 0 &&
        nextRow < BOARD_SIZE &&
        nextCol >= 0 &&
        nextCol < BOARD_SIZE &&
        board[nextRow][nextCol] === target
      ) {
        count += 1;
        nextRow += dx * direction;
        nextCol += dy * direction;
      }
    }

    if (count >= 5) {
      return target;
    }
  }

  return null;
}

function handleCellClick(row, col) {
  if (gameOver || board[row][col] !== EMPTY) {
    return;
  }

  board[row][col] = currentPlayer;
  renderBoard();

  const winner = checkWinner(row, col);
  if (winner === BLACK) {
    blackWins += 1;
    updateRecordDisplay();
    turnDisplay.textContent = '검은색 승리!';
    turnDisplay.classList.remove('white');
    turnDisplay.classList.add('black');
    gameOver = true;
    renderBoard();
    return;
  }

  if (winner === WHITE) {
    whiteWins += 1;
    updateRecordDisplay();
    turnDisplay.textContent = '흰색 승리!';
    turnDisplay.classList.remove('black');
    turnDisplay.classList.add('white');
    gameOver = true;
    renderBoard();
    return;
  }

  currentPlayer = currentPlayer === BLACK ? WHITE : BLACK;
  updateTurnDisplay();
}

createBoard();
updateTurnDisplay();
updateRecordDisplay();
resetButton.addEventListener('click', resetBoard);
resetBoard();

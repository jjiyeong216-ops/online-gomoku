export const BOARD_SIZE = 15;
export const EMPTY = 0;
export const BLACK = 1;
export const WHITE = 2;

const DIRECTIONS = [[1, 0], [0, 1], [1, 1], [1, -1]];

export function createBoard() {
  return Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(EMPTY));
}

export function isInside(row, col) {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function countLine(board, row, col, rowDelta, colDelta) {
  const target = board[row][col];
  if (target === EMPTY) return 0;
  let count = 1;

  for (const direction of [-1, 1]) {
    let nextRow = row + rowDelta * direction;
    let nextCol = col + colDelta * direction;
    while (isInside(nextRow, nextCol) && board[nextRow][nextCol] === target) {
      count += 1;
      nextRow += rowDelta * direction;
      nextCol += colDelta * direction;
    }
  }
  return count;
}

export function getFreestyleWinner(board, row, col) {
  const target = board[row][col];
  if (target === EMPTY) return null;
  return DIRECTIONS.some(([dr, dc]) => countLine(board, row, col, dr, dc) >= 5)
    ? target
    : null;
}

function lineEnds(board, row, col, rowDelta, colDelta) {
  const target = board[row][col];
  let startRow = row;
  let startCol = col;
  let endRow = row;
  let endCol = col;

  while (isInside(startRow - rowDelta, startCol - colDelta)
    && board[startRow - rowDelta][startCol - colDelta] === target) {
    startRow -= rowDelta;
    startCol -= colDelta;
  }
  while (isInside(endRow + rowDelta, endCol + colDelta)
    && board[endRow + rowDelta][endCol + colDelta] === target) {
    endRow += rowDelta;
    endCol += colDelta;
  }
  return {
    before: [startRow - rowDelta, startCol - colDelta],
    after: [endRow + rowDelta, endCol + colDelta],
  };
}

function hasFourOnAxis(board, row, col, rowDelta, colDelta) {
  for (let offset = -4; offset <= 4; offset += 1) {
    const testRow = row + rowDelta * offset;
    const testCol = col + colDelta * offset;
    if (!isInside(testRow, testCol) || board[testRow][testCol] !== EMPTY) continue;
    board[testRow][testCol] = BLACK;
    const makesFive = countLine(board, row, col, rowDelta, colDelta) === 5;
    board[testRow][testCol] = EMPTY;
    if (makesFive) return true;
  }
  return false;
}

function hasOpenThreeOnAxis(board, row, col, rowDelta, colDelta) {
  for (let offset = -3; offset <= 3; offset += 1) {
    const testRow = row + rowDelta * offset;
    const testCol = col + colDelta * offset;
    if (!isInside(testRow, testCol) || board[testRow][testCol] !== EMPTY) continue;
    board[testRow][testCol] = BLACK;
    const length = countLine(board, row, col, rowDelta, colDelta);
    const ends = lineEnds(board, row, col, rowDelta, colDelta);
    const openBefore = isInside(...ends.before) && board[ends.before[0]][ends.before[1]] === EMPTY;
    const openAfter = isInside(...ends.after) && board[ends.after[0]][ends.after[1]] === EMPTY;
    board[testRow][testCol] = EMPTY;
    if (length === 4 && openBefore && openAfter) return true;
  }
  return false;
}

export function analyzeRenjuMove(board, row, col, player) {
  if (!isInside(row, col) || board[row][col] !== EMPTY) {
    return { legal: false, reason: 'invalid', wins: false };
  }

  board[row][col] = player;
  const lengths = DIRECTIONS.map(([dr, dc]) => countLine(board, row, col, dr, dc));

  if (player === WHITE) {
    board[row][col] = EMPTY;
    return { legal: true, reason: null, wins: lengths.some((length) => length >= 5) };
  }

  if (lengths.some((length) => length >= 6)) {
    board[row][col] = EMPTY;
    return { legal: false, reason: 'overline', wins: false };
  }
  if (lengths.some((length) => length === 5)) {
    board[row][col] = EMPTY;
    return { legal: true, reason: null, wins: true };
  }

  const fourCount = DIRECTIONS.filter(([dr, dc]) => hasFourOnAxis(board, row, col, dr, dc)).length;
  if (fourCount >= 2) {
    board[row][col] = EMPTY;
    return { legal: false, reason: 'double-four', wins: false };
  }

  const threeCount = DIRECTIONS.filter(([dr, dc]) => hasOpenThreeOnAxis(board, row, col, dr, dc)).length;
  board[row][col] = EMPTY;
  if (threeCount >= 2) return { legal: false, reason: 'double-three', wins: false };
  return { legal: true, reason: null, wins: false };
}

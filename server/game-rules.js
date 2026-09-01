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

export function getGameResult(state, myColor) {
  const won = state.winner === myColor;
  const timedOut = state.finishReason === 'timeout';

  return {
    title: won ? '승리했습니다!' : '패배했습니다',
    description: timedOut
      ? (won ? '상대방의 시간이 초과되었습니다.' : '제한 시간 30초가 초과되었습니다.')
      : (won ? '오목을 완성했습니다.' : '상대방이 오목을 완성했습니다.'),
    tone: won ? 'win' : 'loss',
    symbol: won ? '○' : '×',
  };
}

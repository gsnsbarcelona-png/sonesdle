import { WinConditionStrategy } from '../abstracts.js';

export class ThreeInRowStrategy extends WinConditionStrategy {
  check(board) {
    const lines = [
      [[0,0],[0,1],[0,2]], [[1,0],[1,1],[1,2]], [[2,0],[2,1],[2,2]],
      [[0,0],[1,0],[2,0]], [[0,1],[1,1],[2,1]], [[0,2],[1,2],[2,2]],
      [[0,0],[1,1],[2,2]], [[0,2],[1,1],[2,0]],
    ];
    return lines.some(line => line.every(([r,c]) => board[r][c] !== null));
  }
}

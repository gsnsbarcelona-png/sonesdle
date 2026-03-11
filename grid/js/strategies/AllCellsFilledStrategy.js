import { WinConditionStrategy } from '../abstracts.js';

export class AllCellsFilledStrategy extends WinConditionStrategy {
  check(board) {
    return board.flat().every(cell => cell !== null);
  }
}

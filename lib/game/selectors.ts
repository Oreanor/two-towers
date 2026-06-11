import { BOARD_SIZE } from './constants';
import type { Board, Cell, CellRef, GameState, PlayerId } from './types';

export function getCell(board: Board, ref: CellRef): Cell {
  return board[ref.row][ref.col];
}

export function isOnBoard(row: number, col: number): boolean {
  return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
}

export function getNeighbors(board: Board, ref: CellRef): Cell[] {
  const deltas = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const result: Cell[] = [];
  for (const [dr, dc] of deltas) {
    const row = ref.row + dr;
    const col = ref.col + dc;
    if (isOnBoard(row, col)) {
      result.push(board[row][col]);
    }
  }
  return result;
}

export function areAdjacent(a: CellRef, b: CellRef): boolean {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

export function manhattan(a: CellRef, b: CellRef): number {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
}

export function getPlayerCells(board: Board, player: PlayerId): Cell[] {
  return board.flat().filter((cell) => cell.owner === player);
}

export function getMobilizationCells(board: Board, player: PlayerId): Cell[] {
  return getPlayerCells(board, player).filter(
    (cell) => cell.building === 'mainCastle' || cell.building === 'fort',
  );
}

/** True when income can only go to the main castle (no forts yet). */
export function incomeTargetIsCastleOnly(board: Board, player: PlayerId): boolean {
  return getMobilizationCells(board, player).length === 1;
}

/** Income that auto-lands on the castle when there are no forts yet. */
export function autoCastleIncome(
  state: GameState,
): { ref: CellRef; amount: number } | null {
  if (state.phase !== 'allocate' || state.pendingIncome <= 0) return null;
  if (!incomeTargetIsCastleOnly(state.board, state.currentPlayer)) return null;
  const castle = getMobilizationCells(state.board, state.currentPlayer)[0];
  return { ref: refOf(castle), amount: state.pendingIncome };
}

export function getMainCastle(board: Board, player: PlayerId): Cell | undefined {
  return board
    .flat()
    .find((cell) => cell.building === 'mainCastle' && cell.owner === player);
}

export function opponentOf(player: PlayerId): PlayerId {
  return player === 'human' ? 'bot' : 'human';
}

export function refOf(cell: Cell): CellRef {
  return { row: cell.row, col: cell.col };
}

export function cellLabel(ref: CellRef): string {
  return `[${ref.row},${ref.col}]`;
}

export function totalSoldiers(state: GameState, player: PlayerId): number {
  return getPlayerCells(state.board, player).reduce(
    (sum, cell) => sum + cell.soldiers,
    0,
  );
}

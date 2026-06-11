import {
  FORT_COST,
  FORT_DEFENSE_MULTIPLIER,
  FORT_INCOME,
  MAIN_CASTLE_DEFENSE_MULTIPLIER,
  MAIN_CASTLE_INCOME,
  MAX_FORTS_PER_PLAYER,
  NORMAL_CELL_INCOME,
} from './constants';
import {
  areAdjacent,
  cellLabel,
  getCell,
  getPlayerCells,
  opponentOf,
} from './selectors';
import type { Board, Cell, CellRef, GameState, PlayerId } from './types';

function updateCell(board: Board, ref: CellRef, patch: Partial<Cell>): Board {
  return board.map((row, r) =>
    row.map((cell, c) =>
      r === ref.row && c === ref.col ? { ...cell, ...patch } : cell,
    ),
  );
}

function withLog(state: GameState, message: string): GameState {
  return { ...state, log: [...state.log, message] };
}

export function calculateIncome(state: GameState, player: PlayerId): number {
  return getPlayerCells(state.board, player).reduce((sum, cell) => {
    if (cell.building === 'mainCastle') return sum + MAIN_CASTLE_INCOME;
    if (cell.building === 'fort') return sum + FORT_INCOME;
    return sum + NORMAL_CELL_INCOME;
  }, 0);
}

export function defenseMultiplier(cell: Cell): number {
  if (cell.building === 'mainCastle') return MAIN_CASTLE_DEFENSE_MULTIPLIER;
  if (cell.building === 'fort') return FORT_DEFENSE_MULTIPLIER;
  return 1;
}

export function effectiveDefense(cell: Cell): number {
  return cell.soldiers * defenseMultiplier(cell);
}

// --- Размещение дохода ---

export function canPlaceIncome(state: GameState, ref: CellRef): boolean {
  const cell = getCell(state.board, ref);
  return (
    state.phase === 'allocate' &&
    state.pendingIncome > 0 &&
    cell.owner === state.currentPlayer &&
    (cell.building === 'mainCastle' || cell.building === 'fort')
  );
}

export function placeIncome(
  state: GameState,
  ref: CellRef,
  amount: number,
): GameState {
  const cell = getCell(state.board, ref);
  const placed = Math.min(amount, state.pendingIncome);
  const board = updateCell(state.board, ref, {
    soldiers: cell.soldiers + placed,
  });
  const pendingIncome = state.pendingIncome - placed;
  return {
    ...state,
    board,
    pendingIncome,
    phase: pendingIncome === 0 ? 'action' : 'allocate',
  };
}

// --- Перемещение ---

export function canMove(
  state: GameState,
  from: CellRef,
  to: CellRef,
  soldiers: number,
): boolean {
  const source = getCell(state.board, from);
  const target = getCell(state.board, to);
  return (
    soldiers > 0 &&
    areAdjacent(from, to) &&
    source.owner === state.currentPlayer &&
    target.owner === state.currentPlayer &&
    source.soldiers >= soldiers
  );
}

export function moveSoldiers(
  state: GameState,
  from: CellRef,
  to: CellRef,
  soldiers: number,
): GameState {
  const source = getCell(state.board, from);
  const target = getCell(state.board, to);
  let board = updateCell(state.board, from, {
    soldiers: source.soldiers - soldiers,
  });
  board = updateCell(board, to, { soldiers: target.soldiers + soldiers });
  const next = { ...state, board };
  return withLog(
    next,
    `${playerName(state.currentPlayer)} moved ${soldiers} soldiers from ${cellLabel(from)} to ${cellLabel(to)}.`,
  );
}

// --- Занятие пустой клетки ---

export function canOccupy(
  state: GameState,
  from: CellRef,
  to: CellRef,
  soldiers: number,
): boolean {
  const source = getCell(state.board, from);
  const target = getCell(state.board, to);
  return (
    soldiers > 0 &&
    areAdjacent(from, to) &&
    source.owner === state.currentPlayer &&
    target.owner === null &&
    source.soldiers >= soldiers
  );
}

/** Занятие всегда успешно: на новую клетку переходят только отправленные солдаты. */
export function occupyNeutralCell(
  state: GameState,
  from: CellRef,
  to: CellRef,
  soldiers: number,
): GameState {
  const source = getCell(state.board, from);
  let board = updateCell(state.board, from, {
    soldiers: source.soldiers - soldiers,
  });
  board = updateCell(board, to, {
    owner: state.currentPlayer,
    soldiers,
  });
  const next = { ...state, board };
  return withLog(
    next,
    `${playerName(state.currentPlayer)} occupied ${cellLabel(to)} with ${soldiers} soldiers.`,
  );
}

// --- Атака ---

export function canAttack(
  state: GameState,
  from: CellRef,
  to: CellRef,
  soldiers: number,
): boolean {
  const source = getCell(state.board, from);
  const target = getCell(state.board, to);
  return (
    soldiers > 0 &&
    areAdjacent(from, to) &&
    source.owner === state.currentPlayer &&
    target.owner === opponentOf(state.currentPlayer) &&
    source.soldiers >= soldiers &&
    soldiers > effectiveDefense(target)
  );
}

export function attackCell(
  state: GameState,
  from: CellRef,
  to: CellRef,
  soldiers: number,
): GameState {
  const attacker = state.currentPlayer;
  const source = getCell(state.board, from);
  const target = getCell(state.board, to);
  const defense = effectiveDefense(target);
  const remainingAttackers = soldiers - defense;
  const capturedMainCastle = target.building === 'mainCastle';

  let board = updateCell(state.board, from, {
    soldiers: source.soldiers - soldiers,
  });
  board = updateCell(board, to, {
    owner: attacker,
    soldiers: remainingAttackers,
    // захваченный форт разрушается; замок остаётся (захват = победа)
    building: target.building === 'fort' ? null : target.building,
  });

  let next: GameState = { ...state, board };
  next = withLog(
    next,
    `${playerName(attacker)} attacked ${cellLabel(to)} from ${cellLabel(from)}. ` +
      `Lost ${defense} soldiers and captured the cell with ${remainingAttackers} remaining.`,
  );

  if (capturedMainCastle) {
    next = {
      ...next,
      phase: 'gameOver',
      winner: attacker,
    };
    next = withLog(
      next,
      `${playerName(attacker)} captured ${playerName(opponentOf(attacker))} main castle. ${playerName(attacker)} wins!`,
    );
  }
  return next;
}

// --- Форт ---

export function countForts(board: Board, player: PlayerId): number {
  return getPlayerCells(board, player).filter(
    (cell) => cell.building === 'fort',
  ).length;
}

export function canBuildFort(state: GameState, ref: CellRef): boolean {
  const cell = getCell(state.board, ref);
  return (
    cell.owner === state.currentPlayer &&
    cell.building === null &&
    cell.soldiers >= FORT_COST &&
    countForts(state.board, state.currentPlayer) < MAX_FORTS_PER_PLAYER
  );
}

export function buildFort(state: GameState, ref: CellRef): GameState {
  const cell = getCell(state.board, ref);
  const board = updateCell(state.board, ref, {
    building: 'fort',
    soldiers: cell.soldiers - FORT_COST,
  });
  const next = { ...state, board };
  return withLog(
    next,
    `${playerName(state.currentPlayer)} built a fort at ${cellLabel(ref)}.`,
  );
}

// --- Победа и смена хода ---

export function checkWinner(state: GameState): PlayerId | null {
  return state.winner;
}

export function startTurn(state: GameState, player: PlayerId): GameState {
  const income = calculateIncome(state, player);
  const next: GameState = {
    ...state,
    currentPlayer: player,
    phase: 'allocate',
    pendingIncome: income,
  };
  return withLog(next, `${playerName(player)} received ${income} reinforcements.`);
}

export function endTurn(state: GameState): GameState {
  if (state.phase === 'gameOver') return state;
  const nextPlayer = opponentOf(state.currentPlayer);
  const round = nextPlayer === 'human' ? state.round + 1 : state.round;
  return startTurn({ ...state, round }, nextPlayer);
}

export function playerName(player: PlayerId): string {
  return player === 'human' ? 'Human' : 'Bot';
}

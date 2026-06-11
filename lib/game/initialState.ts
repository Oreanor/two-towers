import {
  BOARD_SIZE,
  BOT_START,
  HUMAN_START,
  STARTING_SOLDIERS,
} from './constants';
import type { Board, GameState } from './types';

export function createInitialBoard(): Board {
  const board: Board = [];
  for (let row = 0; row < BOARD_SIZE; row++) {
    const cells = [];
    for (let col = 0; col < BOARD_SIZE; col++) {
      cells.push({ row, col, owner: null, soldiers: 0, building: null });
    }
    board.push(cells);
  }

  board[HUMAN_START.row][HUMAN_START.col] = {
    ...board[HUMAN_START.row][HUMAN_START.col],
    owner: 'human',
    soldiers: STARTING_SOLDIERS,
    building: 'mainCastle',
  };
  board[BOT_START.row][BOT_START.col] = {
    ...board[BOT_START.row][BOT_START.col],
    owner: 'bot',
    soldiers: STARTING_SOLDIERS,
    building: 'mainCastle',
  };

  return board;
}

export function createInitialState(): GameState {
  return {
    board: createInitialBoard(),
    currentPlayer: 'human',
    phase: 'allocate',
    round: 1,
    pendingIncome: 0,
    winner: null,
    log: ['Game started. Human moves first.'],
  };
}

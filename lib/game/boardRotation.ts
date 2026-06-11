import { BOARD_SIZE } from './constants';
import type { CellRef } from './types';

/** Quarter-turns clockwise (0–3). */
export type BoardRotation = 0 | 1 | 2 | 3;

/** Map a logical cell to its on-screen slot after `turns` CW rotations. */
export function rotateRef(ref: CellRef, turns: BoardRotation): CellRef {
  let { row, col } = ref;
  const steps = turns % 4;
  for (let i = 0; i < steps; i++) {
    const nextRow = col;
    const nextCol = BOARD_SIZE - 1 - row;
    row = nextRow;
    col = nextCol;
  }
  return { row, col };
}

export function nextRotation(turns: BoardRotation): BoardRotation {
  return ((turns + 1) % 4) as BoardRotation;
}

import type { Cell, CellRef, MoveKind, PlayerId } from '@/lib/game/types';
import type { FactionId } from '@/lib/game/factions';

export type IncomeFloat = { id: number; ref: CellRef; amount: number };

export type MoveAnim = {
  id: number;
  from: CellRef;
  to: CellRef;
  player: PlayerId;
  kind: MoveKind;
  faction: FactionId;
  flip: boolean;
  holdCell: Cell | null;
};

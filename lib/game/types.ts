import type { FactionId } from './factions';

export type PlayerId = 'human' | 'bot';

/** Who plays a board side: a person or the AI. */
export type ControllerKind = 'human' | 'ai';

export type Building = 'mainCastle' | 'fort' | null;

export type Cell = {
  row: number;
  col: number;
  owner: PlayerId | null;
  soldiers: number;
  building: Building;
};

export type Board = Cell[][];

export type Phase = 'allocate' | 'action' | 'gameOver';

export type MoveKind = 'move' | 'occupy' | 'attack';

/** The most recent troop movement, surfaced so the UI can animate it. `id`
 *  makes otherwise-identical moves distinguishable so the animation retriggers. */
export type LastMove = {
  id: number;
  from: CellRef;
  to: CellRef;
  player: PlayerId;
  kind: MoveKind;
};

export type GameState = {
  board: Board;
  currentPlayer: PlayerId;
  phase: Phase;
  round: number;
  pendingIncome: number;
  winner: PlayerId | null;
  humanFaction: FactionId;
  botFaction: FactionId;
  humanController: ControllerKind;
  botController: ControllerKind;
  lastMove?: LastMove | null;
  /** Consecutive "petty trade" bot turns; at 3 the AI switches to breakthrough. */
  aiStall?: number;
  log: string[];
};

export type CellRef = { row: number; col: number };

export type BotAction =
  | { type: 'attack'; from: CellRef; to: CellRef; soldiers: number }
  | { type: 'occupy'; from: CellRef; to: CellRef; soldiers: number }
  | { type: 'buildFort'; cell: CellRef }
  | { type: 'move'; from: CellRef; to: CellRef; soldiers: number }
  | { type: 'pass' };

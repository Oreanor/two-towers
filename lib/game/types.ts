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
  log: string[];
};

export type CellRef = { row: number; col: number };

export type BotAction =
  | { type: 'attack'; from: CellRef; to: CellRef; soldiers: number }
  | { type: 'occupy'; from: CellRef; to: CellRef; soldiers: number }
  | { type: 'buildFort'; cell: CellRef }
  | { type: 'move'; from: CellRef; to: CellRef; soldiers: number }
  | { type: 'pass' };

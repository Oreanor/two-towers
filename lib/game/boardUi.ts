import type { Cell, CellRef } from './types';
import type { FactionId } from './factions';

export function includesRef(list: CellRef[], ref: CellRef): boolean {
  return list.some((r) => r.row === ref.row && r.col === ref.col);
}

export function factionOf(
  cell: Cell,
  humanFaction: FactionId,
  botFaction: FactionId,
): FactionId | null {
  if (cell.owner === 'human') return humanFaction;
  if (cell.owner === 'bot') return botFaction;
  return null;
}

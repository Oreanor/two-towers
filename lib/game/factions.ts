export const FACTIONS = [
  'dwarves',
  'elves',
  'gondor',
  'isengard',
  'mordor',
  'rohan',
] as const;

export type FactionId = (typeof FACTIONS)[number];

export type FactionAsset = 'shield' | 'castle' | 'fort' | 'soldier';

export function factionAsset(faction: FactionId, asset: FactionAsset): string {
  return `/assets/${faction}/${asset}.png`;
}

/** Dwarves and Mordor soldier PNGs have extra side padding in the canvas. */
const SOLDIER_SPRITE_ADJUST: Partial<
  Record<FactionId, { scale: number; offsetX: number }>
> = {
  dwarves: { scale: 1.18, offsetX: 0 },
  mordor: { scale: 1.24, offsetX: -6 },
};

export function soldierSpriteAdjust(
  faction: FactionId,
  flipped: boolean,
): { scale: number; offsetX: number } {
  const adj = SOLDIER_SPRITE_ADJUST[faction];
  if (!adj) return { scale: 1, offsetX: 0 };
  return {
    scale: adj.scale,
    offsetX: flipped ? -adj.offsetX : adj.offsetX,
  };
}

export function isFactionId(value: string): value is FactionId {
  return (FACTIONS as readonly string[]).includes(value);
}

/** Old saves may lack factions — fall back to Gondor vs Mordor. */
export function resolveFactions(state: {
  humanFaction?: FactionId;
  botFaction?: FactionId;
}): { humanFaction: FactionId; botFaction: FactionId } {
  return {
    humanFaction: state.humanFaction ?? 'gondor',
    botFaction: state.botFaction ?? 'mordor',
  };
}

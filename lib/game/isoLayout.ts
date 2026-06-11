/** Isometric board layout over board3d.png (1449×604). Percentages of image size. */
export const ISO_ART_W = 1449;
export const ISO_ART_H = 604;

export const ISO_OX = 49.2;
export const ISO_OY = 8.0;
export const ISO_HW = 9.41;
export const ISO_HH = 8.97;
export const ISO_TILE_W = 18.82;
export const ISO_TILE_H = 17.95;

/** Colored tile overlay fine-tune (px on the art). */
const TILE_OVERLAY_DX = 3;
const TILE_OVERLAY_DY = -16;
const TILE_OVERLAY_SHIFT_X_PCT = 1;
const TILE_OVERLAY_SHIFT_Y_PCT = 2;
const TILE_OVERLAY_SQUISH_Y = 20;
const TILE_WIDTH_SCALE = 0.99;

const TILE_GRID_PIVOT_K = 4;
const TILE_Y_SPAN = 6 * ISO_HH;
const TILE_Y_SQUISH =
  (TILE_Y_SPAN - (TILE_OVERLAY_SQUISH_Y / ISO_ART_H) * 100) / TILE_Y_SPAN;
export const ISO_TILE_H_ADJ = ISO_TILE_H * TILE_Y_SQUISH;
export const ISO_TILE_W_ADJ = ISO_TILE_W * TILE_WIDTH_SCALE;

const PIECE_SCALE = 0.6075;
export const ISO_SOLDIER_W = 15 * PIECE_SCALE * 0.5;
const BUILDING_W = 22 * PIECE_SCALE * 0.75;
export const ISO_CASTLE_W = BUILDING_W * 1.1;
export const ISO_FORT_W = BUILDING_W * 0.95;
export const ISO_CASTLE_LIFT = -0.04 * ISO_TILE_H;

export const ISO_SOLDIERS_PER_ICON = 10;
export const ISO_MAX_ICONS = 5;
const STACK_RX = 2.6;
const STACK_RY = 1.4;

const FIG_DX = 0.07 * ISO_TILE_W;
const FIG_DY = -0.07 * ISO_TILE_H;

export function isoCellCenter(r: number, c: number): { left: number; top: number } {
  return { left: ISO_OX + ISO_HW * (c - r), top: ISO_OY + ISO_HH * (c + r + 1) };
}

/** Clickable / colored tile footprint — grid tuned to the board art. */
export function isoTileCenter(r: number, c: number): { left: number; top: number } {
  const rawLeft = ISO_OX + ISO_HW * (c - r);
  const rawTop = ISO_OY + ISO_HH * (c + r + 1);
  const pivotTop = ISO_OY + ISO_HH * TILE_GRID_PIVOT_K;
  const pivotLeft = ISO_OX;
  return {
    left:
      pivotLeft +
      (rawLeft - pivotLeft) * TILE_WIDTH_SCALE +
      (TILE_OVERLAY_DX / ISO_ART_W) * 100 +
      TILE_OVERLAY_SHIFT_X_PCT,
    top:
      pivotTop +
      (rawTop - pivotTop) * TILE_Y_SQUISH +
      (TILE_OVERLAY_DY / ISO_ART_H) * 100 +
      TILE_OVERLAY_SHIFT_Y_PCT,
  };
}

export function isoFigCenter(r: number, c: number): { left: number; top: number } {
  const p = isoCellCenter(r, c);
  return { left: p.left + FIG_DX, top: p.top + FIG_DY };
}

export function isoStackOffsets(soldiers: number): { dx: number; dy: number }[] {
  const n = Math.min(
    Math.max(Math.ceil(soldiers / ISO_SOLDIERS_PER_ICON), 1),
    ISO_MAX_ICONS,
  );
  if (n === 1) return [{ dx: 0, dy: 0 }];
  const pts = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { dx: STACK_RX * Math.cos(a), dy: STACK_RY * Math.sin(a) };
  });
  return pts.sort((p, q) => p.dy - q.dy);
}

export function isoTileHighlight(
  selected: boolean,
  isLegal: boolean,
  isMobilize: boolean,
): string {
  if (selected) return 'bg-[color-mix(in_srgb,var(--selected)_50%,transparent)]';
  if (isLegal) return 'bg-[color-mix(in_srgb,var(--legal-target)_50%,transparent)]';
  if (isMobilize) return 'bg-[color-mix(in_srgb,var(--mobilize)_50%,transparent)]';
  return '';
}

export function isoTileOwner(owner: 'human' | 'bot' | null): string {
  if (owner === 'human') return 'bg-[var(--owner-human)]';
  if (owner === 'bot') return 'bg-[var(--owner-bot)]';
  return '';
}

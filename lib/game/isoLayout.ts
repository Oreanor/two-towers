/** Isometric board layout over board3d.png (1449×604). Percentages of image size. */
export const ISO_OX = 49.2;
export const ISO_OY = 8.0;
export const ISO_HW = 9.41;
export const ISO_HH = 8.97;
export const ISO_TILE_W = 18.82;
export const ISO_TILE_H = 17.95;

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
  if (selected) return 'bg-selected/50';
  if (isLegal) return 'bg-legal-target/50';
  if (isMobilize) return 'bg-mobilize/50';
  return '';
}

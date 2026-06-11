'use client';

import type { CSSProperties } from 'react';
import {
  rotateRef,
  type BoardRotation,
} from '@/lib/game/boardRotation';
import type { Cell, CellRef, GameState, PlayerId } from '@/lib/game/types';
import {
  factionAsset,
  soldierSpriteAdjust,
  type FactionId,
} from '@/lib/game/factions';
import type { IncomeFloat } from './CellView';
import type { MoveAnim } from './Board';

/**
 * Isometric board over board3d.png. The art is a 4×4 diamond grid drawn with a
 * 275×96 tile (the user-measured size). The natural image is 1449×1085, so all
 * positions below are percentages of that and scale with the rendered board.
 *
 * Projection: from the grid's back corner O, stepping +1 column moves by
 * (+halfW, +halfH) and +1 row by (−halfW, +halfH). Tune O if the grid drifts.
 */
// Calibrated for the flat board3d.png (1449×604). Grid back corner + tile basis.
const OX = 49.2; // back corner x   (% width)
const OY = 8.0; // back corner y   (% height) — raised ~one cell
const HW = 9.41; // half tile width  (% width) — squeezed 3% horizontally
const HH = 8.97; // half tile height (% height)
const TILE_W = 18.82; // full tile width  (% width) — squeezed 3%
const TILE_H = 17.95; // full tile height (% height)

/** Every piece sprite is drawn at this fraction of its tile-relative size. */
const PIECE_SCALE = 0.6075; // 0.81 × 0.75 — a quarter smaller
const SOLDIER_W = 15 * PIECE_SCALE * 0.5; // % width — soldiers halved
const BUILDING_W = 22 * PIECE_SCALE * 0.75; // % width — castles/forts −25%
const CASTLE_W = BUILDING_W * 1.1;
const FORT_W = BUILDING_W * 0.95;
const CASTLE_LIFT = -0.04 * TILE_H; // nudge castles up within the cell

// A unit is drawn as overlapping copies: one per started 10 soldiers, capped.
const SOLDIERS_PER_ICON = 10;
const MAX_ICONS = 5;
// Copies huddle in a tight cluster (a small iso-squished ring) rather than a row.
const STACK_RX = 2.6; // cluster radius, % board width
const STACK_RY = 1.4; // cluster radius, % board height

/** Screen centre of cell (r,c), in % of the board image. */
function cellCenter(r: number, c: number): { left: number; top: number } {
  return { left: OX + HW * (c - r), top: OY + HH * (c + r + 1) };
}

// Fine offset applied to figures (and their badges) only — not the click tiles.
const FIG_DX = 0.07 * TILE_W; // +7% of a cell to the right (12% − 5% back)
const FIG_DY = -0.07 * TILE_H; // 7% of a cell up

/** Where a figure stands: the cell centre nudged by the figure offset. */
function figCenter(r: number, c: number): { left: number; top: number } {
  const p = cellCenter(r, c);
  return { left: p.left + FIG_DX, top: p.top + FIG_DY };
}

/** Per-copy cluster offsets, ordered back-to-front so z-stacking reads right. */
function stackOffsets(soldiers: number): { dx: number; dy: number }[] {
  const n = Math.min(
    Math.max(Math.ceil(soldiers / SOLDIERS_PER_ICON), 1),
    MAX_ICONS,
  );
  if (n === 1) return [{ dx: 0, dy: 0 }];
  const pts = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / n;
    return { dx: STACK_RX * Math.cos(a), dy: STACK_RY * Math.sin(a) };
  });
  return pts.sort((p, q) => p.dy - q.dy);
}

type Props = {
  state: GameState;
  selected: CellRef | null;
  legalTargets: CellRef[];
  mobilizationTargets: CellRef[];
  incomeFloats: IncomeFloat[];
  moveAnim: MoveAnim | null;
  rotation: BoardRotation;
  /** The side the player controls; only their pieces pulse on hover. */
  userSide: PlayerId | null;
  onIncomeFloatEnd: (id: number) => void;
  onCellClick: (ref: CellRef) => void;
};

function includesRef(list: CellRef[], ref: CellRef): boolean {
  return list.some((r) => r.row === ref.row && r.col === ref.col);
}

function factionOf(
  cell: Cell,
  humanFaction: FactionId,
  botFaction: FactionId,
): FactionId | null {
  if (cell.owner === 'human') return humanFaction;
  if (cell.owner === 'bot') return botFaction;
  return null;
}

/** One positioned sprite (a stacked soldier copy or a building). */
function Fig({
  left,
  top,
  width,
  src,
  flip,
  className,
  style,
  z,
  onClick,
}: {
  left: number;
  top: number;
  width: number;
  src: string;
  flip: boolean;
  className?: string;
  style?: CSSProperties;
  z?: number;
  onClick?: () => void;
}) {
  return (
    <div
      className={`iso-fig${onClick ? ' iso-fig--click' : ''}${className ? ` ${className}` : ''}`}
      style={{
        left: `${left}%`,
        top: `${top}%`,
        width: `${width}%`,
        zIndex: z,
        ...style,
      }}
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={`iso-fig__img${flip ? ' iso-fig__img--flip' : ''}`}
        src={src}
        alt=""
        draggable={false}
      />
    </div>
  );
}

/** The static sprites for a cell (building, or a stack of soldier copies). */
function cellFigs(
  cell: Cell,
  faction: FactionId,
  center: { left: number; top: number },
  className?: string,
  onClick?: () => void,
  zBase = 0,
) {
  if (cell.building === 'mainCastle' || cell.building === 'fort') {
    const asset = cell.building === 'mainCastle' ? 'castle' : 'fort';
    return [
      <Fig
        key="b"
        left={center.left}
        top={center.top + (cell.building === 'mainCastle' ? CASTLE_LIFT : 0)}
        width={cell.building === 'mainCastle' ? CASTLE_W : FORT_W}
        src={factionAsset(faction, asset)}
        flip={false}
        className={className}
        onClick={onClick}
        z={zBase}
      />,
    ];
  }
  if (cell.soldiers <= 0) return [];
  const adj = soldierSpriteAdjust(faction, cell.owner === 'human');
  const src = factionAsset(faction, 'soldier');
  return stackOffsets(cell.soldiers).map(({ dx, dy }, i) => (
    <Fig
      key={`s${i}`}
      z={zBase + i}
      left={center.left + dx}
      top={center.top + dy}
      width={SOLDIER_W * adj.scale}
      src={src}
      flip={cell.owner === 'human'}
      className={className}
      onClick={onClick}
    />
  ));
}

export default function IsoBoard({
  state,
  selected,
  legalTargets,
  mobilizationTargets,
  incomeFloats,
  moveAnim,
  rotation,
  userSide,
  onIncomeFloatEnd,
  onCellClick,
}: Props) {
  // Painter's order: back cells first so front pieces overlap them.
  const order: CellRef[] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) order.push({ row: r, col: c });
  order.sort((a, b) => {
    const va = rotateRef(a, rotation);
    const vb = rotateRef(b, rotation);
    return va.row + va.col - (vb.row + vb.col);
  });

  // The animated target's live piece is suppressed while the move plays.
  const animTo = moveAnim?.to ?? null;

  return (
    <div className="iso-board">
      {order.map(({ row: r, col: c }) => {
        const cell = state.board[r][c];
        const ref = { row: r, col: c };
        const slot = rotateRef(ref, rotation);
        const pos = cellCenter(slot.row, slot.col);
        const highlight =
          selected && selected.row === r && selected.col === c
            ? ' iso-tile--selected'
            : includesRef(legalTargets, ref)
              ? ' iso-tile--target'
              : includesRef(mobilizationTargets, ref)
                ? ' iso-tile--mobilize'
                : '';

        const faction = factionOf(cell, state.humanFaction, state.botFaction);
        const isAnimTarget = animTo?.row === r && animTo?.col === c;
        const mine = userSide != null && cell.owner === userSide;
        const fpos = figCenter(slot.row, slot.col);
        const lift = cell.building ? 20 : 14; // badge sits above the figure
        const depth = slot.row + slot.col; // back-to-front on the rotated view
        const cellFloats = incomeFloats.filter(
          (f) => f.ref.row === r && f.ref.col === c,
        );

        return (
          <div
            key={`${r}-${c}`}
            className={`iso-cell${mine ? ' iso-cell--mine' : ''}`}
          >
            <button
              className={`iso-tile${highlight}`}
              style={{
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                width: `${TILE_W}%`,
                height: `${TILE_H}%`,
              }}
              onClick={() => onCellClick(ref)}
              aria-label={`${r},${c}`}
            />

            {/* Hide the live piece on the target while its move animates. */}
            {!isAnimTarget &&
              faction &&
              cellFigs(
                cell,
                faction,
                fpos,
                undefined,
                () => onCellClick(ref),
                10 + depth * 4,
              )}

            {!isAnimTarget && cell.owner !== null && cell.soldiers > 0 && (
              <span
                className={`iso-count iso-count--${cell.owner}`}
                style={{
                  left: `${fpos.left}%`,
                  top: `${fpos.top - lift}%`,
                  zIndex: 20 + depth,
                }}
              >
                {cell.soldiers}
              </span>
            )}

            {cellFloats.map((f) => (
              <span
                key={f.id}
                className={`iso-float iso-float--${cell.owner}`}
                style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                onAnimationEnd={() => onIncomeFloatEnd(f.id)}
              >
                +{f.amount}
              </span>
            ))}
          </div>
        );
      })}

      {moveAnim && (
        <MoveLayer state={state} anim={moveAnim} rotation={rotation} />
      )}
    </div>
  );
}

/** Overlay that plays a move: the defender dies (on a real attack), then the
 *  surviving group rides in. The group's copy count matches who's left. */
function MoveLayer({
  state,
  anim,
  rotation,
}: {
  state: GameState;
  anim: MoveAnim;
  rotation: BoardRotation;
}) {
  const fromSlot = rotateRef(anim.from, rotation);
  const toSlot = rotateRef(anim.to, rotation);
  const from = figCenter(fromSlot.row, fromSlot.col);
  const to = figCenter(toSlot.row, toSlot.col);
  const arrived = state.board[anim.to.row][anim.to.col];
  const hold = anim.holdCell;

  const killsDefender =
    anim.kind === 'attack' &&
    !!hold &&
    hold.owner != null &&
    hold.owner !== anim.player &&
    hold.soldiers > 0;
  // A friendly move onto your own cell: those troops just stay put underneath.
  const holdStays =
    !killsDefender && !!hold && hold.owner === anim.player && hold.soldiers > 0;

  const defenderFaction = hold
    ? factionOf(hold, state.humanFaction, state.botFaction)
    : null;

  // The riders only set off once the defender is mostly gone.
  const slideDelay = killsDefender ? 220 : 0;
  const adj = soldierSpriteAdjust(anim.faction, anim.flip);
  const offsets = stackOffsets(arrived.soldiers > 0 ? arrived.soldiers : 1);
  const soldierSrc = factionAsset(anim.faction, 'soldier');

  return (
    <div className="iso-move-layer">
      {killsDefender &&
        defenderFaction &&
        cellFigs(hold!, defenderFaction, to, 'iso-fig--die')}

      {holdStays && defenderFaction && cellFigs(hold!, defenderFaction, to)}

      {offsets.map(({ dx, dy }, i) => (
        <Fig
          key={`m${i}`}
          left={from.left + dx}
          top={from.top + dy}
          width={SOLDIER_W * adj.scale}
          src={soldierSrc}
          flip={anim.flip}
          className="iso-fig--move"
          z={50 + i}
          style={
            {
              '--fx': `${from.left + dx}%`,
              '--fy': `${from.top + dy}%`,
              '--tx': `${to.left + dx}%`,
              '--ty': `${to.top + dy}%`,
              '--delay': `${slideDelay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

'use client';

import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { includesRef, factionOf } from '@/lib/game/boardUi';
import { rotateRef, type BoardRotation } from '@/lib/game/boardRotation';
import {
  isoFigCenter,
  isoStackOffsets,
  isoTileCenter,
  isoTileHighlight,
  isoTileOwner,
  ISO_CASTLE_LIFT,
  ISO_CASTLE_W,
  ISO_FORT_W,
  ISO_SOLDIER_W,
  ISO_TILE_H_ADJ,
  ISO_TILE_W_ADJ,
} from '@/lib/game/isoLayout';
import { factionAsset, soldierSpriteAdjust } from '@/lib/game/factions';
import type { Cell, CellRef, GameState, PlayerId } from '@/lib/game/types';
import type { FactionId } from '@/lib/game/factions';
import type { IncomeFloat, MoveAnim } from '@/components/board/types';

type Props = {
  state: GameState;
  selected: CellRef | null;
  legalTargets: CellRef[];
  mobilizationTargets: CellRef[];
  incomeFloats: IncomeFloat[];
  moveAnim: MoveAnim | null;
  rotation: BoardRotation;
  userSide: PlayerId | null;
  onIncomeFloatEnd: (id: number) => void;
  onCellClick: (ref: CellRef) => void;
  className?: string;
};

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
      className={cn(
        'iso-fig pointer-events-none absolute h-auto -translate-x-1/2 -translate-y-[82%] origin-bottom select-none drop-shadow-[0_4px_5px_rgba(0,0,0,0.45)]',
        onClick && 'iso-fig-click pointer-events-auto cursor-pointer',
        className,
      )}
      style={{ left: `${left}%`, top: `${top}%`, width: `${width}%`, zIndex: z, ...style }}
      onClick={onClick}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className={cn('block size-full h-auto', flip && 'scale-x-[-1]')}
        src={src}
        alt=""
        draggable={false}
      />
    </div>
  );
}

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
        top={center.top + (cell.building === 'mainCastle' ? ISO_CASTLE_LIFT : 0)}
        width={cell.building === 'mainCastle' ? ISO_CASTLE_W : ISO_FORT_W}
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
  return isoStackOffsets(cell.soldiers).map(({ dx, dy }, i) => (
    <Fig
      key={`s${i}`}
      z={zBase + i}
      left={center.left + dx}
      top={center.top + dy}
      width={ISO_SOLDIER_W * adj.scale}
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
  className,
}: Props) {
  const order: CellRef[] = [];
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 4; c++) order.push({ row: r, col: c });
  order.sort((a, b) => {
    const va = rotateRef(a, rotation);
    const vb = rotateRef(b, rotation);
    return va.row + va.col - (vb.row + vb.col);
  });

  const animTo = moveAnim?.to ?? null;

  return (
    <div
      className={cn(
        'relative isolate z-0 aspect-[1449/604] h-full w-auto bg-board-3d bg-contain bg-center bg-no-repeat',
        className,
      )}
    >
      {order.map(({ row: r, col: c }) => {
        const cell = state.board[r][c];
        const ref = { row: r, col: c };
        const slot = rotateRef(ref, rotation);
        const tilePos = isoTileCenter(slot.row, slot.col);
        const isSelected = !!(selected && selected.row === r && selected.col === c);
        const isLegal = includesRef(legalTargets, ref);
        const isMobilize = includesRef(mobilizationTargets, ref);

        const faction = factionOf(cell, state.humanFaction, state.botFaction);
        const isAnimTarget = animTo?.row === r && animTo?.col === c;
        const mine = userSide != null && cell.owner === userSide;
        const fpos = isoFigCenter(slot.row, slot.col);
        const lift = cell.building ? 20 : 14;
        const depth = slot.row + slot.col;
        const cellFloats = incomeFloats.filter(
          (f) => f.ref.row === r && f.ref.col === c,
        );

        return (
          <div
            key={`${r}-${c}`}
            className={cn('pointer-events-none absolute inset-0', mine && 'iso-cell-mine')}
          >
            <button
              className={cn(
                'iso-tile pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer border-none p-0 transition-colors [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)]',
                isoTileOwner(cell.owner),
                isoTileHighlight(isSelected, isLegal, isMobilize),
              )}
              style={{
                left: `${tilePos.left}%`,
                top: `${tilePos.top}%`,
                width: `${ISO_TILE_W_ADJ}%`,
                height: `${ISO_TILE_H_ADJ}%`,
              }}
              onClick={() => onCellClick(ref)}
              aria-label={`${r},${c}`}
            />

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
                className={cn(
                  'iso-count absolute -translate-x-1/2 -translate-y-full min-w-6 rounded-full px-[7px] py-px text-center text-[15px] leading-snug font-extrabold text-white tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.45)]',
                  cell.owner === 'human' && 'bg-human',
                  cell.owner === 'bot' && 'bg-bot',
                )}
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
                className={cn(
                  'pointer-events-none absolute z-[46] rounded-full px-[9px] py-0.5 text-lg leading-tight font-extrabold text-white shadow-[0_2px_6px_rgba(0,0,0,0.4)] animate-float-up-iso',
                  cell.owner === 'human' && 'bg-human',
                  cell.owner === 'bot' && 'bg-bot',
                )}
                style={{ left: `${tilePos.left}%`, top: `${tilePos.top}%` }}
                onAnimationEnd={() => onIncomeFloatEnd(f.id)}
              >
                +{f.amount}
              </span>
            ))}
          </div>
        );
      })}

      {moveAnim && <MoveLayer state={state} anim={moveAnim} rotation={rotation} />}
    </div>
  );
}

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
  const from = isoFigCenter(fromSlot.row, fromSlot.col);
  const to = isoFigCenter(toSlot.row, toSlot.col);
  const arrived = state.board[anim.to.row][anim.to.col];
  const hold = anim.holdCell;

  const killsDefender =
    anim.kind === 'attack' &&
    !!hold &&
    hold.owner != null &&
    hold.owner !== anim.player &&
    hold.soldiers > 0;
  const holdStays =
    !killsDefender && !!hold && hold.owner === anim.player && hold.soldiers > 0;

  const defenderFaction = hold
    ? factionOf(hold, state.humanFaction, state.botFaction)
    : null;

  const slideDelay = killsDefender ? 220 : 0;
  const adj = soldierSpriteAdjust(anim.faction, anim.flip);
  const offsets = isoStackOffsets(arrived.soldiers > 0 ? arrived.soldiers : 1);
  const soldierSrc = factionAsset(anim.faction, 'soldier');

  return (
    <div className="pointer-events-none absolute inset-0 z-[45]">
      {killsDefender &&
        defenderFaction &&
        cellFigs(hold!, defenderFaction, to, 'animate-iso-fig-die')}

      {holdStays && defenderFaction && cellFigs(hold!, defenderFaction, to)}

      {offsets.map(({ dx, dy }, i) => (
        <Fig
          key={`m${i}`}
          left={from.left + dx}
          top={from.top + dy}
          width={ISO_SOLDIER_W * adj.scale}
          src={soldierSrc}
          flip={anim.flip}
          className="animate-slide-to"
          z={50 + i}
          style={
            {
              '--fx': `${from.left + dx}%`,
              '--fy': `${from.top + dy}%`,
              '--tx': `${to.left + dx}%`,
              '--ty': `${to.top + dy}%`,
              animationDelay: `${slideDelay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

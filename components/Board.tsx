import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { includesRef } from '@/lib/game/boardUi';
import { rotateRef, type BoardRotation } from '@/lib/game/boardRotation';
import { factionAsset } from '@/lib/game/factions';
import type { GameState } from '@/lib/game/types';
import type { IncomeFloat, MoveAnim } from '@/components/board/types';
import type { CellRef } from '@/lib/game/types';
import CellView from './CellView';

type Props = {
  state: GameState;
  selected: CellRef | null;
  legalTargets: CellRef[];
  mobilizationTargets: CellRef[];
  incomeFloats: IncomeFloat[];
  moveAnim: MoveAnim | null;
  rotation: BoardRotation;
  onIncomeFloatEnd: (id: number) => void;
  onCellClick: (ref: CellRef) => void;
};

const CELL_PCT = 25;

export default function Board({
  state,
  selected,
  legalTargets,
  mobilizationTargets,
  incomeFloats,
  moveAnim,
  rotation,
  onIncomeFloatEnd,
  onCellClick,
}: Props) {
  return (
    <div className="relative aspect-square w-full bg-board-2d bg-contain bg-center bg-no-repeat">
      <div className="absolute inset-[10.4%] grid grid-cols-4 grid-rows-4 place-items-stretch">
        {state.board.flat().map((cell) => {
          const ref = { row: cell.row, col: cell.col };
          const slot = rotateRef(ref, rotation);
          const held =
            moveAnim?.holdCell &&
            cell.row === moveAnim.to.row &&
            cell.col === moveAnim.to.col
              ? moveAnim.holdCell
              : cell;
          return (
            <CellView
              key={`${cell.row}-${cell.col}`}
              cell={held}
              humanFaction={state.humanFaction}
              botFaction={state.botFaction}
              isSelected={
                selected !== null &&
                selected.row === cell.row &&
                selected.col === cell.col
              }
              isLegalTarget={includesRef(legalTargets, cell)}
              isMobilizationTarget={includesRef(mobilizationTargets, cell)}
              incomeFloats={incomeFloats}
              onIncomeFloatEnd={onIncomeFloatEnd}
              gridStyle={{
                gridRow: slot.row + 1,
                gridColumn: slot.col + 1,
              }}
              onClick={() => onCellClick(ref)}
            />
          );
        })}

        {moveAnim && (() => {
          const from = rotateRef(moveAnim.from, rotation);
          const to = rotateRef(moveAnim.to, rotation);
          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={moveAnim.id}
              className={cn(
                'pointer-events-none absolute z-30 size-1/4 object-contain p-[5%] drop-shadow-[0_3px_6px_rgba(0,0,0,0.45)] select-none animate-slide-to',
                moveAnim.flip && 'scale-x-[-1]',
              )}
              style={
                {
                  '--fx': `${from.col * CELL_PCT}%`,
                  '--fy': `${from.row * CELL_PCT}%`,
                  '--tx': `${to.col * CELL_PCT}%`,
                  '--ty': `${to.row * CELL_PCT}%`,
                } as CSSProperties
              }
              src={factionAsset(moveAnim.faction, 'soldier')}
              alt=""
              draggable={false}
            />
          );
        })()}
      </div>
    </div>
  );
}

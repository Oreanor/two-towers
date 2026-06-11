import type { CSSProperties } from 'react';
import {
  rotateRef,
  type BoardRotation,
} from '@/lib/game/boardRotation';
import type {
  Cell,
  CellRef,
  GameState,
  MoveKind,
  PlayerId,
} from '@/lib/game/types';
import { factionAsset, type FactionId } from '@/lib/game/factions';
import CellView, { type IncomeFloat } from './CellView';

/** A troop movement to animate: a sprite sliding from one cell to another. */
export type MoveAnim = {
  id: number;
  from: CellRef;
  to: CellRef;
  player: PlayerId;
  kind: MoveKind;
  faction: FactionId;
  flip: boolean;
  /** The target cell's pre-move occupant, held in place until the sprite lands
   *  (so an attacked defender stays visible until the troops actually arrive). */
  holdCell: Cell | null;
};

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

function includesRef(list: CellRef[], ref: CellRef): boolean {
  return list.some((r) => r.row === ref.row && r.col === ref.col);
}

// The board is a 4-wide grid, so each cell spans 25% of the play area.
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
    <div className="board">
      <div className="board__grid">
        {state.board.flat().map((cell) => {
          const ref = { row: cell.row, col: cell.col };
          const slot = rotateRef(ref, rotation);
          // Hold the defender on the target cell until the sliding sprite lands.
          const held =
            moveAnim &&
            moveAnim.holdCell &&
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
          // Keyed by id so each move remounts the sprite and restarts the slide.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={moveAnim.id}
            className={`board__move${moveAnim.flip ? ' board__move--flip' : ''}`}
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

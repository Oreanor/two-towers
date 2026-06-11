import type { CellRef, GameState } from '@/lib/game/types';
import CellView from './CellView';

type Props = {
  state: GameState;
  selected: CellRef | null;
  legalTargets: CellRef[];
  mobilizationTargets: CellRef[];
  onCellClick: (ref: CellRef) => void;
};

function includesRef(list: CellRef[], ref: CellRef): boolean {
  return list.some((r) => r.row === ref.row && r.col === ref.col);
}

export default function Board({
  state,
  selected,
  legalTargets,
  mobilizationTargets,
  onCellClick,
}: Props) {
  return (
    <div className="board">
      <div className="board__grid">
        {state.board.flat().map((cell) => (
          <CellView
            key={`${cell.row}-${cell.col}`}
            cell={cell}
            isSelected={
              selected !== null &&
              selected.row === cell.row &&
              selected.col === cell.col
            }
            isLegalTarget={includesRef(legalTargets, cell)}
            isMobilizationTarget={includesRef(mobilizationTargets, cell)}
            onClick={() => onCellClick({ row: cell.row, col: cell.col })}
          />
        ))}
      </div>
    </div>
  );
}

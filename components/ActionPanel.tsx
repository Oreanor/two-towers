import { FORT_COST } from '@/lib/game/constants';
import type { Cell } from '@/lib/game/types';

type Props = {
  selectedCell: Cell | null;
  soldierCount: number;
  maxSoldiers: number;
  canBuild: boolean;
  onSoldierCountChange: (value: number) => void;
  onBuildFort: () => void;
  onPass: () => void;
};

export default function ActionPanel({
  selectedCell,
  soldierCount,
  maxSoldiers,
  canBuild,
  onSoldierCountChange,
  onBuildFort,
  onPass,
}: Props) {
  return (
    <div className="rounded-lg border border-gray-300 p-4 flex flex-col gap-3">
      <h2 className="text-sm font-bold uppercase text-gray-500">Your action</h2>

      {selectedCell === null ? (
        <p className="text-xs text-gray-600">
          Select one of your cells, then click a highlighted neighbor: your cell
          — move, neutral — occupy, enemy — attack.
        </p>
      ) : (
        <>
          <p className="text-xs text-gray-600">
            Source: [{selectedCell.row},{selectedCell.col}],{' '}
            {selectedCell.soldiers} soldiers. Click a highlighted target cell.
          </p>
          <label className="flex items-center gap-2 text-sm">
            Soldiers to send:
            <input
              type="number"
              min={1}
              max={maxSoldiers}
              value={soldierCount}
              onChange={(e) =>
                onSoldierCountChange(
                  Math.max(1, Math.min(maxSoldiers, Number(e.target.value) || 1)),
                )
              }
              className="w-20 rounded border border-gray-300 px-2 py-1"
            />
            <span className="text-xs text-gray-400">/ {maxSoldiers}</span>
          </label>
          <button
            onClick={onBuildFort}
            disabled={!canBuild}
            className="rounded bg-amber-600 px-3 py-1 text-sm text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            Build fort here (−{FORT_COST} soldiers)
          </button>
        </>
      )}

      <button
        onClick={onPass}
        className="rounded border border-gray-400 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
      >
        Skip action (end turn)
      </button>
    </div>
  );
}

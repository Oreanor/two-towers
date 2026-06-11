import type { Cell } from '@/lib/game/types';

type Props = {
  cell: Cell;
  isSelected: boolean;
  isLegalTarget: boolean;
  isMobilizationTarget: boolean;
  onClick: () => void;
};

function ownerClasses(cell: Cell): string {
  if (cell.owner === 'human') return 'bg-blue-100 border-blue-500 text-blue-900';
  if (cell.owner === 'bot') return 'bg-red-100 border-red-500 text-red-900';
  return 'bg-gray-50 border-gray-300 text-gray-400';
}

function buildingLabel(cell: Cell): string {
  if (cell.building === 'mainCastle') return 'Castle';
  if (cell.building === 'fort') return 'Fort';
  return '';
}

export default function CellView({
  cell,
  isSelected,
  isLegalTarget,
  isMobilizationTarget,
  onClick,
}: Props) {
  const ring = isSelected
    ? 'ring-4 ring-amber-400'
    : isLegalTarget
      ? 'ring-4 ring-green-400'
      : isMobilizationTarget
        ? 'ring-4 ring-purple-400'
        : '';

  return (
    <button
      onClick={onClick}
      className={`aspect-square w-full rounded-lg border-2 ${ownerClasses(cell)} ${ring} flex flex-col items-center justify-center gap-0.5 transition-shadow hover:shadow-md`}
    >
      <span className="text-[10px] uppercase tracking-wide opacity-60">
        {cell.owner === 'human' ? 'H' : cell.owner === 'bot' ? 'B' : ''}{' '}
        {buildingLabel(cell) || (cell.owner === null ? 'Neutral' : '')}
      </span>
      <span className="text-2xl font-bold">
        {cell.owner !== null ? cell.soldiers : ''}
      </span>
      <span className="text-[10px] opacity-40">
        [{cell.row},{cell.col}]
      </span>
    </button>
  );
}

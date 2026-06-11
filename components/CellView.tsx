import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { factionOf } from '@/lib/game/boardUi';
import { factionAsset, soldierSpriteAdjust } from '@/lib/game/factions';
import type { IncomeFloat } from '@/components/board/types';
import type { Cell } from '@/lib/game/types';
import type { FactionId } from '@/lib/game/factions';

type Props = {
  cell: Cell;
  humanFaction: FactionId;
  botFaction: FactionId;
  isSelected: boolean;
  isLegalTarget: boolean;
  isMobilizationTarget: boolean;
  incomeFloats: IncomeFloat[];
  onIncomeFloatEnd: (id: number) => void;
  gridStyle?: CSSProperties;
  onClick: () => void;
};

const SOLDIERS_PER_ICON = 10;
const MAX_ICONS = 10;
const ICON_W = 46;
const STEP = 12;

function buildingImage(cell: Cell, faction: FactionId): string | null {
  if (cell.building === 'mainCastle') return factionAsset(faction, 'castle');
  if (cell.building === 'fort') return factionAsset(faction, 'fort');
  return null;
}

function armyLayout(soldiers: number) {
  const icons = Math.min(Math.ceil(soldiers / SOLDIERS_PER_ICON), MAX_ICONS);
  const front = Math.min(icons, 5);
  const back = icons - front;
  const ranks = [
    { n: back, bottom: 25, z: 0, stagger: STEP / 2 },
    { n: front, bottom: 8, z: 10, stagger: 0 },
  ];
  const out: { left: number; bottom: number; z: number }[] = [];
  for (const rank of ranks) {
    if (rank.n <= 0) continue;
    const span = ICON_W + (rank.n - 1) * STEP;
    const start = (100 - span) / 2 + rank.stagger;
    for (let i = 0; i < rank.n; i++) {
      out.push({ left: start + i * STEP, bottom: rank.bottom, z: rank.z + i });
    }
  }
  return out;
}

export default function CellView({
  cell,
  humanFaction,
  botFaction,
  isSelected,
  isLegalTarget,
  isMobilizationTarget,
  incomeFloats,
  onIncomeFloatEnd,
  gridStyle,
  onClick,
}: Props) {
  const faction = cell.owner !== null ? factionOf(cell, humanFaction, botFaction) : null;
  const building = faction ? buildingImage(cell, faction) : null;
  const soldierAdj = faction
    ? soldierSpriteAdjust(faction, cell.owner === 'human')
    : { scale: 1, offsetX: 0 };
  const isArmy = !building && cell.owner !== null && cell.soldiers > 0;
  const cellFloats = incomeFloats.filter(
    (f) => f.ref.row === cell.row && f.ref.col === cell.col,
  );

  return (
    <button
      className={cn(
        'relative m-0 block size-full min-h-0 min-w-0 cursor-pointer appearance-none overflow-hidden rounded-lg border-none bg-transparent p-0 font-[inherit] text-inherit transition-shadow',
        cell.owner === 'human' &&
          "before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[inherit] before:bg-owner-human before:content-['']",
        cell.owner === 'bot' &&
          "before:pointer-events-none before:absolute before:inset-0 before:z-0 before:rounded-[inherit] before:bg-owner-bot before:content-['']",
        isSelected && 'shadow-[inset_0_0_0_3px_var(--selected)]',
        isLegalTarget && 'shadow-[inset_0_0_0_3px_var(--legal-target)]',
        isMobilizationTarget && 'shadow-[inset_0_0_0_3px_var(--mobilize)]',
      )}
      style={gridStyle}
      onClick={onClick}
    >
      {building && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={cn(
            'pointer-events-none absolute inset-0 z-[1] box-border size-full object-contain p-[6%] select-none',
            cell.building === 'mainCastle' && 'scale-110 -translate-y-[4%]',
            cell.building === 'fort' && 'scale-95',
          )}
          src={building}
          alt=""
          draggable={false}
        />
      )}
      {isArmy && faction && (
        <div
          className={cn(
            'absolute inset-0 z-[1] overflow-hidden rounded-[inherit]',
            cell.owner === 'human' && 'scale-x-[-1]',
          )}
          aria-hidden="true"
        >
          {armyLayout(cell.soldiers).map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              className="pointer-events-none absolute h-auto drop-shadow-[0_2px_3px_rgba(0,0,0,0.3)] select-none"
              style={{
                left: `${p.left}%`,
                bottom: `${p.bottom}%`,
                zIndex: p.z,
                width: `${ICON_W * soldierAdj.scale}%`,
                transform:
                  soldierAdj.offsetX !== 0
                    ? `translateX(${soldierAdj.offsetX}%)`
                    : undefined,
              }}
              src={factionAsset(faction, 'soldier')}
              alt=""
              draggable={false}
            />
          ))}
        </div>
      )}
      {cellFloats.map((f) => (
        <span
          key={f.id}
          className={cn(
            'pointer-events-none absolute bottom-[22%] left-1/2 z-[25] rounded-full px-2.5 py-[3px] text-[22px] leading-tight font-extrabold text-white tabular-nums shadow-[0_2px_6px_rgba(0,0,0,0.4)] select-none animate-float-up-cell',
            cell.owner === 'human' && 'bg-human',
            cell.owner === 'bot' && 'bg-bot',
          )}
          onAnimationEnd={() => onIncomeFloatEnd(f.id)}
        >
          +{f.amount}
        </span>
      ))}
      {cell.owner !== null && cell.soldiers > 0 && (
        <span
          className={cn(
            'absolute right-1 bottom-1 z-20 min-w-[30px] rounded-full px-2 py-0.5 text-lg leading-snug font-extrabold text-white tabular-nums shadow-[0_1px_4px_rgba(0,0,0,0.45)]',
            cell.owner === 'human' && 'bg-human',
            cell.owner === 'bot' && 'bg-bot',
          )}
        >
          {cell.soldiers}
        </span>
      )}
    </button>
  );
}

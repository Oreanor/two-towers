import type { CSSProperties } from 'react';
import type { Cell, CellRef } from '@/lib/game/types';
import { factionAsset, soldierSpriteAdjust, type FactionId } from '@/lib/game/factions';

export type IncomeFloat = { id: number; ref: CellRef; amount: number };

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

function factionOf(
  cell: Cell,
  humanFaction: FactionId,
  botFaction: FactionId,
): FactionId | null {
  if (cell.owner === 'human') return humanFaction;
  if (cell.owner === 'bot') return botFaction;
  return null;
}

function buildingImage(cell: Cell, faction: FactionId): string | null {
  if (cell.building === 'mainCastle') return factionAsset(faction, 'castle');
  if (cell.building === 'fort') return factionAsset(faction, 'fort');
  return null;
}

/** One figure per started 10 soldiers: a front rank of up to five overlapping
 *  figures, then a second rank peeking out behind them. */
const SOLDIERS_PER_ICON = 10;
const MAX_ICONS = 10;
const ICON_W = 46; // % of the cell
const STEP = 12; // % horizontal shift between figures in a rank

function armyLayout(soldiers: number) {
  const icons = Math.min(Math.ceil(soldiers / SOLDIERS_PER_ICON), MAX_ICONS);
  const front = Math.min(icons, 5);
  const back = icons - front;
  const ranks = [
    // The back rank renders first (lower z), raised and half-step staggered.
    { n: back, bottom: 25, z: 0, stagger: STEP / 2 },
    { n: front, bottom: 8, z: 10, stagger: 0 },
  ];
  const out: { left: number; bottom: number; z: number }[] = [];
  for (const rank of ranks) {
    if (rank.n <= 0) continue;
    const span = ICON_W + (rank.n - 1) * STEP;
    const start = (100 - span) / 2 + rank.stagger;
    for (let i = 0; i < rank.n; i++) {
      out.push({
        left: start + i * STEP,
        bottom: rank.bottom,
        z: rank.z + i,
      });
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
  const owner =
    cell.owner === 'human'
      ? 'cell--human'
      : cell.owner === 'bot'
        ? 'cell--bot'
        : 'cell--neutral';
  const ring = isSelected
    ? ' cell--selected'
    : isLegalTarget
      ? ' cell--target'
      : isMobilizationTarget
        ? ' cell--mobilize'
        : '';
  const building =
    cell.owner !== null
      ? buildingImage(cell, factionOf(cell, humanFaction, botFaction)!)
      : null;
  const faction =
    cell.owner !== null ? factionOf(cell, humanFaction, botFaction)! : null;
  const soldierAdj = faction
    ? soldierSpriteAdjust(faction, cell.owner === 'human')
    : { scale: 1, offsetX: 0 };
  const isArmy = !building && cell.owner !== null && cell.soldiers > 0;
  // Both soldier sprites face the same way; mirror the human's so the armies
  // face each other (human marches from bottom-left toward the bot's corner).
  const flip = cell.owner === 'human' ? ' cell__army--flip' : '';
  const cellFloats = incomeFloats.filter(
    (f) => f.ref.row === cell.row && f.ref.col === cell.col,
  );

  return (
    <button className={`cell ${owner}${ring}`} style={gridStyle} onClick={onClick}>
      {building && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          className={`cell__img cell__img--${cell.building === 'mainCastle' ? 'castle' : 'fort'}`}
          src={building}
          alt=""
          draggable={false}
        />
      )}
      {isArmy && faction && (
        <div className={`cell__army${flip}`} aria-hidden="true">
          {armyLayout(cell.soldiers).map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              className="cell__army-icon"
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
          className={`cell__income-float cell__income-float--${cell.owner}`}
          onAnimationEnd={() => onIncomeFloatEnd(f.id)}
        >
          +{f.amount}
        </span>
      ))}
      {cell.owner !== null && cell.soldiers > 0 && (
        <span className={`cell__count cell__count--${cell.owner}`}>
          {cell.soldiers}
        </span>
      )}
    </button>
  );
}

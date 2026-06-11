import type { Cell } from '@/lib/game/types';

type Props = {
  cell: Cell;
  isSelected: boolean;
  isLegalTarget: boolean;
  isMobilizationTarget: boolean;
  onClick: () => void;
};

/** Asset suffix per side: blue (2) is the human player, red (1) the bot. */
function sideOf(cell: Cell): string {
  return cell.owner === 'human' ? '2' : '1';
}

function buildingImage(cell: Cell): string | null {
  if (cell.owner === null) return null;
  if (cell.building === 'mainCastle') return `/assets/castle${sideOf(cell)}.png`;
  if (cell.building === 'fort') return `/assets/fort${sideOf(cell)}.png`;
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
  isSelected,
  isLegalTarget,
  isMobilizationTarget,
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
  const building = buildingImage(cell);
  const isArmy = !building && cell.owner !== null && cell.soldiers > 0;
  // Both soldier sprites face the same way; mirror the human's so the armies
  // face each other (human marches from bottom-left toward the bot's corner).
  const flip = cell.owner === 'human' ? ' cell__army--flip' : '';

  return (
    <button className={`cell ${owner}${ring}`} onClick={onClick}>
      {building && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cell__img" src={building} alt="" draggable={false} />
      )}
      {isArmy && (
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
              }}
              src={`/assets/soldier${sideOf(cell)}.png`}
              alt=""
              draggable={false}
            />
          ))}
        </div>
      )}
      {cell.owner !== null && cell.soldiers > 0 && (
        <span className={`cell__count cell__count--${cell.owner}`}>
          {cell.soldiers}
        </span>
      )}
    </button>
  );
}

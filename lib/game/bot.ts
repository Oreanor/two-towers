import {
  attackCell,
  buildFort,
  canAttack,
  canBuildFort,
  canOccupy,
  effectiveDefense,
  endTurn,
  moveSoldiers,
  occupyNeutralCell,
  placeIncome,
} from './rules';
import {
  getMainCastle,
  getMobilizationCells,
  getNeighbors,
  getPlayerCells,
  manhattan,
  opponentOf,
  refOf,
} from './selectors';
import type { BotAction, Cell, CellRef, GameState } from './types';
import { FORT_COST } from './constants';

const BOT_FORT_MIN_SOLDIERS = 7;
const BOT_OCCUPY_MIN_SOURCE = 3;
const MIN_CELLS_BEFORE_FORT = 3;

/** Reinforce the mobilization point closest to the enemy front. */
function allocateBotIncome(state: GameState): GameState {
  if (state.pendingIncome === 0) return { ...state, phase: 'action' };

  const self = state.currentPlayer;
  const enemy = opponentOf(self);
  const enemyCells = getPlayerCells(state.board, enemy);
  const points = getMobilizationCells(state.board, self);
  if (points.length === 0) return { ...state, phase: 'action' };

  const distToFront = (cell: Cell) =>
    enemyCells.length === 0
      ? 0
      : Math.min(...enemyCells.map((h) => manhattan(refOf(cell), refOf(h))));

  const sorted = [...points].sort((a, b) => {
    const fortPriority =
      Number(b.building === 'fort') - Number(a.building === 'fort');
    if (fortPriority !== 0) return fortPriority;
    const dist = distToFront(a) - distToFront(b);
    if (dist !== 0) return dist;
    return a.soldiers - b.soldiers;
  });

  return placeIncome(state, refOf(sorted[0]), state.pendingIncome);
}

function attackWeight(target: Cell): number {
  if (target.building === 'mainCastle') return 1000;
  // Forts are worth taking (deny the enemy a stronghold + income), well above
  // a plain cell — so the bot won't ignore an empty/weak fort next to it.
  if (target.building === 'fort') return 50;
  return 10 + target.soldiers;
}

function minDistToEnemy(state: GameState, ref: CellRef): number {
  const enemy = opponentOf(state.currentPlayer);
  const enemyCells = getPlayerCells(state.board, enemy);
  if (enemyCells.length === 0) return 99;
  return Math.min(...enemyCells.map((h) => manhattan(ref, refOf(h))));
}

/** The enemy main castle — the bot's actual objective. */
function enemyCastleRef(state: GameState): CellRef | null {
  const castle = getMainCastle(state.board, opponentOf(state.currentPlayer));
  return castle ? refOf(castle) : null;
}

function distToCenter(ref: CellRef): number {
  return Math.abs(ref.row - 1.5) + Math.abs(ref.col - 1.5);
}

/** Prefer forward / central forts; penalise redundant forts hugging the castle. */
function scoreFortSite(
  state: GameState,
  cell: Cell,
  castle: Cell | undefined,
): number {
  const ref = refOf(cell);
  const distEnemy = minDistToEnemy(state, ref);
  // Strong forward bias: a fort is only useful out toward the enemy.
  let score = (8 - distEnemy) * 20;

  if (castle) {
    const dCastle = manhattan(ref, refOf(castle));
    // Hugging the castle is pointless; want it at least a cell out.
    if (dCastle <= 1) score -= 120;
    else score += Math.min(dCastle, 4) * 6;
  }

  score += (3 - distToCenter(ref)) * 4;
  score += Math.min(cell.soldiers - FORT_COST, 12);

  const forts = getPlayerCells(state.board, state.currentPlayer).filter(
    (c) => c.building === 'fort',
  );
  for (const fort of forts) {
    if (manhattan(ref, refOf(fort)) <= 1) score -= 20;
  }

  return score;
}

function pickFortSite(state: GameState): CellRef | null {
  const self = state.currentPlayer;
  const owned = getPlayerCells(state.board, self);
  if (owned.length < MIN_CELLS_BEFORE_FORT) return null;

  const castle = getMainCastle(state.board, self);
  const allCandidates = owned.filter(
    (cell) =>
      cell.building === null &&
      cell.soldiers >= BOT_FORT_MIN_SOLDIERS &&
      canBuildFort(state, refOf(cell)),
  );
  if (allCandidates.length === 0) return null;

  // Prefer sites at least one cell away from the castle; only fall back to
  // castle-adjacent ground if nothing further out is available.
  const forward = allCandidates.filter(
    (c) => !castle || manhattan(refOf(c), refOf(castle)) >= 2,
  );
  const candidates = forward.length > 0 ? forward : allCandidates;

  let best: Cell | null = null;
  let bestScore = -Infinity;
  for (const cell of candidates) {
    const score = scoreFortSite(state, cell, castle);
    if (score > bestScore) {
      bestScore = score;
      best = cell;
    }
  }

  if (!best || bestScore < 8) return null;
  return refOf(best);
}

function occupySquadSize(state: GameState, source: Cell, target: Cell): number {
  const center = { row: 1.5, col: 1.5 };
  const nearCenter =
    Math.abs(target.row - center.row) + Math.abs(target.col - center.col) <= 2;
  const enemy = opponentOf(state.currentPlayer);
  const enemyNearby = getNeighbors(state.board, refOf(target)).some(
    (n) => n.owner === enemy,
  );
  const available = source.soldiers - 1;
  // Claim cells with a real garrison, not a lone scout that's instantly retaken.
  const desired = nearCenter || enemyNearby ? 6 : 3;
  return Math.max(1, Math.min(desired, available));
}

function garrisonReserve(cell: Cell): number {
  return cell.building !== null ? 1 : 0;
}

/** Send enough to win, not the whole stack (unless the target is the main castle). */
function attackSquadSize(
  state: GameState,
  source: Cell,
  target: Cell,
): number | null {
  const needed = effectiveDefense(target) + 1;
  const maxSend = source.soldiers - garrisonReserve(source);
  if (maxSend < needed) return null;

  if (target.building === 'mainCastle') return maxSend;

  // Send enough surplus that the captured cell can hold, not the razor minimum
  // (forts are worth a little extra). Still keep a rear guard at the source.
  const margin = target.building === 'fort' ? 6 : 4;
  const efficient = needed + Math.min(margin, maxSend - needed);
  return Math.min(maxSend, efficient);
}

/** A small trade — the kind that drags a bot-vs-bot game into a stalemate. */
function isPettyAction(action: BotAction): boolean {
  return (
    (action.type === 'attack' || action.type === 'occupy') &&
    action.soldiers <= 3
  );
}

/**
 * `breakthrough` is set after several petty trades in a row: the bot then
 * refuses the small attack/occupy trades and instead masses its army at the
 * enemy castle until it can force a real result.
 */
function chooseBotAction(state: GameState, breakthrough: boolean): BotAction {
  const self = state.currentPlayer;
  const enemy = opponentOf(self);
  const ownCells = getPlayerCells(state.board, self);

  // Attacks: always allowed against buildings (forts/castle) and decisive
  // strikes; in breakthrough we drop the tiny ≤3-soldier trades on plain cells.
  let bestAttack: BotAction | null = null;
  let bestWeight = -1;
  for (const source of ownCells) {
    for (const target of getNeighbors(state.board, refOf(source))) {
      if (target.owner !== enemy) continue;
      const sent = attackSquadSize(state, source, target);
      if (sent === null) continue;
      if (!canAttack(state, refOf(source), refOf(target), sent)) continue;
      if (breakthrough && sent <= 3 && target.building === null) continue;
      const weight = attackWeight(target);
      if (weight > bestWeight) {
        bestWeight = weight;
        bestAttack = {
          type: 'attack',
          from: refOf(source),
          to: refOf(target),
          soldiers: sent,
        };
      }
    }
  }
  if (bestAttack) return bestAttack;

  // PUSH the army toward the enemy castle as a single mass — this comes before
  // grabbing empty side cells, so a big "tank" presses the enemy instead of
  // dribbling itself away. Onto own ground it moves; onto empty ground toward
  // the castle it rolls the whole stack (not a small squad).
  const castle = enemyCastleRef(state);
  if (castle) {
    let bestPush: BotAction | null = null;
    let bestPushScore = -1;
    for (const source of ownCells) {
      const reserve = garrisonReserve(source);
      let mass = source.soldiers - reserve;
      if (mass <= 0) continue;
      if (!breakthrough && mass > 6) mass = Math.ceil(mass * 0.7);
      const sDist = manhattan(refOf(source), castle);
      for (const n of getNeighbors(state.board, refOf(source))) {
        const nDist = manhattan(refOf(n), castle);
        if (nDist >= sDist) continue; // must close on the castle
        let cand: BotAction | null = null;
        if (n.owner === self) {
          cand = { type: 'move', from: refOf(source), to: refOf(n), soldiers: mass };
        } else if (n.owner === null) {
          const retakeable = getNeighbors(state.board, refOf(n)).some(
            (e) => e.owner === enemy && e.soldiers - garrisonReserve(e) > mass,
          );
          if (retakeable) continue;
          if (!canOccupy(state, refOf(source), refOf(n), mass)) continue;
          cand = { type: 'occupy', from: refOf(source), to: refOf(n), soldiers: mass };
        } else {
          continue; // enemy cell — already considered by the attack pass
        }
        const score = mass * 10 + (8 - nDist) * 3;
        if (score > bestPushScore) {
          bestPushScore = score;
          bestPush = cand;
        }
      }
    }
    if (bestPush) return bestPush;
  }

  const fortRef = pickFortSite(state);
  if (fortRef) return { type: 'buildFort', cell: fortRef };

  // Lowest priority: claim a little side territory for income with a spare
  // squad — never in breakthrough, never into a cell the enemy can retake.
  if (!breakthrough) {
    let bestOccupy: BotAction | null = null;
    let bestOccupyScore = -1;
    for (const source of ownCells) {
      if (source.soldiers < BOT_OCCUPY_MIN_SOURCE) continue;
      for (const target of getNeighbors(state.board, refOf(source))) {
        if (target.owner !== null) continue;
        const squad = occupySquadSize(state, source, target);
        if (!canOccupy(state, refOf(source), refOf(target), squad)) continue;
        const retakeable = getNeighbors(state.board, refOf(target)).some(
          (n) => n.owner === enemy && n.soldiers - garrisonReserve(n) > squad,
        );
        if (retakeable) continue;
        const dCastle = castle ? manhattan(refOf(target), castle) : 0;
        const score = 100 - dCastle * 8 + (3 - distToCenter(refOf(target))) * 3;
        if (score > bestOccupyScore) {
          bestOccupyScore = score;
          bestOccupy = {
            type: 'occupy',
            from: refOf(source),
            to: refOf(target),
            soldiers: squad,
          };
        }
      }
    }
    if (bestOccupy) return bestOccupy;
  }

  return { type: 'pass' };
}

/** Full AI turn for whoever is `state.currentPlayer`. */
export function executeBotTurn(state: GameState): GameState {
  let next = allocateBotIncome(state);
  const stall = state.aiStall ?? 0;
  const breakthrough = stall >= 3;
  const action = chooseBotAction(next, breakthrough);
  // After forcing a breakthrough, reset; otherwise count consecutive petty trades.
  next = {
    ...next,
    aiStall: breakthrough ? 0 : isPettyAction(action) ? stall + 1 : 0,
  };
  const who = state.currentPlayer === 'human' ? 'Human' : 'Bot';

  switch (action.type) {
    case 'attack':
      next = attackCell(next, action.from, action.to, action.soldiers);
      break;
    case 'occupy':
      next = occupyNeutralCell(next, action.from, action.to, action.soldiers);
      break;
    case 'buildFort':
      next = buildFort(next, action.cell);
      break;
    case 'move':
      next = moveSoldiers(next, action.from, action.to, action.soldiers);
      break;
    case 'pass':
      next = { ...next, log: [...next.log, `${who} passed.`] };
      break;
  }

  return endTurn(next);
}

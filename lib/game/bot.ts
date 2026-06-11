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

// A Cell is structurally a CellRef (it has row/col), so it can be passed
// straight to manhattan / getNeighbors / canAttack / canOccupy — refOf is only
// used when building a BotAction, to store a clean ref instead of the cell.

const BOT_FORT_MIN_SOLDIERS = 7;
const BOT_OCCUPY_MIN_SOURCE = 3;
const MIN_CELLS_BEFORE_FORT = 3;
// Random spread added to decision scores so two bots don't play mirror-perfect.
const JITTER = 7;

type BotStyle = { aggression: number };

/** Each side derives a stable but different personality from the game seed, so
 *  white and black don't make identical mirrored moves. */
function sideStyle(state: GameState): BotStyle {
  const seed = state.aiSeed ?? 0.5;
  const mix = state.currentPlayer === 'human' ? seed : seed * 1.618 + 0.37;
  return { aggression: mix - Math.floor(mix) }; // [0,1)
}

/** Reinforce the mobilization point closest to the enemy front. */
function allocateBotIncome(state: GameState): GameState {
  if (state.pendingIncome === 0) return { ...state, phase: 'action' };

  const enemyCells = getPlayerCells(state.board, opponentOf(state.currentPlayer));
  const points = getMobilizationCells(state.board, state.currentPlayer);
  if (points.length === 0) return { ...state, phase: 'action' };

  const distToFront = (cell: Cell) =>
    enemyCells.length === 0
      ? 0
      : Math.min(...enemyCells.map((h) => manhattan(cell, h)));

  const sorted = [...points].sort((a, b) => {
    const fortPriority =
      Number(b.building === 'fort') - Number(a.building === 'fort');
    if (fortPriority !== 0) return fortPriority;
    const dist = distToFront(a) - distToFront(b);
    if (dist !== 0) return dist;
    if (a.soldiers !== b.soldiers) return a.soldiers - b.soldiers;
    return Math.random() - 0.5;
  });

  return placeIncome(state, sorted[0], state.pendingIncome);
}

function attackWeight(target: Cell): number {
  if (target.building === 'mainCastle') return 1000;
  // Forts are worth taking (deny the enemy a stronghold + income), well above
  // a plain cell — so the bot won't ignore an empty/weak fort next to it.
  if (target.building === 'fort') return 50;
  return 10 + target.soldiers;
}

function minDistToEnemy(state: GameState, ref: CellRef): number {
  const enemyCells = getPlayerCells(state.board, opponentOf(state.currentPlayer));
  if (enemyCells.length === 0) return 99;
  return Math.min(...enemyCells.map((h) => manhattan(ref, h)));
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
  // Strong forward bias: a fort is only useful out toward the enemy.
  let score = (8 - minDistToEnemy(state, cell)) * 20;

  if (castle) {
    const dCastle = manhattan(cell, castle);
    // Hugging the castle is pointless; want it at least a cell out.
    if (dCastle <= 1) score -= 120;
    else score += Math.min(dCastle, 4) * 6;
  }

  score += (3 - distToCenter(cell)) * 4;
  score += Math.min(cell.soldiers - FORT_COST, 12);
  score += Math.random() * JITTER; // break ties between sites / mirror play

  for (const fort of getPlayerCells(state.board, state.currentPlayer)) {
    if (fort.building === 'fort' && manhattan(cell, fort) <= 1) score -= 20;
  }

  return score;
}

function pickFortSite(state: GameState): CellRef | null {
  const owned = getPlayerCells(state.board, state.currentPlayer);
  if (owned.length < MIN_CELLS_BEFORE_FORT) return null;

  const castle = getMainCastle(state.board, state.currentPlayer);
  const allCandidates = owned.filter(
    (cell) =>
      cell.building === null &&
      cell.soldiers >= BOT_FORT_MIN_SOLDIERS &&
      canBuildFort(state, cell),
  );
  if (allCandidates.length === 0) return null;

  // Prefer sites at least one cell out from the castle; fall back to
  // castle-adjacent ground only if nothing further out qualifies.
  const forward = allCandidates.filter(
    (c) => !castle || manhattan(c, castle) >= 2,
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

  return best && bestScore >= 8 ? refOf(best) : null;
}

function occupySquadSize(state: GameState, source: Cell, target: Cell): number {
  const nearCenter = distToCenter(target) <= 2;
  const enemy = opponentOf(state.currentPlayer);
  const enemyNearby = getNeighbors(state.board, target).some(
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
  // (forts are worth a little extra).
  const margin = target.building === 'fort' ? 6 : 4;
  return Math.min(maxSend, needed + Math.min(margin, maxSend - needed));
}

/** Identity of a move (path / cell), ignoring soldier count — for anti-repeat. */
function actionSig(a: BotAction): string {
  if (a.type === 'buildFort') return `fort:${a.cell.row},${a.cell.col}`;
  if (a.type === 'pass') return 'pass';
  return `${a.type}:${a.from.row},${a.from.col}>${a.to.row},${a.to.col}`;
}

/** A small trade — the kind that drags a bot-vs-bot game into a stalemate. */
function isPettyAction(action: BotAction): boolean {
  return (
    (action.type === 'attack' || action.type === 'occupy') &&
    action.soldiers <= 3
  );
}

/**
 * `breakthrough` (set after several petty trades in a row) makes the bot refuse
 * small trades and mass its army at the enemy castle. `forbid` is a move
 * signature to skip, used to stop it repeating the same move three times.
 */
function chooseBotAction(
  state: GameState,
  breakthrough: boolean,
  style: BotStyle,
  forbid: string | null,
): BotAction {
  const self = state.currentPlayer;
  const enemy = opponentOf(self);
  const ownCells = getPlayerCells(state.board, self);
  const blocked = (a: BotAction) => forbid != null && actionSig(a) === forbid;
  // A more aggressive side commits more of a big stack (smaller rear guard).
  const sendFrac = 0.8 + style.aggression * 0.2;
  const castle = enemyCastleRef(state);

  // Attacks. Decisive strikes (capturing a fort/castle, or a >3-soldier blow)
  // fire now; petty ≤3-soldier trades are held back until after we've tried to
  // maneuver the main army, so an idle stack isn't pre-empted by scout-trading.
  let bestDecisive: BotAction | null = null;
  let bestDecisiveW = -1;
  let bestPetty: BotAction | null = null;
  let bestPettyW = -1;
  for (const source of ownCells) {
    for (const target of getNeighbors(state.board, source)) {
      if (target.owner !== enemy) continue;
      const sent = attackSquadSize(state, source, target);
      if (sent === null || !canAttack(state, source, target, sent)) continue;
      const act: BotAction = {
        type: 'attack',
        from: refOf(source),
        to: refOf(target),
        soldiers: sent,
      };
      if (blocked(act)) continue;
      const weight = attackWeight(target) + Math.random();
      if (target.building !== null || sent > 3) {
        if (weight > bestDecisiveW) {
          bestDecisiveW = weight;
          bestDecisive = act;
        }
      } else if (weight > bestPettyW) {
        bestPettyW = weight;
        bestPetty = act;
      }
    }
  }
  if (bestDecisive) return bestDecisive;

  // Plant a forward fort once a good site has built up (strongpoint +
  // mobilization). Before the march so a big stack consolidates rather than
  // always rolling on — otherwise forts never get built.
  const fortRef = pickFortSite(state);
  if (fortRef && !blocked({ type: 'buildFort', cell: fortRef })) {
    return { type: 'buildFort', cell: fortRef };
  }

  // March the army on the enemy castle as one mass — a "tank" presses forward
  // (onto own ground it moves, onto empty ground it rolls the whole stack)
  // rather than dribbling itself onto side cells. Sidesteps to flank a blocker.
  if (castle) {
    let bestPush: BotAction | null = null;
    let bestPushScore = -1;
    for (const source of ownCells) {
      let mass = source.soldiers - garrisonReserve(source);
      if (mass <= 0) continue;
      if (!breakthrough && mass > 8) mass = Math.ceil(mass * sendFrac);
      const sDist = manhattan(source, castle);
      for (const n of getNeighbors(state.board, source)) {
        const nDist = manhattan(n, castle);
        const forward = nDist < sDist;
        // Move closer, or sidestep at the same distance to flank — never retreat.
        if (!forward && nDist !== sDist) continue;
        let cand: BotAction | null = null;
        if (n.owner === self) {
          cand = { type: 'move', from: refOf(source), to: refOf(n), soldiers: mass };
        } else if (n.owner === null) {
          if (!canOccupy(state, source, n, mass)) continue;
          cand = { type: 'occupy', from: refOf(source), to: refOf(n), soldiers: mass };
        } else {
          continue; // enemy cell — handled by the attack pass
        }
        if (blocked(cand)) continue;
        const score =
          (forward ? 1000 : 0) + mass * 10 + (8 - nDist) * 3 + Math.random() * JITTER;
        if (score > bestPushScore) {
          bestPushScore = score;
          bestPush = cand;
        }
      }
    }
    if (bestPush) return bestPush;
  }

  // Only now, if the army genuinely can't maneuver, take a small trade.
  if (!breakthrough && bestPetty) return bestPetty;

  // Lowest priority: claim a little side territory for income with a spare
  // squad — never in breakthrough, never from a big stack (keep it massed),
  // never into a cell the enemy can immediately retake.
  if (!breakthrough) {
    let bestOccupy: BotAction | null = null;
    let bestOccupyScore = -1;
    for (const source of ownCells) {
      if (source.soldiers < BOT_OCCUPY_MIN_SOURCE || source.soldiers > 8) continue;
      for (const target of getNeighbors(state.board, source)) {
        if (target.owner !== null) continue;
        const squad = occupySquadSize(state, source, target);
        if (!canOccupy(state, source, target, squad)) continue;
        const act: BotAction = {
          type: 'occupy',
          from: refOf(source),
          to: refOf(target),
          soldiers: squad,
        };
        if (blocked(act)) continue;
        const retakeable = getNeighbors(state.board, target).some(
          (n) => n.owner === enemy && n.soldiers - garrisonReserve(n) > squad,
        );
        if (retakeable) continue;
        const dCastle = castle ? manhattan(target, castle) : 0;
        const score =
          100 - dCastle * 8 + (3 - distToCenter(target)) * 3 + Math.random() * JITTER;
        if (score > bestOccupyScore) {
          bestOccupyScore = score;
          bestOccupy = act;
        }
      }
    }
    if (bestOccupy) return bestOccupy;
  }

  return { type: 'pass' };
}

/** Full AI turn for whoever is `state.currentPlayer`. */
export function executeBotTurn(state: GameState): GameState {
  // Seed the game's AI personality once, lazily.
  const seeded =
    state.aiSeed === undefined ? { ...state, aiSeed: Math.random() } : state;
  let next = allocateBotIncome(seeded);
  const self = seeded.currentPlayer;
  const stall = seeded.aiStall ?? 0;
  const breakthrough = stall >= 3;
  const style = sideStyle(seeded);

  // Anti-loop: if the natural choice would repeat the same move a third time in
  // a row, swap to the next-best alternative — but only if a real one exists
  // (don't pass just to avoid a repeat).
  const prev = seeded.aiRepeat?.[self];
  let action = chooseBotAction(next, breakthrough, style, null);
  if (prev && prev.n >= 2 && actionSig(action) === prev.sig) {
    const alt = chooseBotAction(next, breakthrough, style, prev.sig);
    if (alt.type !== 'pass') action = alt;
  }
  const sig = actionSig(action);
  const repeatN = prev && prev.sig === sig ? prev.n + 1 : 1;

  next = {
    ...next,
    aiStall: breakthrough ? 0 : isPettyAction(action) ? stall + 1 : 0,
    aiRepeat: { ...seeded.aiRepeat, [self]: { sig, n: repeatN } },
  };

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
    case 'pass': {
      const who = self === 'human' ? 'Human' : 'Bot';
      next = { ...next, log: [...next.log, `${who} passed.`] };
      break;
    }
  }

  return endTurn(next);
}

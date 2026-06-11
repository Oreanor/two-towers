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
  getMobilizationCells,
  getNeighbors,
  getPlayerCells,
  manhattan,
  opponentOf,
  refOf,
} from './selectors';
import type { BotAction, Cell, GameState } from './types';

const BOT_FORT_MIN_SOLDIERS = 8;
const BOT_OCCUPY_MIN_SOURCE = 3;

/** Reinforce the mobilization point closest to the enemy front. */
export function allocateBotIncome(state: GameState): GameState {
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
  if (target.building === 'fort') return 20;
  return 10 + target.soldiers;
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
  const desired = nearCenter || enemyNearby ? 5 : 2;
  return Math.max(1, Math.min(desired, available));
}

export function chooseBotAction(state: GameState): BotAction {
  const self = state.currentPlayer;
  const enemy = opponentOf(self);
  const ownCells = getPlayerCells(state.board, self);
  const enemyCells = getPlayerCells(state.board, enemy);

  let bestAttack: BotAction | null = null;
  let bestWeight = -1;
  for (const source of ownCells) {
    for (const target of getNeighbors(state.board, refOf(source))) {
      if (target.owner !== enemy) continue;
      const needed = effectiveDefense(target) + 1;
      const sent =
        source.building !== null ? source.soldiers - 1 : source.soldiers;
      if (sent < needed) continue;
      if (!canAttack(state, refOf(source), refOf(target), sent)) continue;
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

  let bestOccupy: BotAction | null = null;
  let bestOccupyScore = -1;
  for (const source of ownCells) {
    if (source.soldiers < BOT_OCCUPY_MIN_SOURCE) continue;
    for (const target of getNeighbors(state.board, refOf(source))) {
      if (target.owner !== null) continue;
      const squad = occupySquadSize(state, source, target);
      if (!canOccupy(state, refOf(source), refOf(target), squad)) continue;
      const dist =
        enemyCells.length === 0
          ? 0
          : Math.min(...enemyCells.map((h) => manhattan(refOf(target), refOf(h))));
      const score = 100 - dist;
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

  const fortCell = ownCells.find(
    (cell) =>
      cell.building === null &&
      cell.soldiers >= BOT_FORT_MIN_SOLDIERS &&
      canBuildFort(state, refOf(cell)),
  );
  if (fortCell) return { type: 'buildFort', cell: refOf(fortCell) };

  if (enemyCells.length > 0) {
    const army = [...ownCells].sort((a, b) => b.soldiers - a.soldiers)[0];
    if (army && army.soldiers > 1) {
      const currentDist = Math.min(
        ...enemyCells.map((h) => manhattan(refOf(army), refOf(h))),
      );
      const step = getNeighbors(state.board, refOf(army))
        .filter((n) => n.owner === self)
        .find(
          (n) =>
            Math.min(...enemyCells.map((h) => manhattan(refOf(n), refOf(h)))) <
            currentDist,
        );
      if (step) {
        const soldiers = Math.floor(army.soldiers / 2);
        if (soldiers > 0) {
          return {
            type: 'move',
            from: refOf(army),
            to: refOf(step),
            soldiers,
          };
        }
      }
    }
  }

  return { type: 'pass' };
}

/** Full AI turn for whoever is `state.currentPlayer`. */
export function executeBotTurn(state: GameState): GameState {
  let next = allocateBotIncome(state);
  const action = chooseBotAction(next);
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

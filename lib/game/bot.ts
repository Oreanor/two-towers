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
  refOf,
} from './selectors';
import type { BotAction, Cell, GameState } from './types';

const BOT_FORT_MIN_SOLDIERS = 8;
const BOT_OCCUPY_MIN_SOURCE = 3;

/**
 * Автораспределение дохода бота: ближайшая к фронту точка мобилизации
 * (форт, иначе замок); при равенстве — где меньше солдат.
 */
export function allocateBotIncome(state: GameState): GameState {
  if (state.pendingIncome === 0) return { ...state, phase: 'action' };

  const humanCells = getPlayerCells(state.board, 'human');
  const points = getMobilizationCells(state.board, 'bot');
  if (points.length === 0) return { ...state, phase: 'action' };

  const distToFront = (cell: Cell) =>
    humanCells.length === 0
      ? 0
      : Math.min(...humanCells.map((h) => manhattan(refOf(cell), refOf(h))));

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

/** Сколько солдат бот отправляет занимать пустую клетку (риска провала нет). */
function occupySquadSize(state: GameState, source: Cell, target: Cell): number {
  const center = { row: 1.5, col: 1.5 };
  const nearCenter =
    Math.abs(target.row - center.row) + Math.abs(target.col - center.col) <= 2;
  const enemyNearby = getNeighbors(state.board, refOf(target)).some(
    (n) => n.owner === 'human',
  );
  const available = source.soldiers - 1; // гарнизон остаётся
  const desired = nearCenter || enemyNearby ? 5 : 2;
  return Math.max(1, Math.min(desired, available));
}

export function chooseBotAction(state: GameState): BotAction {
  const botCells = getPlayerCells(state.board, 'bot');
  const humanCells = getPlayerCells(state.board, 'human');

  // 1-3. Лучшая доступная атака (захват замка имеет вес 1000 и всегда выберется первым).
  let bestAttack: BotAction | null = null;
  let bestWeight = -1;
  for (const source of botCells) {
    for (const target of getNeighbors(state.board, refOf(source))) {
      if (target.owner !== 'human') continue;
      const needed = effectiveDefense(target) + 1;
      // отправляем всё, кроме гарнизона на клетке со зданием
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

  // 4. Занятие пустой клетки.
  let bestOccupy: BotAction | null = null;
  let bestOccupyScore = -1;
  for (const source of botCells) {
    if (source.soldiers < BOT_OCCUPY_MIN_SOURCE) continue;
    for (const target of getNeighbors(state.board, refOf(source))) {
      if (target.owner !== null) continue;
      const squad = occupySquadSize(state, source, target);
      if (!canOccupy(state, refOf(source), refOf(target), squad)) continue;
      // предпочитаем клетки ближе к игроку
      const dist =
        humanCells.length === 0
          ? 0
          : Math.min(...humanCells.map((h) => manhattan(refOf(target), refOf(h))));
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

  // 5. Форт: клетка с 8+ солдатами без здания.
  const fortCell = botCells.find(
    (cell) =>
      cell.building === null &&
      cell.soldiers >= BOT_FORT_MIN_SOLDIERS &&
      canBuildFort(state, refOf(cell)),
  );
  if (fortCell) return { type: 'buildFort', cell: refOf(fortCell) };

  // 6. Движение к фронту: самая большая армия идёт к ближайшей клетке игрока.
  if (humanCells.length > 0) {
    const army = [...botCells].sort((a, b) => b.soldiers - a.soldiers)[0];
    if (army && army.soldiers > 1) {
      const currentDist = Math.min(
        ...humanCells.map((h) => manhattan(refOf(army), refOf(h))),
      );
      const step = getNeighbors(state.board, refOf(army))
        .filter((n) => n.owner === 'bot')
        .find(
          (n) =>
            Math.min(...humanCells.map((h) => manhattan(refOf(n), refOf(h)))) <
            currentDist,
        );
      if (step) {
        // половина армии, округляя вниз — на исходной всегда остаётся минимум 1
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

/**
 * Полный ход бота: распределить доход, выбрать и выполнить действие,
 * передать ход. Вызывается на состоянии после startTurn(state, 'bot').
 */
export function executeBotTurn(state: GameState): GameState {
  let next = allocateBotIncome(state);
  const action = chooseBotAction(next);

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
      next = { ...next, log: [...next.log, 'Bot passed.'] };
      break;
  }

  return endTurn(next);
}

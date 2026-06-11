import type { GameState } from './types';
import {
  controllerOf,
  humanControlledSide,
  isAiControlled,
  isBotVsBot,
} from './controllers';
import { opponentOf } from './selectors';

export function gameHintText(
  state: GameState,
  selected: boolean,
  t: (key: string, params?: Record<string, number>) => string,
): string {
  const userSide = humanControlledSide(state);

  if (state.phase === 'gameOver') {
    if (userSide && state.winner === userSide) return t('result.win');
    if (userSide && state.winner === opponentOf(userSide)) return t('result.loss');
    if (state.winner) return t('game.autoBattleOver');
    return t('result.loss');
  }

  if (isAiControlled(state, state.currentPlayer)) {
    return isBotVsBot(state) ? t('game.autoBattle') : t('game.botThinking');
  }

  if (state.phase === 'allocate') {
    return t('game.hintAllocate', { n: state.pendingIncome });
  }

  return selected ? t('game.hintTarget') : t('game.hintSelect');
}

export function isHumanTurn(state: GameState): boolean {
  return controllerOf(state, state.currentPlayer) === 'human';
}

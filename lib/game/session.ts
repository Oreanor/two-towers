import { resolveFactions } from './factions';
import { resolveControllers } from './controllers';
import { createInitialState } from './initialState';
import { startTurn } from './rules';
import type { GameState } from './types';

export function normalizeState(state: GameState): GameState {
  const { humanFaction, botFaction } = resolveFactions(state);
  const { humanController, botController } = resolveControllers(state);
  return {
    ...state,
    humanFaction,
    botFaction,
    humanController,
    botController,
  };
}

export function newGameFrom(prev: GameState): GameState {
  const { humanFaction, botFaction } = resolveFactions(prev);
  const { humanController, botController } = resolveControllers(prev);
  return startTurn(
    createInitialState(
      humanFaction,
      botFaction,
      humanController,
      botController,
    ),
    'human',
  );
}

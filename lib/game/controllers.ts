import type { ControllerKind, GameState, PlayerId } from './types';

export function controllerOf(
  state: GameState,
  player: PlayerId,
): ControllerKind {
  return player === 'human' ? state.humanController : state.botController;
}

export function isAiControlled(state: GameState, player: PlayerId): boolean {
  return controllerOf(state, player) === 'ai';
}

/** Board side controlled by the logged-in user, if any. */
export function humanControlledSide(state: GameState): PlayerId | null {
  if (state.humanController === 'human') return 'human';
  if (state.botController === 'human') return 'bot';
  return null;
}

export function isBotVsBot(state: GameState): boolean {
  return state.humanController === 'ai' && state.botController === 'ai';
}

export function resolveControllers(state: {
  humanController?: ControllerKind;
  botController?: ControllerKind;
}): { humanController: ControllerKind; botController: ControllerKind } {
  return {
    humanController: state.humanController ?? 'human',
    botController: state.botController ?? 'ai',
  };
}

export function sideDisplayName(
  state: GameState,
  player: PlayerId,
  youName: string,
  t: (key: string) => string,
): string {
  if (controllerOf(state, player) === 'human') return youName;
  return t('common.bot');
}

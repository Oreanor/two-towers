'use client';

import { useI18n } from '@/lib/i18n';
import {
  humanControlledSide,
  isBotVsBot,
} from '@/lib/game/controllers';
import type { GameState, PlayerId } from '@/lib/game/types';
import { useAnimatedClose } from './useAnimatedClose';

/** End-of-game verdict. Dismissible so the final board can be inspected. */
export default function ResultModal({
  state,
  winner,
  onAgain,
  onClose,
}: {
  state: GameState;
  winner: PlayerId;
  onAgain: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { closing, close } = useAnimatedClose(onClose);
  const userSide = humanControlledSide(state);
  const spectator = isBotVsBot(state);
  const won = userSide !== null && winner === userSide;
  const winnerFaction =
    winner === 'human' ? state.humanFaction : state.botFaction;

  const title = spectator
    ? t('result.spectatorWin', { faction: t(`factions.${winnerFaction}`) })
    : won
      ? t('result.win')
      : t('result.loss');
  const subtitle = spectator
    ? t('result.spectatorSub')
    : won
      ? t('result.winSub')
      : t('result.lossSub');

  return (
    <div
      className={`modal-backdrop ${closing ? 'modal-backdrop--out' : ''}`}
      onClick={close}
    >
      <div
        className={`modal result-modal ${closing ? 'modal--out' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="result-modal__title">{title}</div>
        <p className="muted">{subtitle}</p>
        <button className="btn btn--primary" onClick={onAgain}>
          {t('result.again')}
        </button>
        <button className="btn btn--ghost" onClick={close}>
          {t('result.viewBoard')}
        </button>
      </div>
    </div>
  );
}

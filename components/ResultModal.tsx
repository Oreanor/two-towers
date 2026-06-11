'use client';

import { useI18n } from '@/lib/i18n';
import {
  humanControlledSide,
  isBotVsBot,
} from '@/lib/game/controllers';
import type { GameState, PlayerId } from '@/lib/game/types';
import { useAnimatedClose } from '@/components/ui/useAnimatedClose';
import ModalShell from '@/components/ui/ModalShell';
import Button from '@/components/ui/Button';

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
    <ModalShell closing={closing} onClose={close} className="text-center">
      <div className="text-2xl font-extrabold">{title}</div>
      <p className="text-muted">{subtitle}</p>
      <Button variant="primary" block onClick={onAgain}>
        {t('result.again')}
      </Button>
      <Button variant="ghost" block onClick={close}>
        {t('result.viewBoard')}
      </Button>
    </ModalShell>
  );
}

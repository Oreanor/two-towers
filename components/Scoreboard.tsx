'use client';

import { useI18n } from '@/lib/i18n';
import { totalSoldiers } from '@/lib/game/selectors';
import type { GameState } from '@/lib/game/types';

/** Player names over their soldier totals, maeth-scoreboard style. */
export default function Scoreboard({
  state,
  youName,
}: {
  state: GameState;
  youName: string;
}) {
  const { t } = useI18n();
  return (
    <div className="score">
      <div className="score__names">
        <span className="score__name score__name--white">{youName}</span>
        <span className="score__vs">vs</span>
        <span className="score__name score__name--black">{t('common.bot')}</span>
      </div>
      <div className="score__nums">
        <strong>{totalSoldiers(state, 'human')}</strong>
        <span className="score__colon">:</span>
        <strong>{totalSoldiers(state, 'bot')}</strong>
      </div>
    </div>
  );
}

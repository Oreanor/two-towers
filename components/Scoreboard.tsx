'use client';

import { useI18n } from '@/lib/i18n';
import { sideDisplayName } from '@/lib/game/controllers';
import { factionAsset } from '@/lib/game/factions';
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
  const leftName = sideDisplayName(state, 'human', youName, t);
  const rightName = sideDisplayName(state, 'bot', youName, t);

  return (
    <div className="score">
      <div className="score__names">
        <span className="score__name score__name--white">{leftName}</span>
        <span className="score__vs">vs</span>
        <span className="score__name score__name--black">{rightName}</span>
      </div>
      <div className="score__nums">
        <span className="score__side score__side--human">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="score__shield"
            src={factionAsset(state.humanFaction, 'shield')}
            alt=""
            draggable={false}
          />
          <strong>{totalSoldiers(state, 'human')}</strong>
        </span>
        <span className="score__colon">:</span>
        <span className="score__side score__side--bot">
          <strong>{totalSoldiers(state, 'bot')}</strong>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="score__shield"
            src={factionAsset(state.botFaction, 'shield')}
            alt=""
            draggable={false}
          />
        </span>
      </div>
    </div>
  );
}

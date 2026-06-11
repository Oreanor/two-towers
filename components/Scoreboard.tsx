'use client';

import { useI18n } from '@/lib/i18n';
import { sideDisplayName } from '@/lib/game/controllers';
import { totalSoldiers } from '@/lib/game/selectors';
import type { GameState } from '@/lib/game/types';
import FactionShield from '@/components/ui/FactionShield';

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
    <div className="flex w-[var(--game-column-w)] flex-col items-center gap-0.5">
      <div className="flex w-full items-center">
        <span className="min-w-0 flex-1 pr-1.5 text-right text-[15px] leading-snug font-bold text-human break-words [overflow-wrap:anywhere]">
          {leftName}
        </span>
        <span className="shrink-0 px-1 text-[11px] leading-none font-semibold text-muted lowercase">
          vs
        </span>
        <span className="min-w-0 flex-1 pl-1.5 text-left text-[15px] leading-snug font-bold text-bot break-words [overflow-wrap:anywhere]">
          {rightName}
        </span>
      </div>
      <div className="flex w-full items-center">
        <span className="flex flex-1 items-center justify-end gap-2">
          <FactionShield faction={state.humanFaction} size="md" />
          <strong className="shrink-0 text-right text-[26px] tabular-nums">
            {totalSoldiers(state, 'human')}
          </strong>
        </span>
        <span className="shrink-0 px-2 text-[22px] text-muted">:</span>
        <span className="flex flex-1 items-center justify-start gap-2">
          <strong className="shrink-0 text-left text-[26px] tabular-nums">
            {totalSoldiers(state, 'bot')}
          </strong>
          <FactionShield faction={state.botFaction} size="md" />
        </span>
      </div>
    </div>
  );
}

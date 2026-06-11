'use client';

import { Fragment } from 'react';
import { useI18n } from '@/lib/i18n';
import {
  BOARD_SIZE,
  FORT_COST,
  FORT_DEFENSE_MULTIPLIER,
  FORT_INCOME,
  MAIN_CASTLE_DEFENSE_MULTIPLIER,
  MAIN_CASTLE_INCOME,
  MAX_FORTS_PER_PLAYER,
  NORMAL_CELL_INCOME,
  STARTING_SOLDIERS,
} from '@/lib/game/constants';
import { useAnimatedClose } from '@/components/ui/useAnimatedClose';
import ModalShell from '@/components/ui/ModalShell';

function formatRulesLine(line: string) {
  const parts = line.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

export default function RulesModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const { closing, close } = useAnimatedClose(onClose);
  const paragraphs = t('rules.body', {
    size: BOARD_SIZE,
    start: STARTING_SOLDIERS,
    castleIncome: MAIN_CASTLE_INCOME,
    fortIncome: FORT_INCOME,
    cellIncome: NORMAL_CELL_INCOME,
    fortCost: FORT_COST,
    maxForts: MAX_FORTS_PER_PLAYER,
    fortDef: FORT_DEFENSE_MULTIPLIER,
    castleDef: MAIN_CASTLE_DEFENSE_MULTIPLIER,
  })
    .split('\n')
    .filter((line) => line.trim() !== '');

  return (
    <ModalShell
      closing={closing}
      onClose={close}
      wide
      ariaLabel={t('rules.title')}
      className="items-stretch text-left"
    >
      <h3 className="m-0">{t('rules.title')}</h3>
      <div className="max-h-[min(60vh,460px)] overflow-y-auto text-sm leading-normal">
        {paragraphs.map((line, i) => (
          <p key={i} className="mb-2.5 text-muted last:mb-0 [&_strong]:font-bold [&_strong]:text-fg">
            {formatRulesLine(line)}
          </p>
        ))}
      </div>
    </ModalShell>
  );
}

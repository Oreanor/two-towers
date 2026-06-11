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
import { useAnimatedClose } from './useAnimatedClose';

/** Turn `**emphasis**` markers in rules copy into <strong>. */
function formatRulesLine(line: string) {
  const parts = line.split(/(\*\*.+?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

/** Modal showing the game rules, opened from the "?" button in the header. The
 *  body is one i18n string with paragraphs separated by newlines; the numbers
 *  come straight from the game constants. */
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
    <div
      className={`modal-backdrop ${closing ? 'modal-backdrop--out' : ''}`}
      onClick={close}
    >
      <div
        className={`modal rules-modal ${closing ? 'modal--out' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={t('rules.title')}
      >
        <h3>{t('rules.title')}</h3>
        <div className="rules-modal__body">
          {paragraphs.map((line, i) => (
            <p key={i} className="muted">
              {formatRulesLine(line)}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

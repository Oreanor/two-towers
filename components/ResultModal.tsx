'use client';

import { useI18n } from '@/lib/i18n';
import type { PlayerId } from '@/lib/game/types';
import { useAnimatedClose } from './useAnimatedClose';

/** End-of-game verdict. Dismissible so the final board can be inspected. */
export default function ResultModal({
  winner,
  onAgain,
  onClose,
}: {
  winner: PlayerId;
  onAgain: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { closing, close } = useAnimatedClose(onClose);
  const won = winner === 'human';

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
        <div className="result-modal__title">
          {won ? t('result.win') : t('result.loss')}
        </div>
        <p className="muted">{won ? t('result.winSub') : t('result.lossSub')}</p>
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

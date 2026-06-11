'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAnimatedClose } from './useAnimatedClose';

/** Slider dialog used for every soldier-count choice: how many reinforcements
 *  to drop on a castle, or how many soldiers march to the target cell. */
export default function AmountModal({
  title,
  hint,
  min,
  max,
  initial,
  goLabel,
  stayLabel,
  stayBase,
  confirmLabel,
  onConfirm,
  onClose,
}: {
  title: string;
  hint?: string;
  min: number;
  max: number;
  initial: number;
  /** Right edge of the slider — the chosen amount (e.g. "Пойдёт"). */
  goLabel: string;
  /** Left edge of the slider — what's left behind (e.g. "Останется"). */
  stayLabel: string;
  /** The pool the amount is taken from; "stay" shows stayBase − value. */
  stayBase: number;
  confirmLabel: string;
  onConfirm: (n: number) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { closing, close } = useAnimatedClose(onClose);
  const [value, setValue] = useState(() =>
    Math.min(Math.max(initial, min), max),
  );

  return (
    <div
      className={`modal-backdrop ${closing ? 'modal-backdrop--out' : ''}`}
      onClick={close}
    >
      <div
        className={`modal amount-modal ${closing ? 'modal--out' : ''}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <h3 className="amount-modal__title">{title}</h3>
        {hint && <p className="muted tiny amount-modal__hint">{hint}</p>}

        <div className="amount-modal__ends">
          <div className="amount-modal__end">
            <span className="muted tiny">{stayLabel}</span>
            <strong>{stayBase - value}</strong>
          </div>
          <div className="amount-modal__end amount-modal__end--right">
            <span className="muted tiny">{goLabel}</span>
            <strong>{value}</strong>
          </div>
        </div>

        <input
          className="amount-modal__slider"
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          disabled={min === max}
          aria-label={goLabel}
        />

        <div className="create-actions">
          <button className="btn btn--ghost" onClick={close}>
            {t('lobby.cancel')}
          </button>
          <button className="btn btn--primary" onClick={() => onConfirm(value)}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

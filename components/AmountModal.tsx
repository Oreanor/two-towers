'use client';

import { useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { useAnimatedClose } from '@/components/ui/useAnimatedClose';
import ModalShell from '@/components/ui/ModalShell';
import ModalActions from '@/components/ui/ModalActions';

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
  goLabel: string;
  stayLabel: string;
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
    <ModalShell closing={closing} onClose={close} ariaLabel={title} className="items-stretch text-center">
      <h3 className="m-0">{title}</h3>
      {hint && <p className="m-0 text-xs text-muted">{hint}</p>}

      <div className="-mb-1.5 flex justify-between gap-3">
        <div className="flex flex-col items-start gap-0.5 text-left">
          <span className="text-xs text-muted">{stayLabel}</span>
          <strong className="text-lg tabular-nums">{stayBase - value}</strong>
        </div>
        <div className="flex flex-col items-end gap-0.5 text-right">
          <span className="text-xs text-muted">{goLabel}</span>
          <strong className="text-lg tabular-nums">{value}</strong>
        </div>
      </div>

      <input
        className="w-full cursor-pointer accent-accent disabled:cursor-default disabled:opacity-60"
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        disabled={min === max}
        aria-label={goLabel}
      />

      <ModalActions
        cancelLabel={t('lobby.cancel')}
        confirmLabel={confirmLabel}
        onCancel={close}
        onConfirm={() => onConfirm(value)}
      />
    </ModalShell>
  );
}

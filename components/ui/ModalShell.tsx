'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  closing: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  wide?: boolean;
  ariaLabel?: string;
};

/** Shared modal backdrop + panel shell with enter/exit animation. */
export default function ModalShell({
  closing,
  onClose,
  children,
  className,
  wide,
  ariaLabel,
}: Props) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-10 flex items-center justify-center bg-black/55 p-5 backdrop-blur-[2px]',
        closing ? 'animate-backdrop-out' : 'animate-backdrop-in',
      )}
      onClick={onClose}
    >
      <div
        className={cn(
          'flex flex-col items-center gap-4 rounded-[18px] bg-card p-[22px_20px] shadow-[0_20px_50px_rgba(0,0,0,0.5)]',
          wide ? 'w-[min(92vw,480px)]' : 'w-[min(90vw,340px)]',
          closing ? 'pointer-events-none animate-modal-out' : 'animate-modal-in',
          className,
        )}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
      >
        {children}
      </div>
    </div>
  );
}

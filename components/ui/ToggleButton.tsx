import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
};

export default function ToggleButton({
  selected = false,
  className,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(
        'flex-1 cursor-pointer rounded-[10px] border-2 bg-btn px-1.5 py-2 text-[13px] font-bold text-muted transition',
        selected
          ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_15%,transparent)] text-fg'
          : 'border-[var(--btn-border)]',
        className,
      )}
      {...props}
    />
  );
}

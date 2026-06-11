import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'default' | 'primary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const BASE =
  'inline-flex cursor-pointer items-center justify-center gap-2 border font-semibold transition active:scale-[0.98] disabled:cursor-default disabled:opacity-55';

const SIZES: Record<Size, string> = {
  md: 'rounded-xl px-4 py-[13px] text-base',
  sm: 'rounded-[9px] px-3 py-2 text-sm',
};

const VARIANTS: Record<Variant, string> = {
  default: 'border-btn-border bg-btn text-fg hover:brightness-110',
  primary: 'border-transparent bg-accent text-accent-fg hover:brightness-110',
  ghost: 'border-btn-border bg-transparent text-fg hover:brightness-110',
  danger: 'border-transparent bg-danger text-white hover:brightness-110',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  block?: boolean;
};

/** The single button style for the whole app. */
export default function Button({
  variant = 'default',
  size = 'md',
  block = false,
  className,
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={cn(BASE, SIZES[size], VARIANTS[variant], block && 'w-full', className)}
      {...props}
    />
  );
}

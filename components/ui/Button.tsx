import type { ButtonHTMLAttributes } from 'react';

type Variant = 'default' | 'primary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const BASE =
  'inline-flex items-center justify-center gap-2 cursor-pointer font-semibold border transition active:scale-[0.98] disabled:opacity-55 disabled:cursor-default';

const SIZES: Record<Size, string> = {
  md: 'px-4 py-[13px] text-base rounded-xl',
  sm: 'px-3 py-2 text-sm rounded-[9px]',
};

const VARIANTS: Record<Variant, string> = {
  default: 'bg-btn text-fg border-btn-border hover:brightness-110',
  primary: 'bg-accent text-accent-fg border-transparent hover:brightness-110',
  ghost: 'bg-transparent text-fg border-btn-border hover:brightness-110',
  danger: 'bg-danger text-white border-transparent hover:brightness-110',
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

/** The single button style for the whole app. */
export default function Button({
  variant = 'default',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: Props) {
  return (
    <button
      type={type}
      className={`${BASE} ${SIZES[size]} ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

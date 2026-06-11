import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

const BASE =
  'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[9px] border border-btn-border bg-btn text-fg text-[15px] leading-none hover:brightness-[1.15] disabled:cursor-default disabled:opacity-50';

type Props = ButtonHTMLAttributes<HTMLButtonElement>;

export default function IconButton({ className = '', type = 'button', ...props }: Props) {
  return <button type={type} className={cn(BASE, className)} {...props} />;
}

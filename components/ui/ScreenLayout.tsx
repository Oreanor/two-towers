import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export const SCREEN_BASE =
  'flex min-h-dvh w-full flex-col gap-4 px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]';

type Props = {
  children: ReactNode;
  /** Default 520px lobby width; game uses `wide`. */
  wide?: boolean;
  centered?: boolean;
  className?: string;
};

export default function ScreenLayout({
  children,
  wide = false,
  centered = false,
  className,
}: Props) {
  return (
    <div
      className={cn(
        SCREEN_BASE,
        wide
          ? 'max-w-[min(96vw,1100px)] items-center gap-3'
          : 'max-w-[520px]',
        centered && 'items-center justify-center text-center',
        className,
      )}
    >
      {children}
    </div>
  );
}

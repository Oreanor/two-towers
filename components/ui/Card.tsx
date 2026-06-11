import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Props = {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section';
};

export default function Card({ children, className, as: Tag = 'div' }: Props) {
  return (
    <Tag className={cn('flex flex-col gap-2.5 rounded-2xl bg-card p-4', className)}>
      {children}
    </Tag>
  );
}

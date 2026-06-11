import type { ReactNode } from 'react';
import Button from './Button';

type Props = {
  cancelLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmVariant?: 'primary' | 'danger';
  children?: ReactNode;
};

export default function ModalActions({
  cancelLabel,
  confirmLabel,
  onCancel,
  onConfirm,
  confirmVariant = 'primary',
  children,
}: Props) {
  return (
    <>
      {children}
      <div className="flex w-full gap-2.5">
        <Button variant="ghost" className="flex-1" onClick={onCancel}>
          {cancelLabel}
        </Button>
        <Button variant={confirmVariant} className="flex-1" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </>
  );
}

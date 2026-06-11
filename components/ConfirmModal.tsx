'use client';

import { useAnimatedClose } from '@/components/ui/useAnimatedClose';
import ModalShell from '@/components/ui/ModalShell';
import ModalActions from '@/components/ui/ModalActions';

export default function ConfirmModal({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onClose,
}: {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const { closing, close } = useAnimatedClose(onClose);
  return (
    <ModalShell closing={closing} onClose={close} className="items-stretch text-center">
      <p className="my-1 text-[15px]">{message}</p>
      <ModalActions
        cancelLabel={cancelLabel}
        confirmLabel={confirmLabel}
        onCancel={close}
        onConfirm={onConfirm}
        confirmVariant="danger"
      />
    </ModalShell>
  );
}

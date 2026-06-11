'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useModalDismiss } from './useModalDismiss';

/** Matches `animate-modal-out` duration in globals.css. */
const EXIT_MS = 180;

export function useAnimatedClose(onClose: () => void): {
  closing: boolean;
  close: () => void;
} {
  const [closing, setClosing] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const close = useCallback(() => {
    setClosing((alreadyClosing) => {
      if (alreadyClosing) return true;
      timer.current = setTimeout(() => onCloseRef.current(), EXIT_MS);
      return true;
    });
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);
  useModalDismiss(close);

  return { closing, close };
}

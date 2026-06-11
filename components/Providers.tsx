'use client';

import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { I18nProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import { BoardViewProvider } from '@/lib/view';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <BoardViewProvider>
        <I18nProvider>
          <AuthProvider>{children}</AuthProvider>
        </I18nProvider>
      </BoardViewProvider>
    </ThemeProvider>
  );
}

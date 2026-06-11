'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useI18n } from '@/lib/i18n';

/** Client-side guard: anonymous visitors are bounced to /login. */
export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="screen screen--center">
        <p className="muted">{t('common.loading')}</p>
      </div>
    );
  }

  return <>{children}</>;
}

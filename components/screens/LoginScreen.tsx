'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useI18n } from '@/lib/i18n';
import { BOARD_SIZE } from '@/lib/game/constants';
import Button from '@/components/ui/Button';
import ScreenLayout from '@/components/ui/ScreenLayout';

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <ScreenLayout centered>
        <p className="text-muted">{t('common.loading')}</p>
      </ScreenLayout>
    );
  }

  return (
    <ScreenLayout centered>
      <div className="relative w-[min(460px,92vw)]" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="block h-auto w-full rounded-xl shadow-[0_8px_28px_rgba(0,0,0,0.35)]"
          src="/assets/pic.png"
          alt=""
          draggable={false}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="pointer-events-none absolute left-1/2 top-[75%] h-auto w-[72%] -translate-x-1/2 -translate-y-1/2 select-none invert opacity-[0.82]"
          src="/assets/logo.png"
          alt=""
          draggable={false}
        />
      </div>

      <div className="flex w-full max-w-[320px] flex-col gap-2.5 self-center">
        <Button variant="primary" onClick={login}>
          {t('login.guest')}
        </Button>
      </div>

      <div className="flex max-w-[min(82vw,360px)] flex-col items-center gap-1.5">
        <p className="m-0 text-xs text-muted">
          {t('login.subtitle', { size: BOARD_SIZE })}
        </p>
        <a
          className="text-xs leading-snug text-muted underline underline-offset-2 hover:text-fg"
          href="mailto:oreanor@gmail.com"
        >
          © 2026 Oreanor Aurgilion
        </a>
      </div>
    </ScreenLayout>
  );
}

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { useI18n } from '@/lib/i18n';
import { BOARD_SIZE } from '@/lib/game/constants';

export default function LoginScreen() {
  const { user, loading, login } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace('/');
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="screen screen--center">
        <p className="muted">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="screen screen--center">
      <div className="login-splash" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="login-splash__pic"
          src="/assets/pic.png"
          alt=""
          draggable={false}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="login-splash__logo"
          src="/assets/logo.png"
          alt=""
          draggable={false}
        />
      </div>

      <div className="stack">
        <button className="btn btn--primary" onClick={login}>
          {t('login.guest')}
        </button>
      </div>

      <div className="login__meta">
        <p className="login__note muted tiny">
          {t('login.subtitle', { size: BOARD_SIZE })}
        </p>
        <a className="screen-copyright" href="mailto:oreanor@gmail.com">
          © 2026 Oreanor Aurgilion
        </a>
      </div>
    </div>
  );
}

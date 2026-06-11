'use client';

import { useRouter } from 'next/navigation';
import { BarChart3, HelpCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import UserMenu from './UserMenu';

/** The single, invariant app header used on every screen: logo (click → lobby),
 *  stats, help and the settings menu. */
export default function AppHeader({
  name,
  onLogout,
  onHelp,
  className,
}: {
  name?: string;
  onLogout: () => void;
  onHelp: () => void;
  className?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  return (
    <header className={`topbar${className ? ` ${className}` : ''}`}>
      <button
        className="topbar__logo-btn"
        onClick={() => router.push('/')}
        aria-label="Two Towers"
        title="Two Towers"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className="topbar__logo"
          src="/assets/castle2.png"
          alt=""
          draggable={false}
        />
        Two Towers
      </button>
      <div className="topbar__right">
        <button
          className="icon-btn"
          onClick={() => router.push('/stats')}
          aria-label={t('stats.title')}
          title={t('stats.title')}
        >
          <BarChart3 size={18} />
        </button>
        <button
          className="icon-btn"
          onClick={onHelp}
          aria-label={t('lobby.help')}
          title={t('lobby.help')}
        >
          <HelpCircle size={18} />
        </button>
        <UserMenu name={name} onLogout={onLogout} />
      </div>
    </header>
  );
}

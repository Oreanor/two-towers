'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useI18n } from '@/lib/i18n';
import AppHeader from '@/components/AppHeader';
import Card from '@/components/ui/Card';
import ScreenLayout from '@/components/ui/ScreenLayout';
import { getStats, type PlayerStats } from '@/lib/storage/games';

export default function StatsScreen() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<PlayerStats | null>(null);

  useEffect(() => {
    setStats(getStats());
  }, []);

  const empty =
    stats !== null && stats.wins + stats.losses + stats.draws === 0;

  return (
    <ScreenLayout>
      <AppHeader name={user?.name} onLogout={logout} />

      <h2 className="m-0 text-[22px]">{t('stats.title')}</h2>

      {stats === null ? (
        <p className="text-muted">{t('common.loading')}</p>
      ) : empty ? (
        <p className="text-xs text-muted">{t('stats.empty')}</p>
      ) : (
        <Card>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="px-1.5 py-1 text-left text-xs font-semibold text-muted">
                  {t('stats.player')}
                </th>
                <th
                  className="px-1.5 py-1 text-center text-xs font-semibold text-muted"
                  title={t('stats.wins')}
                >
                  {t('stats.wins')}
                </th>
                <th
                  className="px-1.5 py-1 text-center text-xs font-semibold text-muted"
                  title={t('stats.losses')}
                >
                  {t('stats.losses')}
                </th>
                <th
                  className="px-1.5 py-1 text-center text-xs font-semibold text-muted"
                  title={t('stats.draws')}
                >
                  {t('stats.draws')}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border-t border-divider px-1.5 py-2 text-left font-semibold break-words [overflow-wrap:anywhere]">
                  {user?.name ?? t('common.you')}
                </td>
                <td className="border-t border-divider px-1.5 py-2 text-center">
                  {stats.wins}
                </td>
                <td className="border-t border-divider px-1.5 py-2 text-center">
                  {stats.losses}
                </td>
                <td className="border-t border-divider px-1.5 py-2 text-center">
                  {stats.draws}
                </td>
              </tr>
            </tbody>
          </table>
        </Card>
      )}
    </ScreenLayout>
  );
}

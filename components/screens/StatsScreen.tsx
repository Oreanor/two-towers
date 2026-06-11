'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useI18n } from '@/lib/i18n';
import AppHeader from '@/components/AppHeader';
import RulesModal from '@/components/RulesModal';
import { getStats, type PlayerStats } from '@/lib/storage/games';

export default function StatsScreen() {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    setStats(getStats());
  }, []);

  const empty =
    stats !== null && stats.wins + stats.losses + stats.draws === 0;

  return (
    <div className="screen">
      <AppHeader
        name={user?.name}
        onLogout={logout}
        onHelp={() => setRulesOpen(true)}
      />

      <h2 className="screen__title">{t('stats.title')}</h2>

      {stats === null ? (
        <p className="muted">{t('common.loading')}</p>
      ) : empty ? (
        <p className="muted tiny">{t('stats.empty')}</p>
      ) : (
        <div className="card">
          <table className="stats-table">
            <thead>
              <tr>
                <th>{t('stats.player')}</th>
                <th title={t('stats.wins')}>{t('stats.wins')}</th>
                <th title={t('stats.losses')}>{t('stats.losses')}</th>
                <th title={t('stats.draws')}>{t('stats.draws')}</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="stats-table__name">
                  {user?.name ?? t('common.you')}
                </td>
                <td>{stats.wins}</td>
                <td>{stats.losses}</td>
                <td>{stats.draws}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  );
}

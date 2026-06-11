'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useI18n } from '@/lib/i18n';
import AppHeader from '@/components/AppHeader';
import RulesModal from '@/components/RulesModal';
import ConfirmModal from '@/components/ConfirmModal';
import { createInitialState } from '@/lib/game/initialState';
import { startTurn } from '@/lib/game/rules';
import {
  createGame,
  deleteGame,
  listGames,
  type SavedGame,
} from '@/lib/storage/games';

export default function LobbyScreen() {
  const { user, logout } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<SavedGame | null>(null);

  // localStorage is unavailable during the server prerender, so load on mount.
  useEffect(() => {
    setGames(listGames());
  }, []);

  // Day + time so two games are still distinguishable.
  const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString(lang, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleCreate = () => {
    const game = createGame(startTurn(createInitialState(), 'human'));
    router.push(`/play/${game.id}`);
  };

  const removeGame = (game: SavedGame) => {
    deleteGame(game.id);
    setGames(listGames());
    setConfirmTarget(null);
  };

  const gameStatusLabel = (game: SavedGame): string =>
    game.state.phase === 'gameOver' ? t('status.over') : t('status.active');

  return (
    <div className="screen">
      <AppHeader
        name={user?.name}
        onLogout={logout}
        onHelp={() => setRulesOpen(true)}
      />

      <button
        className="btn btn--primary btn--block btn--icon-text"
        onClick={handleCreate}
      >
        <Plus size={18} />
        {t('lobby.create')}
      </button>

      <section className="card">
        <div className="section-head">
          <h3>{t('lobby.yourGames')}</h3>
        </div>
        {games.length === 0 ? (
          <p className="muted tiny" style={{ margin: 0 }}>
            {t('lobby.noGames')}
          </p>
        ) : (
          <ul className="list">
            {games.map((game) => (
              <li key={game.id} className="list__item">
                <button
                  className="list__item-enter"
                  onClick={() => router.push(`/play/${game.id}`)}
                  aria-label={t('lobby.continueGame')}
                  title={t('lobby.continueGame')}
                >
                  <span className="list__item-play">
                    <Play size={16} />
                  </span>
                  <span className="list__item-info">
                    <span className="who__name">{t('lobby.vsBot')}</span>
                    <span className="muted tiny">
                      {gameStatusLabel(game)} · {formatWhen(game.createdAt)}
                    </span>
                  </span>
                </button>
                <button
                  className="icon-btn"
                  onClick={() => setConfirmTarget(game)}
                  aria-label={t('lobby.delete')}
                  title={t('lobby.delete')}
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {confirmTarget && (
        <ConfirmModal
          message={t('lobby.confirmDelete')}
          confirmLabel={t('lobby.delete')}
          cancelLabel={t('lobby.cancel')}
          onConfirm={() => removeGame(confirmTarget)}
          onClose={() => setConfirmTarget(null)}
        />
      )}

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  );
}

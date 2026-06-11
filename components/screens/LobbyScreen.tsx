'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Play, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useI18n } from '@/lib/i18n';
import AppHeader from '@/components/AppHeader';
import SideSelectModal, { type GameSetup } from '@/components/SideSelectModal';
import ConfirmModal from '@/components/ConfirmModal';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import FactionShield from '@/components/ui/FactionShield';
import IconButton from '@/components/ui/IconButton';
import ScreenLayout from '@/components/ui/ScreenLayout';
import { createInitialState } from '@/lib/game/initialState';
import { startTurn } from '@/lib/game/rules';
import type { GameState } from '@/lib/game/types';
import {
  createGame,
  deleteGame,
  listGames,
  type SavedGame,
} from '@/lib/storage/games';

function matchLabel(state: GameState, t: (key: string) => string): string {
  const left =
    state.humanController === 'human'
      ? t('lobby.playerHuman')
      : t('lobby.playerBot');
  const right =
    state.botController === 'human'
      ? t('lobby.playerHuman')
      : t('lobby.playerBot');
  return `${left} vs ${right}`;
}

export default function LobbyScreen() {
  const { user, logout } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const [games, setGames] = useState<SavedGame[]>([]);
  const [confirmTarget, setConfirmTarget] = useState<SavedGame | null>(null);
  const [sideSelectOpen, setSideSelectOpen] = useState(false);

  useEffect(() => {
    setGames(listGames());
  }, []);

  const formatWhen = (iso: string) =>
    new Date(iso).toLocaleString(lang, {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const handleCreate = (setup: GameSetup) => {
    const game = createGame(
      startTurn(
        createInitialState(
          setup.humanFaction,
          setup.botFaction,
          setup.humanController,
          setup.botController,
        ),
        'human',
      ),
    );
    setSideSelectOpen(false);
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
    <ScreenLayout>
      <AppHeader name={user?.name} onLogout={logout} />

      <Button variant="primary" block onClick={() => setSideSelectOpen(true)}>
        <Plus size={18} />
        {t('lobby.create')}
      </Button>

      <Card>
        <h3 className="m-0 text-[15px] font-bold">{t('lobby.yourGames')}</h3>
        {games.length === 0 ? (
          <p className="m-0 text-xs text-muted">{t('lobby.noGames')}</p>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {games.map((game) => (
              <li
                key={game.id}
                className="flex items-center justify-between gap-2 rounded-xl bg-card p-2.5 px-3"
              >
                <button
                  className="group flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 border-none bg-transparent p-0 text-left font-[inherit] text-inherit"
                  onClick={() => router.push(`/play/${game.id}`)}
                  aria-label={t('lobby.continueGame')}
                  title={t('lobby.continueGame')}
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-accent text-accent-fg">
                    <Play size={16} />
                  </span>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="inline-flex items-center gap-1.5 font-semibold group-hover:underline">
                      <FactionShield faction={game.state.humanFaction ?? 'gondor'} />
                      <span className="whitespace-nowrap text-xs font-semibold text-muted">
                        {matchLabel(game.state, t)}
                      </span>
                      <FactionShield faction={game.state.botFaction ?? 'mordor'} />
                    </span>
                    <span className="text-xs text-muted">
                      {gameStatusLabel(game)} · {formatWhen(game.createdAt)}
                    </span>
                  </span>
                </button>
                <IconButton
                  onClick={() => setConfirmTarget(game)}
                  aria-label={t('lobby.delete')}
                  title={t('lobby.delete')}
                >
                  <Trash2 size={16} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {sideSelectOpen && (
        <SideSelectModal
          onConfirm={handleCreate}
          onClose={() => setSideSelectOpen(false)}
        />
      )}

      {confirmTarget && (
        <ConfirmModal
          message={t('lobby.confirmDelete')}
          confirmLabel={t('lobby.delete')}
          cancelLabel={t('lobby.cancel')}
          onConfirm={() => removeGame(confirmTarget)}
          onClose={() => setConfirmTarget(null)}
        />
      )}
    </ScreenLayout>
  );
}

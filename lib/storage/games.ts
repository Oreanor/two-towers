import type { GameState, PlayerId } from '@/lib/game/types';

/** localStorage-backed game list and player stats — the prototype's stand-in
 *  for maeth's networked API (lib/api.ts). */

export interface SavedGame {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Guards against counting the same finished game in the stats twice. */
  resultRecorded: boolean;
  state: GameState;
}

export interface PlayerStats {
  wins: number;
  losses: number;
  draws: number;
}

const GAMES_KEY = 'two-towers.games';
const STATS_KEY = 'two-towers.stats';

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function listGames(): SavedGame[] {
  return readJson<SavedGame[]>(GAMES_KEY, []);
}

export function getGame(id: string): SavedGame | null {
  return listGames().find((g) => g.id === id) ?? null;
}

export function createGame(state: GameState): SavedGame {
  const now = new Date().toISOString();
  const game: SavedGame = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    resultRecorded: false,
    state,
  };
  writeGames([game, ...listGames()]);
  return game;
}

export function saveGame(game: SavedGame): SavedGame {
  const next = { ...game, updatedAt: new Date().toISOString() };
  writeGames(listGames().map((g) => (g.id === next.id ? next : g)));
  return next;
}

export function deleteGame(id: string) {
  writeGames(listGames().filter((g) => g.id !== id));
}

function writeGames(games: SavedGame[]) {
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
}

export function getStats(): PlayerStats {
  return readJson<PlayerStats>(STATS_KEY, { wins: 0, losses: 0, draws: 0 });
}

export function recordResult(winner: PlayerId | null) {
  const stats = getStats();
  if (winner === 'human') stats.wins += 1;
  else if (winner === 'bot') stats.losses += 1;
  else stats.draws += 1;
  localStorage.setItem(STATS_KEY, JSON.stringify(stats));
}

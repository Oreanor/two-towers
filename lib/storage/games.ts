import type { GameState } from '@/lib/game/types';

/** localStorage-backed game list — the prototype's stand-in for a networked API. */

export interface SavedGame {
  id: string;
  createdAt: string;
  updatedAt: string;
  state: GameState;
}

const GAMES_KEY = 'two-towers.games';

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

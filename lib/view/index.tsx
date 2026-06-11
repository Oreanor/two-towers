'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type BoardView = '2d' | '3d';

const STORAGE_KEY = 'two-towers.boardview';

interface BoardViewContextValue {
  view: BoardView;
  setView: (view: BoardView) => void;
  toggle: () => void;
}

const BoardViewContext = createContext<BoardViewContextValue | null>(null);

export function BoardViewProvider({ children }: { children: ReactNode }) {
  // Default 2d on both server and first client render so hydration matches;
  // the stored choice is applied after mount.
  const [view, setViewState] = useState<BoardView>('2d');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === '2d' || stored === '3d') setViewState(stored);
  }, []);

  const setView = useCallback((next: BoardView) => {
    setViewState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo<BoardViewContextValue>(
    () => ({
      view,
      setView,
      toggle: () => setView(view === '2d' ? '3d' : '2d'),
    }),
    [view, setView],
  );

  return (
    <BoardViewContext.Provider value={value}>
      {children}
    </BoardViewContext.Provider>
  );
}

export function useBoardView(): BoardViewContextValue {
  const ctx = useContext(BoardViewContext);
  if (!ctx) throw new Error('useBoardView must be used within BoardViewProvider');
  return ctx;
}

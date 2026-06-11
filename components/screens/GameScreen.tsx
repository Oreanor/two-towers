'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import AmountModal from '@/components/AmountModal';
import AppHeader from '@/components/AppHeader';
import Board from '@/components/Board';
import ResultModal from '@/components/ResultModal';
import RulesModal from '@/components/RulesModal';
import Scoreboard from '@/components/Scoreboard';
import { useAuth } from '@/lib/auth/AuthContext';
import { useI18n } from '@/lib/i18n';
import { executeBotTurn } from '@/lib/game/bot';
import { FORT_COST } from '@/lib/game/constants';
import { createInitialState } from '@/lib/game/initialState';
import {
  attackCell,
  buildFort,
  canAttack,
  canBuildFort,
  canMove,
  canOccupy,
  canPlaceIncome,
  effectiveDefense,
  endTurn,
  moveSoldiers,
  occupyNeutralCell,
  placeIncome,
  startTurn,
} from '@/lib/game/rules';
import {
  getCell,
  getMobilizationCells,
  getNeighbors,
  refOf,
} from '@/lib/game/selectors';
import type { CellRef, GameState } from '@/lib/game/types';
import {
  getGame,
  recordResult,
  saveGame,
  type SavedGame,
} from '@/lib/storage/games';

const BOT_TURN_DELAY_MS = 600;

function newGame(): GameState {
  return startTurn(createInitialState(), 'human');
}

export default function GameScreen({ gameId }: { gameId: string }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  // localStorage is unavailable during the server prerender, so load on mount.
  const [envelope, setEnvelope] = useState<SavedGame | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<CellRef | null>(null);
  /** Legal destination the player clicked; opens the soldier-count modal. */
  const [pendingTarget, setPendingTarget] = useState<CellRef | null>(null);
  /** Castle/fort the player clicked during allocation; opens the same modal. */
  const [allocTarget, setAllocTarget] = useState<CellRef | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resultClosed, setResultClosed] = useState(false);

  useEffect(() => {
    setEnvelope(getGame(gameId));
    setLoaded(true);
  }, [gameId]);

  /** All state transitions go through here so every move is persisted. */
  const updateState = useCallback((fn: (s: GameState) => GameState) => {
    setEnvelope((prev) => {
      if (!prev) return prev;
      const nextState = fn(prev.state);
      if (nextState === prev.state) return prev;
      return saveGame({ ...prev, state: nextState });
    });
  }, []);

  const state = envelope?.state ?? null;

  // Автоход бота после хода игрока.
  useEffect(() => {
    if (!state || state.currentPlayer !== 'bot' || state.phase === 'gameOver')
      return;
    const timer = setTimeout(() => {
      updateState((s) =>
        s.currentPlayer === 'bot' && s.phase !== 'gameOver'
          ? executeBotTurn(s)
          : s,
      );
    }, BOT_TURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state, updateState]);

  // Count each finished game in the stats exactly once, even across reloads.
  useEffect(() => {
    if (!envelope || envelope.state.phase !== 'gameOver' || envelope.resultRecorded)
      return;
    recordResult(envelope.state.winner);
    setEnvelope((prev) =>
      prev && !prev.resultRecorded
        ? saveGame({ ...prev, resultRecorded: true })
        : prev,
    );
  }, [envelope]);

  useEffect(() => {
    if (state?.phase !== 'gameOver') setResultClosed(false);
  }, [state?.phase]);

  const isHumanActing =
    !!state && state.currentPlayer === 'human' && state.phase === 'action';
  const isHumanAllocating =
    !!state && state.currentPlayer === 'human' && state.phase === 'allocate';

  const sourceCell = state && selected ? getCell(state.board, selected) : null;

  // A neighbor is a legal destination if *some* soldier count works: 1 soldier
  // for move/occupy, the whole garrison for attack (the most permissive case).
  const legalTargets = useMemo(() => {
    if (!state || !isHumanActing || !selected || !sourceCell) return [];
    return getNeighbors(state.board, selected)
      .filter(
        (n) =>
          canMove(state, selected, refOf(n), 1) ||
          canOccupy(state, selected, refOf(n), 1) ||
          canAttack(state, selected, refOf(n), sourceCell.soldiers),
      )
      .map(refOf);
  }, [state, selected, sourceCell, isHumanActing]);

  const mobilizationTargets = useMemo(() => {
    if (!state || !isHumanAllocating) return [];
    return getMobilizationCells(state.board, 'human').map(refOf);
  }, [state, isHumanAllocating]);

  function finishHumanAction(next: GameState) {
    setSelected(null);
    setPendingTarget(null);
    updateState(() => endTurn(next));
  }

  function handleCellClick(ref: CellRef) {
    if (!state || state.phase === 'gameOver' || state.currentPlayer !== 'human')
      return;

    if (isHumanAllocating) {
      if (canPlaceIncome(state, ref)) setAllocTarget(ref);
      return;
    }

    const cell = getCell(state.board, ref);

    if (!selected) {
      if (cell.owner === 'human' && cell.soldiers > 0) setSelected(ref);
      return;
    }

    if (selected.row === ref.row && selected.col === ref.col) {
      setSelected(null);
      return;
    }

    if (legalTargets.some((r) => r.row === ref.row && r.col === ref.col)) {
      setPendingTarget(ref);
      return;
    }

    // нелегальная цель — перевыбор своей клетки
    if (cell.owner === 'human' && cell.soldiers > 0) setSelected(ref);
  }

  function confirmAllocation(n: number) {
    const target = allocTarget;
    setAllocTarget(null);
    if (!state || !target || !canPlaceIncome(state, target)) return;
    updateState((s) => placeIncome(s, target, n));
  }

  function confirmMove(n: number) {
    if (!state || !selected || !pendingTarget) return;
    if (canAttack(state, selected, pendingTarget, n)) {
      finishHumanAction(attackCell(state, selected, pendingTarget, n));
    } else if (canOccupy(state, selected, pendingTarget, n)) {
      finishHumanAction(occupyNeutralCell(state, selected, pendingTarget, n));
    } else if (canMove(state, selected, pendingTarget, n)) {
      finishHumanAction(moveSoldiers(state, selected, pendingTarget, n));
    } else {
      setPendingTarget(null);
    }
  }

  function handleBuildFort() {
    if (state && selected && canBuildFort(state, selected)) {
      finishHumanAction(buildFort(state, selected));
    }
  }

  function handlePass() {
    if (!isHumanActing || !state) return;
    setSelected(null);
    updateState((s) => endTurn({ ...s, log: [...s.log, 'Human passed.'] }));
  }

  function handleRestart() {
    setSelected(null);
    setPendingTarget(null);
    setAllocTarget(null);
    setResultClosed(false);
    setEnvelope((prev) =>
      prev
        ? saveGame({ ...prev, state: newGame(), resultRecorded: false })
        : prev,
    );
  }

  if (!loaded) {
    return (
      <div className="screen screen--center">
        <p className="muted">{t('common.loading')}</p>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="screen screen--center">
        <p className="muted">{t('game.notFound')}</p>
        <button className="btn" onClick={() => router.push('/')}>
          {t('game.toLobby')}
        </button>
      </div>
    );
  }

  const hint =
    state.phase === 'gameOver'
      ? state.winner === 'human'
        ? t('result.win')
        : t('result.loss')
      : state.currentPlayer === 'bot'
        ? t('game.botThinking')
        : state.phase === 'allocate'
          ? t('game.hintAllocate', { n: state.pendingIncome })
          : selected
            ? t('game.hintTarget')
            : t('game.hintSelect');

  const showFortButton =
    isHumanActing && selected !== null && canBuildFort(state, selected);
  const showPlayAgain = state.phase === 'gameOver' && resultClosed;
  const showResult =
    state.phase === 'gameOver' && state.winner !== null && !resultClosed;

  // Parameters of the soldier-count modal for the chosen destination.
  const targetCell =
    state && pendingTarget ? getCell(state.board, pendingTarget) : null;
  const moveModal =
    sourceCell && targetCell
      ? targetCell.owner === 'bot'
        ? {
            title: t('game.actAttack'),
            hint: t('game.defenseHint', { d: effectiveDefense(targetCell) }),
            min: effectiveDefense(targetCell) + 1,
          }
        : targetCell.owner === null
          ? { title: t('game.actOccupy'), hint: undefined, min: 1 }
          : { title: t('game.actMove'), hint: undefined, min: 1 }
      : null;

  return (
    <div className="screen screen--game">
      <AppHeader
        name={user?.name}
        onLogout={logout}
        onHelp={() => setRulesOpen(true)}
        className="game-topbar"
      />

      <Scoreboard state={state} youName={user?.name ?? t('common.you')} />

      <div className="statusbar">
        <span>{hint}</span>
        {(isHumanActing || showPlayAgain) && (
          <div className="statusbar__actions">
            {showFortButton && (
              <button className="btn btn--sm" onClick={handleBuildFort}>
                {t('game.buildFort', { cost: FORT_COST })}
              </button>
            )}
            {isHumanActing && (
              <button className="btn btn--sm btn--ghost" onClick={handlePass}>
                {t('game.pass')}
              </button>
            )}
            {showPlayAgain && (
              <button
                className="btn btn--sm btn--primary"
                onClick={handleRestart}
              >
                {t('result.again')}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="game-column">
        <Board
          state={state}
          selected={selected}
          legalTargets={legalTargets}
          mobilizationTargets={mobilizationTargets}
          onCellClick={handleCellClick}
        />
      </div>

      {allocTarget && state && (
        <AmountModal
          title={t('game.allocateTitle')}
          min={1}
          max={state.pendingIncome}
          initial={state.pendingIncome}
          goLabel={
            getCell(state.board, allocTarget).building === 'fort'
              ? t('game.inFort')
              : t('game.inCastle')
          }
          stayLabel={t('game.reserveCount')}
          stayBase={state.pendingIncome}
          confirmLabel={t('common.ok')}
          onConfirm={confirmAllocation}
          onClose={() => setAllocTarget(null)}
        />
      )}

      {pendingTarget && sourceCell && moveModal && (
        <AmountModal
          title={moveModal.title}
          hint={moveModal.hint}
          min={moveModal.min}
          max={sourceCell.soldiers}
          initial={sourceCell.soldiers}
          goLabel={t('game.goCount')}
          stayLabel={t('game.stayCount')}
          stayBase={sourceCell.soldiers}
          confirmLabel={t('common.ok')}
          onConfirm={confirmMove}
          onClose={() => setPendingTarget(null)}
        />
      )}

      {showResult && state.winner && (
        <ResultModal
          winner={state.winner}
          onAgain={handleRestart}
          onClose={() => setResultClosed(true)}
        />
      )}

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  );
}

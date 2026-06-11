'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
  controllerOf,
  humanControlledSide,
  isAiControlled,
  isBotVsBot,
  resolveControllers,
  statsResultForHuman,
} from '@/lib/game/controllers';
import { FORT_COST } from '@/lib/game/constants';
import { createInitialState } from '@/lib/game/initialState';
import { resolveFactions } from '@/lib/game/factions';
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
  incomeTargetIsCastleOnly,
  opponentOf,
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
const AUTO_BATTLE_DELAY_MS = 350;

function newGame(prev: GameState): GameState {
  const { humanFaction, botFaction } = resolveFactions(prev);
  const { humanController, botController } = resolveControllers(prev);
  return startTurn(
    createInitialState(
      humanFaction,
      botFaction,
      humanController,
      botController,
    ),
    'human',
  );
}

function normalizeState(state: GameState): GameState {
  const { humanFaction, botFaction } = resolveFactions(state);
  const { humanController, botController } = resolveControllers(state);
  return {
    ...state,
    humanFaction,
    botFaction,
    humanController,
    botController,
  };
}

export default function GameScreen({ gameId }: { gameId: string }) {
  const { user, logout } = useAuth();
  const { t } = useI18n();
  const router = useRouter();

  const [envelope, setEnvelope] = useState<SavedGame | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<CellRef | null>(null);
  const [pendingTarget, setPendingTarget] = useState<CellRef | null>(null);
  const [allocTarget, setAllocTarget] = useState<CellRef | null>(null);
  const autoAllocTurnRef = useRef<string | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resultClosed, setResultClosed] = useState(false);

  useEffect(() => {
    const game = getGame(gameId);
    setEnvelope(game ? { ...game, state: normalizeState(game.state) } : null);
    setLoaded(true);
  }, [gameId]);

  const updateState = useCallback((fn: (s: GameState) => GameState) => {
    setEnvelope((prev) => {
      if (!prev) return prev;
      const nextState = fn(prev.state);
      if (nextState === prev.state) return prev;
      return saveGame({ ...prev, state: nextState });
    });
  }, []);

  const state = envelope?.state ?? null;
  const activePlayer = state?.currentPlayer ?? null;
  const userSide = state ? humanControlledSide(state) : null;
  const isUserTurn =
    !!state &&
    !!activePlayer &&
    controllerOf(state, activePlayer) === 'human';
  const isUserActing = isUserTurn && state!.phase === 'action';
  const isUserAllocating = isUserTurn && state!.phase === 'allocate';

  useEffect(() => {
    if (!state || state.phase === 'gameOver') return;
    if (!isAiControlled(state, state.currentPlayer)) return;
    const delay = isBotVsBot(state) ? AUTO_BATTLE_DELAY_MS : BOT_TURN_DELAY_MS;
    const timer = setTimeout(() => {
      updateState((s) =>
        s.phase !== 'gameOver' && isAiControlled(s, s.currentPlayer)
          ? executeBotTurn(s)
          : s,
      );
    }, delay);
    return () => clearTimeout(timer);
  }, [state, updateState]);

  useEffect(() => {
    if (!envelope || envelope.state.phase !== 'gameOver' || envelope.resultRecorded)
      return;
    const bucket = statsResultForHuman(envelope.state);
    if (bucket !== 'skip') recordResult(bucket);
    setEnvelope((prev) =>
      prev && !prev.resultRecorded
        ? saveGame({ ...prev, resultRecorded: true })
        : prev,
    );
  }, [envelope]);

  useEffect(() => {
    if (state?.phase !== 'gameOver') setResultClosed(false);
  }, [state?.phase]);

  const sourceCell =
    state && selected ? getCell(state.board, selected) : null;

  const legalTargets = useMemo(() => {
    if (!state || !isUserActing || !selected || !sourceCell || !activePlayer)
      return [];
    return getNeighbors(state.board, selected)
      .filter(
        (n) =>
          canMove(state, selected, refOf(n), 1) ||
          canOccupy(state, selected, refOf(n), 1) ||
          canAttack(state, selected, refOf(n), sourceCell.soldiers),
      )
      .map(refOf);
  }, [state, selected, sourceCell, isUserActing, activePlayer]);

  const mobilizationTargets = useMemo(() => {
    if (!state || !isUserAllocating || !activePlayer) return [];
    if (incomeTargetIsCastleOnly(state.board, activePlayer)) return [];
    return getMobilizationCells(state.board, activePlayer).map(refOf);
  }, [state, isUserAllocating, activePlayer]);

  useEffect(() => {
    if (!state || state.phase !== 'allocate' || !isUserTurn) return;
    if (!incomeTargetIsCastleOnly(state.board, state.currentPlayer)) return;
    if (state.pendingIncome <= 0) return;

    const turnKey = `${state.round}-${state.currentPlayer}`;
    if (autoAllocTurnRef.current === turnKey) return;
    autoAllocTurnRef.current = turnKey;

    const castle = getMobilizationCells(state.board, state.currentPlayer)[0];
    updateState((s) =>
      placeIncome(s, refOf(castle), s.pendingIncome),
    );
  }, [state, isUserTurn, updateState]);

  function finishUserAction(next: GameState) {
    setSelected(null);
    setPendingTarget(null);
    updateState(() => endTurn(next));
  }

  function handleCellClick(ref: CellRef) {
    if (!state || !activePlayer || state.phase === 'gameOver' || !isUserTurn)
      return;

    if (isUserAllocating) {
      if (incomeTargetIsCastleOnly(state.board, activePlayer)) return;
      if (canPlaceIncome(state, ref)) setAllocTarget(ref);
      return;
    }

    const cell = getCell(state.board, ref);

    if (!selected) {
      if (cell.owner === activePlayer && cell.soldiers > 0) setSelected(ref);
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

    if (cell.owner === activePlayer && cell.soldiers > 0) setSelected(ref);
  }

  function confirmAllocation(n: number) {
    const target = allocTarget;
    setAllocTarget(null);
    if (!state || !target || !canPlaceIncome(state, target)) return;
    updateState((s) => placeIncome(s, target, n));
  }

  function confirmMove(n: number) {
    if (!state || !selected || !pendingTarget || !activePlayer) return;
    const enemy = opponentOf(activePlayer);
    if (canAttack(state, selected, pendingTarget, n)) {
      finishUserAction(attackCell(state, selected, pendingTarget, n));
    } else if (canOccupy(state, selected, pendingTarget, n)) {
      finishUserAction(occupyNeutralCell(state, selected, pendingTarget, n));
    } else if (canMove(state, selected, pendingTarget, n)) {
      finishUserAction(moveSoldiers(state, selected, pendingTarget, n));
    } else {
      setPendingTarget(null);
    }
  }

  function handleBuildFort() {
    if (state && selected && canBuildFort(state, selected)) {
      finishUserAction(buildFort(state, selected));
    }
  }

  function handlePass() {
    if (!isUserActing || !state) return;
    setSelected(null);
    updateState((s) => endTurn({ ...s, log: [...s.log, 'Human passed.'] }));
  }

  function handleRestart() {
    setSelected(null);
    setPendingTarget(null);
    setAllocTarget(null);
    autoAllocTurnRef.current = null;
    setResultClosed(false);
    setEnvelope((prev) =>
      prev
        ? saveGame({ ...prev, state: newGame(prev.state), resultRecorded: false })
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
      ? userSide && state.winner === userSide
        ? t('result.win')
        : userSide && state.winner === opponentOf(userSide)
          ? t('result.loss')
          : state.winner
            ? t('game.autoBattleOver')
            : t('result.loss')
      : isAiControlled(state, state.currentPlayer)
        ? isBotVsBot(state)
          ? t('game.autoBattle')
          : t('game.botThinking')
        : state.phase === 'allocate'
          ? t('game.hintAllocate', { n: state.pendingIncome })
          : selected
            ? t('game.hintTarget')
            : t('game.hintSelect');

  const showFortButton =
    isUserActing && selected !== null && canBuildFort(state, selected);
  const showPlayAgain = state.phase === 'gameOver' && resultClosed;
  const showResult =
    state.phase === 'gameOver' && state.winner !== null && !resultClosed;

  const targetCell =
    state && pendingTarget ? getCell(state.board, pendingTarget) : null;
  const moveModal =
    sourceCell && targetCell && activePlayer
      ? targetCell.owner === opponentOf(activePlayer)
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
        {(isUserActing || showPlayAgain) && (
          <div className="statusbar__actions">
            {showFortButton && (
              <button className="btn btn--sm" onClick={handleBuildFort}>
                {t('game.buildFort', { cost: FORT_COST })}
              </button>
            )}
            {isUserActing && (
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
          state={state}
          winner={state.winner}
          onAgain={handleRestart}
          onClose={() => setResultClosed(true)}
        />
      )}

      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </div>
  );
}

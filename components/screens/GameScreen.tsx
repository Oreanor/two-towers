'use client';

import { RotateCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AmountModal from '@/components/AmountModal';
import AppHeader from '@/components/AppHeader';
import Board, { type MoveAnim } from '@/components/Board';
import IsoBoard from '@/components/IsoBoard';
import ResultModal from '@/components/ResultModal';
import RulesModal from '@/components/RulesModal';
import Scoreboard from '@/components/Scoreboard';
import { useAuth } from '@/lib/auth/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useBoardView } from '@/lib/view';
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
import {
  nextRotation,
  type BoardRotation,
} from '@/lib/game/boardRotation';
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
  autoCastleIncome,
  getCell,
  getMobilizationCells,
  getNeighbors,
  incomeTargetIsCastleOnly,
  opponentOf,
  refOf,
} from '@/lib/game/selectors';
import type { CellRef, GameState } from '@/lib/game/types';
import type { IncomeFloat } from '@/components/CellView';
import {
  getGame,
  recordResult,
  saveGame,
  type SavedGame,
} from '@/lib/storage/games';

// A bot pauses to "think" before acting (random, so it feels less robotic) and
// settles briefly after, so consecutive bot moves don't blur together.
const AI_BEFORE_MIN_MS = 450;
const AI_BEFORE_MAX_MS = 900;
const AI_AFTER_MS = 350;

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
  const { view } = useBoardView();
  const router = useRouter();

  const [envelope, setEnvelope] = useState<SavedGame | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selected, setSelected] = useState<CellRef | null>(null);
  const [pendingTarget, setPendingTarget] = useState<CellRef | null>(null);
  const [allocTarget, setAllocTarget] = useState<CellRef | null>(null);
  const autoAllocTurnRef = useRef<string | null>(null);
  // Timestamp of the last committed bot move, for the post-move settle delay.
  const lastAiCommitRef = useRef(0);
  const [incomeFloats, setIncomeFloats] = useState<IncomeFloat[]>([]);
  const [boardRotation, setBoardRotation] = useState<BoardRotation>(0);
  const [moveAnim, setMoveAnim] = useState<MoveAnim | null>(null);
  const animatedMoveRef = useRef(0);
  // The previously committed state, for reading a move's pre-move target cell.
  const prevStateRef = useRef<GameState | null>(null);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [resultClosed, setResultClosed] = useState(false);

  useEffect(() => {
    const game = getGame(gameId);
    const normalized = game
      ? { ...game, state: normalizeState(game.state) }
      : null;
    // Treat a move already present in the loaded game as "seen".
    animatedMoveRef.current = normalized?.state.lastMove?.id ?? 0;
    setEnvelope(normalized);
    setLoaded(true);
  }, [gameId]);

  useEffect(() => {
    if (view === '2d') setBoardRotation(0);
  }, [view]);

  const updateState = useCallback((fn: (s: GameState) => GameState) => {
    setEnvelope((prev) => {
      if (!prev) return prev;
      const nextState = fn(prev.state);
      if (nextState === prev.state) return prev;
      return saveGame({ ...prev, state: nextState });
    });
  }, []);

  const addIncomeFloat = useCallback((ref: CellRef, amount: number) => {
    setIncomeFloats((prev) => [
      ...prev,
      { id: Date.now() + Math.random(), ref, amount },
    ]);
  }, []);

  const removeIncomeFloat = useCallback((id: number) => {
    setIncomeFloats((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const state = envelope?.state ?? null;

  // Slide a sprite from source to target whenever a fresh move appears.
  const lastMove = state?.lastMove ?? null;
  useEffect(() => {
    if (!state || !lastMove || animatedMoveRef.current === lastMove.id) return;
    animatedMoveRef.current = lastMove.id;
    const faction =
      lastMove.player === 'human' ? state.humanFaction : state.botFaction;
    const prev = prevStateRef.current;
    const holdCell = prev ? getCell(prev.board, lastMove.to) : null;
    setMoveAnim({
      id: lastMove.id,
      from: lastMove.from,
      to: lastMove.to,
      player: lastMove.player,
      kind: lastMove.kind,
      faction,
      flip: lastMove.player === 'human',
      holdCell,
    });
    // A defender that has to die first (attack on an occupied enemy cell) makes
    // the 3D sequence longer.
    const killsDefender =
      lastMove.kind === 'attack' &&
      !!holdCell &&
      holdCell.owner != null &&
      holdCell.owner !== lastMove.player &&
      holdCell.soldiers > 0;
    const duration =
      view === '3d' ? (killsDefender ? 1160 : 940) : 940;
    const timer = setTimeout(
      () => setMoveAnim((m) => (m && m.id === lastMove.id ? null : m)),
      duration,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove?.id]);

  // Remember the committed state so the next move can read its pre-move target.
  // Declared after the animation effect so that one reads the prior value first.
  useEffect(() => {
    prevStateRef.current = state;
  }, [state]);
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
    const snapshot = state;
    // Wait out any remaining settle from the previous bot move, then a random
    // "thinking" pause before this one acts.
    const afterRemaining = Math.max(
      0,
      AI_AFTER_MS - (Date.now() - lastAiCommitRef.current),
    );
    const beforeDelay =
      AI_BEFORE_MIN_MS + Math.random() * (AI_BEFORE_MAX_MS - AI_BEFORE_MIN_MS);
    const timer = setTimeout(() => {
      const floater = autoCastleIncome(snapshot);
      if (floater) addIncomeFloat(floater.ref, floater.amount);
      updateState((s) =>
        s.phase !== 'gameOver' && isAiControlled(s, s.currentPlayer)
          ? executeBotTurn(s)
          : s,
      );
      lastAiCommitRef.current = Date.now();
    }, afterRemaining + beforeDelay);
    return () => clearTimeout(timer);
  }, [state, updateState, addIncomeFloat]);

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
    const ref = refOf(castle);
    const amount = state.pendingIncome;
    addIncomeFloat(ref, amount);
    updateState((s) => placeIncome(s, ref, amount));
  }, [state, isUserTurn, updateState, addIncomeFloat]);

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
    setIncomeFloats([]);
    setBoardRotation(0);
    setMoveAnim(null);
    animatedMoveRef.current = 0;
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
    <div className={`screen screen--game screen--${view}`}>
      <AppHeader
        name={user?.name}
        onLogout={logout}
        onHelp={() => setRulesOpen(true)}
        className="game-topbar"
      />

      <Scoreboard state={state} youName={user?.name ?? t('common.you')} />

      <div className="statusbar">
        <p className="statusbar__hint">{hint}</p>
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
      </div>

      <div className="game-column">
        <div className="board-stage">
          <div className="board-stage__board">
            {view === '3d' ? (
              <IsoBoard
                state={state}
                selected={selected}
                legalTargets={legalTargets}
                mobilizationTargets={mobilizationTargets}
                incomeFloats={incomeFloats}
                moveAnim={moveAnim}
                rotation={boardRotation}
                userSide={userSide}
                onIncomeFloatEnd={removeIncomeFloat}
                onCellClick={handleCellClick}
              />
            ) : (
              <Board
                state={state}
                selected={selected}
                legalTargets={legalTargets}
                mobilizationTargets={mobilizationTargets}
                incomeFloats={incomeFloats}
                moveAnim={moveAnim}
                rotation={boardRotation}
                onIncomeFloatEnd={removeIncomeFloat}
                onCellClick={handleCellClick}
              />
            )}
            {view === '3d' && (
              <button
                type="button"
                className="icon-btn board-stage__rotate"
                onClick={() => setBoardRotation((r) => nextRotation(r))}
                aria-label={t('game.rotateBoard')}
                title={t('game.rotateBoard')}
              >
                <RotateCw size={18} />
              </button>
            )}
          </div>
        </div>
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

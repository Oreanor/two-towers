'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import AmountModal from '@/components/AmountModal';
import AppHeader from '@/components/AppHeader';
import ResultModal from '@/components/ResultModal';
import Scoreboard from '@/components/Scoreboard';
import Button from '@/components/ui/Button';
import ScreenLayout from '@/components/ui/ScreenLayout';
import type { IncomeFloat, MoveAnim } from '@/components/board/types';
import GameBoardArea from '@/components/screens/game/GameBoardArea';
import GameHintBar from '@/components/screens/game/GameHintBar';
import { useAuth } from '@/lib/auth/AuthContext';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import { useBoardView } from '@/lib/view';
import { executeBotTurn } from '@/lib/game/bot';
import {
  controllerOf,
  humanControlledSide,
  isAiControlled,
  statsResultForHuman,
} from '@/lib/game/controllers';
import { FORT_COST } from '@/lib/game/constants';
import { type BoardRotation } from '@/lib/game/boardRotation';
import { gameHintText, isHumanTurn } from '@/lib/game/gameHint';
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
import { newGameFrom, normalizeState } from '@/lib/game/session';
import type { CellRef, GameState } from '@/lib/game/types';
import {
  getGame,
  recordResult,
  saveGame,
  type SavedGame,
} from '@/lib/storage/games';

const AI_BEFORE_MIN_MS = 450;
const AI_BEFORE_MAX_MS = 900;
const AI_AFTER_MS = 350;

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
  const lastAiCommitRef = useRef(0);
  const [incomeFloats, setIncomeFloats] = useState<IncomeFloat[]>([]);
  const [boardRotation, setBoardRotation] = useState<BoardRotation>(0);
  const [moveAnim, setMoveAnim] = useState<MoveAnim | null>(null);
  const animatedMoveRef = useRef(0);
  const prevStateRef = useRef<GameState | null>(null);
  const [resultClosed, setResultClosed] = useState(false);

  useEffect(() => {
    const game = getGame(gameId);
    const normalized = game
      ? { ...game, state: normalizeState(game.state) }
      : null;
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
    const killsDefender =
      lastMove.kind === 'attack' &&
      !!holdCell &&
      holdCell.owner != null &&
      holdCell.owner !== lastMove.player &&
      holdCell.soldiers > 0;
    const duration = view === '3d' ? (killsDefender ? 1160 : 940) : 940;
    const timer = setTimeout(
      () => setMoveAnim((m) => (m && m.id === lastMove.id ? null : m)),
      duration,
    );
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastMove?.id]);

  useEffect(() => {
    prevStateRef.current = state;
  }, [state]);

  const activePlayer = state?.currentPlayer ?? null;
  const userSide = state ? humanControlledSide(state) : null;
  const userTurn = state ? isHumanTurn(state) : false;
  const isUserActing = userTurn && state!.phase === 'action';
  const isUserAllocating = userTurn && state!.phase === 'allocate';

  useEffect(() => {
    if (!state || state.phase === 'gameOver') return;
    if (!isAiControlled(state, state.currentPlayer)) return;
    const snapshot = state;
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

  const sourceCell = state && selected ? getCell(state.board, selected) : null;

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
    if (!state || state.phase !== 'allocate' || !userTurn) return;
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
  }, [state, userTurn, updateState, addIncomeFloat]);

  function finishUserAction(next: GameState) {
    setSelected(null);
    setPendingTarget(null);
    updateState(() => endTurn(next));
  }

  function handleCellClick(ref: CellRef) {
    if (!state || !activePlayer || state.phase === 'gameOver' || !userTurn) return;

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
        ? saveGame({ ...prev, state: newGameFrom(prev.state), resultRecorded: false })
        : prev,
    );
  }

  if (!loaded) {
    return (
      <ScreenLayout centered>
        <p className="text-muted">{t('common.loading')}</p>
      </ScreenLayout>
    );
  }

  if (!state) {
    return (
      <ScreenLayout centered className="gap-4">
        <p className="text-muted">{t('game.notFound')}</p>
        <Button onClick={() => router.push('/')}>{t('game.toLobby')}</Button>
      </ScreenLayout>
    );
  }

  const hint = gameHintText(state, selected !== null, t);
  const showFortButton =
    isUserActing && selected !== null && canBuildFort(state, selected);
  const showPlayAgain = state.phase === 'gameOver' && resultClosed;
  const showResult =
    state.phase === 'gameOver' && state.winner !== null && !resultClosed;

  const targetCell =
    pendingTarget ? getCell(state.board, pendingTarget) : null;
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
    <div
      className={cn(
        'flex min-h-dvh w-full max-w-[min(96vw,1100px)] flex-col items-center gap-3 px-4 pt-4 pb-[calc(16px+env(safe-area-inset-bottom))]',
        view === '2d' && 'max-w-[520px] [--game-column-w:min(480px,92vw)]',
        view === '3d' && '[--game-column-w:96vw] md:[--game-column-w:min(72vw,1200px)]',
      )}
    >
      <AppHeader name={user?.name} onLogout={logout} className="w-[var(--game-column-w)]" />

      <Scoreboard state={state} youName={user?.name ?? t('common.you')} />

      <GameHintBar
        hint={hint}
        showFortButton={showFortButton}
        showPass={isUserActing}
        showPlayAgain={showPlayAgain}
        onBuildFort={handleBuildFort}
        onPass={handlePass}
        onPlayAgain={handleRestart}
        buildFortLabel={t('game.buildFort', { cost: FORT_COST })}
        passLabel={t('game.pass')}
        playAgainLabel={t('result.again')}
      />

      <GameBoardArea
        view={view}
        state={state}
        selected={selected}
        legalTargets={legalTargets}
        mobilizationTargets={mobilizationTargets}
        incomeFloats={incomeFloats}
        moveAnim={moveAnim}
        rotation={boardRotation}
        userSide={userSide}
        onRotationChange={setBoardRotation}
        onIncomeFloatEnd={removeIncomeFloat}
        onCellClick={handleCellClick}
        rotateLabel={t('game.rotateBoard')}
      />

      {allocTarget && (
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
    </div>
  );
}

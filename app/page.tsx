'use client';

import { useEffect, useMemo, useState } from 'react';
import ActionPanel from '@/components/ActionPanel';
import Board from '@/components/Board';
import GameStatus from '@/components/GameStatus';
import IncomeAllocator from '@/components/IncomeAllocator';
import LogPanel from '@/components/LogPanel';
import { executeBotTurn } from '@/lib/game/bot';
import { createInitialState } from '@/lib/game/initialState';
import {
  attackCell,
  buildFort,
  canAttack,
  canBuildFort,
  canMove,
  canOccupy,
  canPlaceIncome,
  endTurn,
  moveSoldiers,
  occupyNeutralCell,
  placeIncome,
  playerName,
  startTurn,
} from '@/lib/game/rules';
import {
  getCell,
  getMainCastle,
  getMobilizationCells,
  getNeighbors,
  refOf,
} from '@/lib/game/selectors';
import type { CellRef, GameState } from '@/lib/game/types';

const BOT_TURN_DELAY_MS = 600;

function newGame(): GameState {
  return startTurn(createInitialState(), 'human');
}

export default function Home() {
  const [state, setState] = useState<GameState>(newGame);
  const [selected, setSelected] = useState<CellRef | null>(null);
  const [soldierCount, setSoldierCount] = useState(1);

  const isHumanActing =
    state.currentPlayer === 'human' && state.phase === 'action';
  const isHumanAllocating =
    state.currentPlayer === 'human' && state.phase === 'allocate';

  // Автоход бота после хода игрока.
  useEffect(() => {
    if (state.currentPlayer !== 'bot' || state.phase === 'gameOver') return;
    const timer = setTimeout(() => {
      setState((s) =>
        s.currentPlayer === 'bot' && s.phase !== 'gameOver'
          ? executeBotTurn(s)
          : s,
      );
    }, BOT_TURN_DELAY_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const selectedCell = selected ? getCell(state.board, selected) : null;

  const legalTargets = useMemo(() => {
    if (!isHumanActing || !selected) return [];
    return getNeighbors(state.board, selected)
      .filter(
        (n) =>
          canMove(state, selected, refOf(n), soldierCount) ||
          canOccupy(state, selected, refOf(n), soldierCount) ||
          canAttack(state, selected, refOf(n), soldierCount),
      )
      .map(refOf);
  }, [state, selected, soldierCount, isHumanActing]);

  const mobilizationTargets = useMemo(() => {
    if (!isHumanAllocating) return [];
    return getMobilizationCells(state.board, 'human').map(refOf);
  }, [state, isHumanAllocating]);

  function finishHumanAction(next: GameState) {
    setSelected(null);
    setState(endTurn(next));
  }

  function handleCellClick(ref: CellRef) {
    if (state.phase === 'gameOver' || state.currentPlayer !== 'human') return;

    if (isHumanAllocating) {
      if (canPlaceIncome(state, ref)) {
        setState(placeIncome(state, ref, 1));
      }
      return;
    }

    const cell = getCell(state.board, ref);

    if (!selected) {
      if (cell.owner === 'human' && cell.soldiers > 0) {
        setSelected(ref);
        setSoldierCount(cell.soldiers);
      }
      return;
    }

    if (selected.row === ref.row && selected.col === ref.col) {
      setSelected(null);
      return;
    }

    if (canAttack(state, selected, ref, soldierCount)) {
      finishHumanAction(attackCell(state, selected, ref, soldierCount));
      return;
    }
    if (canOccupy(state, selected, ref, soldierCount)) {
      finishHumanAction(
        occupyNeutralCell(state, selected, ref, soldierCount),
      );
      return;
    }
    if (canMove(state, selected, ref, soldierCount)) {
      finishHumanAction(moveSoldiers(state, selected, ref, soldierCount));
      return;
    }

    // нелегальная цель — перевыбор своей клетки
    if (cell.owner === 'human' && cell.soldiers > 0) {
      setSelected(ref);
      setSoldierCount(cell.soldiers);
    }
  }

  function handleAllToCastle() {
    const castle = getMainCastle(state.board, 'human');
    if (castle && canPlaceIncome(state, refOf(castle))) {
      setState(placeIncome(state, refOf(castle), state.pendingIncome));
    }
  }

  function handleBuildFort() {
    if (selected && canBuildFort(state, selected)) {
      finishHumanAction(buildFort(state, selected));
    }
  }

  function handlePass() {
    if (!isHumanActing) return;
    setSelected(null);
    setState(endTurn({ ...state, log: [...state.log, 'Human passed.'] }));
  }

  function handleRestart() {
    setSelected(null);
    setSoldierCount(1);
    setState(newGame());
  }

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-4 p-6 md:flex-row">
      <div className="flex flex-1 flex-col items-center gap-4">
        <Board
          state={state}
          selected={selected}
          legalTargets={legalTargets}
          mobilizationTargets={mobilizationTargets}
          onCellClick={handleCellClick}
        />
        {state.phase === 'gameOver' && state.winner && (
          <div
            className={`w-full max-w-md rounded-lg p-4 text-center text-lg font-bold text-white ${
              state.winner === 'human' ? 'bg-blue-600' : 'bg-red-600'
            }`}
          >
            {playerName(state.winner)} wins!
          </div>
        )}
        {state.currentPlayer === 'bot' && state.phase !== 'gameOver' && (
          <p className="text-sm text-gray-500">Bot is thinking…</p>
        )}
      </div>

      <div className="flex w-full flex-col gap-4 md:w-80">
        <GameStatus state={state} onRestart={handleRestart} />
        {isHumanAllocating && (
          <IncomeAllocator
            pendingIncome={state.pendingIncome}
            onAllToCastle={handleAllToCastle}
          />
        )}
        {isHumanActing && (
          <ActionPanel
            selectedCell={selectedCell}
            soldierCount={soldierCount}
            maxSoldiers={selectedCell?.soldiers ?? 1}
            canBuild={selected !== null && canBuildFort(state, selected)}
            onSoldierCountChange={setSoldierCount}
            onBuildFort={handleBuildFort}
            onPass={handlePass}
          />
        )}
        <LogPanel log={state.log} />
      </div>
    </main>
  );
}

'use client';

import { RotateCw } from 'lucide-react';
import Board from '@/components/Board';
import IsoBoard from '@/components/IsoBoard';
import IconButton from '@/components/ui/IconButton';
import type { IncomeFloat, MoveAnim } from '@/components/board/types';
import { nextRotation, type BoardRotation } from '@/lib/game/boardRotation';
import type { CellRef, GameState, PlayerId } from '@/lib/game/types';
import { cn } from '@/lib/cn';

type Props = {
  view: '2d' | '3d';
  state: GameState;
  selected: CellRef | null;
  legalTargets: CellRef[];
  mobilizationTargets: CellRef[];
  incomeFloats: IncomeFloat[];
  moveAnim: MoveAnim | null;
  rotation: BoardRotation;
  userSide: PlayerId | null;
  onRotationChange: (next: BoardRotation) => void;
  onIncomeFloatEnd: (id: number) => void;
  onCellClick: (ref: CellRef) => void;
  rotateLabel: string;
};

export default function GameBoardArea({
  view,
  state,
  selected,
  legalTargets,
  mobilizationTargets,
  incomeFloats,
  moveAnim,
  rotation,
  userSide,
  onRotationChange,
  onIncomeFloatEnd,
  onCellClick,
  rotateLabel,
}: Props) {
  const boardProps = {
    state,
    selected,
    legalTargets,
    mobilizationTargets,
    incomeFloats,
    moveAnim,
    rotation,
    onIncomeFloatEnd,
    onCellClick,
  };

  return (
    <div
      className={cn(
        'relative z-0 flex w-[var(--game-column-w)] flex-col gap-3',
        view === '3d' && 'mt-[3vh]',
      )}
    >
      <div className="flex w-full justify-center">
        <div
          className={cn(
            'relative max-w-full',
            view === '2d' ? 'w-full' : 'w-auto',
          )}
        >
          {view === '3d' ? (
            <div className="h-[min(calc(var(--game-column-w)/2.399),calc(100dvh-230px))] w-auto">
              <IsoBoard className="h-full" userSide={userSide} {...boardProps} />
            </div>
          ) : (
            <Board {...boardProps} />
          )}
          {view === '3d' && (
            <IconButton
              className="absolute top-[2%] right-[2%] z-[5] shadow-[0_2px_8px_rgba(0,0,0,0.35)]"
              onClick={() => onRotationChange(nextRotation(rotation))}
              aria-label={rotateLabel}
              title={rotateLabel}
            >
              <RotateCw size={18} />
            </IconButton>
          )}
        </div>
      </div>
    </div>
  );
}

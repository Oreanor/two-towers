import Button from '@/components/ui/Button';
import { FORT_COST } from '@/lib/game/constants';

type Props = {
  hint: string;
  showFortButton: boolean;
  showPass: boolean;
  showPlayAgain: boolean;
  onBuildFort: () => void;
  onPass: () => void;
  onPlayAgain: () => void;
  buildFortLabel: string;
  passLabel: string;
  playAgainLabel: string;
};

export default function GameHintBar({
  hint,
  showFortButton,
  showPass,
  showPlayAgain,
  onBuildFort,
  onPass,
  onPlayAgain,
  buildFortLabel,
  passLabel,
  playAgainLabel,
}: Props) {
  return (
    <div className="box-border grid h-[calc(24px+1.4em+8px+34px)] w-[var(--game-column-w)] grid-rows-[1.4em_34px] gap-2 rounded-xl bg-card p-3 text-center text-sm leading-snug font-semibold">
      <p className="m-0 line-clamp-1 overflow-hidden">{hint}</p>
      <div className="flex min-h-[34px] flex-nowrap items-center justify-center gap-2">
        {showFortButton && (
          <Button size="sm" onClick={onBuildFort}>
            {buildFortLabel}
          </Button>
        )}
        {showPass && (
          <Button size="sm" variant="ghost" onClick={onPass}>
            {passLabel}
          </Button>
        )}
        {showPlayAgain && (
          <Button size="sm" variant="primary" onClick={onPlayAgain}>
            {playAgainLabel}
          </Button>
        )}
      </div>
    </div>
  );
}

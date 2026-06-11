import RulesModal from '@/components/RulesModal';
import { calculateIncome, playerName } from '@/lib/game/rules';
import { totalSoldiers } from '@/lib/game/selectors';
import type { GameState } from '@/lib/game/types';

type Props = {
  state: GameState;
  onRestart: () => void;
};

export default function GameStatus({ state, onRestart }: Props) {
  return (
    <div className="rounded-lg border border-gray-300 p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">Two Towers</h1>
        <div className="flex gap-2">
          <RulesModal />
          <button
            onClick={onRestart}
            className="rounded bg-gray-800 px-3 py-1 text-sm text-white hover:bg-gray-700"
          >
            Restart
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <span className="text-gray-500">Round</span>
        <span>{state.round}</span>
        <span className="text-gray-500">Current player</span>
        <span
          className={
            state.currentPlayer === 'human' ? 'text-blue-700' : 'text-red-700'
          }
        >
          {playerName(state.currentPlayer)}
        </span>
        <span className="text-gray-500">Human soldiers</span>
        <span className="text-blue-700">{totalSoldiers(state, 'human')}</span>
        <span className="text-gray-500">Bot soldiers</span>
        <span className="text-red-700">{totalSoldiers(state, 'bot')}</span>
        <span className="text-gray-500">Income this turn</span>
        <span>{calculateIncome(state, state.currentPlayer)}</span>
      </div>
    </div>
  );
}

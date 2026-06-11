// Смоук-тест логики: Human всегда пасует, Bot играет. Бот должен победить.
import { executeBotTurn } from '../lib/game/bot';
import { createInitialState } from '../lib/game/initialState';
import { calculateIncome, endTurn, startTurn } from '../lib/game/rules';
import { getMainCastle, refOf } from '../lib/game/selectors';
import { placeIncome } from '../lib/game/rules';
import type { GameState } from '../lib/game/types';

let state: GameState = startTurn(
  createInitialState('gondor', 'mordor', 'human', 'ai'),
  'human',
);

for (let i = 0; i < 200 && state.phase !== 'gameOver'; i++) {
  if (state.currentPlayer === 'human') {
    // доход в замок, действие — пас
    const castle = getMainCastle(state.board, 'human')!;
    state = placeIncome(state, refOf(castle), state.pendingIncome);
    state = endTurn(state);
  } else {
    state = executeBotTurn(state);
  }
}

console.log('--- LOG ---');
for (const line of state.log) console.log(line);
console.log('--- RESULT ---');
console.log('winner:', state.winner, 'round:', state.round);
console.log(
  'income human:',
  calculateIncome(state, 'human'),
  'income bot:',
  calculateIncome(state, 'bot'),
);

if (state.winner !== 'bot') {
  console.error('FAIL: expected bot to win against a passive human');
  process.exit(1);
}
console.log('OK');

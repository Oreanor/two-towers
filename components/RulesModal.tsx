'use client';

import { useState } from 'react';
import {
  BOARD_SIZE,
  FORT_COST,
  FORT_DEFENSE_MULTIPLIER,
  FORT_INCOME,
  MAIN_CASTLE_DEFENSE_MULTIPLIER,
  MAIN_CASTLE_INCOME,
  MAX_FORTS_PER_PLAYER,
  NORMAL_CELL_INCOME,
  STARTING_SOLDIERS,
} from '@/lib/game/constants';

export default function RulesModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="rounded border border-gray-400 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
      >
        Rules
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Game rules"
            className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-bold">Rules</h2>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close rules"
                className="rounded px-2 py-1 text-gray-500 hover:bg-gray-100"
              >
                ✕
              </button>
            </div>

            <div className="flex flex-col gap-3 overflow-y-auto px-6 py-5 text-sm text-gray-700">
              <section>
                <h3 className="font-bold">Goal</h3>
                <p>Capture the enemy main castle to win.</p>
              </section>

              <section>
                <h3 className="font-bold">Setup</h3>
                <p>
                  {BOARD_SIZE}×{BOARD_SIZE} board. Each player starts with a
                  main castle in their corner holding {STARTING_SOLDIERS}{' '}
                  soldiers.
                </p>
              </section>

              <section>
                <h3 className="font-bold">Turn order</h3>
                <ol className="list-decimal pl-5">
                  <li>
                    Receive reinforcements: {MAIN_CASTLE_INCOME} per main
                    castle, {FORT_INCOME} per fort, {NORMAL_CELL_INCOME} per
                    other owned cell. Place them on your castle or forts.
                  </li>
                  <li>Perform one action.</li>
                </ol>
              </section>

              <section>
                <h3 className="font-bold">Actions (one per turn)</h3>
                <ul className="list-disc pl-5">
                  <li>
                    <b>Move</b> — send soldiers to an adjacent cell you own.
                  </li>
                  <li>
                    <b>Occupy</b> — send soldiers to an adjacent neutral cell.
                    It becomes yours with exactly the soldiers you sent.
                  </li>
                  <li>
                    <b>Attack</b> — send soldiers to an adjacent enemy cell.
                    You must send more than its defense. Defense = soldiers ×{' '}
                    {FORT_DEFENSE_MULTIPLIER} on a fort, ×{' '}
                    {MAIN_CASTLE_DEFENSE_MULTIPLIER} on a main castle. You lose
                    soldiers equal to the defense; the rest capture the cell. A
                    captured fort is destroyed.
                  </li>
                  <li>
                    <b>Build fort</b> — costs {FORT_COST} soldiers on the
                    selected cell. At most {MAX_FORTS_PER_PLAYER} forts per
                    player.
                  </li>
                  <li>
                    <b>Pass</b> — skip the action.
                  </li>
                </ul>
              </section>

              <section>
                <h3 className="font-bold">Territory</h3>
                <p>
                  Cells you leave empty stay yours and keep producing income
                  until the enemy captures them.
                </p>
              </section>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

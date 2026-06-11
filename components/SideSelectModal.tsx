'use client';

import { useState } from 'react';
import { Check } from 'lucide-react';
import { useAnimatedClose } from '@/components/ui/useAnimatedClose';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import ModalShell from '@/components/ui/ModalShell';
import ModalActions from '@/components/ui/ModalActions';
import ToggleButton from '@/components/ui/ToggleButton';
import FactionShield from '@/components/ui/FactionShield';
import {
  FACTIONS,
  type FactionId,
} from '@/lib/game/factions';
import type { ControllerKind } from '@/lib/game/types';

type BoardSide = 'human' | 'bot';

type SideSetup = {
  faction: FactionId;
  controller: ControllerKind;
};

export type GameSetup = {
  humanFaction: FactionId;
  botFaction: FactionId;
  humanController: ControllerKind;
  botController: ControllerKind;
};

export default function SideSelectModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (setup: GameSetup) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { closing, close } = useAnimatedClose(onClose);
  const [left, setLeft] = useState<SideSetup>({
    faction: 'gondor',
    controller: 'human',
  });
  const [right, setRight] = useState<SideSetup>({
    faction: 'mordor',
    controller: 'ai',
  });

  function setFaction(side: BoardSide, faction: FactionId) {
    if (side === 'human') setLeft((s) => ({ ...s, faction }));
    else setRight((s) => ({ ...s, faction }));
  }

  function setController(side: BoardSide, controller: ControllerKind) {
    if (side === 'human') setLeft((s) => ({ ...s, controller }));
    else setRight((s) => ({ ...s, controller }));
  }

  function renderSide(
    boardSide: BoardSide,
    setup: SideSetup,
    otherFaction: FactionId,
  ) {
    return (
      <div className="mt-1 first:mt-0">
        <h4 className="mb-2 text-center text-[13px] font-bold tracking-wide text-muted uppercase">
          {boardSide === 'human' ? t('lobby.sideLeft') : t('lobby.sideRight')}
        </h4>
        <div className="mb-2.5 flex gap-2">
          <ToggleButton
            selected={setup.controller === 'human'}
            onClick={() => setController(boardSide, 'human')}
            aria-pressed={setup.controller === 'human'}
          >
            {t('lobby.playerHuman')}
          </ToggleButton>
          <ToggleButton
            selected={setup.controller === 'ai'}
            onClick={() => setController(boardSide, 'ai')}
            aria-pressed={setup.controller === 'ai'}
          >
            {t('lobby.playerBot')}
          </ToggleButton>
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          {FACTIONS.map((faction) => {
            const isTaken = faction === otherFaction;
            const isSelected = faction === setup.faction;
            return (
              <button
                key={faction}
                type="button"
                className={cn(
                  'relative flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border-[3px] p-2 px-1.5 transition-colors',
                  isSelected
                    ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]'
                    : 'border-[var(--btn-border)] bg-white/5 hover:border-[var(--muted)]',
                  isTaken && 'cursor-not-allowed opacity-35',
                )}
                onClick={() => !isTaken && setFaction(boardSide, faction)}
                disabled={isTaken}
                aria-pressed={isSelected}
                aria-label={t(`factions.${faction}`)}
              >
                {isSelected && (
                  <span
                    className="absolute top-1 right-1 flex size-[18px] items-center justify-center rounded-full bg-accent text-accent-fg"
                    aria-hidden
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                )}
                <FactionShield faction={faction} size="lg" />
                <span
                  className={cn(
                    'text-center text-[11px] leading-tight font-semibold text-muted',
                    isSelected && 'font-bold text-fg',
                  )}
                >
                  {t(`factions.${faction}`)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <ModalShell
      closing={closing}
      onClose={close}
      className="max-w-[min(92vw,420px)] items-stretch"
    >
      <h3 className="m-0 text-center">{t('lobby.pickSides')}</h3>
      {renderSide('human', left, right.faction)}
      {renderSide('bot', right, left.faction)}
      <ModalActions
        cancelLabel={t('lobby.cancel')}
        confirmLabel={t('lobby.startGame')}
        onCancel={close}
        onConfirm={() =>
          onConfirm({
            humanFaction: left.faction,
            botFaction: right.faction,
            humanController: left.controller,
            botController: right.controller,
          })
        }
      />
    </ModalShell>
  );
}

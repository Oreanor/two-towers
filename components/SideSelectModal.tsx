'use client';

import { useState } from 'react';
import { useAnimatedClose } from './useAnimatedClose';
import { useI18n } from '@/lib/i18n';
import {
  FACTIONS,
  factionAsset,
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
      <div className="side-select-modal__section">
        <h4 className="side-select-modal__label">
          {boardSide === 'human' ? t('lobby.sideLeft') : t('lobby.sideRight')}
        </h4>
        <div className="side-select-modal__controller">
          <button
            type="button"
            className={`side-select-modal__ctrl${
              setup.controller === 'human'
                ? ' side-select-modal__ctrl--selected'
                : ''
            }`}
            onClick={() => setController(boardSide, 'human')}
            aria-pressed={setup.controller === 'human'}
          >
            {t('lobby.playerHuman')}
          </button>
          <button
            type="button"
            className={`side-select-modal__ctrl${
              setup.controller === 'ai'
                ? ' side-select-modal__ctrl--selected'
                : ''
            }`}
            onClick={() => setController(boardSide, 'ai')}
            aria-pressed={setup.controller === 'ai'}
          >
            {t('lobby.playerBot')}
          </button>
        </div>
        <div className="side-select-modal__grid">
          {FACTIONS.map((faction) => {
            const isTaken = faction === otherFaction;
            const isSelected = faction === setup.faction;
            return (
              <button
                key={faction}
                type="button"
                className={`side-select-modal__item${
                  isSelected ? ' side-select-modal__item--selected' : ''
                }${isTaken ? ' side-select-modal__item--taken' : ''}`}
                onClick={() => !isTaken && setFaction(boardSide, faction)}
                disabled={isTaken}
                aria-pressed={isSelected}
                aria-label={t(`factions.${faction}`)}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={factionAsset(faction, 'shield')}
                  alt=""
                  draggable={false}
                />
                <span>{t(`factions.${faction}`)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`modal-backdrop ${closing ? 'modal-backdrop--out' : ''}`}
      onClick={close}
    >
      <div
        className={`modal side-select-modal ${closing ? 'modal--out' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="side-select-modal__title">{t('lobby.pickSides')}</h3>
        {renderSide('human', left, right.faction)}
        {renderSide('bot', right, left.faction)}
        <div className="create-actions">
          <button className="btn btn--ghost" onClick={close}>
            {t('lobby.cancel')}
          </button>
          <button
            className="btn btn--primary"
            onClick={() =>
              onConfirm({
                humanFaction: left.faction,
                botFaction: right.faction,
                humanController: left.controller,
                botController: right.controller,
              })
            }
          >
            {t('lobby.startGame')}
          </button>
        </div>
      </div>
    </div>
  );
}

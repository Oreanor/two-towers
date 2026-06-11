'use client';

import { useState } from 'react';
import { useAnimatedClose } from './useAnimatedClose';
import { useI18n } from '@/lib/i18n';
import {
  FACTIONS,
  factionAsset,
  type FactionId,
} from '@/lib/game/factions';

type Side = 'human' | 'bot';

export default function SideSelectModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (humanFaction: FactionId, botFaction: FactionId) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { closing, close } = useAnimatedClose(onClose);
  const [humanFaction, setHumanFaction] = useState<FactionId>('gondor');
  const [botFaction, setBotFaction] = useState<FactionId>('mordor');

  function renderGrid(side: Side, selected: FactionId, taken: FactionId) {
    const onSelect = side === 'human' ? setHumanFaction : setBotFaction;
    return (
      <div className="side-select-modal__section">
        <h4 className="side-select-modal__label">
          {side === 'human' ? t('lobby.yourSide') : t('lobby.botSide')}
        </h4>
        <div className="side-select-modal__grid">
          {FACTIONS.map((faction) => {
            const isTaken = faction === taken;
            const isSelected = faction === selected;
            return (
              <button
                key={faction}
                type="button"
                className={`side-select-modal__item${
                  isSelected ? ' side-select-modal__item--selected' : ''
                }${isTaken ? ' side-select-modal__item--taken' : ''}`}
                onClick={() => !isTaken && onSelect(faction)}
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
        {renderGrid('human', humanFaction, botFaction)}
        {renderGrid('bot', botFaction, humanFaction)}
        <div className="create-actions">
          <button className="btn btn--ghost" onClick={close}>
            {t('lobby.cancel')}
          </button>
          <button
            className="btn btn--primary"
            onClick={() => onConfirm(humanFaction, botFaction)}
          >
            {t('lobby.startGame')}
          </button>
        </div>
      </div>
    </div>
  );
}

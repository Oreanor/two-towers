'use client';

import { useState } from 'react';
import { Globe, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { LANGS, useI18n, type Lang } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';

/** Settings button that opens theme, language and sign-out. */
export default function UserMenu({
  name,
  onLogout,
}: {
  name?: string;
  onLogout: () => void;
}) {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="usermenu">
      <button
        className="icon-btn usermenu__trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('lobby.settings')}
      >
        <Settings size={22} strokeWidth={2} />
      </button>

      {open && (
        <>
          <div className="usermenu__overlay" onClick={() => setOpen(false)} />
          <div className="usermenu__panel" role="menu">
            {name && <div className="usermenu__name">{name}</div>}

            <button className="usermenu__item" role="menuitem" onClick={toggle}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{t('lobby.theme')}</span>
            </button>

            <label className="usermenu__item usermenu__item--lang">
              <Globe size={18} />
              <span>{t('lobby.language')}</span>
              <select
                className="usermenu__lang"
                value={lang}
                onChange={(e) => setLang(e.target.value as Lang)}
              >
                {LANGS.map((code) => (
                  <option key={code} value={code}>
                    {t(`languages.${code}`)}
                  </option>
                ))}
              </select>
            </label>

            <button
              className="usermenu__item usermenu__item--danger"
              role="menuitem"
              onClick={onLogout}
            >
              <LogOut size={18} />
              <span>{t('lobby.logout')}</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

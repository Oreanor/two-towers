'use client';

import { useState } from 'react';
import { Box, Globe, LogOut, Moon, Settings, Sun } from 'lucide-react';
import { LANGS, useI18n, type Lang } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useBoardView, type BoardView } from '@/lib/view';
import { cn } from '@/lib/cn';
import IconButton from '@/components/ui/IconButton';

const MENU_ITEM =
  'flex w-full items-center gap-2.5 rounded-[9px] px-3 py-2.5 text-left text-sm font-semibold text-fg hover:bg-hover-overlay';

export default function UserMenu({
  name,
  onLogout,
}: {
  name?: string;
  onLogout: () => void;
}) {
  const { t, lang, setLang } = useI18n();
  const { theme, toggle } = useTheme();
  const { view, setView } = useBoardView();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <IconButton
        className="p-0 hover:bg-card"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('lobby.settings')}
      >
        <Settings size={22} strokeWidth={2} />
      </IconButton>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="absolute top-[calc(100%+8px)] right-0 z-[41] flex min-w-[220px] flex-col gap-0.5 rounded-[14px] bg-card p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
            role="menu"
          >
            {name && (
              <div className="mb-1 border-b border-divider px-3 py-2 pb-2.5 text-[15px] font-bold break-words [overflow-wrap:anywhere]">
                {name}
              </div>
            )}

            <button className={cn(MENU_ITEM, 'cursor-pointer border-none bg-transparent')} role="menuitem" onClick={toggle}>
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span>{t('lobby.theme')}</span>
            </button>

            <label className={cn(MENU_ITEM, 'cursor-default')}>
              <Box size={18} />
              <span>{t('lobby.boardView')}</span>
              <select
                className="ml-auto cursor-pointer rounded-lg border-none bg-[var(--bg)] px-1.5 py-1 text-[13px] font-semibold text-fg"
                value={view}
                onChange={(e) => setView(e.target.value as BoardView)}
              >
                <option value="2d">{t('lobby.view2d')}</option>
                <option value="3d">{t('lobby.view3d')}</option>
              </select>
            </label>

            <label className={cn(MENU_ITEM, 'cursor-default')}>
              <Globe size={18} />
              <span>{t('lobby.language')}</span>
              <select
                className="ml-auto cursor-pointer rounded-lg border-none bg-[var(--bg)] px-1.5 py-1 text-[13px] font-semibold text-fg"
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
              className={cn(MENU_ITEM, 'cursor-pointer border-none bg-transparent text-danger')}
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

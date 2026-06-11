'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { cn } from '@/lib/cn';
import IconButton from '@/components/ui/IconButton';
import RulesModal from '@/components/RulesModal';
import UserMenu from './UserMenu';

export default function AppHeader({
  name,
  onLogout,
  className,
}: {
  name?: string;
  onLogout: () => void;
  className?: string;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const [rulesOpen, setRulesOpen] = useState(false);

  return (
    <>
      <header className={cn('flex items-center justify-between gap-2', className)}>
        <button
          className="flex cursor-pointer items-center gap-2 border-none bg-transparent p-0 text-[17px] font-extrabold tracking-wide text-fg"
          onClick={() => router.push('/')}
          aria-label="Two Towers"
          title="Two Towers"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="block h-7 w-auto invert [[data-theme=light]_&]:invert-0"
            src="/assets/logo.png"
            alt="Two Towers"
            draggable={false}
          />
        </button>
        <div className="flex items-center gap-2.5">
          <IconButton
            onClick={() => setRulesOpen(true)}
            aria-label={t('lobby.help')}
            title={t('lobby.help')}
          >
            <HelpCircle size={18} />
          </IconButton>
          <UserMenu name={name} onLogout={onLogout} />
        </div>
      </header>
      {rulesOpen && <RulesModal onClose={() => setRulesOpen(false)} />}
    </>
  );
}

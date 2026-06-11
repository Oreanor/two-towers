import { factionAsset, type FactionId } from '@/lib/game/factions';
import { cn } from '@/lib/cn';

const SIZES = {
  sm: 'size-[22px]',
  md: 'size-12',
  lg: 'size-14',
} as const;

type Props = {
  faction: FactionId;
  size?: keyof typeof SIZES;
  className?: string;
};

export default function FactionShield({
  faction,
  size = 'sm',
  className,
}: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      className={cn(
        'pointer-events-none object-contain drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)] select-none',
        SIZES[size],
        size === 'md' && 'drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]',
        size === 'lg' && 'drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]',
        className,
      )}
      src={factionAsset(faction, 'shield')}
      alt=""
      draggable={false}
    />
  );
}

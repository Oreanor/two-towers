'use client';

import { useParams } from 'next/navigation';
import GameScreen from '@/components/screens/GameScreen';
import RequireAuth from '@/components/RequireAuth';

export default function PlayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  return (
    <RequireAuth>
      {/* Key by id so navigating between games remounts with fresh state. */}
      <GameScreen key={gameId} gameId={gameId} />
    </RequireAuth>
  );
}

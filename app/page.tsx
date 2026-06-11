import LobbyScreen from '@/components/screens/LobbyScreen';
import RequireAuth from '@/components/RequireAuth';

export default function Home() {
  return (
    <RequireAuth>
      <LobbyScreen />
    </RequireAuth>
  );
}

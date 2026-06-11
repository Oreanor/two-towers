import StatsScreen from '@/components/screens/StatsScreen';
import RequireAuth from '@/components/RequireAuth';

export default function StatsPage() {
  return (
    <RequireAuth>
      <StatsScreen />
    </RequireAuth>
  );
}

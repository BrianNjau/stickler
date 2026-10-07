import { Stack } from 'expo-router';

import { IntakeProvider } from '@/features/intake';
import { useReducedMotion } from '@/ui';

// Goal intake: one question per screen, inside the tabs so the nav never disappears.
export default function IntakeLayout() {
  const reduced = useReducedMotion();
  return (
    <IntakeProvider>
      <Stack screenOptions={{ headerShown: false, animation: reduced ? 'none' : 'default' }} />
    </IntakeProvider>
  );
}

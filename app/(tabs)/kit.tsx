import { Redirect } from 'expo-router';

import { KitScreen } from '@/features/kit';

/** Dev only: the WP2.7 primitives on one screen. Production builds go straight to Today. */
export default function KitRoute() {
  if (!__DEV__) return <Redirect href="/" />;
  return <KitScreen />;
}

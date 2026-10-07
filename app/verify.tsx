import { useLocalSearchParams } from 'expo-router';

import { CodeScreen } from '@/features/auth';

export default function VerifyRoute() {
  const { email } = useLocalSearchParams<{ email?: string }>();
  return <CodeScreen email={email ?? ''} mode="signin" />;
}

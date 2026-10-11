import { router } from 'expo-router';

import { Button, EmptyState, Screen, ScreenHeader } from '@/ui';

import { sessionCopy as copy } from './copy';

/** The Focus tab with nothing running: Nimbus, one line, one way forward. */
export function FocusIdle() {
  return (
    <Screen>
      <ScreenHeader title="Focus" />
      <EmptyState hero mascot={{ persona: 'nimbus', mood: 'sleep' }} line={copy.idle.line} action={{ label: copy.idle.action, onPress: () => router.navigate('/') }} />
      {__DEV__ && (
        <Button
          label={copy.devPreview}
          variant="secondary"
          size="md"
          onPress={() => router.push({ pathname: '/session', params: { preview: '1' } })}
        />
      )}
    </Screen>
  );
}

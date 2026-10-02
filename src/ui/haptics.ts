import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

import { haptics } from './tokens';

export type HapticEvent = keyof typeof haptics | 'press';

/** Fire-and-forget. Web has no haptics; failures (e.g. low power mode) are ignored. */
export function haptic(event: HapticEvent): void {
  if (Platform.OS === 'web') return;
  const kind = event === 'press' ? 'light' : haptics[event];
  const run =
    kind === 'light'
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      : kind === 'heavy'
        ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
        : Haptics.notificationAsync(
            kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning,
          );
  run.catch(() => {});
}

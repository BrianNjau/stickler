import { X } from './icons';
import { useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { useReducedMotion } from './motion';
import { Text } from './Text';
import { useTheme } from './theme';
import { motion, radius, shadow, size, space } from './tokens';

export interface SheetProps {
  visible: boolean;
  title: string;
  onClose: () => void;
  children?: ReactNode;
}

const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;

/**
 * Bottom sheet. Nothing traps the user: it closes by swipe-down, by the × button, by tapping
 * the backdrop, and by the system back gesture / Escape.
 */
export function Sheet({ visible, title, onClose, children }: SheetProps) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { height } = useWindowDimensions();
  // Stays mounted after `visible` turns false until the exit animation has finished.
  const [mounted, setMounted] = useState(visible);
  if (visible && !mounted) setMounted(true);

  const y = useSharedValue(height);
  const dim = useSharedValue(0);
  const duration = reduced ? 0 : motion.enter;

  useEffect(() => {
    if (visible) {
      y.set(withTiming(0, { duration }));
      dim.set(withTiming(1, { duration }));
    } else {
      dim.set(withTiming(0, { duration }));
      y.set(
        withTiming(height, { duration }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, duration, height, y, dim]);

  const pan = Gesture.Pan()
    .activeOffsetY(8)
    .onUpdate((e) => {
      y.set(Math.max(0, e.translationY));
    })
    .onEnd((e) => {
      if (e.translationY > DISMISS_DISTANCE || e.velocityY > DISMISS_VELOCITY) {
        scheduleOnRN(onClose);
      } else {
        y.set(withTiming(0, { duration: motion.state }));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: dim.get() * 0.55 }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.fill}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.focusBg }, backdropStyle]}>
          <Pressable
            style={styles.fill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close sheet"
          />
        </Animated.View>

        <View style={styles.dock} pointerEvents="box-none">
          <GestureDetector gesture={pan}>
            <Animated.View
              accessibilityViewIsModal
              style={[
                styles.sheet,
                shadow.sheet,
                { backgroundColor: theme.surface, paddingBottom: space.xl + insets.bottom },
                sheetStyle,
              ]}
            >
              <View style={[styles.handle, { backgroundColor: theme.line2 }]} />
              <View style={styles.header}>
                <Text variant="h2" accessibilityRole="header" style={styles.title}>
                  {title}
                </Text>
                <Pressable
                  onPress={onClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                  hitSlop={8}
                  style={[styles.close, { backgroundColor: theme.surface2 }]}
                >
                  <X size={18} color={theme.ink} strokeWidth={2.4} />
                </Pressable>
              </View>
              {children}
            </Animated.View>
          </GestureDetector>
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  dock: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  sheet: {
    width: '100%',
    maxWidth: 640,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: size.gutter,
    paddingTop: space.sm,
    gap: space.lg,
  },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: radius.pill },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  title: { flex: 1 },
  close: {
    width: size.hit,
    height: size.hit,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

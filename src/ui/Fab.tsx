import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';

import { LiveGradient } from './gradient';
import { haptic } from './haptics';
import { Plus, type LucideIcon } from './icons';
import { useMotion } from './motion';
import { useTheme } from './theme';
import { fabShadow, motion, size, space } from './tokens';

const FAB = 60;
const FAB_RADIUS = 22;
/** Screen's column width (src/ui/Screen.tsx). */
const CONTENT_MAX = 640;

export interface FabProps {
  label: string;
  onPress: () => void;
  icon?: LucideIcon;
}

/**
 * The floating action: 60 px, radius 22, the live gradient, an amber-tinted shadow, bottom-right
 * above the tab bar. Render it in a Screen's `overlay`. It never appears during a session (the
 * session screen is full-screen and has no FAB).
 */
export function Fab({ label, onPress, icon: Icon = Plus }: FabProps) {
  const { theme } = useTheme();
  const m = useMotion();
  const scale = useSharedValue(1);
  const { width } = useWindowDimensions();
  // On wide screens the content is a centred 640 column: the FAB sits at that column's edge.
  const right = Math.max(size.gutter, (width - CONTENT_MAX) / 2 + size.gutter);
  const press = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View style={[styles.wrap, { right }, fabShadow, press]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={() => scale.set(m.timing(0.92, motion.press))}
        onPressOut={() => scale.set(m.bounce(1))}
        onPress={() => {
          haptic('press');
          onPress();
        }}
        style={styles.button}
      >
        <LiveGradient radius={FAB_RADIUS} />
        {/* Positioned, so it paints above the (absolutely positioned) gradient on web too. */}
        <View style={styles.icon}>
          <Icon size={26} color={theme.amberInk} strokeWidth={2.6} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', bottom: space.xl, width: FAB, height: FAB, borderRadius: FAB_RADIUS },
  icon: { position: 'relative', zIndex: 1 },
  button: { width: FAB, height: FAB, borderRadius: FAB_RADIUS, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});

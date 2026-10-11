import { useEffect } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { G, Polygon } from 'react-native-svg';

import { Burst } from './Burst';
import { Button } from './Button';
import { haptic } from './haptics';
import { useMotion } from './motion';
import { chime } from './sound';
import { StatNumber } from './StatNumber';
import { Text } from './Text';
import { useTheme } from './theme';
import { glow, palette, space } from './tokens';

const RAYS = 14;
const RAY_BOX = 520;

function Rays() {
  const m = useMotion();
  const spin = useSharedValue(0);
  useEffect(() => {
    spin.set(m.animate(0, ({ withRepeat, withTiming, Easing }) => withRepeat(withTiming(360, { duration: 24000, easing: Easing.linear }), -1, false)));
  }, [m, spin]);
  const turn = useAnimatedStyle(() => ({ transform: [{ rotate: `${spin.get()}deg` }] }));
  const c = RAY_BOX / 2;
  return (
    <Animated.View pointerEvents="none" style={[styles.rays, turn]}>
      <Svg width={RAY_BOX} height={RAY_BOX}>
        <G opacity={0.16}>
          {Array.from({ length: RAYS }, (_, i) => {
            const a = (i / RAYS) * Math.PI * 2;
            const w = Math.PI / RAYS / 1.6;
            const p = (ang: number) => `${c + Math.cos(ang) * c},${c + Math.sin(ang) * c}`;
            return <Polygon key={i} points={`${c},${c} ${p(a - w)} ${p(a + w)}`} fill={glow.color} />;
          })}
        </G>
      </Svg>
    </Animated.View>
  );
}

/**
 * Level up: a full-screen takeover. Rays turn slowly, the level counts up from the old one, a
 * burst, a heavy haptic and the chime. Under Reduce Motion the rays hold still and the number is
 * simply the new level. Tap anywhere, or the button, to carry on.
 */
export function LevelUp({ from, to, title, line, onClose }: { from: number; to: number; title: string; line: string; onClose: () => void }) {
  const { isDark } = useTheme();
  useEffect(() => {
    haptic('crate');
    chime();
  }, []);
  const ink = palette.light.inkOn;
  // A Modal, so the takeover covers everything, the tab bar included.
  return (
    <Modal transparent visible animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <Pressable
        style={[styles.fill, { backgroundColor: isDark ? palette.dark.focusBg : palette.light.ink }]}
        onPress={onClose}
        accessibilityViewIsModal
        accessibilityLabel={`${title}. Level ${to}. ${line}`}
      >
        <Rays />
        <View style={styles.center}>
          <Text variant="label" fg={palette.light.amber}>
            {title}
          </Text>
          <View style={styles.numberBox}>
            <Burst distance={120} size={10} />
            <StatNumber value={to} from={from} variant="display" fg={ink} style={styles.number} />
          </View>
          <Text variant="h2" fg={ink} style={styles.line}>
            {line}
          </Text>
          <Button label="Carry on" variant="secondary" size="md" block={false} onPress={onClose} style={styles.cta} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 50, overflow: 'hidden' },
  rays: { position: 'absolute', width: RAY_BOX, height: RAY_BOX },
  center: { alignItems: 'center', gap: space.lg, paddingHorizontal: space.xxl },
  numberBox: { alignItems: 'center', justifyContent: 'center', minWidth: 160, minHeight: 130 },
  number: { fontSize: 112, lineHeight: 120 },
  line: { textAlign: 'center' },
  cta: { alignSelf: 'center' },
});

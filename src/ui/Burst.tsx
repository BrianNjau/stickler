import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, type SharedValue } from 'react-native-reanimated';

import { useMotion } from './motion';
import { burstColors } from './tokens';

const PIECES = 12;

function Piece({ i, t, distance, sizePx }: { i: number; t: SharedValue<number>; distance: number; sizePx: number }) {
  const angle = (i / PIECES) * Math.PI * 2 + (i % 2 ? 0.18 : -0.12);
  const reach = distance * (i % 3 === 0 ? 1.15 : i % 3 === 1 ? 0.9 : 1);
  const look = useAnimatedStyle(() => {
    const p = t.get();
    return {
      opacity: p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85,
      transform: [
        { translateX: Math.cos(angle) * reach * p },
        { translateY: Math.sin(angle) * reach * p },
        { rotate: `${p * (i % 2 ? 160 : -140)}deg` },
        { scale: 1 - p * 0.4 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.piece,
        { width: sizePx, height: i % 2 ? sizePx : sizePx * 0.55, borderRadius: i % 3 === 0 ? sizePx : 1.5, backgroundColor: burstColors[i % burstColors.length] },
        look,
      ]}
    />
  );
}

/**
 * The boss burst: 12 pieces fly out from the centre of the parent and fade. Mount it to fire it
 * once; `onDone` tells the parent to unmount. Never rendered under Reduce Motion.
 */
export function Burst({ distance = 38, size: sizePx = 7, onDone }: { distance?: number; size?: number; onDone?: () => void }) {
  const m = useMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(m.animate(1, ({ withTiming, Easing }) => withTiming(1, { duration: 650, easing: Easing.out(Easing.quad) })));
    const id = setTimeout(() => onDone?.(), 700);
    return () => clearTimeout(id);
    // Fires once per mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (m.reduced) return null;
  return (
    <View pointerEvents="none" style={styles.origin}>
      {Array.from({ length: PIECES }, (_, i) => (
        <Piece key={i} i={i} t={t} distance={distance} sizePx={sizePx} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  origin: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  piece: { position: 'absolute' },
});

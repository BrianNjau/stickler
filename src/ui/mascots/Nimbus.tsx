import { useEffect } from 'react';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Line, Path, Text as SvgText } from 'react-native-svg';

import { useReducedMotion } from '../motion';
import { palette, skillColors } from '../tokens';
import { useBlink } from './useBlink';

export type NimbusMood = 'idle' | 'focus' | 'happy' | 'sad' | 'cool' | 'sleep';

export interface NimbusProps {
  mood?: NimbusMood;
  /** Rendered width in px; height follows the 80×60 artboard. */
  size?: number;
}

// Nimbus keeps the same colours in light and dark: it is a character, not a surface.
const c = {
  body: palette.light.surface,
  outline: palette.light.line2,
  ink: palette.light.ink,
  cheek: palette.light.onBlush,
  rain: skillColors[0].solid,
  zzz: palette.light.ink3,
};

export function Nimbus({ mood = 'idle', size = 80 }: NimbusProps) {
  const reduced = useReducedMotion();
  const blinking = useBlink(!reduced && mood !== 'sleep', 4500, 140);
  const y = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(y);
    y.set(0);
    if (reduced) return;
    const ease = { easing: Easing.inOut(Easing.sin) };
    if (mood === 'focus' || mood === 'cool') {
      y.set(withRepeat(withSequence(withTiming(-4, { duration: 1600, ...ease }), withTiming(0, { duration: 1600, ...ease })), -1));
    } else if (mood === 'happy') {
      y.set(withRepeat(withSequence(withTiming(-10, { duration: 220 }), withTiming(0, { duration: 380 })), 2));
    } else if (mood === 'sleep') {
      y.set(withRepeat(withSequence(withTiming(-2, { duration: 2400, ...ease }), withTiming(0, { duration: 2400, ...ease })), -1));
    }
  }, [mood, reduced, y]);

  const motionStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const eyeRy = mood === 'sleep' || blinking ? 0.45 : 3.6;
  const mouth = { stroke: c.ink, strokeWidth: 2.4, strokeLinecap: 'round' as const, fill: 'none' };

  return (
    <Animated.View style={[{ width: size, height: (size * 60) / 80 }, motionStyle]} accessible={false}>
      <Svg width="100%" height="100%" viewBox="0 0 80 60">
        <Path
          d="M18 50c-8 0-14-6-14-13 0-7 5-12 12-13 1-9 9-16 19-16 8 0 14 4 17 11 1 0 2 0 3 0 8 0 15 7 15 15 0 9-7 16-15 16z"
          fill={c.body}
          stroke={c.outline}
          strokeWidth={1.5}
        />
        {mood === 'happy' && (
          <G opacity={0.35}>
            <Circle cx={25} cy={38} r={3.5} fill={c.cheek} />
            <Circle cx={54} cy={38} r={3.5} fill={c.cheek} />
          </G>
        )}
        <Ellipse cx={32} cy={31} rx={2.8} ry={eyeRy} fill={c.ink} />
        <Ellipse cx={47} cy={31} rx={2.8} ry={eyeRy} fill={c.ink} />
        {mood === 'cool' && (
          <Path d="M24 27h31v3c0 4-3 6-6.5 6S43 34 42 31h-5c-1 3-3 5-6.5 5S24 34 24 30z" fill={c.ink} />
        )}

        {(mood === 'idle' || mood === 'sleep') && <Path d="M35 41h9" {...mouth} />}
        {(mood === 'focus' || mood === 'cool') && <Path d="M34 40q5.5 4 11 0" {...mouth} />}
        {mood === 'happy' && <Path d="M33 39q6.5 7 13 0z" fill={c.ink} />}
        {mood === 'sad' && <Path d="M34 43q5.5-4 11 0" {...mouth} />}

        {mood === 'sad' && (
          <G stroke={c.rain} strokeWidth={2} strokeLinecap="round">
            <Line x1={26} y1={53} x2={25} y2={57} />
            <Line x1={40} y1={53} x2={39} y2={57} />
            <Line x1={54} y1={53} x2={53} y2={57} />
          </G>
        )}
        {mood === 'sleep' && (
          <SvgText x={62} y={10} fontSize={11} fontWeight="700" fill={c.zzz}>
            z z
          </SvgText>
        )}
      </Svg>
    </Animated.View>
  );
}

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
import type { TintName } from '../theme';
import { palette, skillColors } from '../tokens';
import { useBlink } from './useBlink';

export type NimbusMood = 'idle' | 'focus' | 'happy' | 'sad' | 'cool' | 'sleep';

export interface NimbusProps {
  mood?: NimbusMood;
  /** Rendered width in px; height follows the 80×60 artboard. */
  size?: number;
  /** Body colour. On the artboards Nimbus takes the tint of the bubble or card it sits beside. */
  fill?: TintName | 'paper';
}

// Drawn to docs/design (Intro 3, Sign in): ink outline, tinted body, peach cheeks when pleased.
// Colours are fixed across themes: Nimbus is a character, not a surface.
const c = {
  ink: palette.light.ink,
  cheek: palette.light.amber,
  rain: skillColors[0].solid,
  zzz: palette.light.ink3,
};

const BODY =
  'M18 50c-8 0-14-6-14-13 0-7 5-12 12-13 1-9 9-16 19-16 8 0 14 4 17 11 1 0 2 0 3 0 8 0 15 7 15 15 0 9-7 16-15 16z';

export function Nimbus({ mood = 'idle', size = 80, fill = 'paper' }: NimbusProps) {
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
  const eyeRy = mood === 'sleep' || blinking ? 0.45 : 3.4;
  const body = fill === 'paper' ? palette.light.ground : palette.light[fill];
  const mouth = { stroke: c.ink, strokeWidth: 2.6, strokeLinecap: 'round' as const, fill: 'none' };

  return (
    <Animated.View style={[{ width: size, height: (size * 60) / 80 }, motionStyle]} accessible={false}>
      <Svg width="100%" height="100%" viewBox="0 0 80 60">
        <Path d={BODY} fill={body} stroke={c.ink} strokeWidth={3} strokeLinejoin="round" />
        {mood === 'happy' && (
          <G opacity={0.45}>
            <Circle cx={24} cy={38} r={3.8} fill={c.cheek} />
            <Circle cx={56} cy={38} r={3.8} fill={c.cheek} />
          </G>
        )}
        <Ellipse cx={33} cy={30} rx={2.6} ry={eyeRy} fill={c.ink} />
        <Ellipse cx={47} cy={30} rx={2.6} ry={eyeRy} fill={c.ink} />
        {mood === 'cool' && (
          <Path d="M24 26h31v3c0 4-3 6-6.5 6S43 33 42 30h-5c-1 3-3 5-6.5 5S24 33 24 29z" fill={c.ink} />
        )}

        {(mood === 'idle' || mood === 'sleep') && <Path d="M35.5 40h9" {...mouth} />}
        {(mood === 'focus' || mood === 'cool') && <Path d="M34.5 38.5q5.5 4.5 11 0" {...mouth} />}
        {mood === 'happy' && <Path d="M34 37.5q6 7 12 0z" fill={c.ink} stroke={c.ink} strokeWidth={1} strokeLinejoin="round" />}
        {mood === 'sad' && <Path d="M34.5 42q5.5-4 11 0" {...mouth} />}

        {mood === 'sad' && (
          <G stroke={c.rain} strokeWidth={2} strokeLinecap="round">
            <Line x1={26} y1={54} x2={25} y2={58} />
            <Line x1={40} y1={54} x2={39} y2={58} />
            <Line x1={54} y1={54} x2={53} y2={58} />
          </G>
        )}
        {mood === 'sleep' && (
          <SvgText x={62} y={9} fontSize={11} fontWeight="700" fill={c.zzz}>
            z z
          </SvgText>
        )}
      </Svg>
    </Animated.View>
  );
}

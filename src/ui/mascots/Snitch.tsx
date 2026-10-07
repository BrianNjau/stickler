import { useEffect, useId } from 'react';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect, Text as SvgText } from 'react-native-svg';

import { useReducedMotion } from '../motion';
import { useTheme } from '../theme';
import { palette } from '../tokens';
import { useBlink } from './useBlink';

export type SnitchMood = 'asleep' | 'watch' | 'angry';

export interface SnitchProps {
  mood?: SnitchMood;
  /** Rendered width and height in px (80×80 artboard). */
  size?: number;
}

// Drawn to docs/design (Intro 3, Sign in): a rounded camera tile, one lens, one LED, and brows
// for when it has opinions. Fixed colours: the Snitch is the same camera in both themes.
const c = {
  housing: palette.light.ink,
  lens: palette.dark.ink,
  iris: palette.light.snitch,
  pupil: palette.light.snitchBg,
  glint: palette.light.surface,
  led: palette.dark.snitch,
  ledOff: palette.light.ink2,
  zz: palette.dark.ink3,
};

const LENS = { cx: 40, cy: 44, r: 22 };

export function Snitch({ mood = 'watch', size = 80 }: SnitchProps) {
  const reduced = useReducedMotion();
  const { isDark } = useTheme();
  const clipId = `lens${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const lidBlink = useBlink(!reduced && mood === 'watch', 7000, 180);
  const ledDim = useBlink(!reduced && mood !== 'asleep', 1200, 600);
  const tilt = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(tilt);
    tilt.set(0);
    if (reduced || mood !== 'angry') return;
    tilt.set(
      withRepeat(
        withSequence(
          withTiming(-3, { duration: 60 }),
          withTiming(3, { duration: 60 }),
          withTiming(-2, { duration: 60 }),
          withTiming(0, { duration: 60 }),
          withDelay(2100, withTiming(0, { duration: 0 })),
        ),
        -1,
      ),
    );
  }, [mood, reduced, tilt]);

  const motionStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${tilt.get()}deg` }] }));

  const lid = mood === 'asleep' || lidBlink ? 1 : 0;
  const ledOn = mood !== 'asleep' && !ledDim;

  return (
    <Animated.View accessible={false} style={[{ width: size, height: size }, motionStyle]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 80 80"
        style={mood === 'asleep' ? { opacity: 0.8, transform: [{ scale: 0.86 }] } : undefined}
      >
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={LENS.cx} cy={LENS.cy} r={LENS.r} />
          </ClipPath>
        </Defs>
        {/* On a dark ground the ink tile needs an edge to stay a tile. */}
        <Rect
          x={4}
          y={4}
          width={72}
          height={72}
          rx={19}
          fill={c.housing}
          stroke={isDark ? palette.dark.line2 : undefined}
          strokeWidth={isDark ? 1.5 : 0}
        />
        <Circle cx={LENS.cx} cy={LENS.cy} r={LENS.r} fill={c.lens} />
        <G clipPath={`url(#${clipId})`}>
          <Circle cx={LENS.cx} cy={LENS.cy} r={11.5} fill={c.iris} />
          <Circle cx={LENS.cx} cy={LENS.cy} r={5.5} fill={c.pupil} />
          <Circle cx={44.5} cy={39.5} r={2.2} fill={c.glint} />
          {lid > 0 && <Rect x={18} y={22} width={44} height={44 * lid} fill={c.housing} />}
        </G>
        {mood === 'angry' && (
          <Path d="M16 16 L33 25 M47 25 L62 17" stroke={c.led} strokeWidth={4.5} strokeLinecap="round" fill="none" />
        )}
        <Circle cx={62} cy={17} r={4} fill={ledOn ? c.led : c.ledOff} />
        {mood === 'asleep' && (
          <SvgText x={64} y={12} fontSize={11} fontWeight="700" fill={c.zz}>
            z
          </SvgText>
        )}
      </Svg>
    </Animated.View>
  );
}

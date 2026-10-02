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
import Svg, { Circle, ClipPath, Defs, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { useReducedMotion } from '../motion';
import { palette } from '../tokens';
import { useBlink } from './useBlink';

export type SnitchMood = 'asleep' | 'watch' | 'angry';

export interface SnitchProps {
  mood?: SnitchMood;
  /** Rendered width and height in px (80×80 artboard). */
  size?: number;
}

// Fixed colours: the Snitch is the same camera in both themes.
const c = {
  housing: palette.dark.focusCard,
  edge: palette.dark.line,
  lens: palette.dark.ink,
  iris: palette.light.snitch,
  irisAngry: palette.dark.snitch,
  pupil: palette.light.snitchBg,
  glint: palette.light.surface,
  led: palette.dark.snitch,
  ledOff: palette.light.ink2,
  zz: palette.dark.ink3,
};

const LID_FULL = 42;

export function Snitch({ mood = 'watch', size = 80 }: SnitchProps) {
  const reduced = useReducedMotion();
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

  const lid = mood === 'asleep' ? 1 : mood === 'angry' ? 0.34 : lidBlink ? 1 : 0;
  const ledOn = mood !== 'asleep' && !ledDim;

  return (
    <Animated.View accessible={false} style={[{ width: size, height: size }, motionStyle]}>
      <Svg
        width="100%"
        height="100%"
        viewBox="0 0 80 80"
        style={mood === 'asleep' ? { opacity: 0.8, transform: [{ scale: 0.78 }] } : undefined}
      >
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={40} cy={43} r={20} />
          </ClipPath>
        </Defs>
        <Line x1={24} y1={12} x2={19} y2={4} stroke={c.edge} strokeWidth={3} strokeLinecap="round" />
        <Circle cx={19} cy={4} r={3} fill={c.edge} />
        <Rect x={5} y={11} width={70} height={63} rx={18} fill={c.housing} stroke={c.edge} strokeWidth={1.5} />
        <Circle cx={40} cy={43} r={20} fill={c.lens} />
        <G clipPath={`url(#${clipId})`}>
          <Circle cx={40} cy={43} r={10} fill={mood === 'angry' ? c.irisAngry : c.iris} />
          <Circle cx={40} cy={43} r={4.5} fill={c.pupil} />
          <Circle cx={43.5} cy={39.5} r={2} fill={c.glint} />
          {lid > 0 && <Rect x={19} y={22} width={42} height={LID_FULL * lid} fill={c.housing} />}
        </G>
        <Circle cx={64} cy={21} r={3.5} fill={ledOn ? c.led : c.ledOff} />
        {mood === 'angry' && (
          <Path d="M20 20 L36 27 M60 20 L44 27" stroke={c.led} strokeWidth={3.5} strokeLinecap="round" fill="none" />
        )}
        {mood === 'asleep' && (
          <SvgText x={60} y={9} fontSize={12} fontWeight="700" fill={c.zz}>
            z
          </SvgText>
        )}
      </Svg>
    </Animated.View>
  );
}

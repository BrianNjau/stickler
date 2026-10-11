import { useId } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { glow, liveGradient } from './tokens';

/** SVG ids must be plain: React's useId gives ":r1:". */
export const useSvgId = (prefix: string) => `${prefix}${useId().replace(/[^a-zA-Z0-9]/g, '')}`;

/**
 * The one gradient (docs/POLISH.md §1), 135°. Allowed on exactly four things: a running progress
 * arc (Ring color="live"), the primary action while a session is live, the FAB, and the streak
 * pill. Lint forbids building any other gradient outside this file.
 */
export function LiveGradient({ radius = 0, opacity = 1, style }: { radius?: number; opacity?: number; style?: StyleProp<ViewStyle> }) {
  const id = useSvgId('live');
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LiveGradientDef id={id} />
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={radius} ry={radius} fill={`url(#${id})`} opacity={opacity} />
      </Svg>
    </View>
  );
}

/** The gradient as an SVG <defs> entry, for strokes (the ring's live arc). */
export function LiveGradientDef({ id }: { id: string }) {
  return (
    <LinearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <Stop offset="0" stopColor={liveGradient[0]} />
      <Stop offset="1" stopColor={liveGradient[1]} />
    </LinearGradient>
  );
}

/**
 * The session glow: amber, radial, behind a ring only. `intensity` is the centre opacity
 * (glow.rest = 20%, glow.peak = 32% as a round ends); the parent animates the wrapper.
 */
export function SessionGlow({ size, intensity = glow.rest }: { size: number; intensity?: number }) {
  const id = useSvgId('glow');
  return (
    <View pointerEvents="none" style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={glow.color} stopOpacity={intensity} />
            <Stop offset="0.55" stopColor={glow.color} stopOpacity={intensity * 0.45} />
            <Stop offset="1" stopColor={glow.color} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={size} height={size} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

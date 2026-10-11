import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, G } from 'react-native-svg';

import { LiveGradientDef, useSvgId } from './gradient';
import { useMotion } from './motion';
import { useTheme } from './theme';
import { motion } from './tokens';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export interface RingProps {
  /** 0–1. */
  value: number;
  size: number;
  /** Defaults to the kit: 8 at 86px, 6 at 56px, scaled in between. */
  stroke?: number;
  /** A colour, or 'live' for the gradient (running time only). */
  color: string | 'live';
  /** Track colour; defaults to the theme's `line`. */
  track?: string;
  /** What the ring means, for screen readers ("30% of today"). */
  label: string;
  /** A dot riding the end of the arc (the session ring). */
  knob?: string;
  /** Change this to make the ring pulse once (a round ended). */
  pulse?: number;
  children?: ReactNode;
}

const strokeFor = (size: number) => Math.round(Math.max(3, Math.min(12, 6 + ((size - 56) / 30) * 2)));

/**
 * SVG progress ring. Round caps, track in `line`. The arc springs to its value on mount and on
 * every change, never a linear tween; under Reduce Motion it is simply drawn at its value.
 */
export function Ring({ value, size, stroke = strokeFor(size), color, track, label, knob, pulse = 0, children }: RingProps) {
  const { theme } = useTheme();
  const m = useMotion();
  const gradientId = useSvgId('ring');
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));

  const progress = useSharedValue(m.reduced ? v : 0);
  const scale = useSharedValue(1);

  useEffect(() => {
    progress.set(m.spring(v, { damping: 18, stiffness: 90, mass: 1 }));
  }, [v, m, progress]);

  useEffect(() => {
    if (!pulse) return;
    scale.set(m.animate(1, ({ withSequence, withSpring }) => withSequence(withSpring(1.045, motion.overshoot), withSpring(1, motion.spring))));
  }, [pulse, m, scale]);

  const arc = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - progress.get()) }));
  const dot = useAnimatedProps(() => {
    const a = 2 * Math.PI * progress.get() - Math.PI / 2;
    return { cx: size / 2 + r * Math.cos(a), cy: size / 2 + r * Math.sin(a) };
  });
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Animated.View
      style={[{ width: size, height: size }, pulseStyle]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }}
      aria-valuenow={Math.round(v * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <Svg width={size} height={size}>
        {color === 'live' && (
          <Defs>
            <LiveGradientDef id={gradientId} />
          </Defs>
        )}
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? theme.line} strokeWidth={stroke} fill="none" />
        {/* Start at 12 o'clock. An SVG transform string: web rejects react-native-svg's origin prop. */}
        <G transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={color === 'live' ? `url(#${gradientId})` : color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${c} ${c}`}
            fill="none"
            animatedProps={arc}
          />
        </G>
        {knob && v > 0 && <AnimatedCircle r={stroke * 0.45} fill={knob} animatedProps={dot} />}
      </Svg>
      {children && <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
});

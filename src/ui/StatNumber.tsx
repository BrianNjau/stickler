import { useEffect, useRef, useState } from 'react';

import { useMotion } from './motion';
import { Text, type TextProps } from './Text';
import { motion } from './tokens';

export interface StatNumberProps extends Omit<TextProps, 'children'> {
  value: number;
  /** Count up from here on mount (a level-up), instead of starting at `value`. */
  from?: number;
  /** How the number reads, e.g. (n) => `${n}%` or (n) => n.toLocaleString(). Rounded first. */
  format?: (n: number) => string;
  /** What the number is, for screen readers ("1,240 XP"). Defaults to the formatted value. */
  accessibilityLabel?: string;
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;
const plain = (n: number) => n.toLocaleString();

/**
 * A number that changes animates from the old value to the new one (~600 ms), in tabular numerals
 * so the width never jitters. XP, streak, tokens, percentages: every changing number uses this.
 * Screen readers get the final value at once; Reduce Motion jumps straight to it.
 */
export function StatNumber({ value, from: initial, format = plain, style, accessibilityLabel, ...text }: StatNumberProps) {
  const m = useMotion();
  const [shown, setShown] = useState(m.reduced ? value : (initial ?? value));
  const from = useRef(m.reduced ? value : (initial ?? value));
  const frame = useRef<number | null>(null);

  useEffect(() => {
    if (frame.current != null) cancelAnimationFrame(frame.current);
    const start = from.current;
    if (m.reduced || start === value) {
      from.current = value;
      frame.current = requestAnimationFrame(() => setShown(value));
      return;
    }
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / motion.number);
      const v = start + (value - start) * easeOut(t);
      from.current = v;
      setShown(v);
      if (t < 1) frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current != null) cancelAnimationFrame(frame.current);
    };
  }, [value, m.reduced]);

  const final = format(Math.round(value));
  return (
    <Text
      {...text}
      accessibilityLabel={accessibilityLabel ?? final}
      style={[{ fontVariant: ['tabular-nums'] }, style]}
    >
      {format(Math.round(shown))}
    </Text>
  );
}

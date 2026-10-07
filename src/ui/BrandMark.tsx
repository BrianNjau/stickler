import Svg, { Circle, Path } from 'react-native-svg';

import { palette } from './tokens';

export type BrandMarkWay = 'primary' | 'mono' | 'inverse';

export interface BrandMarkProps {
  /** Rendered size in px. */
  size: number;
  /** Primary on ink, mono on paper, inverse on red (logo sheet). No other backgrounds. */
  way?: BrandMarkWay;
}

const TICK = 'M52 67.5l10.5 10L82 55.5';

// Logo sheet: the ring stroke grows as the mark shrinks.
const ringStroke = (px: number) => (px >= 56 ? 9 : px >= 40 ? 11 : px >= 28 ? 14 : 18);

/** The lens with a tick in it — geometry from assets/brand/stickler-mark.svg. */
export function BrandMark({ size, way = 'primary' }: BrandMarkProps) {
  const p = palette.light;
  // Below 20px the amber ring and the glint go: the mark becomes one colour.
  const small = size < 20;
  const look =
    way === 'inverse'
      ? { field: p.snitch, ring: p.ground, pupil: p.ground, tick: p.snitch }
      : way === 'mono' || small
        ? { field: p.ground, ring: p.ink, pupil: p.ink, tick: p.ground }
        : { field: p.ground, ring: p.amber, pupil: p.snitch, tick: p.ground };

  return (
    <Svg width={size} height={size} viewBox="0 0 132 132" accessible={false}>
      <Circle cx={66} cy={66} r={58} fill={look.field} />
      <Circle cx={66} cy={66} r={58} fill="none" stroke={look.ring} strokeWidth={ringStroke(size)} />
      <Circle cx={66} cy={66} r={31} fill={look.pupil} />
      <Path d={TICK} stroke={look.tick} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {way === 'primary' && !small && <Circle cx={86} cy={44} r={7.5} fill={p.ground} opacity={0.92} />}
    </Svg>
  );
}

import type { CSSProperties, ReactNode } from "react";
import { ringSegmentFractions } from "../domain/activity";

export interface DayRingSegment {
  key: string;
  label: string;
  /** Hours this category contributed to the day. */
  hours: number;
  /** Stroke colour (CSS custom property or hex). */
  color: string;
}

interface DayRingProps {
  segments: DayRingSegment[];
  /**
   * Target hours that "close" the ring. When tracked work reaches the target
   * the ring is full; overtime simply fills it completely (no overflow). The
   * unfilled remainder reads as unaccounted time.
   */
  targetHours: number;
  size?: number;
  stroke?: number;
  /** Angular gap between adjacent category arcs, in degrees. */
  gapDegrees?: number;
  rounded?: boolean;
  trackColor?: string;
  children?: ReactNode;
  ariaLabel?: string;
  className?: string;
}

const TAU = Math.PI * 2;

const pointOnCircle = (center: number, radius: number, fraction: number): [number, number] => {
  // Fraction 0 sits at 12 o'clock; the ring fills clockwise.
  const angle = fraction * TAU - Math.PI / 2;
  return [center + radius * Math.cos(angle), center + radius * Math.sin(angle)];
};

const arcPath = (center: number, radius: number, startFraction: number, endFraction: number) => {
  const [startX, startY] = pointOnCircle(center, radius, startFraction);
  const [endX, endY] = pointOnCircle(center, radius, endFraction);
  const largeArc = endFraction - startFraction > 0.5 ? 1 : 0;
  return `M ${startX.toFixed(3)} ${startY.toFixed(3)} A ${radius} ${radius} 0 ${largeArc} 1 ${endX.toFixed(
    3
  )} ${endY.toFixed(3)}`;
};

/**
 * A single "day ring": one circle whose filled arc is split by activity
 * category (tickets / meetings / firefighting) and whose unfilled remainder is
 * unaccounted time. Closing the ring means the day is fully reconstructed —
 * the colours describe what it was made of. Reused at hero size (Today),
 * standard size (Reports) and mini size (Month grid).
 */
export const DayRing = ({
  segments,
  targetHours,
  size = 78,
  stroke = 9,
  gapDegrees = 2,
  rounded = false,
  trackColor = "var(--line)",
  children,
  ariaLabel,
  className
}: DayRingProps) => {
  const center = size / 2;
  const radius = (size - stroke) / 2;
  const gapFraction = gapDegrees / 360;

  const arcs: { key: string; color: string; d: string }[] = [];
  for (const span of ringSegmentFractions(segments, targetHours)) {
    // Trim each end by half a gap so neighbouring arcs read as distinct, but
    // never shrink a tiny segment out of existence.
    const trim = Math.min(gapFraction / 2, (span.end - span.start) / 2.5);
    const drawStart = span.start + trim;
    const drawEnd = Math.min(span.end - trim, span.start + 0.9999);
    if (drawEnd <= drawStart) {
      continue;
    }
    arcs.push({ key: span.key, color: span.color, d: arcPath(center, radius, drawStart, drawEnd) });
  }

  const style: CSSProperties = { width: size, height: size };

  return (
    <div className={`day-ring${className ? ` ${className}` : ""}`} style={style}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={ariaLabel}>
        <circle cx={center} cy={center} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        {arcs.map((arc) => (
          <path
            key={arc.key}
            d={arc.d}
            fill="none"
            stroke={arc.color}
            strokeWidth={stroke}
            strokeLinecap={rounded ? "round" : "butt"}
          />
        ))}
      </svg>
      {children != null && <div className="day-ring-center">{children}</div>}
    </div>
  );
};

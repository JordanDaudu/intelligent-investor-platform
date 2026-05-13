import { useEffect, useId, useState } from 'react';

interface GoalProgressRingProps {
  /** Completion percentage (0–100). Values outside the range are clamped. */
  percentage: number;
  size?: number;
  strokeWidth?: number;
  /** Optional label rendered below the ring (e.g. status). */
  caption?: string;
  /** Accessible description for the value (defaults to "X% complete"). */
  ariaLabel?: string;
}

const clamp = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return n;
};

export default function GoalProgressRing({
  percentage,
  size = 96,
  strokeWidth = 8,
  caption,
  ariaLabel,
}: GoalProgressRingProps) {
  const target = clamp(percentage);
  const [animated, setAnimated] = useState(0);
  const titleId = useId();

  // Animate from 0 → target on mount + when target changes.
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 600;
    const from = animated;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setAnimated(from + (target - from) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - animated / 100);
  const display = Math.round(target);

  return (
    <div className="goal-ring" data-testid="goal-progress-ring">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>{ariaLabel ?? `${display}% complete`}</title>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--border)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--accent)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.05s linear' }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="central"
          fill="var(--text)"
          fontSize={size * 0.22}
          fontWeight={700}
        >
          {display}%
        </text>
      </svg>
      {caption ? <div className="goal-ring__caption muted">{caption}</div> : null}
    </div>
  );
}

function tone(score: number): string {
  if (score >= 70) return '#16a34a';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

export default function ScoreGauge({ score, label }: { score: number; label?: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div
      className="flex items-center gap-3"
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
      aria-label={label ?? '점수'}
    >
      <svg width="64" height="64" viewBox="0 0 64 64" className="shrink-0">
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="7"
          className="stroke-stone-200 dark:stroke-stone-700"
        />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          stroke={tone(score)}
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          transform="rotate(-90 32 32)"
        />
        <text x="32" y="37" textAnchor="middle" className="fill-current text-[16px] font-bold">
          {score}
        </text>
      </svg>
      {label && <span className="text-sm font-semibold">{label}</span>}
    </div>
  );
}

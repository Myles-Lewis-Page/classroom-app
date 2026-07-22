"use client";

type Slice = { label: string; value: number; color: string };

export default function PieChart({ slices, size = 140 }: { slices: Slice[]; size?: number }) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = size / 2;
  const center = size / 2;

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-full bg-violet-50 text-xs text-slate-400"
        style={{ width: size, height: size }}
      >
        No data
      </div>
    );
  }

  let cumulative = 0;
  const paths = slices
    .filter((s) => s.value > 0)
    .map((slice) => {
      const startAngle = (cumulative / total) * 2 * Math.PI;
      cumulative += slice.value;
      const endAngle = (cumulative / total) * 2 * Math.PI;

      const x1 = center + radius * Math.sin(startAngle);
      const y1 = center - radius * Math.cos(startAngle);
      const x2 = center + radius * Math.sin(endAngle);
      const y2 = center - radius * Math.cos(endAngle);
      const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;

      // Full circle special case (single slice = 100%)
      if (slice.value === total) {
        return (
          <circle key={slice.label} cx={center} cy={center} r={radius} fill={slice.color} />
        );
      }

      return (
        <path
          key={slice.label}
          d={`M ${center} ${center} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`}
          fill={slice.color}
        />
      );
    });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
      </svg>
      <div className="space-y-1">
        {slices.map((s) => (
          <div key={s.label} className="flex items-center gap-2 text-sm">
            <span
              className="w-3 h-3 rounded-full inline-block"
              style={{ backgroundColor: s.color }}
            />
            <span>
              {s.label}: {s.value} ({total > 0 ? Math.round((s.value / total) * 100) : 0}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

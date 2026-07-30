"use client";

// A bar-chart histogram with a fitted bell curve overlaid on top, like the
// classic "distribution of X" chart - bars show the actual counts per bin,
// the smooth curve is a normal distribution fitted to the same values, so
// it's easy to see at a glance where most of the grades actually cluster.

export default function GradeHistogram({
  values,
  width = 320,
  height = 170,
  binSize = 10,
  min = 0,
  max = 100,
  barColor = "#7dd3fc",
  curveColor = "#334155",
}: {
  values: number[];
  width?: number;
  height?: number;
  binSize?: number;
  min?: number;
  max?: number;
  barColor?: string;
  curveColor?: string;
}) {
  const padding = 22;
  const bottomPadding = 16;

  if (values.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded bg-violet-50 text-xs text-slate-400"
        style={{ width, height }}
      >
        No grades yet
      </div>
    );
  }

  const binCount = Math.max(1, Math.ceil((max - min) / binSize));
  const bins = Array.from({ length: binCount }, (_, i) => ({
    start: min + i * binSize,
    count: 0,
  }));
  values.forEach((v) => {
    let idx = Math.floor((v - min) / binSize);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count++;
  });

  const total = values.length;
  const maxBinPct = Math.max(...bins.map((b) => (b.count / total) * 100));

  const mean = values.reduce((s, v) => s + v, 0) / total;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / total;
  const stddev = Math.sqrt(variance) || binSize / 2;

  const innerW = width - padding * 2;
  const innerH = height - padding - bottomPadding;
  const xForValue = (v: number) => padding + ((v - min) / (max - min)) * innerW;

  // The curve's peak height is scaled to roughly match the tallest bar, so
  // the two are visually comparable rather than the curve being a totally
  // different scale.
  const peakPdf = 1 / (stddev * Math.sqrt(2 * Math.PI));
  const scale = peakPdf > 0 ? (maxBinPct * 1.15) / peakPdf : 0;
  const yForPct = (pct: number) => padding + innerH - (pct / (maxBinPct * 1.15)) * innerH;

  const barWidth = innerW / binCount;
  const steps = 50;
  const curvePoints: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = min + (i / steps) * (max - min);
    const pdf = peakPdf * Math.exp(-((x - mean) ** 2) / (2 * stddev * stddev));
    const y = yForPct(pdf * scale);
    curvePoints.push(`${i === 0 ? "M" : "L"} ${xForValue(x)} ${y}`);
  }

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {bins.map((b, i) => {
        const pct = (b.count / total) * 100;
        const barH = maxBinPct > 0 ? (pct / (maxBinPct * 1.15)) * innerH : 0;
        const x = padding + i * barWidth;
        const y = padding + innerH - barH;
        return (
          <rect key={i} x={x + 1} y={y} width={Math.max(barWidth - 2, 1)} height={barH} fill={barColor}>
            <title>
              {b.start}-{b.start + binSize}: {b.count} student{b.count === 1 ? "" : "s"} (
              {Math.round(pct)}%)
            </title>
          </rect>
        );
      })}
      <path d={curvePoints.join(" ")} fill="none" stroke={curveColor} strokeWidth={1.5} />
      <line
        x1={padding}
        y1={padding + innerH}
        x2={width - padding}
        y2={padding + innerH}
        stroke="#cbd5e1"
      />
      {bins.map((b, i) =>
        i % Math.ceil(binCount / 6 || 1) === 0 ? (
          <text
            key={i}
            x={padding + i * barWidth}
            y={height - 4}
            fontSize={8}
            fill="#94a3b8"
          >
            {b.start}
          </text>
        ) : null
      )}
    </svg>
  );
}

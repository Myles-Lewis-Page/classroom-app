"use client";

type Point = { label: string; value: number };

export default function LineChart({
  points,
  width = 220,
  height = 90,
  color = "#7dd3fc",
  min = 0,
  max,
  formatValue,
}: {
  points: Point[];
  width?: number;
  height?: number;
  color?: string;
  min?: number;
  max?: number;
  formatValue?: (v: number) => string;
}) {
  const padding = 8;

  if (points.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded bg-violet-50 text-xs text-slate-400"
        style={{ width, height }}
      >
        No data
      </div>
    );
  }

  const values = points.map((p) => p.value);
  const actualMax = max ?? Math.max(...values, 1);
  const actualMin = Math.min(min, ...values);
  const range = actualMax - actualMin || 1;

  const innerW = width - padding * 2;
  const innerH = height - padding * 2;

  const coords = points.map((p, i) => {
    const x = points.length === 1 ? padding + innerW / 2 : padding + (i / (points.length - 1)) * innerW;
    const y = padding + innerH - ((p.value - actualMin) / range) * innerH;
    return { x, y, ...p };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${padding + innerH} L ${coords[0].x} ${
    padding + innerH
  } Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <path d={areaPath} fill={color} opacity={0.15} />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} />
      {coords.map((c, i) => (
        <circle key={i} cx={c.x} cy={c.y} r={3} fill={color}>
          <title>
            {c.label}: {formatValue ? formatValue(c.value) : c.value}
          </title>
        </circle>
      ))}
    </svg>
  );
}

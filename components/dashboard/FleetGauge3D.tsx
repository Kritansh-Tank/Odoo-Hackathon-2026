'use client';

interface Segment {
  status: string;
  count: number;
  color: string;
}

interface GaugeProps {
  utilization: number;
  segments: Segment[];
}

export default function FleetGauge3D({ utilization, segments }: GaugeProps) {
  const total = segments.reduce((sum, s) => sum + s.count, 0) || 1;

  // Build SVG donut arcs
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 68;
  const innerR = 46;
  const strokeWidth = r - innerR;
  const circumference = 2 * Math.PI * (r - strokeWidth / 2);

  let cumulativePercent = 0;

  const arcs = segments
    .filter((s) => s.count > 0)
    .map((seg) => {
      const pct = seg.count / total;
      const startAngle = cumulativePercent * 360 - 90;
      const endAngle = (cumulativePercent + pct) * 360 - 90;
      cumulativePercent += pct;

      const toRad = (deg: number) => (deg * Math.PI) / 180;
      const x1 = cx + r * Math.cos(toRad(startAngle));
      const y1 = cy + r * Math.sin(toRad(startAngle));
      const x2 = cx + r * Math.cos(toRad(endAngle));
      const y2 = cy + r * Math.sin(toRad(endAngle));

      const ix1 = cx + innerR * Math.cos(toRad(startAngle));
      const iy1 = cy + innerR * Math.sin(toRad(startAngle));
      const ix2 = cx + innerR * Math.cos(toRad(endAngle));
      const iy2 = cy + innerR * Math.sin(toRad(endAngle));

      const largeArc = pct > 0.5 ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix2} ${iy2}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix1} ${iy1}`,
        'Z',
      ].join(' ');

      return { d, color: seg.color, status: seg.status, count: seg.count };
    });

  // If no segments with data, show empty ring
  const isEmpty = arcs.length === 0;

  return (
    <div>
      <div className="flex items-center justify-center" style={{ height: 180 }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
          {isEmpty ? (
            <circle
              cx={cx}
              cy={cy}
              r={(r + innerR) / 2}
              fill="none"
              stroke="var(--color-border)"
              strokeWidth={strokeWidth}
            />
          ) : (
            arcs.map((arc) => (
              <path
                key={arc.status}
                d={arc.d}
                fill={arc.color}
                opacity={0.92}
              />
            ))
          )}

          {/* Center text */}
          <text
            x={cx}
            y={cy - 8}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: 26,
              fontWeight: 700,
              fill: 'var(--color-text-primary)',
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {utilization}%
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            dominantBaseline="middle"
            style={{
              fontSize: 10,
              fill: 'var(--color-text-muted)',
              letterSpacing: 1.5,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            UTILIZATION
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {segments.map((seg) => (
          <div key={seg.status} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: seg.color }} />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {seg.status}
            </span>
            <span className="text-xs ml-auto font-semibold" style={{ color: 'var(--color-text-primary)' }}>
              {seg.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

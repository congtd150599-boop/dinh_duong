import { useRef, useState } from 'react';

export interface TrendPoint {
  examDate: string; // ISO date
  value: number;
}

interface TrendChartProps {
  title: string;
  unit: string;
  color: string;
  points: TrendPoint[];
}

const WIDTH = 480;
const HEIGHT = 200;
const PAD_LEFT = 40;
const PAD_RIGHT = 16;
const PAD_TOP = 14;
const PAD_BOTTOM = 28;

/** Classic "nice number" rounding so axis ticks land on clean values — same algorithm as GrowthCurveChart.tsx. */
function niceNumber(range: number, round: boolean): number {
  if (range <= 0) return 1;
  const exponent = Math.floor(Math.log10(range));
  const fraction = range / 10 ** exponent;
  let niceFraction: number;
  if (round) {
    if (fraction < 1.5) niceFraction = 1;
    else if (fraction < 3) niceFraction = 2;
    else if (fraction < 7) niceFraction = 5;
    else niceFraction = 10;
  } else if (fraction <= 1) niceFraction = 1;
  else if (fraction <= 2) niceFraction = 2;
  else if (fraction <= 5) niceFraction = 5;
  else niceFraction = 10;
  return niceFraction * 10 ** exponent;
}

function niceYScale(min: number, max: number, maxTicks = 4) {
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const range = niceNumber(max - min, false);
  const step = niceNumber(range / (maxTicks - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min: niceMin, max: niceMax, ticks };
}

export function TrendChart({ title, unit, color, points }: TrendChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const sorted = [...points].sort((a, b) => a.examDate.localeCompare(b.examDate));
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  if (sorted.length === 0) {
    return (
      <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
        {title}: chưa đủ dữ liệu để vẽ biểu đồ.
      </div>
    );
  }

  const times = sorted.map((p) => new Date(p.examDate).getTime());
  const minTime = times[0];
  const maxTime = times[times.length - 1];
  const values = sorted.map((p) => p.value);
  const { min: yMin, max: yMax, ticks: yTicks } = niceYScale(Math.min(...values), Math.max(...values));

  const xScale = (t: number) => (maxTime === minTime ? PAD_LEFT + plotW / 2 : PAD_LEFT + ((t - minTime) / (maxTime - minTime)) * plotW);
  const yScale = (v: number) => PAD_TOP + (1 - (v - yMin) / (yMax - yMin || 1)) * plotH;

  const linePath = sorted
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${xScale(new Date(p.examDate).getTime())} ${yScale(p.value)}`)
    .join(' ');

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const loc = pt.matrixTransform(ctm.inverse());
    let nearest = 0;
    let nearestDist = Infinity;
    sorted.forEach((p, i) => {
      const dist = Math.abs(xScale(new Date(p.examDate).getTime()) - loc.x);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
  }

  const hovered = hoverIdx != null ? sorted[hoverIdx] : null;
  const hoverX = hovered ? xScale(new Date(hovered.examDate).getTime()) : 0;
  const hoverLeftPct = (hoverX / WIDTH) * 100;

  return (
    <div style={{ position: 'relative' }}>
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>{title}</h4>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={`Biểu đồ xu hướng ${title} theo thời gian`}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIdx(null)}
        style={{ display: 'block', touchAction: 'none' }}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yScale(t)} y2={yScale(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD_LEFT - 6} y={yScale(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--text-muted)">
              {t}
            </text>
          </g>
        ))}
        <text x={PAD_LEFT} y={HEIGHT - 6} textAnchor="start" fontSize={10} fill="var(--text-muted)">
          {sorted[0].examDate.slice(0, 10)}
        </text>
        <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 6} textAnchor="end" fontSize={10} fill="var(--text-muted)">
          {sorted[sorted.length - 1].examDate.slice(0, 10)}
        </text>

        <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {sorted.map((p, i) => (
          <circle
            key={p.examDate + i}
            cx={xScale(new Date(p.examDate).getTime())}
            cy={yScale(p.value)}
            r={4}
            fill={color}
            stroke="var(--card)"
            strokeWidth={2}
          />
        ))}

        {hovered && (
          <line x1={hoverX} x2={hoverX} y1={PAD_TOP} y2={HEIGHT - PAD_BOTTOM} stroke="var(--text-muted)" strokeWidth={1} />
        )}
      </svg>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: `${hoverLeftPct}%`,
            top: 4,
            transform: hoverLeftPct > 70 ? 'translateX(-100%)' : 'translateX(8px)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-md)',
            padding: '6px 10px',
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 2,
          }}
        >
          <div style={{ color: 'var(--text-muted)' }}>{hovered.examDate.slice(0, 10)}</div>
          <strong style={{ color: 'var(--text-primary)' }}>
            {hovered.value} {unit}
          </strong>
        </div>
      )}
    </div>
  );
}

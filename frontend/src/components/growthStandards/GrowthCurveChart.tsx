import { useMemo, useRef, useState } from 'react';

export interface CurvePoint {
  months: number;
  nam: number | null;
  nu: number | null;
}

export interface CurveTick {
  months: number;
  label: string;
}

interface GrowthCurveChartProps {
  title: string;
  unit: string;
  points: CurvePoint[];
  xTicks: CurveTick[];
  ariaLabel: string;
}

const COLOR_NAM = '#2a78d6';
const COLOR_NU = '#e34948';

const WIDTH = 640;
const HEIGHT = 300;
const PAD_LEFT = 44;
const PAD_RIGHT = 56;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

/** Classic "nice number" rounding (Sarah's algorithm) so axis ticks land on clean values. */
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

function niceYScale(min: number, max: number, maxTicks = 5) {
  const range = niceNumber(max - min, false);
  const step = niceNumber(range / (maxTicks - 1), true);
  const niceMin = Math.floor(min / step) * step;
  const niceMax = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = niceMin; v <= niceMax + step / 2; v += step) ticks.push(Math.round(v * 100) / 100);
  return { min: niceMin, max: niceMax, ticks };
}

function formatAge(months: number): string {
  const years = Math.floor(months / 12);
  const rem = months % 12;
  if (years === 0) return `${months} tháng`;
  if (rem === 0) return `${years} tuổi`;
  return `${years} tuổi ${rem} tháng`;
}

export function GrowthCurveChart({ title, unit, points, xTicks, ariaLabel }: GrowthCurveChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const minMonths = points[0]?.months ?? 0;
  const maxMonths = points[points.length - 1]?.months ?? 1;
  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;

  const { yMin, yMax, yTicks } = useMemo(() => {
    const values = points.flatMap((p) => [p.nam, p.nu]).filter((v): v is number => v != null);
    const { min, max, ticks } = niceYScale(Math.min(...values), Math.max(...values));
    return { yMin: min, yMax: max, yTicks: ticks };
  }, [points]);

  const xScale = (m: number) => PAD_LEFT + ((m - minMonths) / (maxMonths - minMonths)) * plotW;
  const yScale = (v: number) => PAD_TOP + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const pathFor = (key: 'nam' | 'nu') => {
    let d = '';
    let started = false;
    for (const p of points) {
      const v = p[key];
      if (v == null) {
        started = false;
        continue;
      }
      const x = xScale(p.months);
      const y = yScale(v);
      d += started ? ` L ${x} ${y}` : `M ${x} ${y}`;
      started = true;
    }
    return d;
  };

  function handlePointerMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    const ctm = svg?.getScreenCTM();
    if (!svg || !ctm) return;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const loc = pt.matrixTransform(ctm.inverse());
    const m = minMonths + ((loc.x - PAD_LEFT) / plotW) * (maxMonths - minMonths);
    let nearest = 0;
    let nearestDist = Infinity;
    points.forEach((p, i) => {
      const dist = Math.abs(p.months - m);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = i;
      }
    });
    setHoverIdx(nearest);
  }

  const hovered = hoverIdx != null ? points[hoverIdx] : null;
  const namEnd = [...points].reverse().find((p) => p.nam != null);
  const nuEnd = [...points].reverse().find((p) => p.nu != null);
  const showDirectLabels = !!namEnd && !!nuEnd && Math.abs(yScale(namEnd.nam!) - yScale(nuEnd.nu!)) >= 16;

  const hoverLeftPct = hovered ? (xScale(hovered.months) / WIDTH) * 100 : 0;

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4, flexWrap: 'wrap', gap: 8 }}>
        <h4 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>{title}</h4>
        <div style={{ display: 'flex', gap: 14 }}>
          <LegendKey color={COLOR_NAM} label="Nam" />
          <LegendKey color={COLOR_NU} label="Nữ" />
        </div>
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        width="100%"
        height={HEIGHT}
        role="img"
        aria-label={ariaLabel}
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoverIdx(null)}
        style={{ display: 'block', touchAction: 'none' }}
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yScale(t)} y2={yScale(t)} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD_LEFT - 8} y={yScale(t)} textAnchor="end" dominantBaseline="middle" fontSize={11} fill="var(--text-muted)">
              {t}
            </text>
          </g>
        ))}

        {xTicks.map((t) => (
          <text
            key={t.months}
            x={xScale(t.months)}
            y={HEIGHT - PAD_BOTTOM + 18}
            textAnchor="middle"
            fontSize={11}
            fill="var(--text-muted)"
          >
            {t.label}
          </text>
        ))}
        <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={HEIGHT - PAD_BOTTOM} y2={HEIGHT - PAD_BOTTOM} stroke="var(--border)" strokeWidth={1} />

        <path d={pathFor('nam')} fill="none" stroke={COLOR_NAM} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={pathFor('nu')} fill="none" stroke={COLOR_NU} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {namEnd && <circle cx={xScale(namEnd.months)} cy={yScale(namEnd.nam!)} r={4} fill={COLOR_NAM} stroke="#fff" strokeWidth={2} />}
        {nuEnd && <circle cx={xScale(nuEnd.months)} cy={yScale(nuEnd.nu!)} r={4} fill={COLOR_NU} stroke="#fff" strokeWidth={2} />}

        {showDirectLabels && namEnd && (
          <text
            x={xScale(namEnd.months) + 10}
            y={yScale(namEnd.nam!)}
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={600}
            fill="var(--text-secondary)"
          >
            Nam
          </text>
        )}
        {showDirectLabels && nuEnd && (
          <text
            x={xScale(nuEnd.months) + 10}
            y={yScale(nuEnd.nu!)}
            dominantBaseline="middle"
            fontSize={12}
            fontWeight={600}
            fill="var(--text-secondary)"
          >
            Nữ
          </text>
        )}

        {hovered && (
          <line
            x1={xScale(hovered.months)}
            x2={xScale(hovered.months)}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            stroke="var(--text-muted)"
            strokeWidth={1}
          />
        )}
        {hovered?.nam != null && (
          <circle cx={xScale(hovered.months)} cy={yScale(hovered.nam)} r={4} fill={COLOR_NAM} stroke="#fff" strokeWidth={2} />
        )}
        {hovered?.nu != null && (
          <circle cx={xScale(hovered.months)} cy={yScale(hovered.nu)} r={4} fill={COLOR_NU} stroke="#fff" strokeWidth={2} />
        )}
      </svg>

      {hovered && (
        <div
          style={{
            position: 'absolute',
            left: `${hoverLeftPct}%`,
            top: 8,
            transform: hoverLeftPct > 70 ? 'translateX(-100%)' : 'translateX(8px)',
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            boxShadow: 'var(--shadow-md)',
            padding: '8px 10px',
            fontSize: 12,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 2,
          }}
        >
          <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{formatAge(hovered.months)}</div>
          {hovered.nam != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 2, background: COLOR_NAM, display: 'inline-block' }} />
              <strong style={{ color: 'var(--text-primary)' }}>
                {hovered.nam.toFixed(1)} {unit}
              </strong>
              <span style={{ color: 'var(--text-secondary)' }}>Nam</span>
            </div>
          )}
          {hovered.nu != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 12, height: 2, background: COLOR_NU, display: 'inline-block' }} />
              <strong style={{ color: 'var(--text-primary)' }}>
                {hovered.nu.toFixed(1)} {unit}
              </strong>
              <span style={{ color: 'var(--text-secondary)' }}>Nữ</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
      <span style={{ width: 14, height: 2, background: color, display: 'inline-block', borderRadius: 1 }} />
      {label}
    </div>
  );
}

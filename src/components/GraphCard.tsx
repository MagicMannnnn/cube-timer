import React from "react";
import { Solve } from "@/contexts/SessionsContext";

type Props = {
  title?: string;
  solves: Solve[];
  last: number;
  dp: number;
  height?: number;
  type?: number; // 1 = singles, 3 = MO3, 5 = AO5, 12 = AO12
  onClick?: () => void;
};

function msEffective(s: Solve) {
  if (s.status === "DNF") return null;
  return s.timeMs + (s.status === "PLUS2" ? 2000 : 0);
}

function mean(vals: number[]) {
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
function wcaAverage(window: number[], dropEach: number) {
  if (dropEach <= 0) return mean(window);
  const sorted = [...window].sort((a, b) => a - b);
  const kept = sorted.slice(dropEach, sorted.length - dropEach);
  if (kept.length <= 0) return NaN;
  return mean(kept);
}

function dropCountForWindow(n: number) {
  // WCA rules:
  // - MO3: mean, drop 0
  // - AO5: drop 1 best + 1 worst
  // - AO12: drop 1 best + 1 worst
  // - AO25/50/100: drop 5% best + 5% worst (floor)
  if (n === 3) return 0;
  if (n === 5 || n === 12) return 1;
  return Math.floor(n * 0.05);
}

function seriesFromN(valsOldest: number[], window: number) {
  const dropEach = dropCountForWindow(window);
  const out: number[] = [];
  for (let i = window - 1; i < valsOldest.length; i++) {
    const win = valsOldest.slice(i - window + 1, i + 1);
    out.push(wcaAverage(win, dropEach));
  }
  return out;
}

function seriesFromType(valsOldest: number[], type: number) {
  if (type === 1) return valsOldest; // singles
  return seriesFromN(valsOldest, type);
}

function typeLabel(type: number) {
  if (type === 1) return "Single";
  if (type === 3) return "MO3";
  if (type === 5) return "AO5";
  if (type === 12) return "AO12";
  if (type === 25) return "AO25";
  if (type === 50) return "AO50";
  if (type === 100) return "AO100";
  if (type > 1) return `AO${type}`; // fallback for other N
  return `N=${type}`;
}

export default function GraphCard({
  title,
  solves,
  last,
  dp,
  height = 140,
  type = 1,
  onClick,
}: Props) {
  // Take the most recent `last` solves, compute effective times, oldest->newest
  const effectiveNewest = solves
    .slice(0, last)
    .map(msEffective)
    .filter((x): x is number => x != null);

  const valsOldest = [...effectiveNewest].reverse();

  // Convert to the requested series type
  const series = seriesFromType(valsOldest, type);
  const n = series.length;

  const w = 600,
    h = height,
    padL = 40,
    padB = 26,
    padT = 12,
    padR = 8;

  // enforce minimum 2dp for axis labels
  const minDp = 2;
  const maxDp = Math.max(minDp, dp);
  const fmt = new Intl.NumberFormat(undefined, {
    minimumFractionDigits: minDp,
    maximumFractionDigits: maxDp,
  });

  let path = "";
  let yTicks: number[] = [];
  let xTicks: number[] = [];
  let yMin = 0,
    yMax = 1;

  if (n >= 1) {
    const min = Math.min(...series);
    const max = Math.max(...series);
    yMin = min;
    yMax = max;
    const span = Math.max(1, max - min);
    const stepX = (w - padL - padR) / Math.max(1, n - 1);

    series.forEach((v, i) => {
      const x = padL + i * stepX;
      const y = h - padB - ((v - min) / span) * (h - padT - padB);
      path += i === 0 ? `M ${x},${y}` : ` L ${x},${y}`;
    });

    const t = 4;
    for (let i = 0; i <= t; i++) yTicks.push(min + (span * i) / t);

    const tx = Math.max(2, Math.min(6, n));
    for (let i = 0; i < tx; i++) {
      const idx = Math.round((i / (tx - 1)) * (n - 1));
      xTicks.push(idx);
    }
  }

  const mode = typeLabel(type);

  // --- Hover: instant in-graph readout (no native title delay) ---
  const [hoverIdx, setHoverIdx] = React.useState<number | null>(null);

  const toX = (idx: number) => {
    const stepX = (w - padL - padR) / Math.max(1, n - 1);
    return padL + idx * stepX;
  };
  const toY = (val: number) => {
    const min = yMin;
    const max = yMax;
    const span = Math.max(1, max - min);
    return h - padB - ((val - min) / span) * (h - padT - padB);
  };

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (n < 1) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const scaleX = w / rect.width; // map CSS pixels -> viewBox units
    const viewX = px * scaleX;
    const stepX = (w - padL - padR) / Math.max(1, n - 1);
    const idx = Math.round((viewX - padL) / stepX);
    const clamped = Math.max(0, Math.min(n - 1, idx));
    setHoverIdx(clamped);
  };
  const onLeave = () => setHoverIdx(null);

  const hoverValueSec =
    hoverIdx != null && series[hoverIdx] != null
      ? fmt.format(series[hoverIdx] / 1000)
      : null;

  const hx = hoverIdx != null ? toX(hoverIdx) : null;
  const hy = hoverIdx != null ? toY(series[hoverIdx!]) : null;

  return (
    <div className="graph-card" onClick={onClick} role="button">
      <div className="graph-title">{title || "Times"}</div>
      <div className="graph-meta">
        mode: {mode} • points: {n} • last {last} solves
        {hoverValueSec ? ` • ${hoverValueSec}s` : ""}
      </div>

      <svg
        width="100%"
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="none"
        onMouseMove={onMove}
        onMouseLeave={onLeave}
      >
        <rect x="0" y="0" width={w} height={h} fill="transparent" />
        {/* axes */}
        <line
          x1={padL}
          y1={h - padB}
          x2={w - padR}
          y2={h - padB}
          stroke="currentColor"
          opacity="0.3"
          strokeWidth="1"
        />
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={h - padB}
          stroke="currentColor"
          opacity="0.3"
          strokeWidth="1"
        />

        {yTicks.map((v, i) => {
          const min = yMin;
          const max = yMax;
          const span = Math.max(1, max - min);
          const y = h - padB - ((v - min) / span) * (h - padT - padB);
          const label = fmt.format(v / 1000); // seconds
          return (
            <g key={i}>
              <line
                x1={padL}
                y1={y}
                x2={w - padR}
                y2={y}
                stroke="currentColor"
                opacity="0.08"
                strokeWidth="1"
              />
              <text
                x={padL - 6}
                y={y}
                textAnchor="end"
                alignmentBaseline="middle"
                fontSize="10"
                fill="var(--text)"
                opacity="0.8"
              >
                {label}
              </text>
            </g>
          );
        })}

        {xTicks.map((idx, i) => {
          const stepX = (w - padL - padR) / Math.max(1, Math.max(1, n - 1));
          const x = padL + idx * stepX;
          const label = String(idx + 1);
          return (
            <g key={"x" + i}>
              <line
                x1={x}
                y1={h - padB}
                x2={x}
                y2={padT}
                stroke="currentColor"
                opacity="0.05"
                strokeWidth="1"
              />
              <text
                x={x}
                y={h - padB + 12}
                textAnchor="middle"
                alignmentBaseline="hanging"
                fontSize="10"
                fill="var(--text)"
                opacity="0.8"
              >
                {label}
              </text>
            </g>
          );
        })}

        {path && (
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            opacity="0.95"
            strokeWidth="2"
          />
        )}

        {/* Instant hover feedback: guide line, point marker, and an in-graph label */}
        {hoverIdx != null && hx != null && hy != null && (
          <>
            {/* vertical guide */}
            <line
              x1={hx}
              y1={padT}
              x2={hx}
              y2={h - padB}
              stroke="currentColor"
              opacity="0.25"
              strokeWidth="1"
            />
            {/* point marker */}
            <circle cx={hx} cy={hy} r="3.5" fill="currentColor" opacity="0.9" />
            {/* value badge (top-right corner inside the plot area) */}
            <g transform={`translate(${w - padR - 64}, ${padT + 14})`}>
              <rect
                x={-6}
                y={-10}
                rx={6}
                ry={6}
                width={64}
                height={18}
                fill="var(--panel-bg)"
                stroke="currentColor"
                opacity="0.85"
              />
              <text
                x={26}
                y={0}
                textAnchor="middle"
                alignmentBaseline="middle"
                fontSize="11"
                fill="var(--text)"
              >
                {hoverValueSec}s
              </text>
            </g>
          </>
        )}
      </svg>
    </div>
  );
}

import React from "react";
import { useSettings, defaultSettings } from "@/contexts/SettingsContext";
import { useSessions } from "@/contexts/SessionsContext";
import {
  bestSingle,
  currentAverage,
  bestAverage,
  specFor,
} from "@/utils/stats";
import { dpFromMode } from "@/utils/format";
import GraphCard from "@/components/GraphCard";
import GraphModal from "@/components/GraphModal";

const ALL_KEYS = [
  "BEST",
  "MO3",
  "AO5",
  "AO12",
  "AO25",
  "AO50",
  "AO100",
] as const;

export default function BottomBar() {
  const { settings, setSettings } = useSettings();
  const { current, updateSession } = useSessions();
  const usingSession = current.useSessionData;

  const baseShown = usingSession
    ? current.dataShown ?? defaultSettings.dataShown
    : settings.dataShown;
  const showMap = baseShown;
  const baseOrder = usingSession
    ? current.dataOrder ?? defaultSettings.dataOrder
    : settings.dataOrder ?? defaultSettings.dataOrder;

  // ✅ Filter order to only render toggled-on stats
  const items = baseOrder.filter((k) => {
    if (k === "BEST") return true;
    if (k === "MO3") return !!showMap.mo3;
    const m = /^AO(\d+)$/.exec(k);
    if (m) {
      const key = ("ao" + m[1]) as keyof typeof showMap;
      return !!showMap[key];
    }
    return false;
  });

  const dp = dpFromMode(settings.precision);
  const solves = current.solves;
  const best = bestSingle(solves);

  // ===== Intl NumberFormat-based seconds formatter w/ truncation =====
  const dpShow = Math.max(2, dp); // at least 2dp for display
  const fmt = React.useMemo(() => {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: dpShow,
    });
  }, [dpShow]);

  // Truncate in ms to requested precision, then format seconds
  const fmtMs = (ms: number | null | undefined) => {
    if (ms == null) return "—";
    const stepMs = Math.pow(10, 3 - dpShow); // 2dp -> 10ms, 3dp -> 1ms
    const msTrunc = Math.floor(ms / stepMs) * stepMs;
    return fmt.format(msTrunc / 1000);
  };

  // Effective ms (accounts for +2, ignores DNF)
  const msEffective = (s: (typeof solves)[number]) =>
    s.status === "DNF" ? null : s.timeMs + (s.status === "PLUS2" ? 2000 : 0);

  // --- helpers for prediction ---
  const ceil1dp = (x: number) => Math.ceil(x * 10) / 10;
  const round1dp = (x: number) => Math.round(x * 10) / 10;
  const uniq1dp = (arr: number[]) =>
    Array.from(new Set(arr.map((v) => v.toFixed(1)))).map((s) => Number(s));

  // Pick 5 targets at 0.1s steps (IN SECONDS), focused near minAO5,
  // include .5 / .0 if in range.
  function pickTargetsSec(minSec: number, maxSec: number): number[] {
    const start = ceil1dp(minSec); // first tick just above min
    const end = Math.max(start + 0.4, ceil1dp(maxSec)); // ensure ≥0.5 span

    // build 0.1 grid from start to end
    const ticks: number[] = [];
    for (let v = start; v <= end + 1e-9 && ticks.length < 12; v += 0.1) {
      ticks.push(round1dp(v));
    }

    // include next .5 if in range
    const nextHalf = round1dp(Math.floor(start) + 0.5);
    if (nextHalf >= start && nextHalf <= end && !ticks.includes(nextHalf)) {
      ticks.splice(Math.min(3, ticks.length), 0, nextHalf);
    }

    // include next integer (X.0) if in range
    const nextInt = Math.ceil(start);
    if (nextInt >= start && nextInt <= end && !ticks.includes(nextInt)) {
      ticks.push(nextInt);
    }

    const sorted = uniq1dp(ticks).sort((a, b) => a - b);

    // bias toward min by taking first 5
    let out = sorted.slice(0, 5);

    // if range tiny, extend by +0.1 steps to reach 5
    while (out.length < 5) {
      const last = out[out.length - 1] ?? start;
      out.push(round1dp(last + 0.1));
    }

    return out;
  }

  function ao5Prediciton(last4: number[]): string {
    if (last4.length < 4) return "Need 4 valid solves";

    // Sort the 4 past times (ms) ascending
    const sorted = [...last4].sort((a, b) => a - b);

    // Lower & upper AO5 bounds in MS:
    // - minAO5: new solve is best (dropped); keep 3 smallest of last4
    // - maxAO5: new solve is worst (dropped); keep 3 largest of last4
    const minAO5 = (sorted[0] + sorted[1] + sorted[2]) / 3;
    const maxAO5 = (sorted[1] + sorted[2] + sorted[3]) / 3;

    const possible: string = `Possible: ${fmtMs(minAO5)}–${fmtMs(maxAO5)}`;

    // "Exact target = minAO5" scenario where x is included with middle two:
    // x = 3*T - mid1 - mid2
    const minNeededMs = Math.max(0, Math.floor(minAO5 * 3 - sorted[1] - sorted[2]));
    const bestNeeded = `=${fmtMs(minAO5)} -> ${fmtMs(minNeededMs)}`;

    // Build "Sub-X" list using targets in SECONDS
    const targetsSec = pickTargetsSec(minAO5 / 1000, maxAO5 / 1000);

    let subXs = "";
    for (const tSec of targetsSec) {
      // Needed next time (ms) if next is kept with the middle two
      const needMs = Math.max(0, Math.floor(tSec * 1000 * 3 - sorted[1] - sorted[2]));
      subXs += `\nSub-${fmtMs(tSec * 1000)} -> ${needMs < sorted[3] ? fmtMs(needMs) : '-'}`;
    }

    return `${possible}\n${bestNeeded}${subXs}`;
  }

  // Collect the 4 most recent valid (effective) times — newest first
  const last4Effective: number[] = React.useMemo(() => {
    const eff = solves.map(msEffective).filter((x): x is number => x != null);
    return eff.slice(0, 4); // take the last 4 (most recent)
  }, [solves]);

  // --- Session Mean (always displayed) ---
  const sessionMeanMs = React.useMemo(() => {
    const times = solves.map(msEffective).filter((x): x is number => x != null);
    if (times.length === 0) return null;
    const sum = times.reduce((a, b) => a + b, 0);
    return sum / times.length;
  }, [solves]);

  function compute(key: string) {
    if (key === "BEST") return { cur: null as number | null, best: best };
    const spec = specFor(key);
    return {
      cur: currentAverage(solves, spec.n, spec.drop),
      best: bestAverage(solves, spec.n, spec.drop),
    };
  }
  const data = items.map((k) => ({ k, ...compute(k) }));

  const onReorder = (from: string, to: string, placeBefore: boolean) => {
    if (from === to) return;
    const src = usingSession
      ? current.dataOrder ?? settings.dataOrder
      : settings.dataOrder;
    const arr = src.filter((x) => x !== from);
    const tIndex = arr.indexOf(to);
    const ins = tIndex < 0 ? arr.length : placeBefore ? tIndex : tIndex + 1;
    arr.splice(ins, 0, from);
    if (usingSession) updateSession(current.id, { dataOrder: arr });
    else setSettings((s) => ({ ...s, dataOrder: arr }));
  };

  const graphs = current.graphs ?? [];

  // --- Graph rows logic ---
  type G = (typeof graphs)[number];
  const rows: G[][] = [];
  for (let i = 0; i < graphs.length; ) {
    const g = graphs[i];
    if (!g.half) {
      rows.push([g]);
      i += 1;
    } else {
      const n = graphs[i + 1];
      if (n && n.half) {
        rows.push([g, n]);
        i += 2;
      } else {
        rows.push([g]);
        i += 1;
      }
    }
  }

  const [enlarge, setEnlarge] = React.useState<string | null>(null);

  return (
    <div className="bottombar">
      {/* Always-visible Session Mean */}
      <div className="stat" style={{ order: 0 }}>
        <div className="k">SESSION MEAN</div>
        <div className="v">{fmtMs(sessionMeanMs)}</div>
      </div>

      {/* Optional: AO5 Prediction panel (uses new 'predict' toggle in Data settings) */}
      {showMap?.predict && (
        <div className="stat">
          <div className="k">PREDICT (AO5)</div>
          <div className="v" style={{ whiteSpace: "pre-line" }}>
            {last4Effective.length < 4
              ? "Need 4 valid solves"
              : ao5Prediciton(last4Effective)}
          </div>
        </div>
      )}

      {/* Ordered stats (draggable) */}
      {data.map(({ k, cur, best }) => {
        const none = cur == null && best == null;
        return (
          <div
            key={k}
            className="stat"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", k);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = e.dataTransfer.getData("text/plain");
              const r = (
                e.currentTarget as HTMLDivElement
              ).getBoundingClientRect();
              const before = e.clientX < r.left + r.width / 2;
              onReorder(from, k, before);
            }}
          >
            <div className="k">{k}</div>
            <div className="v" style={{ whiteSpace: "pre-line" }}>
              {k === "BEST"
                ? fmtMs(best)
                : none
                ? "—"
                : `current: ${fmtMs(cur)}\nbest: ${fmtMs(best)}`}
            </div>
          </div>
        );
      })}

      {/* Force graphs to start on a new line after stats */}
      <div style={{ flexBasis: "100%", height: 0 }} />

      {/* Graph rows: max 2 per row, single becomes full width */}
      {rows.map((row, ri) => (
        <div
          key={`row-${ri}`}
          className="graph-row"
          style={{ flex: "1 1 100%", display: "flex", gap: 18, width: "100%" }}
        >
          {row.map((g) => {
            const half = row.length === 2; // only half if row has two graphs
            return (
              <div
                key={`${g.id}-${g.height ?? 120}-${g.last}-${half ? "h" : "f"}`}
                style={{
                  flex: half ? "1 1 50%" : "1 1 100%",
                  minWidth: half ? "320px" : "100%",
                }}
              >
                <GraphCard
                  title="Times"
                  solves={solves}
                  last={g.last}
                  dp={dp}
                  height={g.height ?? 120}
                  onClick={() => setEnlarge(g.id)}
                />
              </div>
            );
          })}
        </div>
      ))}

      <GraphModal open={!!enlarge} onClose={() => setEnlarge(null)}>
        {enlarge &&
          (() => {
            const g = graphs.find((x) => x.id === enlarge)!;
            return (
              <GraphCard
                key={`${g.id}-modal-${g.height ?? 120}`}
                title="Times"
                solves={solves}
                last={g.last}
                dp={dp}
                height={Math.max(260, (g.height ?? 120) + 220)}
              />
            );
          })()}
      </GraphModal>
    </div>
  );
}

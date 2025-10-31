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

  // Filter only toggled stats
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

  // Formatter with truncation to at least 2dp
  const dpShow = Math.max(2, dp);
  const fmt = React.useMemo(() => {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: dpShow,
    });
  }, [dpShow]);

  const fmtMs = (ms: number | null | undefined) => {
    if (ms == null) return "—";
    const stepMs = Math.pow(10, 3 - dpShow);
    const msTrunc = Math.floor(ms / stepMs) * stepMs;
    return fmt.format(msTrunc / 1000);
  };

  // Effective ms (+2, skip DNF)
  const msEffective = (s: (typeof solves)[number]) =>
    s.status === "DNF" ? null : s.timeMs + (s.status === "PLUS2" ? 2000 : 0);

  // --- AO5 prediction helpers ---
  const ceil1dp = (x: number) => Math.ceil(x * 10) / 10;
  const round1dp = (x: number) => Math.round(x * 10) / 10;
  const uniq1dp = (arr: number[]) =>
    Array.from(new Set(arr.map((v) => v.toFixed(1)))).map((s) => Number(s));

  function pickTargetsSec(minSec: number, maxSec: number): number[] {
    const start = ceil1dp(minSec);
    const end = Math.max(start + 0.4, ceil1dp(maxSec));

    const ticks: number[] = [];
    for (let v = start; v <= end + 1e-9 && ticks.length < 12; v += 0.1) {
      ticks.push(round1dp(v));
    }

    const nextHalf = round1dp(Math.floor(start) + 0.5);
    if (nextHalf >= start && nextHalf <= end && !ticks.includes(nextHalf)) {
      ticks.splice(Math.min(3, ticks.length), 0, nextHalf);
    }

    const nextInt = Math.ceil(start);
    if (nextInt >= start && nextInt <= end && !ticks.includes(nextInt)) {
      ticks.push(nextInt);
    }

    const sorted = uniq1dp(ticks).sort((a, b) => a - b);
    let out = sorted.slice(0, 5);
    while (out.length < 5) {
      const last = out[out.length - 1] ?? start;
      out.push(round1dp(last + 0.1));
    }
    return out;
  }

  function ao5Prediciton(last4: number[]): string {
    if (last4.length < 4) return "Need 4 valid solves";
    const sorted = [...last4].sort((a, b) => a - b);

    const minAO5 = (sorted[0] + sorted[1] + sorted[2]) / 3; // ms
    const maxAO5 = (sorted[1] + sorted[2] + sorted[3]) / 3; // ms

    const possible: string = `Possible: ${fmtMs(minAO5)}–${fmtMs(maxAO5)}`;

    const minNeededMs = Math.max(
      0,
      Math.floor(minAO5 * 3 - sorted[1] - sorted[2])
    );
    const bestNeeded = `=${fmtMs(minAO5)} -> ${fmtMs(minNeededMs)}`;

    const targetsSec = pickTargetsSec(minAO5 / 1000, maxAO5 / 1000);

    let subXs = "";
    for (const tSec of targetsSec) {
      const needMs = Math.max(
        0,
        Math.floor(tSec * 1000 * 3 - sorted[1] - sorted[2])
      );
      // show '-' if the needed time would be slower than your current worst in the 4
      subXs += `\nSub-${fmtMs(tSec * 1000)} -> ${
        needMs < sorted[3] ? fmtMs(needMs) : "-"
      }`;
    }

    return `${possible}\n${bestNeeded}${subXs}`;
  }

  // Last 4 effective (newest first)
  const last4Effective: number[] = React.useMemo(() => {
    const eff = solves.map(msEffective).filter((x): x is number => x != null);
    return eff.slice(0, 4);
  }, [solves]);

  // Session mean (always shown)
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

  // Ensure 'type' is available locally without depending on external typing
  const graphs = (current.graphs ?? []) as Array<{
    id: string;
    last: number;
    half?: boolean;
    height?: number;
    type?: number;
  }>;

  // Group into rows (kept as-is), but width now respects g.half directly
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
      {/* Session mean */}
      <div className="stat" style={{ order: 0 }}>
        <div className="k">SESSION MEAN</div>
        <div className="v">{fmtMs(sessionMeanMs)}</div>
      </div>

      {/* AO5 Prediction (toggle in Data settings) */}
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

      {/* Ordered stats */}
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

      {/* New line before graphs */}
      <div style={{ flexBasis: "100%", height: 0 }} />

      {/* Graph rows */}
      {rows.map((row, ri) => (
        <div
          key={`row-${ri}`}
          className="graph-row"
          style={{
            flex: "1 1 100%",
            display: "flex",
            gap: 18,
            width: "100%",
            // flexWrap isn't required; leave default (nowrap) so two halves stay on one line
          }}
        >
          {row.map((g) => {
            // ✅ Respect the item's own half flag
            const half = !!g.half;

            return (
              <div
                key={`${g.id}-${g.height ?? 120}-${g.last}-${half ? "h" : "f"}`}
                style={{
                  // ✅ Account for the 18px gap so two halves fit exactly on one row
                  flex: half ? "1 1 calc(50% - 9px)" : "1 1 100%",
                  // (Optional) lower the min width a bit to avoid forced wrapping on narrower layouts
                  minWidth: half ? "280px" : "100%",
                }}
              >
                <GraphCard
                  title="Times"
                  solves={solves}
                  last={g.last}
                  dp={dp}
                  height={g.height ?? 120}
                  type={g.type ?? 1}
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
                height={120}
                type={g.type ?? 1}
              />
            );
          })()}
      </GraphModal>
    </div>
  );
}

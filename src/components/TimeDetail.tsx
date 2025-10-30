import React from "react";
import { useSessions, SolveStatus } from "@/contexts/SessionsContext";
import { formatMsPrec } from "@/utils/format";

export default function TimeDetail({
  solveId,
  onClose,
}: {
  solveId: string;
  onClose: () => void;
}) {
  const { current, updateSolve, deleteSolve } = useSessions();
  const s = current.solves.find((x) => x.id === solveId);
  if (!s) return null;
  const setStatus = (v: SolveStatus) => updateSolve(s.id, { status: v });
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <strong>Time</strong>
          <button className="icon-btn" onClick={onClose}>
            Close
          </button>
        </div>
        <div style={{ fontSize: "2rem" }}>
          {s.status === "DNF"
            ? "DNF"
            : formatMsPrec(
                s.status === "PLUS2" ? s.timeMs + 2000 : s.timeMs,
                3
              )}
        </div>
        <div className="row">
          <span className={`badge status-${s.status}`}>
            {s.status === "PLUS2" ? "+2" : s.status}
          </span>
          <span className="badge">raw {formatMsPrec(s.timeMs, 3)}</span>
        </div>
        <div>
          <strong>Scramble</strong>
        </div>
        <div style={{ wordBreak: "break-word" }}>{s.scramble}</div>
        <div>
          <strong>Splits</strong>
        </div>
        <div>
          {Array.isArray(s.splits) &&
          s.splits.length > 0 &&
          typeof s.timeMs === "number" ? (
            <>
              {(() => {
                const cum = s.splits as number[]; // cumulative marks
                const segs: number[] = cum.map(
                  (v, i) => v - (i > 0 ? cum[i - 1] : 0)
                );
                segs.push(Math.max(0, s.timeMs - cum[cum.length - 1])); // final segment
                return segs.map((dur, i) => (
                  <span key={i} className="badge">
                    S{i + 1}: {formatMsPrec(dur, 3)}
                  </span>
                ));
              })()}
            </>
          ) : typeof s.timeMs === "number" ? (
            <span className="badge">S1: {formatMsPrec(s.timeMs, 3)}</span>
          ) : (
            <span className="badge">—</span>
          )}
        </div>
        <div>
          <strong>Status</strong>
        </div>
        <div className="row">
          {(["OK", "PLUS2", "DNF"] as SolveStatus[]).map((x) => (
            <button key={x} className="badge" onClick={() => setStatus(x)}>
              {x === "PLUS2" ? "+2" : x}
            </button>
          ))}
        </div>
        <div>
          <strong>Actions</strong>
        </div>
        <div className="row">
          <button
            className="icon-btn"
            onClick={() => {
              deleteSolve(s.id);
              onClose();
            }}
          >
            Delete solve
          </button>
        </div>
      </div>
    </div>
  );
}

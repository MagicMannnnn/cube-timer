import React from "react";
import { useSettings, defaultSettings } from "@/contexts/SettingsContext";
import { useSessions } from "@/contexts/SessionsContext";
import {
  bestSingle,
  currentAverage,
  bestAverage,
  specFor,
} from "@/utils/stats";
import { formatMsPrec, dpFromMode } from "@/utils/format";
import type { GraphCfg } from "@/contexts/SessionsContext";

type DataShown = typeof defaultSettings.dataShown;
type DataShownKey = keyof DataShown; // 'mo3' | 'ao5' | 'ao12' | 'ao25' | 'ao50' | 'ao100' | 'predict'

const tips: Record<string, string> = {
  mo3: "Mean of 3: average of the last 3 solves.",
  ao5: "Average of 5: drop fastest and slowest, average the remaining 3.",
  ao12: "Average of 12: drop best and worst, average the remaining 10.",
  ao25: "Average of 25: drop 5% best and worst (floor).",
  ao50: "Average of 50: drop 5% best and worst (floor).",
  ao100: "Average of 100: drop 5% best and worst (floor).",
  predict: "show what times are need to achieve a sub-X average",
};

const defaultTimer = {
  precision: defaultSettings.precision,
  holdToStartMs: defaultSettings.holdToStartMs,
  phases: defaultSettings.phases,
};

function GraphsEditor() {
  const { current, updateSession } = useSessions();
  const graphs: GraphCfg[] = current.graphs ?? [];

  // Local drafts so typing "23" doesn't show "023" or force immediate clamping
  const [draftLast, setDraftLast] = React.useState<Record<string, string>>({});

  const add = () =>
    updateSession(current.id, {
      graphs: [
        ...graphs,
        {
          id: Math.random().toString(36).slice(2, 10),
          last: 50,
          half: false,
          type: 1, // default: Single
        },
      ],
    });

  const remove = (id?: string) => {
    if (!graphs.length) return;
    if (id) {
      updateSession(current.id, { graphs: graphs.filter((g) => g.id !== id) });
    } else {
      updateSession(current.id, { graphs: graphs.slice(0, -1) });
    }
  };

  const set = (id: string, patch: Partial<GraphCfg>) => {
    updateSession(current.id, {
      graphs: graphs.map((g) => (g.id === id ? { ...g, ...patch } : g)),
    });
  };

  const reorder = (from: string, to: string, before: boolean) => {
    const arr = graphs.filter((g) => g.id !== from);
    const idx = arr.findIndex((g) => g.id === to);
    const ins = idx < 0 ? arr.length : before ? idx : idx + 1;
    const fromObj = graphs.find((g) => g.id === from);
    if (!fromObj) return;
    arr.splice(ins, 0, fromObj);
    updateSession(current.id, { graphs: arr });
  };

  // Commit draft -> number (clamp to >=1; if empty/invalid, set to 1)
  const commitLast = (id: string) => {
    const raw = draftLast[id];
    const parsed =
      raw === undefined || raw.trim() === "" ? NaN : Number(raw.trim());
    const n = Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : 1;
    set(id, { last: n });
    setDraftLast((d) => {
      const cp = { ...d };
      delete cp[id];
      return cp;
    });
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--panel-bg)",
    color: "var(--text)",
    border: "1px solid var(--border)",
    borderRadius: 10,
    padding: "8px 10px",
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: "0.95rem",
    lineHeight: 1.2,
    width: "100%",
    maxWidth: 110,
  };

  return (
    <div className="data-grid wide">
      <div className="row" style={{ gap: 8 }}>
        <button className="icon-btn" onClick={add}>
          Add graph
        </button>
      </div>

      {graphs.length === 0 && (
        <div style={{ opacity: 0.7 }}>No graphs yet.</div>
      )}

      {graphs.map((g) => {
        const displayValue = draftLast[g.id] ?? String(g.last);
        return (
          <div
            key={g.id}
            className="data-row"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("text/plain", g.id);
            }}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const from = e.dataTransfer.getData("text/plain");
              const r = (
                e.currentTarget as HTMLElement
              ).getBoundingClientRect();
              const before =
                e.clientY < r.top + r.height / 2 ||
                e.clientX < r.left + r.width / 2;
              reorder(from, g.id, before);
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 1fr auto",
                gap: 8,
                alignItems: "center",
                width: "100%",
              }}
            >
              {/* Last solves (text with numeric filtering) */}
              <div>
                Last solves:{" "}
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d*"
                  style={inputStyle}
                  value={displayValue}
                  onChange={(e) => {
                    const raw = e.currentTarget.value;
                    if (/^\d*$/.test(raw)) {
                      setDraftLast((d) => ({ ...d, [g.id]: raw }));
                    }
                  }}
                  onBlur={() => commitLast(g.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.currentTarget.blur();
                    }
                  }}
                />
              </div>

              {/* Width toggle */}
              <div>
                <button
                  className="icon-btn"
                  onClick={() => set(g.id, { half: !g.half })}
                >
                  {!g.half ? "Full width" : "Half width"}
                </button>
              </div>

              {/* Height */}
              <div>
                Height:{" "}
                <select
                  value={g.height ?? 120}
                  onChange={(e) =>
                    set(g.id, { height: Number(e.target.value) || 120 })
                  }
                >
                  <option value={50}>Small</option>
                  <option value={80}>Medium</option>
                  <option value={100}>Large</option>
                  <option value={120}>X-Large</option>
                </select>
              </div>

              {/* Type (Single / MO3 / AO5 / AO12) */}
              <div>
                Type:{" "}
                <select
                  value={g.type ?? 1}
                  onChange={(e) =>
                    set(g.id, { type: Number(e.target.value) || 1 })
                  }
                >
                  <option value={1}>Single</option>
                  <option value={3}>MO3</option>
                  <option value={5}>AO5</option>
                  <option value={12}>AO12</option>
                  <option value={25}>AO25</option>
                  <option value={50}>AO50</option>
                  <option value={100}>AO100</option>
                </select>
              </div>

              {/* Remove */}
              <div>
                <button className="icon-btn" onClick={() => remove(g.id)}>
                  Remove
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function SettingsModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { settings, setSettings } = useSettings();
  const { current, updateSession } = useSessions();
  const [tab, setTab] = React.useState<"timer" | "visuals" | "data" | "tips">(
    "timer"
  );

  const usingSessionTimer = current.useSessionTimer === true;
  const effTimer =
    usingSessionTimer && current.sessionTimer
      ? current.sessionTimer
      : defaultTimer;
  const best = bestSingle(current.solves);
  const dp = Math.max(
    2,
    dpFromMode(usingSessionTimer ? effTimer.precision : settings.precision)
  );

  /*  DATA  */
  const usingSessionData = current.useSessionData === true;
  const rawShown = usingSessionData ? current.dataShown : settings.dataShown;

  // Merge defaults
  const ds = React.useMemo<DataShown>(
    () => ({ ...defaultSettings.dataShown, ...(rawShown ?? {}) }),
    [rawShown]
  );

  // Stable order
  const orderedKeys = React.useMemo<DataShownKey[]>(() => {
    const base = ((defaultSettings.dataOrder ?? []) as string[])
      .filter((k) => k !== "BEST")
      .map((k) => k.toLowerCase() as DataShownKey);
    const extras = (Object.keys(ds) as DataShownKey[]).filter(
      (k) => !base.includes(k)
    );
    return [...base, ...extras];
  }, [ds]);

  const toggleTimerScope = (useSession: boolean) =>
    updateSession(current.id, { useSessionTimer: useSession });

  const setTimer = (patch: Partial<typeof defaultTimer>) => {
    if (usingSessionTimer) {
      const next = { ...(current.sessionTimer ?? defaultTimer), ...patch };
      updateSession(current.id, { sessionTimer: next });
    } else {
      setSettings((s) => ({ ...s, ...patch } as any));
    }
  };

  const resetTimer = () => {
    if (usingSessionTimer) {
      updateSession(current.id, { sessionTimer: { ...defaultTimer } });
    } else {
      setSettings((s) => ({
        ...s,
        precision: defaultSettings.precision,
        holdToStartMs: defaultSettings.holdToStartMs,
        phases: defaultSettings.phases,
      }));
    }
  };

  const resetVisuals = () => {
    setSettings((s) => ({
      ...s,
      sidebarColor: defaultSettings.sidebarColor,
      panelColor: defaultSettings.panelColor,
      timerColor: defaultSettings.timerColor,
      bgColor: defaultSettings.bgColor,
      textColor: defaultSettings.textColor,
      mutedColor: defaultSettings.mutedColor,
    }));
  };

  // Save toggle merge with defaults
  const updateDataShown = (key: DataShownKey, value: boolean) => {
    if (usingSessionData) {
      const next: DataShown = {
        ...defaultSettings.dataShown,
        ...(current.dataShown ?? {}),
        [key]: value,
      };
      updateSession(current.id, { dataShown: next });
    } else {
      setSettings((s) => ({
        ...s,
        dataShown: {
          ...defaultSettings.dataShown,
          ...(s.dataShown ?? {}),
          [key]: value,
        } as DataShown,
      }));
    }
  };

  // render conditionally
  return (
    <>
      {open && (
        <div className="modal-backdrop" onClick={onClose}>
          <div
            className="modal modal-wide"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="settings-header">
              <div className="tabs">
                <button
                  className={`tab ${tab === "timer" ? "active" : ""}`}
                  onClick={() => setTab("timer")}
                >
                  Timer
                </button>
                <button
                  className={`tab ${tab === "visuals" ? "active" : ""}`}
                  onClick={() => setTab("visuals")}
                >
                  Visuals
                </button>
                <button
                  className={`tab ${tab === "data" ? "active" : ""}`}
                  onClick={() => setTab("data")}
                >
                  Data
                </button>
                <button
                  className={`tab ${tab === "tips" ? "active" : ""}`}
                  onClick={() => setTab("tips")}
                >
                  Tips
                </button>
              </div>
              <button className="icon-btn" onClick={onClose}>
                Close
              </button>
            </div>

            {tab === "timer" && (
              <>
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div className="tabs">
                    <button
                      className={`tab ${!usingSessionTimer ? "active" : ""}`}
                      onClick={() => toggleTimerScope(false)}
                    >
                      Global
                    </button>
                    <button
                      className={`tab ${usingSessionTimer ? "active" : ""}`}
                      onClick={() => toggleTimerScope(true)}
                    >
                      Session: {current.name}
                    </button>
                  </div>
                </div>

                <label>Timer display/mode</label>
                <select
                  value={
                    usingSessionTimer ? effTimer.precision : settings.precision
                  }
                  onChange={(e) =>
                    setTimer({ precision: e.target.value as any })
                  }
                >
                  <option value="3dp">3 decimal places</option>
                  <option value="2dp">2 decimal places</option>
                  <option value="1dp">1 decimal place</option>
                  <option value="seconds">Seconds only</option>
                  <option value="no-live">No live update (show "solve")</option>
                  <option value="typing">Typing mode (manual entry)</option>
                </select>

                <label>Hold to start (ms)</label>
                <select
                  value={
                    usingSessionTimer
                      ? effTimer.holdToStartMs
                      : settings.holdToStartMs
                  }
                  onChange={(e) =>
                    setTimer({
                      holdToStartMs: Math.max(0, Number(e.target.value) || 0),
                    })
                  }
                >
                  <option value="1000">1000ms</option>
                  <option value="500">500ms</option>
                  <option value="375">375ms</option>
                  <option value="250">250ms</option>
                  <option value="125">125ms</option>
                  <option value="1">0ms</option>
                </select>

                <label>Phases</label>
                <select
                  value={usingSessionTimer ? effTimer.phases : settings.phases}
                  onChange={(e) =>
                    setTimer({
                      phases: Math.max(1, Number(e.target.value) || 1),
                    })
                  }
                >
                  <option value="4">4</option>
                  <option value="3">3</option>
                  <option value="2">2</option>
                  <option value="1">1</option>
                </select>

                <div className="row">
                  <button className="icon-btn" onClick={resetTimer}>
                    Revert timer to defaults
                  </button>
                </div>
              </>
            )}

            {tab === "visuals" && (
              <>
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <label>Timer colour</label>
                    <input
                      type="color"
                      value={settings.timerColor}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          timerColor: e.target.value,
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Panel colour</label>
                    <input
                      type="color"
                      value={settings.panelColor}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          panelColor: e.target.value,
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Sidebar colour</label>
                    <input
                      type="color"
                      value={settings.sidebarColor}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          sidebarColor: e.target.value,
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
                <div className="row">
                  <div style={{ flex: 1 }}>
                    <label>Background colour</label>
                    <input
                      type="color"
                      value={settings.bgColor}
                      onChange={(e) =>
                        setSettings((s) => ({ ...s, bgColor: e.target.value }))
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Text colour</label>
                    <input
                      type="color"
                      value={settings.textColor}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          textColor: e.target.value,
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label>Muted text colour</label>
                    <input
                      type="color"
                      value={settings.mutedColor}
                      onChange={(e) =>
                        setSettings((s) => ({
                          ...s,
                          mutedColor: e.target.value,
                        }))
                      }
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={settings.sidebarGradient}
                    onChange={(e) =>
                      setSettings((s) => ({
                        ...s,
                        sidebarGradient: e.target.checked,
                      }))
                    }
                  />{" "}
                  sidebar times gradient (green→red)
                </label>
                <div className="row">
                  <button className="icon-btn" onClick={resetVisuals}>
                    Revert visuals to defaults
                  </button>
                </div>
              </>
            )}

            {tab === "data" && (
              <>
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div className="tabs">
                    <button
                      className={`tab ${
                        !current.useSessionData ? "active" : ""
                      }`}
                      onClick={() =>
                        updateSession(current.id, { useSessionData: false })
                      }
                    >
                      Global
                    </button>
                    <button
                      className={`tab ${
                        current.useSessionData ? "active" : ""
                      }`}
                      onClick={() =>
                        updateSession(current.id, { useSessionData: true })
                      }
                    >
                      Session: {current.name}
                    </button>
                  </div>
                </div>
                <div className="bestline">
                  <strong>Best single</strong>:{" "}
                  {best == null ? "—" : formatMsPrec(best, dp)}
                </div>

                <div className="data-grid wide">
                  {orderedKeys.map((k: DataShownKey) => {
                    const v = ds[k];
                    const keyUpper = k.toUpperCase(); // MO3, AO5, PREDICT, etc.

                    // Only compute averages for MO3/AO*; others show dashes
                    const isAvg =
                      keyUpper === "MO3" || /^AO\d+$/.test(keyUpper);
                    const spec = isAvg ? specFor(keyUpper) : null;
                    const cur = spec
                      ? currentAverage(current.solves, spec.n, spec.drop)
                      : null;
                    const bestAvg = spec
                      ? bestAverage(current.solves, spec.n, spec.drop)
                      : null;
                    const none = !isAvg || (cur == null && bestAvg == null);

                    return (
                      <label key={k} className="data-row">
                        <input
                          type="checkbox"
                          checked={!!v}
                          onChange={(e) => updateDataShown(k, e.target.checked)}
                        />
                        <span className="abbr">{keyUpper}</span>
                        <span className="qm" title={tips[k] || ""}>
                          ?
                        </span>
                        <span className="spacer" />
                        {isAvg ? (
                          none ? (
                            <span className="statline">—</span>
                          ) : (
                            <span className="statline">
                              current:{" "}
                              <b>{cur == null ? "—" : formatMsPrec(cur, dp)}</b>
                              <br />
                              best:{" "}
                              <b>
                                {bestAvg == null
                                  ? "—"
                                  : formatMsPrec(bestAvg, dp)}
                              </b>
                            </span>
                          )
                        ) : (
                          <span className="statline">—</span>
                        )}
                      </label>
                    );
                  })}
                </div>

                <div style={{ marginTop: 12 }}>
                  <strong>Graphs</strong>
                  <GraphsEditor />
                </div>
              </>
            )}

            {tab === "tips" && (
              <>
                <div className="tips">
                  <ul style={{ lineHeight: 1.6, marginTop: 8 }}>
                    <li>
                      You can <strong>Click</strong> on a graph to enlarge it.
                    </li>
                    <li>
                      You can <strong>drag and drop</strong> the data panels to
                      rearrange them.
                    </li>
                    <li>
                      Click a solve in the list to <strong>view details</strong>
                      , edit the status, or delete it.
                    </li>
                    <li>
                      Press <strong>Space</strong> to start/stop the timer.
                      Enable <em>Hold to start</em> in Settings if you prefer a
                      delay.
                    </li>
                    <li>
                      Open <strong>Settings → Data</strong> to choose which
                      statistics and graphs are shown.
                    </li>
                    <li>
                      Use <strong>session-specific</strong> timer or data
                      (Settings → Timer/Data tabs, "Session" scope) if you want
                      per-session customization.
                    </li>
                    <li>
                      Export or import your sessions via your browser's{" "}
                      <strong>Local Storage</strong> (developer tools) —
                      persistence is automatic.
                    </li>
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

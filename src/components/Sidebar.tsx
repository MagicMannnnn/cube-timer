import { useSessions } from '@/contexts/SessionsContext'
import { formatMsPrec, dpAtLeast2FromMode } from '@/utils/format'
import { useSettings } from '@/contexts/SettingsContext'
import React from 'react'
import { NewSessionModal, DeleteSessionModal } from '@/components/SessionModals'
function getScaleFromSolve(best: number | null, worst: number | null, ms: number | null) { if (best == null || worst == null || ms == null) return null; if (worst === best) return 0; return (ms - best) / (worst - best) }

export default function Sidebar({ onSelectSolve }: { onSelectSolve: (id: string) => void }) {
  const { sessions, current, currentId, setCurrentId, addSession, deleteSession } = useSessions()
  const { settings } = useSettings()
  const [showNew, setShowNew] = React.useState(false)
  const [showDel, setShowDel] = React.useState(false)
  const dp = dpAtLeast2FromMode(settings.precision)
  const okTimes = current.solves.map(x => x.status === 'DNF' ? null : (x.timeMs + (x.status === 'PLUS2' ? 2000 : 0))).filter((x) => x != null) as number[]
  const best = okTimes.length ? Math.min(...okTimes) : null
  const worst = okTimes.length ? Math.max(...okTimes) : null
  return (
    <aside className="sidebar">
      <div className="session-header">
        <select value={currentId} onChange={e => setCurrentId(e.target.value)}>
          {sessions.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button onClick={() => setShowNew(true)}>Add</button>
        <button className="session-delete" title="Delete session" onClick={() => setShowDel(true)}>×</button>
      </div>
      <div className="times">
        {current.solves.length === 0 && <div className="time-item" style={{ justifyContent: 'center', color: 'var(--muted)' }}>No solves yet</div>}
        {current.solves.map((s, i) => {
          const displayIndex = current.solves.length - i;
          const ms = s.status === 'DNF' ? null : (s.timeMs + (s.status === 'PLUS2' ? 2000 : 0));
          const color = (ms == null || best == null || worst == null)
            ? undefined
            : (() => {
              const t = getScaleFromSolve(best, worst, ms)
              if (t == null) return undefined
              const hue = (1 - t) * 120
              return `hsl(${hue} 70% 60%)`
            })()
            ;
          return (
            <div key={s.id} className="time-item" onClick={() => onSelectSolve(s.id)} style={{ borderLeft: color ? `4px solid ${color}` : undefined }}>
              <div><span className="time-index">{displayIndex}:</span> {s.status === 'DNF' ? 'DNF' : formatMsPrec(s.status === 'PLUS2' ? s.timeMs + 2000 : s.timeMs, dp)}</div>
              <div className="time-meta">
                <span className={`badge status-${s.status}`}>{s.status === 'PLUS2' ? '+2' : s.status}</span>
                <span>{new Date(s.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>
      <NewSessionModal open={showNew} onClose={() => setShowNew(false)} onCreate={(name) => addSession(name)} />
      <DeleteSessionModal open={showDel} onClose={() => setShowDel(false)} onConfirm={() => deleteSession(currentId)} sessionName={current.name} />
    </aside>
  )
}

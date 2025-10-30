import { useSessions } from '@/contexts/SessionsContext'
import { formatMsPrec, dpAtLeast2FromMode } from '@/utils/format'
import { useSettings } from '@/contexts/SettingsContext'
import React, { useEffect, useRef, useState } from 'react'
import { NewSessionModal, DeleteSessionModal } from '@/components/SessionModals'

// Diverging colour around the average:
// - orange (≈30°) at the average
// - green (120°) for faster than average (the best side)
// - red (0°) for slower than average (the worst side)
const ORANGE_HUE = 30
const GREEN_HUE = 120
const RED_HUE = 0

export default function Sidebar({ onSelectSolve }: { onSelectSolve: (id: string) => void }) {
  const { sessions, current, currentId, setCurrentId, addSession, deleteSession } = useSessions()
  const { settings } = useSettings()
  const [showNew, setShowNew] = React.useState(false)
  const [showDel, setShowDel] = React.useState(false)

  const dp = dpAtLeast2FromMode(settings.precision)

  // === Stats for colouring ===
  const okTimes = current.solves
    .map(x => (x.status === 'DNF' ? null : x.timeMs + (x.status === 'PLUS2' ? 2000 : 0)))
    .filter((x): x is number => x != null)

  const avg = okTimes.length
    ? okTimes.reduce((a, b) => a + b, 0) / okTimes.length
    : null

  // Compute the maximum deviation on each side of the average
  let devAboveMax = 0 // slower/worse side (>= avg)
  let devBelowMax = 0 // faster/better side (< avg)
  if (avg != null) {
    for (const t of okTimes) {
      if (t >= avg) devAboveMax = Math.max(devAboveMax, t - avg)
      else devBelowMax = Math.max(devBelowMax, avg - t)
    }
  }

  function colorFromAverage(ms: number | null): string | undefined {
    if (avg == null || ms == null) return undefined

    if (ms >= avg) {
      // Worse than (or equal to) average: ORANGE -> RED
      const denom = devAboveMax > 0 ? devAboveMax : 1
      const t = Math.min(1, (ms - avg) / denom) // 0 at avg, 1 at worst
      const hue = ORANGE_HUE + (RED_HUE - ORANGE_HUE) * t // 30 -> 0
      return `hsl(${hue} 70% 60%)`
    } else {
      // Better than average: ORANGE -> GREEN
      const denom = devBelowMax > 0 ? devBelowMax : 1
      const t = Math.min(1, (avg - ms) / denom) // 0 at avg, 1 at best
      const hue = ORANGE_HUE + (GREEN_HUE - ORANGE_HUE) * t // 30 -> 120
      return `hsl(${hue} 70% 60%)`
    }
  }

  // ---- DRAG-RESIZE (coordinated with BottomDock via CSS vars) ----
  const minSidebar = 60
  const minDock = 60

  function getVarPx(name: string, fallback: number) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    const n = parseInt(v || '', 10)
    return Number.isFinite(n) ? n : fallback
  }
  function setVarPx(name: string, value: number) {
    document.documentElement.style.setProperty(name, `${Math.round(value)}px`)
  }

  const [sidebarH, setSidebarH] = useState<number>(() => {
    const v = localStorage.getItem('sidebarH')
    return v ? parseInt(v, 10) : getVarPx('--sidebar-h', 160)
  })

  useEffect(() => {
    setVarPx('--sidebar-h', sidebarH)
    localStorage.setItem('sidebarH', String(sidebarH))
  }, [sidebarH])

  const startY = useRef(0)
  const startH = useRef(0)
  const raf = useRef<number | null>(null)

  const onSidebarDown = (e: React.MouseEvent | React.TouchEvent) => {
    startY.current = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY
    startH.current = sidebarH

    const onMove = (ev: MouseEvent | TouchEvent) => {
      const y =
        'touches' in ev
          ? (ev as TouchEvent).touches[0].clientY
          : (ev as MouseEvent).clientY

      const dy = startY.current - y // drag up to increase height

      const dockH = getVarPx('--dock-h', 160)
      const stackMax = Math.round(window.innerHeight * 0.7) // shared cap (~70vh)

      let nextSidebar = Math.max(minSidebar, startH.current + dy)

      // If the sum would exceed the cap, shrink the dock while sidebar grows
      if (nextSidebar + dockH > stackMax) {
        const newDock = Math.max(minDock, stackMax - nextSidebar)
        setVarPx('--dock-h', newDock)
        localStorage.setItem('dockH', String(newDock))
      }

      // Prevent overshoot if dock already at min
      const currentDock = getVarPx('--dock-h', 160)
      if (nextSidebar + currentDock > stackMax) {
        nextSidebar = Math.max(minSidebar, stackMax - currentDock)
      }

      if (raf.current) cancelAnimationFrame(raf.current)
      raf.current = requestAnimationFrame(() => setSidebarH(nextSidebar))
    }

    const end = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onMove as any)
      window.removeEventListener('mouseup', end)
      window.removeEventListener('touchend', end)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('touchmove', onMove as any, { passive: false })
    window.addEventListener('mouseup', end)
    window.addEventListener('touchend', end)
  }
  // ---- END DRAG-RESIZE ----

  return (
    <aside className="sidebar">
      {/* Mobile drag handle to resize sidebar height */}
      <div
        className="sidebar-resize"
        onMouseDown={onSidebarDown}
        onTouchStart={onSidebarDown}
        onClickCapture={(e) => e.stopPropagation()}
        title="Drag to resize sidebar"
      />

      <div className="session-header">
        <select value={currentId} onChange={e => setCurrentId(e.target.value)}>
          {sessions.map(s => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button onClick={() => setShowNew(true)}>Add</button>
        <button
          className="session-delete"
          title="Delete session"
          onClick={() => setShowDel(true)}
        >
          ×
        </button>
      </div>

      <div className="times">
        {current.solves.length === 0 && (
          <div
            className="time-item"
            style={{ justifyContent: 'center', color: 'var(--muted)' }}
          >
            No solves yet
          </div>
        )}

        {current.solves.map((s, i) => {
          const displayIndex = current.solves.length - i
          const ms =
            s.status === 'DNF'
              ? null
              : s.timeMs + (s.status === 'PLUS2' ? 2000 : 0)

          const color = colorFromAverage(ms)

          return (
            <div
              key={s.id}
              className="time-item"
              onClick={() => onSelectSolve(s.id)}
              style={{ borderLeft: color ? `4px solid ${color}` : undefined }}
            >
              <div>
                <span className="time-index">{displayIndex}:</span>{' '}
                {s.status === 'DNF'
                  ? 'DNF'
                  : formatMsPrec(
                      s.status === 'PLUS2' ? s.timeMs + 2000 : s.timeMs,
                      dp
                    )}
              </div>
              <div className="time-meta">
                <span className={`badge status-${s.status}`}>
                  {s.status === 'PLUS2' ? '+2' : s.status}
                </span>
                <span>{new Date(s.createdAt).toLocaleTimeString()}</span>
              </div>
            </div>
          )
        })}
      </div>

      <NewSessionModal
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreate={(name) => addSession(name)}
      />
      <DeleteSessionModal
        open={showDel}
        onClose={() => setShowDel(false)}
        onConfirm={() => deleteSession(currentId)}
        sessionName={current.name}
      />
    </aside>
  )
}

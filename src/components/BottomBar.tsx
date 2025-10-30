import React from 'react'
import { useSettings, defaultSettings } from '@/contexts/SettingsContext'
import { useSessions } from '@/contexts/SessionsContext'
import { bestSingle, currentAverage, bestAverage, specFor } from '@/utils/stats'
import { dpFromMode } from '@/utils/format'
import GraphCard from '@/components/GraphCard'
import GraphModal from '@/components/GraphModal'

const ALL_KEYS = ['BEST', 'MO3', 'AO5', 'AO12', 'AO25', 'AO50', 'AO100']

export default function BottomBar() {
  const { settings, setSettings } = useSettings()
  const { current, updateSession } = useSessions()
  const usingSession = current.useSessionData
  const baseShown = usingSession ? (current.dataShown ?? defaultSettings.dataShown) : (settings.dataShown)
  const showMap = baseShown
  const baseOrder = usingSession ? (current.dataOrder ?? defaultSettings.dataOrder) : (settings.dataOrder ?? defaultSettings.dataOrder)

  // ✅ Correct filtering so MO3 shows, and AOx map to ao5, ao12, etc.
  const items = baseOrder.filter(k => {
    if (k === 'BEST') return true
    if (k === 'MO3') return !!showMap.mo3
    const m = /^AO(\d+)$/.exec(k)
    if (m) {
      const key = ('ao' + m[1]) as keyof typeof showMap
      return !!showMap[key]
    }
    return false
  })

  const dp = dpFromMode(settings.precision)
  const solves = current.solves
  const best = bestSingle(solves)

  // Locale-aware seconds formatter; we’ll truncate first then format.
  const dpShow = Math.max(2, dp) // force at least 2dp
  const fmt = React.useMemo(() => {
    return new Intl.NumberFormat(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: dpShow,
    })
  }, [dpShow])

  // Truncate in **milliseconds** to the desired seconds precision, then format.
  // Example: dpShow=2 -> stepMs=10ms, 12065ms -> 12060ms -> "12.06"
  const fmtMs = (ms: number | null | undefined) => {
    if (ms == null) return '—'
    const stepMs = Math.pow(10, 3 - dpShow) // 2dp -> 10ms, 3dp -> 1ms
    const msTrunc = Math.floor(ms / stepMs) * stepMs
    return fmt.format(msTrunc / 1000)
  }

  // --- Session Mean (always displayed) ---
  const sessionMeanMs = React.useMemo(() => {
    const times = solves
      .map(s => (s.status === 'DNF' ? null : s.timeMs + (s.status === 'PLUS2' ? 2000 : 0)))
      .filter((x): x is number => x != null)
    if (times.length === 0) return null
    const sum = times.reduce((a, b) => a + b, 0)
    return sum / times.length
  }, [solves])

  function compute(key: string) {
    if (key === 'BEST') return { cur: null as number | null, best: best }
    const spec = specFor(key)
    return {
      cur: currentAverage(solves, spec.n, spec.drop),
      best: bestAverage(solves, spec.n, spec.drop)
    }
  }
  const data = items.map(k => ({ k, ...compute(k) }))

  const onReorder = (from: string, to: string, placeBefore: boolean) => {
    if (from === to) return
    const src = usingSession ? (current.dataOrder ?? settings.dataOrder) : settings.dataOrder
    const arr = src.filter(x => x !== from)
    const tIndex = arr.indexOf(to)
    const ins = tIndex < 0 ? arr.length : (placeBefore ? tIndex : tIndex + 1)
    arr.splice(ins, 0, from)
    if (usingSession) updateSession(current.id, { dataOrder: arr })
    else setSettings(s => ({ ...s, dataOrder: arr }))
  }

  const graphs = current.graphs ?? []

  // --- Graph rows logic ---
  type G = typeof graphs[number]
  const rows: G[][] = []
  for (let i = 0; i < graphs.length;) {
    const g = graphs[i]
    if (!g.half) {
      rows.push([g]); i += 1
    } else {
      const n = graphs[i + 1]
      if (n && n.half) { rows.push([g, n]); i += 2 }
      else { rows.push([g]); i += 1 }
    }
  }

  const [enlarge, setEnlarge] = React.useState<string | null>(null)

  return (
    <div className="bottombar">
      {/* Always-visible Session Mean */}
      <div className="stat" style={{ order: 0 }}>
        <div className="k">SESSION MEAN</div>
        <div className="v">
          {fmtMs(sessionMeanMs)}
        </div>
      </div>

      {/* Ordered stats (draggable) */}
      {data.map(({ k, cur, best }) => {
        const none = cur == null && best == null
        return (
          <div
            key={k}
            className="stat"
            draggable
            onDragStart={e => { e.dataTransfer.setData('text/plain', k) }}
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              e.preventDefault()
              const from = e.dataTransfer.getData('text/plain')
              const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
              const before = e.clientX < r.left + r.width / 2
              onReorder(from, k, before)
            }}
          >
            <div className="k">{k}</div>
            <div className="v" style={{ whiteSpace: 'pre-line' }}>
              {k === 'BEST' ? (
                fmtMs(best)
              ) : none ? (
                '—'
              ) : (
                `current: ${fmtMs(cur)}\nbest: ${fmtMs(best)}`
              )}
            </div>
          </div>
        )
      })}

      {/* Force graphs to start on a new line after stats */}
      <div style={{ flexBasis: '100%', height: 0 }} />

      {/* Graph rows: max 2 per row, single becomes full width */}
      {rows.map((row, ri) => (
        <div
          key={`row-${ri}`}
          className="graph-row"
          style={{ flex: '1 1 100%', display: 'flex', gap: 18, width: '100%' }}
        >
          {row.map((g) => {
            const half = (row.length === 2) // only half if row has two graphs
            return (
              <div
                key={`${g.id}-${g.height ?? 120}-${g.last}-${half ? 'h' : 'f'}`}
                style={{ flex: half ? '1 1 50%' : '1 1 100%', minWidth: half ? '320px' : '100%' }}
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
            )
          })}
        </div>
      ))}

      <GraphModal open={!!enlarge} onClose={() => setEnlarge(null)}>
        {enlarge && (() => {
          const g = graphs.find(x => x.id === enlarge)!
          return (
            <GraphCard
              key={`${g.id}-modal-${g.height ?? 120}`}
              title="Times"
              solves={solves}
              last={g.last}
              dp={dp}
              height={Math.max(260, (g.height ?? 120) + 220)}
            />
          )
        })()}
      </GraphModal>
    </div>
  )
}

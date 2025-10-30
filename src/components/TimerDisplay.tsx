import React, { useEffect } from 'react'
import { useTimer } from '@/hooks/useTimer'
import { useSettings } from '@/contexts/SettingsContext'
import { useSessions } from '@/contexts/SessionsContext'
import { genScramble } from '@/utils/scramble'
import { formatMsPrec } from '@/utils/format'

function dpFromMode(mode:string):0|1|2|3{
  if (mode==='2dp') return 2
  if (mode==='1dp') return 1
  if (mode==='seconds') return 0
  return 3 // '3dp' or anything else defaults to 3
}

// Parse flexible time strings -> ms (accepts "12.34", "1:12.34", "12", "1:02.345")
function parseTimeToMs(input: string): number | null {
  const t = (input || '').trim().replace(',', '.');
  if (!t) return null;
  if (t.includes(':')) {
    const parts = t.split(':');
    if (parts.length !== 2) return null;
    const m = Number(parts[0]);
    const s = Number(parts[1]);
    if (!Number.isFinite(m) || !Number.isFinite(s) || s < 0) return null;
    return Math.round(m * 60000 + s * 1000);
  } else {
    const s = Number(t);
    if (!Number.isFinite(s)) return null;
    return Math.round(s * 1000);
  }
}

export default function TimerDisplay({onSolve}:{onSolve:(ms:number, scramble:string, splits:number[])=>void}){
  const {settings} = useSettings()
  const {current} = useSessions()
  const effPrecision = current.useSessionTimer && current.sessionTimer ? current.sessionTimer.precision : settings.precision
  const effHold = current.useSessionTimer && current.sessionTimer ? current.sessionTimer.holdToStartMs : settings.holdToStartMs
  const effPhases = current.useSessionTimer && current.sessionTimer ? Math.max(1,current.sessionTimer.phases|0) : Math.max(1, settings.phases|0)

  const [scramble,setScramble] = React.useState(genScramble(settings.event as any))
  useEffect(()=>{ setScramble(genScramble(settings.event as any)) },[settings.event])

  const isTypingMode = effPrecision === 'typing'

  // --- Typing mode UI ---
  const [typed, setTyped] = React.useState('')
  const [invalid, setInvalid] = React.useState<string | null>(null)

  const submitTyped = () => {
    const ms = parseTimeToMs(typed)
    if (ms == null) {
      setInvalid('INVALID')
      return
    }
    setInvalid(null)
    onSolve(ms, scramble, [])
    setTyped('')
    setScramble(genScramble(settings.event as any))
  }

  // Allow Enter to submit in typing mode
  const onTypingKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      submitTyped()
    }
  }

  // --- Timer mode (non-typing) ---
  const {running,ready,holding,elapsed,stop, handleHoldStart, handleHoldEnd} = useTimer({
    holdToStartMs: effHold,
    phases: effPhases,
    onStop:(ms,splits)=>{ onSolve(ms, scramble, splits); setScramble(genScramble(settings.event as any)) }
  })

  useEffect(()=>{
    if (isTypingMode) return // no click-to-stop in typing mode
    const onClick = ()=>{ if (running) stop() }
    window.addEventListener('pointerdown', onClick)
    return ()=> window.removeEventListener('pointerdown', onClick)
  },[running,stop,isTypingMode])

  const stateClass = !isTypingMode && !running && holding && !ready ? 'holding' : (!isTypingMode && !running && ready ? 'ready' : '')
  const dp = isTypingMode ? 3 : dpFromMode(effPrecision as string)
  const showLive = effPrecision !== 'no-live'
  const display = running
    ? (showLive ? formatMsPrec(elapsed, dp) : 'solve')
    : formatMsPrec(elapsed, Math.max(dp, 2))

  return (
    <div className="timer-wrap">
      <div className="scramble">{scramble}</div>

      {/* Typing mode */}
      {isTypingMode ? (
        <div className="timer-center">
          <div className="typing-wrap">
            <input
              className="typing-input"
              placeholder=""
              value={typed}
              onChange={e=>{ setTyped(e.target.value); setInvalid(null) }}
              onKeyDown={onTypingKeyDown}
              inputMode="decimal"
              autoFocus
            />
            <div className="typing-hint">
              {invalid ?? ''}
            </div>
          </div>
        </div>
      ) : (
        // Normal timer mode
        <div
          className="timer-center"
          onTouchStart={() => { if (!isTypingMode) handleHoldStart(); }}
          onTouchEnd={() => { if (!isTypingMode) handleHoldEnd(); }}
        >
          <div className={`timer ${stateClass}`} aria-live="polite">{display}</div>
        </div>
      )}
    </div>
  )
}

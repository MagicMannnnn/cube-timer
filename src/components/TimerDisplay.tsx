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
  return 3
}

export default function TimerDisplay({onSolve}:{onSolve:(ms:number, scramble:string, splits:number[])=>void}){
  const {settings} = useSettings()
  const {current} = useSessions()
  const effPrecision = current.useSessionTimer && current.sessionTimer ? current.sessionTimer.precision : settings.precision
  const effHold = current.useSessionTimer && current.sessionTimer ? current.sessionTimer.holdToStartMs : settings.holdToStartMs
  const effPhases = current.useSessionTimer && current.sessionTimer ? Math.max(1,current.sessionTimer.phases|0) : Math.max(1, settings.phases|0)

  const [scramble,setScramble] = React.useState(genScramble(settings.event as any))
  useEffect(()=>{ setScramble(genScramble(settings.event as any)) },[settings.event])
  const {running,ready,holding,elapsed,stop, handleHoldStart, handleHoldEnd} = useTimer({
    holdToStartMs: effHold,
    phases: effPhases,
    onStop:(ms,splits)=>{ onSolve(ms, scramble, splits); setScramble(genScramble(settings.event as any)) }
  })
  useEffect(()=>{
    const onClick = ()=>{ if (running) stop() }
    window.addEventListener('pointerdown', onClick)
    return ()=> window.removeEventListener('pointerdown', onClick)
  },[running,stop])

  const stateClass = !running && holding && !ready ? 'holding' : (!running && ready ? 'ready' : '')
  const dp = dpFromMode(effPrecision)
  const showLive = effPrecision !== 'no-live'
  const display = running
    ? (showLive ? formatMsPrec(elapsed, dp) : 'solve')
    : formatMsPrec(elapsed, Math.max(dp, 2))

  return (
    <div className="timer-wrap">
      <div className="scramble">{scramble}</div>
      <div className="timer-center" onTouchStart={(e) => { handleHoldStart(); }} onTouchEnd={handleHoldEnd}>
        <div className={`timer ${stateClass}`} aria-live="polite">{display}</div>
      </div>
    </div>
  )
}

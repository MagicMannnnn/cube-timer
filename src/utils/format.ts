export function formatMsPrec(ms:number, dp:0|1|2|3|number){
  if (ms < 0) ms = 0
  const totalMs = Math.floor(ms)
  const totalSecFloat = totalMs/1000
  const pow = Math.pow(10, dp)
  const rounded = Math.floor(totalSecFloat * pow + 1e-6)/pow
  const minutes = Math.floor(rounded/60)
  const seconds = Math.floor(rounded%60)
  const frac = rounded - Math.floor(rounded)
  const fracStr = dp>0 ? (frac.toFixed(dp)).slice(1) : ''
  if (minutes>0){
    const base = `${minutes}:${seconds.toString().padStart(2,'0')}`
    return dp>0 ? base + fracStr : base
  }
  const base = `${Math.floor(rounded)}`
  return dp>0 ? base + fracStr : base
}

export function dpFromMode(mode:string):0|1|2|3{
  if (mode==='2dp') return 2
  if (mode==='1dp') return 1
  if (mode==='seconds') return 0
  if (mode==='no-live') return 3
  return 3
}
export function dpAtLeast2FromMode(mode:string):2|3{
  const d = dpFromMode(mode)
  return (d<2?2:d) as 2|3
}

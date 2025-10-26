import { Solve } from '@/contexts/SessionsContext'

function effectiveMs(s:Solve): number | null{
  if (s.status==='DNF') return null
  const base = s.timeMs + (s.status==='PLUS2'? 2000: 0)
  return base
}

export function bestSingle(solves:Solve[]): number | null{
  let best: number | null = null
  for (const s of solves){
    const ms = effectiveMs(s)
    if (ms==null) continue
    if (best==null || ms<best) best = ms
  }
  return best
}

function trimmedMean(values:number[], drop:number){
  if (values.length===0) return null
  const sorted = [...values].sort((a,b)=>a-b)
  const start = Math.min(drop, sorted.length)
  const end = Math.max(sorted.length - drop, start)
  const slice = sorted.slice(start, end)
  if (slice.length===0) return null
  const sum = slice.reduce((a,b)=>a+b,0)
  return sum / slice.length
}

function windowAverages(solves:Solve[], n:number, drop:number){
  const res:(number|null)[] = []
  for (let i=0;i+n<=solves.length;i++){
    const win = solves.slice(i, i+n).map(effectiveMs).filter((x):x is number=> x!=null)
    if (win.length < n - drop*2){ res.push(null); continue }
    const avg = trimmedMean(win, drop)
    res.push(avg)
  }
  return res
}

export function currentAverage(solves:Solve[], n:number, drop:number){
  if (solves.length < n) return null
  const win = solves.slice(0, n).map(effectiveMs).filter((x):x is number=> x!=null)
  if (win.length < n - drop*2) return null
  return trimmedMean(win, drop)
}

export function bestAverage(solves:Solve[], n:number, drop:number){
  const avgs = windowAverages(solves, n, drop).filter((x):x is number=> x!=null)
  if (avgs.length===0) return null
  return Math.min(...avgs)
}

export function specFor(key:string):{n:number,drop:number,label:string}{
  if (key==='MO3') return {n:3,drop:0,label:'MO3'}
  const m = key.match(/^AO(\d+)$/)
  if (m){
    const n = parseInt(m[1],10)
    const drop = Math.floor(n*0.05) // WCA style uses 1 for 5/12, and floor(0.05*n) for big sets
    if (n===5 || n===12) return {n, drop:1, label:`AO${n}`}
    return {n, drop, label:`AO${n}`}
  }
  return {n:3,drop:0,label:key}
}

import React from 'react'
import { Solve } from '@/contexts/SessionsContext'

type Props = {
  title?: string
  solves: Solve[]
  last: number
  dp: number
  height?: number
  onClick?: ()=>void
}
function msEffective(s:Solve){ if(s.status==='DNF') return null; return s.timeMs + (s.status==='PLUS2'?2000:0) }

export default function GraphCard({title,solves,last,dp,height=140,onClick}:Props){
  const data = solves.slice(0,last).map(msEffective).filter((x):x is number=>x!=null).reverse()
  const n = data.length
  const w = 600, h = height, padL = 40, padB = 26, padT = 12, padR = 8
  let path = ''
  let yTicks: number[] = []
  let xTicks: number[] = []
  let yMin = 0, yMax = 1
  if (n>=1){
    const min = Math.min(...data)
    const max = Math.max(...data)
    yMin = min
    yMax = max
    const span = Math.max(1, max-min)
    const stepX = (w-padL-padR) / Math.max(1, n-1)
    data.forEach((v,i)=>{
      const x = padL + i*stepX
      const y = h-padB - ( (v-min)/span )*(h-padT-padB)
      path += (i===0? `M ${x},${y}` : ` L ${x},${y}`)
    })
    const t = 4
    for(let i=0;i<=t;i++){ yTicks.push(min + (span*i/t)) }
    const tx = Math.max(2, Math.min(6, n))
    for(let i=0;i<tx;i++){
      const idx = Math.round((i/(tx-1))*(n-1))
      xTicks.push(idx)
    }
  }
  return (
    <div className="graph-card" onClick={onClick} role="button" title="Click to enlarge">
      <div className="graph-title">{title||'Times'}</div>
      <div className="graph-meta">last {last} solves</div>
      <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <rect x="0" y="0" width={w} height={h} fill="transparent" />
        {/* axes */}
        <line x1={padL} y1={h-padB} x2={w-padR} y2={h-padB} stroke="currentColor" opacity="0.3" strokeWidth="1"/>
        <line x1={padL} y1={padT} x2={padL} y2={h-padB} stroke="currentColor" opacity="0.3" strokeWidth="1"/>
        {yTicks.map((v,i)=>{
          const min = yMin
          const max = yMax
          const span = Math.max(1, max-min)
          const y = h-padB - ((v-min)/span)*(h-padT-padB)
          const label = (v/1000).toFixed(2)
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w-padR} y2={y} stroke="currentColor" opacity="0.08" strokeWidth="1"/>
              <text x={padL-6} y={y} textAnchor="end" alignmentBaseline="middle" fontSize="10" fill="var(--text)" opacity="0.8">{label}</text>
            </g>
          )
        })}
        {xTicks.map((idx,i)=>{
          const stepX = (w-padL-padR) / Math.max(1, Math.max(1, n-1))
          const x = padL + idx*stepX
          const label = String(idx+1)
          return (
            <g key={'x'+i}>
              <line x1={x} y1={h-padB} x2={x} y2={padT} stroke="currentColor" opacity="0.05" strokeWidth="1"/>
              <text x={x} y={h-padB+12} textAnchor="middle" alignmentBaseline="hanging" fontSize="10" fill="var(--text)" opacity="0.8">{label}</text>
            </g>
          )
        })}
        {path && <path d={path} fill="none" stroke="currentColor" opacity="0.95" strokeWidth="2"/>}
      </svg>
    </div>
  )
}

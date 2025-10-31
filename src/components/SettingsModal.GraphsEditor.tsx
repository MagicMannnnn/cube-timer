import React from 'react'
import { useSessions } from '@/contexts/SessionsContext'

export type GraphCfg = { id: string; last: number; half?: boolean; height?: number }

export default function GraphsEditor(){
  const { current, updateSession } = useSessions()
  const graphs: GraphCfg[] = current.graphs ?? []

  const add = ()=> updateSession(current.id, {
    graphs: [...graphs, { id: Math.random().toString(36).slice(2,10), last: 50, half: false }]
  })
  const set = (id:string, patch: Partial<GraphCfg>) =>
    updateSession(current.id, { graphs: graphs.map(g=> g.id===id ? { ...g, ...patch } : g) })
  const remove = (id:string) =>
    updateSession(current.id, { graphs: graphs.filter(g=> g.id!==id) })
  const reorder = (from:string, to:string, before:boolean)=>{
    const arr = graphs.filter(g=>g.id!==from)
    const idx = arr.findIndex(g=>g.id===to)
    const ins = idx<0? arr.length : (before ? idx : idx+1)
    const fromObj = graphs.find(g=>g.id===from)
    if (!fromObj) return
    arr.splice(ins,0,fromObj)
    updateSession(current.id, { graphs: arr })
  }

  return (
    <div className="data-grid wide">
      <div className="row" style={{gap:8}}>
        <button className="icon-btn" onClick={add}>+ Add graph</button>
      </div>

      {graphs.length===0 && <div style={{opacity:.7}}>No graphs yet.</div>}

      {graphs.map(g=> (
        <div key={g.id}
             className="data-row"
             draggable
             onDragStart={e=>{ e.dataTransfer.setData('text/plain', g.id) }}
             onDragOver={e=>e.preventDefault()}
             onDrop={e=>{ e.preventDefault(); const from = e.dataTransfer.getData('text/plain'); const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect(); const before = e.clientX < r.left + r.width/2; reorder(from, g.id, before) }}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:8,alignItems:'center',width:'100%'}}>
            <div>Last solves: <input type="number" min={1} value={g.last} onChange={e=>set(g.id,{last: Math.max(1, Number(e.target.value)||1)})} /></div>
            <div><button className="icon-btn" onClick={()=>set(g.id,{half: !g.half})}>{g.half? 'Full width' : 'Half width'}</button></div>
            <div>Height: <select value={g.height ?? 120} onChange={e=>set(g.id,{height: Number(e.target.value)||120})}>
              <option value={40}>Small</option>
              <option value={60}>Medium</option>
              <option value={80}>Large</option>
              <option value={100}>X-Large</option>
            </select></div>
            {/* Per-row remove */}
            <div><button className="icon-btn" title="Remove graph" onClick={()=>remove(g.id)}>×</button></div>
          </div>
        </div>
      ))}
    </div>
  )
}

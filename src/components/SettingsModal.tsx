import React from 'react'
import { useSettings, defaultSettings } from '@/contexts/SettingsContext'
import { useSessions } from '@/contexts/SessionsContext'
import { bestSingle, currentAverage, bestAverage, specFor } from '@/utils/stats'
import { formatMsPrec, dpFromMode } from '@/utils/format'
import type { GraphCfg } from '@/contexts/SessionsContext'


const tips: Record<string,string> = {
  mo3: 'Mean of 3: average of the last 3 solves.',
  ao5: 'Average of 5: drop fastest and slowest, average the remaining 3.',
  ao12: 'Average of 12: drop best and worst, average the remaining 10.',
  ao25: 'Average of 25: drop 5% best and worst (floor).',
  ao50: 'Average of 50: drop 5% best and worst (floor).',
  ao100: 'Average of 100: drop 5% best and worst (floor).'
}

const defaultTimer = { precision: defaultSettings.precision, holdToStartMs: defaultSettings.holdToStartMs, phases: defaultSettings.phases }

function GraphsEditor(){
  const {current, updateSession} = useSessions()
  const graphs: GraphCfg[] = current.graphs ?? []
  const add = ()=> updateSession(current.id, { graphs: [...graphs, {id: Math.random().toString(36).slice(2,10), last: 50, half: false}] })
  const remove = (id?:string)=>{
    if (!graphs.length) return
    if (id){
      updateSession(current.id, { graphs: graphs.filter(g=>g.id!==id) })
    } else {
      updateSession(current.id, { graphs: graphs.slice(0,-1) })
    }
  }
  const set = (id:string, patch: Partial<GraphCfg>)=>{
    updateSession(current.id, { graphs: graphs.map(g=> g.id===id? {...g, ...patch } : g) })
  }
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
        <button className="icon-btn" onClick={add}>Add graph</button>
      </div>
      {graphs.length===0 && <div style={{opacity:.7}}>No graphs yet.</div>}
      {graphs.map(g=> (
        <div key={g.id}
             className="data-row"
             draggable
             onDragStart={e=>{ e.dataTransfer.setData('text/plain', g.id) }}
             onDragOver={e=>e.preventDefault()}
             onDrop={e=>{ e.preventDefault(); const from = e.dataTransfer.getData('text/plain'); const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); const before = e.clientY < r.top + r.height/2 || e.clientX < r.left + r.width/2; reorder(from, g.id, before) }}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:8,alignItems:'center',width:'100%'}}>
            <div>Last solves: <input type="number" min={1} value={g.last} onChange={e=>set(g.id,{last: Math.max(1, Number(e.target.value)||1)})} /></div>
            <div><button className="icon-btn" onClick={()=>set(g.id,{half: !g.half})}>{!g.half? 'Full width' : 'Half width'}</button></div>
                <div>Height: <select value={g.height ?? 120} onChange={e=>set(g.id,{height: Number(e.target.value)||120})}><option value={50}>Small</option><option value={80}>Medium</option><option value={100}>Large</option><option value={120}>X-Large</option></select></div>
            <div><button className="icon-btn" onClick={()=>remove(g.id)}>Remove</button></div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SettingsModal({open,onClose}:{open:boolean,onClose:()=>void}){
  const {settings,setSettings} = useSettings()
  const {current, updateSession} = useSessions()
  const [tab,setTab] = React.useState<'timer'|'visuals'|'data'|'tips'>('timer')
  if (!open) return null

  const usingSessionTimer = current.useSessionTimer === true
  const effTimer = usingSessionTimer && current.sessionTimer ? current.sessionTimer : defaultTimer
  const best = bestSingle(current.solves)
  const dp = Math.max(2, dpFromMode(usingSessionTimer ? (effTimer.precision) : settings.precision))

  const usingSessionData = current.useSessionData === true
  const ds = usingSessionData ? (current.dataShown ?? settings.dataShown) : settings.dataShown

  const toggleTimerScope = (useSession:boolean)=> updateSession(current.id, { useSessionTimer: useSession })
  const setTimer = (patch: Partial<typeof defaultTimer>)=>{
    if (usingSessionTimer){
      const next = { ...(current.sessionTimer ?? defaultTimer), ...patch }
      updateSession(current.id, { sessionTimer: next })
    }else{
      setSettings(s=>({...s, ...patch} as any))
    }
  }
  const resetTimer = ()=>{
    if (usingSessionTimer){
      updateSession(current.id, { sessionTimer: { ...defaultTimer } })
    }else{
      setSettings(s=>({...s, precision: defaultSettings.precision, holdToStartMs: defaultSettings.holdToStartMs, phases: defaultSettings.phases }))
    }
  }
  const resetVisuals = ()=>{
    setSettings(s=>({
      ...s,
      sidebarColor: defaultSettings.sidebarColor,
      panelColor: defaultSettings.panelColor,
      timerColor: defaultSettings.timerColor,
      bgColor: defaultSettings.bgColor,
      textColor: defaultSettings.textColor,
      mutedColor: defaultSettings.mutedColor
    }))
  }
  const updateDataShown = (key:string, value:boolean)=>{
    if (usingSessionData){
      const next = { ...(current.dataShown ?? settings.dataShown), [key]: value }
      updateSession(current.id, { dataShown: next })
    } else {
      setSettings(s=>({...s, dataShown: { ...s.dataShown, [key]: value }}))
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e=>e.stopPropagation()}>
        <div className="settings-header">
          <div className="tabs">
            <button className={`tab ${tab==='timer'?'active':''}`} onClick={()=>setTab('timer')}>Timer</button>
            <button className={`tab ${tab==='visuals'?'active':''}`} onClick={()=>setTab('visuals')}>Visuals</button>
            <button className={`tab ${tab==='data'?'active':''}`} onClick={()=>setTab('data')}>Data</button>
            <button className={`tab ${tab==='tips'?'active':''}`} onClick={()=>setTab('tips')}>Tips</button>
          </div>
          <button className="icon-btn" onClick={onClose}>Close</button>
        </div>

        {tab==='timer' && (
          <>
            <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}>
              <div className="tabs">
                <button className={`tab ${!usingSessionTimer?'active':''}`} onClick={()=>toggleTimerScope(false)}>Global</button>
                <button className={`tab ${usingSessionTimer?'active':''}`} onClick={()=>toggleTimerScope(true)}>Session: {current.name}</button>
              </div>
            </div>

            <label>Timer display</label>
            <select value={usingSessionTimer? effTimer.precision : settings.precision} onChange={e=>setTimer({precision:e.target.value as any})}>
              <option value="3dp">3 decimal places</option>
              <option value="2dp">2 decimal places</option>
              <option value="1dp">1 decimal place</option>
              <option value="seconds">Seconds only</option>
              <option value="no-live">No live update (show "solve")</option>
            </select>

            <label>Hold to start (ms)</label>
            <select value={usingSessionTimer? effTimer.holdToStartMs : settings.holdToStartMs} onChange={e=>setTimer({holdToStartMs: Math.max(0,Number(e.target.value)||0)})} >
              <option value="1000">1000ms</option>
              <option value="500">500ms</option>
              <option value="375">375ms</option>
              <option value="250">250ms</option>
              <option value="125">125ms</option>
              <option value="1">0ms</option>
            </select>

            <label>Phases</label>
            <select value={usingSessionTimer? effTimer.phases : settings.phases} onChange={e=>setTimer({phases: Math.max(1,Number(e.target.value)||1)})} > 
              <option value="4">4</option>
              <option value="3">3</option>
              <option value="2">2</option>
              <option value="1">1</option>
            </select>

            <div className="row">
              <button className="icon-btn" onClick={resetTimer}>Revert timer to defaults</button>
            </div>
          </>
        )}

        {tab==='visuals' && (
          <>
            <div className="row">
              <div style={{flex:1}}>
                <label>Timer colour</label>
                <input type="color" value={settings.timerColor} onChange={e=>setSettings(s=>({...s,timerColor:e.target.value}))} style={{width:'100%'}}/>
              </div>
              <div style={{flex:1}}>
                <label>Panel colour</label>
                <input type="color" value={settings.panelColor} onChange={e=>setSettings(s=>({...s,panelColor:e.target.value}))} style={{width:'100%'}}/>
              </div>
              <div style={{flex:1}}>
                <label>Sidebar colour</label>
                <input type="color" value={settings.sidebarColor} onChange={e=>setSettings(s=>({...s,sidebarColor:e.target.value}))} style={{width:'100%'}}/>
              </div>
            </div>
            <div className="row">
              <div style={{flex:1}}>
                <label>Background colour</label>
                <input type="color" value={settings.bgColor} onChange={e=>setSettings(s=>({...s,bgColor:e.target.value}))} style={{width:'100%'}}/>
              </div>
              <div style={{flex:1}}>
                <label>Text colour</label>
                <input type="color" value={settings.textColor} onChange={e=>setSettings(s=>({...s,textColor:e.target.value}))} style={{width:'100%'}}/>
              </div>
              <div style={{flex:1}}>
                <label>Muted text colour</label>
                <input type="color" value={settings.mutedColor} onChange={e=>setSettings(s=>({...s,mutedColor:e.target.value}))} style={{width:'100%'}}/>
              </div>
            </div>
            <label><input type="checkbox" checked={settings.sidebarGradient} onChange={e=>setSettings(s=>({...s,sidebarGradient:e.target.checked}))}/> sidebar times gradient (green→red)</label>
            <div className="row">
              <button className="icon-btn" onClick={resetVisuals}>Revert visuals to defaults</button>
            </div>
          </>
        )}

        {tab==='data' && (
          <>
            <div className="row" style={{justifyContent:'space-between',alignItems:'center'}}>
  <div className="tabs">
    <button className={`tab ${!current.useSessionData?'active':''}`} onClick={()=>updateSession(current.id,{useSessionData:false})}>Global</button>
    <button className={`tab ${current.useSessionData?'active':''}`} onClick={()=>updateSession(current.id,{useSessionData:true})}>Session: {current.name}</button>
  </div>
</div>
<div className="bestline">
              <strong>Best single</strong>: {best==null? '—' : formatMsPrec(best, dp)}
            </div>
            <div className="data-grid wide">
              {Object.entries(ds).map(([k,v])=> {
                const key = k.toUpperCase()
                const spec = specFor(key)
                const cur = currentAverage(current.solves, spec.n, spec.drop)
                const bestAvg = bestAverage(current.solves, spec.n, spec.drop)
                const none = cur==null && bestAvg==null
                return (
                  <label key={k} className="data-row">
                    <input type="checkbox" checked={v} onChange={e=>updateDataShown(k, e.target.checked)} />
                    <span className="abbr">{key}</span>
                    <span className="qm" title={(tips as any)[k] || ''}>?</span>
                    <span className="spacer" />
                    {key==='BEST' ? (
                      <span className="statline"><b>{best==null? '—' : formatMsPrec(best, dp)}</b></span>
                    ) : none ? (
                      <span className="statline">—</span>
                    ) : (
                      <span className="statline">current: <b>{cur==null? '—' : formatMsPrec(cur, dp)}</b><br/>best: <b>{bestAvg==null? '—' : formatMsPrec(bestAvg, dp)}</b></span>
                    )}
                  </label>
                )
              })}
            </div>
            <div style={{marginTop:12}}>
              <strong>Graphs</strong>
              <GraphsEditor />
            </div>
          </>
        )}
        {tab==='tips' && (
          <>
            <div className="tips">
              <ul style={{lineHeight:1.6, marginTop: 8}}>
                <li>You can <strong>drag and drop</strong> the data panels to rearrange them.</li>
                <li>Click a solve in the list to <strong>view details</strong>, edit the status, or delete it.</li>
                <li>Press <strong>Space</strong> to start/stop the timer. Enable <em>Hold to start</em> in Settings if you prefer a delay.</li>
                <li>Open <strong>Settings → Data</strong> to choose which statistics and graphs are shown.</li>
                <li>Use <strong>session-specific</strong> timer or data (Settings → Timer/Data tabs, "Session" scope) if you want per-session customization.</li>
                <li>Export or import your sessions via your browser's <strong>Local Storage</strong> (developer tools) — persistence is automatic.</li>
              </ul>
            </div>
          </>
        )}

      </div>
    </div>
  )
}

import React, { useMemo, useState } from 'react'
import { SettingsProvider } from '@/contexts/SettingsContext'
import { SessionsProvider, Solve } from '@/contexts/SessionsContext'
import Sidebar from '@/components/Sidebar'
import TimerDisplay from '@/components/TimerDisplay'
import BottomBar from '@/components/BottomBar'
import SettingsModal from '@/components/SettingsModal'
import { useSessions } from '@/contexts/SessionsContext'
import { genScramble } from '@/utils/scramble'
import TimeDetail from '@/components/TimeDetail'
import { useSettings } from '@/contexts/SettingsContext'
import BottomDock from '@/components/BottomDock'

function EventPicker(){
  const {settings,setSettings} = useSettings()
  const events = [
    ['222','2x2'],
    ['333','3x3'],
    ['333oh','3x3 OH'],
    ['333bf','3x3 BLD'],
    ['444','4x4'],
    ['555','5x5'],
    ['666','6x6'],
    ['777','7x7'],
    ['pyram','Pyraminx'],
    ['skewb','Skewb'],
    ['megaminx','Megaminx'],
    ['sq1','Square-1'],
    ['clock','Clock'],
        ['333fm','Fewest Moves'],
  ]
  return (
    <select value={settings.event} onChange={e=>setSettings(s=>({...s,event:e.target.value}))} style={{marginRight:8, background:'var(--panel-bg)', color:'#fff', border:'1px solid var(--border)', borderRadius:10, padding:'8px'}}>
      {events.map(([id,label])=> <option key={id} value={id}>{label}</option>)}
    </select>
  )
}


function GearIcon(){
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" stroke="currentColor"/>
      <path d="M19.4 15a7.96 7.96 0 0 0 .2-1 7.96 7.96 0 0 0-.2-1l2-1.6-2-3.4-2.4.7a8 8 0 0 0-1.7-1l-.3-2.5H9l-.3 2.5a8 8 0 0 0-1.7 1l-2.4-.7-2 3.4 2 1.6a7.96 7.96 0 0 0-.2 1 7.96 7.96 0 0 0 .2 1l-2 1.6 2 3.4 2.4-.7a8 8 0 0 0 1.7 1l.3 2.5h6l.3-2.5a8 8 0 0 0 1.7-1l2.4.7 2-3.4-2-1.6Z" stroke="currentColor"/>
    </svg>
  )
}

function Content(){
  const { addSolve } = useSessions()
  const [detailId,setDetailId] = useState<string | null>(null)
  const [settingsOpen,setSettingsOpen] = useState(false)
  const onSolve = (ms:number, scramble:string, splits:number[])=>{
    const solve:Solve = { id:Math.random().toString(36).slice(2,10), timeMs:ms, scramble, status:'OK', createdAt:Date.now(), splits }
    addSolve(solve)
  }
  return (
    <div className="app">
      <Sidebar onSelectSolve={(id)=>setDetailId(id)} />
      <main className="main">
        <div className="topbar">
          <EventPicker />
          <button className="icon-btn" onClick={()=>setSettingsOpen(true)} title="Settings"><GearIcon/></button>
        </div>
        <TimerDisplay onSolve={onSolve}/>
        <BottomDock><BottomBar/></BottomDock>
      </main>
      <SettingsModal open={settingsOpen} onClose={()=>setSettingsOpen(false)} />
      {detailId && <TimeDetail solveId={detailId} onClose={()=>setDetailId(null)} />}
    </div>
  )
}

export default function App(){
  return (
    <SettingsProvider>
      <SessionsProvider>
        <Content/>
      </SessionsProvider>
    </SettingsProvider>
  )
}

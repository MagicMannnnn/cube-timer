import React, { createContext, useContext, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import type { DataShown, PrecisionMode } from '@/contexts/SettingsContext'

export type SolveStatus = 'OK'|'PLUS2'|'DNF'
export type Solve = {
  id:string
  timeMs:number
  scramble:string
  status:SolveStatus
  createdAt:number
  splits?: number[]
}

export type SessionTimer = {
  precision: PrecisionMode
  holdToStartMs: number
  phases: number
}

export type GraphCfg = { id: string; last: number; half?: boolean; height?: number }

export type Session = {
  id:string
  name:string
  solves:Solve[]
  dataShown?: DataShown
  dataOrder?: string[]
  useSessionData?: boolean
  useSessionTimer?: boolean
  sessionTimer?: SessionTimer
  graphs?: GraphCfg[]
}

type Ctx = {
  sessions:Session[]
  currentId:string
  current:Session
  setCurrentId:(id:string)=>void
  addSession:(name:string)=>void
  deleteSession:(id:string)=>void
  renameSession:(id:string, name:string)=>void
  switchSession:(id:string)=>void
  updateSession:(id:string, patch:Partial<Session>)=>void
  addSolve:(solve:Solve)=>void
  updateSolve:(id:string, patch:Partial<Solve>)=>void
  deleteSolve:(id:string)=>void
}

const SessionsContext = createContext<Ctx>(null as unknown as Ctx)

function uid(){ return Math.random().toString(36).slice(2,10) }

// Build the example session on first run
function makeExampleSession(): Session {
  const now = Date.now();
  const solves: Solve[] = [];

  // Outlier among the most recent solves (newest)
  solves.push({ id: 's01', timeMs: 18000, scramble: "R2 U2 L2 D2 F2 B2", status: 'OK', createdAt: now });

  // Next 45 solves between 10–13s
  for (let i = 1; i <= 45; i++) {
    const ms = Math.floor(10000 + Math.random() * 3000);
    solves.push({
      id: `s${String(i + 1).padStart(2,'0')}`,
      timeMs: ms,
      scramble: "R U R' U' F2 L U2",
      status: 'OK',
      createdAt: now - i * 300000, // 5 minutes apart
    });
  }

  // Four older outliers
  const outliers = [8900, 15000, 16500, 21000];
  outliers.forEach((ms, j) => {
    const idx = 46 + j + 1; // s47..s50
    solves.push({
      id: `s${String(idx).padStart(2,'0')}`,
      timeMs: ms,
      scramble: "R2 U2 L2 D2 F2 B2",
      status: 'OK',
      createdAt: now - (46 + j) * 300000,
    });
  });

  return {
    id: 'example',
    name: 'Example session',
    solves,
    useSessionData: false,
    useSessionTimer: false,
    graphs: [{ id:'g1', last:50, half:true, height:80 }, { id:'g2', last:20, half:true, height:80 }],
  };
}
export function SessionsProvider({children}:{children:React.ReactNode}){
  const initialSessions: Session[] = [ makeExampleSession(), { id:'default', name:'Default', solves: [] } ]
  const [sessions,setSessions] = useLocalStorage('sessions', initialSessions)
  const [currentId,setCurrentId] = useLocalStorage('currentSessionId', 'example')
  const current = useMemo(()=> sessions.find(s=>s.id===currentId) || sessions[0] || {id:'default',name:'Default',solves:[]}, [sessions,currentId])

  const addSession = (name:string)=> {
    const newId = uid()
    setSessions(prev=>[...prev,{id:newId,name,solves:[]}])
    setCurrentId(newId)
  }

  const deleteSession = (idv:string)=> setSessions(prev=>{
    const next = prev.filter(s=>s.id!==idv)
    if (idv===currentId) {
      setCurrentId(next[0]?.id || 'default')
    }
    return next.length? next : [{id:'default',name:'Default',solves:[],useSessionData:false,useSessionTimer:false}]
  })

  const renameSession = (idv:string, name:string)=> setSessions(prev=> prev.map(s=> s.id===idv? {...s,name}: s))
  const switchSession = (idv:string)=> setCurrentId(idv)
  const updateSession = (idv:string, patch:Partial<Session>)=> setSessions(prev=> prev.map(s=> s.id===idv? {...s,...patch}: s))
  const addSolve = (solve:Solve)=> setSessions(prev=> prev.map(s=> s.id===currentId? {...s,solves:[solve,...s.solves]}: s))
  const updateSolve = (idv:string, patch:Partial<Solve>)=> setSessions(prev=> prev.map(s=> s.id===currentId? {...s,solves:s.solves.map(x=> x.id===idv? {...x,...patch}: x)}: s))
  const deleteSolve = (idv:string)=> setSessions(prev=> prev.map(s=> s.id===currentId? {...s,solves:s.solves.filter(x=> x.id!==idv)}: s))

  return <SessionsContext.Provider value={{sessions,currentId,current,setCurrentId,addSession,deleteSession,renameSession,switchSession,updateSession,addSolve,updateSolve,deleteSolve}}>{children}</SessionsContext.Provider>
}
export function useSessions(){ return useContext(SessionsContext) }

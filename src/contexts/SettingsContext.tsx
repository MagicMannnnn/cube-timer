import React, { createContext, useContext, useEffect } from 'react'
import { useLocalStorage } from '@/hooks/useLocalStorage'

export type PrecisionMode = '3dp'|'2dp'|'1dp'|'seconds'|'no-live'
export type DataShown = { mo3:boolean; ao5:boolean; ao12:boolean; ao25:boolean; ao50:boolean; ao100:boolean }
export type Settings = {
  precision:PrecisionMode
  holdToStartMs:number
  phases:number
  sidebarColor:string
  panelColor:string
  timerColor:string
  bgColor:string
  textColor:string
  mutedColor:string
  multiphase:boolean
  dataShown:DataShown
  dataOrder:string[]
  sidebarGradient:boolean
  event:string
}
export const defaultSettings:Settings = {
  precision:'2dp',
  holdToStartMs:500,
  phases:1,
  sidebarColor:'#171b24',
  panelColor:'#1b1f2a',
  timerColor:'#e7e7e7ff',
  bgColor:'#0f1115',
  textColor:'#e7e7e7',
  mutedColor:'#9aa1a9',
  multiphase:false,
  dataShown:{ mo3:true, ao5:true, ao12:true, ao25:false, ao50:false, ao100:false },
  dataOrder:['BEST','MO3','AO5','AO12','AO25','AO50','AO100'],
  sidebarGradient:true,
  event:'333'
}
type Ctx = {
  settings:Settings
  setSettings:React.Dispatch<React.SetStateAction<Settings>>
}
const SettingsContext = createContext<Ctx>({settings:defaultSettings,setSettings:()=>{}})

function mergeDefaults(s: any): Settings{
  const merged: Settings = {
    ...defaultSettings,
    ...(s||{}),
    dataShown: {
      ...defaultSettings.dataShown,
      ...((s && s.dataShown) || {})
    },
    dataOrder: Array.isArray(s?.dataOrder) ? s!.dataOrder : defaultSettings.dataOrder,
    event: s?.event || defaultSettings.event
  }
  return merged
}

export function SettingsProvider({children}:{children:React.ReactNode}){
  const [raw,setRaw] = useLocalStorage<Settings>('settings', defaultSettings)
  const settings = mergeDefaults(raw)
  useEffect(()=>{ setRaw(settings) },[]) // migrate once

  useEffect(()=>{
    const root = document.documentElement
    root.style.setProperty('--sidebar-bg', settings.sidebarColor)
    root.style.setProperty('--panel-bg', settings.panelColor)
    root.style.setProperty('--timer-color', settings.timerColor)
    root.style.setProperty('--bg', settings.bgColor)
    root.style.setProperty('--text', settings.textColor)
    root.style.setProperty('--muted', settings.mutedColor)
  },[settings.sidebarColor,settings.panelColor,settings.timerColor,settings.bgColor,settings.textColor,settings.mutedColor])

  return <SettingsContext.Provider value={{settings,setSettings:setRaw}}>{children}</SettingsContext.Provider>
}
export function useSettings(){ return useContext(SettingsContext) }

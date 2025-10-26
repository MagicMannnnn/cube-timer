import React, { useEffect, useRef, useState } from 'react'

export default function BottomDock({children}:{children:React.ReactNode}){
  const [h,setH] = useState<number>(()=>{
    const v = localStorage.getItem('bbarHeight')
    return v? parseInt(v,10): 160
  })
  const dragging = useRef(false)
  useEffect(()=>{
    document.documentElement.style.setProperty('--bbar-h', h+'px')
    localStorage.setItem('bbarHeight', String(h))
  },[h])
  useEffect(()=>{
    const onMove = (e:MouseEvent)=>{
      if(!dragging.current) return
      const y = window.innerHeight - e.clientY
      setH(Math.max(120, Math.min(480, y)))
    }
    const onUp = ()=> dragging.current=false
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return ()=>{
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  },[])
  return (
    <div className="bottomdock-wrap">
      <div className="bottomdock-resize" onMouseDown={()=>{dragging.current=true}} title="Drag to resize data area" />
      <div className="bottomdock" style={{height: `var(--bbar-h, ${h}px)`}}>
        {children}
      </div>
    </div>
  )
}

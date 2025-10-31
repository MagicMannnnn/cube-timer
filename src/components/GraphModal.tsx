import React from 'react'
export default function GraphModal({open,onClose,children}:{open:boolean,onClose:()=>void,children:React.ReactNode}){
  if(!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal-wide" onClick={e=>e.stopPropagation()}>
        <div className="modal-wide" style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <strong>Graph</strong>
          <button className="icon-btn" onClick={onClose}>Close</button>
        </div>
        {children}
      </div>
    </div>
  )
}

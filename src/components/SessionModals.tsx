import React from 'react'

export function NewSessionModal({open,onClose,onCreate}:{open:boolean,onClose:()=>void,onCreate:(name:string)=>void}){
  const [name,setName] = React.useState('')
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <strong>New session</strong>
          <button className="icon-btn" onClick={onClose}>Close</button>
        </div>
        <input type="text" placeholder="Session name" value={name} onChange={e=>setName(e.target.value)} />
        <div className="row">
          <button className="icon-btn" onClick={()=>{ onCreate(name.trim()||'Untitled'); onClose() }}>Create</button>
          <button className="icon-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export function DeleteSessionModal({open,onClose,onConfirm,sessionName}:{open:boolean,onClose:()=>void,onConfirm:()=>void,sessionName:string}){
  if (!open) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e=>e.stopPropagation()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <strong>Delete session</strong>
          <button className="icon-btn" onClick={onClose}>Close</button>
        </div>
        <div>Delete “{sessionName}”?</div>
        <div className="row">
          <button className="icon-btn" onClick={()=>{ onConfirm(); onClose() }}>Delete</button>
          <button className="icon-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

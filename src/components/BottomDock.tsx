
import React, { useEffect, useRef, useState } from "react";

function getVarPx(name:string, fallback:number){
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseInt(v || "", 10);
  return Number.isFinite(n) ? n : fallback;
}
function setVarPx(name:string, value:number){
  document.documentElement.style.setProperty(name, `${Math.round(value)}px`);
}

export default function BottomDock({ children }: { children: React.ReactNode; }) {
  const minDock = 60;
  const minSidebar = 60;
  const initialDock = (()=>{
    const v = localStorage.getItem("dockH");
    return v ? parseInt(v,10) : getVarPx("--dock-h",160);
  })();
  const [dockH, setDockH] = useState<number>(initialDock);
  const raf = useRef<number | null>(null);
  const startY = useRef(0);
  const startH = useRef(0);
  const dragging = useRef(false);

  useEffect(()=>{
    setVarPx("--dock-h", dockH);
    localStorage.setItem("dockH", String(dockH));
  },[dockH]);

  const onDown = (e: React.MouseEvent | React.TouchEvent)=>{
    dragging.current = true;
    startY.current = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    startH.current = dockH;
    const onMove = (ev: MouseEvent | TouchEvent)=>{
      const y = "touches" in ev ? (ev as TouchEvent).touches[0].clientY : (ev as MouseEvent).clientY;
      const dy = startY.current - y; // drag up -> increase height
      const sidebarH = getVarPx("--sidebar-h", getVarPx("--dock-h",160));
      const stackMax = Math.round(window.innerHeight * 0.7); // 70% viewport on mobile
      let nextDock = Math.max(minDock, startH.current + dy);

      // enforce combined cap
      if (nextDock + sidebarH > stackMax){
        const newSidebar = Math.max(minSidebar, stackMax - nextDock);
        setVarPx("--sidebar-h", newSidebar);
        localStorage.setItem("sidebarH", String(newSidebar));
      }
      // prevent dock from stealing all space when sidebar is at min
      const currentSidebar = getVarPx("--sidebar-h", 160);
      if (nextDock + currentSidebar > stackMax){
        nextDock = Math.max(minDock, stackMax - currentSidebar);
      }

      if (raf.current) cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(()=> setDockH(nextDock));
    };
    const onUp = ()=>{
      dragging.current = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove as any);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove as any, {passive:false});
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
  };

  return (
    <div>
      <div
        className="resize-handle"
        onMouseDown={onDown}
        onTouchStart={onDown}
        title="Drag to resize data area"
      />
      <div className="bottomdock">
        {children}
      </div>
    </div>
  );
}

import React, { useEffect, useRef, useState } from "react";

export default function BottomDock({
  children,
}: {
  children: React.ReactNode;
}) {
  const [h, setH] = useState<number>(() => {
    const v = localStorage.getItem("bbarHeight");
    return v ? parseInt(v, 10) : 160;
  });
  const dragging = useRef(false);
  useEffect(() => {
    document.documentElement.style.setProperty("--bbar-h", h + "px");
    localStorage.setItem("bbarHeight", String(h));
  }, [h]);
  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragging.current) return;

      let clientY: number;
      if (e instanceof TouchEvent) {
        clientY = e.touches[0].clientY;
      } else {
        clientY = e.clientY;
      }
      const y = window.innerHeight - clientY;
      setH(Math.max(120, Math.min(480, y)));
    };
    const onUp = () => (dragging.current = false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, []);
  return (
    <div className="bottomdock-wrap">
      <div
        className="bottomdock-resize"
        onMouseDown={() => {
          dragging.current = true;
        }}
        onTouchStart={() => {
          dragging.current = true;
        }}
        title="Drag to resize data area"
      />
      <div className="bottomdock" style={{ height: `var(--bbar-h, ${h}px)` }}>
        {children}
      </div>
    </div>
  );
}

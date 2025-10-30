import { useCallback, useEffect, useRef, useState } from "react";

type UseTimerOpts = {
  holdToStartMs: number;
  phases: number;
  onStop: (elapsed: number, splits: number[]) => void;
};

export function useTimer({ holdToStartMs, phases, onStop }: UseTimerOpts) {
  const [running, setRunning] = useState(false);
  const [ready, setReady] = useState(false);
  const [holding, setHolding] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [splitCount, setSplitCount] = useState(0);

  const startRef = useRef<number | null>(null);
  const holdStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const splitsRef = useRef<number[]>([]);

  // Start timer
  const start = useCallback(() => {
    setRunning(true);
    setSplitCount(0);
    splitsRef.current = [];
    const t0 = performance.now();
    startRef.current = t0;

    const tick = (t: number) => {
      if (!startRef.current) return;
      setElapsed(t - startRef.current);
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, []);

  // Finalize timer
  const finalize = useCallback(() => {
    if (!startRef.current) return;
    const total = performance.now() - startRef.current;

    // Ensure the on-screen value matches what we save
    setElapsed(total);

    setRunning(false);
    setReady(false);
    setHolding(false);
    startRef.current = null;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    onStop(total, splitsRef.current.slice());
  }, [onStop]);

  // Stop or split
  const stopOrSplit = useCallback(() => {
    if (!startRef.current) return;
    const now = performance.now();
    const curElapsed = now - startRef.current;
    const p = Math.max(1, phases | 0);
    if (p > 1 && splitCount < p - 1) {
      splitsRef.current.push(curElapsed);
      setSplitCount((c) => c + 1);
      return;
    }
    finalize();
  }, [phases, splitCount, finalize]);

  // Hold start (touch/mouse/keyboard)
  const handleHoldStart = useCallback(() => {
    if (running) return;
    if (!holding) {
      setHolding(true);
      holdStartRef.current = performance.now();
    }
  }, [running, holding]);

  // Hold end (touch/mouse/keyboard)
  const handleHoldEnd = useCallback(() => {
    if (running) {
      stopOrSplit();
      return;
    }
    if (ready && !running) start();
    setReady(false);
    setHolding(false);
    holdStartRef.current = null;
  }, [running, ready, start, stopOrSplit]);

  // Keyboard support:
  // - While running: ANY keydown stops/splits (ignore auto-repeat)
  // - While idle: Space = hold-to-start (keydown), release Space = start (keyup)
  useEffect(() => {
    const shouldIgnore = (el: EventTarget | null) => {
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      return (
        el.isContentEditable ||
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        tag === "BUTTON"
      );
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (shouldIgnore(e.target)) return;

      if (running) {
        if (!e.repeat) {
          e.preventDefault();
          stopOrSplit();
        }
        return;
      }

      // Not running: begin hold on Space
      if (e.code === "Space") {
        e.preventDefault();
        handleHoldStart();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (shouldIgnore(e.target)) return;

      if (running) return; // already handled on keydown

      // Not running: end hold on Space (may start if ready)
      if (e.code === "Space") {
        e.preventDefault();
        handleHoldEnd();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [running, stopOrSplit, handleHoldStart, handleHoldEnd]);

  // Interval to check if hold duration has been reached
  useEffect(() => {
    const id = setInterval(() => {
      if (holding && !running && holdStartRef.current) {
        const d = performance.now() - holdStartRef.current;
        if (d >= holdToStartMs) setReady(true);
      }
    }, 10);
    return () => clearInterval(id);
  }, [holding, running, holdToStartMs]);

  return {
    running,
    ready,
    holding,
    elapsed,
    start,
    stop: finalize,
    splitCount,
    handleHoldStart,
    handleHoldEnd,
  };
}

import { useEffect, useRef, useState } from "react";

const KEY = "admin_sound_on";

let ctx: AudioContext | null = null;

function beep() {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    ctx = ctx || new AC();
    if (ctx.state === "suspended") ctx.resume();
    [0, 0.22].forEach((delay, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = "sine";
      o.frequency.value = i === 0 ? 880 : 1175;
      const t = ctx!.currentTime + delay;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(ctx!.destination);
      o.start(t); o.stop(t + 0.32);
    });
  } catch { /* звук недоступен */ }
}

export function useWaitingSound(total: number, ready: boolean) {
  const [enabled, setEnabled] = useState(() => localStorage.getItem(KEY) !== "0");
  const prev = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (prev.current !== null && total > prev.current && enabled) beep();
    prev.current = total;
  }, [total, ready, enabled]);

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    localStorage.setItem(KEY, next ? "1" : "0");
    if (next) beep();
  };

  return { enabled, toggle };
}

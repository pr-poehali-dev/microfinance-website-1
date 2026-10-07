import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";

const WHEEL_URL = "https://functions.poehali.dev/888c823d-1066-461d-b1c3-efa376f3fa91";

const SEGMENTS = [
  { key: "rub100", lines: ["100 ₽"] },
  { key: "pct5", lines: ["-5%"] },
  { key: "rub200", lines: ["200 ₽"] },
  { key: "pct10", lines: ["-10%"] },
  { key: "rub300", lines: ["300 ₽"] },
  { key: "pct20", lines: ["-20%"] },
  { key: "rub400", lines: ["400 ₽"] },
  { key: "pct30", lines: ["-30%"] },
  { key: "rub500", lines: ["500 ₽"] },
  { key: "pct40", lines: ["-40%"] },
  { key: "jackpot", lines: ["10 000 ₽"] },
  { key: "pct50", lines: ["-50%"] },
  { key: "approve100", lines: ["100%", "одобрение"] },
  { key: "zero1", lines: ["1-й займ", "под 0%"] },
  { key: "zero2", lines: ["2-й займ", "под 0%"] },
];

const COLORS = ["#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];
const SIZE = 340;
const R = SIZE / 2;
const RIM = 14;
const RW = R - RIM;
const STEP = 360 / SEGMENTS.length;

function getVisitorId() {
  let id = localStorage.getItem("wheel_visitor_id");
  if (!id) {
    id = (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}${Math.random().toString(36).slice(2)}`).replace(/[^a-zA-Z0-9-]/g, "");
    localStorage.setItem("wheel_visitor_id", id);
  }
  return id;
}

function polar(angleDeg: number, radius: number) {
  const a = ((angleDeg - 90) * Math.PI) / 180;
  return [R + radius * Math.cos(a), R + radius * Math.sin(a)];
}

function fontFor(lines: string[]) {
  const longest = Math.max(...lines.map((l) => l.length));
  const byLength = 88 / (longest * 0.62);
  const byHeight = lines.length === 1 ? 17 : 13;
  return Math.max(10, Math.min(byLength, byHeight));
}

export default function FortuneWheel() {
  const [visible, setVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<string | null>(null);
  const [error, setError] = useState("");
  const visitorId = useMemo(getVisitorId, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${WHEEL_URL}?visitorId=${visitorId}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.spun) {
          setPrize(d.prizeLabel);
          const idx = SEGMENTS.findIndex((s) => s.key === d.prizeKey);
          if (idx >= 0) setRotation(360 * 5 - (idx * STEP + STEP / 2));
        }
      })
      .catch(() => {});
    const t = setTimeout(() => {
      if (cancelled) return;
      setVisible(true);
      setOpen(true);
    }, 10000);
    return () => { cancelled = true; clearTimeout(t); };
  }, [visitorId]);

  const spin = async () => {
    if (spinning || prize) return;
    setSpinning(true);
    setError("");
    try {
      const res = await fetch(WHEEL_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId }),
      });
      const d = await res.json();
      if (!d.spun) throw new Error();
      const idx = SEGMENTS.findIndex((s) => s.key === d.prizeKey);
      const target = 360 * 8 - (idx * STEP + STEP / 2);
      setRotation(target);
      setTimeout(() => { setPrize(d.prizeLabel); setSpinning(false); }, 5200);
    } catch {
      setError("Не удалось крутить колесо, попробуйте ещё раз");
      setSpinning(false);
    }
  };

  if (!visible) return null;

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-40 btn-neon text-white font-bold py-4 pl-3 pr-2 rounded-l-2xl flex flex-col items-center gap-1"
          aria-label="Колесо фортуны"
        >
          <span className="text-2xl">🎁</span>
          <span className="text-xs font-oswald tracking-wider" style={{ writingMode: "vertical-rl" }}>ПРИЗ</span>
        </button>
      )}

      <div
        className="fixed top-1/2 right-0 z-50 w-[390px] max-w-[96vw] rounded-l-3xl p-5 transition-transform duration-500"
        style={{
          transform: `translateY(-50%) translateX(${open ? "0" : "110%"})`,
          background: "linear-gradient(160deg,#fff7ed 0%,#ffffff 45%,#ecfdf5 100%)",
          border: "2px solid #fbbf24",
          boxShadow: "0 10px 60px rgba(245,158,11,0.45), 0 0 0 4px rgba(16,185,129,0.15)",
        }}
      >
        <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-emerald-950/40 hover:text-emerald-950" aria-label="Закрыть">
          <Icon name="X" size={20} />
        </button>

        <div className="text-center mb-3">
          <div className="font-oswald text-3xl font-bold" style={{ background: "linear-gradient(90deg,#ef4444,#f59e0b,#10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Колесо фортуны</div>
          <div className="text-emerald-950/50 text-sm">Крутите и получите приз к займу</div>
        </div>

        <div className="relative mx-auto" style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}>
          <div className="absolute left-1/2 -top-3 z-10 -translate-x-1/2"
            style={{ width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "28px solid #dc2626", filter: "drop-shadow(0 3px 3px rgba(0,0,0,0.35))" }} />
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full"
            style={{ filter: "drop-shadow(0 8px 18px rgba(0,0,0,0.3))" }}>
            <defs>
              <radialGradient id="wheelHub" cx="50%" cy="35%" r="70%">
                <stop offset="0%" stopColor="#fef3c7" />
                <stop offset="100%" stopColor="#f59e0b" />
              </radialGradient>
              <linearGradient id="wheelRim" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="50%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#b45309" />
              </linearGradient>
            </defs>
            <circle cx={R} cy={R} r={R - 1} fill="url(#wheelRim)" />
            <g style={{ transformOrigin: `${R}px ${R}px`, transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 5s cubic-bezier(0.12, 0.7, 0.1, 1)" : "none" }}>
              {SEGMENTS.map((sg, i) => {
                const a0 = i * STEP;
                const a1 = (i + 1) * STEP;
                const [x0, y0] = polar(a0, RW);
                const [x1, y1] = polar(a1, RW);
                const mid = a0 + STEP / 2;
                const jackpot = sg.key === "jackpot";
                const fs = fontFor(sg.lines);
                const [tx, ty] = polar(mid, RW - 14);
                const lh = fs * 1.05;
                return (
                  <g key={sg.key}>
                    <path d={`M${R},${R} L${x0},${y0} A${RW},${RW} 0 0 1 ${x1},${y1} Z`}
                      fill={jackpot ? "#111827" : COLORS[i % COLORS.length]} stroke="#ffffff" strokeWidth="2" />
                    <g transform={`translate(${tx} ${ty}) rotate(${mid - 90})`}>
                      {sg.lines.map((ln, li) => (
                        <text key={li} x="0" y={(li - (sg.lines.length - 1) / 2) * lh} fill={jackpot ? "#fbbf24" : "#ffffff"}
                          fontSize={fs} fontWeight="800" textAnchor="end" dominantBaseline="central"
                          style={{ paintOrder: "stroke", stroke: jackpot ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.35)", strokeWidth: 2.5, strokeLinejoin: "round" }}>
                          {ln}
                        </text>
                      ))}
                    </g>
                  </g>
                );
              })}
            </g>
            {Array.from({ length: 24 }).map((_, i) => {
              const [bx, by] = polar((360 / 24) * i, R - RIM / 2);
              return <circle key={i} cx={bx} cy={by} r="3.2" fill={i % 2 ? "#ffffff" : "#fef08a"} />;
            })}
            <circle cx={R} cy={R} r="26" fill="url(#wheelHub)" stroke="#ffffff" strokeWidth="4" />
            <text x={R} y={R} textAnchor="middle" dominantBaseline="central" fontSize="22">🎁</text>
          </svg>
        </div>

        {prize ? (
          <div className="mt-4 text-center rounded-2xl p-4" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <div className="text-emerald-950/60 text-sm">Ваш приз</div>
            <div className="font-oswald text-2xl font-bold text-emerald-700 my-1">{prize}</div>
            <div className="text-emerald-950/50 text-xs">Назовите приз специалисту при оформлении займа</div>
          </div>
        ) : (
          <>
            <button onClick={spin} disabled={spinning}
              className="text-white font-bold w-full py-3.5 rounded-2xl mt-4 disabled:opacity-60 text-lg"
              style={{ background: "linear-gradient(135deg,#f59e0b,#ef4444)", boxShadow: "0 0 30px rgba(245,158,11,0.55)" }}>
              {spinning ? "Крутится..." : "Крутить колесо"}
            </button>
            {error && <div className="text-red-600 text-xs text-center mt-2">{error}</div>}
          </>
        )}
      </div>
    </>
  );
}

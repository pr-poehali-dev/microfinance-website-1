import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/ui/icon";

const WHEEL_URL = "https://functions.poehali.dev/888c823d-1066-461d-b1c3-efa376f3fa91";

const SEGMENTS = [
  { key: "rub100", label: "100 ₽" },
  { key: "pct5", label: "-5%" },
  { key: "rub200", label: "200 ₽" },
  { key: "pct10", label: "-10%" },
  { key: "rub300", label: "300 ₽" },
  { key: "pct20", label: "-20%" },
  { key: "rub400", label: "400 ₽" },
  { key: "pct30", label: "-30%" },
  { key: "rub500", label: "500 ₽" },
  { key: "pct40", label: "-40%" },
  { key: "jackpot", label: "10 000 ₽" },
  { key: "pct50", label: "-50%" },
  { key: "approve100", label: "100% одобр." },
  { key: "zero1", label: "1-й под 0%" },
  { key: "zero2", label: "2-й под 0%" },
];

const COLORS = ["#10b981", "#0f766e", "#14b8a6", "#047857", "#34d399", "#115e59"];
const SIZE = 300;
const R = SIZE / 2;
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
        className="fixed top-1/2 right-0 z-50 w-[340px] max-w-[94vw] rounded-l-3xl p-5 transition-transform duration-500"
        style={{
          transform: `translateY(-50%) translateX(${open ? "0" : "110%"})`,
          background: "#ffffff",
          border: "1px solid rgba(16,185,129,0.25)",
          boxShadow: "0 10px 50px rgba(16,185,129,0.3)",
        }}
      >
        <button onClick={() => setOpen(false)} className="absolute top-3 right-3 text-emerald-950/40 hover:text-emerald-950" aria-label="Закрыть">
          <Icon name="X" size={20} />
        </button>

        <div className="text-center mb-3">
          <div className="font-oswald text-2xl font-bold text-emerald-950">Колесо фортуны</div>
          <div className="text-emerald-950/50 text-sm">Крутите и получите приз к займу</div>
        </div>

        <div className="relative mx-auto" style={{ width: SIZE, height: SIZE, maxWidth: "100%" }}>
          <div className="absolute left-1/2 -top-2 z-10 -translate-x-1/2"
            style={{ width: 0, height: 0, borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "22px solid #dc2626", filter: "drop-shadow(0 2px 2px rgba(0,0,0,0.3))" }} />
          <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full h-full"
            style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "transform 5s cubic-bezier(0.12, 0.7, 0.1, 1)" : "none", borderRadius: "50%", boxShadow: "0 0 0 6px #064e3b, 0 6px 20px rgba(0,0,0,0.25)" }}>
            {SEGMENTS.map((s, i) => {
              const a0 = i * STEP;
              const a1 = (i + 1) * STEP;
              const [x0, y0] = polar(a0, R);
              const [x1, y1] = polar(a1, R);
              const mid = a0 + STEP / 2;
              const [tx, ty] = polar(mid, R * 0.66);
              const jackpot = s.key === "jackpot";
              return (
                <g key={s.key}>
                  <path d={`M${R},${R} L${x0},${y0} A${R},${R} 0 0 1 ${x1},${y1} Z`}
                    fill={jackpot ? "#f59e0b" : COLORS[i % COLORS.length]} stroke="#ffffff" strokeWidth="1.5" />
                  <text x={tx} y={ty} fill="#ffffff" fontSize="11" fontWeight="700" textAnchor="middle" dominantBaseline="middle"
                    transform={`rotate(${mid} ${tx} ${ty})`}>{s.label}</text>
                </g>
              );
            })}
            <circle cx={R} cy={R} r="20" fill="#ffffff" stroke="#064e3b" strokeWidth="4" />
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
              className="btn-neon text-white font-bold w-full py-3.5 rounded-2xl mt-4 disabled:opacity-60">
              {spinning ? "Крутится..." : "Крутить колесо"}
            </button>
            {error && <div className="text-red-600 text-xs text-center mt-2">{error}</div>}
          </>
        )}
      </div>
    </>
  );
}

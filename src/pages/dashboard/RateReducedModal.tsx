import { useState } from "react";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

export interface RateNews {
  type: string;
  oldRate: number;
  newRate: number;
  unit: string;
}

interface Props {
  news: RateNews[];
  onClose: () => void;
}

const TITLES: Record<string, string> = {
  loan: "Займ",
  carloan: "Займ под залог авто",
  shoploan: "Займ на покупки",
  card: "Карта РУСФИНАНС 24",
};

export default function RateReducedModal({ news, onClose }: Props) {
  const [closing, setClosing] = useState(false);

  const close = async () => {
    setClosing(true);
    const token = localStorage.getItem("token");
    if (token) {
      await fetch(`${LOANS_URL}?sub=rate_seen`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
        body: "{}",
      }).catch(() => {});
    }
    onClose();
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={close}
    >
      <div
        style={{ borderRadius: 24, width: "100%", maxWidth: 400, overflow: "hidden", background: "#ffffff", border: "1px solid rgba(16,185,129,0.4)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 pt-8 pb-6 text-center" style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.28),rgba(20,184,166,0.1))" }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)" }}>
            <Icon name="TrendingDown" size={32} className="text-white" />
          </div>
          <div className="text-emerald-950 font-bold text-2xl mb-1">Хорошие новости!</div>
          <p className="text-emerald-950/70 text-sm leading-relaxed">Для вас снижена процентная ставка</p>
        </div>
        <div className="px-4 sm:px-6 py-5 space-y-3">
          {news.map((n, i) => (
            <div key={i} className="rounded-xl px-4 py-3" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
              <div className="text-emerald-950/60 text-xs mb-1">{TITLES[n.type] || "Продукт"}</div>
              <div className="text-emerald-950 font-bold text-lg">
                <span className="line-through text-emerald-950/40 font-semibold">{n.oldRate}%</span>
                {" → "}
                <span style={{ color: "#059669" }}>{n.newRate}%</span>
                <span className="text-emerald-950/60 text-sm font-medium"> {n.unit}</span>
              </div>
            </div>
          ))}
          <button onClick={close} disabled={closing} className="w-full btn-neon text-white font-semibold py-3.5 rounded-xl disabled:opacity-60">
            Отлично
          </button>
        </div>
      </div>
    </div>
  );
}

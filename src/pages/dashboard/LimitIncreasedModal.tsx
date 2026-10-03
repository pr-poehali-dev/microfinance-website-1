import { useState } from "react";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

export interface LimitIncrease {
  added: number;
  newLimit: number;
}

interface Props {
  increases: LimitIncrease[];
  onClose: () => void;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

export default function LimitIncreasedModal({ increases, onClose }: Props) {
  const [closing, setClosing] = useState(false);
  const totalAdded = increases.reduce((s, i) => s + i.added, 0);
  const newLimit = increases[increases.length - 1]?.newLimit ?? 0;

  const close = async () => {
    setClosing(true);
    const token = localStorage.getItem("token");
    if (token) {
      await fetch(`${LOANS_URL}?sub=limit_seen`, {
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
        style={{ borderRadius: 24, width: "100%", maxWidth: 400, overflow: "hidden", background: "#ffffff", border: "1px solid rgba(16,185,129,0.4)", boxShadow: "0 20px 60px rgba(16,185,129,0.25)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-8 pb-6 text-center" style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.28),rgba(20,184,166,0.1))" }}>
          <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)" }}>
            <Icon name="TrendingUp" size={32} className="text-white" />
          </div>
          <div className="text-emerald-950 font-bold text-2xl mb-1">Поздравляем!</div>
          <p className="text-emerald-950/70 text-sm leading-relaxed">
            Вам был увеличен кредитный лимит на сумму
          </p>
          <div className="font-bold text-3xl mt-2" style={{ color: "#059669" }}>+ {fmt(totalAdded)}</div>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <span className="text-emerald-950/60 text-sm">Новый лимит по карте</span>
            <span className="font-bold text-lg text-emerald-950">{fmt(newLimit)}</span>
          </div>
          <button onClick={close} disabled={closing} className="w-full btn-neon text-white font-semibold py-3.5 rounded-xl disabled:opacity-60">
            Отлично
          </button>
        </div>
      </div>
    </div>
  );
}

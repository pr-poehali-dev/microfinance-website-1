import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "@/components/ui/icon";
import { GIFTS_URL, Gift } from "@/lib/giftsApi";

const STEPS = [
  { icon: "BadgeCheck", title: "Погасите займ", desc: "Вернув займ без просрочек, вы получаете 100 баллов в личном кабинете" },
  { icon: "Coins", title: "Копите баллы", desc: "Баллы начисляются автоматически за каждый погашенный займ" },
  { icon: "Gift", title: "Выбирайте подарок", desc: "Обменяйте баллы на фирменные подарки РУСФИНАНС 24 в личном кабинете" },
];

export default function GiftsPage() {
  const navigate = useNavigate();
  const [gifts, setGifts] = useState<Gift[]>([]);

  useEffect(() => {
    fetch(`${GIFTS_URL}?sub=list`).then((r) => r.json()).then((d) => setGifts(d.gifts || [])).catch(() => {});
  }, []);

  const toCabinet = () => navigate(localStorage.getItem("token") ? "/dashboard?section=gifts" : "/login");

  return (
    <div className="min-h-screen font-golos" style={{ background: "#ffffff" }}>
      <div className="max-w-6xl mx-auto px-4 py-8">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 text-emerald-700 text-sm font-semibold mb-6 hover:opacity-80">
          <Icon name="ArrowLeft" size={16} /> На главную
        </button>

        <div className="rounded-3xl p-6 sm:p-10 mb-10 text-center" style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.15),rgba(20,184,166,0.08))", border: "1px solid rgba(16,185,129,0.35)" }}>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold text-emerald-700 mb-4" style={{ background: "rgba(16,185,129,0.15)" }}>
            <Icon name="Gift" size={16} /> Программа лояльности
          </div>
          <h1 className="font-oswald text-3xl sm:text-5xl font-bold text-emerald-950 mb-3">
            Погасите займ без просрочек — <span className="gradient-text">получите подарок</span>
          </h1>
          <p className="text-emerald-950/60 max-w-2xl mx-auto mb-6">
            При погашении займов вам начисляются баллы в личном кабинете. С помощью этих баллов вы можете обменять их на наши подарки прямо в личном кабинете.
          </p>
          <button onClick={toCabinet} className="btn-neon text-white font-bold px-8 py-3.5 rounded-2xl">
            Перейти в личный кабинет
          </button>
        </div>

        <div className="grid sm:grid-cols-3 gap-4 mb-12">
          {STEPS.map((s, i) => (
            <div key={s.title} className="rounded-2xl p-5" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                  <Icon name={s.icon} size={20} className="text-emerald-600" />
                </div>
                <div className="font-oswald text-emerald-600 text-lg">0{i + 1}</div>
              </div>
              <div className="font-bold text-emerald-950">{s.title}</div>
              <div className="text-emerald-950/60 text-sm mt-1">{s.desc}</div>
            </div>
          ))}
        </div>

        <h2 className="font-oswald text-2xl sm:text-3xl font-bold text-emerald-950 mb-6">Наши подарки</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {gifts.map((g) => (
            <div key={g.id} className="rounded-2xl overflow-hidden bg-white" style={{ border: "1px solid rgba(16,185,129,0.2)", boxShadow: "0 4px 20px rgba(16,185,129,0.08)" }}>
              <img src={g.imageUrl} alt={g.name} className="w-full aspect-square object-cover" loading="lazy" />
              <div className="p-3 sm:p-4">
                <div className="font-bold text-emerald-950 text-sm sm:text-base leading-tight">{g.name}</div>
                <div className="text-emerald-950/50 text-xs mt-1 line-clamp-2">{g.description}</div>
                <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold text-emerald-800" style={{ background: "rgba(16,185,129,0.14)" }}>
                  <Icon name="Coins" size={14} /> {g.pointsCost} баллов
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

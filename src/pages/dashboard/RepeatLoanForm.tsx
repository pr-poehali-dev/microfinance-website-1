import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

interface Props {
  promo?: { code: string; discount: number } | null;
  fullName: string;
  phone: string;
  onSuccess: () => void;
}

export default function RepeatLoanForm({ promo, fullName, phone, onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(20000);
  const [days, setDays] = useState(30);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const calc = useMemo(() => {
    const interest = Math.round(amount * 0.008 * days * (100 - (promo?.discount || 0)) / 100);
    const total = amount + interest;
    const amountBg = `linear-gradient(to right, #10b981 ${((amount - 5000) / (100000 - 5000)) * 100}%, rgba(16,185,129,0.2) ${((amount - 5000) / (100000 - 5000)) * 100}%)`;
    const daysBg = `linear-gradient(to right, #10b981 ${((days - 5) / (365 - 5)) * 100}%, rgba(16,185,129,0.2) ${((days - 5) / (365 - 5)) * 100}%)`;
    return { interest, total, amountBg, daysBg };
  }, [amount, days, promo]);

  async function submit() {
    const token = localStorage.getItem("token");
    if (!token) return;
    setSending(true);
    setError("");
    const res = await fetch(LOANS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
      body: JSON.stringify({ amount, days }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setError(data.error || "Не удалось отправить заявку"); return; }
    setDone(true);
    onSuccess();
  }

  if (done) {
    return (
      <div className="glass rounded-2xl overflow-hidden mb-6"
        style={{ border: "1px solid rgba(74,222,128,0.4)", background: "rgba(74,222,128,0.04)" }}>
        <div className="px-6 py-5 flex items-center gap-3">
          <Icon name="CheckCircle" size={24} className="text-green-400 shrink-0" />
          <div>
            <div className="text-emerald-950 font-bold">Заявка отправлена!</div>
            <div className="text-emerald-950/50 text-sm mt-0.5">Мы свяжемся с вами в ближайшее время</div>
          </div>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="glass rounded-2xl overflow-hidden mb-6"
        style={{ border: "1px solid rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.04)" }}>
        <div className="px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.2)" }}>
              <Icon name="RefreshCw" size={20} className="text-emerald-600" />
            </div>
            <div>
              <div className="text-emerald-950 font-bold">Оформить новый займ</div>
              <div className="text-emerald-950/40 text-sm">Ваши данные уже сохранены — укажите только сумму и срок</div>
            </div>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="btn-neon text-white font-semibold px-6 py-3 rounded-xl flex items-center gap-2"
          >
            <Icon name="Plus" size={16} />
            Подать заявку
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl overflow-hidden mb-6"
      style={{ border: "1px solid rgba(16,185,129,0.4)", background: "rgba(16,185,129,0.04)" }}>
      <div className="px-6 py-4 flex items-center justify-between gap-3"
        style={{ background: "linear-gradient(135deg,rgba(16,185,129,0.25),rgba(20,184,166,0.08))" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.2)" }}>
            <Icon name="Calculator" size={18} className="text-emerald-600" />
          </div>
          <div className="text-emerald-950 font-bold">Новая заявка на займ</div>
        </div>
        <button onClick={() => setOpen(false)} className="text-emerald-950/40 hover:text-emerald-950/70 transition-colors">
          <Icon name="X" size={20} />
        </button>
      </div>

      <div className="px-6 py-5 space-y-5">
        {/* Проверка данных */}
        <div className="rounded-xl px-4 py-3 space-y-2" style={{ background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.08)" }}>
          <div className="text-emerald-950/40 text-xs uppercase tracking-wider mb-1">Проверьте свои данные</div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-950/50">ФИО</span>
            <span className="text-emerald-950 font-medium">{fullName || "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-emerald-950/50">Телефон</span>
            <span className="text-emerald-950 font-medium">{phone}</span>
          </div>
          <div className="text-emerald-950/30 text-xs pt-1">Паспортные и рабочие данные возьмём из вашей предыдущей заявки</div>
        </div>

        {/* Сумма */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-emerald-950/60 text-sm">Желаемая сумма</span>
            <span className="font-bold text-base gradient-text">{amount.toLocaleString("ru-RU")} ₽</span>
          </div>
          <input
            type="range" min={5000} max={100000} step={5000}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="slider-custom w-full"
            style={{ background: calc.amountBg }}
          />
          <div className="flex justify-between text-emerald-950/30 text-xs mt-1">
            <span>5 000 ₽</span>
            <span>100 000 ₽</span>
          </div>
        </div>

        {/* Срок */}
        <div>
          <div className="flex justify-between mb-2">
            <span className="text-emerald-950/60 text-sm">Срок займа</span>
            <span className="font-bold text-base gradient-text">{days} дн.</span>
          </div>
          <input
            type="range" min={5} max={365} step={1}
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="slider-custom w-full"
            style={{ background: calc.daysBg }}
          />
          <div className="flex justify-between text-emerald-950/30 text-xs mt-1">
            <span>5 дней</span>
            <span>365 дней</span>
          </div>
        </div>

        {promo && (
          <div className="rounded-xl px-4 py-3 text-sm text-emerald-950" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
            Применён промокод <b>{promo.code}</b>: скидка {promo.discount}% на проценты
          </div>
        )}

        {/* Итог */}
        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
          <span className="text-emerald-950/50 text-sm">К возврату</span>
          <span className="font-bold text-xl gradient-text">{calc.total.toLocaleString("ru-RU")} ₽</span>
        </div>

        {error && (
          <div className="rounded-xl px-4 py-3 text-sm font-medium" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626" }}>
            {error}
          </div>
        )}

        <button
          onClick={submit}
          disabled={sending}
          className="w-full btn-neon text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {sending ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="Send" size={18} />}
          {sending ? "Отправляем..." : "Отправить заявку"}
        </button>
      </div>
    </div>
  );
}
import { useMemo, useState } from "react";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";
const CARD_WEEKLY_RATE = 24;

interface Props {
  available: number;
  defaultCard?: string;
  onSuccess: () => void;
}

export default function CardWithdrawForm({ available, defaultCard, onSuccess }: Props) {
  const [cardNumber, setCardNumber] = useState(defaultCard || "");
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(Math.min(5000, Math.max(1000, Math.round(available / 2))));
  const [weeks, setWeeks] = useState(4);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const maxAmount = Math.max(1000, Math.floor(available));

  const calc = useMemo(() => {
    const interest = Math.round(amount * (CARD_WEEKLY_RATE / 100) * weeks);
    const total = amount + interest;
    const weeklyPayment = Math.round(total / weeks);
    return { interest, total, weeklyPayment };
  }, [amount, weeks]);

  async function submit() {
    if (amount <= 0 || amount > available) { setError("Проверьте сумму перевода"); return; }
    if (cardNumber.replace(/\s/g, "").length < 10) { setError("Укажите номер вашей карты, куда перевести деньги"); return; }
    const token = localStorage.getItem("token");
    if (!token) return;
    setSending(true); setError("");
    const res = await fetch(`${LOANS_URL}?sub=card_withdraw`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
      body: JSON.stringify({ amount, weeks, cardNumber: cardNumber.trim() }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setError(data.error || "Не удалось выполнить перевод"); return; }
    setDone(true);
    onSuccess();
  }

  if (available < 1000) return null;

  if (done) {
    return (
      <div className="rounded-xl px-5 py-4 flex items-center gap-3"
        style={{ background: "rgba(74,222,128,0.1)", border: "1px solid rgba(74,222,128,0.3)" }}>
        <Icon name="CheckCircle" size={20} className="text-green-400 shrink-0" />
        <div className="text-green-300 text-sm font-medium">Заявка на перевод принята! Деньги будут переведены на вашу карту.</div>
      </div>
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-bold text-white transition-all hover:opacity-90"
        style={{ background: "linear-gradient(135deg,#16a34a,#4ade80)", boxShadow: "0 4px 20px rgba(74,222,128,0.25)" }}>
        <Icon name="Wallet" size={18} />
        Перевести деньги на мою карту
      </button>
    );
  }

  return (
    <div className="rounded-xl p-5 space-y-4" style={{ background: "rgba(74,222,128,0.06)", border: "1px solid rgba(74,222,128,0.25)" }}>
      <div className="flex items-center justify-between">
        <div className="text-emerald-950 font-semibold flex items-center gap-2">
          <Icon name="Wallet" size={16} className="text-green-400" />
          Перевод с карты
        </div>
        <button onClick={() => setOpen(false)} className="text-emerald-950/40 hover:text-emerald-950/70 transition-colors">
          <Icon name="X" size={18} />
        </button>
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <span className="text-emerald-950/60 text-sm">Сумма перевода</span>
          <span className="font-bold text-base text-green-400">{amount.toLocaleString("ru-RU")} ₽</span>
        </div>
        <input
          type="number" min={1000} max={maxAmount} value={amount}
          onChange={(e) => setAmount(Math.min(maxAmount, Math.max(0, Number(e.target.value) || 0)))}
          placeholder="Введите сумму"
          className="w-full rounded-xl px-4 py-2.5 mb-3 text-emerald-950 text-sm outline-none"
          style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.25)" }}
        />
        <input
          type="range" min={1000} max={maxAmount} step={500}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="slider-custom w-full"
          style={{ background: `linear-gradient(to right, #4ade80 ${((amount - 1000) / Math.max(1, maxAmount - 1000)) * 100}%, rgba(74,222,128,0.2) ${((amount - 1000) / Math.max(1, maxAmount - 1000)) * 100}%)` }}
        />
        <div className="flex justify-between text-emerald-950/30 text-xs mt-1">
          <span>1 000 ₽</span>
          <span>Доступно: {maxAmount.toLocaleString("ru-RU")} ₽</span>
        </div>
      </div>

      <div>
        <div className="flex justify-between mb-2">
          <span className="text-emerald-950/60 text-sm">Срок</span>
          <span className="font-bold text-base text-green-400">{weeks} {weeks === 1 ? "неделя" : weeks < 5 ? "недели" : "недель"}</span>
        </div>
        <input
          type="range" min={1} max={12} step={1}
          value={weeks}
          onChange={(e) => setWeeks(Number(e.target.value))}
          className="slider-custom w-full"
          style={{ background: `linear-gradient(to right, #4ade80 ${((weeks - 1) / 11) * 100}%, rgba(74,222,128,0.2) ${((weeks - 1) / 11) * 100}%)` }}
        />
        <div className="flex justify-between text-emerald-950/30 text-xs mt-1">
          <span>1 неделя</span>
          <span>12 недель</span>
        </div>
      </div>

      <div>
        <div className="text-emerald-950/60 text-sm mb-2">Номер вашей карты, куда перевести деньги</div>
        <input
          type="text" inputMode="numeric" value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          placeholder="0000 0000 0000 0000"
          className="w-full rounded-xl px-4 py-2.5 text-emerald-950 text-sm outline-none"
          style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.25)" }}
        />
      </div>

      <div className="rounded-lg p-3 space-y-1.5" style={{ background: "rgba(16,185,129,0.05)" }}>
        <div className="flex justify-between text-sm">
          <span className="text-emerald-950/50">Ставка</span>
          <span className="text-emerald-950 font-semibold">{CARD_WEEKLY_RATE}% / неделя</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-emerald-950/50">Платёж в неделю</span>
          <span className="text-emerald-950 font-semibold">{calc.weeklyPayment.toLocaleString("ru-RU")} ₽</span>
        </div>
        <div className="flex justify-between text-sm pt-1.5 border-t border-emerald-900/15">
          <span className="text-emerald-950/50">К возврату</span>
          <span className="text-green-400 font-bold">{calc.total.toLocaleString("ru-RU")} ₽</span>
        </div>
      </div>

      {error && (
        <div className="rounded-lg px-4 py-2.5 text-sm" style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", color: "#dc2626" }}>
          {error}
        </div>
      )}

      <button onClick={submit} disabled={sending}
        className="w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold text-white transition-all hover:opacity-90 disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#16a34a,#4ade80)" }}>
        {sending ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="CheckCircle" size={18} />}
        {sending ? "Отправляем..." : "Перевести на мою карту"}
      </button>
    </div>
  );
}
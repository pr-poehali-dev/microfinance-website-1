import { useState } from "react";
import Icon from "@/components/ui/icon";
import { Investment, fmt } from "./investorTypes";

const YK_URL = "https://functions.poehali.dev/36947c6a-6af8-4e81-a2a4-f16b1a189b6f";
const INPUT = "w-full rounded-xl px-4 py-3 text-sm text-emerald-950 bg-white border border-emerald-900/15 focus:border-emerald-500 focus:outline-none placeholder:text-emerald-950/35";

interface Props { token: string; items: Investment[]; balance: number }

export default function InvestorTopup({ token, items, balance }: Props) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const waiting = items.filter((i) => !i.funded && i.status === "active");
  const waitingSum = waiting.reduce((s, i) => s + i.amount, 0);
  const need = Math.max(waitingSum - balance, 0);

  const pay = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const value = Number(amount);
    if (!value || value < 1000) { setError("Минимальная сумма пополнения — 1 000 ₽"); return; }
    setBusy(true);
    try {
      const r = await fetch(`${YK_URL}?sub=invest_create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
        body: JSON.stringify({ amount: value, returnUrl: `${window.location.origin}/investor` }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !d.confirmationUrl) { setError(d.error || "Не удалось открыть оплату. Попробуйте ещё раз."); setBusy(false); return; }
      localStorage.setItem("invest_payment_id", d.paymentId);
      window.location.href = d.confirmationUrl;
    } catch {
      setError("Нет связи с сервером. Попробуйте ещё раз.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <div className="font-oswald text-2xl font-bold text-emerald-950 mb-1">Пополнить баланс инвестиций</div>
        <p className="text-emerald-950/55 text-sm mb-5">Введите сумму и нажмите «Пополнить». Вы перейдёте на страницу оплаты ЮKassa, а после оплаты вернётесь в кабинет.</p>

        <div className="grid sm:grid-cols-2 gap-3 mb-5">
          <div className="rounded-xl px-4 py-3" style={{ background: "rgba(16,185,129,0.07)" }}>
            <div className="text-emerald-950/50 text-xs">Свободный остаток на балансе</div>
            <div className="text-emerald-950 font-bold text-xl">{fmt(balance)}</div>
          </div>
          <div className="rounded-xl px-4 py-3" style={{ background: "rgba(245,158,11,0.1)" }}>
            <div className="text-emerald-950/50 text-xs">Ожидает внесения по заявкам</div>
            <div className="text-emerald-950 font-bold text-xl">{fmt(waitingSum)}</div>
          </div>
        </div>

        {need > 0 && (
          <button type="button" onClick={() => setAmount(String(Math.ceil(need)))}
            className="mb-4 text-sm font-semibold rounded-xl px-4 py-2" style={{ background: "rgba(16,185,129,0.12)", color: "#047857" }}>
            Внести нужную сумму: {fmt(need)}
          </button>
        )}

        <form onSubmit={pay} className="space-y-4">
          <div>
            <label className="text-emerald-950/45 text-xs block mb-1 ml-1">Сумма пополнения, ₽</label>
            <input className={INPUT} type="number" min={1000} max={15000000} step={1} placeholder="Например, 300000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          {error && <div className="text-red-600 text-sm font-medium">{error}</div>}
          <button type="submit" disabled={busy} className="w-full btn-neon text-white font-semibold py-3.5 rounded-xl disabled:opacity-60 flex items-center justify-center gap-2">
            {busy ? <Icon name="Loader2" size={18} className="animate-spin" /> : <Icon name="CreditCard" size={18} />}
            {busy ? "Переходим к оплате..." : "Пополнить"}
          </button>
        </form>
      </div>

      {waiting.length > 0 && (
        <div className="glass rounded-3xl p-6">
          <div className="font-semibold text-emerald-950 mb-3">Вложения, ожидающие внесения</div>
          <div className="space-y-2">
            {waiting.map((i) => (
              <div key={i.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)" }}>
                <div className="text-emerald-950">Будет вложено {fmt(i.amount)}</div>
                <div className="text-emerald-950/60">после поступления средств</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

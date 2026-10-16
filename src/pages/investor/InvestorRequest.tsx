import { useState } from "react";
import Icon from "@/components/ui/icon";
import { INVEST_URL, InvestRequest, authHeaders, fmt, termText } from "./investorTypes";

const TERMS = [{ v: "6", l: "6 месяцев" }, { v: "12", l: "1 год" }, { v: "36", l: "3 года" }, { v: "60", l: "5 лет" }];
const PAYOUTS = [{ v: "monthly", l: "Каждый месяц" }, { v: "end", l: "В конце срока" }];
const INPUT = "w-full rounded-xl px-4 py-3 text-sm text-emerald-950 bg-white border border-emerald-900/15 focus:border-emerald-500 focus:outline-none placeholder:text-emerald-950/35";

const chip = (on: boolean): React.CSSProperties => on
  ? { background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "#ffffff", border: "1px solid transparent" }
  : { background: "#ffffff", color: "#064e3b", border: "1px solid rgba(6,78,59,0.15)" };

interface Props { token: string; requests: InvestRequest[]; onSent: () => void }

export default function InvestorRequest({ token, requests, onSent }: Props) {
  const [amount, setAmount] = useState("");
  const [term, setTerm] = useState("");
  const [payout, setPayout] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setDone(false);
    if (!term || !payout) { setError("Выберите срок и способ выплаты процентов"); return; }
    setBusy(true);
    const r = await fetch(`${INVEST_URL}?sub=request_create`, {
      method: "POST", headers: authHeaders(token), body: JSON.stringify({ amount, termMonths: Number(term), payout }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (r && r.ok) { setDone(true); setAmount(""); setTerm(""); setPayout(""); onSent(); }
    else setError(d.error || "Не удалось отправить заявку");
  };

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <div className="font-oswald text-2xl font-bold text-emerald-950 mb-1">Новая инвестиция</div>
        <p className="text-emerald-950/55 text-sm mb-5">Ставка от 8% в месяц. Пополнить вложения можно в любой момент — оставьте новую заявку.</p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-emerald-950/45 text-xs block mb-1 ml-1">Сумма, ₽ (от 300 000 до 15 000 000)</label>
            <input className={INPUT} type="number" min={300000} max={15000000} step={1000} placeholder="Например, 500000" value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label className="text-emerald-950/45 text-xs block mb-2 ml-1">Срок</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TERMS.map((o) => (
                <button key={o.v} type="button" onClick={() => setTerm(o.v)} className="rounded-xl py-2.5 text-sm font-semibold" style={chip(term === o.v)}>{o.l}</button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-emerald-950/45 text-xs block mb-2 ml-1">Выплата процентов</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYOUTS.map((o) => (
                <button key={o.v} type="button" onClick={() => setPayout(o.v)} className="rounded-xl py-2.5 text-sm font-semibold" style={chip(payout === o.v)}>{o.l}</button>
              ))}
            </div>
          </div>
          {error && <div className="text-red-600 text-sm font-medium">{error}</div>}
          {done && <div className="text-emerald-700 text-sm font-semibold flex items-center gap-2"><Icon name="CheckCircle" size={16} />Заявка отправлена. Мы свяжемся с вами.</div>}
          <button type="submit" disabled={busy} className="w-full btn-neon text-white font-semibold py-3.5 rounded-xl disabled:opacity-60">
            {busy ? "Отправляем..." : "Отправить заявку"}
          </button>
        </form>
      </div>

      <div className="glass rounded-3xl p-6">
        <div className="font-semibold text-emerald-950 mb-3">Мои заявки</div>
        {requests.length === 0 ? (
          <div className="text-emerald-950/40 text-sm">Заявок пока нет</div>
        ) : (
          <div className="space-y-2">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.12)" }}>
                <div>
                  <div className="text-emerald-950 font-semibold">{fmt(r.amount)} · {termText(r.termMonths)}</div>
                  <div className="text-emerald-950/45 text-xs">{r.createdAt} · проценты {r.payout === "monthly" ? "каждый месяц" : "в конце срока"}</div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={r.status === "processed" ? { background: "rgba(16,185,129,0.15)", color: "#047857" } : { background: "rgba(245,158,11,0.15)", color: "#b45309" }}>
                  {r.status === "processed" ? "Принята" : "На рассмотрении"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

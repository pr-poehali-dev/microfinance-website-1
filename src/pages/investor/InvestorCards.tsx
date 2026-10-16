import { useState } from "react";
import Icon from "@/components/ui/icon";
import { INVEST_URL, InvestorCard, authHeaders } from "./investorTypes";

const INPUT = "w-full rounded-xl px-4 py-3 text-sm text-emerald-950 bg-white border border-emerald-900/15 focus:border-emerald-500 focus:outline-none placeholder:text-emerald-950/35";

interface Props { token: string; cards: InvestorCard[]; onChanged: () => void }

export default function InvestorCards({ token, cards, onChanged }: Props) {
  const [number, setNumber] = useState("");
  const [holder, setHolder] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const call = async (sub: string, body: object) => {
    const r = await fetch(`${INVEST_URL}?sub=${sub}`, { method: "POST", headers: authHeaders(token), body: JSON.stringify(body) }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    return { ok: !!(r && r.ok), error: d.error as string | undefined };
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    const r = await call("card_add", { number, holder });
    setBusy(false);
    if (r.ok) { setNumber(""); setHolder(""); onChanged(); }
    else setError(r.error || "Не удалось добавить карту");
  };

  const fmtNum = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(.{4})/g, "$1 ").trim();

  return (
    <div className="space-y-6">
      <div className="glass rounded-3xl p-6">
        <div className="font-oswald text-2xl font-bold text-emerald-950 mb-1">Карта для выплат</div>
        <p className="text-emerald-950/55 text-sm mb-5">Укажите карту, на которую вы хотите получать проценты и возврат вложения.</p>
        <form onSubmit={add} className="space-y-3">
          <input className={INPUT} inputMode="numeric" placeholder="Номер карты" value={number} onChange={(e) => setNumber(fmtNum(e.target.value))} required />
          <input className={INPUT} placeholder="Имя владельца (как на карте, латиницей)" value={holder} onChange={(e) => setHolder(e.target.value)} />
          {error && <div className="text-red-600 text-sm font-medium">{error}</div>}
          <button type="submit" disabled={busy} className="btn-neon text-white font-semibold px-6 py-3 rounded-xl disabled:opacity-60 flex items-center gap-2">
            <Icon name="Plus" size={16} />{busy ? "Сохраняем..." : "Добавить карту"}
          </button>
        </form>
      </div>

      <div className="glass rounded-3xl p-6">
        <div className="font-semibold text-emerald-950 mb-3">Мои карты</div>
        {cards.length === 0 ? (
          <div className="text-emerald-950/40 text-sm">Карт пока нет. Добавьте карту, чтобы получать выплаты.</div>
        ) : (
          <div className="space-y-2">
            {cards.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: "rgba(16,185,129,0.06)", border: `1px solid ${c.isDefault ? "rgba(16,185,129,0.5)" : "rgba(16,185,129,0.15)"}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)" }}>
                    <Icon name="CreditCard" size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="text-emerald-950 font-semibold">•••• {c.last4}</div>
                    <div className="text-emerald-950/45 text-xs">{c.holder || "Без имени"}{c.isDefault ? " · для выплат" : ""}</div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {!c.isDefault && (
                    <button onClick={async () => { await call("card_default", { id: c.id }); onChanged(); }} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.12)", color: "#047857" }}>
                      Выплаты сюда
                    </button>
                  )}
                  <button onClick={async () => { if (window.confirm("Удалить карту?")) { await call("card_delete", { id: c.id }); onChanged(); } }} className="text-xs font-semibold px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.1)", color: "#b91c1c" }}>
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

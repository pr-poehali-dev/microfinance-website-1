import { useState } from "react";
import Icon from "@/components/ui/icon";

const LOANS_URL = "https://functions.poehali.dev/14b84c24-dd0e-4532-8efe-ba8625c760ff";

interface Props {
  promo: { code: string; discount: number } | null;
  onApplied: () => void;
}

export default function PromoCodeCard({ promo, onApplied }: Props) {
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function apply() {
    const token = localStorage.getItem("token");
    if (!token || !code.trim()) return;
    setSending(true);
    setError("");
    const res = await fetch(`${LOANS_URL}?sub=promo_apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
      body: JSON.stringify({ code: code.trim() }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) { setError(data.error || "Не удалось применить промокод"); return; }
    setCode("");
    onApplied();
  }

  return (
    <div className="glass rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid rgba(16,185,129,0.35)" }}>
      <div className="px-6 py-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(16,185,129,0.2)" }}>
            <Icon name="Ticket" size={20} className="text-emerald-600" />
          </div>
          <div>
            <div className="text-emerald-950 font-bold">Промокод</div>
            <div className="text-emerald-950/50 text-sm">Скидка на проценты применится к вашему следующему займу</div>
          </div>
        </div>

        {promo ? (
          <div className="rounded-xl px-4 py-3 flex items-center gap-3" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
            <Icon name="CheckCircle" size={20} className="text-emerald-600 shrink-0" />
            <div className="text-emerald-950 text-sm">
              Промокод <b>{promo.code}</b> активирован: скидка <b>{promo.discount}%</b> на проценты по следующему займу
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => { setCode(e.target.value.toUpperCase()); setError(""); }}
                placeholder="Введите промокод"
                className="flex-1 rounded-xl px-4 py-3 text-sm uppercase tracking-wider text-emerald-950 outline-none"
                style={{ background: "#fff", border: "1px solid rgba(16,185,129,0.3)" }}
              />
              <button
                onClick={apply}
                disabled={sending || !code.trim()}
                className="btn-neon text-white font-semibold px-5 rounded-xl disabled:opacity-60"
              >
                {sending ? "..." : "Применить"}
              </button>
            </div>
            {error && <div className="text-red-600 text-sm mt-2">{error}</div>}
          </>
        )}
      </div>
    </div>
  );
}

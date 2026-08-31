import { useState } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Props {
  token: string;
  loanType: "loan" | "carloan" | "shoploan";
  loanId: number;
  clientName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddPaymentModal({ token, loanType, loanId, clientName, onClose, onSuccess }: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    const val = parseFloat(amount);
    if (!val || val <= 0) { setError("Укажите сумму платежа"); return; }
    setSaving(true); setError("");
    const r = await fetch(`${ADMIN_URL}?sub=add_payment&loanType=${loanType}&loanId=${loanId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify({ amount: val, note }),
    });
    setSaving(false);
    if (r.ok) { onSuccess(); onClose(); }
    else setError("Не удалось сохранить платёж");
  }

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#1a1030", border: "1px solid rgba(14,165,233,0.35)", borderRadius: 20, padding: 28, width: "100%", maxWidth: 420 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: 17 }}>Внести платёж</div>
            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>{clientName} · Займ #{loanId}</div>
          </div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
            <Icon name="X" size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>Сумма платежа (₽)</label>
            <input
              type="number" autoFocus value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="Например, 15000"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "white", fontSize: 15, width: "100%", outline: "none" }}
            />
          </div>
          <div>
            <label style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, display: "block", marginBottom: 6 }}>Комментарий (необязательно)</label>
            <input
              value={note} onChange={e => setNote(e.target.value)}
              placeholder="Например, оплата через кассу"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 14px", color: "white", fontSize: 14, width: "100%", outline: "none" }}
            />
          </div>

          {error && <div style={{ color: "#f87171", fontSize: 13 }}>{error}</div>}

          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={onClose}
              style={{ flex: 1, padding: "11px", borderRadius: 10, border: "none", cursor: "pointer", background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>
              Отмена
            </button>
            <button onClick={submit} disabled={saving}
              style={{ flex: 2, padding: "11px", borderRadius: 10, border: "none", cursor: "pointer", background: "linear-gradient(135deg,#0ea5e9,#38bdf8)", color: "white", fontWeight: 700, opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              {saving ? <><Icon name="Loader2" size={15} className="animate-spin" /> Сохранение...</> : <><Icon name="Check" size={15} /> Сохранить</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

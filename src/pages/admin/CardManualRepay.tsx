import { useState } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Props {
  token: string;
  appId: number;
  debt: number;
  onDone: () => void;
}

const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const INPUT = { background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "8px 10px", color: "#022c22", fontSize: 13, outline: "none", width: 150 } as const;

export default function CardManualRepay({ token, appId, debt, onDone }: Props) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (debt <= 0) {
    return <div style={{ marginTop: 10, fontSize: 13, color: "#047857" }}>Долга по карте нет</div>;
  }

  async function submit() {
    const val = parseFloat(amount);
    if (!val || val <= 0) { setMsg({ ok: false, text: "Укажите сумму больше нуля" }); return; }
    if (!window.confirm(`Внести погашение ${fmt(val)} по карте?`)) return;
    setBusy(true); setMsg(null);
    const r = await fetch(`${ADMIN_URL}?sub=card_repay&appId=${appId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ amount: val, note: note.trim() }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (r && r.ok) {
      setAmount(""); setNote("");
      setMsg({ ok: true, text: `Погашение внесено, остаток долга ${fmt(d.debt ?? 0)}` });
      onDone();
    } else {
      setMsg({ ok: false, text: d.error || "Не удалось внести платёж" });
    }
  }

  return (
    <div style={{ marginTop: 10, borderTop: "1px solid rgba(16,185,129,0.15)", paddingTop: 10 }}>
      <div style={{ color: "#059669", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 8 }}>
        Внести погашение вручную · долг {fmt(debt)}
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input type="number" placeholder={`до ${Math.round(debt)} ₽`} value={amount} onChange={e => setAmount(e.target.value)} style={INPUT} />
        <input placeholder="Комментарий" value={note} onChange={e => setNote(e.target.value)} style={{ ...INPUT, width: 190 }} />
        <button onClick={submit} disabled={busy}
          style={{ background: "linear-gradient(135deg,#047857,#10b981)", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 13, cursor: "pointer", opacity: busy ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6 }}>
          {busy ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}Внести
        </button>
        <button onClick={() => setAmount(String(Math.round(debt)))}
          style={{ background: "rgba(16,185,129,0.1)", color: "#047857", border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>
          Весь долг
        </button>
      </div>
      {msg && <div style={{ marginTop: 6, fontSize: 12, color: msg.ok ? "#047857" : "#dc2626" }}>{msg.text}</div>}
    </div>
  );
}

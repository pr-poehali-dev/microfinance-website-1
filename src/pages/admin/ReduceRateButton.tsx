import { useState } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface Props {
  token: string;
  type: "loan" | "carloan" | "shoploan" | "card";
  id: number;
  rate: number;
  unit: string;
  onDone: () => void;
}

const INPUT: React.CSSProperties = {
  background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8,
  padding: "8px 10px", color: "#022c22", fontSize: 13, outline: "none", width: 110,
};

export default function ReduceRateButton({ token, type, id, rate, unit, onDone }: Props) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    const n = parseFloat(value.replace(",", "."));
    if (isNaN(n) || n < 0) { setMsg({ ok: false, text: "Укажите новую ставку" }); return; }
    if (n >= rate) { setMsg({ ok: false, text: "Новая ставка должна быть ниже текущей" }); return; }
    if (!window.confirm(`Снизить ставку с ${rate}% до ${n}% (${unit})? Расчёт долга пересчитается.`)) return;
    setBusy(true); setMsg(null);
    const r = await fetch(`${ADMIN_URL}?sub=reduce_rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type, id, rate: n }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (r && r.ok) {
      setOpen(false); setValue("");
      onDone();
    } else {
      setMsg({ ok: false, text: d.error || "Не удалось изменить ставку" });
    }
  }

  if (!open) {
    return (
      <button onClick={e => { e.stopPropagation(); setOpen(true); setMsg(null); }}
        style={{ background: "linear-gradient(135deg,#047857,#10b981)", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
        <Icon name="TrendingDown" size={14} />Уменьшить ставку
      </button>
    );
  }

  return (
    <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
      <span style={{ color: "rgba(2,44,34,0.6)", fontSize: 12 }}>Сейчас {rate}% {unit}</span>
      <input type="number" step="0.1" min="0" placeholder={`< ${rate}`} value={value} onChange={e => setValue(e.target.value)} style={INPUT} />
      <button onClick={save} disabled={busy}
        style={{ background: "linear-gradient(135deg,#047857,#10b981)", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}>
        {busy ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}Применить
      </button>
      <button onClick={() => setOpen(false)} style={{ background: "rgba(16,185,129,0.1)", color: "#047857", border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Отмена</button>
      {msg && <span style={{ color: "#dc2626", fontSize: 12, fontWeight: 600 }}>{msg.text}</span>}
    </div>
  );
}

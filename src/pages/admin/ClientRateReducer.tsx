import { useEffect, useState } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface RateItem {
  type: "loan" | "carloan" | "shoploan" | "card";
  id: number;
  title: string;
  amount: number;
  rate: number;
  unit: string;
  status: string;
}

interface Props {
  userId: number;
  token: string;
  onChanged: () => void;
}

const INPUT: React.CSSProperties = {
  background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8,
  padding: "8px 10px", color: "#022c22", fontSize: 13, outline: "none", width: 110,
};

export default function ClientRateReducer({ userId, token, onChanged }: Props) {
  const [items, setItems] = useState<RateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openKey, setOpenKey] = useState("");
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function load() {
    setLoading(true);
    const r = await fetch(`${ADMIN_URL}?sub=client_rates&userId=${userId}`, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
    const d = r && r.ok ? await r.json().catch(() => null) : null;
    setItems(d?.items ?? []);
    setLoading(false);
  }

  useEffect(() => { setOpenKey(""); setMsg(null); load(); }, [userId]);

  async function save(it: RateItem) {
    const n = parseFloat(value.replace(",", "."));
    if (isNaN(n) || n < 0) { setMsg({ ok: false, text: "Укажите новую ставку" }); return; }
    if (n >= it.rate) { setMsg({ ok: false, text: "Новая ставка должна быть ниже текущей" }); return; }
    if (!window.confirm(`Снизить ставку с ${it.rate}% до ${n}% (${it.unit.replace("% ", "")})? Расчёт долга пересчитается.`)) return;
    setBusy(true); setMsg(null);
    const r = await fetch(`${ADMIN_URL}?sub=reduce_rate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ type: it.type, id: it.id, rate: n }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    setBusy(false);
    if (r && r.ok) {
      setMsg({ ok: true, text: `Ставка снижена до ${n}%` });
      setOpenKey(""); setValue("");
      await load();
      onChanged();
    } else {
      setMsg({ ok: false, text: d.error || "Не удалось изменить ставку" });
    }
  }

  if (loading) return <div style={{ textAlign: "center", padding: 16 }}><Icon name="Loader2" size={20} className="animate-spin text-emerald-600" /></div>;
  if (items.length === 0) return null;

  return (
    <div style={{ background: "rgba(255,255,255,0.9)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 16, padding: 18, marginBottom: 12 }}>
      <div style={{ color: "#059669", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Ставки по продуктам клиента</div>
      {msg && (
        <div style={{ marginBottom: 10, fontSize: 13, fontWeight: 600, color: msg.ok ? "#047857" : "#dc2626" }}>{msg.text}</div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {items.map(it => {
          const key = `${it.type}-${it.id}`;
          const open = openKey === key;
          return (
            <div key={key} style={{ background: "rgba(16,185,129,0.05)", borderRadius: 10, padding: "10px 12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div style={{ color: "#022c22", fontWeight: 700, fontSize: 14 }}>{it.title}</div>
                  <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12 }}>{it.amount.toLocaleString("ru-RU")} ₽ · ставка {it.rate}{it.unit}</div>
                </div>
                {!open && (
                  <button onClick={() => { setOpenKey(key); setValue(""); setMsg(null); }}
                    style={{ background: "linear-gradient(135deg,#047857,#10b981)", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icon name="TrendingDown" size={14} />Уменьшить ставку
                  </button>
                )}
              </div>
              {open && (
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
                  <input type="number" step="0.1" min="0" placeholder={`< ${it.rate}`} value={value} onChange={e => setValue(e.target.value)} style={INPUT} />
                  <span style={{ color: "rgba(2,44,34,0.5)", fontSize: 12 }}>{it.unit}</span>
                  <button onClick={() => save(it)} disabled={busy}
                    style={{ background: "linear-gradient(135deg,#047857,#10b981)", color: "white", border: "none", borderRadius: 8, padding: "8px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
                    {busy ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Check" size={14} />}Применить
                  </button>
                  <button onClick={() => setOpenKey("")} style={{ background: "rgba(16,185,129,0.1)", color: "#047857", border: "none", borderRadius: 8, padding: "8px 10px", fontSize: 12, cursor: "pointer" }}>Отмена</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

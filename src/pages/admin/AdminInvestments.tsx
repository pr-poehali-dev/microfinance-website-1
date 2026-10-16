import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const INVEST_URL = "https://functions.poehali.dev/1244293e-9832-493e-bbb5-de820fbe56c6";

interface Item {
  id: number;
  fullName: string;
  birthDate: string;
  phone: string;
  email: string;
  status: string;
  createdAt: string;
  amount: number | null;
}

export default function AdminInvestments({ token, onChanged }: { token: string; onChanged?: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"new" | "processed" | "all">("new");

  const hdrs = useCallback(() => ({ "Content-Type": "application/json", Authorization: `Bearer ${token}` }), [token]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${INVEST_URL}?sub=list`, { headers: hdrs() })
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .finally(() => setLoading(false));
  }, [hdrs]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id: number, status: string) => {
    await fetch(`${INVEST_URL}?sub=status`, { method: "POST", headers: hdrs(), body: JSON.stringify({ id, status }) });
    load();
    onChanged?.();
  };

  const shown = items.filter(i => filter === "all" ? true : i.status === filter);
  const newCount = items.filter(i => i.status === "new").length;

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {([["new", `Новые (${newCount})`], ["processed", "Обработанные"], ["all", "Все"]] as const).map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: filter === k ? "linear-gradient(135deg,#10b981,#14b8a6)" : "rgba(16,185,129,0.07)", color: filter === k ? "white" : "rgba(2,44,34,0.5)" }}>
            {label}
          </button>
        ))}
      </div>

      {loading && <div style={{ color: "rgba(2,44,34,0.5)", padding: 16 }}>Загрузка...</div>}
      {!loading && shown.length === 0 && <div style={{ color: "rgba(2,44,34,0.5)", padding: 16 }}>Заявок нет</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {shown.map(i => (
          <div key={i.id} style={{ background: "rgba(16,185,129,0.04)", border: `1px solid ${i.status === "new" ? "rgba(16,185,129,0.5)" : "rgba(16,185,129,0.12)"}`, borderRadius: 14, padding: "14px 16px",
            display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap", opacity: i.status === "processed" ? 0.7 : 1 }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontWeight: 700, color: "#022c22", fontSize: 16 }}>{i.fullName}</div>
              {i.amount && <div style={{ fontWeight: 800, color: "#047857", fontSize: 18, marginTop: 2 }}>{i.amount.toLocaleString("ru-RU")} ₽</div>}
              <div style={{ fontSize: 13, color: "rgba(2,44,34,0.55)", marginTop: 2 }}>Дата рождения: {i.birthDate} · Заявка от {i.createdAt}</div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 14 }}>
                <a href={`tel:${i.phone}`} style={{ color: "#047857", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="Phone" size={14} />{i.phone}</a>
                <a href={`mailto:${i.email}`} style={{ color: "#047857", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="Mail" size={14} />{i.email}</a>
              </div>
            </div>
            {i.status === "new" ? (
              <button onClick={() => setStatus(i.id, "processed")}
                style={{ background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "white", border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Icon name="Check" size={14} />Обработана
              </button>
            ) : (
              <button onClick={() => setStatus(i.id, "new")}
                style={{ background: "rgba(16,185,129,0.1)", color: "#047857", border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
                Вернуть в новые
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

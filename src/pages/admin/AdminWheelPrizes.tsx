import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface WheelItem {
  id: number;
  key: string;
  label: string;
  spunAt: string;
  usedAt: string | null;
  usedUp: boolean;
  note: string;
  appId: number | null;
  fullName: string;
  phone: string;
}

export default function AdminWheelPrizes({ token }: { token: string }) {
  const [items, setItems] = useState<WheelItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "free" | "used">("all");

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${ADMIN_URL}?sub=wheel_prizes`, { headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const shown = items.filter(i => filter === "all" ? true : filter === "used" ? i.usedUp : !i.usedUp);
  const freeCount = items.filter(i => !i.usedUp).length;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {([["all", `Все (${items.length})`], ["free", `Не использованы (${freeCount})`], ["used", `Использованы (${items.length - freeCount})`]] as const).map(([k, t]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: filter === k ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "rgba(245,158,11,0.1)", color: filter === k ? "white" : "#b45309" }}>
            {t}
          </button>
        ))}
        <button onClick={load} style={{ background: "rgba(16,185,129,0.07)", border: "none", borderRadius: 8, padding: 8, cursor: "pointer", color: "rgba(2,44,34,0.5)" }}>
          <Icon name="RefreshCw" size={14} />
        </button>
      </div>

      {loading && <div style={{ color: "rgba(2,44,34,0.5)" }}>Загрузка...</div>}
      {!loading && shown.length === 0 && <div style={{ color: "rgba(2,44,34,0.5)" }}>Призов пока нет</div>}

      <div style={{ display: "grid", gap: 10 }}>
        {shown.map(i => (
          <div key={i.id} style={{ background: "white", border: "1px solid rgba(245,158,11,0.3)", borderRadius: 12, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700, color: "#022c22", fontSize: 15 }}>🎁 {i.label}</div>
              <div style={{ fontSize: 12, color: "rgba(2,44,34,0.5)", marginTop: 2 }}>Выпал: {i.spunAt}</div>
              {i.note && <div style={{ fontSize: 12, color: "#b45309", marginTop: 2, fontWeight: 600 }}>{i.note}</div>}
              {i.appId && (
                <div style={{ fontSize: 13, color: "#022c22", marginTop: 4 }}>
                  Заявка №{i.appId} · {i.fullName} · {i.phone}
                  {i.usedAt && <span style={{ color: "rgba(2,44,34,0.5)" }}> · применён {i.usedAt}</span>}
                </div>
              )}
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, padding: "4px 12px", borderRadius: 20,
              background: i.usedUp ? "rgba(16,185,129,0.12)" : "rgba(245,158,11,0.15)", color: i.usedUp ? "#047857" : "#b45309" }}>
              {i.usedUp ? "Использован" : "Ждёт клиента"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

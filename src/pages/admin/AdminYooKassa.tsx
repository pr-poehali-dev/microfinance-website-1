import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

interface YkPayment {
  id: string; loanType: string; loanId: number; phone: string; fullName: string; amount: number;
  status: string; credited: boolean; createdAt: string; creditedAt: string | null;
}

const TYPE_LABEL: Record<string, string> = { loan: "Займ", carloan: "Авто займ", shoploan: "Товарный займ", card: "Карта РУСФИНАНС 24" };
const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;
const G = { background: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.08)", borderRadius: 14 };

export default function AdminYooKassa({ token }: { token: string }) {
  const [items, setItems] = useState<YkPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "paid" | "unpaid">("all");

  const load = useCallback(async () => {
    setLoading(true);
    const r = await fetch(`${ADMIN_URL}?sub=yookassa_payments`, { headers: { Authorization: `Bearer ${token}` } });
    const d = await r.json().catch(() => ({}));
    setItems(d.payments || []);
    setLoading(false);
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const shown = items.filter(i => filter === "all" || (filter === "paid" ? i.credited : !i.credited));
  const paidItems = items.filter(i => i.credited);
  const total = paidItems.reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 10, marginBottom: 16 }}>
        <div style={{ ...G, padding: 14 }}>
          <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12 }}>Получено через ЮKassa</div>
          <div style={{ color: "#047857", fontWeight: 800, fontSize: 22 }}>{fmt(total)}</div>
        </div>
        <div style={{ ...G, padding: 14 }}>
          <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12 }}>Оплаченных платежей</div>
          <div style={{ color: "#022c22", fontWeight: 800, fontSize: 22 }}>{paidItems.length}</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
        {([["all", "Все"], ["paid", "Оплачены"], ["unpaid", "Не оплачены"]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            style={{ padding: "6px 14px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: filter === k ? "linear-gradient(135deg,#10b981,#14b8a6)" : "rgba(16,185,129,0.07)", color: filter === k ? "white" : "rgba(2,44,34,0.6)" }}>
            {l}
          </button>
        ))}
        <button onClick={load} style={{ marginLeft: "auto", background: "rgba(16,185,129,0.07)", border: "none", borderRadius: 10, padding: 8, cursor: "pointer", color: "rgba(2,44,34,0.5)" }}>
          <Icon name="RefreshCw" size={16} />
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "rgba(2,44,34,0.4)" }}>Загрузка...</div>
      ) : shown.length === 0 ? (
        <div style={{ ...G, textAlign: "center", padding: 40, color: "rgba(2,44,34,0.4)" }}>Платежей пока нет</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {shown.map(p => (
            <div key={p.id} style={{ ...G, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 180 }}>
                <div style={{ color: "#022c22", fontWeight: 700, fontSize: 14 }}>{p.fullName || p.phone}</div>
                <div style={{ color: "rgba(2,44,34,0.5)", fontSize: 12 }}>
                  {p.phone} · {TYPE_LABEL[p.loanType] || p.loanType} №{p.loanId}
                </div>
                <div style={{ color: "rgba(2,44,34,0.4)", fontSize: 11 }}>
                  {p.credited && p.creditedAt ? `Оплачен ${p.creditedAt}` : `Создан ${p.createdAt}`}
                </div>
              </div>
              <div style={{ color: "#022c22", fontWeight: 800, fontSize: 16 }}>{fmt(p.amount)}</div>
              <span style={{ padding: "3px 10px", borderRadius: 999, fontSize: 12, fontWeight: 600,
                background: p.credited ? "rgba(16,185,129,0.15)" : p.status === "canceled" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.15)",
                color: p.credited ? "#047857" : p.status === "canceled" ? "#b91c1c" : "#b45309" }}>
                {p.credited ? "Зачтён" : p.status === "canceled" ? "Отменён" : "Ожидает оплаты"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

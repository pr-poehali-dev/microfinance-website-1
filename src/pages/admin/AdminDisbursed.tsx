import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";

const ADMIN_URL = "https://functions.poehali.dev/891e2610-dbe8-47ed-8144-e9df8e0301a6";

const TYPE_LABELS: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  loan:     { label: "Займ",            icon: "Banknote",    color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  carloan:  { label: "Авто займ",       icon: "Car",         color: "#fbbf24", bg: "rgba(245,158,11,0.15)" },
  shoploan: { label: "Товарный займ",   icon: "ShoppingBag", color: "#34d399", bg: "rgba(52,211,153,0.15)" },
};

interface DisbursedItem {
  type: string;
  id: number;
  fullName: string;
  phone: string;
  email: string;
  loanAmount: number;
  loanMonths: number;
  rate: number | null;
  approvedAmount: number | null;
  carInfo: string;
  itemInfo: string;
  disbursedAt: string | null;
  createdAt: string;
}

const G = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 };

interface Props { token: string; }

export default function AdminDisbursed({ token }: Props) {
  const [items, setItems] = useState<DisbursedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "loan" | "carloan" | "shoploan">("all");
  const [search, setSearch] = useState("");

  const hdrs = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${ADMIN_URL}?sub=disbursed`, { headers: hdrs })
      .then(r => r.json())
      .then(d => setItems(d.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const fmt = (n: number) => n ? `${n.toLocaleString("ru-RU")} ₽` : "—";

  const filtered = items.filter(item => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.fullName.toLowerCase().includes(q) || item.phone.includes(q) || item.email.toLowerCase().includes(q);
    }
    return true;
  });

  const totalAmount = filtered.reduce((sum, i) => sum + (i.approvedAmount || i.loanAmount || 0), 0);

  return (
    <div>
      {/* Статистика */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Всего выдано", value: items.length, icon: "BadgeCheck", color: "#38bdf8" },
          { label: "Займов", value: items.filter(i => i.type === "loan").length, icon: "Banknote", color: "#a78bfa" },
          { label: "Авто займов", value: items.filter(i => i.type === "carloan").length, icon: "Car", color: "#fbbf24" },
          { label: "Товарных", value: items.filter(i => i.type === "shoploan").length, icon: "ShoppingBag", color: "#34d399" },
        ].map(s => (
          <div key={s.label} style={{ ...G, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}22`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Icon name={s.icon} size={18} style={{ color: s.color }} />
            </div>
            <div>
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{s.label}</div>
              <div style={{ color: "white", fontWeight: 700, fontSize: 20 }}>{s.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Фильтры и поиск */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {(["all", "loan", "carloan", "shoploan"] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            style={{
              padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: typeFilter === t ? "linear-gradient(135deg,#0ea5e9,#38bdf8)" : "rgba(255,255,255,0.07)",
              color: typeFilter === t ? "white" : "rgba(255,255,255,0.5)",
            }}>
            {t === "all" ? "Все" : TYPE_LABELS[t].label}
          </button>
        ))}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по имени или телефону..."
          style={{ marginLeft: "auto", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "7px 14px", color: "white", fontSize: 13, outline: "none", minWidth: 220 }}
        />
        <button onClick={load} style={{ background: "rgba(255,255,255,0.07)", border: "none", borderRadius: 10, padding: "8px 12px", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
          <Icon name="RefreshCw" size={15} />
        </button>
      </div>

      {/* Итог по фильтру */}
      {filtered.length > 0 && (
        <div style={{ marginBottom: 14, padding: "10px 16px", borderRadius: 10, background: "rgba(14,165,233,0.08)", border: "1px solid rgba(14,165,233,0.2)", color: "#38bdf8", fontSize: 13, display: "flex", gap: 16, flexWrap: "wrap" }}>
          <span>Показано: <b>{filtered.length}</b></span>
          <span>Сумма: <b>{fmt(totalAmount)}</b></span>
        </div>
      )}

      {loading ? (
        <div style={{ color: "rgba(255,255,255,0.35)", textAlign: "center", padding: 48 }}>Загрузка...</div>
      ) : filtered.length === 0 ? (
        <div style={{ ...G, padding: 48, textAlign: "center" }}>
          <Icon name="Banknote" size={40} style={{ color: "rgba(255,255,255,0.15)", display: "block", margin: "0 auto 12px" }} />
          <div style={{ color: "rgba(255,255,255,0.3)" }}>Выданных займов нет</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(item => {
            const tp = TYPE_LABELS[item.type] || TYPE_LABELS.loan;
            const amount = item.approvedAmount || item.loanAmount;
            return (
              <div key={`${item.type}-${item.id}`} style={{ ...G, padding: "16px 20px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Шапка */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: tp.bg, color: tp.color, display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon name={tp.icon} size={12} />
                        {tp.label}
                      </span>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{item.fullName || item.phone}</span>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>#{item.id}</span>
                    </div>

                    {/* Поля */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "6px 16px", marginBottom: 8 }}>
                      {[
                        { l: "Телефон", v: item.phone },
                        { l: "Email", v: item.email || "—" },
                        { l: "Сумма", v: fmt(amount) },
                        { l: "Срок", v: item.loanMonths ? `${item.loanMonths} мес.` : "—" },
                        item.carInfo  ? { l: "Авто", v: item.carInfo } : null,
                        item.itemInfo ? { l: "Товар", v: item.itemInfo } : null,
                        { l: "Заявка подана", v: item.createdAt },
                      ].filter(Boolean).map(({ l, v }) => (
                        <div key={l}>
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>{l}</div>
                          <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Дата выдачи */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                    <div style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.35)", color: "#38bdf8" }}>
                      <Icon name="BadgeCheck" size={15} />
                      Займ выдан
                    </div>
                    {item.disbursedAt && (
                      <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{item.disbursedAt}</div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

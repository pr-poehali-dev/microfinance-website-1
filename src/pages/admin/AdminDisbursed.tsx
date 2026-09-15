import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import AdminLoanDetailModal from "./AdminLoanDetailModal";

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
  telegramId: string;
  paidTotal: number;
  totalDue: number;
  isOverdue: boolean;
  nextDueDate: string | null;
}

const G = { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14 };

interface Props { token: string; }

export default function AdminDisbursed({ token }: Props) {
  const [items, setItems] = useState<DisbursedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<"all" | "loan" | "carloan" | "shoploan">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "overdue">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<{ type: string; id: number } | null>(null);

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

  const overdueCount = items.filter(i => i.isOverdue).length;

  const filtered = items.filter(item => {
    if (typeFilter !== "all" && item.type !== typeFilter) return false;
    if (statusFilter === "overdue" && !item.isOverdue) return false;
    if (search) {
      const q = search.toLowerCase();
      return item.fullName.toLowerCase().includes(q) || item.phone.includes(q) || item.email.toLowerCase().includes(q);
    }
    return true;
  });

  const totalAmount = filtered.reduce((sum, i) => sum + (i.approvedAmount || i.loanAmount || 0), 0);

  return (
    <div>
      {selected && (
        <AdminLoanDetailModal token={token} type={selected.type} id={selected.id} onClose={() => setSelected(null)} />
      )}

      {/* Статистика */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12, marginBottom: 20 }}>
        {[
          { label: "Всего выдано", value: items.length, icon: "BadgeCheck", color: "#38bdf8" },
          { label: "Займов", value: items.filter(i => i.type === "loan").length, icon: "Banknote", color: "#a78bfa" },
          { label: "Авто займов", value: items.filter(i => i.type === "carloan").length, icon: "Car", color: "#fbbf24" },
          { label: "Товарных", value: items.filter(i => i.type === "shoploan").length, icon: "ShoppingBag", color: "#34d399" },
          { label: "Просроченных", value: overdueCount, icon: "AlertTriangle", color: "#f87171" },
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

      {/* Фильтр по статусу — Все / Просроченные */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={() => setStatusFilter("all")}
          style={{
            padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
            background: statusFilter === "all" ? "linear-gradient(135deg,#0ea5e9,#38bdf8)" : "rgba(255,255,255,0.07)",
            color: statusFilter === "all" ? "white" : "rgba(255,255,255,0.5)",
          }}>
          Все займы
        </button>
        <button onClick={() => setStatusFilter("overdue")}
          style={{
            padding: "8px 18px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 13,
            display: "flex", alignItems: "center", gap: 6,
            background: statusFilter === "overdue" ? "linear-gradient(135deg,#dc2626,#f87171)" : "rgba(239,68,68,0.1)",
            color: statusFilter === "overdue" ? "white" : "#f87171",
          }}>
          <Icon name="AlertTriangle" size={14} />Просроченные{overdueCount > 0 ? ` (${overdueCount})` : ""}
        </button>
      </div>

      {/* Фильтры типа и поиск */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
        {(["all", "loan", "carloan", "shoploan"] as const).map(t => (
          <button key={t} onClick={() => setTypeFilter(t)}
            style={{
              padding: "7px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
              background: typeFilter === t ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.07)",
              color: typeFilter === t ? "white" : "rgba(255,255,255,0.5)",
            }}>
            {t === "all" ? "Все типы" : TYPE_LABELS[t].label}
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
          <Icon name={statusFilter === "overdue" ? "CheckCircle2" : "Banknote"} size={40} style={{ color: "rgba(255,255,255,0.15)", display: "block", margin: "0 auto 12px" }} />
          <div style={{ color: "rgba(255,255,255,0.3)" }}>{statusFilter === "overdue" ? "Просроченных займов нет" : "Выданных займов нет"}</div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map(item => {
            const tp = TYPE_LABELS[item.type] || TYPE_LABELS.loan;
            const amount = item.approvedAmount || item.loanAmount;
            return (
              <button
                key={`${item.type}-${item.id}`}
                onClick={() => setSelected({ type: item.type, id: item.id })}
                style={{ ...G, padding: "16px 20px", textAlign: "left", cursor: "pointer", width: "100%", transition: "border-color 0.15s",
                  border: item.isOverdue ? "1px solid rgba(239,68,68,0.4)" : G.border }}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Шапка */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
                      <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 600, background: tp.bg, color: tp.color, display: "flex", alignItems: "center", gap: 5 }}>
                        <Icon name={tp.icon} size={12} />
                        {tp.label}
                      </span>
                      {item.isOverdue && (
                        <span style={{ padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700, background: "rgba(239,68,68,0.18)", color: "#f87171", display: "flex", alignItems: "center", gap: 5 }}>
                          <Icon name="AlertTriangle" size={12} />Просрочен
                        </span>
                      )}
                      <span style={{ color: "white", fontWeight: 700, fontSize: 15 }}>{item.fullName || item.phone}</span>
                      <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>#{item.id}</span>
                    </div>

                    {/* Поля */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "6px 16px", marginBottom: 8 }}>
                      {[
                        { l: "Телефон", v: item.phone },
                        { l: "Email", v: item.email || "—" },
                        { l: "Сумма", v: fmt(amount) },
                        { l: "Срок", v: item.loanMonths ? `${item.loanMonths} ${item.type === "loan" ? "дн." : "мес."}` : "—" },
                        item.carInfo  ? { l: "Авто", v: item.carInfo } : null,
                        item.itemInfo ? { l: "Товар", v: item.itemInfo } : null,
                        { l: "Оплачено", v: fmt(item.paidTotal) },
                        item.nextDueDate ? { l: item.isOverdue ? "Просрочен платёж" : "След. платёж", v: item.nextDueDate } : null,
                      ].filter(Boolean).map((f) => (
                        <div key={f!.l}>
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginBottom: 2 }}>{f!.l}</div>
                          <div style={{ color: f!.l.includes("Просрочен") ? "#f87171" : "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: f!.l.includes("Просрочен") ? 700 : 400 }}>{f!.v}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Дата выдачи + стрелка открытия */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
                      <div style={{ padding: "8px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, background: "rgba(14,165,233,0.12)", border: "1px solid rgba(14,165,233,0.35)", color: "#38bdf8" }}>
                        <Icon name="BadgeCheck" size={15} />
                        Займ выдан
                      </div>
                      {item.disbursedAt && (
                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{item.disbursedAt}</div>
                      )}
                    </div>
                    <Icon name="ChevronRight" size={18} style={{ color: "rgba(255,255,255,0.25)" }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
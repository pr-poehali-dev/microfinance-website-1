import { useState, useEffect, useCallback } from "react";
import Icon from "@/components/ui/icon";
import AdminInvestors from "./AdminInvestors";

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
  termMonths: number | null;
  payout: string;
}

const TERM_LABEL: Record<number, string> = { 6: "6 месяцев", 12: "1 год", 36: "3 года", 60: "5 лет" };

export default function AdminInvestments({ token, onChanged }: { token: string; onChanged?: () => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"new" | "processed" | "all">("new");
  const [view, setView] = useState<"requests" | "investors">("requests");
  const [create, setCreate] = useState<Item | null>(null);
  const [cf, setCf] = useState({ phone: "", password: "", rate: "8" });
  const [cmsg, setCmsg] = useState("");

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

  const createCabinet = async () => {
    if (!create) return;
    setCmsg("");
    const r = await fetch(`${INVEST_URL}?sub=investor_create`, {
      method: "POST", headers: hdrs(),
      body: JSON.stringify({
        requestId: create.id, fullName: create.fullName, email: create.email, birthDate: create.birthDate,
        phone: cf.phone, password: cf.password, rate: cf.rate, amount: create.amount, termMonths: create.termMonths, payout: create.payout,
      }),
    }).catch(() => null);
    const d = r ? await r.json().catch(() => ({})) : {};
    if (r && r.ok) { setCreate(null); setView("investors"); load(); onChanged?.(); }
    else setCmsg(d.error || "Не удалось создать кабинет");
  };

  const shown = items.filter(i => filter === "all" ? true : i.status === filter);
  const newCount = items.filter(i => i.status === "new").length;

  const tabBtn = (active: boolean): React.CSSProperties => ({ padding: "8px 16px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 14,
    background: active ? "#064e3b" : "rgba(16,185,129,0.1)", color: active ? "#ffffff" : "#047857" });

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button style={tabBtn(view === "requests")} onClick={() => setView("requests")}>Заявки</button>
        <button style={tabBtn(view === "investors")} onClick={() => setView("investors")}>Кабинеты инвесторов</button>
      </div>
      {view === "investors" && <AdminInvestors token={token} />}
      {view === "requests" && (<>
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
              {(i.termMonths || i.payout) && (
                <div style={{ fontSize: 13, color: "#064e3b", fontWeight: 600, marginTop: 2 }}>
                  {i.termMonths ? `Срок: ${TERM_LABEL[i.termMonths] || `${i.termMonths} мес.`}` : ""}
                  {i.termMonths && i.payout ? " · " : ""}
                  {i.payout ? `Проценты: ${i.payout === "monthly" ? "каждый месяц" : "в конце срока"}` : ""}
                </div>
              )}
              <div style={{ fontSize: 13, color: "rgba(2,44,34,0.55)", marginTop: 2 }}>Дата рождения: {i.birthDate} · Заявка от {i.createdAt}</div>
              <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6, fontSize: 14 }}>
                <a href={`tel:${i.phone}`} style={{ color: "#047857", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="Phone" size={14} />{i.phone}</a>
                <a href={`mailto:${i.email}`} style={{ color: "#047857", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="Mail" size={14} />{i.email}</a>
              </div>
            </div>
            <button onClick={() => { setCreate(i); setCf({ phone: i.phone, password: "", rate: "8" }); setCmsg(""); }}
              style={{ background: "#064e3b", color: "#ffffff", border: "none", borderRadius: 10, padding: "9px 16px", cursor: "pointer", fontWeight: 700, fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <Icon name="UserPlus" size={14} />Создать кабинет
            </button>
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
      </>)}

      {create && (
        <div style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={() => setCreate(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#ffffff", borderRadius: 18, padding: 22, width: "100%", maxWidth: 420, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 800, fontSize: 18, color: "#022c22" }}>Кабинет инвестора</div>
            <div style={{ fontSize: 13, color: "rgba(2,44,34,0.6)" }}>
              {create.fullName}{create.amount ? ` · ${create.amount.toLocaleString("ru-RU")} ₽` : ""}{create.termMonths ? ` · ${create.termMonths} мес.` : ""}
            </div>
            {!create.amount || !create.termMonths || !create.payout ? (
              <div style={{ fontSize: 13, color: "#b45309" }}>В заявке нет суммы, срока или способа выплаты. Такой кабинет создать нельзя — добавьте инвестицию вручную после создания инвестора через новую заявку.</div>
            ) : null}
            <label style={{ fontSize: 12, color: "rgba(2,44,34,0.55)" }}>Телефон для входа</label>
            <input style={{ border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "9px 10px", color: "#022c22" }} value={cf.phone} onChange={e => setCf({ ...cf, phone: e.target.value })} />
            <label style={{ fontSize: 12, color: "rgba(2,44,34,0.55)" }}>Пароль (от 6 символов)</label>
            <input style={{ border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "9px 10px", color: "#022c22" }} value={cf.password} onChange={e => setCf({ ...cf, password: e.target.value })} />
            <label style={{ fontSize: 12, color: "rgba(2,44,34,0.55)" }}>Ставка, % в месяц</label>
            <input style={{ border: "1px solid rgba(16,185,129,0.4)", borderRadius: 8, padding: "9px 10px", color: "#022c22" }} type="number" step="0.1" value={cf.rate} onChange={e => setCf({ ...cf, rate: e.target.value })} />
            {cmsg && <div style={{ color: "#dc2626", fontSize: 13, fontWeight: 600 }}>{cmsg}</div>}
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <button onClick={createCabinet} style={{ flex: 1, background: "linear-gradient(135deg,#10b981,#14b8a6)", color: "white", border: "none", borderRadius: 10, padding: "11px 14px", fontWeight: 700, cursor: "pointer" }}>Создать</button>
              <button onClick={() => setCreate(null)} style={{ background: "rgba(16,185,129,0.1)", color: "#047857", border: "none", borderRadius: 10, padding: "11px 14px", fontWeight: 600, cursor: "pointer" }}>Отмена</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

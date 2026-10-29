import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/icon";

const YK_URL = "https://functions.poehali.dev/64ba6f22-6243-4b3f-ab24-f5bb294d5bfe";

interface Item { id: string; loanType: string; loanId: number; amount: number; status: string; date: string; }

const TYPE_LABEL: Record<string, string> = { loan: "Займ", carloan: "Автозайм", shoploan: "Займ на покупки", card: "Карта РУСФИНАНС 24", creditdoctor: "Услуга «Кредитный Доктор»" };
const fmt = (n: number) => `${Math.round(n).toLocaleString("ru-RU")} ₽`;

const STATUS: Record<string, { label: string; bg: string; color: string }> = {
  succeeded: { label: "Оплачено", bg: "rgba(16,185,129,0.15)", color: "#047857" },
  canceled: { label: "Отменено", bg: "rgba(239,68,68,0.12)", color: "#b91c1c" },
  pending: { label: "Ожидает оплаты", bg: "rgba(245,158,11,0.15)", color: "#b45309" },
};

export default function YooKassaHistory({ showEmpty = false }: { showEmpty?: boolean }) {
  const [items, setItems] = useState<Item[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const startedAt = useRef(Date.now());

  const load = useCallback(() => {
    const token = localStorage.getItem("token");
    if (!token) return Promise.resolve();
    setRefreshing(true);
    return fetch(`${YK_URL}?sub=history`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "X-Authorization": `Bearer ${token}` },
      body: "{}",
    })
      .then((r) => r.json())
      .then((d) => setItems(d.payments || []))
      .catch(() => {})
      .finally(() => setRefreshing(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const hasPending = items.some((p) => p.status === "pending");
  useEffect(() => {
    if (!hasPending) return;
    const t = setInterval(() => {
      if (document.hidden || Date.now() - startedAt.current > 5 * 60 * 1000) return;
      load();
    }, 6000);
    return () => clearInterval(t);
  }, [hasPending, load]);

  if (items.length === 0) {
    if (!showEmpty) return null;
    return (
      <div className="glass rounded-2xl p-10 text-center">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(16,185,129,0.2)" }}>
          <Icon name="Wallet" size={28} className="text-emerald-600" />
        </div>
        <h3 className="text-emerald-950 font-semibold text-lg mb-2">Выплат пока нет</h3>
        <p className="text-emerald-950/50 text-sm">Здесь появятся платежи, которые вы внесёте по займам</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl p-5 space-y-3" style={{ background: "#ffffff", border: "1px solid rgba(16,185,129,0.25)" }}>
      <div className="flex items-center gap-2">
        <Icon name="Receipt" size={18} className="text-emerald-600" />
        <div className="text-emerald-950 font-bold flex-1">История оплат</div>
        <button onClick={load} disabled={refreshing} className="text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 disabled:opacity-60"
          style={{ background: "rgba(16,185,129,0.12)", color: "#047857" }}>
          <Icon name="RefreshCw" size={13} className={refreshing ? "animate-spin" : ""} />Обновить
        </button>
      </div>
      <div className="space-y-1.5">
        {items.map((p) => {
          const st = STATUS[p.status] || STATUS.pending;
          return (
            <div key={p.id} className="flex items-center justify-between gap-3 rounded-lg px-3 py-2" style={{ background: "rgba(16,185,129,0.05)" }}>
              <div>
                <div className="text-emerald-950 text-sm font-semibold">{TYPE_LABEL[p.loanType] || "Платёж"}{p.loanType !== "card" && p.loanType !== "creditdoctor" ? ` №${p.loanId}` : ""}</div>
                <div className="text-emerald-950/50 text-xs">{p.date}</div>
              </div>
              <div className="text-right">
                <div className="text-emerald-950 font-bold text-sm">{fmt(p.amount)}</div>
                <span style={{ padding: "1px 8px", borderRadius: 999, fontSize: 11, fontWeight: 600, background: st.bg, color: st.color }}>{st.label}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
